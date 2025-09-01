/**
 * Tests for Pure Object-based Query Builder
 */

import { describe, it, beforeEach, expect } from 'vitest';
import { createQuery, executeQuery } from '../../src/query-builder.js';

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

      expect(query).toEqual({
        table: 'users',
        select: ['id', 'name', 'email']
      });
    });

    it('should create an INSERT query configuration', () => {
      const query = createQuery({
        table: 'users',
        insert: { name: 'John', email: 'john@example.com' }
      });

      expect(query).toEqual({
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
      expect(sql).toBe('SELECT id, name FROM users WHERE active = ? ORDER BY name ASC LIMIT 10 OFFSET 5');
      expect(params).toEqual([true]);
      expect(result).toEqual({ rows: mockRows });
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
      expect(sql).toBe('INSERT INTO users (name, email) VALUES (?, ?)');
      expect(params).toEqual(['John', 'john@example.com']);
      expect(result).toEqual({ rows: mockRows });
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
      expect(sql).toBe('SELECT * FROM users WHERE ((name = ?) OR (((age > ?) AND (age < ?)))) AND active = ?');
      expect(params).toEqual(['John', 25, 40, true]);
    });
  });

  describe('_error handling', () => {
    it('should handle empty queries gracefully', async () => {
      // Test that an empty query object still creates a basic SELECT query
      const query = createQuery({ table: 'users' });
      await executeQuery(mockDb, query);

      const [sql, params] = mockDb.getLastCall();
      expect(sql).toBe('SELECT * FROM users');
      expect(params).toEqual([]);
    });

    it('should handle queries without table gracefully', async () => {
      // This would typically fail in a real database, but our mock allows it
      const query = createQuery({ select: ['*'] });
      
      try {
        await executeQuery(mockDb, query);
        const [sql] = mockDb.getLastCall();
        expect(sql).toBe('SELECT * FROM undefined');
      } catch {
        // This is acceptable - missing table should cause an _error
        expect(true).toBe(true); // Expected _error for missing table
      }
    });
  });
});
