/**
 * Database Utilities for Coherent.js
 * 
 * @fileoverview Utility functions for database operations, model registration, and migrations.
 */

import { DatabaseManager } from './connection-manager.js';
// Migration utilities are handled by the createMigration factory function

/**
 * Model registry for managing model classes
 */
const modelRegistry = new Map();

/**
 * Create database connection with configuration
 * 
 * @param {Object} config - Database configuration
 * @returns {Promise<DatabaseManager>} Database manager instance
 * 
 * @example
 * const db = await createConnection({
 *   type: 'postgresql',
 *   host: 'localhost',
 *   database: 'myapp',
 *   username: 'user',
 *   password: 'pass'
 * });
 */
export async function createConnection(config) {
  const db = new DatabaseManager(config);
  await db.connect();
  return db;
}

/**

  // Add custom methods if provided
  if (definition.methods) {
    Object.entries(definition.methods).forEach(([methodName, method]) => {
      DynamicModel.prototype[methodName] = method;
    });
  }

  // Add custom static methods if provided
  if (definition.staticMethods) {
    Object.entries(definition.staticMethods).forEach(([methodName, method]) => {
      DynamicModel[methodName] = method;
    });
  }

  // Register the model
  registerModel(name, DynamicModel);

  return DynamicModel;
}

/**
 * Register a model class
 * 
 * @param {string} name - Model name
 * @param {Function} ModelClass - Model class
 * 
 * @example
 * registerModel('User', UserModel);
 */
export function registerModel(name, ModelClass) {
  modelRegistry.set(name, ModelClass);
  
  // Make model globally available for relationships
  if (typeof global !== 'undefined') {
    global[name] = ModelClass;
  }
}

/**
 * Get registered model by name
 * 
 * @param {string} name - Model name
 * @returns {Function|null} Model class or null if not found
 * 
 * @example
 * const User = getModel('User');
 */
export function getModel(name) {
  return modelRegistry.get(name) || null;
}

/**
 * Get all registered models
 * 
 * @returns {Map<string, Function>} Map of model names to classes
 */
export function getAllModels() {
  return new Map(modelRegistry);
}

/**
 * Run database migrations
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [config={}] - Migration configuration
 * @returns {Promise<Array<string>>} Applied migration names
 * 
 * @example
 * const applied = await runMigrations(db, {
 *   directory: './migrations'
 * });
 */
export async function runMigrations(db, config = {}) {
  const { createMigration } = await import('./migration.js');
  const migration = createMigration(db, config);
  return await migration.run();
}

/**
 * Rollback database migrations
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {number} [steps=1] - Number of batches to rollback
 * @param {Object} [config={}] - Migration configuration
 * @returns {Promise<Array<string>>} Rolled back migration names
 * 
 * @example
 * const rolledBack = await rollbackMigrations(db, 2);
 */
export async function rollbackMigrations(db, steps = 1, config = {}) {
  const { createMigration } = await import('./migration.js');
  const migration = createMigration(db, config);
  return await migration.rollback(steps);
}

/**
 * Create a new migration file
 * 
 * @param {string} name - Migration name
 * @param {Object} [config={}] - Migration configuration
 * @returns {Promise<string>} Created file path
 * 
 * @example
 * const filePath = await createMigration('create_users_table');
 */
export async function createMigrationFile(name, config = {}) {
  const { createMigration } = await import('./migration.js');
  const migration = createMigration(null, config);
  return await migration.create(name);
}

/**
 * Seed database with initial data
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Function|Array<Function>} seeders - Seeder functions
 * @returns {Promise<void>}
 * 
 * @example
 * await seedDatabase(db, [
 *   async (db) => {
 *     await User.create({ name: 'Admin', email: 'admin@example.com' });
 *   }
 * ]);
 */
export async function seedDatabase(db, seeders) {
  const seederArray = Array.isArray(seeders) ? seeders : [seeders];
  
  for (const seeder of seederArray) {
    if (typeof seeder === 'function') {
      await seeder(db);
    }
  }
}

/**
 * Validate database configuration
 * 
 * @param {Object} config - Database configuration
 * @returns {Object} Validation result
 * 
 * @example
 * const validation = validateConfig(config);
 * if (!validation.valid) {
 *   console.error('Config errors:', validation.errors);
 * }
 */
