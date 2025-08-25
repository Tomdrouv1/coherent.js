/**
 * SQLite Database Adapter for Coherent.js
 * 
 * @fileoverview SQLite adapter implementation with connection pooling and transaction support.
 */

/**
 * Create a new SQLite adapter instance
 * 
 * @returns {Object} SQLite adapter instance with database operations
 */
export function createSQLiteAdapter() {
  let sqlite3 = null;
  let db = null;

  /**
   * Initialize SQLite module
   * 
   * @private
   * @returns {Promise<void>}
   */
  async function initializeSQLite() {
    if (!sqlite3) {
      try {
        // Try to import sqlite3 (peer dependency)
        const sqlite3Module = await import('sqlite3');
        sqlite3 = sqlite3Module.default || sqlite3Module;
      } catch {
        throw new Error('Failed to load sqlite3 module. Make sure to install it: npm install sqlite3');
      }
    }
  }

  /**
   * Connect to the database
   * 
   * @param {Object} config - Database configuration
   * @param {string} config.database - Path to the SQLite database file
   * @param {boolean} [config.readonly=false] - Open the database in read-only mode
   * @returns {Promise<Object>} The database adapter instance
   */
  async function connect(config) {
    await initializeSQLite();
    
    return new Promise((resolve, reject) => {
      try {
        db = new sqlite3.Database(
          config.database,
          config.readonly ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
          (err) => {
            if (err) {
              return reject(new Error(`Failed to connect to SQLite database: ${err.message}`));
            }
            
            // Enable foreign keys by default
            db.run('PRAGMA foreign_keys = ON');
            
            // Enable WAL mode for better concurrency
            db.run('PRAGMA journal_mode = WAL');
            
            // Set busy timeout to handle concurrent write operations
            db.run('PRAGMA busy_timeout = 5000');
            
            resolve(instance);
          }
        );
      } catch (error) {
        reject(new Error(`Failed to connect to SQLite database: ${error.message}`));
      }
    });
  }

  /**
   * Execute a SQL query
   * 
   * @param {string} sql - SQL query string
   * @param {Array} [params=[]] - Query parameters
   * @returns {Promise<{rows: Array<Object>}>} Query result
   */
  function query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!db) {
        return reject(new Error('Database connection not established. Call connect() first.'));
      }
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          return reject(new Error(`SQLite query error: ${err.message}`));
        }
        resolve({ rows });
      });
    });
  }

  /**
   * Execute a SQL statement
   * 
   * @param {string} sql - SQL statement
   * @param {Array} [params=[]] - Statement parameters
   * @returns {Promise<{affectedRows: number, insertId: number}>} Execution result
   */
  function execute(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!db) {
        return reject(new Error('Database connection not established. Call connect() first.'));
      }
      
      db.run(sql, params, function(err) {
        if (err) {
          return reject(new Error(`SQLite execute error: ${err.message}`));
        }
        
        resolve({
          affectedRows: this.changes,
          insertId: this.lastID
        });
      });
    });
  }

  /**
   * Begin a transaction
   * 
   * @returns {Promise<void>}
   */
  function beginTransaction() {
    return new Promise((resolve, reject) => {
      if (!db) {
        return reject(new Error('Database connection not established. Call connect() first.'));
      }
      
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          return reject(new Error(`Failed to begin transaction: ${err.message}`));
        }
        resolve();
      });
    });
  }

  /**
   * Commit a transaction
   * 
   * @returns {Promise<void>}
   */
  function commit() {
    return new Promise((resolve, reject) => {
      if (!db) {
        return reject(new Error('Database connection not established. Call connect() first.'));
      }
      
      db.run('COMMIT', (err) => {
        if (err) {
          return reject(new Error(`Failed to commit transaction: ${err.message}`));
        }
        resolve();
      });
    });
  }

  /**
   * Rollback a transaction
   * 
   * @returns {Promise<void>}
   */
  function rollback() {
    return new Promise((resolve, reject) => {
      if (!db) {
        return reject(new Error('Database connection not established. Call connect() first.'));
      }
      
      db.run('ROLLBACK', (err) => {
        if (err) {
          return reject(new Error(`Failed to rollback transaction: ${err.message}`));
        }
        resolve();
      });
    });
  }

  /**
   * Disconnect from the database
   * 
   * @returns {Promise<void>}
   */
  function disconnect() {
    return new Promise((resolve, reject) => {
      if (!db) {
        return resolve();
      }
      
      db.close((err) => {
        if (err) {
          return reject(new Error(`Failed to close database connection: ${err.message}`));
        }
        db = null;
        resolve();
      });
    });
  }

  /**
   * Get the underlying database connection
   * 
   * @returns {Object} The database connection
   */
  function getConnection() {
    if (!db) {
      throw new Error('Database connection not established. Call connect() first.');
    }
    return db;
  }

  /**
   * Ping the database to check if connection is alive
   * 
   * @returns {Promise<boolean>} True if connection is alive
   */
  async function ping() {
    try {
      await query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Escape a value for SQL queries
   * 
   * @param {*} value - Value to escape
   * @returns {string} Escaped value
   */
  function escape(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    
    if (typeof value === 'number') {
      return String(value);
    }
    
    // Escape single quotes by doubling them
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  // Public API
  const instance = {
    connect,
    query,
    execute,
    beginTransaction,
    commit,
    rollback,
    disconnect,
    getConnection,
    ping,
    escape,
    
    // Alias for backward compatibility
    run: execute
  };

  return instance;
}

// For backward compatibility
export const SQLiteAdapter = { create: createSQLiteAdapter };
