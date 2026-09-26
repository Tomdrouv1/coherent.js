/**
 * Pure Object-Based Database Tests
 * Test suite for Coherent.js pure object model system, against a real in-memory SQLite
 * database so the assertions check stored rows rather than canned mock results.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/connection-manager.js';
import { createModel } from '../src/model.js';
import { executeQuery } from '../src/query-builder.js';

// Pure object model definitions
const UserModel = {
  tableName: 'users',
  primaryKey: 'id',
  attributes: {
    id: { type: 'number', autoIncrement: true, primaryKey: true },
    name: { type: 'string', required: true },
    email: { type: 'string', required: true },
    age: { type: 'number' },
    active: { type: 'boolean' }
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
    published: { type: 'boolean' }
  }
};

describe('pure object model system', () => {
  let dbManager;
  let statements;

  beforeEach(async () => {
    dbManager = new DatabaseManager({ type: 'sqlite', database: ':memory:' });
    await dbManager.connect();
    await dbManager.query('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, age INTEGER, active BOOLEAN)');
    await dbManager.query('CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, published BOOLEAN)');
    statements = [];
    dbManager.on('query', ({ operation }) => statements.push(operation));
  });

  afterEach(async () => {
    await dbManager.close();
  });

  it('writes to the model table and reads the created row back', async () => {
    const User = createModel(dbManager).registerModel('User', UserModel);

    const user = await User.create({ name: 'John Doe', email: 'john@example.com' });

    expect(statements[0]).toBe('INSERT INTO users (name, email) VALUES (?, ?)');
    expect(user).toMatchObject({ id: 1, name: 'John Doe', email: 'john@example.com' });
    expect(typeof user.save).toBe('function');
    expect(typeof user.delete).toBe('function');
  });

  it('queries, finds, updates and deletes through the model table', async () => {
    const User = createModel(dbManager).registerModel('User', UserModel);
    await User.create({ name: 'John Doe', email: 'john@example.com', active: true });
    await User.create({ name: 'Jane', email: 'jane@example.com', active: false });

    expect((await User.all()).map(user => user.name)).toEqual(['John Doe', 'Jane']);

    const activeUsers = await User.where({ select: '*', where: { active: true } });
    expect(activeUsers.map(user => user.name)).toEqual(['John Doe']);

    expect((await User.find(2)).name).toBe('Jane');
    expect(await User.find(424242)).toBe(null);

    expect(await User.updateWhere({ name: 'John Doe' }, { age: 30 })).toBe(1);
    expect(await User.updateWhere({ name: 'Nobody' }, { age: 30 })).toBe(0);
    expect((await User.find(1)).age).toBe(30);

    expect(await User.deleteWhere({ name: 'John Doe' })).toBe(1);
    expect((await User.all()).map(user => user.name)).toEqual(['Jane']);
  });

  it('does not mutate the query config it is given', async () => {
    const User = createModel(dbManager).registerModel('User', UserModel);
    const config = { select: '*', where: { active: true } };

    await User.query(config);

    expect(config).toEqual({ select: '*', where: { active: true } });
  });

  it('saves instances without sending their methods as columns', async () => {
    const User = createModel(dbManager).registerModel('User', UserModel);
    const user = await User.create({ name: 'John Doe', email: 'john@example.com' });

    user.age = 41;
    await user.save();

    expect(statements.at(-1)).toBe('UPDATE users SET name = ?, email = ?, age = ?, active = ? WHERE id = ?');
    expect((await User.find(user.id)).age).toBe(41);

    expect(await user.delete()).toBe(1);
    expect(await User.all()).toEqual([]);
  });

  it('runs instance methods on the loaded row', async () => {
    const User = createModel(dbManager).registerModel('User', UserModel);
    const user = await User.create({ name: 'John Doe', email: 'john@example.com' });

    expect(user.getDisplayName()).toBe('John Doe');
  });

  it('executes multi-model queries', async () => {
    const models = createModel(dbManager);
    const User = models.registerModel('User', UserModel);
    const Post = models.registerModel('Post', PostModel);
    await User.create({ name: 'John Doe', email: 'john@example.com', active: true });
    await Post.create({ title: 'Draft', published: false });
    await Post.create({ title: 'Live', published: true });

    const results = await models.execute({
      User: { select: '*', where: { active: true } },
      Post: { select: ['id', 'title'], where: { published: true } }
    });

    expect(results.User.map(user => user.name)).toEqual(['John Doe']);
    expect(results.Post.map(post => ({ id: post.id, title: post.title }))).toEqual([{ id: 2, title: 'Live' }]);
  });

  it('executes object queries through the manager', async () => {
    await dbManager.query('INSERT INTO users (name, email, active) VALUES (?, ?, ?)', ['a', 'a@example.com', 1]);

    const result = await executeQuery(dbManager, {
      select: ['id', 'name', 'email'],
      from: 'users',
      where: { active: true },
      orderBy: { id: 'DESC' },
      limit: 10
    });

    expect(result.rows).toEqual([{ id: 1, name: 'a', email: 'a@example.com' }]);
  });

  it('rolls back a transaction', async () => {
    const tx = await dbManager.transaction();
    await tx.query('INSERT INTO users (name) VALUES (?)', ['temp']);
    await tx.rollback();

    expect((await dbManager.query('SELECT * FROM users')).rows).toEqual([]);
  });
});
