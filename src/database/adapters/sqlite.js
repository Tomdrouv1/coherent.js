/**
 * SQLite Database Adapter for Coherent.js
 * 
 * @fileoverview SQLite adapter implementation with connection pooling and transaction support.
 */

/**
 * SQLite Database Adapter
 * 
 * @class SQLiteAdapter
 * @description Provides SQLite-specific database operations with connection pooling.
 */
export class SQLiteAdapter {
  constructor() {
    this.sqlite3 = null;
  }

  /**
   * Initialize SQLite module
   * 
   * @private
   * @returns {Promise<void>}
   */
  async initializeSQLite() {
    if (!this.sqlite3) {
      try {
        // Try to import sqlite3 (peer dependency)
        const sqlite3Module = await import('sqlite3');
        this.sqlite3 = sqlite3Module.default || sqlite3Module;
      } catch {
        throw new Error('sqlite3 package is required for SQLite adapter. Install with: npm install sqlite3');
      }
    }
  }

  /**
   * Create connection pool
   * 
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Connection pool
   */
  async createPool(config) {
    await this.initializeSQLite();
    
    const pool = {
      connections: [],
      available: [],
      config,
      stats: {
        created: 0,
        acquired: 0,
        released: 0,
        destroyed: 0
      }
    };

    // Create initial connections
    for (let i = 0; i < config.pool.min; i++) {
      const connection = await this.createConnection(config);
      pool.connections.push(connection);
      pool.available.push(connection);
      pool.stats.created++;
    }

    // Add pool methods
    pool.acquire = async (timeout = 30000) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Connection acquire timeout'));
        }, timeout);

        const tryAcquire = () => {
          if (pool.available.length > 0) {
            clearTimeout(timeoutId);
            const connection = pool.available.shift();
            pool.stats.acquired++;
            resolve(connection);
            return;
          }

          // Create new connection if under max limit
          if (pool.connections.length < config.pool.max) {
            this.createConnection(config)
              .then(connection => {
                clearTimeout(timeoutId);
                pool.connections.push(connection);
                pool.stats.created++;
                pool.stats.acquired++;
                resolve(connection);
              })
              .catch(reject);
            return;
          }

          // Wait for connection to become available
          setTimeout(tryAcquire, 10);
        };

        tryAcquire();
      });
    };

    pool.release = (connection) => {
      if (pool.connections.includes(connection)) {
        pool.available.push(connection);
        pool.stats.released++;
      }
    };

    pool.destroy = async () => {
      for (const connection of pool.connections) {
        await this.closeConnection(connection);
        pool.stats.destroyed++;
      }
      pool.connections = [];
      pool.available = [];
    };

    return pool;
  }

  /**
   * Create single database connection
   * 
   * @private
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Database connection
   */
  async createConnection(config) {
    return new Promise((resolve, reject) => {
      const db = new this.sqlite3.Database(config.database, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to SQLite database: ${err.message}`));
          return;
        }

        // Configure connection
        db.configure('busyTimeout', 30000);
        
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
        
        // Set journal mode for better concurrency
        db.run('PRAGMA journal_mode = WAL');

        resolve({
          db,
          inTransaction: false,
          transactionLevel: 0
        });
      });
    });
  }

  /**
   * Close database connection
   * 
   * @private
   * @param {Object} connection - Database connection
   * @returns {Promise<void>}
   */
  async closeConnection(connection) {
    return new Promise((resolve, reject) => {
      connection.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Test database connection
   * 
   * @param {Object} pool - Connection pool
   * @returns {Promise<void>}
   */
  async testConnection(pool) {
    const connection = await pool.acquire();
    
    try {
      await this.query(connection, 'SELECT 1');
    } finally {
      pool.release(connection);
    }
  }

  /**
   * Execute database query
   * 
   * @param {Object} connectionOrPool - Database connection or pool
   * @param {string} sql - SQL query
   * @param {Array} [params=[]] - Query parameters
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Object>} Query result
   */
  async query(connectionOrPool, sql, params = [], options = {}) {
    let connection;
    let shouldRelease = false;

    // Handle both direct connection and pool
    if (connectionOrPool.acquire) {
      // It's a pool
      connection = await connectionOrPool.acquire();
      shouldRelease = true;
    } else {
      // It's a direct connection
      connection = connectionOrPool;
    }

    try {
      return await this.executeQuery(connection, sql, params, options);
    } finally {
      if (shouldRelease && connectionOrPool.release) {
        connectionOrPool.release(connection);
      }
    }
  }

  /**
   * Execute query on connection
   * 
   * @private
   * @param {Object} connection - Database connection
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query result
   */
  async executeQuery(connection, sql, params, options) {
    return new Promise((resolve, reject) => {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
      
      if (isSelect) {
        if (options.single) {
          connection.db.get(sql, params, (err, row) => {
            if (err) {
              reject(new Error(`SQLite query error: ${err.message}`));
            } else {
              resolve(row || null);
            }
          });
        } else {
          connection.db.all(sql, params, (err, rows) => {
            if (err) {
              reject(new Error(`SQLite query error: ${err.message}`));
            } else {
              resolve({
                rows: rows || [],
                rowCount: rows ? rows.length : 0
              });
            }
          });
        }
      } else {
        connection.db.run(sql, params, function(err) {
          if (err) {
            reject(new Error(`SQLite query error: ${err.message}`));
          } else {
            resolve({
              affectedRows: this.changes,
              insertId: isInsert ? this.lastID : null,
              rowCount: this.changes
            });
          }
        });
      }
    });
  }

  /**
   * Start database transaction
   * 
   * @param {Object} pool - Connection pool
   * @param {Object} [options={}] - Transaction options
   * @returns {Promise<Object>} Transaction object
   */
  async transaction(pool) {
    const connection = await pool.acquire();
    
    // Begin transaction
    await this.executeQuery(connection, 'BEGIN TRANSACTION', []);
    connection.inTransaction = true;
    connection.transactionLevel++;

    const transaction = {
      connection,
      pool,
      isCommitted: false,
      isRolledBack: false,

      query: async (sql, params, queryOptions) => {
        if (transaction.isCommitted || transaction.isRolledBack) {
          throw new Error('Cannot execute query on completed transaction');
        }
        return await this.executeQuery(connection, sql, params, queryOptions);
      },

      commit: async () => {
        if (transaction.isCommitted || transaction.isRolledBack) {
          throw new Error('Transaction already completed');
        }

        try {
          await this.executeQuery(connection, 'COMMIT', []);
          transaction.isCommitted = true;
          connection.inTransaction = false;
          connection.transactionLevel--;
        } finally {
          pool.release(connection);
        }
      },

      rollback: async () => {
        if (transaction.isCommitted || transaction.isRolledBack) {
          throw new Error('Transaction already completed');
        }

        try {
          await this.executeQuery(connection, 'ROLLBACK', []);
          transaction.isRolledBack = true;
          connection.inTransaction = false;
          connection.transactionLevel--;
        } finally {
          pool.release(connection);
        }
      }
    };

    return transaction;
  }

  /**
   * Get pool statistics
   * 
   * @param {Object} pool - Connection pool
   * @returns {Object} Pool statistics
   */
  getPoolStats(pool) {
    return {
      total: pool.connections.length,
      available: pool.available.length,
      acquired: pool.connections.length - pool.available.length,
      ...pool.stats
    };
  }

  /**
   * Close connection pool
   * 
   * @param {Object} pool - Connection pool
   * @returns {Promise<void>}
   */
  async closePool(pool) {
    await pool.destroy();
  }
}
