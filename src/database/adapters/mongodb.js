/**
 * MongoDB Database Adapter for Coherent.js
 * 
 * @fileoverview MongoDB adapter implementation with connection pooling and document operations.
 */

/**
 * MongoDB Database Adapter
 * 
 * @class MongoDBAdapter
 * @description Provides MongoDB-specific database operations with connection pooling.
 */
export class MongoDBAdapter {
  constructor() {
    this.mongodb = null;
  }

  /**
   * Initialize MongoDB module
   * 
   * @private
   * @returns {Promise<void>}
   */
  async initializeMongoDB() {
    if (!this.mongodb) {
      try {
        // Try to import mongodb (peer dependency)
        const mongoModule = await import('mongodb');
        this.mongodb = mongoModule;
      } catch {
        throw new Error('mongodb package is required for MongoDB adapter. Install with: npm install mongodb');
      }
    }
  }

  /**
   * Create connection pool
   * 
   * @param {Object} config - Database configuration
   * @returns {Promise<Object>} Connection pool (MongoDB client)
   */
  async createPool(config) {
    await this.initializeMongoDB();
    
    const uri = this.buildConnectionUri(config);
    
    const clientOptions = {
      minPoolSize: config.pool.min,
      maxPoolSize: config.pool.max,
      maxIdleTimeMS: config.pool.idleTimeoutMillis,
      serverSelectionTimeoutMS: config.pool.acquireTimeoutMillis,
      socketTimeoutMS: config.pool.createTimeoutMillis
    };

    const client = new this.mongodb.MongoClient(uri, clientOptions);
    await client.connect();
    
    // Test connection
    await client.db(config.database).admin().ping();
    
    return {
      client,
      database: client.db(config.database),
      config
    };
  }

  /**
   * Build MongoDB connection URI
   * 
   * @private
   * @param {Object} config - Database configuration
   * @returns {string} MongoDB URI
   */
  buildConnectionUri(config) {
    let uri = 'mongodb://';
    
    if (config.username && config.password) {
      uri += `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`;
    }
    
    uri += `${config.host}:${config.port}/${config.database}`;
    
    return uri;
  }

  /**
   * Test database connection
   * 
   * @param {Object} pool - Connection pool
   * @returns {Promise<void>}
   */
  async testConnection(pool) {
    await pool.database.admin().ping();
  }

  /**
   * Execute database query (MongoDB operations)
   * 
   * @param {Object} pool - Connection pool
   * @param {string} operation - MongoDB operation (find, insertOne, updateOne, etc.)
   * @param {Array} [params=[]] - Operation parameters [collection, query, options]
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Object>} Query result
   */
  async query(pool, operation, params = [], options = {}) {
    const [collectionName, query, operationOptions = {}] = params;
    
    if (!collectionName) {
      throw new Error('Collection name is required for MongoDB operations');
    }
    
    const collection = pool.database.collection(collectionName);
    
    try {
      let result;
      
      switch (operation.toLowerCase()) {
        case 'find':
          if (options.single) {
            result = await collection.findOne(query || {}, operationOptions);
            return result;
          } else {
            const cursor = collection.find(query || {}, operationOptions);
            const rows = await cursor.toArray();
            return {
              rows,
              rowCount: rows.length
            };
          }
          
        case 'insertone':
          result = await collection.insertOne(query, operationOptions);
          return {
            insertId: result.insertedId,
            affectedRows: result.acknowledged ? 1 : 0,
            rowCount: result.acknowledged ? 1 : 0
          };
          
        case 'insertmany':
          result = await collection.insertMany(query, operationOptions);
          return {
            insertIds: result.insertedIds,
            affectedRows: result.insertedCount,
            rowCount: result.insertedCount
          };
          
        case 'updateone':
          result = await collection.updateOne(query, operationOptions.update || {}, operationOptions);
          return {
            affectedRows: result.modifiedCount,
            rowCount: result.modifiedCount,
            matchedCount: result.matchedCount
          };
          
        case 'updatemany':
          result = await collection.updateMany(query, operationOptions.update || {}, operationOptions);
          return {
            affectedRows: result.modifiedCount,
            rowCount: result.modifiedCount,
            matchedCount: result.matchedCount
          };
          
        case 'deleteone':
          result = await collection.deleteOne(query, operationOptions);
          return {
            affectedRows: result.deletedCount,
            rowCount: result.deletedCount
          };
          
        case 'deletemany':
          result = await collection.deleteMany(query, operationOptions);
          return {
            affectedRows: result.deletedCount,
            rowCount: result.deletedCount
          };
          
        case 'aggregate':
          const pipeline = query || [];
          const cursor = collection.aggregate(pipeline, operationOptions);
          const rows = await cursor.toArray();
          return {
            rows,
            rowCount: rows.length
          };
          
        case 'count':
        case 'countdocuments':
          const count = await collection.countDocuments(query || {}, operationOptions);
          return {
            count,
            rowCount: 1,
            rows: [{ count }]
          };
          
        default:
          throw new Error(`Unsupported MongoDB operation: ${operation}`);
      }
      
    } catch (error) {
      throw new Error(`MongoDB operation failed: ${error.message}`);
    }
  }

  /**
   * Start database transaction (MongoDB session)
   * 
   * @param {Object} pool - Connection pool
   * @param {Object} [options={}] - Transaction options
   * @returns {Promise<Object>} Transaction object
   */
  async transaction(pool, options = {}) {
    const session = pool.client.startSession();
    
    // Start transaction
    session.startTransaction(options);

    const transaction = {
      session,
      pool,
      isCommitted: false,
      isRolledBack: false,

      query: async (operation, params, queryOptions) => {
        if (transaction.isCommitted || transaction.isRolledBack) {
          throw new Error('Cannot execute query on completed transaction');
        }
        
        // Add session to operation options
        const [collectionName, query, operationOptions = {}] = params;
        const sessionOptions = { ...operationOptions, session };
        
        return await this.query(pool, operation, [collectionName, query, sessionOptions], queryOptions);
      },

      commit: async () => {
        if (transaction.isCommitted || transaction.isRolledBack) {
          throw new Error('Transaction already completed');
        }

        try {
          await session.commitTransaction();
          transaction.isCommitted = true;
        } finally {
          await session.endSession();
        }
      },

      rollback: async () => {
        if (transaction.isCommitted || transaction.isRolledBack) {
          throw new Error('Transaction already completed');
        }

        try {
          await session.abortTransaction();
          transaction.isRolledBack = true;
        } finally {
          await session.endSession();
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
    // MongoDB doesn't expose detailed pool stats in the same way
    // Return basic connection info
    return {
      connected: pool.client.topology && pool.client.topology.isConnected(),
      database: pool.config.database,
      host: pool.config.host,
      port: pool.config.port
    };
  }

  /**
   * Close connection pool
   * 
   * @param {Object} pool - Connection pool
   * @returns {Promise<void>}
   */
  async closePool(pool) {
    await pool.client.close();
  }
}
