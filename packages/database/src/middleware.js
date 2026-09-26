/**
 * Database Middleware for Coherent.js Router Integration
 * 
 * @fileoverview Provides middleware for seamless database integration with the router,
 * including connection management, transaction handling, and query helpers.
 */

/**
 * Continue the chain: call `next` when the framework passed one (Express, Koa, ...).
 * Routers that run middleware without `next` continue on their own.
 *
 * @private
 */
async function proceed(next) {
  if (typeof next === 'function') {
    await next();
  }
}

/**
 * Report an error raised by the middleware itself (not by later handlers) to `next`
 * when there is one, else throw it.
 *
 * @private
 */
function fail(next, _error) {
  if (typeof next === 'function') {
    return next(_error);
  }
  throw _error;
}

/**
 * Database middleware for router integration
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [options={}] - Middleware options
 * @returns {Function} Middleware function
 * 
 * @example
 * import { withDatabase } from '@coherent.js/database';
 * 
 * const router = new SimpleRouter();
 * router.use(withDatabase(db));
 * 
 * router.get('/users', async (req, res) => {
 *   const users = await req.db.query('SELECT * FROM users');
 *   res.json(users.rows);
 * });
 */
export function withDatabase(db, options = {}) {
  const config = {
    autoConnect: true,
    attachModels: true,
    transactionKey: 'tx',
    ...options
  };

  return async (req, res, next) => {
    try {
      // Ensure database is connected
      if (config.autoConnect && !db.isConnected) {
        await db.connect();
      }

      // Attach database to request
      req.db = db;

      // Attach query helper (preserve original req.query)
      req.dbQuery = async (sql, params, queryOptions) => {
        return await db.query(sql, params, queryOptions);
      };

      // Attach transaction helper
      req.transaction = async (callback) => {
        const tx = await db.transaction();
        
        try {
          const result = await callback(tx);
          await tx.commit();
          return result;
        } catch (_error) {
          await tx.rollback();
          throw _error;
        }
      };

      // Attach models if configured
      if (config.attachModels && db.models) {
        req.models = db.models;
      }
    } catch (_error) {
      // Log database errors
      console.error('Database middleware error:', _error);
      return fail(next, _error);
    }

    // Outside the try: an error from a later handler must not call next() a second time
    await proceed(next);
  };
}

/**
 * Finish a transaction when the response ends: commit after a successful response,
 * roll back after an error status or when the connection closes first.
 *
 * @private
 */
function settleWhenResponseEnds(res, settle) {
  const listen = res && (typeof res.once === 'function' ? res.once : res.on);
  if (typeof listen !== 'function') {
    return false;
  }

  const report = (_error) => console.error('withTransaction: failed to finish the transaction:', _error);
  listen.call(res, 'finish', () => {
    settle(res.statusCode >= 400).catch(report);
  });
  listen.call(res, 'close', () => {
    settle(true).catch(report);
  });
  return true;
}

/**
 * Transaction middleware for automatic transaction management
 *
 * The transaction is exposed as `req.tx` and finished:
 * - when `next()` returns a promise (async frameworks): after it settles, committing on
 *   success and rolling back if it rejects;
 * - otherwise (Express, whose `next()` returns before an async handler is done, or a
 *   router that calls middleware without `next`): when the response ends, committing
 *   on a status below 400 and rolling back on an error status or a closed connection.
 *
 * A transaction the handler already committed or rolled back is left alone.
 *
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [options={}] - Transaction options
 * @param {string} [options.isolationLevel] - READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ or SERIALIZABLE
 * @param {boolean} [options.readOnly=false] - Start a read-only transaction
 * @returns {Function} Middleware function
 *
 * @example
 * router.post('/transfer', withTransaction(db), async (req, res) => {
 *   // All database operations in this handler will be wrapped in a transaction
 *   await req.tx.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
 *   await req.tx.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
 *   // Transaction is automatically committed on success or rolled back on _error
 * });
 */
