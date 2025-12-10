/**
 * Database Connection Manager for Coherent.js
 *
 * @fileoverview Manages database connections, connection pooling, and adapter selection
 * with support for multiple database engines and automatic failover.
 */

import { EventEmitter } from 'events';

/**
 * Database Connection Manager
 *
 * @class DatabaseManager
 * @extends EventEmitter
 * @description Manages database connections with pooling, health checks, and adapter abstraction.
 * Provides a unified interface for different database engines.
 *
 * @param {Object} config - Database configuration
 * @param {string} config.type - Database type ('postgresql', 'mysql', 'sqlite', 'mongodb')
 * @param {string} [config.host='localhost'] - Database host
 * @param {number} [config.port] - Database port (auto-detected by type)
 * @param {string} config.database - Database name
 * @param {string} [config.username] - Database username
 * @param {string} [config.password] - Database password
 * @param {Object} [config.pool] - Connection pool configuration
 * @param {boolean} [config.debug=false] - Enable debug logging
 *
 * @example
 * const db = new DatabaseManager({
 *   type: 'postgresql',
 *   host: 'localhost',
 *   database: 'myapp',
 *   username: 'user',
 *   password: 'pass',
 *   pool: { min: 2, max: 10 }
 * });
 *
 * await db.connect();
 * const users = await db.query('SELECT * FROM users WHERE active = ?', [true]);
 */
