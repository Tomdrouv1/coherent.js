/**
 * In-Memory Database Adapter for Coherent.js
 * 
 * @fileoverview In-memory adapter for development and testing purposes.
 * Provides a simple, non-persistent storage solution.
 */

/**
 * In-Memory Database Adapter
 * 
 * @class MemoryAdapter
 * @description Provides in-memory database operations with a simple key-value store.
 */
export class MemoryAdapter {
  constructor() {
    this.stores = new Map();
  }

  /**
   * Create a new in-memory store
   * 
   * @param {Object} config - Store configuration
   * @returns {Promise<Object>} Store instance
   */
  async createPool(config) {
    const collections = new Map();
    const schemas = new Map();
    
    const store = {
      config,
      stats: {
        created: Date.now(),
        operations: 0,
        collections: 0,
        queries: 0
      },
      
      /**
       * Get a collection by name
       * @private
       */
      _getCollection(name) {
        if (!collections.has(name)) {
          collections.set(name, new Map());
        }
        return collections.get(name);
      },
      
      /**
       * Get schema for a collection
       * @private
       */
      _getSchema(collectionName) {
        return schemas.get(collectionName) || {};
      },
      
      /**
       * Execute a query
       * @param {string} operation - Operation type
       * @param {Object} params - Query parameters
       * @returns {Promise<*>} Query result
       */
      async query(operation, params = {}) {
        this.stats.operations++;
        this.stats.queries++;
        
        const { table, where = {}, data, limit, offset, orderBy } = params;
        const collection = this._getCollection(table);
        
        switch (operation.toUpperCase()) {
          case 'FIND': {
            let results = Array.from(collection.values());
            
            // Apply WHERE conditions
            if (Object.keys(where).length > 0) {
              results = results.filter(item => 
                Object.entries(where).every(([key, value]) => {
                  if (value === undefined) return true;
                  if (value === null) return item[key] === null;
                  return JSON.stringify(item[key]) === JSON.stringify(value);
                })
              );
            }
            
            // Apply ORDER BY
            if (orderBy) {
              const [field, direction = 'asc'] = Array.isArray(orderBy) ? orderBy : [orderBy];
              results.sort((a, b) => {
                if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
                if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
                return 0;
              });
            }
            
            // Apply OFFSET and LIMIT
            if (offset) results = results.slice(offset);
            if (limit) results = results.slice(0, limit);
            
            return results;
          }
          
          case 'INSERT': {
            if (!data) throw new Error('No data provided for insert');
            
            const id = data.id || Date.now().toString(36) + Math.random().toString(36).substr(2);
            const record = { ...data, id };
            
            collection.set(id, record);
            this.stats.collections = collections.size;
            
            return { id };
          }
          
          case 'UPDATE': {
            if (!data) throw new Error('No data provided for update');
            
            const records = await this.query('FIND', { table, where });
            const updated = [];
            
            for (const record of records) {
              const updatedRecord = { ...record, ...data };
              collection.set(record.id, updatedRecord);
              updated.push(updatedRecord);
            }
            
            return { affectedRows: updated.length };
          }
          
          case 'DELETE': {
            const records = await this.query('FIND', { table, where });
            const deleted = [];
            
            for (const record of records) {
              if (collection.delete(record.id)) {
                deleted.push(record);
              }
            }
            
            return { affectedRows: deleted.length };
          }
          
          case 'COUNT': {
            const results = await this.query('FIND', { table, where });
            return { count: results.length };
          }
          
          case 'CREATE_COLLECTION': {
            const { name, schema } = params;
            schemas.set(name, schema || {});
            return { success: true };
          }
          
          case 'SET_SCHEMA': {
            const { model, schema } = params;
            schemas.set(model, schema);
            return { success: true };
          }
          
          default:
            throw new Error(`Unsupported operation: ${operation}`);
        }
      },
      
      /**
       * Get store statistics
       * @returns {Object}
       */
      getStats() {
        return {
          ...this.stats,
          uptime: Date.now() - this.stats.created,
          collections: collections.size,
          operations: this.stats.operations,
          queries: this.stats.queries
        };
      },
      
      /**
       * Execute a transaction
       * @param {Function} callback - Transaction callback
       * @returns {Promise<*>} Result of the transaction
       */
      async transaction(callback) {
        // In a real implementation, this would track changes and rollback on error
        // For this simple implementation, we'll just execute the callback
        try {
          const result = await callback({
            query: (operation, params) => this.query(operation, params)
          });
          return result;
        } catch (error) {
          // In a real implementation, we would rollback changes here
          throw error;
        }
      }
    };

    this.stores.set(config.name || 'default', store);
    return store;
  }

  /**
   * Get a store by name
   * 
   * @param {string} name - Store name
   * @returns {Object|undefined} Store instance or undefined if not found
   */
  getStore(name = 'default') {
    return this.stores.get(name);
  }

  /**
   * Close all stores and clean up
   * 
   * @returns {Promise<void>}
   */
  async close() {
    this.stores.clear();
  }
  
  /**
   * Close the connection pool
   * @param {Object} pool - The connection pool to close
   * @returns {Promise<void>}
   */
  async closePool(pool) {
    // For in-memory adapter, we don't need to do anything special to close the pool
    // Just clear any references to allow garbage collection
    if (pool) {
      // Clear any collections or other resources if needed
      if (pool.collections) {
        pool.collections.clear();
      }
      if (pool.schemas) {
        pool.schemas.clear();
      }
    }
    return Promise.resolve();
  }
  
  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<*>} Result of the transaction
   */
  async transaction(callback) {
    // In a real implementation, this would track changes and rollback on error
    // For this simple implementation, we'll just execute the callback
    try {
      const result = await callback({
        query: (operation, params) => this.query(operation, params)
      });
      return result;
    } catch (error) {
      // In a real implementation, we would rollback changes here
      throw error;
    }
  }
}
