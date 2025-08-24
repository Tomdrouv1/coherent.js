/**
 * Tests for Query Builder
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryBuilder } from '../../src/database/query-builder.js';

describe('QueryBuilder', () => {
  let mockDb;
  let queryBuilder;

  beforeEach(() => {
    mockDb = {
      query: vi.fn()
    };
    queryBuilder = new QueryBuilder(mockDb, 'users');
  });

  describe('constructor', () => {
    it('should initialize with database and table name', () => {
      expect(queryBuilder.db).toBe(mockDb);
      expect(queryBuilder.tableName).toBe('users');
      expect(queryBuilder.queryType).toBe(null);
      expect(queryBuilder.selectFields).toEqual([]);
      expect(queryBuilder.whereConditions).toEqual([]);
      expect(queryBuilder.parameters).toEqual([]);
    });

    it('should initialize without table name', () => {
      const qb = new QueryBuilder(mockDb);
      expect(qb.tableName).toBe(null);
    });
  });

  describe('table', () => {
    it('should set table name', () => {
      const result = queryBuilder.table('posts');
      expect(queryBuilder.tableName).toBe('posts');
      expect(result).toBe(queryBuilder); // chainable
    });
  });

  describe('select', () => {
    it('should set query type to SELECT', () => {
      queryBuilder.select();
      expect(queryBuilder.queryType).toBe('SELECT');
    });

    it('should add single field', () => {
      queryBuilder.select('name');
      expect(queryBuilder.selectFields).toEqual(['name']);
    });

    it('should add multiple fields as array', () => {
      queryBuilder.select(['id', 'name', 'email']);
      expect(queryBuilder.selectFields).toEqual(['id', 'name', 'email']);
    });

    it('should add multiple fields with chaining', () => {
      queryBuilder.select('id').select('name');
      expect(queryBuilder.selectFields).toEqual(['id', 'name']);
    });

    it('should default to all fields', () => {
      queryBuilder.select();
      expect(queryBuilder.selectFields).toEqual(['*']);
    });
  });

  describe('where', () => {
    it('should add simple where condition', () => {
      queryBuilder.where('name', 'John');
      
      expect(queryBuilder.whereConditions).toHaveLength(1);
      expect(queryBuilder.whereConditions[0]).toMatchObject({
        field: 'name',
        operator: '=',
        value: 'John',
        connector: 'AND'
      });
      expect(queryBuilder.parameters).toEqual(['John']);
    });

    it('should add where condition with operator', () => {
      queryBuilder.where('age', '>', 18);
      
      expect(queryBuilder.whereConditions[0]).toMatchObject({
        field: 'age',
        operator: '>',
        value: 18,
        connector: 'AND'
      });
      expect(queryBuilder.parameters).toEqual([18]);
    });

    it('should add where condition with object syntax', () => {
      queryBuilder.where({ name: 'John', active: true });
      
      expect(queryBuilder.whereConditions).toHaveLength(2);
      expect(queryBuilder.whereConditions[0].field).toBe('name');
      expect(queryBuilder.whereConditions[1].field).toBe('active');
      expect(queryBuilder.parameters).toEqual(['John', true]);
    });

    it('should add nested where conditions', () => {
      queryBuilder.where(q => {
        q.where('name', 'John').orWhere('name', 'Jane');
      });
      
      expect(queryBuilder.whereConditions).toHaveLength(1);
      expect(queryBuilder.whereConditions[0].type).toBe('nested');
      expect(queryBuilder.whereConditions[0].conditions).toHaveLength(2);
    });

    it('should be chainable', () => {
      const result = queryBuilder.where('name', 'John');
      expect(result).toBe(queryBuilder);
    });
  });

  describe('orWhere', () => {
    it('should add OR where condition', () => {
      queryBuilder.where('name', 'John').orWhere('name', 'Jane');
      
      expect(queryBuilder.whereConditions).toHaveLength(2);
      expect(queryBuilder.whereConditions[1].connector).toBe('OR');
    });
  });

  describe('whereIn', () => {
    it('should add WHERE IN condition', () => {
      queryBuilder.whereIn('status', ['active', 'pending']);
      
      expect(queryBuilder.whereConditions[0]).toMatchObject({
        field: 'status',
        operator: 'IN',
        value: ['active', 'pending'],
        connector: 'AND'
      });
      expect(queryBuilder.parameters).toEqual(['active', 'pending']);
    });

    it('should throw error for empty array', () => {
      expect(() => queryBuilder.whereIn('status', [])).toThrow('whereIn requires a non-empty array');
    });
  });

  describe('whereNotIn', () => {
    it('should add WHERE NOT IN condition', () => {
      queryBuilder.whereNotIn('status', ['inactive', 'banned']);
      
      expect(queryBuilder.whereConditions[0]).toMatchObject({
        field: 'status',
        operator: 'NOT IN',
        value: ['inactive', 'banned']
      });
    });
  });

  describe('join', () => {
    it('should add INNER JOIN', () => {
      queryBuilder.join('profiles', 'users.id', '=', 'profiles.user_id');
      
      expect(queryBuilder.joinClauses).toHaveLength(1);
      expect(queryBuilder.joinClauses[0]).toMatchObject({
        type: 'INNER',
        table: 'profiles',
        firstField: 'users.id',
        operator: '=',
        secondField: 'profiles.user_id'
      });
    });

    it('should default operator to =', () => {
      queryBuilder.join('profiles', 'users.id', 'profiles.user_id');
      expect(queryBuilder.joinClauses[0].operator).toBe('=');
    });
  });

  describe('leftJoin', () => {
    it('should add LEFT JOIN', () => {
      queryBuilder.leftJoin('profiles', 'users.id', 'profiles.user_id');
      expect(queryBuilder.joinClauses[0].type).toBe('LEFT');
    });
  });

  describe('rightJoin', () => {
    it('should add RIGHT JOIN', () => {
      queryBuilder.rightJoin('profiles', 'users.id', 'profiles.user_id');
      expect(queryBuilder.joinClauses[0].type).toBe('RIGHT');
    });
  });

  describe('orderBy', () => {
    it('should add ORDER BY clause', () => {
      queryBuilder.orderBy('created_at', 'DESC');
      
      expect(queryBuilder.orderByFields).toHaveLength(1);
      expect(queryBuilder.orderByFields[0]).toMatchObject({
        field: 'created_at',
        direction: 'DESC'
      });
    });

    it('should default to ASC', () => {
      queryBuilder.orderBy('name');
      expect(queryBuilder.orderByFields[0].direction).toBe('ASC');
    });

    it('should allow multiple order by fields', () => {
      queryBuilder.orderBy('priority', 'DESC').orderBy('name', 'ASC');
      expect(queryBuilder.orderByFields).toHaveLength(2);
    });
  });

  describe('groupBy', () => {
    it('should add single field', () => {
      queryBuilder.groupBy('category');
      expect(queryBuilder.groupByFields).toEqual(['category']);
    });

    it('should add multiple fields', () => {
      queryBuilder.groupBy(['category', 'status']);
      expect(queryBuilder.groupByFields).toEqual(['category', 'status']);
    });
  });

  describe('having', () => {
    it('should add HAVING condition', () => {
      queryBuilder.having('COUNT(*)', '>', 5);
      
      expect(queryBuilder.havingConditions).toHaveLength(1);
      expect(queryBuilder.havingConditions[0]).toMatchObject({
        field: 'COUNT(*)',
        operator: '>',
        value: 5
      });
    });

    it('should default operator to =', () => {
      queryBuilder.having('COUNT(*)', 5);
      expect(queryBuilder.havingConditions[0].operator).toBe('=');
    });
  });

  describe('limit', () => {
    it('should set limit value', () => {
      queryBuilder.limit(10);
      expect(queryBuilder.limitValue).toBe(10);
    });
  });

  describe('offset', () => {
    it('should set offset value', () => {
      queryBuilder.offset(20);
      expect(queryBuilder.offsetValue).toBe(20);
    });
  });

  describe('insert', () => {
    it('should set query type to INSERT', () => {
      queryBuilder.insert({ name: 'John' });
      expect(queryBuilder.queryType).toBe('INSERT');
      expect(queryBuilder.insertData).toEqual({ name: 'John' });
    });

    it('should accept array of objects', () => {
      const data = [{ name: 'John' }, { name: 'Jane' }];
      queryBuilder.insert(data);
      expect(queryBuilder.insertData).toEqual(data);
    });
  });

  describe('update', () => {
    it('should set query type to UPDATE', () => {
      queryBuilder.update({ name: 'John Doe' });
      expect(queryBuilder.queryType).toBe('UPDATE');
      expect(queryBuilder.updateData).toEqual({ name: 'John Doe' });
    });
  });

  describe('delete', () => {
    it('should set query type to DELETE', () => {
      queryBuilder.delete();
      expect(queryBuilder.queryType).toBe('DELETE');
    });
  });

  describe('toSQL', () => {
    beforeEach(() => {
      queryBuilder = new QueryBuilder(mockDb, 'users');
    });

    describe('SELECT queries', () => {
      it('should build simple SELECT query', () => {
        const { sql, params } = queryBuilder.select().toSQL();
        expect(sql).toBe('SELECT * FROM users');
        expect(params).toEqual([]);
      });

      it('should build SELECT with fields', () => {
        const { sql } = queryBuilder.select(['id', 'name']).toSQL();
        expect(sql).toBe('SELECT id, name FROM users');
      });

      it('should build SELECT with WHERE', () => {
        const { sql, params } = queryBuilder
          .select()
          .where('active', true)
          .toSQL();
        
        expect(sql).toBe('SELECT * FROM users WHERE active = ?');
        expect(params).toEqual([true]);
      });

      it('should build SELECT with multiple WHERE conditions', () => {
        const { sql, params } = queryBuilder
          .select()
          .where('active', true)
          .where('age', '>', 18)
          .toSQL();
        
        expect(sql).toBe('SELECT * FROM users WHERE active = ? AND age > ?');
        expect(params).toEqual([true, 18]);
      });

      it('should build SELECT with OR WHERE', () => {
        const { sql, params } = queryBuilder
          .select()
          .where('name', 'John')
          .orWhere('name', 'Jane')
          .toSQL();
        
        expect(sql).toBe('SELECT * FROM users WHERE name = ? OR name = ?');
        expect(params).toEqual(['John', 'Jane']);
      });

      it('should build SELECT with WHERE IN', () => {
        const { sql, params } = queryBuilder
          .select()
          .whereIn('status', ['active', 'pending'])
          .toSQL();
        
        expect(sql).toBe('SELECT * FROM users WHERE status IN (?, ?)');
        expect(params).toEqual(['active', 'pending']);
      });

      it('should build SELECT with JOIN', () => {
        const { sql } = queryBuilder
          .select(['users.*', 'profiles.bio'])
          .join('profiles', 'users.id', '=', 'profiles.user_id')
          .toSQL();
        
        expect(sql).toBe('SELECT users.*, profiles.bio FROM users INNER JOIN profiles ON users.id = profiles.user_id');
      });

      it('should build SELECT with ORDER BY', () => {
        const { sql } = queryBuilder
          .select()
          .orderBy('created_at', 'DESC')
          .toSQL();
        
        expect(sql).toBe('SELECT * FROM users ORDER BY created_at DESC');
      });

      it('should build SELECT with GROUP BY and HAVING', () => {
        const { sql, params } = queryBuilder
          .select(['category', 'COUNT(*) as count'])
          .groupBy('category')
          .having('COUNT(*)', '>', 5)
          .toSQL();
        
        expect(sql).toBe('SELECT category, COUNT(*) as count FROM users GROUP BY category HAVING COUNT(*) > ?');
        expect(params).toEqual([5]);
      });

      it('should build SELECT with LIMIT and OFFSET', () => {
        const { sql } = queryBuilder
          .select()
          .limit(10)
          .offset(20)
          .toSQL();
        
        expect(sql).toBe('SELECT * FROM users LIMIT 10 OFFSET 20');
      });

      it('should throw error without table name', () => {
        const qb = new QueryBuilder(mockDb);
        expect(() => qb.select().toSQL()).toThrow('Table name is required for SELECT query');
      });
    });

    describe('INSERT queries', () => {
      it('should build INSERT query', () => {
        const { sql, params } = queryBuilder
          .insert({ name: 'John', email: 'john@example.com' })
          .toSQL();
        
        expect(sql).toBe('INSERT INTO users (name, email) VALUES (?, ?)');
        expect(params).toEqual(['John', 'john@example.com']);
      });

      it('should build bulk INSERT query', () => {
        const { sql, params } = queryBuilder
          .insert([
            { name: 'John', email: 'john@example.com' },
            { name: 'Jane', email: 'jane@example.com' }
          ])
          .toSQL();
        
        expect(sql).toBe('INSERT INTO users (name, email) VALUES (?, ?), (?, ?)');
        expect(params).toEqual(['John', 'john@example.com', 'Jane', 'jane@example.com']);
      });

      it('should throw error without table name', () => {
        const qb = new QueryBuilder(mockDb);
        expect(() => qb.insert({ name: 'John' }).toSQL()).toThrow('Table name is required for INSERT query');
      });

      it('should throw error without insert data', () => {
        expect(() => queryBuilder.insert().toSQL()).toThrow('Insert data is required');
      });
    });

    describe('UPDATE queries', () => {
      it('should build UPDATE query', () => {
        const { sql, params } = queryBuilder
          .update({ name: 'John Doe' })
          .where('id', 1)
          .toSQL();
        
        expect(sql).toBe('UPDATE users SET name = ? WHERE id = ?');
        expect(params).toEqual(['John Doe', 1]);
      });

      it('should throw error without table name', () => {
        const qb = new QueryBuilder(mockDb);
        expect(() => qb.update({ name: 'John' }).toSQL()).toThrow('Table name is required for UPDATE query');
      });

      it('should throw error without update data', () => {
        expect(() => queryBuilder.update().toSQL()).toThrow('Update data is required');
      });
    });

    describe('DELETE queries', () => {
      it('should build DELETE query', () => {
        const { sql, params } = queryBuilder
          .delete()
          .where('active', false)
          .toSQL();
        
        expect(sql).toBe('DELETE FROM users WHERE active = ?');
        expect(params).toEqual([false]);
      });

      it('should throw error without table name', () => {
        const qb = new QueryBuilder(mockDb);
        expect(() => qb.delete().toSQL()).toThrow('Table name is required for DELETE query');
      });
    });

    it('should throw error without query type', () => {
      expect(() => queryBuilder.toSQL()).toThrow('No query type specified');
    });
  });

  describe('execute', () => {
    it('should execute query and return result', async () => {
      const mockResult = { rows: [{ id: 1, name: 'John' }] };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await queryBuilder.select().execute();

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users',
        [],
        {}
      );
      expect(result).toBe(mockResult);
    });

    it('should pass options to database query', async () => {
      mockDb.query.mockResolvedValue({});

      await queryBuilder.select().execute({ single: true });

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users',
        [],
        { single: true }
      );
    });
  });

  describe('first', () => {
    it('should return first result', async () => {
      const mockResult = { id: 1, name: 'John' };
      mockDb.query.mockResolvedValue(mockResult);

      const result = await queryBuilder.select().first();

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users LIMIT 1',
        [],
        { single: true }
      );
      expect(result).toBe(mockResult);
    });

    it('should return null if no result', async () => {
      mockDb.query.mockResolvedValue(null);

      const result = await queryBuilder.select().first();
      expect(result).toBe(null);
    });
  });

  describe('count', () => {
    it('should return count of records', async () => {
      mockDb.query.mockResolvedValue({ count: 5 });

      const count = await queryBuilder.count();

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users',
        [],
        { single: true }
      );
      expect(count).toBe(5);
    });

    it('should return 0 if no result', async () => {
      mockDb.query.mockResolvedValue(null);

      const count = await queryBuilder.count();
      expect(count).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true if records exist', async () => {
      mockDb.query.mockResolvedValue({ count: 1 });

      const exists = await queryBuilder.exists();
      expect(exists).toBe(true);
    });

    it('should return false if no records exist', async () => {
      mockDb.query.mockResolvedValue({ count: 0 });

      const exists = await queryBuilder.exists();
      expect(exists).toBe(false);
    });
  });
});
