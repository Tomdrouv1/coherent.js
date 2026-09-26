/**
 * Regression tests: the query builder must never interpolate unchecked input into
 * SQL, and must never silently drop a WHERE condition.
 */

import { describe, it, expect } from 'vitest';
import { executeQuery } from '../../src/query-builder.js';

function recordingDb() {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [], affectedRows: 0 };
    }
  };
}

/** Run a query config against a db that records what it receives; resolve to { sql, params }. */
async function sqlFor(config) {
  const db = recordingDb();
  await executeQuery(db, config);
  return db.calls[0];
}

describe('query builder: SQL injection through identifiers and clauses', () => {
  it('rejects an ORDER BY direction that is not ASC or DESC', async () => {
    await expect(sqlFor({ table: 'users', orderBy: { name: 'ASC; DROP TABLE users; --' } }))
      .rejects.toThrow('Invalid ORDER BY direction');
  });

  it('accepts ASC/DESC in any case and defaults string entries to ASC', async () => {
    expect((await sqlFor({ table: 'users', orderBy: { name: 'desc', id: 'Asc' } })).sql)
      .toBe('SELECT * FROM users ORDER BY name DESC, id ASC');
    expect((await sqlFor({ table: 'users', orderBy: ['name', 'created_at DESC'] })).sql)
      .toBe('SELECT * FROM users ORDER BY name ASC, created_at DESC');
  });

  it('rejects an ORDER BY column that is not an identifier', async () => {
    await expect(sqlFor({ table: 'users', orderBy: { '(SELECT 1)': 'ASC' } }))
      .rejects.toThrow('Invalid SQL identifier for ORDER BY');
  });

  it('rejects LIMIT and OFFSET values that are not non-negative integers', async () => {
    await expect(sqlFor({ table: 'users', limit: '1; DELETE FROM users' })).rejects.toThrow('LIMIT must be a non-negative integer');
    await expect(sqlFor({ table: 'users', limit: -1 })).rejects.toThrow('LIMIT must be a non-negative integer');
    await expect(sqlFor({ table: 'users', limit: 1.5 })).rejects.toThrow('LIMIT must be a non-negative integer');
    await expect(sqlFor({ table: 'users', offset: '0 UNION SELECT password FROM admins' }))
      .rejects.toThrow('OFFSET must be a non-negative integer');
    expect((await sqlFor({ table: 'users', limit: 10, offset: 20 })).sql).toBe('SELECT * FROM users LIMIT 10 OFFSET 20');
  });

  it('rejects WHERE keys that are not identifiers', async () => {
    await expect(sqlFor({ table: 'users', where: { '1=1 OR id': 5 } }))
      .rejects.toThrow('Invalid SQL identifier for WHERE');
  });

  it('rejects table names, aliases and insert/update columns that are not identifiers', async () => {
    await expect(sqlFor({ table: 'users; DROP TABLE users' })).rejects.toThrow('Invalid SQL identifier for table');
    await expect(sqlFor({ from: { table: 'users', alias: 'u; --' } })).rejects.toThrow('Invalid SQL alias');
    await expect(sqlFor({ table: 'users', insert: { 'name) VALUES (1); --': 'x' } }))
      .rejects.toThrow('Invalid SQL identifier for INSERT INTO users');
    await expect(sqlFor({ table: 'users', update: { 'role = 1, name': 'x' }, where: { id: 1 } }))
      .rejects.toThrow('Invalid SQL identifier for UPDATE users');
  });

  it('rejects select expressions that are not columns or simple aggregates', async () => {
    await expect(sqlFor({ table: 'users', select: ['id', '(SELECT password FROM admins LIMIT 1) AS x'] }))
      .rejects.toThrow('Invalid select column');
    expect((await sqlFor({ table: 'users', select: ['u.*', 'COUNT(*) AS total', 'MAX(age) as oldest'] })).sql)
      .toBe('SELECT u.*, COUNT(*) AS total, MAX(age) AS oldest FROM users');
    expect((await sqlFor({ table: 'users', select: { total: 'COUNT(*)', person: 'name' } })).sql)
      .toBe('SELECT COUNT(*) AS total, name AS person FROM users');
    await expect(sqlFor({ table: 'users', select: { everything: '*' } })).rejects.toThrow('Invalid select column for alias');
    await expect(sqlFor({ table: 'users', select: { a: 'name AS b' } })).rejects.toThrow('Invalid select column for alias');
  });

  // Regression: the alias pattern /^(.+?)\s+AS\s+…$/ let `.+?` and `\s+`
  // both claim a run of spaces, so one column from a request ('a' plus
  // 50,000 spaces) held the event loop for about two seconds.
  it('parses select columns in linear time', async () => {
    const started = performance.now();
    await expect(sqlFor({ table: 'users', select: [`a${' '.repeat(50_000)}!`] })).rejects.toThrow('Invalid select column');
    await expect(sqlFor({ table: 'users', select: [`a${' AS'.repeat(20_000)} x!`] })).rejects.toThrow('Invalid select column');
    expect(performance.now() - started).toBeLessThan(250);

    expect((await sqlFor({ table: 'users', select: ['name  AS  full_name', 'a.b as c'] })).sql)
      .toBe('SELECT name AS full_name, a.b AS c FROM users');
    await expect(sqlFor({ table: 'users', select: ['a AS b AS c'] })).rejects.toThrow('Invalid select column');
  });

  it('rejects join types and conditions that are not column comparisons', async () => {
    await expect(sqlFor({
      table: 'users',
      joins: [{ type: 'LEFT; DROP TABLE x', table: 'posts', condition: 'users.id = posts.user_id' }]
    })).rejects.toThrow('Invalid join type');
    await expect(sqlFor({ table: 'users', joins: [{ table: 'posts', condition: '1=1; DROP TABLE users' }] }))
      .rejects.toThrow('Invalid join condition');
    expect((await sqlFor({
      from: { table: 'users', alias: 'u' },
      joins: [{ type: 'left', table: 'posts', alias: 'p', condition: 'u.id = p.user_id AND p.published = u.active' }]
    })).sql).toBe('SELECT * FROM users u LEFT JOIN posts p ON u.id = p.user_id AND p.published = u.active');
  });
});

