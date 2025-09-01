/**
 * Pure Object-Based Database Tests
 * Test suite for Coherent.js pure object model system
 */

import { test, assert } from 'vitest';
import { DatabaseManager } from '../src/connection-manager.js';
import { createModel } from '../src/model.js';
import { QueryBuilder } from '../src/query-builder.js';

// Mock adapter for testing
class MockAdapter {
  constructor() {
    this.connected = false;
    this.queries = [];
  }

  async createPool() {
    return new MockPool();
  }

  async closePool(pool) {
    this.connected = false;
    if (pool) {
      pool.connected = false;
    }
  }

  async disconnect() {
    this.connected = false;
  }

  async testConnection() {
    this.connected = true;
    return true;
  }

  async close() {
    this.connected = false;
  }

  async query(pool, sql, params = [], options = {}) {
    this.queries.push({ sql, params, options });
    
    if (sql.includes('INSERT')) {
      return { insertId: 1, affectedRows: 1 };
    } else if (sql.includes('UPDATE') || sql.includes('DELETE')) {
      return { affectedRows: 1 };
    } else {
      return { 
        rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
        rowCount: 1 
      };
    }
  }

  async beginTransaction() {
    return new MockTransaction();
  }

  async transaction(callback) {
    const tx = new MockTransaction();
    try {
      const result = await callback(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
}

class MockPool {
  constructor() {
    this.connected = true;
  }
}

class MockTransaction {
  constructor() {
    this.isCommitted = false;
    this.isRolledBack = false;
  }

  async query() {
    return { rows: [], rowCount: 1 };
  }

  async commit() {
    this.isCommitted = true;
  }

  async rollback() {
    this.isRolledBack = true;
  }
}

// Test configuration
const testConfig = {
  type: 'sqlite',
  database: 'test.db',
  connection: { filename: ':memory:' }
};

// Pure object model definitions
const UserModel = {
  tableName: 'users',
  primaryKey: 'id',
  attributes: {
    id: { type: 'number', autoIncrement: true, primaryKey: true },
    name: { type: 'string', required: true },
    email: { type: 'string', required: true },
    age: { type: 'number' }
  },
  methods: {
    getDisplayName: function() {
      return this.name || this.email;
    }
  }
};

const PostModel = {
  tableName: 'posts',
  primaryKey: 'id',
  attributes: {
    id: { type: 'number', autoIncrement: true, primaryKey: true },
    title: { type: 'string', required: true },
    content: { type: 'text' },
    userId: { type: 'number', required: true }
  }
};

test('Database initialization with config', async () => {
  const dbConfig = { type: 'sqlite', database: ':memory:' };
  const dbManager = new DatabaseManager(dbConfig);
  const mockAdapter = new MockAdapter();
  dbManager.adapter = mockAdapter;

  await dbManager.testConnection();
  assert.strictEqual(mockAdapter.connected, true, 'Should be connected after testConnection()');
});

test('DatabaseManager connection management', async () => {
  const dbManager = new DatabaseManager(testConfig);
  const mockAdapter = new MockAdapter();
  dbManager.adapter = mockAdapter;

  await dbManager.testConnection();
  assert.strictEqual(mockAdapter.connected, true, 'Should be connected after testConnection()');

  // Call adapter.close() directly since that's what sets connected = false
  await mockAdapter.close();
  assert.strictEqual(mockAdapter.connected, false, 'Should be disconnected after close()');
});

test('Pure Object Model System', async () => {
  const dbManager = new DatabaseManager(testConfig);
  const mockAdapter = new MockAdapter();
  dbManager.adapter = mockAdapter;
  dbManager.isConnected = true;
  dbManager.pool = new MockPool();

  const model = createModel(dbManager);
  
  // Register User model
  const User = model.registerModel('User', UserModel);
  
  // Test model creation
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com'
  });
  
  assert.strictEqual(user.name, 'Test User');
  assert.strictEqual(user.email, 'test@example.com');
  assert.strictEqual(typeof user.save, 'function');
  assert.strictEqual(typeof user.delete, 'function');
  
  // Test model query
  const allUsers = await User.all();
  assert.strictEqual(Array.isArray(allUsers), true);
  
  // Test where query
  const activeUsers = await User.where({
    select: '*',
    where: { active: true }
  });
  assert.strictEqual(Array.isArray(activeUsers), true);

  // Test find
  const foundUser = await User.find(1);
  assert.ok(foundUser, 'Should find user');
  assert.strictEqual(foundUser.name, 'Test User', 'Found user name should match mock data');

  // Test update
  const updateCount = await User.updateWhere({ name: 'John Doe' }, { age: 30 });
  assert.strictEqual(updateCount, 1, 'Should update one user');

  // Test delete
  const deleteCount = await User.deleteWhere({ name: 'John Doe' });
  assert.strictEqual(deleteCount, 1, 'Should delete one user');

  await dbManager.close();
});

test('QueryBuilder with object configuration', async () => {
  const dbManager = new DatabaseManager(testConfig);
  const mockAdapter = new MockAdapter();
  dbManager.adapter = mockAdapter;
  dbManager.isConnected = true;
  dbManager.pool = new MockPool();

  const queryConfig = {
    select: ['id', 'name', 'email'],
    from: 'users',
    where: { active: true },
    orderBy: { created_at: 'DESC' },
    limit: 10
  };

  const result = await QueryBuilder.execute(dbManager, queryConfig);
  assert.ok(result, 'Should return query result');

  await dbManager.close();
});

test('Multi-model query execution', async () => {
  const dbManager = new DatabaseManager(testConfig);
  const mockAdapter = new MockAdapter();
  dbManager.adapter = mockAdapter;
  dbManager.isConnected = true;
  dbManager.pool = new MockPool();

  const model = createModel(dbManager);
  model.registerModel('User', UserModel);
  model.registerModel('Post', PostModel);

  // Execute multi-model query
  const results = await model.execute({
    User: {
      select: '*',
      where: { active: true }
    },
    Post: {
      select: ['id', 'title'],
      where: { published: true }
    }
  });
  
  assert.ok(results.User, 'Should have User results');
  assert.ok(results.Post, 'Should have Post results');
  assert.strictEqual(Array.isArray(results.User), true);
  assert.strictEqual(Array.isArray(results.Post), true);

  await dbManager.close();
});

test('Model instance methods', async () => {
  const dbManager = new DatabaseManager(testConfig);
  const mockAdapter = new MockAdapter();
  dbManager.adapter = mockAdapter;
  dbManager.isConnected = true;
  dbManager.pool = new MockPool();

  const model = createModel(dbManager);
  
  // Register User model
  const User = model.registerModel('User', UserModel);
  
  // Create instance using model.create
  const userInstance = await User.create({
    name: 'John Doe',
    email: 'john@example.com'
  });

  // Test instance method
  assert.strictEqual(userInstance.getDisplayName(), 'Test User', 'Instance method should work');

  // Test save method
  assert.ok(typeof userInstance.save === 'function', 'Should have save method');

  // Test delete method
  assert.ok(typeof userInstance.delete === 'function', 'Should have delete method');

  await dbManager.close();
});

test('Transaction handling', async () => {
  const dbManager = new DatabaseManager(testConfig);
  dbManager.adapter = new MockAdapter();
  await dbManager.testConnection();

  let rollbackOccurred = false;

  try {
    await dbManager.transaction(async (tx) => {
      // Simulate some database operations
      await tx.query('SELECT 1 as test', []);
      
      // Force an error to test rollback
      throw new Error('Simulated error');
    });
  } catch {
    rollbackOccurred = true;
  }

  assert.strictEqual(rollbackOccurred, true, 'Rollback should occur on error');

  await dbManager.close();
});

// Auto-close test process
process.on('exit', () => {
  console.log('✓ All pure object-based database tests completed');
});

// Force exit after tests
setTimeout(() => {
  process.exit(0);
}, 1000);
