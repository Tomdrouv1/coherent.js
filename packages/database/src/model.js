/**
 * Pure Object-Based Model System for Coherent.js
 *
 * @fileoverview Core model system using pure JavaScript objects for consistency
 */

import { executeQuery, assertIdentifier } from './query-builder.js';

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * The database a model class queries, or a clear error when none is set.
 *
 * @private
 */
function requireDatabase(ModelClass, options = {}) {
  const db = options.transaction || ModelClass.db;
  if (!db || typeof db.query !== 'function') {
    throw new Error(
      `${ModelClass.name} has no database connection. Call ${ModelClass.name}.setDatabase(db) before querying.`
    );
  }
  return db;
}

/**
 * Number of rows a write changed, as reported by the driver.
 *
 * @private
 */
function affectedRowsOf(result) {
  for (const key of ['affectedRows', 'changes', 'rowCount']) {
    if (typeof result?.[key] === 'number') return result[key];
  }
  return 0;
}

/**
 * Whether inserts must ask for generated keys with RETURNING (PostgreSQL reports no
 * insert id otherwise). A transaction has no config, so check the owning database too.
 *
 * @private
 */
function usesReturning(...databases) {
  return databases.some(db => db?.config?.type === 'postgresql');
}

/**
 * Validate `{ column: value }` equality conditions. Operator objects are rejected so a
 * request body cannot turn `where({ id })` into `id > 0`.
 *
 * @private
 */
function equalityConditions(conditions, context, { requireOne = false } = {}) {
  if (!isPlainObject(conditions)) {
    throw new Error(`${context} expects an object of column/value pairs`);
  }

  const entries = Object.entries(conditions);
  if (requireOne && entries.length === 0) {
    throw new Error(`${context} requires at least one condition`);
  }

  for (const [column, value] of entries) {
    assertIdentifier(column, context);
    if (value === undefined) {
      throw new Error(`${context}: value for ${column} is undefined`);
    }
    if (isPlainObject(value) || Array.isArray(value)) {
      throw new Error(
        `${context}: value for ${column} must be a single value. Use executeQuery() for operators such as in, like or >.`
      );
    }
  }

  return conditions;
}

/**
 * Resolve a relationship's `model`: a model class, or the name of one registered globally.
 *
 * @private
 */
function resolveRelatedModel(model, name, owner) {
  const Related = typeof model === 'function' ? model : (typeof model === 'string' ? globalThis[model] : undefined);
  if (typeof Related !== 'function') {
    throw new Error(
      `Related model ${String(model)} for relationship '${name}' on ${owner} not found. Pass the model class as \`model\`.`
    );
  }
  return Related;
}

/**
 * Model base class for database operations
 *
 * Set a connection with `Model.setDatabase(db)` (a DatabaseManager, a transaction, or
 * anything with `query(sql, params)`); every query method throws without one.
 */
export class Model {
  constructor(attributes = {}) {
    this.attributes = attributes || {};
    this.originalAttributes = { ...this.attributes };
    this._isNew = !this.attributes[this.constructor.primaryKey || 'id'];
    this._isDirty = false;

    // Relationship accessors: user.posts() resolves relationships.posts
    const relationships = this.constructor.relationships || this.constructor.relations || {};
    for (const name of Object.keys(relationships)) {
      if (!(name in this)) {
        Object.defineProperty(this, name, {
          value: () => this.getRelation(name),
          configurable: true,
          writable: true
        });
      }
    }
  }

  static tableName = 'models';
  static attributes = {};
  static db = null;
  static primaryKey = 'id';
  static fillable = [];
  static guarded = [];
  static hidden = [];
  static casts = {};
  static validationRules = {};
  static relations = {};

  /**
   * Build a persisted instance from a database row.
   *
   * @private
   */
  static _fromRow(row) {
    const instance = new this(row);
    instance._isNew = false;
    return instance;
  }