export function withTransaction(db, options = {}) {
  const config = {
    isolationLevel: null,
    readOnly: false,
    ...options
  };

  return async (req, res, next) => {
    const tx = await db.transaction(config);
    req.tx = tx;

    let settled = false;
    const settle = async (failed) => {
      if (settled) return;
      settled = true;
      if (tx.isCommitted || tx.isRolledBack) return;
      if (failed) {
        await tx.rollback();
      } else {
        await tx.commit();
      }
    };

    let result;
    try {
      result = typeof next === 'function' ? next() : undefined;
    } catch (_error) {
      await settle(true);
      throw _error;
    }

    if (result && typeof result.then === 'function') {
      try {
        await result;
      } catch (_error) {
        await settle(true);
        throw _error;
      }
      await settle(false);
      return;
    }

    // The handler may still be running: finish the transaction with the response
    if (!settleWhenResponseEnds(res, settle)) {
      await settle(true);
      throw new Error(
        'withTransaction cannot tell when the request ends: next() did not return a promise ' +
        'and the response does not emit "finish"/"close". The transaction was rolled back.'
      );
    }
  };
}

/**
 * Model binding middleware
 * 
 * @param {Function} ModelClass - Model class to bind
 * @param {string} [paramName='id'] - Route parameter name
 * @param {string} [requestKey] - Request key to attach model (defaults to model name)
 * @returns {Function} Middleware function
 * 
 * @example
 * router.get('/users/:id', withModel(User), async (req, res) => {
 *   // req.user contains the loaded User model
 *   res.json(req.user.toJSON());
 * });
 * 
 * router.get('/posts/:postId', withModel(Post, 'postId', 'post'), async (req, res) => {
 *   // req.post contains the loaded Post model
 *   res.json(req.post.toJSON());
 * });
 */
export function withModel(ModelClass, paramName = 'id', requestKey = null) {
  // Handle different model types - class vs object
  let modelName = requestKey;
  if (!modelName) {
    if (ModelClass && ModelClass.name) {
      modelName = ModelClass.name.toLowerCase();
    } else if (ModelClass && ModelClass.tableName) {
      modelName = ModelClass.tableName.slice(0, -1); // Remove 's' from table name
    } else {
      modelName = 'model'; // fallback
    }
  }
  const key = modelName;
  
  return async (req, res, next) => {
    try {
      const paramValue = req.params[paramName];
      
      if (!paramValue) {
        const _error = new Error(`Parameter '${paramName}' is required`);
        _error.status = 400;
        throw _error;
      }

      const model = await ModelClass.find(paramValue);
      
      if (!model) {
        const _error = new Error(`${ModelClass.name} not found`);
        _error.status = 404;
        throw _error;
      }

      req[key] = model;
    } catch (_error) {
      return fail(next, _error);
    }

    await proceed(next);
  };
}

/**
 * Pagination middleware
 * 
 * @param {Object} [options={}] - Pagination options
 * @returns {Function} Middleware function
 * 
 * @example
 * router.get('/users', withPagination(), async (req, res) => {
 *   const users = await User.query()
 *     .limit(req.pagination.limit)
 *     .offset(req.pagination.offset)
 *     .execute();
 *   
 *   res.json({
 *     data: users.rows,
 *     pagination: req.pagination
 *   });
 * });
 */
export function withPagination(options = {}) {
  const config = {
    defaultLimit: 20,
    maxLimit: 100,
    pageParam: 'page',
    limitParam: 'limit',
    ...options
  };

  return async (req, res, next) => {
    const page = Math.max(1, parseInt(req.query[config.pageParam]) || 1);
    const limit = Math.min(
      config.maxLimit,
      Math.max(1, parseInt(req.query[config.limitParam]) || config.defaultLimit)
    );
    const offset = (page - 1) * limit;

    req.pagination = {
      page,
      limit,
      offset,
      hasNext: null, // To be set by the handler
      hasPrev: page > 1,
      totalPages: null, // To be set by the handler
      totalCount: null // To be set by the handler
    };

    await proceed(next);
  };
}

/**
 * Query validation middleware
 * 
 * @param {Object} schema - Validation schema
 * @param {Object} [options={}] - Validation options
 * @returns {Function} Middleware function
 * 
 * @example
 * router.get('/users', withQueryValidation({
 *   status: { type: 'string', enum: ['active', 'inactive'] },
 *   age: { type: 'number', min: 0, max: 120 }
 * }), async (req, res) => {
 *   // req.query is validated and sanitized
 * });
 */