export function validateConfig(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }

  if (!config.type) {
    errors.push('Database type is required');
  } else {
    const supportedTypes = ['postgresql', 'mysql', 'sqlite', 'mongodb'];
    if (!supportedTypes.includes(config.type)) {
      errors.push(`Unsupported database type: ${config.type}`);
    }
  }

  if (!config.database) {
    errors.push('Database name is required');
  }

  if (config.type !== 'sqlite') {
    if (!config.host) {
      errors.push('Host is required for non-SQLite databases');
    }
  }

  if (config.pool) {
    if (config.pool.min && config.pool.max && config.pool.min > config.pool.max) {
      errors.push('Pool min size cannot be greater than max size');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create database backup
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [options={}] - Backup options
 * @returns {Promise<string>} Backup file path or data
 * 
 * @example
 * const backupPath = await createBackup(db, {
 *   format: 'sql',
 *   outputPath: './backups'
 * });
 */
export async function createBackup(db, options = {}) {
  const backupConfig = {
    format: 'sql',
    outputPath: './backups',
    timestamp: true,
    ...options
  };

  const timestamp = backupConfig.timestamp ? new Date().toISOString().replace(/[:.]/g, '-') : '';
  const fileName = `backup${timestamp ? `_${  timestamp}` : ''}.${backupConfig.format}`;
  const filePath = `${backupConfig.outputPath}/${fileName}`;

  // This would be adapter-specific implementation
  // For now, return a placeholder
  console.log(`Backup would be created at: ${filePath}`);
  return filePath;
}

/**
 * Restore database from backup
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {string} backupPath - Path to backup file
 * @param {Object} [options={}] - Restore options
 * @returns {Promise<void>}
 * 
 * @example
 * await restoreBackup(db, './backups/backup_2023-12-01.sql');
 */
export async function restoreBackup(db, backupPath) {
  // This would be adapter-specific implementation
  console.log(`Restore would be performed from: ${backupPath}`);
}

/**
 * Generate database schema documentation
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [options={}] - Documentation options
 * @returns {Promise<Object>} Schema documentation
 * 
 * @example
 * const docs = await generateSchemaDocs(db, {
 *   includeIndexes: true,
 *   includeRelationships: true
 * });
 */
export async function generateSchemaDocs(db) {
  const schema = {
    database: db.config.database,
    type: db.config.type,
    tables: [],
    models: []
  };

  // Add registered models to documentation
  for (const [name, ModelClass] of modelRegistry) {
    schema.models.push({
      name,
      tableName: ModelClass.tableName,
      primaryKey: ModelClass.primaryKey,
      fillable: ModelClass.fillable,
      relationships: ModelClass.relationships,
      validationRules: ModelClass.validationRules
    });
  }

  return schema;
}

/**
 * Database health check utility
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @returns {Promise<Object>} Health check result
 * 
 * @example
 * const health = await checkDatabaseHealth(db);
 * console.log(`Database is ${health.status}`);
 */
export async function checkDatabaseHealth(db) {
  const startTime = Date.now();
  
  try {
    await db.query('SELECT 1');
    
    const responseTime = Date.now() - startTime;
    const stats = db.getStats();
    
    return {
      status: 'healthy',
      responseTime,
      connected: db.isConnected,
      stats
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connected: db.isConnected,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Batch operation utility
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Array} operations - Array of operations to execute
 * @param {Object} [options={}] - Batch options
 * @returns {Promise<Array>} Results array
 * 
 * @example
 * const results = await batchOperations(db, [
 *   { sql: 'INSERT INTO users (name) VALUES (?)', params: ['John'] },
 *   { sql: 'INSERT INTO users (name) VALUES (?)', params: ['Jane'] }
 * ]);
 */
export async function batchOperations(db, operations, options = {}) {
  const config = {
    useTransaction: true,
    continueOnError: false,
    ...options
  };

  const results = [];
  
  if (config.useTransaction) {
    const tx = await db.transaction();
    
    try {
      for (const operation of operations) {
        try {
          const result = await tx.query(operation.sql, operation.params);
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error: error.message });
          
          if (!config.continueOnError) {
            throw error;
          }
        }
      }
      
      await tx.commit();
      
    } catch (error) {
      await tx.rollback();
      throw error;
    }
    
  } else {
    for (const operation of operations) {
      try {
        const result = await db.query(operation.sql, operation.params);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
        
        if (!config.continueOnError) {
          throw error;
        }
      }
    }
  }
  
  return results;
}