  /**
   * Find a record by primary key.
   *
   * @param {*} id - Primary key value
   * @returns {Promise<Model|null>} The record, or null when no row matches
   */
  static async find(id) {
    const db = requireDatabase(this);
    if (id === undefined || id === null) {
      return null;
    }

    const primaryKey = this.primaryKey || 'id';
    const result = await executeQuery(db, { table: this.tableName, where: { [primaryKey]: id }, limit: 1 });
    const row = result?.rows?.[0];
    return row ? this._fromRow(row) : null;
  }

  static async create(attributes, options = {}) {
    // Apply default values for static attributes
    const withDefaults = { ...attributes };
    if (this.attributes) {
      for (const [key, config] of Object.entries(this.attributes)) {
        if (config.default !== undefined && withDefaults[key] === undefined) {
          withDefaults[key] = config.default;
        }
      }
    }

    const instance = new this(withDefaults);
    await instance.save(options);
    return instance;
  }

  static async findOrFail(id) {
    const instance = await this.find(id);
    if (!instance) {
      throw new Error(`${this.name} with id ${id} not found`);
    }
    return instance;
  }

  static async all() {
    const db = requireDatabase(this);
    const result = await executeQuery(db, { table: this.tableName });
    return (result?.rows || []).map(row => this._fromRow(row));
  }

  /**
   * Find records whose columns equal the given values.
   *
   * @param {Object} conditions - `{ column: value }` pairs (null matches NULL)
   * @returns {Promise<Model[]>} Matching records
   */
  static async where(conditions) {
    const db = requireDatabase(this);
    const where = equalityConditions(conditions, `${this.name}.where()`);
    const result = await executeQuery(db, { table: this.tableName, where });
    return (result?.rows || []).map(row => this._fromRow(row));
  }

  /**
   * Update records whose columns equal the given values.
   *
   * @param {Object} conditions - `{ column: value }` pairs; at least one is required
   * @param {Object} updates - Columns to set
   * @returns {Promise<number>} Number of rows the driver reports as changed
   */
  static async updateWhere(conditions, updates) {
    const db = requireDatabase(this);
    const where = equalityConditions(conditions, `${this.name}.updateWhere()`, { requireOne: true });
    const result = await executeQuery(db, { table: this.tableName, update: updates, where });
    return affectedRowsOf(result);
  }

  /**
   * Delete records whose columns equal the given values.
   *
   * @param {Object} conditions - `{ column: value }` pairs; at least one is required
   * @returns {Promise<number>} Number of rows the driver reports as deleted
   */
  static async deleteWhere(conditions) {
    const db = requireDatabase(this);
    const where = equalityConditions(conditions, `${this.name}.deleteWhere()`, { requireOne: true });
    const result = await executeQuery(db, { table: this.tableName, delete: true, where });
    return affectedRowsOf(result);
  }

  static setDatabase(db) {
    this.db = db;
  }

  // Attribute access methods
  get(key) { return this.attributes[key]; }
  getAttribute(key, defaultValue) { 
    if (this.attributes.hasOwnProperty(key)) {
      return this.attributes[key];
    }
    return arguments.length > 1 ? defaultValue : null;
  }
  
  set(key, value) {
    // Same as setAttribute: casts the value and marks the model dirty so save() persists it
    return this.setAttribute(key, value);
  }
  setAttribute(key, value) {
    const oldValue = this.attributes[key];
    this.attributes[key] = this.castAttribute(key, value);
    if (oldValue !== this.attributes[key]) {
      this._isDirty = true;
    }
    return this;
  }
  
  // Fill methods
  fill(attributes) {
    const fillable = this.constructor.fillable;
    const guarded = this.constructor.guarded;
    
    for (const [key, value] of Object.entries(attributes)) {
      if (fillable.length > 0 && !fillable.includes(key)) {
        this.setAttribute(key, undefined); // Explicitly set filtered attributes to undefined
        continue;
      }
      if (guarded.length > 0 && guarded.includes(key)) {
        this.setAttribute(key, undefined); // Explicitly set guarded attributes to undefined
        continue;
      }
      this.setAttribute(key, value);
    }
    return this;
  }
  
