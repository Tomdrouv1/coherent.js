/**
 * End-to-End Tests for Database Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseManager } from '../../src/connection-manager.js';
import { executeQuery } from '../../src/query-builder.js';
import { Model } from '../../src/model.js';
import { Migration } from '../../src/migration.js';
import { 
  withDatabase, 
  withTransaction, 
  withModel, 
  withPagination 
} from '../../src/middleware.js';
import { 
  MockAdapter, 
  DatabaseTestHelper, 
  createMockRequest, 
  createMockResponse, 
  createMockNext,
} from './test-utils.js';

describe('Database Integration E2E Tests', () => {
  let dbManager;
  let testHelper;
  let adapter;

  beforeEach(async () => {
    adapter = new MockAdapter();
    testHelper = new DatabaseTestHelper(adapter);
    
    dbManager = new DatabaseManager({
      adapter: adapter,
      store: { filename: ':memory:' },
      pool: { min: 1, max: 5 }
    });
    
    await dbManager.connect();
  });

  afterEach(async () => {
    if (dbManager) {
      await dbManager.close();
    }
    vi.clearAllMocks();
  });

  describe('Complete Database Workflow', () => {
    it('should handle complex queries with query builder', async () => {
      // Complex SELECT query using object configuration
      const result = await executeQuery(dbManager, {
        select: ['u.name', 'u.email', 'p.title'],
        from: { table: 'users', alias: 'u' },
        joins: [{ table: 'posts', alias: 'p', condition: 'u.id = p.user_id' }],
        where: {
          'u.active': true,
          'p.published_at': { '>': '2023-01-01' }
        },
        orderBy: { 'u.name': 'ASC', 'p.created_at': 'DESC' },
        limit: 10,
        offset: 0
      });
      
      expect(result.rows).toBeDefined();

      const lastQuery = testHelper.getLastQuery();
      expect(lastQuery.sql).toBe(
        'SELECT u.name, u.email, p.title FROM users u INNER JOIN posts p ON u.id = p.user_id ' +
        'WHERE u.active = ? AND p.published_at > ? ORDER BY u.name ASC, p.created_at DESC LIMIT 10'
      );
      expect(lastQuery.params).toEqual([true, '2023-01-01']);
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
      
      expect(results).toEqual(['001_create_users.js', '002_create_posts.js']);
      expect(testHelper.getQueries().map(q => q.sql)).toContain('SELECT migration FROM coherent_migrations ORDER BY id');

      // A second run applies nothing: the migrations are recorded as applied
      expect(await migration.run()).toEqual([]);

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
      expect(req.dbQuery).toBeTypeOf('function');
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
      const result = await req.dbQuery('SELECT * FROM users', []);
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
      const next = vi.fn().mockResolvedValue();

      const txMiddleware = withTransaction(dbManager);
      await txMiddleware(req, res, next);

      expect(req.tx).toBeDefined();
      expect(req.tx.isCommitted).toBe(true);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle connection pooling under load', async () => {
      // Execute multiple queries concurrently
      const queryPromises = Array.from({ length: 20 }, (_, i) =>
        executeQuery(dbManager, {
          select: '*',
          from: 'users',
          where: { id: i }
        })
      );

      const results = await Promise.all(queryPromises);

      expect(results).toHaveLength(20);
      expect(results.every(result => result.rows !== undefined)).toBe(true);
    });

    it('should maintain performance with large datasets', async () => {
      const startTime = performance.now();

      // Simulate large dataset query
      const result = await executeQuery(dbManager, {
        select: '*',
        from: 'users',
        where: { active: true },
        orderBy: { created_at: 'DESC' },
        limit: 1000
      });

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
        adapter: adapter,
        store: { filename: ':memory:' }
      });
      failingManager.retryDelay = 0;

      await expect(failingManager.connect()).rejects.toThrow('Connection failed');
    });

    it('should handle query failures with proper error messages', async () => {
      adapter.errors.query = 'SQL syntax error';

      await expect(
        executeQuery(dbManager, {
          select: '*',
          from: 'invalid_table'
        })
      ).rejects.toThrow('SQL syntax error');
    });

    it('should handle transaction failures and cleanup', async () => {
      adapter.errors.transaction = 'Transaction failed';
      
      await expect(dbManager.transaction()).rejects.toThrow('Transaction failed');
    });
  });

});

describe('Model workflow on SQLite', () => {
  let db;

  class User extends Model {
    static tableName = 'users';
    static attributes = {
      name: { type: 'string', required: true },
      email: { type: 'string', required: true },
      age: { type: 'number', min: 0 },
      active: { type: 'boolean', default: true }
    };
    static validationRules = {
      email: [(value) => typeof value === 'string' && value.includes('@'), 'Must be valid email']
    };
    static relationships = {
      posts: { type: 'hasMany', model: 'Post', foreignKey: 'user_id' }
    };
  }

  class Post extends Model {
    static tableName = 'posts';
    static relationships = {
      user: { type: 'belongsTo', model: User, foreignKey: 'user_id' }
    };
  }

  beforeEach(async () => {
    db = new DatabaseManager({ type: 'sqlite', database: ':memory:' });
    await db.connect();
    await db.query(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, age INTEGER,
      active BOOLEAN, created_at TEXT, updated_at TEXT
    )`);
    await db.query(`CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, user_id INTEGER,
      created_at TEXT, updated_at TEXT
    )`);
    User.setDatabase(db);
    Post.setDatabase(db);
    global.Post = Post;
  });

  afterEach(async () => {
    delete global.Post;
    await db.close();
  });

  it('should handle full CRUD workflow with models', async () => {
    const user = await User.create({ name: 'John Doe', email: 'john@example.com', age: 30 });

    expect(user.get('id')).toBe(1);
    expect(user.get('active')).toBe(true);
    expect(user.isNew).toBe(false);

    user.set('age', 31);
    await user.save();

    const found = await User.find(user.get('id'));
    expect(found.get('name')).toBe('John Doe');
    expect(found.get('age')).toBe(31);

    expect((await User.where({ active: true })).map(u => u.get('email'))).toEqual(['john@example.com']);
    expect(await User.where({ active: false })).toEqual([]);

    await user.delete();
    expect(user.isDeleted).toBe(true);
    expect(await User.find(1)).toBe(null);
  });

  it('should give every created row its own id', async () => {
    const alice = await User.create({ name: 'alice', email: 'alice@example.com' });
    const bob = await User.create({ name: 'bob', email: 'bob@example.com' });

    expect([alice.get('id'), bob.get('id')]).toEqual([1, 2]);

    bob.set('name', 'bob-renamed');
    await bob.save();

    const { rows } = await db.query('SELECT id, name FROM users ORDER BY id');
    expect(rows).toEqual([{ id: 1, name: 'alice' }, { id: 2, name: 'bob-renamed' }]);
  });

  it('should return null from find() for a missing row', async () => {
    expect(await User.find(424242)).toBe(null);
    await expect(User.findOrFail(424242)).rejects.toThrow('User with id 424242 not found');
  });

  it('should report the real number of affected rows', async () => {
    await User.create({ name: 'a', email: 'a@example.com' });
    await User.create({ name: 'b', email: 'b@example.com' });

    expect(await User.updateWhere({ id: 999 }, { name: 'x' })).toBe(0);
    expect(await User.updateWhere({ active: true }, { age: 40 })).toBe(2);
    expect(await User.deleteWhere({ id: 999 })).toBe(0);
    expect(await User.deleteWhere({ name: 'a' })).toBe(1);
    expect((await User.all()).map(u => u.get('name'))).toEqual(['b']);
  });

  it('should handle relationships between models', async () => {
    const user = await User.create({ name: 'John Doe', email: 'john@example.com' });
    const post1 = await Post.create({ title: 'First Post', content: 'Hello World', user_id: user.get('id') });
    await Post.create({ title: 'Second Post', content: 'Another post', user_id: user.get('id') });
    await Post.create({ title: 'Someone else', content: '...', user_id: 99 });

    const userPosts = await user.posts();
    expect(userPosts.map(post => post.get('title'))).toEqual(['First Post', 'Second Post']);

    const postUser = await post1.user();
    expect(postUser.get('name')).toBe('John Doe');

    const orphan = new Post({ id: 50, user_id: 12345 });
    expect(await orphan.user()).toBe(null);
  });

  it('should handle transactions with rollback', async () => {
    const transaction = await db.transaction();

    const user = await User.create({ name: 'John Doe', email: 'john@example.com' }, { transaction });
    expect(user.get('id')).toBe(1);

    await transaction.rollback();

    expect(transaction.isRolledBack).toBe(true);
    expect(await User.all()).toEqual([]);
  });

  it('should handle concurrent database operations', async () => {
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) => User.create({ name: `User ${i}`, email: `user${i}@example.com` }))
    );

    expect(users.every(user => user instanceof User)).toBe(true);
    expect(new Set(users.map(user => user.get('id'))).size).toBe(10);
    expect((await User.all())).toHaveLength(10);
  });

  it('should maintain data consistency across operations', async () => {
    const user = await User.create({ name: 'John Doe', email: 'john@example.com' });

    await user.set('name', 'John Smith').save();
    await user.set('email', 'john.smith@example.com').save();

    const stored = await User.find(user.get('id'));
    expect(stored.get('name')).toBe('John Smith');
    expect(stored.get('email')).toBe('john.smith@example.com');
  });

  it('should delete only the targeted row', async () => {
    const user = await User.create({ name: 'John Doe', email: 'john@example.com' });
    const other = await User.create({ name: 'Jane', email: 'jane@example.com' });
    await Post.create({ title: 'Test Post', content: 'Content', user_id: user.get('id') });

    await user.delete();

    expect(user.isDeleted).toBe(true);
    expect((await User.all()).map(u => u.get('id'))).toEqual([other.get('id')]);
  });

  it('should reject model validation errors before writing', async () => {
    await expect(User.create({ name: 'John Doe', email: 'invalid-email' })).rejects.toThrow('Must be valid email');
    expect(await User.all()).toEqual([]);
  });

  it('should 404 through withModel when the row does not exist', async () => {
    const req = createMockRequest({ params: { id: '31337' } });
    const next = vi.fn();

    await withModel(User)(req, createMockResponse(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404, message: 'User not found' }));
  });
});
