/**
 * End-to-End Tests for Database Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseManager } from '../../src/database/connection-manager.js';
import { QueryBuilder } from '../../src/database/query-builder.js';
import { Model } from '../../src/database/model.js';
import { Migration } from '../../src/database/migration.js';
import { 
  withDatabase, 
  withTransaction, 
  withModel, 
  withPagination 
} from '../../src/database/middleware.js';
import { 
  MockAdapter, 
  DatabaseTestHelper, 
  createMockRequest, 
  createMockResponse, 
  createMockNext,
  fixtures
} from './test-utils.js';

describe('Database Integration E2E Tests', () => {
  let dbManager;
  let testHelper;
  let adapter;

  beforeEach(async () => {
    adapter = new MockAdapter();
    testHelper = new DatabaseTestHelper(adapter);
    
    dbManager = new DatabaseManager({
      adapter: 'mock',
      connection: { filename: ':memory:' },
      pool: { min: 1, max: 5 }
    });
    
    // Replace the adapter with our mock
    dbManager.adapter = adapter;
    
    await dbManager.connect();
  });

  afterEach(async () => {
    if (dbManager) {
      await dbManager.close();
    }
    vi.clearAllMocks();
  });

  describe('Complete Database Workflow', () => {
    it('should handle full CRUD workflow with models', async () => {
      // Define User model
      class User extends Model {
        static tableName = 'users';
        static attributes = {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true },
          age: { type: 'number', min: 0 },
          active: { type: 'boolean', default: true }
        };
        
        static validationRules = {
          email: [(value) => value.includes('@'), 'Must be valid email']
        };
      }
      
      User.setDatabase(dbManager);

      // Create user
      const userData = { name: 'John Doe', email: 'john@example.com', age: 30 };
      const user = await User.create(userData);
      
      expect(user.get('name')).toBe('John Doe');
      expect(user.get('email')).toBe('john@example.com');
      expect(user.get('age')).toBe(30);
      expect(user.get('active')).toBe(true);
      expect(user.isNew).toBe(false);

      // Update user
      user.set('age', 31);
      await user.save();
      
      expect(user.get('age')).toBe(31);

      // Find user
      const foundUser = await User.find(user.get('id'));
      expect(foundUser.get('name')).toBe('John Doe');

      // Query users
      const activeUsers = await User.where({ active: true });
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].get('name')).toBe('John Doe');

      // Delete user
      await user.delete();
      expect(user.isDeleted).toBe(true);
    });

    it('should handle relationships between models', async () => {
      // Define models with relationships
      class User extends Model {
        static tableName = 'users';
        static attributes = {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true }
        };
        
        static relationships = {
          posts: { type: 'hasMany', model: 'Post', foreignKey: 'user_id' }
        };
      }

      class Post extends Model {
        static tableName = 'posts';
        static attributes = {
          title: { type: 'string', required: true },
          content: { type: 'string' },
          user_id: { type: 'number', required: true }
        };
        
        static relationships = {
          user: { type: 'belongsTo', model: 'User', foreignKey: 'user_id' }
        };
      }

      User.setDatabase(dbManager);
      Post.setDatabase(dbManager);

      // Create user and posts
      const user = await User.create({ name: 'John Doe', email: 'john@example.com' });
      const post1 = await Post.create({ 
        title: 'First Post', 
        content: 'Hello World', 
        user_id: user.get('id') 
      });
      const post2 = await Post.create({ 
        title: 'Second Post', 
        content: 'Another post', 
        user_id: user.get('id') 
      });

      // Test relationships
      const userPosts = await user.posts();
      expect(userPosts).toHaveLength(2);
      expect(userPosts[0].get('title')).toBe('First Post');

      const postUser = await post1.user();
      expect(postUser.get('name')).toBe('John Doe');
    });

    it('should handle complex queries with query builder', async () => {
      const qb = new QueryBuilder(dbManager);

      // Complex SELECT query
      const query = qb
        .select(['u.name', 'u.email', 'p.title'])
        .from('users', 'u')
        .join('posts', 'p', 'u.id = p.user_id')
        .where('u.active', '=', true)
        .where('p.published_at', '>', '2023-01-01')
        .orderBy('u.name', 'ASC')
        .orderBy('p.created_at', 'DESC')
        .limit(10)
        .offset(0);

      const result = await query.execute();
      
      expect(result.rows).toBeDefined();
      
      const lastQuery = testHelper.getLastQuery();
      expect(lastQuery.sql).toContain('SELECT');
      expect(lastQuery.sql).toContain('JOIN');
      expect(lastQuery.sql).toContain('WHERE');
      expect(lastQuery.sql).toContain('ORDER BY');
      expect(lastQuery.sql).toContain('LIMIT');
    });

    it('should handle transactions with rollback', async () => {
      class User extends Model {
        static tableName = 'users';
        static attributes = {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true }
        };
      }
      
      User.setDatabase(dbManager);

      let transaction;
      let rollbackOccurred = false;

      try {
        transaction = await dbManager.transaction();
        
        // Create user in transaction
        const user = await User.create({ 
          name: 'John Doe', 
          email: 'john@example.com' 
        }, { transaction });
        
        expect(user.get('name')).toBe('John Doe');
        
        // Simulate error
        throw new Error('Simulated error');
        
      } catch (error) {
        if (transaction && !transaction.isRolledBack) {
          await transaction.rollback();
          rollbackOccurred = true;
        }
      }

      expect(rollbackOccurred).toBe(true);
      expect(transaction.isRolledBack).toBe(true);
    });

    it('should handle migrations', async () => {
      const migration = new Migration(dbManager);

      // Mock migration files
      const migrationFiles = [
        {
          name: '001_create_users.js',
          version: 1,
          up: async (schema) => {
            await schema.createTable('users', (table) => {
              table.id();
              table.string('name').notNull();
              table.string('email').unique();
              table.timestamps();
            });
          },
          down: async (schema) => {
            await schema.dropTable('users');
          }
        },
        {
          name: '002_create_posts.js',
          version: 2,
          up: async (schema) => {
            await schema.createTable('posts', (table) => {
              table.id();
              table.string('title').notNull();
              table.text('content');
              table.integer('user_id').references('users.id');
              table.timestamps();
            });
          },
          down: async (schema) => {
            await schema.dropTable('posts');
          }
        }
      ];

      // Mock file system
      migration.loadMigrations = vi.fn().mockResolvedValue(migrationFiles);

      // Run migrations
      const results = await migration.run();
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('001_create_users.js');
      expect(results[1].name).toBe('002_create_posts.js');

      // Check migration status
      const status = await migration.status();
      expect(status.pending).toHaveLength(0);
      expect(status.completed).toHaveLength(2);
    });
  });

  describe('Middleware Integration', () => {
    it('should integrate with router middleware', async () => {
      const req = createMockRequest({
        params: { id: '1' },
        query: { page: '2', limit: '5' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      // Apply database middleware
      const dbMiddleware = withDatabase(dbManager);
      await dbMiddleware(req, res, next);

      expect(req.db).toBe(dbManager);
      expect(req.query).toBeTypeOf('function');
      expect(req.transaction).toBeTypeOf('function');

      // Apply pagination middleware
      const paginationMiddleware = withPagination();
      await paginationMiddleware(req, res, next);

      expect(req.pagination).toMatchObject({
        page: 2,
        limit: 5,
        offset: 5,
        hasNext: null,
        hasPrev: true
      });

      // Test database query through middleware
      const result = await req.query('SELECT * FROM users', []);
      expect(result.rows).toBeDefined();
    });

    it('should handle model middleware', async () => {
      class User extends Model {
        static tableName = 'users';
        static find = vi.fn().mockResolvedValue(
          new User({ id: 1, name: 'John Doe', email: 'john@example.com' })
        );
      }

      const req = createMockRequest({ params: { id: '1' } });
      const res = createMockResponse();
      const next = createMockNext();

      const modelMiddleware = withModel(User);
      await modelMiddleware(req, res, next);

      expect(User.find).toHaveBeenCalledWith('1');
      expect(req.user).toBeInstanceOf(User);
      expect(req.user.get('name')).toBe('John Doe');
      expect(next).toHaveBeenCalled();
    });

    it('should handle transaction middleware', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const txMiddleware = withTransaction(dbManager);
      await txMiddleware(req, res, next);

      expect(req.tx).toBeDefined();
      expect(req.tx.isCommitted).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent database operations', async () => {
      class User extends Model {
        static tableName = 'users';
        static attributes = {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true }
        };
      }
      
      User.setDatabase(dbManager);

      // Create multiple users concurrently
      const userPromises = Array.from({ length: 10 }, (_, i) => 
        User.create({ 
          name: `User ${i}`, 
          email: `user${i}@example.com` 
        })
      );

      const users = await Promise.all(userPromises);
      
      expect(users).toHaveLength(10);
      expect(users.every(user => user instanceof User)).toBe(true);
      expect(testHelper.getQueries()).toHaveLength(10);
    });

    it('should handle connection pooling under load', async () => {
      const qb = new QueryBuilder(dbManager);

      // Execute multiple queries concurrently
      const queryPromises = Array.from({ length: 20 }, (_, i) => 
        qb.select('*').from('users').where('id', '=', i).execute()
      );

      const results = await Promise.all(queryPromises);
      
      expect(results).toHaveLength(20);
      expect(results.every(result => result.rows !== undefined)).toBe(true);
    });

    it('should maintain performance with large datasets', async () => {
      const qb = new QueryBuilder(dbManager);

      const startTime = performance.now();
      
      // Simulate large dataset query
      const result = await qb
        .select('*')
        .from('users')
        .where('active', '=', true)
        .orderBy('created_at', 'DESC')
        .limit(1000)
        .execute();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.rows).toBeDefined();
      expect(duration).toBeLessThan(100); // Should complete in under 100ms for mock
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate connection failure
      adapter.errors.connect = 'Connection failed';
      
      const failingManager = new DatabaseManager({
        adapter: 'mock',
        connection: { filename: ':memory:' }
      });
      failingManager.adapter = adapter;

      await expect(failingManager.connect()).rejects.toThrow('Connection failed');
    });

    it('should handle query failures with proper error messages', async () => {
      adapter.errors.query = 'SQL syntax error';
      
      const qb = new QueryBuilder(dbManager);
      
      await expect(
        qb.select('*').from('invalid_table').execute()
      ).rejects.toThrow('SQL syntax error');
    });

    it('should handle model validation errors', async () => {
      class User extends Model {
        static tableName = 'users';
        static attributes = {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true }
        };
        
        static validationRules = {
          email: [(value) => value.includes('@'), 'Must be valid email']
        };
      }
      
      User.setDatabase(dbManager);

      // Test required field validation
      await expect(
        User.create({ name: 'John Doe' }) // missing email
      ).rejects.toThrow();

      // Test custom validation
      await expect(
        User.create({ name: 'John Doe', email: 'invalid-email' })
      ).rejects.toThrow('Must be valid email');
    });

    it('should handle transaction failures and cleanup', async () => {
      adapter.errors.transaction = 'Transaction failed';
      
      await expect(dbManager.transaction()).rejects.toThrow('Transaction failed');
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      class User extends Model {
        static tableName = 'users';
        static attributes = {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true },
          version: { type: 'number', default: 1 }
        };
      }
      
      User.setDatabase(dbManager);

      const user = await User.create({ 
        name: 'John Doe', 
        email: 'john@example.com' 
      });

      // Simulate concurrent updates
      const update1 = user.set('name', 'John Smith').save();
      const update2 = user.set('email', 'john.smith@example.com').save();

      await Promise.all([update1, update2]);

      // Verify final state
      expect(user.get('name')).toBe('John Smith');
      expect(user.get('email')).toBe('john.smith@example.com');
    });

    it('should handle cascading operations correctly', async () => {
      class User extends Model {
        static tableName = 'users';
        static relationships = {
          posts: { type: 'hasMany', model: 'Post', foreignKey: 'user_id' }
        };
      }

      class Post extends Model {
        static tableName = 'posts';
        static relationships = {
          user: { type: 'belongsTo', model: 'User', foreignKey: 'user_id' }
        };
      }

      User.setDatabase(dbManager);
      Post.setDatabase(dbManager);

      const user = await User.create({ 
        name: 'John Doe', 
        email: 'john@example.com' 
      });

      await Post.create({ 
        title: 'Test Post', 
        content: 'Content', 
        user_id: user.get('id') 
      });

      // Delete user (should handle cascade)
      await user.delete();
      
      expect(user.isDeleted).toBe(true);
    });
  });
});
