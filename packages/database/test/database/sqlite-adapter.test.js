/**
 * Regression tests for the SQLite adapter (the default configuration) against a real
 * in-memory database: it has to honour the same contract as the pooled adapters.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDatabaseManager } from '../../src/connection-manager.js';
import { withHealthCheck } from '../../src/middleware.js';

describe('SQLite adapter through DatabaseManager', () => {
  let db;

  beforeEach(async () => {
    db = createDatabaseManager({ type: 'sqlite', database: ':memory:' });
    await db.connect();
    await db.query('CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)');
  });

  afterEach(async () => {
    await db.close();
  });

  it('reports the generated id and the affected row count of writes', async () => {
    const first = await db.query('INSERT INTO items (name) VALUES (?)', ['a']);
    const second = await db.query('INSERT INTO items (name) VALUES (?)', ['b']);

    expect(first).toMatchObject({ insertId: 1, affectedRows: 1 });
    expect(second).toMatchObject({ insertId: 2, affectedRows: 1 });

    const updated = await db.query('UPDATE items SET name = ? WHERE id > ?', ['z', 0]);
    expect(updated).toMatchObject({ affectedRows: 2, insertId: null });

    const deleted = await db.query('DELETE FROM items WHERE id = ?', [42]);
    expect(deleted.affectedRows).toBe(0);

    const { rows } = await db.query('SELECT id, name FROM items ORDER BY id');
    expect(rows).toEqual([{ id: 1, name: 'z' }, { id: 2, name: 'z' }]);
  });

  it('supports transactions that commit', async () => {
    const tx = await db.transaction();
    const result = await tx.query('INSERT INTO items (name) VALUES (?)', ['kept']);
    expect(result.insertId).toBe(1);
    await tx.commit();

    expect(tx.isCommitted).toBe(true);
    expect((await db.query('SELECT name FROM items')).rows).toEqual([{ name: 'kept' }]);
  });

  it('supports transactions that roll back', async () => {
    const tx = await db.transaction();
    await tx.query('INSERT INTO items (name) VALUES (?)', ['discarded']);
    await tx.rollback();

    expect(tx.isRolledBack).toBe(true);
    expect((await db.query('SELECT name FROM items')).rows).toEqual([]);
    await expect(tx.query('SELECT 1')).rejects.toThrow('completed transaction');
  });

  it('returns stats instead of throwing', () => {
    const stats = db.getStats();
    expect(stats.isConnected).toBe(true);
    expect(stats.poolStats).toEqual({ total: 1, available: 1, acquired: 0, waiting: 0 });
  });

  it('is reported healthy by withHealthCheck', async () => {
    const req = {};
    await withHealthCheck(db)(req, {}, () => {});
    expect(req.dbHealth.status).toBe('healthy');
    expect(req.dbHealth.error).toBeUndefined();
  });
});

describe('DatabaseManager.testConnection', () => {
  it('treats a ping that resolves to false as a failed connection test', async () => {
    const db = createDatabaseManager({
      adapter: { createPool: async () => ({ query: async () => ({ rows: [] }) }), ping: async () => false }
    });
    db.retryDelay = 0;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(db.connect()).rejects.toThrow('ping failed');
    vi.restoreAllMocks();
  });
});