  // Casting
  castAttribute(key, value, type = null) {
    const casts = this.constructor.casts;
    const castType = type || casts[key];
    if (!castType || value === null) return value;
    
    switch (castType) {
      case 'string': return String(value);
      case 'number': return Number(value);
      case 'boolean': return Boolean(value === 'true' || value === true || value === 1);
      case 'date': return new Date(value);
      case 'json': return typeof value === 'string' ? JSON.parse(value) : value;
      case 'array': return Array.isArray(value) ? value : [value];
      default: return value;
    }
  }
  
  // State properties
  get isNew() { return this._isNew; }
  set isNew(value) { this._isNew = value; }
  get isDeleted() { return this._isDeleted || false; }
  get isDirty() { return this._isDirty; }
  set isDirty(value) { this._isDirty = value; }
  
  // Object conversion
  toObject(includeHidden = false) {
    const obj = { ...this.attributes };
    if (!includeHidden) {
      const hidden = this.constructor.hidden;
      hidden.forEach(key => delete obj[key]);
    }
    return obj;
  }
  
  toJSON() {
    return this.toObject();
  }
  
  // Validation
  async validate(options = {}) {
    const rules = this.constructor.validationRules;
    const errors = {};
    
    // Return true if no validation rules
    if (!rules || Object.keys(rules).length === 0) {
      return true;
    }
    
    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = this.getAttribute(field);
      
      // For existing models, only validate fields that are present
      // Skip required validation for missing fields on existing models
      if (!this.isNew && !this.attributes.hasOwnProperty(field)) {
        continue;
      }
      
      // Handle array of validation rules
      if (Array.isArray(fieldRules)) {
        // Check if this is a [function, message] tuple format
        if (fieldRules.length === 2 && typeof fieldRules[0] === 'function' && typeof fieldRules[1] === 'string') {
          const [validator, message] = fieldRules;
          const isValid = validator(value);
          if (!isValid) {
            errors[field] = errors[field] || [];
            errors[field].push(message);
          }
        } else {
          // Handle array of individual rules
          for (const rule of fieldRules) {
            if (rule === 'required' && (value === undefined || value === null || value === '')) {
              errors[field] = errors[field] || [];
              errors[field].push(`${field} is required`);
            }
            
            if (rule === 'email' && value && !value.includes('@')) {
              errors[field] = errors[field] || [];
              errors[field].push(`${field} must be a valid email address`);
            }
            
            if (typeof rule === 'function') {
              const isValid = rule(value);
              if (!isValid) {
                errors[field] = errors[field] || [];
                errors[field].push(`${field} validation failed`);
              }
            }
          }
        }
      }
      
      // Handle object validation rules with constraints
      if (typeof fieldRules === 'object' && !Array.isArray(fieldRules)) {
        if (fieldRules.required && (value === undefined || value === null || value === '')) {
          errors[field] = errors[field] || [];
          errors[field].push(`${field} is required`);
        }
        
        if (fieldRules.email && value && !value.includes('@')) {
          errors[field] = errors[field] || [];
          errors[field].push(`${field} must be a valid email address`);
        }
        
        if (fieldRules.minLength !== undefined) {
          if (typeof value === 'string' && value.length < fieldRules.minLength) {
            errors[field] = errors[field] || [];
            errors[field].push(`${field} must be at least ${fieldRules.minLength} characters`);
          }
        }
        
        if (fieldRules.min !== undefined) {
          if (typeof value === 'number' && value < fieldRules.min) {
            errors[field] = errors[field] || [];
            errors[field].push(`${field} must be at least ${fieldRules.min}`);
          }
        }
        
        if (fieldRules.max !== undefined) {
          if (typeof value === 'string' && value.length > fieldRules.max) {
            errors[field] = errors[field] || [];
            errors[field].push(`${field} must be at most ${fieldRules.max} characters`);
          } else if (typeof value === 'number' && value > fieldRules.max) {
            errors[field] = errors[field] || [];
            errors[field].push(`${field} must be no more than ${fieldRules.max}`);
          }
        }
      }
    }
    
