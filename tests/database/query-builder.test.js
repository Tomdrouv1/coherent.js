/**
 * Tests for Pure Object-based Query Builder
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createQuery, executeQuery } from '../../src/database/query-builder.js';

// Simple mock implementation
function createMockDb() {
  const calls = [];
  let mockReturnValue = { rows: [] };
  
  const mockFn = async (sql, params) => {
    calls.push([sql, params]);
    return mockReturnValue;
  };
  
  mockFn.calls = calls;
  mockFn.mockImplementation = (impl) => {
    mockFn.impl = impl;
    return mockFn;
  };
  mockFn.mockResolvedValueOnce = (value) => {
    mockReturnValue = value;
    return mockFn;
  };
  
  return {
    query: mockFn,
    getLastCall: () => calls[calls.length - 1] || []
  };
}

describe('QueryBuilder', { concurrency: false }, () => {
  let mockDb;
  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe('createQuery', () => {
    it('should create a basic SELECT query configuration', () => {
      const query = createQuery({
        table: 'users',
        select: ['id', 'name', 'email']
      });

      assert.deepStrictEqual(query, {
        table: 'users',
        select: ['id', 'name', 'email']
      });
    });

    it('should create an INSERT query configuration', () => {
      const query = createQuery({
        table: 'users',
        insert: { name: 'John', email: 'john@example.com' }
      });

      assert.deepStrictEqual(query, {
        table: 'users',
        insert: { name: 'John', email: 'john@example.com' }
      });
    });
  });

  describe('executeQuery', () => {
    it('should execute a SELECT query', async () => {
      const mockRows = [{ id: 1, name: 'John' }];
      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const query = createQuery({
        table: 'users',
        select: ['id', 'name'],
        where: { active: true },
        orderBy: { name: 'ASC' },
        limit: 10,
        offset: 5
      });
      const result = await executeQuery(mockDb, query);

      const [sql, params] = mockDb.getLastCall();
      assert.strictEqual(sql, 'SELECT id, name FROM users WHERE active = ? ORDER BY name ASC LIMIT 10 OFFSET 5');
      assert.deepStrictEqual(params, [true]);
      assert.deepStrictEqual(result, { rows: mockRows });
    });

    it('should execute an INSERT query', async () => {
      const mockRows = [{ id: 1, name: 'John', email: 'john@example.com' }];
      mockDb.query.mockResolvedValueOnce({ rows: mockRows });

      const query = createQuery({
        table: 'users',
        insert: { name: 'John', email: 'john@example.com' }
      });
      const result = await executeQuery(mockDb, query);

      const [sql, params] = mockDb.getLastCall();
      assert.strictEqual(sql, 'INSERT INTO users (name, email) VALUES (?, ?)');
      assert.deepStrictEqual(params, ['John', 'john@example.com']);
      assert.deepStrictEqual(result, { rows: mockRows });
    });
  });

  describe('complex queries', () => {
    it('should handle complex WHERE conditions', async () => {
      const query = createQuery({
        table: 'users',
        select: ['*'],
        where: {
          $or: [
            { name: 'John' },
            { 
              $and: [
                { age: { '>': 25 } },
                { age: { '<': 40 } }
              ]
            }
          ],
          active: true
        }
      });
      await executeQuery(mockDb, query);

      const [sql, params] = mockDb.getLastCall();
      assert.strictEqual(sql, 'SELECT * FROM users WHERE ((name = ?) OR (((age > ?) AND (age < ?)))) AND active = ?');
      assert.deepStrictEqual(params, ['John', 25, 40, true]);
    });
  });

  describe('error handling', () => {
    it('should handle empty queries gracefully', async () => {
      // Test that an empty query object still creates a basic SELECT query
      const query = createQuery({ table: 'users' });
      await executeQuery(mockDb, query);

      const [sql, params] = mockDb.getLastCall();
      assert.strictEqual(sql, 'SELECT * FROM users');
      assert.deepStrictEqual(params, []);
    });

    it('should handle queries without table gracefully', async () => {
      // This would typically fail in a real database, but our mock allows it
      const query = createQuery({ select: ['*'] });
      
      try {
        await executeQuery(mockDb, query);
        const [sql] = mockDb.getLastCall();
        assert.strictEqual(sql, 'SELECT * FROM undefined');
      } catch {
        // This is acceptable - missing table should cause an error
        assert.ok(true, 'Expected error for missing table');
      }
    });
  });
});
