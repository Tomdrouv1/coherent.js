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
export { createQuery, executeQuery, QueryBuilder } from './query-builder.js';
export { createModel } from './model.js';
export { createMigration } from './migration.js';
export { withDatabase } from './middleware.js';

// Database adapters
export { createPostgreSQLAdapter as PostgreSQLAdapter } from './adapters/postgresql.js';
export { createMySQLAdapter as MySQLAdapter } from './adapters/mysql.js';
export { createSQLiteAdapter as SQLiteAdapter } from './adapters/sqlite.js';
export { createMongoDBAdapter as MongoDBAdapter } from './adapters/mongodb.js';

// Utilities
export { createConnection, runMigrations } from './utils.js';

/**
 * Default database configuration
 */
export const DEFAULT_DB_CONFIG = {
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  logging: false,
  entities: [],
  migrations: [],
  subscribers: []
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
  const mergedConfig = { ...DEFAULT_DB_CONFIG, ...config };
  const dbManager = new DatabaseManager(mergedConfig);
  
  // Auto-connect if autoConnect is not explicitly set to false
  if (mergedConfig.autoConnect !== false) {
    dbManager.connect().catch(console.error);
  }
  
  return dbManager;
}
