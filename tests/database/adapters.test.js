/**
 * Integration Tests for Database Adapters
 */
import { MockAdapter, MockPool, MockConnection, MockTransaction } from './test-utils.js';

test('Database Adapters - SQLite should create connection pool', async () => {
  const adapter = new MockAdapter();
  const config = {
    filename: ':memory:',
    pool: {
      min: 2,
      max: 10
    }
  };

  const pool = await adapter.connect(config);
  
  assert.ok(adapter.connected, 'Adapter should be connected');
  assert.ok(pool instanceof MockPool, 'Pool should be MockPool instance');
});

test('Database Adapters - should execute SELECT query', async () => {
  const adapter = new MockAdapter();
  await adapter.connect({ filename: ':memory:' });
  const connection = await adapter.pool.acquire();
  
  const result = await adapter.query(connection, 'SELECT * FROM users WHERE id = ?', [1]);
  
  assert.ok(result.rows, 'Result should have rows');
  assert.ok(result.rowCount >= 0, 'Result should have rowCount');
  assert.ok(adapter.getLastQuery().sql.includes('SELECT'), 'Query should contain SELECT');
});

test('Database Adapters - should handle transactions', async () => {
  const adapter = new MockAdapter();
  await adapter.connect({ filename: ':memory:' });
  const connection = await adapter.pool.acquire();
  
  const tx = await adapter.beginTransaction(connection);
  
  assert.ok(tx instanceof MockTransaction, 'Transaction should be MockTransaction instance');
  assert.strictEqual(adapter.getTransactions().length, 1, 'Should have one transaction');
  
  await tx.query('INSERT INTO users (name) VALUES (?)', ['Test User']);
  await tx.commit();
  
  assert.strictEqual(tx.isCommitted, true, 'Transaction should be committed');
});

test('Database Adapters - should handle connection pool operations', async () => {
  const adapter = new MockAdapter();
  const config = {
    filename: ':memory:',
    pool: { min: 2, max: 10 }
  };
  
  await adapter.connect(config);
  
  const connection1 = await adapter.pool.acquire();
  const connection2 = await adapter.pool.acquire();
  
  assert.ok(connection1 instanceof MockConnection, 'Connection1 should be MockConnection');
  assert.ok(connection2 instanceof MockConnection, 'Connection2 should be MockConnection');
  assert.notStrictEqual(connection1.id, connection2.id, 'Connections should have different IDs');
  
  await adapter.pool.release(connection1);
  await adapter.pool.release(connection2);
  
  assert.strictEqual(adapter.pool.released.length, 2, 'Should have released 2 connections');
});

console.log('✓ All database adapter tests completed');
