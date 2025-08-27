/**
 * Pure Object-based Query Builder for Coherent.js Database Layer
 * 
 * @fileoverview Provides pure JavaScript object structure for building database queries
 * with a declarative, object-based approach.
 */

/**
 * Creates a database query configuration object
 * 
 * @typedef {Object} QueryConfig
 * @property {string} [table] - The table to query
 * @property {string|string[]} [select] - Columns to select
 * @property {Object} [where] - Query conditions
 * @property {Object} [orderBy] - Sort configuration
 * @property {number} [limit] - Maximum number of results
 * @property {number} [offset] - Number of rows to skip
 * @property {Object} [insert] - Data to insert
 * @property {Object} [update] - Data to update
 * @property {boolean} [delete] - Whether to delete
 */

/**
 * Creates a query configuration object
 * 
 * @param {QueryConfig} config - Query configuration
 * @returns {QueryConfig} The query configuration object
 * 
 * @example
 * // Basic select
 * const userQuery = createQuery({
 *   table: 'users',
 *   select: ['id', 'name', 'email'],
 *   where: { active: true },
 *   orderBy: { created_at: 'DESC' },
 *   limit: 10
 * });
 * 
 * // Insert
 * const insertQuery = createQuery({
 *   table: 'users',
 *   insert: { name: 'John', email: 'john@example.com' }
 * });
 * 
 * // Update
 * const updateQuery = createQuery({
 *   table: 'users',
 *   update: { last_login: new Date() },
 *   where: { id: 1 }
 * });
 * 
 * // Delete
 * const deleteQuery = createQuery({
 *   table: 'users',
 *   where: { inactive_days: { '>': 365 } },
 *   delete: true
 * });
 */
export function createQuery(config) {
  return { ...config };
}

/**
 * Executes a query using the provided configuration
 * 
 * @param {Object} db - Database connection/manager
 * @param {QueryConfig} query - Query configuration
 * @returns {Promise<*>} Query result
 */
export async function executeQuery(db, query) {
  const { sql, params } = buildSQL(query);
  return await db.query(sql, params);
}

// Internal SQL building functions
function buildSQL(query) {
  const params = [];
  let sql = '';
  
  if (query.insert) {
    sql = buildInsertSQL(query, params);
  } else if (query.update) {
    sql = buildUpdateSQL(query, params);
  } else if (query.delete) {
    sql = buildDeleteSQL(query, params);
  } else {
    sql = buildSelectSQL(query, params);
  }
  
  return { sql, params };
}

function buildSelectSQL(query, params) {
  const columns = Array.isArray(query.select) 
    ? query.select.join(', ')
    : (query.select || '*');
    
  let sql = `SELECT ${columns} FROM ${query.table}`;
  
  if (query.where) {
    const whereClause = buildWhereClause(query.where, params);
    if (whereClause) sql += ` WHERE ${whereClause}`;
  }
  
  if (query.orderBy) {
    sql += ` ORDER BY ${  Object.entries(query.orderBy)
      .map(([col, dir]) => `${col} ${dir.toUpperCase()}`)
      .join(', ')}`;
  }
  
  if (query.limit) sql += ` LIMIT ${query.limit}`;
  if (query.offset) sql += ` OFFSET ${query.offset}`;
  
  return sql;
}

function buildInsertSQL(query, params) {
  const columns = Object.keys(query.insert);
  const placeholders = columns.map(() => '?').join(', ');
  
  params.push(...Object.values(query.insert));
  
  return `INSERT INTO ${query.table} (${columns.join(', ')}) VALUES (${placeholders})`;
}

function buildUpdateSQL(query, params) {
  const setClause = Object.entries(query.update)
    .map(([col]) => `${col} = ?`)
    .join(', ');
    
  params.push(...Object.values(query.update));
  
  let sql = `UPDATE ${query.table} SET ${setClause}`;
  
  if (query.where) {
    const whereClause = buildWhereClause(query.where, params);
    if (whereClause) sql += ` WHERE ${whereClause}`;
  }
  
  return sql;
}

function buildDeleteSQL(query, params) {
  let sql = `DELETE FROM ${query.table}`;
  
  if (query.where) {
    const whereClause = buildWhereClause(query.where, params);
    if (whereClause) sql += ` WHERE ${whereClause}`;
  }
  
  return sql;
}

function buildWhereClause(conditions, params, operator = 'AND') {
  if (!conditions) return '';
  
  const clauses = [];
  
  for (const [key, value] of Object.entries(conditions)) {
    if (value === undefined) continue;
    
    // Handle logical operators at the top level
    if (key === '$or' && Array.isArray(value)) {
      const orClauses = value.map(c => `(${buildWhereClause(c, params)})`);
      clauses.push(`(${orClauses.join(' OR ')})`);
    } else if (key === '$and' && Array.isArray(value)) {
      const andClauses = value.map(c => `(${buildWhereClause(c, params)})`);
      clauses.push(`(${andClauses.join(' AND ')})`);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle field operators like { '>': 10 } or { 'in': [1, 2, 3] }
      for (const [op, val] of Object.entries(value)) {
        if (op === 'in' && Array.isArray(val)) {
          const placeholders = val.map(() => '?').join(', ');
          clauses.push(`${key} IN (${placeholders})`);
          params.push(...val);
        } else if (op === 'between' && Array.isArray(val) && val.length === 2) {
          clauses.push(`${key} BETWEEN ? AND ?`);
          params.push(...val);
        } else if (['>', '>=', '<', '<=', '!=', '<>', 'LIKE'].includes(op)) {
          clauses.push(`${key} ${op} ?`);
          params.push(val);
        }
      }
    } else if (value === null) {
      clauses.push(`${key} IS NULL`);
    } else {
      clauses.push(`${key} = ?`);
      params.push(value);
    }
  }
  
  return clauses.join(` ${operator} `);
}

// For backwards compatibility
export const QueryBuilder = {
  create: createQuery,
  execute: executeQuery
};
