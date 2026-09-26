/**
 * Regression tests for the migration runners against real migration files and a real
 * in-memory SQLite database (fs is not mocked here).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabaseManager } from '../../src/connection-manager.js';
import { Migration, createMigration, createTableBuilder, TableBuilder } from '../../src/migration.js';

function writeMigration(dir, name, body) {
  writeFileSync(join(dir, `${name}.js`), body);
}

const createTable = (table) => `
export async function up(schema) {
  await schema.createTable('${table}', (t) => { t.id(); t.string('name'); });
}
export async function down(schema) {
  await schema.dropTable('${table}');
}
`;

async function tableNames(db) {
  const { rows } = await db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  return rows.map(row => row.name);
}

describe('migration runners on SQLite', () => {
  let db;
  let dir;

  beforeEach(async () => {
    db = createDatabaseManager({ type: 'sqlite', database: ':memory:' });
    await db.connect();
    dir = mkdtempSync(join(tmpdir(), 'coherent-migrations-'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
    await db.close();
  });

  it('really runs migrations when NODE_ENV is "test"', async () => {
    expect(process.env.NODE_ENV).toBe('test');
    writeMigration(dir, '20240101000000_create_widgets', createTable('widgets'));

    const applied = await new Migration(db, { directory: dir }).run();

    expect(applied).toEqual(['20240101000000_create_widgets']);
    expect(await tableNames(db)).toEqual(['coherent_migrations', 'widgets']);
  });

  it('resolves a relative directory against the working directory', async () => {
    mkdirSync(join(dir, 'db', 'migrations'), { recursive: true });
    writeMigration(join(dir, 'db', 'migrations'), '20240101000000_create_widgets', createTable('widgets'));

    const cwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await createMigration(db, { directory: 'db/migrations' }).run()).toEqual(['20240101000000_create_widgets']);
    } finally {
      process.chdir(cwd);
    }
    expect(await tableNames(db)).toContain('widgets');
  });

  it('uses ./migrations under the working directory by default', async () => {
    mkdirSync(join(dir, 'migrations'));
    writeMigration(join(dir, 'migrations'), '20240101000000_create_widgets', createTable('widgets'));

    const cwd = process.cwd();
    process.chdir(dir);
    try {
      expect(await createMigration(db).run()).toEqual(['20240101000000_create_widgets']);
      expect(await new Migration(db).status()).toMatchObject({
        pending: [],
        completed: [{ name: '20240101000000_create_widgets' }]
      });
    } finally {
      process.chdir(cwd);
    }
  });

  it('runs up() once when status() is called before run()', async () => {
    writeMigration(dir, '20240101000000_count', `
export async function up(schema) {
  await schema.raw('CREATE TABLE IF NOT EXISTS ups (n INTEGER)');
  await schema.raw('INSERT INTO ups (n) VALUES (1)');
}
`);
    const migration = createMigration(db, { directory: dir });

    expect(await migration.status()).toEqual([
      { name: '20240101000000_count', applied: false, file: join(dir, '20240101000000_count.js') }
    ]);
    expect(await migration.run()).toEqual(['20240101000000_count']);
    expect(await migration.run()).toEqual([]);
    expect((await db.query('SELECT COUNT(*) AS n FROM ups')).rows[0].n).toBe(1);
  });

  it('rolls back the last batch only', async () => {
    const migration = createMigration(db, { directory: dir });
    writeMigration(dir, '20240101000000_create_a', createTable('a'));
    await migration.run();
    writeMigration(dir, '20240102000000_create_b', createTable('b'));
    writeMigration(dir, '20240103000000_create_c', createTable('c'));
    await migration.run();

    expect(await migration.rollback(1)).toEqual(['20240103000000_create_c', '20240102000000_create_b']);
    expect(await tableNames(db)).toEqual(['a', 'coherent_migrations']);

    const klass = new Migration(db, { directory: dir });
    expect(await klass.rollback(1)).toEqual(['20240101000000_create_a']);
    expect(await tableNames(db)).toEqual(['coherent_migrations']);
  });

  it('fails loudly when a migration file cannot be imported', async () => {
    writeMigration(dir, '20240101000000_broken', 'export async function up( {');

    await expect(createMigration(db, { directory: dir }).run()).rejects.toThrow('Failed to load migration 20240101000000_broken.js');
    await expect(new Migration(db, { directory: dir }).run()).rejects.toThrow('Failed to load migration 20240101000000_broken.js');
  });

  it('escapes string defaults and keeps timestamp defaults as expressions', async () => {
    const table = createTableBuilder('people');
    table.id();
    table.string('name').default("O'Brien");
    table.timestamps();

    const sql = table.toCreateSQL();
    expect(sql).toContain("name VARCHAR(255) DEFAULT 'O''Brien'");
    expect(sql).toContain('created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    expect(sql).not.toContain("'CURRENT_TIMESTAMP'");

    await db.query(sql);
    await db.query('INSERT INTO people (id) VALUES (1)');
    const { rows } = await db.query('SELECT name, created_at FROM people');
    expect(rows[0].name).toBe("O'Brien");
    expect(rows[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('creates foreign keys declared with references()', async () => {
    writeMigration(dir, '20240101000000_create_posts', `
export async function up(schema) {
  await schema.createTable('users', (t) => { t.id(); });
  await schema.createTable('posts', (t) => { t.id(); t.integer('user_id').references('users.id'); });
}
`);
    await new Migration(db, { directory: dir }).run();

    const { rows } = await db.query('PRAGMA foreign_key_list(posts)');
    expect(rows).toMatchObject([{ table: 'users', from: 'user_id', to: 'id' }]);
  });
});

describe('migration DDL per dialect', () => {
  function recordingDb(type) {
    const statements = [];
    return {
      statements,
      config: { type },
      async query(sql) {
        statements.push(sql);
        if (sql.startsWith('SELECT 1 FROM')) throw new Error('relation does not exist');
        if (sql.startsWith('SELECT MAX')) return { rows: [{ max_batch: null }] };
        return { rows: [] };
      },
      async transaction() {
        return { query: this.query.bind(this), commit: async () => {}, rollback: async () => {} };
      }
    };
  }

  const run = async (db) => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const migration = createMigration(db, { directory: join(tmpdir(), 'coherent-no-such-dir') });
    await migration.run();
    vi.restoreAllMocks();
    return db.statements.find(sql => sql.startsWith('CREATE TABLE'));
  };

  it('creates the tracking table with PostgreSQL types', async () => {
    const ddl = await run(recordingDb('postgresql'));
    expect(ddl).toContain('id SERIAL PRIMARY KEY');
    expect(ddl).toContain('executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    expect(ddl).not.toMatch(/AUTOINCREMENT|DATETIME/);
  });

  it('creates the tracking table with MySQL types', async () => {
    const ddl = await run(recordingDb('mysql'));
    expect(ddl).toContain('id INT AUTO_INCREMENT PRIMARY KEY');
    expect(ddl).toContain('executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    expect(ddl).not.toMatch(/AUTOINCREMENT|DATETIME/);
  });

  it('keeps SQLite types for SQLite and unknown adapters', async () => {
    expect(await run(recordingDb('sqlite'))).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(await run(recordingDb(undefined))).toContain('executed_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  });

  it('renders table builder columns for the dialect', () => {
    const pg = createTableBuilder('events', { dialect: 'postgresql' });
    pg.id();
    pg.datetime('at');
    expect(pg.toCreateSQL()).toBe('CREATE TABLE events (\n  id SERIAL PRIMARY KEY NOT NULL,\n  at TIMESTAMP\n)');

    const mysql = new TableBuilder('events', { dialect: 'mysql' });
    mysql.id();
    expect(mysql.toCreateSQL()).toContain('id INTEGER PRIMARY KEY AUTO_INCREMENT');
  });

  it('refuses document databases', () => {
    expect(() => new Migration({ config: { type: 'mongodb' }, query: async () => ({}) }).dialect)
      .toThrow("SQL migrations are not supported for the 'mongodb' database type");
  });
});

describe('migrations without transaction support', () => {
  it('warns once, then runs each migration directly', async () => {
    const statements = [];
    const db = {
      async query(sql, params) {
        statements.push([sql, params]);
        if (sql.startsWith('SELECT migration')) return { rows: [] };
        if (sql.startsWith('SELECT MAX')) return { rows: [{ max_batch: 0 }] };
        return { rows: [] };
      }
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const migration = new Migration(db, {
      migrations: [
        { name: 'one', up: async (schema) => schema.raw('SELECT 1') },
        { name: 'two', up: async (schema) => schema.raw('SELECT 2') }
      ]
    });

    expect(await migration.run()).toEqual(['one', 'two']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('without a transaction');
    expect(statements.filter(([sql]) => sql.startsWith('INSERT'))).toEqual([
      ['INSERT INTO coherent_migrations (migration, batch) VALUES (?, ?)', ['one', 1]],
      ['INSERT INTO coherent_migrations (migration, batch) VALUES (?, ?)', ['two', 1]]
    ]);
    warn.mockRestore();
  });

  it('does not warn when transactions are disabled on purpose', async () => {
    const db = { query: async () => ({ rows: [] }) };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await new Migration(db, { transactional: false, migrations: [{ name: 'one', up: async () => {} }] }).run();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
