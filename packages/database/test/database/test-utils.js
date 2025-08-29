/**
 * Test Utilities and Mocks for Database Testing
 */

import { vi } from "vitest";

/**
 * Mock Database Adapter
 */
export class MockAdapter {
  constructor(options = {}) {
    this.options = options;
    this.connected = false;
    this.pool = null;
    this.queries = [];
    this.transactions = [];
    this.errors = options.errors || {};
    // Simple in-memory storage for testing
    this.data = {
      coherent_migrations: []
    };
  }

  async connect(config) {
    if (this.errors.connect) {
      throw new Error(this.errors.connect);
    }
    this.connected = true;
    this.pool = new MockPool(config.pool || {}, this); // Pass adapter reference for query tracking
    return this.pool;
  }

  async createPool(config) {
    return this.connect(config);
  }

  async testConnection() {
    if (this.errors.testConnection) {
      throw new Error(this.errors.testConnection);
    }
    return true;
  }

  async disconnect() {
    this.connected = false;
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async closePool(pool) {
    if (pool && pool.end) {
      await pool.end();
    }
  }

  async transaction(options = {}) {
    if (this.errors.transaction) {
      throw new Error(this.errors.transaction);
    }
    return new MockTransaction(this.pool, options, this);
  }

  async query(connection, sql, params = [], options = {}) {
    if (this.errors.query) {
      throw new Error(this.errors.query);
    }

    const query = { sql, params, options, timestamp: Date.now() };
    this.queries.push(query);

    // Handle migrations table operations
    if (sql.includes('coherent_migrations')) {
      if (sql.includes('INSERT')) {
        // Store migration record
        const [migration, batch] = params;
        this.data.coherent_migrations.push({
          migration,
          batch: batch || 1,
          executed_at: new Date()
        });
        return {
          rows: [{ id: this.data.coherent_migrations.length }],
          rowCount: 1
        };
      } else if (sql.includes('SELECT')) {
        if (sql.includes('MAX(batch)')) {
          // Return max batch number
          const maxBatch = Math.max(...this.data.coherent_migrations.map(m => m.batch), 0);
          return {
            rows: [{ max_batch: maxBatch }],
            rowCount: 1
          };
        } else if (sql.includes('migration FROM')) {
          // Return applied migrations
          return {
            rows: this.data.coherent_migrations.map(m => ({ migration: m.migration })),
            rowCount: this.data.coherent_migrations.length
          };
        }
      }
    }

    // Return mock results based on SQL
    if (sql.includes('SELECT')) {
      return {
        rows: options.mockRows || [{ id: 1, name: 'Test' }],
        rowCount: options.mockRows?.length || 1
      };
    } else if (sql.includes('INSERT')) {
      return {
        rows: [{ id: options.insertId || 1 }],
        rowCount: 1,
        insertId: options.insertId || 1
      };
    } else if (sql.includes('UPDATE') || sql.includes('DELETE')) {
      return {
        rows: [],
        rowCount: options.affectedRows || 1
      };
    }

    return { rows: [], rowCount: 0 };
  }

  async beginTransaction(connection, options = {}) {
    if (this.errors.transaction) {
      throw new Error(this.errors.transaction);
    }

    const tx = new MockTransaction(connection, options);
    this.transactions.push(tx);
    return tx;
  }

  getLastQuery() {
    return this.queries[this.queries.length - 1];
  }

  getQueries() {
    return [...this.queries];
  }

  clearQueries() {
    this.queries = [];
  }

  getTransactions() {
    return [...this.transactions];
  }

  clearTransactions() {
    this.transactions = [];
  }
}

/**
 * Mock Connection Pool
 */
export class MockPool {
  constructor(options = {}, adapter = null) {
    this.options = options;
    this.adapter = adapter; // Reference to adapter for query tracking
    this.connections = [];
    this.acquired = [];
    this.released = [];
    this.maxConnections = options.max || 10;
    this.minConnections = options.min || 2;
    this.acquireTimeout = options.acquireTimeoutMillis || 30000;
    this.createTimeout = options.createTimeoutMillis || 30000;
    this.idleTimeout = options.idleTimeoutMillis || 30000;
    this.reapInterval = options.reapIntervalMillis || 1000;
    this.createRetryInterval = options.createRetryIntervalMillis || 200;
    this.createMaxRetries = options.createMaxRetries || 3;
    this.ended = false;
  }

