/**
 * MySQL Database Adapter for Coherent.js
 * 
 * @fileoverview MySQL adapter implementation with connection pooling and transaction support.
 */

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
     */
    async transaction(pool) {
      const connection = await pool.getConnection();
      
      await connection.beginTransaction();

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
          if (transaction.isCommitted || transaction.isRolledBack) {
            throw new Error('Transaction already completed');
          }

          try {
            await connection.commit();
            transaction.isCommitted = true;
          } finally {
            connection.release();
          }
        },

        rollback: async () => {
          if (transaction.isCommitted || transaction.isRolledBack) {
            throw new Error('Transaction already completed');
          }

          try {
            await connection.rollback();
            transaction.isRolledBack = true;
          } finally {
            connection.release();
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
