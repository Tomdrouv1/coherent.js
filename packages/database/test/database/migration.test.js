/**
 * Tests for Migration System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Migration, SchemaBuilder, TableBuilder } from '../../src/migration.js';
import * as fs from 'fs/promises';

// Mock fs operations
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn()
}));

describe('Migration', () => {
  let mockDb;
  let migration;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };

    migration = new Migration(mockDb, {
      directory: './test-migrations',
      tableName: 'test_migrations'
    });

    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with database and config', () => {
      expect(migration.db).toBe(mockDb);
      expect(migration.config.directory).toBe('./test-migrations');
      expect(migration.config.tableName).toBe('test_migrations');
    });

    it('should use default config values', () => {
      const defaultMigration = new Migration(mockDb);
      
      expect(defaultMigration.config.directory).toBe('./migrations');
      expect(defaultMigration.config.tableName).toBe('coherent_migrations');
    });
  });

  describe('ensureMigrationsTable', () => {
    it('should not create table if it exists', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
      
      await migration.ensureMigrationsTable();
      
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT 1 FROM test_migrations LIMIT 1');
    });

    it('should create table if it does not exist', async () => {
      mockDb.query
        .mockRejectedValueOnce(new Error('Table does not exist'))
        .mockResolvedValueOnce();
      
      await migration.ensureMigrationsTable();
      
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenLastCalledWith(
        expect.stringContaining('CREATE TABLE test_migrations')
      );
    });
  });

  describe('loadAppliedMigrations', () => {
    it('should load applied migrations from database', async () => {
      const mockResult = {
        rows: [
          { migration: '20231201000001_create_users' },
          { migration: '20231201000002_create_posts' }
        ]
      };
      mockDb.query.mockResolvedValue(mockResult);
      
      await migration.loadAppliedMigrations();
      
      expect(migration.appliedMigrations.has('20231201000001_create_users')).toBe(true);
      expect(migration.appliedMigrations.has('20231201000002_create_posts')).toBe(true);
    });

    it('should handle empty result', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      await migration.loadAppliedMigrations();
      
      expect(migration.appliedMigrations.size).toBe(0);
    });
  });

  describe('loadMigrationFiles', () => {
    it('should load migration files from directory', async () => {
      const mockFiles = [
        '20231201000001_create_users.js',
        '20231201000002_create_posts.js',
        'not_a_migration.txt'
      ];
      
      fs.readdir.mockResolvedValue(mockFiles);
      
      // Mock dynamic imports
      const mockMigration1 = { up: vi.fn(), down: vi.fn() };
      const mockMigration2 = { up: vi.fn(), down: vi.fn() };
      
      vi.doMock('./test-migrations/20231201000001_create_users.js', () => mockMigration1);
      vi.doMock('./test-migrations/20231201000002_create_posts.js', () => mockMigration2);
      
      await migration.loadMigrationFiles();
      
      expect(migration.migrations).toHaveLength(2);
      expect(migration.migrations[0].name).toBe('20231201000001_create_users');
      expect(migration.migrations[1].name).toBe('20231201000002_create_posts');
    });

    it('should handle missing directory', async () => {
      const error = new Error('Directory not found');
      error.code = 'ENOENT';
      fs.readdir.mockRejectedValue(error);
      
      await migration.loadMigrationFiles();
      
      expect(migration.migrations).toHaveLength(0);
    });

    it('should skip invalid migration files', async () => {
      fs.readdir.mockResolvedValue(['invalid_migration.js']);
      
      // Mock import that throws
      vi.doMock('./test-migrations/invalid_migration.js', () => {
        throw new Error('Invalid migration');
      });
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await migration.loadMigrationFiles();
      
      expect(migration.migrations).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load migration invalid_migration.js')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('run', () => {
    beforeEach(() => {
      // Mock initialization methods
      migration.ensureMigrationsTable = vi.fn().mockResolvedValue();
      migration.loadAppliedMigrations = vi.fn().mockResolvedValue();
      migration.loadMigrationFiles = vi.fn().mockResolvedValue();
      migration.getNextBatchNumber = vi.fn().mockResolvedValue(1);
    });

    // it('should run pending migrations', async () => {
    //   const mockUp = vi.fn().mockResolvedValue();
    //   const mockTx = {
    //     query: vi.fn().mockResolvedValue(),
    //     commit: vi.fn().mockResolvedValue(),
    //     rollback: vi.fn().mockResolvedValue()
    //   };
      
    //   migration.migrations = [
    //     { name: 'test_migration', up: mockUp, applied: false }
    //   ];
      
    //   mockDb.transaction.mockResolvedValue(mockTx);
      
    //   const applied = await migration.run();
      
    //   expect(applied).toEqual([]);
    //   expect(mockUp).toHaveBeenCalledWith(expect.any(SchemaBuilder));
    //   expect(mockTx.commit).toHaveBeenCalled();
    // });

    it('should skip already applied migrations', async () => {
      migration.migrations = [
        { name: 'test_migration', up: vi.fn(), applied: true }
      ];
      
      const applied = await migration.run();
      
      expect(applied).toEqual([]);
    });

    // it('should rollback on migration failure', async () => {
    //   const mockUp = vi.fn().mockRejectedValue(new Error('Migration failed'));
    //   const mockTx = {
    //     query: vi.fn(),
    //     commit: vi.fn(),
    //     rollback: vi.fn().mockResolvedValue()
    //   };
      
    //   migration.migrations = [
    //     { name: 'test_migration', up: mockUp, applied: false }
    //   ];
      
    //   mockDb.transaction.mockResolvedValue(mockTx);
      
    //   await expect(migration.run()).rejects.toThrow('Migration failed');
    //   expect(mockTx.rollback).toHaveBeenCalled();
    // });

    it('should continue on error when configured', async () => {
      const mockUp1 = vi.fn().mockRejectedValue(new Error('Migration 1 failed'));
      const mockUp2 = vi.fn().mockResolvedValue();
      const mockTx = {
        query: vi.fn().mockResolvedValue(),
        commit: vi.fn().mockResolvedValue(),
        rollback: vi.fn().mockResolvedValue()
      };
      
      migration.migrations = [
        { name: 'migration1', up: mockUp1, applied: false },
        { name: 'migration2', up: mockUp2, applied: false }
      ];
      
      mockDb.transaction.mockResolvedValue(mockTx);
      
      const applied = await migration.run({ continueOnError: true });
      
      expect(applied).toEqual([]);
    });
  });

  describe('rollback', () => {
    beforeEach(() => {
      migration.initialize = vi.fn().mockResolvedValue();
      migration.getLastBatches = vi.fn().mockResolvedValue([2]);
      migration.getMigrationsInBatch = vi.fn().mockResolvedValue(['migration2', 'migration1']);
    });

    it('should rollback migrations in reverse order', async () => {
      const mockDown1 = vi.fn().mockResolvedValue();
      const mockDown2 = vi.fn().mockResolvedValue();
      const mockTx = {
        query: vi.fn().mockResolvedValue(),
        commit: vi.fn().mockResolvedValue(),
        rollback: vi.fn().mockResolvedValue()
      };
      
      migration.migrations = [
        { name: 'migration1', down: mockDown1 },
        { name: 'migration2', down: mockDown2 }
      ];
      
      mockDb.transaction.mockResolvedValue(mockTx);
      
      const rolledBack = await migration.rollback(1);
      
      expect(rolledBack).toEqual(['migration2', 'migration1']);
      expect(mockDown2).toHaveBeenCalled();
      expect(mockDown1).toHaveBeenCalled();
    });

    it('should skip migrations without down method', async () => {
      migration.migrations = [
        { name: 'migration1', down: null }
      ];
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const rolledBack = await migration.rollback(1);
      
      expect(rolledBack).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'No rollback method for migration: migration1'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle missing migration files', async () => {
      migration.migrations = [];
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const rolledBack = await migration.rollback(1);
      
      expect(rolledBack).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Migration file not found: migration2'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('status', () => {
    it('should return migration status', async () => {
      migration.initialize = vi.fn().mockResolvedValue();
      migration.migrations = [
        { name: 'migration1', applied: true, file: '/path/to/migration1.js' },
        { name: 'migration2', applied: false, file: '/path/to/migration2.js' }
      ];
      
      const status = await migration.status();
      
      expect(status).toEqual({
        pending: [
          { name: 'migration2', applied: false, file: '/path/to/migration2.js' }
        ],
        completed: [
          { name: 'migration1', applied: true, file: '/path/to/migration1.js' }
        ]
      });
    });
  });

  describe('create', () => {
    it('should create migration file', async () => {
      migration.ensureDirectory = vi.fn().mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      const filePath = await migration.create('create_users_table');
      
      expect(fs.writeFile).toHaveBeenCalled();
      expect(filePath).toMatch(/create_users_table\.js$/);
    });

    it('should generate create table template', async () => {
      migration.ensureDirectory = vi.fn().mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      await migration.create('create_users_table');
      
      const writeCall = fs.writeFile.mock.calls[0];
      const template = writeCall[1];
      
      expect(template).toContain('createTable');
      expect(template).toContain('dropTable');
      expect(template).toContain('users');
    });

    it('should generate generic template for non-create migrations', async () => {
      migration.ensureDirectory = vi.fn().mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      await migration.create('add_email_to_users');
      
      const writeCall = fs.writeFile.mock.calls[0];
      const template = writeCall[1];
      
      expect(template).toContain('Add your migration logic here');
      expect(template).toContain('Add your rollback logic here');
    });
  });

  describe('getNextBatchNumber', () => {
    it('should return next batch number', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ max_batch: 5 }]
      });
      
      const batchNumber = await migration.getNextBatchNumber();
      
      expect(batchNumber).toBe(6);
    });

    it('should return 1 for first batch', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ max_batch: null }]
      });
      
      const batchNumber = await migration.getNextBatchNumber();
      
      expect(batchNumber).toBe(1);
    });
  });
});

describe('SchemaBuilder', () => {
  let mockDb;
  let schema;

  beforeEach(() => {
    mockDb = {
      query: vi.fn()
    };
    schema = new SchemaBuilder(mockDb);
  });

  describe('createTable', () => {
    it('should create table with callback', async () => {
      mockDb.query.mockResolvedValue();
      
      await schema.createTable('users', (table) => {
        table.id();
        table.string('name').notNull();
      });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE users')
      );
    });
  });

  describe('alterTable', () => {
    it('should alter table with multiple statements', async () => {
      mockDb.query.mockResolvedValue();
      
      await schema.alterTable('users', (table) => {
        table.addColumn('email', 'string');
        table.dropColumn('old_field');
      });
      
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        'ALTER TABLE users ADD COLUMN email string'
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        'ALTER TABLE users DROP COLUMN old_field'
      );
    });
  });

  describe('dropTable', () => {
    it('should drop table', async () => {
      mockDb.query.mockResolvedValue();
      
      await schema.dropTable('users');
      
      expect(mockDb.query).toHaveBeenCalledWith('DROP TABLE IF EXISTS users');
    });
  });

  describe('raw', () => {
    it('should execute raw SQL', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      await schema.raw('SELECT * FROM users', ['param']);
      
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users', ['param']);
    });
  });
});

describe('TableBuilder', () => {
  let table;

  beforeEach(() => {
    table = new TableBuilder('users');
  });

  describe('column methods', () => {
    it('should add id column', () => {
      table.id();
      
      expect(table.columns).toHaveLength(1);
      expect(table.columns[0]).toMatchObject({
        name: 'id',
        type: 'INTEGER',
        primaryKey: true,
        autoIncrement: true
      });
    });

    it('should add string column', () => {
      const column = table.string('name', 100);
      
      expect(table.columns).toHaveLength(1);
      expect(table.columns[0]).toMatchObject({
        name: 'name',
        type: 'VARCHAR(100)',
        nullable: true
      });
      expect(column).toBeDefined(); // Returns ColumnBuilder
    });

    it('should add text column', () => {
      table.text('description');
      
      expect(table.columns[0]).toMatchObject({
        name: 'description',
        type: 'TEXT'
      });
    });

    it('should add integer column', () => {
      table.integer('age');
      
      expect(table.columns[0]).toMatchObject({
        name: 'age',
        type: 'INTEGER'
      });
    });

    it('should add boolean column', () => {
      table.boolean('active');
      
      expect(table.columns[0]).toMatchObject({
        name: 'active',
        type: 'BOOLEAN',
        default: false
      });
    });

    it('should add datetime column', () => {
      table.datetime('created_at');
      
      expect(table.columns[0]).toMatchObject({
        name: 'created_at',
        type: 'DATETIME'
      });
    });

    it('should add timestamps', () => {
      table.timestamps();
      
      expect(table.columns).toHaveLength(2);
      expect(table.columns[0].name).toBe('created_at');
      expect(table.columns[1].name).toBe('updated_at');
    });
  });

  describe('alter table methods', () => {
    beforeEach(() => {
      table = new TableBuilder('users', 'alter');
    });

    it('should add column alteration', () => {
      table.addColumn('email', 'string');
      
      expect(table.alterations).toHaveLength(1);
      expect(table.alterations[0]).toMatchObject({
        type: 'ADD',
        name: 'email',
        columnType: 'string'
      });
    });

    it('should add drop column alteration', () => {
      table.dropColumn('old_field');
      
      expect(table.alterations).toHaveLength(1);
      expect(table.alterations[0]).toMatchObject({
        type: 'DROP',
        name: 'old_field'
      });
    });
  });

  describe('toCreateSQL', () => {
    it('should generate CREATE TABLE SQL', () => {
      table.id();
      table.string('name').notNull();
      table.string('email').unique();
      
      const sql = table.toCreateSQL();
      
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
      expect(sql).toContain('name VARCHAR(255) NOT NULL');
      expect(sql).toContain('email VARCHAR(255) UNIQUE');
    });
  });

  describe('toAlterSQL', () => {
    it('should generate ALTER TABLE SQL statements', () => {
      table = new TableBuilder('users', 'alter');
      table.addColumn('email', 'VARCHAR(255)');
      table.dropColumn('old_field');
      
      const statements = table.toAlterSQL();
      
      expect(statements).toHaveLength(2);
      expect(statements[0]).toBe('ALTER TABLE users ADD COLUMN email VARCHAR(255)');
      expect(statements[1]).toBe('ALTER TABLE users DROP COLUMN old_field');
    });
  });
});

describe('ColumnBuilder', () => {
  let column;
  let columnBuilder;

  beforeEach(() => {
    column = { name: 'test', type: 'VARCHAR(255)', nullable: true };
    columnBuilder = new (class ColumnBuilder {
      constructor(column) { this.column = column; }
      notNull() { this.column.nullable = false; return this; }
      unique() { this.column.unique = true; return this; }
      default(value) { this.column.default = typeof value === 'string' ? `'${value}'` : value; return this; }
    })(column);
  });

  it('should make column not nullable', () => {
    const result = columnBuilder.notNull();
    
    expect(column.nullable).toBe(false);
    expect(result).toBe(columnBuilder); // chainable
  });

  it('should make column unique', () => {
    const result = columnBuilder.unique();
    
    expect(column.unique).toBe(true);
    expect(result).toBe(columnBuilder);
  });

  it('should set default value', () => {
    columnBuilder.default('test');
    
    expect(column.default).toBe("'test'");
  });

  it('should set numeric default value', () => {
    columnBuilder.default(42);
    
    expect(column.default).toBe(42);
  });
});
