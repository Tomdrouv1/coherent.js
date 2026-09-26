import { describe, it, expect } from 'vitest';
import { executeQuery } from '../src/query-builder.js';

/** Run a query config against a db that records what it receives; resolve to { sql, params }. */
async function sqlFor(config) {
  let received;
  await executeQuery({ query: async (sql, params) => { received = { sql, params }; return { rows: [] }; } }, config);
  return received;
}

describe('Database Query Builder', () => {
  it('builds SELECT query', async () => {
    expect(await sqlFor({ table: 'users' })).toEqual({ sql: 'SELECT * FROM users', params: [] });
    expect((await sqlFor({ table: 'users', select: ['id', 'name'] })).sql).toBe('SELECT id, name FROM users');
  });

  it('builds INSERT query', async () => {
    expect(await sqlFor({ table: 'users', insert: { name: 'John', email: 'john@example.com' } })).toEqual({
      sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
      params: ['John', 'john@example.com']
    });
  });

  it('builds WHERE conditions', async () => {
    expect(await sqlFor({ table: 'users', where: { age: { '>': 18 }, status: 'active' } })).toEqual({
      sql: 'SELECT * FROM users WHERE age > ? AND status = ?',
      params: [18, 'active']
    });
  });

  it('builds JOIN queries', async () => {
    const { sql } = await sqlFor({
      select: ['users.name', 'posts.title'],
      from: 'users',
      joins: [{ table: 'posts', condition: 'users.id = posts.user_id' }]
    });
    expect(sql).toBe('SELECT users.name, posts.title FROM users INNER JOIN posts ON users.id = posts.user_id');
  });
});