    if (Object.keys(errors).length > 0) {
      this.errors = errors; // Store errors on instance
      
      // If throwOnError is false, just return false
      if (options.throwOnError === false) {
        return false;
      }
      
      // Only throw errors when explicitly requested
      if (options.throwOnError !== true) {
        return false;
      }
      
      // If there are multiple validation errors, use general message
      const totalErrors = Object.keys(errors).length;
      if (totalErrors > 1) {
        const _error = new Error('Validation failed');
        _error.errors = errors;
        throw _error;
      }
      
      // For single field _error, throw with the specific message
      const firstError = Object.values(errors)[0];
      if (Array.isArray(firstError) && firstError[0]) {
        const _error = new Error(firstError[0]);
        _error.errors = errors;
        throw _error;
      }
      
      const _error = new Error('Validation failed');
      _error.errors = errors;
      throw _error;
    }
    
    this.errors = {};
    return true;
  }
  
  /**
   * Insert or update the record.
   *
   * @param {Object} [options={}]
   * @param {boolean} [options.skipValidation] - Skip validate()
   * @param {Object} [options.transaction] - Run the write on this transaction instead of Model.db
   * @returns {Promise<Model>} this
   */
  async save(options = {}) {
    const ModelClass = this.constructor;
    const db = requireDatabase(ModelClass, options);

    if (!options.skipValidation) {
      await this.validate({ throwOnError: true });
    }

    const primaryKey = ModelClass.primaryKey || 'id';

    if (this._isNew) {
      if (this.beforeSave) {
        await this.beforeSave();
        this.beforeSaveCalled = true;
      }
      if (this.beforeCreate) {
        await this.beforeCreate();
        this.beforeCreateCalled = true;
      }

      // Add timestamps for new models
      if (ModelClass.timestamps !== false) {
        this.setAttribute('created_at', new Date());
        this.setAttribute('updated_at', new Date());
      }

      const query = { table: ModelClass.tableName, insert: this.attributes };
      if (usesReturning(db, ModelClass.db)) {
        // PostgreSQL only reports generated keys through RETURNING
        query.returning = primaryKey;
      }
      const result = await executeQuery(db, query);

      const generatedId = result?.insertId ?? result?.rows?.[0]?.[primaryKey];
      if (this.getAttribute(primaryKey) === null && generatedId !== undefined && generatedId !== null) {
        this.setAttribute(primaryKey, generatedId);
      }

      this._isNew = false;
      if (this.afterCreate) {
        await this.afterCreate();
        this.afterCreateCalled = true;
      }
      if (this.afterSave) {
        await this.afterSave();
        this.afterSaveCalled = true;
      }
    } else {
      // Skip update if model is not dirty
      if (!this._isDirty) {
        return this;
      }

      const id = this.getAttribute(primaryKey);
      if (id === null || id === undefined) {
        throw new Error(`Cannot update ${ModelClass.name} without a primary key`);
      }

      if (this.beforeUpdate) await this.beforeUpdate();

      // Update timestamp for existing models
      if (ModelClass.timestamps !== false) {
        this.setAttribute('updated_at', new Date());
      }

      const changes = { ...this.attributes };
      delete changes[primaryKey];
      await executeQuery(db, { table: ModelClass.tableName, update: changes, where: { [primaryKey]: id } });

      if (this.afterUpdate) await this.afterUpdate();
    }

    this._isDirty = false;
    this.originalAttributes = { ...this.attributes };
    return this;
  }

  /**
   * Delete the record.
   *
   * @param {Object} [options={}]
   * @param {Object} [options.transaction] - Run the delete on this transaction instead of Model.db
   * @returns {Promise<boolean>} true
   */
  async delete(options = {}) {
    const ModelClass = this.constructor;
    const primaryKey = ModelClass.primaryKey || 'id';
    const id = this.getAttribute(primaryKey);

    if (id === null || id === undefined) {
      throw new Error('Cannot delete model without primary key');
    }

    const db = requireDatabase(ModelClass, options);

    // Call lifecycle hooks
    if (this.beforeDelete) await this.beforeDelete();

    await executeQuery(db, { table: ModelClass.tableName, delete: true, where: { [primaryKey]: id } });

    this._isDeleted = true;

    if (this.afterDelete) await this.afterDelete();

    return true;
  }

  /**
   * Load a relationship declared in `static relationships`.
   *
   * @param {string} name - Relationship name
   * @returns {Promise<Model[]|Model|null>} Related records (hasMany) or record (hasOne, belongsTo)
   */
  async getRelation(name) {
    const ModelClass = this.constructor;
    const relationships = ModelClass.relationships || ModelClass.relations || {};
    const relation = relationships[name];

    if (!relation) {
      throw new Error(`Relationship '${name}' not defined on ${ModelClass.name}`);
    }

    const Related = resolveRelatedModel(relation.model, name, ModelClass.name);

    switch (relation.type) {
      case 'hasMany':
      case 'hasOne': {
        const localKey = relation.localKey || ModelClass.primaryKey || 'id';
        const foreignKey = relation.foreignKey || `${ModelClass.name.toLowerCase()}_id`;
        const value = this.getAttribute(localKey);

        if (value === null || value === undefined) {
          return relation.type === 'hasMany' ? [] : null;
        }

        const related = await Related.where({ [foreignKey]: value });
        return relation.type === 'hasMany' ? related : (related[0] ?? null);
      }

      case 'belongsTo': {
        const foreignKey = relation.foreignKey || `${Related.name.toLowerCase()}_id`;
        const ownerKey = relation.ownerKey || Related.primaryKey || 'id';
        const value = this.getAttribute(foreignKey);

        if (value === null || value === undefined) {
          return null;
        }

        const related = await Related.where({ [ownerKey]: value });
        return related[0] ?? null;
      }

      default:
        throw new Error(`Unsupported relationship type '${relation.type}' for '${name}' on ${ModelClass.name}`);
    }
  }
}

