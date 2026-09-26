/**
 * Database Migration System for Coherent.js
 *
 * @fileoverview Provides database schema migration functionality with version control,
 * rollback support, and automatic migration tracking.
 */

import { readdir, writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { assertIdentifier } from './query-builder.js';

// ============================================================================
// Shared helpers
// ============================================================================

const DIALECT_ALIASES = {
  postgresql: 'postgresql',
  postgres: 'postgresql',
  pg: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mysql',
  sqlite: 'sqlite',
  sqlite3: 'sqlite'
};

/**
 * SQL dialect for generated DDL: `config.dialect`, else the DatabaseManager's `type`,
 * else SQLite syntax (the historical default).
 *
 * @private
 */
function resolveDialect(db, config = {}) {
  const requested = config.dialect ?? db?.config?.type;
  if (requested === undefined || requested === null) return 'sqlite';

  const dialect = DIALECT_ALIASES[String(requested).toLowerCase()];
  if (!dialect) {
    throw new Error(`SQL migrations are not supported for the '${requested}' database type. Use postgresql, mysql or sqlite.`);
  }
  return dialect;
}

/**
 * CREATE TABLE statement for the migrations tracking table.
 *
 * @private
 */
function migrationsTableSQL(tableName, dialect) {
  switch (dialect) {
    case 'postgresql':
      return `CREATE TABLE ${tableName} (
          id SERIAL PRIMARY KEY,
          migration VARCHAR(255) NOT NULL UNIQUE,
          batch INTEGER NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
    case 'mysql':
      return `CREATE TABLE ${tableName} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          migration VARCHAR(255) NOT NULL UNIQUE,
          batch INT NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
    default:
      return `CREATE TABLE ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          migration VARCHAR(255) NOT NULL UNIQUE,
          batch INTEGER NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;
  }
}

/**
 * Absolute path of a migrations directory; relative paths resolve against the
 * process working directory (not this module's location).
 *
 * @private
 */
function resolveDirectory(directory) {
  return resolve(process.cwd(), directory);
}

/**
 * Import a migration module by file URL (a bare path such as `migrations/x.js` would be
 * resolved as a package name).
 *
 * @private
 */
async function importMigration(directory, file) {
  const url = pathToFileURL(join(resolveDirectory(directory), file)).href;
  try {
    return await import(url);
  } catch (error) {
    throw new Error(`Failed to load migration ${file}: ${error.message}`, { cause: error });
  }
}

const warnedWithoutTransaction = new WeakSet();

/**
 * Start the transaction a migration runs in.
 *
 * `transactional: false` runs migrations directly on the connection (for statements
 * that cannot run inside a transaction). A database object without `transaction()`
 * also runs directly, with a one-time warning.
 *
 * @private
 */
async function beginMigrationTransaction(db, config) {
  if (config.transactional !== false) {
    if (typeof db.transaction === 'function') {
      return await db.transaction();
    }

    if (!warnedWithoutTransaction.has(db)) {
      warnedWithoutTransaction.add(db);
      console.warn(
        'Running migrations without a transaction: the database object has no transaction() method, ' +
        'so a failed migration can be left half-applied. Pass { transactional: false } to run without ' +
        'transactions on purpose and silence this warning.'
      );
    }
  }

  return {
    query: (sql, params) => db.query(sql, params),
    commit: async () => {},
    rollback: async () => {}
  };
}

/**
 * Run `work(tx)` in a migration transaction, committing on success and rolling back on failure.
 *
 * @private
 */
async function inMigrationTransaction(db, config, work) {
  const tx = await beginMigrationTransaction(db, config);
  try {
    await work(tx);
  } catch (error) {
    if (typeof tx.rollback === 'function') {
      await tx.rollback();
    }
    throw error;
  }
  if (typeof tx.commit === 'function') {
    await tx.commit();
  }
}

function assertBatchCount(count) {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error(`Number of batches to roll back must be a positive integer, got ${count}`);
  }
  return count;
}

function migrationTimestamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
}

/**
 * SQL literal for a column default. Strings are quoted with embedded quotes doubled;
 * use `defaultRaw()` for expressions such as CURRENT_TIMESTAMP.
 *
 * @private
 */
function formatDefault(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Invalid column default: ${value}`);
    return String(value);
  }
  if (typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  throw new Error(`Unsupported column default: ${String(value)}. Use defaultRaw() for SQL expressions.`);
}

function renderColumnType(column, dialect) {
  if (column.type === 'DATETIME' && dialect === 'postgresql') return 'TIMESTAMP';
  return column.type;
}

function renderColumn(column, dialect) {
  let def;

  if (column.primaryKey && column.autoIncrement) {
    if (dialect === 'postgresql') {
      def = `${column.name} SERIAL PRIMARY KEY`;
    } else if (dialect === 'mysql') {
      def = `${column.name} ${column.type} PRIMARY KEY AUTO_INCREMENT`;
    } else {
      def = `${column.name} ${column.type} PRIMARY KEY AUTOINCREMENT`;
    }
  } else {
    def = `${column.name} ${renderColumnType(column, dialect)}`;
    if (column.primaryKey) def += ' PRIMARY KEY';
  }

  if (!column.nullable) def += ' NOT NULL';
  if (column.unique) def += ' UNIQUE';

  if (column.defaultRaw !== undefined) {
    def += ` DEFAULT ${column.defaultRaw}`;
  } else if (column.default !== undefined) {
    def += ` DEFAULT ${formatDefault(column.default)}`;
  }

  return def;
}

function renderForeignKeys(columns) {
  return columns
    .filter((column) => column.references)
    .map((column) => {
      const [table, referenced, ...rest] = String(column.references).split('.');
      if (!referenced || rest.length > 0) {
        throw new Error(`references() expects "table.column", got "${column.references}"`);
      }
      assertIdentifier(table, 'referenced table');
      assertIdentifier(referenced, 'referenced column');
      return `FOREIGN KEY (${column.name}) REFERENCES ${table}(${referenced})`;
    });
}

function renderCreateTable(tableName, columns, dialect) {
  const definitions = [
    ...columns.map((column) => renderColumn(column, dialect)),
    ...renderForeignKeys(columns)
  ];
  return `CREATE TABLE ${tableName} (\n  ${definitions.join(',\n  ')}\n)`;
}

function renderAlteration(tableName, alteration) {
  switch (alteration.type) {
    case 'ADD':
      return `ALTER TABLE ${tableName} ADD COLUMN ${alteration.name} ${alteration.columnType}`;
    case 'DROP':
      return `ALTER TABLE ${tableName} DROP COLUMN ${alteration.name}`;
    default:
      throw new Error(`Unsupported alteration type: ${alteration.type}`);
  }
}

/**
 * Chainable column modifiers returned by the table builders' column methods.
 *
 * @private
 */
function createColumnBuilder(column) {
  return {
    notNull() {
      column.nullable = false;
      return this;
    },
    unique() {
      column.unique = true;
      return this;
    },
    /** Literal default value; strings are quoted and escaped. */
    default(value) {
      column.default = value;
      delete column.defaultRaw;
      return this;
    },
    /** SQL expression default, e.g. defaultRaw('CURRENT_TIMESTAMP'). Not escaped. */
    defaultRaw(expression) {
      column.defaultRaw = expression;
      delete column.default;
      return this;
    },
    /** Foreign key to "table.column". */
    references(foreignKey) {
      column.references = foreignKey;
      return this;
    }
  };
}

function tableBuilderDialect(options) {
  return options && typeof options === 'object' ? options.dialect : undefined;
}

// ============================================================================
// Class API (@coherent.js/database/migration)
// ============================================================================

/**
 * Migration runner
 *
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [config={}] - Migration configuration
 * @param {string} [config.directory='./migrations'] - Migrations directory, relative to the working directory
 * @param {string} [config.tableName='coherent_migrations'] - Tracking table
 * @param {Array<{name: string, up: Function, down?: Function}>} [config.migrations] - Migrations to
 *   run instead of reading the directory
 * @param {'postgresql'|'mysql'|'sqlite'} [config.dialect] - DDL dialect (defaults to `db.config.type`)
 * @param {boolean} [config.transactional=true] - Run each migration in a transaction
 *
 * @example
 * const migration = new Migration(db, {
 *   directory: './migrations',
 *   tableName: 'coherent_migrations'
 * });
 *
 * const applied = await migration.run(); // ['20240101000000_create_users', ...]
 */
export class Migration {
  constructor(db, config = {}) {
    this.db = db;
    this.config = { directory: './migrations', tableName: 'coherent_migrations', ...config };
    assertIdentifier(this.config.tableName, 'migrations table');
    this.appliedMigrations = new Set();
    this.migrations = [];
  }

  /** @private */
  get dialect() {
    return resolveDialect(this.db, this.config);
  }

  /**
   * Create the tracking table if needed and load applied and available migrations.
   */
  async initialize() {
    await this.ensureMigrationsTable();
    await this.loadAppliedMigrations();

    const provided = await this.loadMigrations();
    if (Array.isArray(provided)) {
      this.migrations = provided.map((migration) => {
        if (!migration || typeof migration.name !== 'string') {
          throw new Error('Every migration must have a name');
        }
        return { ...migration, applied: this.appliedMigrations.has(migration.name) };
      });
    } else {
      await this.loadMigrationFiles();
    }
  }

  /**
   * Run pending migrations.
   *
   * @param {Object} [options={}]
   * @param {boolean} [options.continueOnError=false] - Keep going after a failed migration
   * @returns {Promise<string[]>} Names of the migrations applied
   */
  async run(options = {}) {
    await this.initialize();

    const pendingMigrations = this.migrations.filter(m => !m.applied);
    if (pendingMigrations.length === 0) {
      return [];
    }

    const batch = await this.getNextBatchNumber();
    const dialect = this.dialect;
    const appliedMigrationsList = [];

    for (const migration of pendingMigrations) {
      try {
        await inMigrationTransaction(this.db, this.config, async (tx) => {
          if (typeof migration.up === 'function') {
            await migration.up(new SchemaBuilder(tx, { dialect }));
          }
          await tx.query(
            `INSERT INTO ${this.config.tableName} (migration, batch) VALUES (?, ?)`,
            [migration.name, batch]
          );
        });

        migration.applied = true;
        this.appliedMigrations.add(migration.name);
        appliedMigrationsList.push(migration.name);
      } catch (_error) {
        console.error(`Migration ${migration.name} failed: ${_error.message}`);

        if (!options.continueOnError) {
          throw _error;
        }
      }
    }

    return appliedMigrationsList;
  }

  /**
   * Roll back the most recent batches.
   *
   * @param {number} [steps=1] - Number of batches to roll back
   * @returns {Promise<string[]>} Names of the migrations rolled back, newest first
   */
  async rollback(steps = 1) {
    await this.initialize();

    const batches = await this.getLastBatches(steps);
    const dialect = this.dialect;
    const rolledBackMigrations = [];

    for (const batch of batches) {
      for (const name of await this.getMigrationsInBatch(batch)) {
        const migration = this.migrations.find(m => m.name === name);

        if (!migration) {
          console.warn(`Migration file not found: ${name}`);
          continue;
        }

        if (!migration.down) {
          console.warn(`No rollback method for migration: ${name}`);
          continue;
        }

        try {
          await inMigrationTransaction(this.db, this.config, async (tx) => {
            await migration.down(new SchemaBuilder(tx, { dialect }));
            await tx.query(`DELETE FROM ${this.config.tableName} WHERE migration = ?`, [name]);
          });
        } catch (_error) {
          console.error(`Rollback ${name} failed: ${_error.message}`);
          throw _error;
        }

        migration.applied = false;
        this.appliedMigrations.delete(name);
        rolledBackMigrations.push(name);
      }
    }

    return rolledBackMigrations;
  }

  /**
   * @returns {Promise<{pending: Array, completed: Array}>} Migration status
   */
  async status() {
    await this.initialize();

    const summarize = migration => ({
      name: migration.name,
      applied: migration.applied,
      file: migration.file || `${migration.name}.js`
    });

    return {
      pending: this.migrations.filter(m => !m.applied).map(summarize),
      completed: this.migrations.filter(m => m.applied).map(summarize)
    };
  }

  /**
   * Write a new migration file.
   *
   * @param {string} name - Migration name, e.g. create_users_table
   * @returns {Promise<string>} Path of the created file
   */
  async create(name, options = {}) {
    const fileName = `${migrationTimestamp()}_${name}.js`;
    const filePath = join(this.config.directory, fileName);

    await this.ensureDirectory();

    const isCreateTable = name.startsWith('create_') && name.endsWith('_table');
    const template = this.getMigrationTemplate(name, { isCreateTable, ...options });

    await writeFile(filePath, template);

    return filePath;
  }

  async ensureDirectory() {
    await mkdir(resolveDirectory(this.config.directory), { recursive: true });
  }

  getMigrationTemplate(name, options = {}) {
    const { isCreateTable } = options;
    const tableName = isCreateTable
      ? name.replace('create_', '').replace('_table', '')
      : 'table_name';

    if (isCreateTable) {
      return `/**
 * Migration: ${name}
 */

export async function up(schema) {
  await schema.createTable('${tableName}', (table) => {
    table.id();
    table.timestamps();
  });
}

export async function down(schema) {
  await schema.dropTable('${tableName}');
}
`;
    } else {
      return `/**
 * Migration: ${name}
 */

export async function up(schema) {
  // Add your migration logic here
}

export async function down(schema) {
  // Add your rollback logic here
}
`;
    }
  }

  async getNextBatchNumber() {
    const result = await this.db.query(`SELECT MAX(batch) as max_batch FROM ${this.config.tableName}`);
    const maxBatch = result && result.rows && result.rows[0] ? result.rows[0].max_batch : 0;
    return (maxBatch || 0) + 1;
  }

  /**
   * @param {number} count - Number of batches
   * @returns {Promise<number[]>} The most recent batch numbers, newest first
   */
  async getLastBatches(count) {
    const result = await this.db.query(
      `SELECT DISTINCT batch FROM ${this.config.tableName} ORDER BY batch DESC LIMIT ${assertBatchCount(count)}`
    );
    return result && result.rows ? result.rows.map(row => row.batch) : [];
  }

  /**
   * @param {number} batch - Batch number
   * @returns {Promise<string[]>} Migrations in the batch, most recently applied first
   */
  async getMigrationsInBatch(batch) {
    const result = await this.db.query(
      `SELECT migration FROM ${this.config.tableName} WHERE batch = ? ORDER BY id DESC`,
      [batch]
    );
    return result && result.rows ? result.rows.map(row => row.migration) : [];
  }

  async ensureMigrationsTable() {
    // Check if migrations table exists
    try {
      await this.db.query(`SELECT 1 FROM ${this.config.tableName} LIMIT 1`);
    } catch {
      await this.db.query(migrationsTableSQL(this.config.tableName, this.dialect));
    }
  }

  async loadAppliedMigrations() {
    const result = await this.db.query(`SELECT migration FROM ${this.config.tableName} ORDER BY id`);

    this.appliedMigrations.clear();
    if (result && result.rows) {
      result.rows.forEach(row => {
        this.appliedMigrations.add(row.migration);
      });
    }
  }

  /**
   * Migrations to run instead of the directory's files. Returns `config.migrations`
   * when it is an array, otherwise null (read the directory).
   *
   * @returns {Promise<Array|null>}
   */
  async loadMigrations() {
    return Array.isArray(this.config.migrations) ? this.config.migrations : null;
  }

  /**
   * Load `<14-digit timestamp>_<name>.js` files from the migrations directory.
   *
   * @throws {Error} If a migration file cannot be imported
   */
  async loadMigrationFiles() {
    let files;
    try {
      files = await readdir(resolveDirectory(this.config.directory));
    } catch (_error) {
      if (_error.code === 'ENOENT') {
        // Directory doesn't exist, initialize empty
        this.migrations = [];
        return;
      }
      throw _error;
    }

    const migrations = [];

    for (const file of [...files].sort()) {
      if (!file.endsWith('.js')) {
        continue;
      }

      if (!/^\d{14}_/.test(file)) {
        console.warn(`Failed to load migration ${file}: Invalid migration file name format`);
        continue;
      }

      const migrationName = file.replace(/\.js$/, '');
      const migration = await importMigration(this.config.directory, file);

      migrations.push({
        name: migrationName,
        file,
        up: migration.up || migration.default?.up,
        down: migration.down || migration.default?.down,
        applied: this.appliedMigrations.has(migrationName)
      });
    }

    this.migrations = migrations;
  }
}

export class SchemaBuilder {
  /**
   * @param {Object} db - Connection or transaction with query()
   * @param {Object} [options={}]
   * @param {'postgresql'|'mysql'|'sqlite'} [options.dialect] - DDL dialect
   */
  constructor(db, options = {}) {
    this.db = db;
    this.dialect = options.dialect;
  }

  async createTable(tableName, callback) {
    const table = new TableBuilder(tableName, { dialect: this.dialect });
    callback(table);

    const sql = table.toCreateSQL();
    await this.db.query(sql);
    return this;
  }

  async alterTable(tableName, callback) {
    const table = new TableBuilder(tableName, { dialect: this.dialect });
    callback(table);

    const statements = table.toAlterSQL();
    for (const sql of statements) {
      await this.db.query(sql);
    }
    return this;
  }

  async dropTable(tableName) {
    await this.db.query(`DROP TABLE IF EXISTS ${tableName}`);
    return this;
  }

  async raw(sql, params = []) {
    return await this.db.query(sql, params);
  }
}

export class TableBuilder {
  /**
   * @param {string} tableName - Table name
   * @param {Object} [options={}]
   * @param {'postgresql'|'mysql'|'sqlite'} [options.dialect] - DDL dialect
   */
  constructor(tableName, options = {}) {
    this.tableName = tableName;
    this.dialect = tableBuilderDialect(options);
    this.columns = [];
    this.alterations = [];
  }

  id(name = 'id') {
    const column = {
      name,
      type: 'INTEGER',
      primaryKey: true,
      autoIncrement: true
    };
    this.columns.push(column);
    return this;
  }

  string(name, length = 255) {
    const column = {
      name,
      type: `VARCHAR(${length})`,
      nullable: true
    };
    this.columns.push(column);
    return createColumnBuilder(column);
  }

  text(name) {
    const column = {
      name,
      type: 'TEXT',
      nullable: true
    };
    this.columns.push(column);
    return createColumnBuilder(column);
  }

  integer(name) {
    const column = {
      name,
      type: 'INTEGER',
      nullable: true
    };
    this.columns.push(column);
    return createColumnBuilder(column);
  }

  boolean(name) {
    const column = {
      name,
      type: 'BOOLEAN',
      nullable: true,
      default: false
    };
    this.columns.push(column);
    return createColumnBuilder(column);
  }

  datetime(name) {
    const column = {
      name,
      type: 'DATETIME',
      nullable: true
    };
    this.columns.push(column);
    return createColumnBuilder(column);
  }

  timestamps() {
    this.datetime('created_at');
    this.datetime('updated_at');
    return this;
  }

  addColumn(name, type) {
    this.alterations.push({
      type: 'ADD',
      name,
      columnType: type
    });
    return this;
  }

  dropColumn(name) {
    this.alterations.push({
      type: 'DROP',
      name
    });
    return this;
  }

  toCreateSQL() {
    if (this.columns.length === 0) {
      return `CREATE TABLE ${this.tableName} ();`;
    }
    return renderCreateTable(this.tableName, this.columns, this.dialect);
  }

  toAlterSQL() {
    if (this.alterations.length === 0) {
      return [`ALTER TABLE ${this.tableName};`];
    }
    return this.alterations.map(alteration => renderAlteration(this.tableName, alteration));
  }
}

// ============================================================================
// Factory API (@coherent.js/database)
// ============================================================================

/**
 * Create migration instance
 *
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [config={}] - Migration configuration
 * @param {string} [config.directory='./migrations'] - Migrations directory, relative to the working directory
 * @param {string} [config.tableName='coherent_migrations'] - Tracking table
 * @param {'postgresql'|'mysql'|'sqlite'} [config.dialect] - DDL dialect (defaults to `db.config.type`)
 * @param {boolean} [config.transactional=true] - Run each migration in a transaction
 * @returns {Object} Migration instance
 *
 * @example
 * const migration = createMigration(db, {
 *   directory: './migrations',
 *   tableName: 'coherent_migrations'
 * });
 *
 * await migration.run();
 */
export function createMigration(db, config = {}) {
  const migrationConfig = {
    directory: './migrations',
    tableName: 'coherent_migrations',
    ...config
  };
  assertIdentifier(migrationConfig.tableName, 'migrations table');

  const migrations = [];
  const appliedMigrations = new Set();

  // Helper functions
  async function ensureMigrationsTable() {
    const tableName = migrationConfig.tableName;

    try {
      await db.query(`SELECT 1 FROM ${tableName} LIMIT 1`);
    } catch {
      await db.query(migrationsTableSQL(tableName, resolveDialect(db, migrationConfig)));
    }
  }

  async function loadAppliedMigrations() {
    const result = await db.query(`SELECT migration FROM ${migrationConfig.tableName} ORDER BY id`);

    appliedMigrations.clear();
    if (result && result.rows) {
      result.rows.forEach(row => {
        appliedMigrations.add(row.migration);
      });
    }
  }

  async function loadMigrationFiles() {
    // Reload from scratch: status() followed by run() must not queue every migration twice
    migrations.length = 0;

    let files;
    try {
      files = await readdir(resolveDirectory(migrationConfig.directory));
    } catch (_error) {
      if (_error.code === 'ENOENT') {
        return;
      }
      throw _error;
    }

    const migrationFiles = files
      .filter(file => file.endsWith('.js'))
      .sort();

    for (const file of migrationFiles) {
      const migrationName = file.replace(/\.js$/, '');
      const migration = await importMigration(migrationConfig.directory, file);

      migrations.push({
        name: migrationName,
        file: join(migrationConfig.directory, file),
        up: migration.up || migration.default?.up,
        down: migration.down || migration.default?.down,
        applied: appliedMigrations.has(migrationName)
      });
    }
  }

  async function getNextBatchNumber() {
    const result = await db.query(
      `SELECT MAX(batch) as max_batch FROM ${migrationConfig.tableName}`
    );

    const maxBatch = result && result.rows && result.rows[0] ? result.rows[0].max_batch : 0;
    return (maxBatch || 0) + 1;
  }

  async function getLastBatches(count) {
    const result = await db.query(
      `SELECT DISTINCT batch FROM ${migrationConfig.tableName} ORDER BY batch DESC LIMIT ${assertBatchCount(count)}`
    );

    return result && result.rows ? result.rows.map(row => row.batch) : [];
  }

  async function getMigrationsInBatch(batch) {
    const result = await db.query(
      `SELECT migration FROM ${migrationConfig.tableName} WHERE batch = ? ORDER BY id DESC`,
      [batch]
    );

    return result && result.rows ? result.rows.map(row => row.migration) : [];
  }

  async function ensureDirectory(dirPath) {
    await mkdir(resolveDirectory(dirPath), { recursive: true });
  }

  function getMigrationTemplate(name, options) {
    const tableName = options.table || name.replace(/^create_/, '').replace(/_table$/, '');

    if (name.startsWith('create_')) {
      return `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

export async function up(schema) {
  await schema.createTable('${tableName}', (table) => {
    table.id();
    table.string('name').notNull();
    table.timestamps();
  });
}

export async function down(schema) {
  await schema.dropTable('${tableName}');
}
`;
    }

    return `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

export async function up(schema) {
  // Add your migration logic here
}

export async function down(schema) {
  // Add your rollback logic here
}
`;
  }

  return {
    /**
     * Initialize migration system
     */
    async initialize() {
      await ensureMigrationsTable();
      await loadAppliedMigrations();
      await loadMigrationFiles();
    },

    /**
     * Run pending migrations
     */
    async run(options = {}) {
      await this.initialize();

      const pendingMigrations = migrations.filter(m => !m.applied);

      if (pendingMigrations.length === 0) {
        return [];
      }

      const batch = await getNextBatchNumber();
      const dialect = resolveDialect(db, migrationConfig);
      const appliedMigrationsList = [];

      for (const migration of pendingMigrations) {
        try {
          console.log(`Running migration: ${migration.name}`);

          await inMigrationTransaction(db, migrationConfig, async (tx) => {
            if (typeof migration.up === 'function') {
              await migration.up(createSchemaBuilder(tx, { dialect }));
            }

            await tx.query(
              `INSERT INTO ${migrationConfig.tableName} (migration, batch) VALUES (?, ?)`,
              [migration.name, batch]
            );
          });

          appliedMigrationsList.push(migration.name);
          migration.applied = true;

          console.log(`✓ Migration ${migration.name} completed`);
        } catch (_error) {
          console.error(`✗ Migration ${migration.name} failed: ${_error.message}`);

          if (!options.continueOnError) {
            throw _error;
          }
        }
      }

      return appliedMigrationsList;
    },

    /**
     * Rollback migrations
     */
    async rollback(steps = 1) {
      await this.initialize();

      const batches = await getLastBatches(steps);
      if (batches.length === 0) {
        return [];
      }

      const dialect = resolveDialect(db, migrationConfig);
      const rolledBackMigrations = [];

      for (const batch of batches) {
        const batchMigrations = await getMigrationsInBatch(batch);

        for (const migrationName of batchMigrations) {
          const migration = migrations.find(m => m.name === migrationName);

          if (!migration || !migration.down) {
            console.warn(`Cannot rollback migration: ${migrationName}`);
            continue;
          }

          try {
            console.log(`Rolling back migration: ${migrationName}`);

            await inMigrationTransaction(db, migrationConfig, async (tx) => {
              await migration.down(createSchemaBuilder(tx, { dialect }));

              await tx.query(
                `DELETE FROM ${migrationConfig.tableName} WHERE migration = ?`,
                [migrationName]
              );
            });

            rolledBackMigrations.push(migrationName);
            migration.applied = false;

            console.log(`✓ Migration ${migrationName} rolled back`);
          } catch (_error) {
            console.error(`✗ Rollback ${migrationName} failed: ${_error.message}`);
            throw _error;
          }
        }
      }

      return rolledBackMigrations;
    },

    /**
     * Get migration status
     */
    async status() {
      await this.initialize();

      return migrations.map(migration => ({
        name: migration.name,
        applied: migration.applied,
        file: migration.file
      }));
    },

    /**
     * Create new migration file
     */
    async create(name, options = {}) {
      const fileName = `${migrationTimestamp()}_${name}.js`;
      const filePath = join(migrationConfig.directory, fileName);

      const template = getMigrationTemplate(name, options);

      await ensureDirectory(migrationConfig.directory);
      await writeFile(filePath, template);

      console.log(`Created migration: ${filePath}`);
      return filePath;
    }
  };
}

/**
 * Create schema builder instance
 *
 * @param {Object} db - Connection or transaction with query()
 * @param {Object} [options={}]
 * @param {'postgresql'|'mysql'|'sqlite'} [options.dialect] - DDL dialect
 */
export function createSchemaBuilder(db, options = {}) {
  return {
    async createTable(tableName, callback) {
      const table = createTableBuilder(tableName, options);
      callback(table);

      const sql = table.toCreateSQL();
      await db.query(sql);
    },

    async alterTable(tableName, callback) {
      const table = createTableBuilder(tableName, options);
      callback(table);

      const statements = table.toAlterSQL();
      for (const sql of statements) {
        await db.query(sql);
      }
    },

    async dropTable(tableName) {
      await db.query(`DROP TABLE IF EXISTS ${tableName}`);
    },

    async raw(sql, params = []) {
      return await db.query(sql, params);
    }
  };
}

/**
 * Create table builder instance
 *
 * @param {string} tableName - Table name
 * @param {Object} [options={}]
 * @param {'postgresql'|'mysql'|'sqlite'} [options.dialect] - DDL dialect
 */
export function createTableBuilder(tableName, options = {}) {
  const dialect = tableBuilderDialect(options);
  const columns = [];
  const alterations = [];

  function addColumn(column) {
    columns.push(column);
    return createColumnBuilder(column);
  }

  return {
    id(name = 'id') {
      columns.push({
        name,
        type: 'INTEGER',
        primaryKey: true,
        autoIncrement: true
      });
      return this;
    },

    string(name, length = 255) {
      return addColumn({ name, type: `VARCHAR(${length})`, nullable: true });
    },

    text(name) {
      return addColumn({ name, type: 'TEXT', nullable: true });
    },

    integer(name) {
      return addColumn({ name, type: 'INTEGER', nullable: true });
    },

    boolean(name) {
      return addColumn({ name, type: 'BOOLEAN', nullable: true, default: false });
    },

    datetime(name) {
      return addColumn({ name, type: 'DATETIME', nullable: true });
    },

    timestamps() {
      this.datetime('created_at').defaultRaw('CURRENT_TIMESTAMP');
      this.datetime('updated_at').defaultRaw('CURRENT_TIMESTAMP');
      return this;
    },

    addColumn(name, type) {
      alterations.push({
        type: 'ADD',
        name,
        columnType: type
      });
      return this;
    },

    dropColumn(name) {
      alterations.push({
        type: 'DROP',
        name
      });
      return this;
    },

    toCreateSQL() {
      return renderCreateTable(tableName, columns, dialect);
    },

    toAlterSQL() {
      return alterations.map(alteration => renderAlteration(tableName, alteration));
    }
  };
}