describe('query builder: conditions are never silently dropped', () => {
  it('throws on an unknown operator instead of dropping the condition', async () => {
    const db = recordingDb();
    await expect(executeQuery(db, { table: 'users', delete: true, where: { id: { $ne: 1 } } }))
      .rejects.toThrow('Unsupported operator "$ne" for id');
    expect(db.calls).toHaveLength(0);
  });

  it('throws on an undefined WHERE value instead of dropping the condition', async () => {
    const db = recordingDb();
    await expect(executeQuery(db, { table: 'users', delete: true, where: { id: undefined } }))
      .rejects.toThrow('WHERE value for id is undefined');
    expect(db.calls).toHaveLength(0);
  });

  it('throws on undefined operands, empty operator objects and empty $or/$and', async () => {
    await expect(sqlFor({ table: 'users', where: { id: { '>': undefined } } })).rejects.toThrow('is undefined');
    await expect(sqlFor({ table: 'users', where: { id: {} } })).rejects.toThrow('empty operator object');
    await expect(sqlFor({ table: 'users', where: { $or: [] } })).rejects.toThrow('$or requires a non-empty array');
    await expect(sqlFor({ table: 'users', where: { $or: [{}] } })).rejects.toThrow('at least one condition');
  });

  it('refuses UPDATE and DELETE without a WHERE clause unless allowFullTable is set', async () => {
    const db = recordingDb();
    await expect(executeQuery(db, { table: 'users', delete: true }))
      .rejects.toThrow('Refusing to run DELETE on users without a WHERE clause');
    await expect(executeQuery(db, { table: 'users', delete: true, where: {} })).rejects.toThrow('without a WHERE clause');
    await expect(executeQuery(db, { table: 'users', update: { role: 'admin' } })).rejects.toThrow('Refusing to run UPDATE on users');
    expect(db.calls).toHaveLength(0);

    await executeQuery(db, { table: 'users', delete: true, allowFullTable: true });
    expect(db.calls).toEqual([{ sql: 'DELETE FROM users', params: [] }]);
  });

  it('keeps every supported operator as a bound condition', async () => {
    const { sql, params } = await sqlFor({
      table: 'users',
      where: {
        age: { '>=': 18, '<': 65 },
        name: { like: 'J%' },
        role: { in: ['admin', 'editor'] },
        id: { 'not in': [1, 2] },
        score: { between: [1, 10] },
        deleted_at: null,
        verified_at: { '!=': null }
      }
    });
    expect(sql).toBe(
      'SELECT * FROM users WHERE age >= ? AND age < ? AND name LIKE ? AND role IN (?, ?) AND id NOT IN (?, ?) ' +
      'AND score BETWEEN ? AND ? AND deleted_at IS NULL AND verified_at IS NOT NULL'
    );
    expect(params).toEqual([18, 65, 'J%', 'admin', 'editor', 1, 2, 1, 10]);
  });

  it('supports the documented lowercase operators, $not and orderBy arrays', async () => {
    // `like` and `$not` used to be dropped silently; array orderBy produced garbage columns.
    expect(await sqlFor({
      table: 'users',
      where: { name: { like: 'John%' }, $not: { banned: true } },
      orderBy: [{ created_at: 'DESC' }, { name: 'ASC' }]
    })).toEqual({
      sql: 'SELECT * FROM users WHERE name LIKE ? AND NOT (banned = ?) ORDER BY created_at DESC, name ASC',
      params: ['John%', true]
    });
    await expect(sqlFor({ table: 'users', where: { $not: {} } })).rejects.toThrow('$not requires a condition object');
    await expect(sqlFor({ table: 'users', where: { $nor: [{ a: 1 }] } })).rejects.toThrow('Unknown logical operator "$nor"');
  });

  it('turns an empty IN list into a condition that matches nothing', async () => {
    expect((await sqlFor({ table: 'users', delete: true, where: { id: { in: [] } } })).sql)
      .toBe('DELETE FROM users WHERE 1 = 0');
  });

  it('rejects array values that would otherwise be bound as a single parameter', async () => {
    await expect(sqlFor({ table: 'users', where: { id: [1, 2] } })).rejects.toThrow('Use { in: [...] }');
  });

  it('rejects options it does not implement instead of ignoring them', async () => {
    await expect(sqlFor({ table: 'users', groupBy: 'role' })).rejects.toThrow('Unknown query option "groupBy"');
    await expect(sqlFor({ table: 'users', delete: true, where: { active: false }, limit: 1 }))
      .rejects.toThrow('limit cannot be used with delete');
  });

  it('skips undefined columns in INSERT and UPDATE data', async () => {
    expect(await sqlFor({ table: 'users', insert: { name: 'a', nickname: undefined } })).toEqual({
      sql: 'INSERT INTO users (name) VALUES (?)',
      params: ['a']
    });
    expect(await sqlFor({ table: 'users', update: { name: 'b', nickname: undefined }, where: { id: 1 } })).toEqual({
      sql: 'UPDATE users SET name = ? WHERE id = ?',
      params: ['b', 1]
    });
  });

  it('supports multi-row inserts and RETURNING', async () => {
    expect(await sqlFor({ table: 'users', insert: [{ name: 'a' }, { name: 'b' }], returning: 'id' })).toEqual({
      sql: 'INSERT INTO users (name) VALUES (?), (?) RETURNING id',
      params: ['a', 'b']
    });
  });
});