export function createModel(db) {
  const models = new Map();

  // Helper functions

  /** INSERT config for a model's row, with RETURNING of the primary key on PostgreSQL. */
  function insertQuery(data, primaryKey) {
    return usesReturning(db) ? { insert: data, returning: primaryKey } : { insert: data };
  }

  /** An instance's column values: its own properties minus the attached methods. */
  function instanceData(instance) {
    return Object.fromEntries(
      Object.entries(instance).filter(([, value]) => typeof value !== 'function')
    );
  }

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
      const data = instanceData(instance);

      if (id) {
        // Update existing
        delete data[primaryKey];
        await model.updateWhere({ [primaryKey]: id }, data);
      } else {
        // Create new
        const result = await model.query(insertQuery(data, primaryKey));
        const generatedId = result.insertId ?? result.rows?.[0]?.[primaryKey];
        if (generatedId !== undefined && generatedId !== null) {
          instance[primaryKey] = generatedId;
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
        // Default to the model's table without mutating the caller's config
        const query = config.table || config.from ? { ...config } : { ...config, table: definition.tableName };

        const result = await executeQuery(db, query);

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
        const result = await model.query(insertQuery(attributes, definition.primaryKey || 'id'));

        // Return created instance with ID
        const generatedId = result.insertId ?? result.rows?.[0]?.[definition.primaryKey || 'id'];
        if (generatedId !== undefined && generatedId !== null) {
          return await model.find(generatedId);
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
