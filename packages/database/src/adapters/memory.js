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
              let field, direction;
              if (Array.isArray(orderBy)) {
                [field, direction = 'ASC'] = orderBy;
              } else if (typeof orderBy === 'object') {
                const entries = Object.entries(orderBy);
                if (entries.length > 0) {
                  [field, direction] = entries[0];
                }
              } else {
                field = orderBy;
                direction = 'ASC';
              }
              
              if (field) {
                const dir = direction.toLowerCase();
                results.sort((a, b) => {
                  if (a[field] < b[field]) return dir === 'asc' ? -1 : 1;
                  if (a[field] > b[field]) return dir === 'asc' ? 1 : -1;
                  return 0;
                });
              }
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
       * Copy of every collection and schema, for rolling back a transaction
       * @private
       */
      _snapshot() {
        const copy = new Map();
        for (const [name, records] of collections) {
          copy.set(name, new Map([...records].map(([id, record]) => [id, globalThis.structuredClone(record)])));
        }
        return { collections: copy, schemas: new Map(schemas) };
      },

      /**
       * Restore a snapshot taken with _snapshot()
       * @private
       */
      _restore(snapshot) {
        collections.clear();
        for (const [name, records] of snapshot.collections) {
          collections.set(name, records);
        }
        schemas.clear();
        for (const [name, schema] of snapshot.schemas) {
          schemas.set(name, schema);
        }
      },

      /**
       * Run a callback in a transaction: changes are undone if it throws.
       *
       * The store is shared, so changes made outside the callback while it runs are
       * undone as well.
       *
       * @param {Function} callback - Transaction callback, receives `{ query }`
       * @returns {Promise<*>} Result of the callback
       */
      async transaction(callback) {
        const snapshot = this._snapshot();
        try {
          return await callback({
            query: (operation, params) => this.query(operation, params)
          });
        } catch (_error) {
          this._restore(snapshot);
          throw _error;
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
   * Start a transaction (the DatabaseManager contract), or run a callback in one.
   *
   * `transaction(store)` returns `{ query, commit, rollback, isCommitted, isRolledBack }`;
   * rollback() restores the store as it was when the transaction started.
   * `transaction(callback)` runs the callback on the default store and rolls back if it throws.
   *
   * @param {Object|Function} [storeOrCallback] - Store from createPool(), or a callback
   * @returns {Promise<Object|*>} Transaction, or the callback's result
   */
  async transaction(storeOrCallback) {
    if (typeof storeOrCallback === 'function') {
      const store = this.getStore();
      if (!store) {
        throw new Error('MemoryAdapter has no store: call createPool() first');
      }
      return store.transaction(storeOrCallback);
    }

    const store = storeOrCallback || this.getStore();
    if (!store || typeof store._snapshot !== 'function') {
      throw new Error('MemoryAdapter.transaction() needs a store created by createPool()');
    }

    const snapshot = store._snapshot();
    const assertActive = () => {
      if (tx.isCommitted || tx.isRolledBack) {
        throw new Error('Transaction already completed');
      }
    };

    const tx = {
      isCommitted: false,
      isRolledBack: false,

      async query(operation, params) {
        assertActive();
        return store.query(operation, params);
      },

      async commit() {
        assertActive();
        tx.isCommitted = true;
      },

      async rollback() {
        assertActive();
        store._restore(snapshot);
        tx.isRolledBack = true;
      }
    };

    return tx;
  }
}
