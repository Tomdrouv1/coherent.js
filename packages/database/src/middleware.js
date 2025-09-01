/**
 * Database Middleware for Coherent.js Router Integration
 * 
 * @fileoverview Provides middleware for seamless database integration with the router,
 * including connection management, transaction handling, and query helpers.
 */

/**
 * Database middleware for router integration
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [options={}] - Middleware options
 * @returns {Function} Middleware function
 * 
 * @example
 * import { withDatabase } from '@coherent/database';
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
        } catch (error) {
          await tx.rollback();
          throw error;
        }
      };

      // Attach models if configured
      if (config.attachModels && db.models) {
        req.models = db.models;
      }

      await next();

    } catch (error) {
      // Log database errors
      console.error('Database middleware error:', error);
      
      // Pass error to error handler
      if (typeof next === 'function') {
        next(error);
      } else {
        throw error;
      }
    }
  };
}

/**
 * Transaction middleware for automatic transaction management
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @param {Object} [options={}] - Transaction options
 * @returns {Function} Middleware function
 * 
 * @example
 * router.post('/transfer', withTransaction(db), async (req, res) => {
 *   // All database operations in this handler will be wrapped in a transaction
 *   await req.tx.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
 *   await req.tx.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
 *   // Transaction is automatically committed on success or rolled back on error
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

    try {
      await next();
      
      // Commit transaction if not already committed
      if (!tx.isCommitted && !tx.isRolledBack) {
        await tx.commit();
      }
      
    } catch (error) {
      // Rollback transaction if not already rolled back
      if (!tx.isRolledBack && !tx.isCommitted) {
        await tx.rollback();
      }
      
      throw error;
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
        const error = new Error(`Parameter '${paramName}' is required`);
        error.status = 400;
        throw error;
      }

      const model = await ModelClass.find(paramValue);
      
      if (!model) {
        const error = new Error(`${ModelClass.name} not found`);
        error.status = 404;
        throw error;
      }

      req[key] = model;
      await next();
      
    } catch (error) {
      if (typeof next === 'function') {
        next(error);
      } else {
        throw error;
      }
    }
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

    await next();
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
            const error = new Error(`Query parameter '${key}' is required`);
            error.status = 400;
            throw error;
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
                const error = new Error(`Query parameter '${key}' must be a number`);
                error.status = 400;
                throw error;
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
          const error = new Error(`Query parameter '${key}' must be one of: ${rules.enum.join(', ')}`);
          error.status = 400;
          throw error;
        }

        if (rules.min !== undefined && coercedValue < rules.min) {
          const error = new Error(`Query parameter '${key}' must be at least ${rules.min}`);
          error.status = 400;
          throw error;
        }

        if (rules.max !== undefined && coercedValue > rules.max) {
          const error = new Error(`Query parameter '${key}' must be at most ${rules.max}`);
          error.status = 400;
          throw error;
        }

        validatedQuery[key] = coercedValue;
      }

      // Replace query with validated version
      if (!config.stripUnknown) {
        Object.assign(validatedQuery, req.query);
      }
      
      req.query = validatedQuery;
      await next();
      
    } catch (error) {
      if (typeof next === 'function') {
        next(error);
      } else {
        throw error;
      }
    }
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
    try {
      const startTime = Date.now();
      
      // Test database connection
      await Promise.race([
        db.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), config.timeout)
        )
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

      await next();
      
    } catch (error) {
      req.dbHealth = {
        status: 'unhealthy',
        error: error.message,
        connected: db.isConnected
      };
      
      await next();
    }
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
        res.on('finish', () => {
          if (connection) {
            db.pool.release(connection);
          }
        });
      }

      await next();
      
    } catch (error) {
      // Release connection on error
      if (connection) {
        db.pool.release(connection);
      }
      
      throw error;
    }
  };
}
