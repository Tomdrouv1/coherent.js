/**
 * MongoDB Database Adapter for Coherent.js
 * 
 * @fileoverview MongoDB adapter implementation with connection pooling and document operations.
 */

/**
 * Create a new MongoDB adapter instance
 * 
 * @returns {Object} MongoDB adapter instance with database operations
 */
export function createMongoDBAdapter() {
  let mongodb = null;
  let client = null;
  let db = null;

  /**
   * Initialize MongoDB module
   * 
   * @private
   * @returns {Promise<void>}
   */
  async function initializeMongoDB() {
    if (!mongodb) {
      try {
        const mongoModule = await import('mongodb');
        mongodb = mongoModule;
      } catch {
        throw new Error('Failed to load mongodb module. Make sure to install it: npm install mongodb');
      }
    }
  }

  /**
   * Connect to the database
   * 
   * @param {Object} config - Database configuration
   * @param {string} config.url - MongoDB connection URL
   * @param {string} config.database - Database name
   * @param {Object} [config.options] - MongoDB client options
   * @returns {Promise<Object>} The database adapter instance
   */
  async function connect(config) {
    await initializeMongoDB();
    
    try {
      client = new mongodb.MongoClient(config.url, config.options || {});
      await client.connect();
      db = client.db(config.database);
      return instance;
    } catch (_error) {
      throw new Error(`Failed to connect to MongoDB: ${_error.message}`);
    }
  }

  /**
   * Execute a query on a collection
   * 
   * @param {string} collectionName - Name of the collection
   * @param {Object} query - Query object
   * @param {Object} [options] - Query options
   * @returns {Promise<Array<Object>>} Query results
   */
  async function query(collectionName, query = {}, options = {}) {
    if (!db) {
      throw new Error('Database connection not established. Call connect() first.');
    }

    try {
      const collection = db.collection(collectionName);
      const cursor = collection.find(query, options);
      
      if (options.sort) {
        cursor.sort(options.sort);
      }
      
      if (options.limit) {
        cursor.limit(options.limit);
      }
      
      if (options.skip) {
        cursor.skip(options.skip);
      }
      
      if (options.projection) {
        cursor.project(options.projection);
      }
      
      return cursor.toArray();
    } catch (_error) {
      throw new Error(`MongoDB query error: ${_error.message}`);
    }
  }

  /**
   * Execute a database command
   * 
   * @param {Object} command - Database command
   * @returns {Promise<Object>} Command result
   */
  async function execute(command) {
    if (!db) {
      throw new Error('Database connection not established. Call connect() first.');
    }

    try {
      return await db.command(command);
    } catch (_error) {
      throw new Error(`MongoDB command error: ${_error.message}`);
    }
  }

  /**
   * Begin a transaction
   * 
   * @returns {Promise<Object>} Session object for the transaction
   */
  async function beginTransaction() {
    if (!client) {
      throw new Error('Database connection not established. Call connect() first.');
    }

    const session = client.startSession();
    session.startTransaction();
    return session;
  }

  /**
   * Commit a transaction
   * 
   * @param {Object} session - The session object from beginTransaction
   * @returns {Promise<void>}
   */
  async function commit(session) {
    if (!session) {
      throw new Error('No active transaction session');
    }

    try {
      await session.commitTransaction();
    } finally {
      await session.endSession();
    }
  }

  /**
   * Rollback a transaction
   * 
   * @param {Object} session - The session object from beginTransaction
   * @returns {Promise<void>}
   */
  async function rollback(session) {
    if (!session) {
      throw new Error('No active transaction session');
    }

    try {
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  }

  /**
   * Start a transaction (the DatabaseManager contract)
   *
   * `tx.query(collection, filter, options)` runs inside the transaction. For driver
   * operations on `tx.collection(name)`, pass `{ session: tx.session }` yourself.
   *
   * @param {Object} [_pool] - Unused; the adapter instance is its own pool
   * @param {Object} [options={}] - Driver transaction options (readConcern, writeConcern, ...)
   * @returns {Promise<Object>} Transaction with session, query, collection, commit and rollback
   */
  async function transaction(_pool, options = {}) {
    if (!client) {
      throw new Error('Database connection not established. Call connect() first.');
    }

    const session = client.startSession();
    try {
      session.startTransaction(options);
    } catch (_error) {
      await session.endSession();
      throw _error;
    }

    const assertActive = () => {
      if (tx.isCommitted || tx.isRolledBack) {
        throw new Error('Transaction already completed');
      }
    };

    const tx = {
      session,
      isCommitted: false,
      isRolledBack: false,

      async query(collectionName, filter = {}, queryOptions = {}) {
        assertActive();
        return query(collectionName, filter, { ...queryOptions, session });
      },

      collection(name) {
        assertActive();
        return collection(name);
      },

      async commit() {
        assertActive();
        try {
          await session.commitTransaction();
          tx.isCommitted = true;
        } catch (_error) {
          tx.isRolledBack = true;
          await session.abortTransaction().catch(() => {});
          throw _error;
        } finally {
          await session.endSession();
        }
      },

      async rollback() {
        assertActive();
        tx.isRolledBack = true;
        try {
          await session.abortTransaction();
        } finally {
          await session.endSession();
        }
      }
    };

    return tx;
  }

  /**
   * Get a raw driver collection for document operations
   * (insertOne, findOne, updateOne, deleteOne, createIndex, …)
   *
   * @param {string} name - Collection name
   * @returns {Object} MongoDB driver Collection
   */
  function collection(name) {
    if (!db) {
      throw new Error('Database connection not established. Call connect() first.');
    }
    return db.collection(name);
  }

  /**
   * Disconnect from the database
   *
   * @returns {Promise<void>}
   */
  async function disconnect() {
    if (client) {
      await client.close();
      client = null;
      db = null;
    }
  }

  /**
   * Close the connection — DatabaseManager.close() calls closePool()
   *
   * @returns {Promise<void>}
   */
  async function closePool() {
    await disconnect();
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
      await db.command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Escape a value for MongoDB queries
   * 
   * @param {*} value - Value to escape
   * @returns {*} Escaped value
   */
  function escape(value) {
    // MongoDB driver handles escaping internally
    return value;
  }

  // Public API
  const instance = {
    connect,
    query,
    execute,
    collection,
    beginTransaction,
    commit,
    rollback,
    transaction,
    disconnect,
    closePool,
    getConnection,
    ping,
    escape
  };

  return instance;
}
