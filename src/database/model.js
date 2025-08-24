/**
 * Pure Object-Based Model System for Coherent.js
 * 
 * @fileoverview Core model system using pure JavaScript objects for consistency
 */

import { QueryBuilder } from './query-builder.js';

/**
 * Create model instance
 * 
 * @param {DatabaseManager} db - Database manager instance
 * @returns {Object} Model instance
 */
export function createModel(db) {
  const models = new Map();

  // Helper functions
  function validateModelDefinition(definition) {
    if (!definition.tableName) {
      throw new Error('Model must have a tableName');
    }
    
    if (!definition.attributes || typeof definition.attributes !== 'object') {
      throw new Error('Model must have attributes object');
    }
  }

  function createInstance(modelName, attributes) {
    const model = models.get(modelName);
    if (!model) {
      throw new Error(`Model '${modelName}' not found`);
    }

    const instance = { ...attributes };

    // Add instance methods
    if (model.methods) {
      Object.entries(model.methods).forEach(([methodName, method]) => {
        instance[methodName] = method.bind(instance);
      });
    }

    // Add save method
    instance.save = async () => {
      const primaryKey = model.primaryKey || 'id';
      const id = instance[primaryKey];

      if (id) {
        // Update existing
        await model.updateWhere({ [primaryKey]: id }, instance);
      } else {
        // Create new
        const result = await model.query({
          insert: instance
        });
        if (result.insertId) {
          instance[primaryKey] = result.insertId;
        }
      }

      return instance;
    };

    // Add delete method
    instance.delete = async () => {
      const primaryKey = model.primaryKey || 'id';
      const id = instance[primaryKey];
      
      if (!id) {
        throw new Error('Cannot delete instance without primary key');
      }

      return await model.deleteWhere({ [primaryKey]: id });
    };

    return instance;
  }

  function createModel(name, definition) {
    const model = {
      name,
      db,
      ...definition,

      // Core query method
      query: async (config) => {
        if (!config.from && definition.tableName) {
          config.from = definition.tableName;
        }
        
        const result = await QueryBuilder.execute(db, config);
        
        // Convert results to model instances for SELECT queries
        if (config.select && result.rows) {
          return result.rows.map(row => createInstance(name, row));
        }
        
        return result;
      },

      // Convenience methods
      find: async (id) => {
        const results = await model.query({
          select: '*',
          where: { [definition.primaryKey || 'id']: id },
          limit: 1
        });
        return results.length > 0 ? results[0] : null;
      },

      all: async () => {
        return await model.query({ select: '*' });
      },

      where: async (config) => {
        return await model.query(config);
      },

      create: async (attributes) => {
        const result = await model.query({
          insert: attributes
        });
        
        // Return created instance with ID
        if (result.insertId) {
          return await model.find(result.insertId);
        }
        
        return createInstance(name, attributes);
      },

      updateWhere: async (conditions, updates) => {
        const result = await model.query({
          update: updates,
          where: conditions
        });
        return result.affectedRows || 0;
      },

      deleteWhere: async (conditions) => {
        const result = await model.query({
          delete: true,
          where: conditions
        });
        return result.affectedRows || 0;
      }
    };

    // Add static methods if defined
    if (definition.statics) {
      Object.entries(definition.statics).forEach(([methodName, method]) => {
        model[methodName] = method.bind(model);
      });
    }

    return model;
  }

  return {
    /**
     * Register a model with pure object definition
     * 
     * @param {string} name - Model name
     * @param {Object} definition - Model definition object
     * @returns {Object} Enhanced model object
     */
    registerModel(name, definition) {
      validateModelDefinition(definition);
      
      const model = createModel(name, definition);
      models.set(name, model);
      
      return model;
    },

    /**
     * Execute multi-model queries
     */
    async execute(queryObject) {
      const results = {};
      
      for (const [modelName, queryConfig] of Object.entries(queryObject)) {
        const model = models.get(modelName);
        if (!model) {
          throw new Error(`Model '${modelName}' not found`);
        }
        
        results[modelName] = await model.query(queryConfig);
      }
      
      return results;
    },

    /**
     * Get registered model
     */
    getModel(name) {
      return models.get(name);
    }
  };
}
