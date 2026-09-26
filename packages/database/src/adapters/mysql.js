/**
 * MySQL Database Adapter for Coherent.js
 * 
 * @fileoverview MySQL adapter implementation with connection pooling and transaction support.
 */

import { normalizeIsolationLevel } from './isolation-level.js';

/**
 * Create MySQL adapter instance
 * 
 * @returns {Object} MySQL adapter instance
 */
export function createMySQLAdapter() {
  let mysql = null;

  async function initializeMySQL() {
    if (!mysql) {
      try {
        const mysqlModule = await import('mysql2/promise');
        mysql = mysqlModule.default || mysqlModule;
      } catch {
        throw new Error('mysql2 package is required for MySQL adapter. Install with: npm install mysql2');
      }
    }
  }

  return {
    /**
     * Create connection pool
     */
    async createPool(config) {
      await initializeMySQL();
      
      const poolConfig = {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        connectionLimit: config.pool.max,
        acquireTimeout: config.pool.acquireTimeoutMillis,
        timeout: config.pool.createTimeoutMillis,
        reconnect: true,
        charset: 'utf8mb4',
        timezone: 'Z'
      };

      const pool = mysql.createPool(poolConfig);
      return pool;
    },

    /**
     * Test database connection
     */
    async testConnection(pool) {
      const connection = await pool.getConnection();
      
      try {
        await connection.query('SELECT 1');
      } finally {
        connection.release();
      }
    },

    /**
     * Execute database query
     */
    async query(pool, sql, params = [], options = {}) {
      const connection = await pool.getConnection();
      
      try {
        const [rows] = await connection.execute(sql, params);
        
        if (options.single) {
          return Array.isArray(rows) ? rows[0] || null : rows;
        }
        
        if (Array.isArray(rows)) {
          return {
            rows,
            rowCount: rows.length,
            affectedRows: rows.affectedRows || rows.length,
            insertId: rows.insertId || null
          };
        } else {
          return {
            rows: [],
            rowCount: rows.affectedRows || 0,
            affectedRows: rows.affectedRows || 0,
            insertId: rows.insertId || null
          };
        }
        
      } finally {
        connection.release();
      }
    },

    /**
     * Start database transaction
     *
     * @param {Object} pool - mysql2 pool
     * @param {Object} [options={}]
     * @param {string} [options.isolationLevel] - READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ or SERIALIZABLE
     * @param {boolean} [options.readOnly] - Start a READ ONLY transaction
     */
    async transaction(pool, options = {}) {
      // Validate before taking a connection, so a bad option cannot leak one
      const isolationLevel = normalizeIsolationLevel(options.isolationLevel);

      const connection = await pool.getConnection();

      let released = false;
      const release = () => {
        if (!released) {
          released = true;
          connection.release();
        }
      };

      try {
        if (isolationLevel) {
          // Applies to the next transaction started on this connection only
          await connection.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
        }
        if (options.readOnly) {
          await connection.query('START TRANSACTION READ ONLY');
        } else {
          await connection.beginTransaction();
        }
      } catch (_error) {
        release();
        throw _error;
      }

      const assertActive = () => {
        if (transaction.isCommitted || transaction.isRolledBack) {
          throw new Error('Transaction already completed');
        }
      };

      const transaction = {
        connection,
        pool,
        isCommitted: false,
        isRolledBack: false,

        query: async (sql, params, queryOptions) => {
          if (transaction.isCommitted || transaction.isRolledBack) {
            throw new Error('Cannot execute query on completed transaction');
          }

          const [rows] = await connection.execute(sql, params);

          if (queryOptions && queryOptions.single) {
            return Array.isArray(rows) ? rows[0] || null : rows;
          }

          if (Array.isArray(rows)) {
            return {
              rows,
              rowCount: rows.length,
              affectedRows: rows.affectedRows || rows.length,
              insertId: rows.insertId || null
            };
          } else {
            return {
              rows: [],
              rowCount: rows.affectedRows || 0,
              affectedRows: rows.affectedRows || 0,
              insertId: rows.insertId || null
            };
          }
        },

        commit: async () => {
          assertActive();

          try {
            await connection.commit();
            transaction.isCommitted = true;
          } catch (_error) {
            transaction.isRolledBack = true;
            await connection.rollback().catch(() => {});
            throw _error;
          } finally {
            release();
          }
        },

        rollback: async () => {
          assertActive();
          transaction.isRolledBack = true;

          try {
            await connection.rollback();
          } finally {
            release();
          }
        }
      };

      return transaction;
    },

    /**
     * Get pool statistics
     */
    getPoolStats(pool) {
      return {
        total: pool.config.connectionLimit,
        available: pool._freeConnections ? pool._freeConnections.length : 0,
        acquired: pool._allConnections ? pool._allConnections.length - (pool._freeConnections ? pool._freeConnections.length : 0) : 0,
        waiting: pool._connectionQueue ? pool._connectionQueue.length : 0
      };
    },

    /**
     * Close connection pool
     */
    async closePool(pool) {
      await pool.end();
    }
  };
}