  async acquire() {
    if (this.ended) {
      throw new Error('Pool has been destroyed');
    }

    const connection = new MockConnection(`conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    this.acquired.push({ connection, timestamp: Date.now() });
    return connection;
  }

  async release(connection) {
    this.released.push({ connection, timestamp: Date.now() });
  }

  async destroy(connection) {
    // Remove from acquired list
    const index = this.acquired.findIndex(item => item.connection === connection);
    if (index !== -1) {
      this.acquired.splice(index, 1);
    }
  }

  async query(sql, params = [], options = {}) {
    // Delegate to adapter for query tracking
    if (this.adapter && typeof this.adapter.query === 'function') {
      return await this.adapter.query(null, sql, params, options);
    }
    
    // Fallback mock response
    if (sql.includes('SELECT')) {
      return {
        rows: options.mockRows || [{ id: 1, name: 'Test' }],
        rowCount: options.mockRows?.length || 1
      };
    } else if (sql.includes('INSERT')) {
      return {
        rows: [{ id: options.insertId || 1 }],
        rowCount: 1,
        insertId: options.insertId || 1
      };
    } else if (sql.includes('UPDATE') || sql.includes('DELETE')) {
      return {
        rows: [],
        rowCount: options.affectedRows || 1
      };
    }

    return { rows: [], rowCount: 0 };
  }

  async end() {
    this.ended = true;
    this.connections = [];
    this.acquired = [];
    this.released = [];
  }

  getStats() {
    return {
      size: this.connections.length,
      available: this.connections.length - this.acquired.length,
      borrowed: this.acquired.length,
      invalid: 0,
      pending: 0,
      max: this.maxConnections,
      min: this.minConnections
    };
  }
}

/**
 * Mock Database Connection
 */
export class MockConnection {
  constructor(id) {
    this.id = id;
    this.connected = true;
    this.inTransaction = false;
  }

  async close() {
    this.connected = false;
  }
}

/**
 * Mock Transaction
 */
export class MockTransaction {
  constructor(connection, options = {}, adapter = null) {
    this.connection = connection;
    this.options = options;
    this.adapter = adapter; // Reference to adapter for data access
    this.isCommitted = false;
    this.isRolledBack = false;
    this.queries = [];
    this.pendingData = []; // Store changes until commit
  }

  async query(sql, params = [], options = {}) {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction has already been finalized');
    }

    const query = { sql, params, options, timestamp: Date.now() };
    this.queries.push(query);

    // Handle migrations table operations in transaction
    if (sql.includes('coherent_migrations')) {
      if (sql.includes('INSERT')) {
        // Store for commit
        const [migration, batch] = params;
        this.pendingData.push({
          type: 'insert',
          table: 'coherent_migrations',
          data: {
            migration,
            batch: batch || 1,
            executed_at: new Date()
          }
        });
        return {
          rows: [{ id: 1 }],
          rowCount: 1
        };
      } else if (sql.includes('SELECT')) {
        // Read current data (including pending if committed)
        if (this.adapter) {
          return this.adapter.query(null, sql, params, options);
        }
      }
    }

    // Mock results similar to adapter
    if (sql.includes('SELECT')) {
      return {
        rows: options.mockRows || [{ id: 1, name: 'Test' }],
        rowCount: options.mockRows?.length || 1
      };
    }

    return { rows: [], rowCount: 1 };
  }

  async commit() {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction has already been finalized');
    }
    
    // Apply pending data to adapter
    if (this.adapter) {
      for (const change of this.pendingData) {
        if (change.type === 'insert' && change.table === 'coherent_migrations') {
          this.adapter.data.coherent_migrations.push(change.data);
        }
      }
    }
    
    this.isCommitted = true;
  }

  async rollback() {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction has already been finalized');
    }
    // Discard pending data
    this.pendingData = [];
    this.isRolledBack = true;
  }
}

/**
 * Mock Model Class
 */
export class MockModel {
  constructor(attributes = {}) {
    this.attributes = { ...attributes };
    this.originalAttributes = { ...attributes };
    this.isNew = !attributes.id;
    this.isDeleted = false;
  }

  static tableName = 'mock_models';
  static primaryKey = 'id';

  static find(id) {
    return Promise.resolve(new MockModel({ id, name: `Model ${id}` }));
  }

  static findBy(criteria) {
    return Promise.resolve(new MockModel({ id: 1, ...criteria }));
  }

  static where(criteria) {
    return Promise.resolve([new MockModel({ id: 1, ...criteria })]);
  }

  static create(attributes) {
    return Promise.resolve(new MockModel({ id: Date.now(), ...attributes }));
  }

  async save() {
    if (!this.isNew) {
      this.attributes.updated_at = new Date();
    } else {
      this.attributes.id = Date.now();
      this.attributes.created_at = new Date();
      this.isNew = false;
    }
    this.originalAttributes = { ...this.attributes };
    return this;
  }

  async delete() {
    this.isDeleted = true;
    return true;
  }

  get(key) {
    return this.attributes[key];
  }

  set(key, value) {
    this.attributes[key] = value;
  }
}

/**
 * Database Test Fixtures
 */
export const fixtures = {
  users: [
    { id: 1, name: 'John Doe', email: 'john@example.com', active: true },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', active: false },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', active: true }
  ],

  posts: [
    { id: 1, title: 'First Post', content: 'Hello World', user_id: 1 },
    { id: 2, title: 'Second Post', content: 'Another post', user_id: 1 },
    { id: 3, title: 'Third Post', content: 'Yet another', user_id: 2 }
  ],

  comments: [
    { id: 1, content: 'Great post!', post_id: 1, user_id: 2 },
    { id: 2, content: 'Thanks!', post_id: 1, user_id: 1 },
    { id: 3, content: 'Interesting', post_id: 2, user_id: 3 }
  ]
};

/**
 * Test Database Configuration
 */
export const testConfig = {
  adapter: 'sqlite',
  connection: {
    filename: ':memory:'
  },
  pool: {
    min: 1,
    max: 5
  },
  debug: false
};

/**
 * Helper Functions
 */
export function createMockRequest(overrides = {}) {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    method: 'GET',
    url: '/',
    ...overrides
  };
}

export function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    json: () => res,
    status: () => res,
    send: () => res,
    end: () => res,
    setHeader: () => res,
    on: () => res
  };
  return res;
}

export function createMockNext() {
  return vi?.fn?.() || (() => {});
}

/**
 * Database Test Helpers
 */
export class DatabaseTestHelper {
  constructor(adapter = new MockAdapter()) {
    this.adapter = adapter;
    this.queries = [];
    this.transactions = [];
  }

  async setupDatabase() {
    await this.adapter.connect(testConfig.connection);
    return this.adapter;
  }

  async teardownDatabase() {
    await this.adapter.disconnect();
  }

  async seedData(tableName, data) {
    for (const row of data) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      await this.adapter.query(null, sql, values);
    }
  }

  async clearTable(tableName) {
    await this.adapter.query(null, `DELETE FROM ${tableName}`);
  }

  getLastQuery() {
    return this.adapter.getLastQuery();
  }

  getQueries() {
    return this.adapter.getQueries();
  }

  clearQueries() {
    this.adapter.clearQueries();
  }

  expectQuery(sql, params = null) {
    const query = this.getLastQuery();
    if (!query.sql.includes(sql)) {
      throw new Error(`Expected query to contain '${sql}', got '${query.sql}'`);
    }
    if (params !== null && JSON.stringify(query.params) !== JSON.stringify(params)) {
      throw new Error(`Expected params ${JSON.stringify(params)}, got ${JSON.stringify(query.params)}`);
    }
  }

  expectNoQueries() {
    if (this.getQueries().length !== 0) {
      throw new Error(`Expected no queries, got ${this.getQueries().length}`);
    }
  }

  expectQueryCount(count) {
    if (this.getQueries().length !== count) {
      throw new Error(`Expected ${count} queries, got ${this.getQueries().length}`);
    }
  }
}

/**
 * Migration Test Helpers
 */
export function createMockMigration(name, version = Date.now()) {
  return {
    name,
    version,
    up: async () => {},
    down: async () => {}
  };
}

export function createMockSchemaBuilder() {
  return {
    createTable: function() { return this; },
    dropTable: function() { return this; },
    alterTable: function() { return this; },
    addColumn: function() { return this; },
    dropColumn: function() { return this; },
    addIndex: function() { return this; },
    dropIndex: function() { return this; },
    execute: async () => {}
  };
}

/**
 * Assertion Helpers
 */
export function expectValidationError(error, field, message) {
  if (!(error instanceof Error)) {
    throw new Error('Expected error to be instance of Error');
  }
  if (!error.message.includes(field)) {
    throw new Error(`Expected error message to contain '${field}'`);
  }
  if (message && !error.message.includes(message)) {
    throw new Error(`Expected error message to contain '${message}'`);
  }
}

export function expectDatabaseError(error, type = 'DatabaseError') {
  if (!(error instanceof Error)) {
    throw new Error('Expected error to be instance of Error');
  }
  const errorType = error.name || error.constructor.name;
  if (errorType !== type) {
    throw new Error(`Expected error type '${type}', got '${errorType}'`);
  }
}

export function expectModelAttributes(model, expected) {
  for (const [key, value] of Object.entries(expected)) {
    const actual = model.get(key);
    if (JSON.stringify(actual) !== JSON.stringify(value)) {
      throw new Error(`Expected ${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`);
    }
  }
}

/**
 * Performance Test Helpers
 */
export class PerformanceTestHelper {
  constructor() {
    this.measurements = [];
  }

  async measure(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    this.measurements.push({
      name,
      duration: end - start,
      timestamp: Date.now()
    });
    
    return result;
  }

  getAverageDuration(name) {
    const measurements = this.measurements.filter(m => m.name === name);
    if (measurements.length === 0) return 0;
    
    const total = measurements.reduce((sum, m) => sum + m.duration, 0);
    return total / measurements.length;
  }

  expectPerformance(name, maxDuration) {
    const avg = this.getAverageDuration(name);
    if (avg >= maxDuration) {
      throw new Error(`Expected average duration for '${name}' to be less than ${maxDuration}ms, got ${avg}ms`);
    }
  }

  clear() {
    this.measurements = [];
  }
}

export default {
  MockAdapter,
  MockPool,
  MockConnection,
  MockTransaction,
  MockModel,
  fixtures,
  testConfig,
  createMockRequest,
  createMockResponse,
  createMockNext,
  DatabaseTestHelper,
  createMockMigration,
  createMockSchemaBuilder,
  expectValidationError,
  expectDatabaseError,
  expectModelAttributes,
  PerformanceTestHelper
};
