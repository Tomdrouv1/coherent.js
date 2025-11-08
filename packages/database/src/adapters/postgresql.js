/**
 * PostgreSQL Database Adapter for Coherent.js
 * 
 * @fileoverview PostgreSQL adapter implementation with connection pooling and advanced features.
 */

/**
 * Create PostgreSQL adapter instance
 * 
 * @returns {Object} PostgreSQL adapter instance
 */
export function createPostgreSQLAdapter() {
  let pg = null;

  async function initializePostgreSQL() {
    if (!pg) {
      try {
        const pgModule = await import('pg');
        pg = pgModule.default || pgModule;
      } catch {
        throw new Error('pg package is required for PostgreSQL adapter. Install with: npm install pg');
      }
    }
  }

  function convertPlaceholders(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  function extractInsertId(result) {
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      return row.id || row.insertId || row.lastval || null;
    }
    return null;
  }

  return {
    /**
     * Create connection pool
     */
    async createPool(config) {
      await initializePostgreSQL();
      
      const poolConfig = {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        min: config.pool.min,
        max: config.pool.max,
        acquireTimeoutMillis: config.pool.acquireTimeoutMillis,
        createTimeoutMillis: config.pool.createTimeoutMillis,
        destroyTimeoutMillis: config.pool.destroyTimeoutMillis,
        idleTimeoutMillis: config.pool.idleTimeoutMillis,
        reapIntervalMillis: config.pool.reapIntervalMillis,
        createRetryIntervalMillis: config.pool.createRetryIntervalMillis,
        ssl: config.ssl || false
      };

      const pool = new pg.Pool(poolConfig);

      pool.on('_error', (err) => {
        console.error('PostgreSQL pool _error:', err);
      });

      return pool;
    },

    /**
     * Test database connection
     */
    async testConnection(pool) {
      const client = await pool.connect();
      
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    },

    /**
     * Execute database query
     */
    async query(pool, sql, params = [], options = {}) {
      const client = await pool.connect();
      
      try {
        const pgSql = convertPlaceholders(sql);
        const result = await client.query(pgSql, params);
        
        if (options.single) {
          return result.rows[0] || null;
        }
        
        return {
          rows: result.rows,
          rowCount: result.rowCount,
          affectedRows: result.rowCount,
          insertId: extractInsertId(result)
        };
        
      } finally {
        client.release();
      }
    },

    /**
     * Start database transaction
     */
    async transaction(pool, options = {}) {
      const client = await pool.connect();
      
      let beginSql = 'BEGIN';
      if (options.isolationLevel) {
        beginSql += ` ISOLATION LEVEL ${options.isolationLevel}`;
      }
      if (options.readOnly) {
        beginSql += ' READ ONLY';
      }
      
      await client.query(beginSql);

      const transaction = {
        client,
        pool,
        isCommitted: false,
        isRolledBack: false,

        query: async (sql, params, queryOptions) => {
          if (transaction.isCommitted || transaction.isRolledBack) {
            throw new Error('Cannot execute query on completed transaction');
          }
          
          const pgSql = convertPlaceholders(sql);
          const result = await client.query(pgSql, params);
          
          if (queryOptions && queryOptions.single) {
            return result.rows[0] || null;
          }
          
          return {
            rows: result.rows,
            rowCount: result.rowCount,
            affectedRows: result.rowCount,
            insertId: extractInsertId(result)
          };
        },

        commit: async () => {
          if (transaction.isCommitted || transaction.isRolledBack) {
            throw new Error('Transaction already completed');
          }

          try {
            await client.query('COMMIT');
            transaction.isCommitted = true;
          } finally {
            client.release();
          }
        },

        rollback: async () => {
          if (transaction.isCommitted || transaction.isRolledBack) {
            throw new Error('Transaction already completed');
          }

          try {
            await client.query('ROLLBACK');
            transaction.isRolledBack = true;
          } finally {
            client.release();
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
        total: pool.totalCount,
        available: pool.idleCount,
        acquired: pool.totalCount - pool.idleCount,
        waiting: pool.waitingCount
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
