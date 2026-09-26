/**
 * Regression tests: transactions must never leak a pooled connection, must not
 * interpolate an unchecked isolation level, must receive their options, and
 * middleware must not commit before the request handler is done.
 */

import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { createPostgreSQLAdapter } from '../../src/adapters/postgresql.js';
import { createMySQLAdapter } from '../../src/adapters/mysql.js';
import { createDatabaseManager } from '../../src/connection-manager.js';
import { withTransaction } from '../../src/middleware.js';

function fakePgPool({ failOn } = {}) {
  const log = [];
  const client = {
    query: vi.fn(async (sql) => {
      log.push(sql);
      if (failOn && sql.startsWith(failOn)) throw new Error(`${failOn} failed`);
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn()
  };
  return { log, client, pool: { connect: vi.fn(async () => client) } };
}

function fakeMysqlPool({ failBegin = false } = {}) {
  const log = [];
  const connection = {
    query: vi.fn(async (sql) => { log.push(sql); return [[]]; }),
    execute: vi.fn(async () => [[]]),
    beginTransaction: vi.fn(async () => {
      log.push('BEGIN');
      if (failBegin) throw new Error('BEGIN failed');
    }),
    commit: vi.fn(async () => { log.push('COMMIT'); }),
    rollback: vi.fn(async () => { log.push('ROLLBACK'); }),
    release: vi.fn()
  };
  return { log, connection, pool: { getConnection: vi.fn(async () => connection) } };
}

describe('PostgreSQL adapter transactions', () => {
  it('releases the client when BEGIN fails', async () => {
    const { pool, client } = fakePgPool({ failOn: 'BEGIN' });

    await expect(createPostgreSQLAdapter().transaction(pool)).rejects.toThrow('BEGIN failed');

    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('rejects an isolation level that is not one of the four standard levels, before taking a client', async () => {
    const { pool } = fakePgPool();

    await expect(createPostgreSQLAdapter().transaction(pool, { isolationLevel: 'SERIALIZABLE; DROP TABLE users' }))
      .rejects.toThrow('Invalid transaction isolation level');
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('begins with the normalized isolation level and read-only flag', async () => {
    const { pool, log } = fakePgPool();

    const tx = await createPostgreSQLAdapter().transaction(pool, { isolationLevel: 'repeatable  read', readOnly: true });
    await tx.commit();

    expect(log).toEqual(['BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY', 'COMMIT']);
  });

  it('releases the client exactly once when COMMIT fails', async () => {
    const { pool, client } = fakePgPool({ failOn: 'COMMIT' });
    const tx = await createPostgreSQLAdapter().transaction(pool);

    await expect(tx.commit()).rejects.toThrow('COMMIT failed');
    expect(tx.isRolledBack).toBe(true);
    await expect(tx.rollback()).rejects.toThrow('Transaction already completed');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});

describe('MySQL adapter transactions', () => {
  it('releases the connection when starting the transaction fails', async () => {
    const { pool, connection } = fakeMysqlPool({ failBegin: true });

    await expect(createMySQLAdapter().transaction(pool)).rejects.toThrow('BEGIN failed');
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('applies isolation level and read-only options', async () => {
    const { pool, log, connection } = fakeMysqlPool();

    const tx = await createMySQLAdapter().transaction(pool, { isolationLevel: 'read committed', readOnly: true });
    await tx.rollback();

    expect(log).toEqual(['SET TRANSACTION ISOLATION LEVEL READ COMMITTED', 'START TRANSACTION READ ONLY', 'ROLLBACK']);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid isolation level before taking a connection', async () => {
    const { pool } = fakeMysqlPool();

    await expect(createMySQLAdapter().transaction(pool, { isolationLevel: 'CHAOS' })).rejects.toThrow('Invalid transaction isolation level');
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
});

function managerWith(adapterOverrides = {}) {
  const pool = { query: vi.fn(async () => ({ rows: [] })) };
  const adapter = {
    createPool: vi.fn(async () => pool),
    testConnection: vi.fn(async () => {}),
    closePool: vi.fn(async () => {}),
    ...adapterOverrides
  };
  return { db: createDatabaseManager({ adapter }), adapter, pool };
}

function recordingTransaction(log) {
  const tx = {
    isCommitted: false,
    isRolledBack: false,
    query: vi.fn(async (sql) => {
      if (tx.isCommitted || tx.isRolledBack) throw new Error('Cannot execute query on completed transaction');
      log.push(sql);
      return { rows: [] };
    }),
    commit: vi.fn(async () => { tx.isCommitted = true; log.push('COMMIT'); }),
    rollback: vi.fn(async () => { tx.isRolledBack = true; log.push('ROLLBACK'); })
  };
  return tx;
}

describe('DatabaseManager.transaction', () => {
  it('passes its options to the adapter', async () => {
    const { db, adapter, pool } = managerWith({ transaction: vi.fn(async () => ({})) });
    await db.connect();

    await db.transaction({ isolationLevel: 'SERIALIZABLE', readOnly: true });

    expect(adapter.transaction).toHaveBeenCalledWith(pool, { isolationLevel: 'SERIALIZABLE', readOnly: true });
  });

  it('runs a callback in a transaction, committing or rolling back', async () => {
    const log = [];
    const { db } = managerWith({ transaction: vi.fn(async () => recordingTransaction(log)) });
    await db.connect();

    expect(await db.transaction(async (tx) => { await tx.query('INSERT 1'); return 'done'; })).toBe('done');
    await expect(db.transaction(async (tx) => { await tx.query('INSERT 2'); throw new Error('nope'); })).rejects.toThrow('nope');

    expect(log).toEqual(['INSERT 1', 'COMMIT', 'INSERT 2', 'ROLLBACK']);
  });

  it('closes the pool of every failed connection attempt', async () => {
    const { db, adapter } = managerWith({ testConnection: vi.fn(async () => { throw new Error('auth failed'); }) });
    db.retryDelay = 0;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(db.connect()).rejects.toThrow('auth failed');

    expect(adapter.createPool).toHaveBeenCalledTimes(3);
    expect(adapter.closePool).toHaveBeenCalledTimes(3);
    expect(db.pool).toBe(null);
    warn.mockRestore();
  });
});

describe('withTransaction', () => {
  function database(log) {
    return { transaction: vi.fn(async () => recordingTransaction(log)) };
  }

  it('passes isolation level and read-only options to the database', async () => {
    const log = [];
    const db = database(log);

    await withTransaction(db, { isolationLevel: 'SERIALIZABLE' })({}, new EventEmitter(), async () => {});

    expect(db.transaction).toHaveBeenCalledWith({ isolationLevel: 'SERIALIZABLE', readOnly: false });
  });

  it('waits for the response before committing when next() is synchronous (Express)', async () => {
    const log = [];
    const req = {};
    const res = new EventEmitter();

    await withTransaction(database(log))(req, res, () => {
      // An async Express handler: next() returns before this finishes
      setTimeout(async () => {
        await req.tx.query('UPDATE accounts');
        res.statusCode = 200;
        res.emit('finish');
        res.emit('close');
      }, 10);
    });

    expect(log).toEqual([]);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(log).toEqual(['UPDATE accounts', 'COMMIT']);
  });

  it('rolls back when the response fails or the connection closes first', async () => {
    const failedLog = [];
    const failed = new EventEmitter();
    await withTransaction(database(failedLog))({}, failed, () => {});
    failed.statusCode = 500;
    failed.emit('finish');
    await new Promise(resolve => setImmediate(resolve));
    expect(failedLog).toEqual(['ROLLBACK']);

    const abortedLog = [];
    const aborted = new EventEmitter();
    await withTransaction(database(abortedLog))({}, aborted, () => {});
    aborted.emit('close');
    await new Promise(resolve => setImmediate(resolve));
    expect(abortedLog).toEqual(['ROLLBACK']);
  });

  it('works with routers that call middleware without next', async () => {
    const log = [];
    const req = {};
    const res = new EventEmitter();

    await expect(withTransaction(database(log))(req, res)).resolves.toBeUndefined();
    await req.tx.query('INSERT');
    res.statusCode = 201;
    res.emit('finish');
    await new Promise(resolve => setImmediate(resolve));

    expect(log).toEqual(['INSERT', 'COMMIT']);
  });

  it('rolls back and throws when it cannot tell when the request ends', async () => {
    const log = [];

    await expect(withTransaction(database(log))({}, {}, () => {})).rejects.toThrow('cannot tell when the request ends');
    expect(log).toEqual(['ROLLBACK']);
  });
});
