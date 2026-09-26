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
      } catch (_error) {
        reject(new Error(`Failed to connect to SQLite database: ${_error.message}`));
      }
    });
  }

  /**
   * Whether a statement produces rows (and must go through `db.all`) rather than a
   * change count (`db.run`, which reports `lastID` / `changes`).
   *
   * @private
   * @param {string} sql - SQL statement
   * @returns {boolean}
   */
  function returnsRows(sql) {
    return /^\s*(SELECT|PRAGMA|WITH|EXPLAIN|VALUES)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
  }

  /**
   * Execute a SQL query
   *
   * Row-returning statements resolve to `{ rows, rowCount }`. Other statements resolve
   * to `{ rows: [], rowCount, affectedRows, insertId }`, where `affectedRows` is the
   * number of changed rows and `insertId` the rowid of an INSERT (null otherwise).
   *
   * @param {string} sql - SQL query string
   * @param {Array} [params=[]] - Query parameters
   * @returns {Promise<{rows: Array<Object>, rowCount: number, affectedRows?: number, insertId?: number|null}>} Query result
   */
  function query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!db) {
        return reject(new Error('Database connection not established. Call connect() first.'));
      }

      if (returnsRows(sql)) {
        db.all(sql, params, (err, rows) => {
          if (err) {
            return reject(new Error(`SQLite query error: ${err.message}`));
          }
          resolve({ rows, rowCount: rows.length });
        });
        return;
      }

      db.run(sql, params, function(err) {
        if (err) {
          return reject(new Error(`SQLite query error: ${err.message}`));
        }
        resolve({
          rows: [],
          rowCount: this.changes,
          affectedRows: this.changes,
          insertId: /^\s*(INSERT|REPLACE)\b/i.test(sql) ? this.lastID : null
        });
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
   * Start a transaction on the connection (the DatabaseManager transaction contract)
   *
   * SQLite has a single connection here: a second transaction started before the first
   * one finishes fails with "cannot start a transaction within a transaction".
   *
   * @param {Object} [_pool] - Unused; the adapter instance is its own pool
   * @param {Object} [options={}] - Transaction options
   * @param {'DEFERRED'|'IMMEDIATE'|'EXCLUSIVE'} [options.mode] - SQLite locking mode
   * @returns {Promise<Object>} Transaction with query, commit and rollback
   */
  async function transaction(_pool, options = {}) {
    const modes = ['DEFERRED', 'IMMEDIATE', 'EXCLUSIVE'];
    const mode = options.mode === undefined ? null : String(options.mode).toUpperCase();
    if (mode !== null && !modes.includes(mode)) {
      throw new Error(`Invalid SQLite transaction mode: ${options.mode}. Use one of ${modes.join(', ')}`);
    }

    await run(mode ? `BEGIN ${mode} TRANSACTION` : 'BEGIN TRANSACTION', 'begin transaction');

    const tx = {
      isCommitted: false,
      isRolledBack: false,

      async query(sql, params) {
        if (tx.isCommitted || tx.isRolledBack) {
          throw new Error('Cannot execute query on completed transaction');
        }
        return query(sql, params);
      },

      async commit() {
        if (tx.isCommitted || tx.isRolledBack) {
          throw new Error('Transaction already completed');
        }
        try {
          await run('COMMIT', 'commit transaction');
          tx.isCommitted = true;
        } catch (commitError) {
          // Leave the connection usable: a failed COMMIT keeps the transaction open.
          await run('ROLLBACK', 'rollback transaction').catch(() => {});
          tx.isRolledBack = true;
          throw commitError;
        }
      },

      async rollback() {
        if (tx.isCommitted || tx.isRolledBack) {
          throw new Error('Transaction already completed');
        }
        tx.isRolledBack = true;
        await run('ROLLBACK', 'rollback transaction');
      }
    };

    return tx;
  }

  /**
   * Run a control statement (BEGIN / COMMIT / ROLLBACK)
   *
   * @private
   */
  function run(sql, action) {
    return new Promise((resolve, reject) => {
      if (!db) {
        return reject(new Error('Database connection not established. Call connect() first.'));
      }
      db.run(sql, (err) => {
        if (err) {
          return reject(new Error(`Failed to ${action}: ${err.message}`));
        }
        resolve();
      });
    });
  }

  /**
   * Connection statistics (the DatabaseManager getStats contract)
   *
   * @returns {{total: number, available: number, acquired: number, waiting: number}}
   */
  function getPoolStats() {
    const open = db ? 1 : 0;
    return { total: open, available: open, acquired: 0, waiting: 0 };
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
    transaction,
    getPoolStats,
    disconnect,
    getConnection,
    ping,
    escape
  };

  return instance;
}
