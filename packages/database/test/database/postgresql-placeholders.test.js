/**
 * Regression tests: the PostgreSQL adapter converts `?` placeholders to `$n`, but must
 * not rewrite `?` characters that are part of the SQL itself.
 */

import { describe, it, expect, vi } from 'vitest';
import { createPostgreSQLAdapter } from '../../src/adapters/postgresql.js';

async function sentSql(sql) {
  const client = { query: vi.fn(async () => ({ rows: [], rowCount: 0 })), release: vi.fn() };
  const pool = { connect: async () => client };
  await createPostgreSQLAdapter().query(pool, sql, []);
  return client.query.mock.calls[0][0];
}

describe('PostgreSQL placeholder conversion', () => {
  it('numbers placeholders in order', async () => {
    expect(await sentSql('SELECT * FROM users WHERE id = ? AND role = ?')).toBe('SELECT * FROM users WHERE id = $1 AND role = $2');
  });

  it('leaves question marks inside string literals and quoted identifiers alone', async () => {
    expect(await sentSql("SELECT * FROM faq WHERE question = 'Why?' AND id = ?"))
      .toBe("SELECT * FROM faq WHERE question = 'Why?' AND id = $1");
    expect(await sentSql("SELECT 'it''s ?', \"odd?col\" FROM t WHERE a = ?"))
      .toBe("SELECT 'it''s ?', \"odd?col\" FROM t WHERE a = $1");
    expect(await sentSql("SELECT E'it\\'s ?' WHERE a = ?")).toBe("SELECT E'it\\'s ?' WHERE a = $1");
    expect(await sentSql('SELECT $$what?$$, $tag$ ? $tag$ WHERE a = ?')).toBe('SELECT $$what?$$, $tag$ ? $tag$ WHERE a = $1');
  });

  it('leaves question marks inside comments alone', async () => {
    expect(await sentSql('SELECT 1 -- why?\nWHERE a = ? /* really? */ AND b = ?'))
      .toBe('SELECT 1 -- why?\nWHERE a = $1 /* really? */ AND b = $2');
  });

  it('keeps the JSONB ?| and ?& operators and turns ?? into the ? operator', async () => {
    expect(await sentSql('SELECT * FROM docs WHERE data ?| ? AND data ?& ? AND data ?? ?'))
      .toBe('SELECT * FROM docs WHERE data ?| $1 AND data ?& $2 AND data ? $3');
    expect(await sentSql("SELECT ? || 'suffix'")).toBe("SELECT $1 || 'suffix'");
  });
});
