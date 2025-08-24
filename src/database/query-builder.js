/**
 * Pure Object-based Query Builder for Coherent.js Database Layer
 * 
 * @fileoverview Provides pure JavaScript object structure for building database queries
 */

/**
 * QueryBuilder - Build and execute database queries using pure JavaScript object configuration
 * 
 * This class allows developers to configure database queries using pure JS object structure,
 * providing a more intuitive and flexible approach consistent with Coherent.js philosophy.
 * 
 * @example
 * const queryConfig = {
 *   select: ['id', 'name', 'email'],
 *   where: {
 *     active: true,
 *     age: { '>': 18 },
 *     role: { 'in': ['admin', 'moderator'] },
 *     created_at: { 'between': ['2023-01-01', '2023-12-31'] }
 *   },
 *   orderBy: { created_at: 'DESC', name: 'ASC' },
 *   limit: 10,
 *   offset: 20
 * };
 * 
 * const users = await QueryBuilder.execute(db, queryConfig);
 */
export class QueryBuilder {
  constructor(db) {
    this.db = db;
    this.tableName = null;
    this.queryConfig = {};
  }

  /**
   * Execute a query using object configuration
   * 
   * @param {DatabaseManager} db - Database manager instance
   * @param {Object} config - Query configuration object
   * @returns {Promise<*>} Query result
   */
  static async execute(db, config) {
    const qb = this.buildFromConfig(db, config);
    return await qb.execute();
  }

  /**
   * Execute the configured query
   * 
   * @returns {Promise<*>} Query result
   */
  async execute() {
    const sql = this.buildSQL();
    return await this.db.query(sql, this.queryConfig.params || []);
  }

  /**
   * Build SQL from configuration
   * 
   * @returns {string} SQL query string
   */
  buildSQL() {
    const config = this.queryConfig;
    
    if (config.select) {
      return this.buildSelectSQL();
    } else if (config.insert) {
      return this.buildInsertSQL();
    } else if (config.update) {
      return this.buildUpdateSQL();
    } else if (config.delete) {
      return this.buildDeleteSQL();
    }
    
    throw new Error('Invalid query configuration');
  }

  /**
   * Build SELECT SQL
   */
  buildSelectSQL() {
    const config = this.queryConfig;
    const columns = Array.isArray(config.select) ? config.select.join(', ') : config.select;
    let sql = `SELECT ${columns} FROM ${this.tableName}`;
    
    if (config.where) {
      sql += ` WHERE ${this.buildWhereSQL(config.where)}`;
    }
    
    if (config.orderBy) {
      sql += ` ORDER BY ${this.buildOrderBySQL(config.orderBy)}`;
    }
    
    if (config.limit) {
      sql += ` LIMIT ${config.limit}`;
    }
    
    return sql;
  }

  /**
   * Build INSERT SQL
   */
  buildInsertSQL() {
    const config = this.queryConfig;
    const data = config.insert;
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data).map(() => '?').join(', ');
    
    this.queryConfig.params = Object.values(data);
    return `INSERT INTO ${this.tableName} (${columns}) VALUES (${values})`;
  }

  /**
   * Build UPDATE SQL
   */
  buildUpdateSQL() {
    const config = this.queryConfig;
    const data = config.update;
    const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
    
    this.queryConfig.params = Object.values(data);
    let sql = `UPDATE ${this.tableName} SET ${sets}`;
    
    if (config.where) {
      sql += ` WHERE ${this.buildWhereSQL(config.where)}`;
    }
    
    return sql;
  }

  /**
   * Build DELETE SQL
   */
  buildDeleteSQL() {
    const config = this.queryConfig;
    let sql = `DELETE FROM ${this.tableName}`;
    
    if (config.where) {
      sql += ` WHERE ${this.buildWhereSQL(config.where)}`;
    }
    
    return sql;
  }

  /**
   * Build WHERE clause SQL
   */
  buildWhereSQL(where) {
    const conditions = [];
    
    for (const [field, value] of Object.entries(where)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        for (const [operator, operatorValue] of Object.entries(value)) {
          conditions.push(`${field} ${operator} ${this.formatValue(operatorValue)}`);
        }
      } else {
        conditions.push(`${field} = ${this.formatValue(value)}`);
      }
    }
    
    return conditions.join(' AND ');
  }

  /**
   * Build ORDER BY clause SQL
   */
  buildOrderBySQL(orderBy) {
    if (typeof orderBy === 'string') {
      return orderBy;
    }
    
    if (typeof orderBy === 'object') {
      return Object.entries(orderBy)
        .map(([field, direction]) => `${field} ${direction}`)
        .join(', ');
    }
    
    return '';
  }

  /**
   * Format value for SQL
   */
  formatValue(value) {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (value === null) {
      return 'NULL';
    }
    return value;
  }

  /**
   * Build QueryBuilder instance from configuration object
   * 
   * @param {DatabaseManager} db - Database manager instance
   * @param {Object} config - Query configuration object
   * @returns {QueryBuilder} Configured query builder
   */
  static buildFromConfig(db, config) {
    const qb = new QueryBuilder(db);
    
    // Store table name and configuration
    if (config.from) {
      qb.tableName = config.from;
    }
    
    qb.queryConfig = { ...config };
    return qb;
  }

}

/**
 * Query configuration examples and patterns
 */
export const QueryExamples = {
  // Basic SELECT with conditions
  basicSelect: {
    select: ['id', 'name', 'email'],
    from: 'users',
    where: {
      active: true,
      role: 'admin'
    },
    orderBy: { created_at: 'DESC' },
    limit: 10
  },

  // Complex WHERE with operators
  complexWhere: {
    select: '*',
    from: 'products',
    where: {
      price: { '>': 100, '<': 1000 },
      category: { 'in': ['electronics', 'books'] },
      name: { 'like': '%phone%' },
      created_at: { 'between': ['2023-01-01', '2023-12-31'] },
      deleted_at: { 'isNull': true }
    }
  },

  // OR conditions
  orConditions: {
    select: ['id', 'name'],
    from: 'users',
    where: {
      $or: [
        { role: 'admin' },
        { role: 'moderator' },
        { permissions: { 'like': '%manage%' } }
      ]
    }
  },

  // JOIN operations
  withJoins: {
    select: ['u.name', 'p.title', 'c.name as category'],
    from: 'users u',
    join: [
      {
        type: 'INNER',
        table: 'posts p',
        on: { local: 'u.id', operator: '=', foreign: 'p.user_id' }
      },
      {
        type: 'LEFT',
        table: 'categories c',
        on: { local: 'p.category_id', operator: '=', foreign: 'c.id' }
      }
    ],
    where: { 'u.active': true }
  },

  // INSERT operation
  insert: {
    insert: {
      name: 'John Doe',
      email: 'john@example.com',
      active: true,
      created_at: new Date()
    },
    from: 'users'
  },

  // UPDATE operation
  update: {
    update: {
      name: 'Jane Doe',
      updated_at: new Date()
    },
    from: 'users',
    where: { id: 123 }
  },

  // DELETE operation
  delete: {
    delete: true,
    from: 'users',
    where: {
      active: false,
      last_login: { '<': '2022-01-01' }
    }
  },

  // Aggregation with GROUP BY and HAVING
  aggregation: {
    select: ['category', 'COUNT(*) as count', 'AVG(price) as avg_price'],
    from: 'products',
    where: { active: true },
    groupBy: ['category'],
    having: {
      count: { '>': 5 },
      avg_price: { '>': 50 }
    },
    orderBy: { count: 'DESC' }
  }
};