export function withQueryValidation(schema, options = {}) {
  const config = {
    stripUnknown: true,
    coerceTypes: true,
    ...options
  };

  return async (req, res, next) => {
    try {
      const validatedQuery = {};
      
      for (const [key, rules] of Object.entries(schema)) {
        const value = req.query[key];
        
        // Skip if not provided and not required
        if (value === undefined || value === null || value === '') {
          if (rules.required) {
            const _error = new Error(`Query parameter '${key}' is required`);
            _error.status = 400;
            throw _error;
          }
          continue;
        }

        // Type coercion
        let coercedValue = value;
        if (config.coerceTypes) {
          switch (rules.type) {
            case 'number':
              coercedValue = Number(value);
              if (isNaN(coercedValue)) {
                const _error = new Error(`Query parameter '${key}' must be a number`);
                _error.status = 400;
                throw _error;
              }
              break;
            case 'boolean':
              coercedValue = value === 'true' || value === '1';
              break;
            case 'array':
              coercedValue = Array.isArray(value) ? value : [value];
              break;
          }
        }

        // Validation
        if (rules.enum && !rules.enum.includes(coercedValue)) {
          const _error = new Error(`Query parameter '${key}' must be one of: ${rules.enum.join(', ')}`);
          _error.status = 400;
          throw _error;
        }

        if (rules.min !== undefined && coercedValue < rules.min) {
          const _error = new Error(`Query parameter '${key}' must be at least ${rules.min}`);
          _error.status = 400;
          throw _error;
        }

        if (rules.max !== undefined && coercedValue > rules.max) {
          const _error = new Error(`Query parameter '${key}' must be at most ${rules.max}`);
          _error.status = 400;
          throw _error;
        }

        validatedQuery[key] = coercedValue;
      }

      // Replace query with the validated (and coerced) version; keep unknown keys
      // alongside it when asked, without overwriting the coerced values
      req.query = config.stripUnknown ? validatedQuery : { ...req.query, ...validatedQuery };
    } catch (_error) {
      return fail(next, _error);
    }

    await proceed(next);
  };
}

/**
 * Database health check middleware
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [options={}] - Health check options
 * @returns {Function} Middleware function
 * 
 * @example
 * router.get('/health', withHealthCheck(db), (req, res) => {
 *   res.json({ status: 'healthy', database: req.dbHealth });
 * });
 */
export function withHealthCheck(db, options = {}) {
  const config = {
    timeout: 5000,
    includeStats: true,
    ...options
  };

  return async (req, res, next) => {
    let timer;
    try {
      const startTime = Date.now();

      // Test database connection
      await Promise.race([
        db.query('SELECT 1'),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Health check timeout')), config.timeout);
        })
      ]);
      
      const responseTime = Date.now() - startTime;
      
      req.dbHealth = {
        status: 'healthy',
        responseTime,
        connected: db.isConnected
      };

      if (config.includeStats) {
        req.dbHealth.stats = db.getStats();
      }
    } catch (_error) {
      req.dbHealth = {
        status: 'unhealthy',
        error: _error.message,
        connected: db.isConnected
      };
    } finally {
      clearTimeout(timer);
    }

    await proceed(next);
  };
}

/**
 * Connection pooling middleware for request-scoped connections
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [options={}] - Pool options
 * @returns {Function} Middleware function
 * 
 * @example
 * router.use(withConnectionPool(db, { acquireTimeout: 10000 }));
 */
export function withConnectionPool(db, options = {}) {
  const config = {
    acquireTimeout: 30000,
    releaseOnResponse: true,
    ...options
  };

  return async (req, res, next) => {
    let connection = null;
    let released = false;
    const release = () => {
      if (connection && !released) {
        released = true;
        db.pool.release(connection);
      }
    };

    try {
      // Acquire connection from pool
      connection = await db.pool.acquire(config.acquireTimeout);
      
      // Attach connection to request
      req.dbConnection = connection;
      
      // Attach query helper to use this connection
      req.dbQuery = async (sql, params, queryOptions) => {
        return await db.adapter.query(connection, sql, params, queryOptions);
      };

      // Release connection when response finishes
      if (config.releaseOnResponse) {
        res.on('finish', release);
      }

      await proceed(next);
    } catch (_error) {
      // Release connection on _error
      release();
      throw _error;
    }
  };
}
