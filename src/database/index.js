/**
 * Database Integration Layer for Coherent.js
 * 
 * @fileoverview Provides database connectivity, query building, and ORM functionality
 * with support for multiple database engines (PostgreSQL, MySQL, SQLite, MongoDB).
 * 
 * @author Coherent.js Team
 * @version 1.0.0
 */

export { DatabaseManager } from './connection-manager.js';
export { QueryBuilder } from './query-builder.js';
export { Model } from './model.js';
export { Migration } from './migration.js';
export { withDatabase } from './middleware.js';

// Database adapters
export { PostgreSQLAdapter } from './adapters/postgresql.js';
export { MySQLAdapter } from './adapters/mysql.js';
export { SQLiteAdapter } from './adapters/sqlite.js';
export { MongoDBAdapter } from './adapters/mongodb.js';

// Utilities
export { createConnection, createModel, runMigrations } from './utils.js';

/**
 * Default database configuration
 */
export const DEFAULT_DB_CONFIG = {
  type: 'sqlite',
  host: 'localhost',
  port: null,
  database: 'coherent_app',
  username: null,
  password: null,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  },
  migrations: {
    directory: './migrations',
    tableName: 'coherent_migrations'
  },
  debug: false
};

/**
 * Quick setup function for common database configurations
 * 
 * @param {Object} config - Database configuration
 * @returns {DatabaseManager} Configured database manager
 * 
 * @example
 * import { setupDatabase } from '@coherent/database';
 * 
 * const db = setupDatabase({
 *   type: 'postgresql',
 *   host: 'localhost',
 *   database: 'myapp',
 *   username: 'user',
 *   password: 'pass'
 * });
 */
export function setupDatabase(config = {}) {
  const finalConfig = { ...DEFAULT_DB_CONFIG, ...config };
  return new DatabaseManager(finalConfig);
}
