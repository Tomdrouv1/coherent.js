/**
 * Tests for Database Connection Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseManager } from '../../../../src/database/connection-manager.js';

describe('DatabaseManager', () => {
  let db;
  let mockAdapter;
  let mockPool;

  beforeEach(() => {
    // Mock adapter
    mockAdapter = {
      createPool: vi.fn(),
      testConnection: vi.fn(),
      query: vi.fn(),
      transaction: vi.fn(),
      getPoolStats: vi.fn(),
      closePool: vi.fn()
    };

    // Mock pool
    mockPool = {
      acquire: vi.fn(),
      release: vi.fn(),
      destroy: vi.fn()
    };

    // Setup mock adapter to return mock pool and pass connection tests
    mockAdapter.createPool.mockResolvedValue(mockPool);
    mockAdapter.testConnection.mockResolvedValue(true);
    mockAdapter.getPoolStats.mockReturnValue({ total: 1, used: 0, available: 1 });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    if (db) {
      db.removeAllListeners();
    }
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const config = {
        type: 'sqlite',
        database: 'test.db'
      };

      db = new DatabaseManager(config);

      expect(db.config.type).toBe('sqlite');
      expect(db.config.database).toBe('test.db');
      expect(db.isConnected).toBe(false);
    });

    it('should throw error for missing config', () => {
      expect(() => new DatabaseManager()).toThrow('Database configuration is required');
    });

    it('should throw error for missing type', () => {
      expect(() => new DatabaseManager({})).toThrow('Either database type or adapter is required');
    });

    it('should throw error for unsupported type', () => {
      expect(() => new DatabaseManager({ type: 'unsupported', database: 'test' }))
        .toThrow('Unsupported database type: unsupported');
    });

    it('should throw error for missing database name', () => {
      expect(() => new DatabaseManager({ type: 'sqlite' }))
        .toThrow('Database name is required');
    });

    it('should set default port based on database type', () => {
      const configs = [
        { type: 'postgresql', database: 'test', expectedPort: 5432 },
        { type: 'mysql', database: 'test', expectedPort: 3306 },
        { type: 'mongodb', database: 'test', expectedPort: 27017 },
        { type: 'sqlite', database: 'test.db', expectedPort: null }
      ];

      configs.forEach(({ type, database, expectedPort }) => {
        const db = new DatabaseManager({ type, database });
        expect(db.config.port).toBe(expectedPort);
      });
    });

    it('should merge default pool configuration', () => {
      const config = {
        type: 'sqlite',
        database: 'test.db',
        pool: { min: 5 }
      };

      db = new DatabaseManager(config);

      expect(db.config.pool.min).toBe(5);
      expect(db.config.pool.max).toBe(10); // default
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      db = new DatabaseManager({
        adapter: mockAdapter,
        store: { name: 'test.db' }
      });
    });

    it('should connect successfully', async () => {
      mockAdapter.createPool.mockResolvedValue(mockPool);
      mockAdapter.testConnection.mockResolvedValue();

      await db.connect();

      expect(db.isConnected).toBe(true);
      expect(mockAdapter.createPool).toHaveBeenCalledWith(db.config);
      expect(mockAdapter.testConnection).toHaveBeenCalled();
    });

    it('should not reconnect if already connected', async () => {
      db.isConnected = true;
      mockAdapter.createPool.mockResolvedValue(mockPool);

      await db.connect();

      expect(mockAdapter.createPool).not.toHaveBeenCalled();
    });

    it('should retry on connection failure', async () => {
      mockAdapter.createPool
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValue(mockPool);
      mockAdapter.testConnection.mockResolvedValue();

      const errorSpy = vi.fn();
      db.on('error', errorSpy);

      await db.connect();

      expect(db.isConnected).toBe(true);
      expect(mockAdapter.createPool).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries', async () => {
      mockAdapter.createPool.mockRejectedValue(new Error('Connection failed'));

      await expect(db.connect()).rejects.toThrow('Connection failed');
      expect(mockAdapter.createPool).toHaveBeenCalledTimes(1);
    });

    it('should connect without starting health checks when adapter does not support them', async () => {
      mockAdapter.createPool.mockResolvedValue(mockPool);
      mockAdapter.testConnection.mockResolvedValue();

      await db.connect();

      expect(db.isConnected).toBe(true);
      // Health checks should not start if adapter doesn't support them
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      db = new DatabaseManager({
        adapter: mockAdapter,
        store: { name: 'test.db' }
      });

      mockAdapter.createPool.mockResolvedValue(mockPool);
      mockAdapter.testConnection.mockResolvedValue();
      await db.connect();
    });

    it('should execute query successfully', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
      mockAdapter.query.mockResolvedValue(mockResult);

      const result = await db.query('SELECT * FROM users', []);

      expect(mockAdapter.query).toHaveBeenCalledWith(mockPool, 'SELECT * FROM users', []);
      expect(result).toEqual(mockResult);
    });

    it('should throw error if not connected', async () => {
      db.isConnected = false;

      await expect(db.query('SELECT 1')).rejects.toThrow('Database not connected');
    });

    it('should emit query event', async () => {
      const mockResult = { rowCount: 1 };
      mockAdapter.query.mockResolvedValue(mockResult);

      const querySpy = vi.fn();
      db.on('query', querySpy);

      await db.query('SELECT * FROM users', ['param']);

      expect(querySpy).toHaveBeenCalledWith({
        operation: 'SELECT * FROM users',
        params: ['param'],
        duration: expect.any(Number)
      });
    });

    it('should emit queryError event on failure', async () => {
      mockAdapter.query.mockRejectedValue(new Error('Query failed'));

      const queryErrorSpy = vi.fn();
      db.on('queryError', queryErrorSpy);

      await expect(db.query('INVALID SQL')).rejects.toThrow('Query failed');
      expect(queryErrorSpy).toHaveBeenCalledWith({
        operation: 'INVALID SQL',
        params: {},
        duration: expect.any(Number),
        error: 'Query failed'
      });
    });

    it('should update query statistics', async () => {
      const mockResult = { rowCount: 5 };
      mockAdapter.query.mockResolvedValue(mockResult);

      const initialStats = db.getStats();
      expect(initialStats.queriesExecuted).toBe(0);

      await db.query('SELECT * FROM users');

      const updatedStats = db.getStats();
      expect(updatedStats.queriesExecuted).toBe(1);
      expect(updatedStats.averageQueryTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('transaction', () => {
    beforeEach(async () => {
      db = new DatabaseManager({
        adapter: mockAdapter,
        store: { name: 'test.db' }
      });

      mockAdapter.createPool.mockResolvedValue(mockPool);
      mockAdapter.testConnection.mockResolvedValue();
      await db.connect();
    });

    it('should create transaction successfully', async () => {
      const mockTransaction = { commit: vi.fn(), rollback: vi.fn() };
      mockAdapter.transaction.mockResolvedValue(mockTransaction);

      const transaction = await db.transaction();

      expect(mockAdapter.transaction).toHaveBeenCalledWith(mockPool);
      expect(transaction).toEqual(mockTransaction);
    });

    it('should throw error if not connected', async () => {
      db.isConnected = false;

      await expect(db.transaction()).rejects.toThrow('Database not connected');
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      db = new DatabaseManager({
        adapter: mockAdapter,
        store: { name: 'test.db' }
      });
    });

    it('should return stats without pool when not connected', () => {
      const stats = db.getStats();

      expect(stats).toMatchObject({
        totalConnections: 0,
        activeConnections: 0,
        failedConnections: 0,
        queriesExecuted: 0,
        averageQueryTime: 0,
        lastHealthCheck: null,
        isConnected: false,
        poolStats: null
      });
    });

    it('should return stats with pool when connected', async () => {
      const mockPoolStats = { total: 5, available: 3 };
      mockAdapter.createPool.mockResolvedValue(mockPool);
      mockAdapter.testConnection.mockResolvedValue();
      mockAdapter.getPoolStats.mockReturnValue(mockPoolStats);

      await db.connect();
      const stats = db.getStats();

      expect(stats.isConnected).toBe(true);
      expect(stats.poolStats).toEqual(mockPoolStats);
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      db = new DatabaseManager({
        adapter: mockAdapter,
        store: { name: 'test.db' }
      });

      mockAdapter.createPool.mockResolvedValue(mockPool);
      mockAdapter.testConnection.mockResolvedValue();
      mockAdapter.closePool.mockResolvedValue();
      await db.connect();
    });

    it('should close connection successfully', async () => {
      const disconnectedSpy = vi.fn();
      db.on('disconnected', disconnectedSpy);

      await db.close();

      expect(mockAdapter.closePool).toHaveBeenCalledWith(mockPool);
      expect(db.isConnected).toBe(false);
      expect(db.pool).toBe(null);
      expect(db.adapter).toBe(null);
      expect(disconnectedSpy).toHaveBeenCalled();
    });

    it('should not error if already disconnected', async () => {
      await db.close();
      
      // Should not throw
      await db.close();
      
      expect(mockAdapter.closePool).toHaveBeenCalledTimes(1);
    });

    it('should close successfully', async () => {
      await expect(db.close()).resolves.toBeUndefined();
      expect(db.isConnected).toBe(false);
    });
  });

  describe('health checks', () => {
    beforeEach(async () => {
      db = new DatabaseManager({
        adapter: mockAdapter,
        store: { name: 'test.db' }
      });

      mockAdapter.createPool.mockResolvedValue(mockPool);
      mockAdapter.testConnection.mockResolvedValue();
      await db.connect();
    });

    it('should test connection successfully', async () => {
      mockAdapter.testConnection.mockResolvedValue();
      await expect(db.testConnection()).resolves.toBeUndefined();
    });

    it('should throw error on failed connection test', async () => {
      mockAdapter.testConnection.mockRejectedValue(new Error('Health check failed'));
      await expect(db.testConnection()).rejects.toThrow('Health check failed');
    });
  });
});
