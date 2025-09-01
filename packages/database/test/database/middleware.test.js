/**
 * Tests for Database Middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  withDatabase, 
  withTransaction, 
  withModel, 
  withPagination,
  withQueryValidation,
  withHealthCheck,
  withConnectionPool
} from '../../src/middleware.js';

describe('Database Middleware', () => {
  let mockDb;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockDb = {
      isConnected: true,
      connect: vi.fn().mockResolvedValue(),
      query: vi.fn(),
      transaction: vi.fn(),
      models: { User: {}, Post: {} },
      getStats: vi.fn()
    };

    mockReq = {
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      on: vi.fn()
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('withDatabase', () => {
    it('should attach database to request', async () => {
      const middleware = withDatabase(mockDb);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.db).toBe(mockDb);
      expect(mockReq.dbQuery).toBeTypeOf('function');
      expect(mockReq.transaction).toBeTypeOf('function');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should connect database if autoConnect is true', async () => {
      mockDb.isConnected = false;
      const middleware = withDatabase(mockDb, { autoConnect: true });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockDb.connect).toHaveBeenCalled();
    });

    it('should not connect if already connected', async () => {
      const middleware = withDatabase(mockDb, { autoConnect: true });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockDb.connect).not.toHaveBeenCalled();
    });

    it('should attach models if configured', async () => {
      const middleware = withDatabase(mockDb, { attachModels: true });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.models).toBe(mockDb.models);
    });

    it('should not attach models if not configured', async () => {
      const middleware = withDatabase(mockDb, { attachModels: false });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.models).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const _error = new Error('Database connection failed');
      mockDb.connect.mockRejectedValue(_error);
      mockDb.isConnected = false;
      
      const middleware = withDatabase(mockDb, { autoConnect: true });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(_error);
    });

    describe('request.query helper', () => {
      it('should execute database query', async () => {
        const mockResult = { rows: [{ id: 1 }] };
        mockDb.query.mockResolvedValue(mockResult);
        
        const middleware = withDatabase(mockDb);
        await middleware(mockReq, mockRes, mockNext);
        
        const result = await mockReq.dbQuery('SELECT * FROM users', [], { single: true });
        
        expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users', [], { single: true });
        expect(result).toBe(mockResult);
      });
    });

    describe('request.transaction helper', () => {
      it('should execute callback in transaction', async () => {
        const mockTx = {
          commit: vi.fn().mockResolvedValue(),
          rollback: vi.fn().mockResolvedValue()
        };
        mockDb.transaction.mockResolvedValue(mockTx);
        
        const middleware = withDatabase(mockDb);
        await middleware(mockReq, mockRes, mockNext);
        
        const callback = vi.fn().mockResolvedValue('result');
        const result = await mockReq.transaction(callback);
        
        expect(mockDb.transaction).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith(mockTx);
        expect(mockTx.commit).toHaveBeenCalled();
        expect(result).toBe('result');
      });

      it('should rollback transaction on _error', async () => {
        const mockTx = {
          commit: vi.fn(),
          rollback: vi.fn().mockResolvedValue()
        };
        mockDb.transaction.mockResolvedValue(mockTx);
        
        const middleware = withDatabase(mockDb);
        await middleware(mockReq, mockRes, mockNext);
        
        const callback = vi.fn().mockRejectedValue(new Error('Transaction failed'));
        
        await expect(mockReq.transaction(callback)).rejects.toThrow('Transaction failed');
        expect(mockTx.rollback).toHaveBeenCalled();
        expect(mockTx.commit).not.toHaveBeenCalled();
      });
    });
  });

  describe('withTransaction', () => {
    it('should create transaction and attach to request', async () => {
      const mockTx = {
        commit: vi.fn().mockResolvedValue(),
        rollback: vi.fn(),
        isCommitted: false,
        isRolledBack: false
      };
      mockDb.transaction.mockResolvedValue(mockTx);
      
      const middleware = withTransaction(mockDb);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.tx).toBe(mockTx);
      expect(mockNext).toHaveBeenCalled();
      expect(mockTx.commit).toHaveBeenCalled();
    });

    it('should not commit if already committed', async () => {
      const mockTx = {
        commit: vi.fn(),
        rollback: vi.fn(),
        isCommitted: true,
        isRolledBack: false
      };
      mockDb.transaction.mockResolvedValue(mockTx);
      
      const middleware = withTransaction(mockDb);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockTx.commit).not.toHaveBeenCalled();
    });

    it('should rollback on _error', async () => {
      const mockTx = {
        commit: vi.fn(),
        rollback: vi.fn().mockResolvedValue(),
        isCommitted: false,
        isRolledBack: false
      };
      mockDb.transaction.mockResolvedValue(mockTx);
      mockNext.mockRejectedValue(new Error('Handler failed'));
      
      const middleware = withTransaction(mockDb);
      
      await expect(middleware(mockReq, mockRes, mockNext)).rejects.toThrow('Handler failed');
      expect(mockTx.rollback).toHaveBeenCalled();
    });

    it('should not rollback if already rolled back', async () => {
      const mockTx = {
        commit: vi.fn(),
        rollback: vi.fn(),
        isCommitted: false,
        isRolledBack: true
      };
      mockDb.transaction.mockResolvedValue(mockTx);
      mockNext.mockRejectedValue(new Error('Handler failed'));
      
      const middleware = withTransaction(mockDb);
      
      await expect(middleware(mockReq, mockRes, mockNext)).rejects.toThrow('Handler failed');
      expect(mockTx.rollback).not.toHaveBeenCalled();
    });

    it('should pass transaction options', async () => {
      const options = { isolationLevel: 'READ COMMITTED' };
      const middleware = withTransaction(mockDb, options);
      
      mockDb.transaction.mockResolvedValue({
        commit: vi.fn().mockResolvedValue(),
        rollback: vi.fn(),
        isCommitted: false,
        isRolledBack: false
      });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockDb.transaction).toHaveBeenCalledWith({ ...options, readOnly: false });
    });
  });

  describe('withModel', () => {
    let MockModel;

    beforeEach(() => {
      MockModel = {
        name: 'User',
        find: vi.fn()
      };
    });

    it('should load model and attach to request', async () => {
      const mockUser = { id: 1, name: 'John' };
      MockModel.find.mockResolvedValue(mockUser);
      mockReq.params.id = '1';
      
      const middleware = withModel(MockModel);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(MockModel.find).toHaveBeenCalledWith('1');
      expect(mockReq.user).toBe(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom parameter name', async () => {
      const mockUser = { id: 1, name: 'John' };
      MockModel.find.mockResolvedValue(mockUser);
      mockReq.params.userId = '1';
      
      const middleware = withModel(MockModel, 'userId');
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(MockModel.find).toHaveBeenCalledWith('1');
      expect(mockReq.user).toBe(mockUser);
    });

    it('should use custom request key', async () => {
      const mockUser = { id: 1, name: 'John' };
      MockModel.find.mockResolvedValue(mockUser);
      mockReq.params.id = '1';
      
      const middleware = withModel(MockModel, 'id', 'currentUser');
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.currentUser).toBe(mockUser);
    });

    it('should return 400 if parameter is missing', async () => {
      const middleware = withModel(MockModel);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Parameter 'id' is required",
          status: 400
        })
      );
    });

    it('should return 404 if model not found', async () => {
      MockModel.find.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      const middleware = withModel(MockModel);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
          status: 404
        })
      );
    });

    it('should handle database errors', async () => {
      const _error = new Error('Database _error');
      MockModel.find.mockRejectedValue(_error);
      mockReq.params.id = '1';
      
      const middleware = withModel(MockModel);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(_error);
    });
  });

  describe('withPagination', () => {
    it('should add pagination info to request', async () => {
      mockReq.query = { page: '2', limit: '10' };
      
      const middleware = withPagination();
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.pagination).toEqual({
        page: 2,
        limit: 10,
        offset: 10,
        hasNext: null,
        hasPrev: true,
        totalPages: null,
        totalCount: null
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use default values', async () => {
      const middleware = withPagination({ defaultLimit: 25 });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.pagination).toEqual({
        page: 1,
        limit: 25,
        offset: 0,
        hasNext: null,
        hasPrev: false,
        totalPages: null,
        totalCount: null
      });
    });

    it('should enforce max limit', async () => {
      mockReq.query = { limit: '200' };
      
      const middleware = withPagination({ maxLimit: 50 });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.pagination.limit).toBe(50);
    });

    it('should enforce minimum values', async () => {
      mockReq.query = { page: '0', limit: '0' };
      
      const middleware = withPagination();
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.pagination.page).toBe(1);
      expect(mockReq.pagination.limit).toBe(20);
    });

    it('should use custom parameter names', async () => {
      mockReq.query = { p: '3', size: '15' };
      
      const middleware = withPagination({
        pageParam: 'p',
        limitParam: 'size'
      });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.pagination.page).toBe(3);
      expect(mockReq.pagination.limit).toBe(15);
    });
  });

  describe('withQueryValidation', () => {
    const schema = {
      status: { type: 'string', enum: ['active', 'inactive'] },
      age: { type: 'number', min: 0, max: 120 },
      verified: { type: 'boolean' },
      tags: { type: 'array' }
    };

    it('should validate and coerce query parameters', async () => {
      mockReq.query = {
        status: 'active',
        age: '25',
        verified: 'true',
        tags: 'single'
      };
      
      const middleware = withQueryValidation(schema);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.query).toEqual({
        status: 'active',
        age: 25,
        verified: true,
        tags: ['single']
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail validation for invalid enum value', async () => {
      mockReq.query = { status: 'invalid' };
      
      const middleware = withQueryValidation(schema);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Query parameter 'status' must be one of: active, inactive",
          status: 400
        })
      );
    });

    it('should fail validation for invalid number', async () => {
      mockReq.query = { age: 'not-a-number' };
      
      const middleware = withQueryValidation(schema);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Query parameter 'age' must be a number",
          status: 400
        })
      );
    });

    it('should fail validation for out of range number', async () => {
      mockReq.query = { age: '150' };
      
      const middleware = withQueryValidation(schema);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Query parameter 'age' must be at most 120",
          status: 400
        })
      );
    });

    it('should fail validation for required field', async () => {
      const requiredSchema = {
        name: { required: true, type: 'string' }
      };
      
      const middleware = withQueryValidation(requiredSchema);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Query parameter 'name' is required",
          status: 400
        })
      );
    });

    it('should preserve unknown fields when stripUnknown is false', async () => {
      mockReq.query = {
        status: 'active',
        unknown: 'value'
      };
      
      const middleware = withQueryValidation(schema, { stripUnknown: false });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.query.unknown).toBe('value');
    });

    it('should skip empty non-required fields', async () => {
      mockReq.query = {
        status: '',
        age: null
      };
      
      const middleware = withQueryValidation(schema);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.query).toEqual({});
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('withHealthCheck', () => {
    it('should perform successful health check', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ result: 1 }] });
      mockDb.getStats.mockReturnValue({ connections: 5 });
      
      const middleware = withHealthCheck(mockDb);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.dbHealth).toMatchObject({
        status: 'healthy',
        responseTime: expect.any(Number),
        connected: true,
        stats: { connections: 5 }
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle health check failure', async () => {
      mockDb.query.mockRejectedValue(new Error('Connection failed'));
      
      const middleware = withHealthCheck(mockDb);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.dbHealth).toMatchObject({
        status: 'unhealthy',
        _error: 'Connection failed',
        connected: true
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should timeout health check', async () => {
      mockDb.query.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const middleware = withHealthCheck(mockDb, { timeout: 50 });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.dbHealth.status).toBe('unhealthy');
      expect(mockReq.dbHealth._error).toBe('Health check timeout');
    });

    it('should exclude stats when configured', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ result: 1 }] });
      
      const middleware = withHealthCheck(mockDb, { includeStats: false });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.dbHealth.stats).toBeUndefined();
    });
  });

  describe('withConnectionPool', () => {
    let mockPool;
    let mockConnection;

    beforeEach(() => {
      mockConnection = { id: 'conn-1' };
      mockPool = {
        acquire: vi.fn().mockResolvedValue(mockConnection),
        release: vi.fn()
      };
      mockDb.pool = mockPool;
      mockDb.adapter = {
        query: vi.fn().mockResolvedValue({ rows: [] })
      };
    });

    it('should acquire connection and attach to request', async () => {
      const middleware = withConnectionPool(mockDb);
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockPool.acquire).toHaveBeenCalledWith(30000);
      expect(mockReq.dbConnection).toBe(mockConnection);
      expect(mockReq.dbQuery).toBeTypeOf('function');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom acquire timeout', async () => {
      const middleware = withConnectionPool(mockDb, { acquireTimeout: 10000 });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockPool.acquire).toHaveBeenCalledWith(10000);
    });

    it('should override query method to use connection', async () => {
      const middleware = withConnectionPool(mockDb);
      
      await middleware(mockReq, mockRes, mockNext);
      
      await mockReq.dbQuery('SELECT 1', [], {});
      
      expect(mockDb.adapter.query).toHaveBeenCalledWith(mockConnection, 'SELECT 1', [], {});
    });

    it('should release connection on response finish', async () => {
      const middleware = withConnectionPool(mockDb, { releaseOnResponse: true });
      
      await middleware(mockReq, mockRes, mockNext);
      
      // Simulate response finish event
      const finishHandler = mockRes.on.mock.calls.find(call => call[0] === 'finish')[1];
      finishHandler();
      
      expect(mockPool.release).toHaveBeenCalledWith(mockConnection);
    });

    it('should not set up response listener when disabled', async () => {
      const middleware = withConnectionPool(mockDb, { releaseOnResponse: false });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.on).not.toHaveBeenCalled();
    });

    it('should release connection on _error', async () => {
      mockNext.mockRejectedValue(new Error('Handler failed'));
      
      const middleware = withConnectionPool(mockDb);
      
      await expect(middleware(mockReq, mockRes, mockNext)).rejects.toThrow('Handler failed');
      expect(mockPool.release).toHaveBeenCalledWith(mockConnection);
    });

    it('should handle acquire _error', async () => {
      const _error = new Error('Pool exhausted');
      mockPool.acquire.mockRejectedValue(_error);
      
      const middleware = withConnectionPool(mockDb);
      
      await expect(middleware(mockReq, mockRes, mockNext)).rejects.toThrow('Pool exhausted');
    });
  });
});
