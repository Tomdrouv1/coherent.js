/**
 * Regression tests: DatabaseManager.transaction() for the MongoDB and memory adapters.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const driver = vi.hoisted(() => {
  const state = { sessions: [], finds: [] };

  class FakeSession {
    constructor() {
      this.calls = [];
      state.sessions.push(this);
    }
    startTransaction(options) { this.calls.push(['startTransaction', options]); }
    async commitTransaction() { this.calls.push(['commitTransaction']); }
    async abortTransaction() { this.calls.push(['abortTransaction']); }
    async endSession() { this.calls.push(['endSession']); }
  }

  class MongoClient {
    async connect() {}
    async close() {}
    startSession() { return new FakeSession(); }
    db() {
      return {
        command: async () => ({ ok: 1 }),
        collection: (name) => ({
          find(filter, options) {
            state.finds.push({ name, filter, options });
            return { toArray: async () => [{ _id: 1 }], sort() {}, limit() {}, skip() {}, project() {} };
          }
        })
      };
    }
  }

  return { state, MongoClient };
});

vi.mock('mongodb', () => ({ MongoClient: driver.MongoClient }));

const { createDatabaseManager } = await import('../../src/connection-manager.js');

describe('MongoDB transactions', () => {
  let db;

  beforeEach(async () => {
    driver.state.sessions.length = 0;
    driver.state.finds.length = 0;
    db = createDatabaseManager({ type: 'mongodb', url: 'mongodb://example.invalid', database: 'app' });
    await db.connect();
  });

  it('starts a session transaction and passes the session to queries', async () => {
    const tx = await db.transaction();

    expect(await tx.query('users', { active: true }, { limit: 5 })).toEqual([{ _id: 1 }]);
    const [session] = driver.state.sessions;
    expect(tx.session).toBe(session);
    expect(driver.state.finds).toEqual([{ name: 'users', filter: { active: true }, options: { limit: 5, session } }]);

    await tx.commit();
    expect(tx.isCommitted).toBe(true);
    expect(session.calls.map(([call]) => call)).toEqual(['startTransaction', 'commitTransaction', 'endSession']);
    await expect(tx.query('users')).rejects.toThrow('Transaction already completed');
  });

  it('aborts the session transaction on rollback', async () => {
    const tx = await db.transaction();
    await tx.rollback();

    expect(tx.isRolledBack).toBe(true);
    expect(driver.state.sessions[0].calls.map(([call]) => call)).toEqual(['startTransaction', 'abortTransaction', 'endSession']);
  });
});

describe('memory adapter transactions', () => {
  let db;

  beforeEach(async () => {
    db = createDatabaseManager({ type: 'memory' });
    await db.connect();
    await db.query('INSERT', { table: 'users', data: { id: 'a', name: 'Ada' } });
  });

  const names = async () => (await db.query('FIND', { table: 'users', orderBy: 'id' })).map(user => user.name);

  it('undoes inserts, updates and deletes on rollback', async () => {
    const tx = await db.transaction();
    await tx.query('INSERT', { table: 'users', data: { id: 'b', name: 'Bob' } });
    await tx.query('UPDATE', { table: 'users', where: { id: 'a' }, data: { name: 'Ada Lovelace' } });
    expect(await names()).toEqual(['Ada Lovelace', 'Bob']);

    await tx.rollback();

    expect(tx.isRolledBack).toBe(true);
    expect(await names()).toEqual(['Ada']);

    const deleting = await db.transaction();
    await deleting.query('DELETE', { table: 'users', where: { id: 'a' } });
    await deleting.rollback();
    expect(await names()).toEqual(['Ada']);
  });

  it('keeps changes on commit', async () => {
    const tx = await db.transaction();
    await tx.query('INSERT', { table: 'users', data: { id: 'b', name: 'Bob' } });
    await tx.commit();

    expect(await names()).toEqual(['Ada', 'Bob']);
    await expect(tx.rollback()).rejects.toThrow('Transaction already completed');
  });

  it('rolls back a callback transaction that throws', async () => {
    await expect(db.adapter.transaction(async (tx) => {
      await tx.query('INSERT', { table: 'users', data: { id: 'b', name: 'Bob' } });
      throw new Error('boom');
    })).rejects.toThrow('boom');

    expect(await names()).toEqual(['Ada']);
  });
});