export class DatabaseManager extends EventEmitter {
  constructor(config) {
    super();

    this.config = this.validateConfig(config);
    this.adapter = null;
    this.pool = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;

    // Health check interval
    this.healthCheckInterval = null;
    this.healthCheckFrequency = 30000; // 30 seconds

    // Connection statistics
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      queriesExecuted: 0,
      averageQueryTime: 0,
      lastHealthCheck: null
    };
  }

  /**
   * Validate database configuration
   *
   * @private
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validated configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Database configuration is required');
    }

    // New adapter-based configuration
    if (config.adapter) {
      if (typeof config.adapter !== 'object' ||
          typeof config.adapter.createPool !== 'function') {
        throw new Error('Invalid adapter provided. Adapter must be an object with a createPool method');
      }

      // Set default store config if not provided
      if (!config.store) {
        config.store = { name: 'default' };
      } else if (typeof config.store === 'string') {
        config.store = { name: config.store };
      }

      return config;
    }

    // Legacy type-based configuration
    const { type, database } = config;

    if (!type) {
      throw new Error('Either database type or adapter is required');
    }

    const supportedTypes = ['postgresql', 'mysql', 'sqlite', 'mongodb'];
    if (!supportedTypes.includes(type)) {
      throw new Error(`Unsupported database type: ${type}. Supported types: ${supportedTypes.join(', ')}`);
    }

    if (!database) {
      throw new Error('Database name is required for type-based configuration');
    }

    // Set default ports based on database type
    const defaultPorts = {
      postgresql: 5432,
      mysql: 3306,
      mongodb: 27017,
      sqlite: null
    };

    return {
      host: config.host || 'localhost',
      port: config.port || defaultPorts[type],
      ...config,
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        ...config.pool
      }
    };
  }

  /**
   * Connect to the database
   *
   * @returns {Promise<void>}
   * @throws {Error} If connection fails after retries
   *
   * @example
   * await db.connect();
   * console.log('Database connected successfully');
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      // Load appropriate adapter
      this.adapter = await this.loadAdapter(this.config.type);

      // Create connection pool
      this.pool = await this.adapter.createPool(this.config);

      // Test connection
      await this.testConnection();

      this.isConnected = true;
      this.connectionAttempts = 0;

      // Start health checks if supported by the adapter
      if (this.adapter.startHealthChecks) {
        this.startHealthChecks();
      }

      return this;
    } catch (_error) {
      this.connectionAttempts++;
      this.stats.failedConnections++;
      this.emit('_error', _error);

      if (this.connectionAttempts < this.maxRetries) {
        console.warn(`Connection attempt ${this.connectionAttempts} failed. Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.connect();
      }

      throw new Error(`Failed to connect to database after ${this.connectionAttempts} attempts: ${_error.message}`);
    }
  }

  /**
   * Load database adapter
   *
   * @private
   * @param {string} type - Database type
   * @returns {Object} Database adapter
   */
  loadAdapter(type) {
    // If using direct adapter instance (for custom adapters like MemoryAdapter)
    if (this.config.adapter) {
      return this.config.adapter;
    }

    // For built-in adapters
    const adapterMap = {
      postgresql: './adapters/postgresql.js',
      mysql: './adapters/mysql.js',
      sqlite: './adapters/sqlite.js',
      mongodb: './adapters/mongodb.js',
      memory: './adapters/memory.js'
    };

    const adapterPath = adapterMap[type];
    if (!adapterPath) {
      throw new Error(`No adapter found for database type: ${type}`);
    }

    // Use dynamic import for ESM compatibility
    return import(adapterPath)
      .then(adapterModule => {
        // Try both the default export and the named export pattern
        if (adapterModule.default) {
          return new adapterModule.default();
        }

        const AdapterClass = adapterModule[`${type.charAt(0).toUpperCase() + type.slice(1)}Adapter`];
        if (AdapterClass) {
          return new AdapterClass();
        }

        throw new Error(`No valid adapter found in ${adapterPath}`);
      })
      .catch(_error => {
        throw new Error(`Failed to load ${type} adapter: ${_error.message}`);
      });
  }

  /**
   * Test database connection
   *
   * @private
   * @returns {Promise<void>}
   */
  async testConnection() {
    const startTime = Date.now();

    try {
      if (typeof this.adapter.testConnection === 'function') {
        await this.adapter.testConnection(this.pool);
      } else if (this.adapter.ping) {
        // Try ping if available
        await this.adapter.ping();
      }
      // If no test method is available, we'll assume the connection is good

      const duration = Date.now() - startTime;
      this.stats.lastHealthCheck = new Date();
      this.emit('connect:test', { duration });

    } catch (_error) {
      this.emit('_error', _error);
      throw new Error(`Database connection test failed: ${_error.message}`);
    }
  }

  /**
   * Execute a database query
   *
   * @param {string} sql - SQL query string
   * @param {Array} [params=[]] - Query parameters
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Object>} Query result
   *
   * @example
   * const users = await db.query('SELECT * FROM users WHERE age > ?', [18]);
   * const user = await db.query('SELECT * FROM users WHERE id = ?', [123], { single: true });
   */
  async query(operation, params = {}) {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const startTime = Date.now();

    try {
      let result;

      // Handle MemoryAdapter's query method
      if (typeof this.pool.query === 'function') {
        result = await this.pool.query(operation, params);
      }
      // Handle SQL adapters
      else if (typeof this.adapter.query === 'function') {
        result = await this.adapter.query(this.pool, operation, params);
      } else {
        throw new Error('No valid query method found on adapter or pool');
      }

      // Update statistics
      const duration = Date.now() - startTime;
      this.stats.queriesExecuted++;
      this.stats.averageQueryTime = (
        (this.stats.averageQueryTime * (this.stats.queriesExecuted - 1) + duration) /
        this.stats.queriesExecuted
      );

      if (this.config.debug) {
        console.log(`Query executed in ${duration}ms: ${operation}`, params);
      }

      this.emit('query', { operation, params, duration });

      return result;

    } catch (_error) {
      const duration = Date.now() - startTime;
      this.emit('queryError', { operation, params, duration, _error: _error.message });

      throw new Error(`Query failed: ${_error.message}`);
    }
  }

  /**
   * Start a database transaction
   *
   * @returns {Promise<Object>} Transaction object
   *
   * @example
   * const tx = await db.transaction();
   * try {
   *   await tx.query('INSERT INTO users (name) VALUES (?)', ['John']);
   *   await tx.query('INSERT INTO profiles (user_id) VALUES (?)', [userId]);
   *   await tx.commit();
   * } catch (_error) {
   *   await tx.rollback();
   *   throw _error;
   * }
   */
  async transaction() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    return await this.adapter.transaction(this.pool);
  }

  /**
   * Start health check monitoring
   *
   * @private
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.testConnection();
        this.emit('healthCheck', { status: 'healthy', timestamp: new Date() });
      } catch (_error) {
        this.emit('healthCheck', { status: 'unhealthy', _error: _error.message, timestamp: new Date() });

        if (this.config.debug) {
          console.error('Database health check failed:', _error.message);
        }
      }
    }, this.healthCheckFrequency);
  }

  /**
   * Get connection statistics
   *
   * @returns {Object} Connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      isConnected: this.isConnected,
      poolStats: this.pool ? this.adapter.getPoolStats(this.pool) : null
    };
  }

  /**
   * Close database connection
   *
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.isConnected) {
      return;
    }

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Close connection pool
    if (this.pool && this.adapter) {
      await this.adapter.closePool(this.pool);
    }

    this.isConnected = false;
    this.pool = null;
    this.adapter = null;

    this.emit('disconnected');

    if (this.config.debug) {
      console.log('Database connection closed');
    }
  }
}

/**
 * Factory function to create a DatabaseManager instance
 *
 * @param {Object} config - Database configuration
 * @returns {DatabaseManager} Database manager instance
 *
 * @example
 * const db = createDatabaseManager({
 *   type: 'sqlite',
 *   database: './app.db'
 * });
 */
export function createDatabaseManager(config) {
  return new DatabaseManager(config);
}
