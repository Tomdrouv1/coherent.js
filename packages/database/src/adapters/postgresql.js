/**
 * PostgreSQL Database Adapter for Coherent.js
 * 
 * @fileoverview PostgreSQL adapter implementation with connection pooling and advanced features.
 */

import { normalizeIsolationLevel } from './isolation-level.js';

/**
 * Convert `?` placeholders to PostgreSQL's numbered `$1, $2, ...` parameters.
 *
 * Left untouched: `?` inside single-quoted strings (including `E'...'` escape strings),
 * double-quoted identifiers, dollar-quoted strings and comments, and the JSONB operators
 * `?|` and `?&`. The JSONB key-exists operator `?` cannot be told apart from a
 * placeholder: write it as `??` (sent as a single `?`) or use `jsonb_exists()`.
 *
 * @param {string} sql - SQL with `?` placeholders
 * @returns {string} SQL with numbered parameters
 */
function convertPlaceholders(sql) {
  let output = '';
  let index = 1;
  let i = 0;

  const copyUntil = (end) => {
    output += sql.slice(i, end);
    i = end;
  };

  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === '\'' || char === '"') {
      // E'...' strings treat backslash as an escape character
      const escapes = char === '\'' && /[Ee]/.test(sql[i - 1] || '') && !/[A-Za-z0-9_]/.test(sql[i - 2] || '');
      let j = i + 1;
      while (j < sql.length) {
        if (escapes && sql[j] === '\\') {
          j += 2;
        } else if (sql[j] === char && sql[j + 1] === char) {
          j += 2;
        } else if (sql[j] === char) {
          break;
        } else {
          j++;
        }
      }
      copyUntil(Math.min(j + 1, sql.length));
      continue;
    }

    if (char === '-' && next === '-') {
      const end = sql.indexOf('\n', i);
      copyUntil(end === -1 ? sql.length : end);
      continue;
    }

    if (char === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      copyUntil(end === -1 ? sql.length : end + 2);
      continue;
    }

    if (char === '$') {
      const tag = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (tag) {
        const end = sql.indexOf(tag[0], i + tag[0].length);
        copyUntil(end === -1 ? sql.length : end + tag[0].length);
        continue;
      }
    }

    if (char === '?') {
      if (next === '?') {
        output += '?';
        i += 2;
        continue;
      }
      if ((next === '|' && sql[i + 2] !== '|') || next === '&') {
        output += `?${next}`;
        i += 2;
        continue;
      }
      output += `$${index++}`;
      i++;
      continue;
    }

    output += char;
    i++;
  }

  return output;
}

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

      pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err);
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
     *
     * @param {Object} pool - pg Pool
     * @param {Object} [options={}]
     * @param {string} [options.isolationLevel] - READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ or SERIALIZABLE
     * @param {boolean} [options.readOnly] - Start a READ ONLY transaction
     */
    async transaction(pool, options = {}) {
      // Validate before taking a client, so a bad option cannot leak one
      const isolationLevel = normalizeIsolationLevel(options.isolationLevel);

      let beginSql = 'BEGIN';
      if (isolationLevel) {
        beginSql += ` ISOLATION LEVEL ${isolationLevel}`;
      }
      if (options.readOnly) {
        beginSql += ' READ ONLY';
      }

      const client = await pool.connect();

      let released = false;
      const release = (error) => {
        if (!released) {
          released = true;
          // A truthy argument makes pg discard the client instead of reusing it
          client.release(error);
        }
      };

      try {
        await client.query(beginSql);
      } catch (_error) {
        release(_error);
        throw _error;
      }

      const assertActive = () => {
        if (transaction.isCommitted || transaction.isRolledBack) {
          throw new Error('Transaction already completed');
        }
      };

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
          assertActive();

          try {
            await client.query('COMMIT');
            transaction.isCommitted = true;
            release();
          } catch (_error) {
            // PostgreSQL ends the transaction when COMMIT fails
            transaction.isRolledBack = true;
            release(_error);
            throw _error;
          }
        },

        rollback: async () => {
          assertActive();
          transaction.isRolledBack = true;

          try {
            await client.query('ROLLBACK');
            release();
          } catch (_error) {
            release(_error);
            throw _error;
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
