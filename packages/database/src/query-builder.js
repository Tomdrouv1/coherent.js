/**
 * Pure Object-based Query Builder for Coherent.js Database Layer
 *
 * @fileoverview Provides pure JavaScript object structure for building database queries
 * with a declarative, object-based approach.
 *
 * Values are always sent to the driver as bound parameters (`?`). Everything that ends
 * up in the SQL text itself -- table and column names, aliases, join conditions, sort
 * directions, LIMIT/OFFSET and operators -- is validated, and anything that does not
 * match the expected shape throws instead of being interpolated.
 *
 * A plain object used as a WHERE value is read as an operator object
 * (`{ age: { '>': 18 } }`). Do not pass unvalidated request bodies as WHERE values:
 * a client could send an operator object where a scalar was expected.
 */

/**
 * Creates a database query configuration object
 *
 * @typedef {Object} QueryConfig
 * @property {string|{table: string, alias?: string}} [table] - The table to query
 * @property {string|{table: string, alias?: string}} [from] - Alias of `table`
 * @property {string} [alias] - Alias for `table` in SELECT queries
 * @property {string|string[]|Object<string, string>} [select] - Columns to select
 * @property {Array<Object>} [joins] - Joins: `{ type, table, alias, condition }`
 * @property {Object} [where] - Query conditions
 * @property {Object|string|string[]} [orderBy] - Sort configuration
 * @property {number} [limit] - Maximum number of results (non-negative integer)
 * @property {number} [offset] - Number of rows to skip (non-negative integer)
 * @property {Object|Object[]} [insert] - Data to insert
 * @property {Object} [update] - Data to update
 * @property {boolean} [delete] - Whether to delete
 * @property {string|string[]} [returning] - Columns to return from INSERT/UPDATE/DELETE
 * @property {boolean} [allowFullTable] - Allow UPDATE/DELETE without a WHERE clause
 */

const IDENTIFIER_SOURCE = '[A-Za-z_][A-Za-z0-9_]*(?:\\.[A-Za-z_][A-Za-z0-9_]*)?';
const IDENTIFIER = new RegExp(`^${IDENTIFIER_SOURCE}$`);
const ALIAS = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TABLE_STAR = /^[A-Za-z_][A-Za-z0-9_]*\.\*$/;
const AGGREGATE = new RegExp(`^(?:COUNT|SUM|AVG|MIN|MAX)\\(\\s*(?:DISTINCT\\s+)?(?:\\*|${IDENTIFIER_SOURCE})\\s*\\)$`, 'i');
const SELECT_ALIAS = /^(.+?)\s+AS\s+([A-Za-z_][A-Za-z0-9_]*)$/i;
const COMPARISON = `${IDENTIFIER_SOURCE}\\s*(?:=|<>|!=|<=|>=|<|>)\\s*${IDENTIFIER_SOURCE}`;
const JOIN_CONDITION = new RegExp(`^${COMPARISON}(?:\\s+AND\\s+${COMPARISON})*$`, 'i');
const JOIN_TYPES = new Set(['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'LEFT OUTER', 'RIGHT OUTER', 'FULL OUTER']);

const QUERY_KEYS = new Set([
  'table', 'from', 'alias', 'select', 'joins', 'where', 'orderBy', 'limit', 'offset',
  'insert', 'update', 'delete', 'returning', 'allowFullTable'
]);

const SUPPORTED_OPERATORS = '=, !=, <>, >, >=, <, <=, like, not like, ilike, not ilike, in, not in, between, not between';

function formatValue(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Assert that a value is a safe SQL identifier (`name` or `table.name`).
 *
 * @param {*} name - Identifier to check
 * @param {string} [context='identifier'] - What the identifier is used for, for the error message
 * @returns {string} The identifier
 * @throws {Error} If the identifier contains anything but letters, digits, underscores and one dot
 */
export function assertIdentifier(name, context = 'identifier') {
  if (typeof name !== 'string' || !IDENTIFIER.test(name)) {
    throw new Error(
      `Invalid SQL identifier for ${context}: ${formatValue(name)}. ` +
      'Identifiers may only contain letters, digits and underscores, optionally qualified as table.column.'
    );
  }
  return name;
}

function assertAlias(alias, context) {
  if (typeof alias !== 'string' || !ALIAS.test(alias)) {
    throw new Error(`Invalid SQL alias for ${context}: ${formatValue(alias)}. Aliases may only contain letters, digits and underscores.`);
  }
  return alias;
}

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
 * @throws {Error} If the configuration contains an unsafe identifier, an unknown operator,
 *   an undefined WHERE value, an invalid LIMIT/OFFSET, or an UPDATE/DELETE without a WHERE
 *   clause (unless `allowFullTable: true`)
 */
export async function executeQuery(db, query) {
  const { sql, params } = buildSQL(query);
  return await db.query(sql, params);
}

/**
 * Build the SQL text and parameters for a query configuration without running it.
 *
 * @param {QueryConfig} query - Query configuration
 * @returns {{sql: string, params: Array}} SQL with `?` placeholders and its parameters
 */
function buildSQL(query) {
  if (!isPlainObject(query)) {
    throw new Error('Query configuration must be a plain object');
  }

  for (const key of Object.keys(query)) {
    if (!QUERY_KEYS.has(key)) {
      throw new Error(`Unknown query option "${key}". Supported options: ${[...QUERY_KEYS].join(', ')}`);
    }
  }

  const statements = ['insert', 'update', 'delete'].filter((key) => query[key]);
  if (statements.length > 1) {
    throw new Error(`A query can only be one of insert, update or delete; got ${statements.join(' and ')}`);
  }

  if (statements.length === 1) {
    // Silently ignoring e.g. `limit` on a DELETE would affect more rows than asked for.
    const selectOnly = ['select', 'joins', 'orderBy', 'limit', 'offset', 'alias'];
    if (query.insert) selectOnly.push('where', 'allowFullTable');
    const unsupported = selectOnly.filter((key) => query[key] !== undefined);
    if (unsupported.length > 0) {
      throw new Error(`${unsupported.join(', ')} cannot be used with ${statements[0]}`);
    }
  }

  const params = [];
  let sql;

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

function resolveTable(query, { allowAlias }) {
  const ref = query.table ?? query.from;
  if (ref === undefined || ref === null) {
    throw new Error('Query requires a table (set `table` or `from`)');
  }

  if (typeof ref === 'object') {
    const table = assertIdentifier(ref.table, 'table');
    if (ref.alias === undefined) return table;
    if (!allowAlias) throw new Error('Table aliases are only supported in SELECT queries');
    return `${table} ${assertAlias(ref.alias, `table ${table}`)}`;
  }

  const table = assertIdentifier(ref, 'table');
  if (query.alias === undefined) return table;
  if (!allowAlias) throw new Error('Table aliases are only supported in SELECT queries');
  return `${table} ${assertAlias(query.alias, `table ${table}`)}`;
}

function formatSelectColumn(column) {
  if (typeof column !== 'string') {
    throw new Error(`Invalid select column: ${formatValue(column)}`);
  }

  const trimmed = column.trim();
  const aliased = SELECT_ALIAS.exec(trimmed);
  const expression = aliased ? aliased[1].trim() : trimmed;

  const valid = expression === '*' ||
    TABLE_STAR.test(expression) ||
    IDENTIFIER.test(expression) ||
    AGGREGATE.test(expression);

  if (!valid || (aliased && (expression === '*' || TABLE_STAR.test(expression)))) {
    throw new Error(
      `Invalid select column: ${formatValue(column)}. Use a column name (optionally table-qualified), ` +
      '"*", "table.*", or COUNT/SUM/AVG/MIN/MAX of a column, each optionally followed by "AS alias". ' +
      'Use db.query() for raw SQL expressions.'
    );
  }

  return aliased ? `${expression} AS ${aliased[2]}` : expression;
}

function buildColumnList(select) {
  if (select === undefined || select === null) return '*';

  let columns;
  if (typeof select === 'string') {
    columns = select.split(',').map(formatSelectColumn);
  } else if (Array.isArray(select)) {
    columns = select.map(formatSelectColumn);
  } else if (isPlainObject(select)) {
    columns = Object.entries(select).map(([alias, column]) => {
      assertAlias(alias, 'select');
      const expression = formatSelectColumn(column);
      // `{ alias: '*' }` or `{ alias: 'col AS other' }` would render two aliases
      const aliasable = !/ AS /.test(expression) && (!expression.includes('*') || AGGREGATE.test(expression));
      if (!aliasable) {
        throw new Error(`Invalid select column for alias ${alias}: ${formatValue(column)}`);
      }
      return `${expression} AS ${alias}`;
    });
  } else {
    throw new Error(`Invalid select: ${formatValue(select)}`);
  }

  return columns.length > 0 ? columns.join(', ') : '*';
}

function buildJoin(join) {
  if (!isPlainObject(join)) {
    throw new Error(`Invalid join: ${formatValue(join)}`);
  }

  const type = String(join.type ?? 'INNER').trim().replace(/\s+/g, ' ').toUpperCase();
  if (!JOIN_TYPES.has(type)) {
    throw new Error(`Invalid join type: ${formatValue(join.type)}. Supported: ${[...JOIN_TYPES].join(', ')}`);
  }

  const table = assertIdentifier(join.table, 'join table');
  const target = join.alias !== undefined ? `${table} ${assertAlias(join.alias, `join ${table}`)}` : table;

  if (type === 'CROSS') {
    return ` CROSS JOIN ${target}`;
  }

  const condition = join.condition ?? join.on;
  if (typeof condition !== 'string' || !JOIN_CONDITION.test(condition.trim())) {
    throw new Error(
      `Invalid join condition: ${formatValue(condition)}. ` +
      'Use column comparisons such as "users.id = posts.user_id", joined with AND.'
    );
  }

  return ` ${type} JOIN ${target} ON ${condition.trim()}`;
}

function normalizeDirection(direction, column) {
  if (direction === undefined) return 'ASC';
  if (typeof direction === 'string' && /^(asc|desc)$/i.test(direction.trim())) {
    return direction.trim().toUpperCase();
  }
  throw new Error(`Invalid ORDER BY direction for ${column}: ${formatValue(direction)}. Use ASC or DESC.`);
}

function parseOrderString(entry) {
  const parts = entry.trim().split(/\s+/);
  if (parts.length > 2 || parts[0] === '') {
    throw new Error(`Invalid ORDER BY entry: ${formatValue(entry)}. Use "column" or "column ASC|DESC".`);
  }
  return [parts[0], parts[1]];
}

function buildOrderBy(orderBy) {
  let entries;
  if (typeof orderBy === 'string') {
    entries = orderBy.split(',').map(parseOrderString);
  } else if (Array.isArray(orderBy)) {
    entries = orderBy.flatMap((entry) => {
      if (typeof entry === 'string') return [parseOrderString(entry)];
      if (isPlainObject(entry)) return Object.entries(entry);
      throw new Error(`Invalid ORDER BY entry: ${formatValue(entry)}`);
    });
  } else if (isPlainObject(orderBy)) {
    entries = Object.entries(orderBy);
  } else {
    throw new Error(`Invalid orderBy: ${formatValue(orderBy)}`);
  }

  return entries
    .map(([column, direction]) => `${assertIdentifier(column, 'ORDER BY')} ${normalizeDirection(direction, column)}`)
    .join(', ');
}

function formatCount(value, clause) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${clause} must be a non-negative integer, got ${formatValue(value)}`);
  }
  return value;
}

function buildReturning(query) {
  if (query.returning === undefined) return '';
  const columns = Array.isArray(query.returning) ? query.returning : [query.returning];
  if (columns.length === 0) return '';
  const list = columns.map((column) => (column === '*' ? '*' : assertIdentifier(column, 'RETURNING'))).join(', ');
  return ` RETURNING ${list}`;
}

function buildSelectSQL(query, params) {
  let sql = `SELECT ${buildColumnList(query.select)} FROM ${resolveTable(query, { allowAlias: true })}`;

  if (query.joins !== undefined) {
    if (!Array.isArray(query.joins)) {
      throw new Error('joins must be an array');
    }
    for (const join of query.joins) {
      sql += buildJoin(join);
    }
  }

  if (query.where !== undefined) {
    const whereClause = buildWhereClause(query.where, params);
    if (whereClause) sql += ` WHERE ${whereClause}`;
  }

  if (query.orderBy !== undefined && query.orderBy !== null) {
    const orderClause = buildOrderBy(query.orderBy);
    if (orderClause) sql += ` ORDER BY ${orderClause}`;
  }

  if (query.limit !== undefined && query.limit !== null) {
    const limit = formatCount(query.limit, 'LIMIT');
    if (limit > 0) sql += ` LIMIT ${limit}`;
  }

  if (query.offset !== undefined && query.offset !== null) {
    const offset = formatCount(query.offset, 'OFFSET');
    if (offset > 0) sql += ` OFFSET ${offset}`;
  }

  if (query.returning !== undefined) {
    throw new Error('returning is only supported for insert, update and delete queries');
  }

  return sql;
}

/** Entries of a data object, minus keys whose value is undefined. */
function definedEntries(data, statement) {
  if (!isPlainObject(data)) {
    throw new Error(`${statement} data must be a plain object`);
  }
  return Object.entries(data).filter(([, value]) => value !== undefined);
}

function buildInsertSQL(query, params) {
  const table = resolveTable(query, { allowAlias: false });
  const rows = Array.isArray(query.insert) ? query.insert : [query.insert];

  if (rows.length === 0) {
    throw new Error(`INSERT INTO ${table} requires at least one row`);
  }

  const firstEntries = definedEntries(rows[0], 'INSERT');
  if (firstEntries.length === 0) {
    throw new Error(`INSERT INTO ${table} requires at least one column value`);
  }

  const columns = firstEntries.map(([column]) => assertIdentifier(column, `INSERT INTO ${table}`));
  const placeholders = `(${columns.map(() => '?').join(', ')})`;

  const values = rows.map((row, index) => {
    const entries = definedEntries(row, 'INSERT');
    const keys = entries.map(([column]) => column);
    if (keys.length !== columns.length || !keys.every((key) => columns.includes(key))) {
      throw new Error(`INSERT INTO ${table}: row ${index} has different columns than row 0`);
    }
    const byColumn = Object.fromEntries(entries);
    params.push(...columns.map((column) => byColumn[column]));
    return placeholders;
  });

  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(', ')}${buildReturning(query)}`;
}

function requireWhere(query, params, statement, table) {
  const whereClause = query.where === undefined ? '' : buildWhereClause(query.where, params);

  if (!whereClause) {
    if (query.allowFullTable !== true) {
      throw new Error(
        `Refusing to run ${statement} on ${table} without a WHERE clause: it would affect every row. ` +
        'Pass allowFullTable: true to do this on purpose.'
      );
    }
    return '';
  }

  return ` WHERE ${whereClause}`;
}

function buildUpdateSQL(query, params) {
  const table = resolveTable(query, { allowAlias: false });
  const entries = definedEntries(query.update, 'UPDATE');

  if (entries.length === 0) {
    throw new Error(`UPDATE ${table} requires at least one column value`);
  }

  const setClause = entries
    .map(([column]) => `${assertIdentifier(column, `UPDATE ${table}`)} = ?`)
    .join(', ');
  params.push(...entries.map(([, value]) => value));

  return `UPDATE ${table} SET ${setClause}${requireWhere(query, params, 'UPDATE', table)}${buildReturning(query)}`;
}

function buildDeleteSQL(query, params) {
  const table = resolveTable(query, { allowAlias: false });
  return `DELETE FROM ${table}${requireWhere(query, params, 'DELETE', table)}${buildReturning(query)}`;
}

function buildWhereClause(conditions, params) {
  if (!isPlainObject(conditions)) {
    throw new Error(`WHERE conditions must be a plain object, got ${formatValue(conditions)}`);
  }

  const clauses = [];

  for (const [key, value] of Object.entries(conditions)) {
    if (key === '$or' || key === '$and') {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`${key} requires a non-empty array of condition objects`);
      }

      const parts = value.map((condition) => {
        const clause = buildWhereClause(condition, params);
        if (!clause) {
          throw new Error(`Every ${key} entry must contain at least one condition`);
        }
        return `(${clause})`;
      });

      clauses.push(`(${parts.join(key === '$or' ? ' OR ' : ' AND ')})`);
      continue;
    }

    if (key === '$not') {
      const clause = isPlainObject(value) ? buildWhereClause(value, params) : '';
      if (!clause) {
        throw new Error('$not requires a condition object with at least one condition');
      }
      clauses.push(`NOT (${clause})`);
      continue;
    }

    if (key.startsWith('$')) {
      throw new Error(`Unknown logical operator "${key}". Supported: $or, $and, $not`);
    }

    clauses.push(...buildColumnConditions(assertIdentifier(key, 'WHERE'), value, params));
  }

  return clauses.join(' AND ');
}

function buildColumnConditions(column, value, params) {
  if (value === undefined) {
    throw new Error(
      `WHERE value for ${column} is undefined. Remove the key, or pass null to match NULL.`
    );
  }

  if (value === null) {
    return [`${column} IS NULL`];
  }

  if (Array.isArray(value)) {
    throw new Error(`WHERE value for ${column} is an array. Use { in: [...] } to match a list of values.`);
  }

  if (isPlainObject(value)) {
    const operators = Object.entries(value);
    if (operators.length === 0) {
      throw new Error(`WHERE value for ${column} is an empty operator object`);
    }
    return operators.map(([operator, operand]) => buildOperatorCondition(column, operator, operand, params));
  }

  params.push(value);
  return [`${column} = ?`];
}

function assertOperand(operand, column, operator) {
  if (operand === undefined) {
    throw new Error(`Operand of "${operator}" for ${column} is undefined`);
  }
  if (isPlainObject(operand)) {
    throw new Error(`Operand of "${operator}" for ${column} must be a value, got an object`);
  }
  return operand;
}

function buildOperatorCondition(column, rawOperator, operand, params) {
  const operator = String(rawOperator).trim().replace(/\s+/g, ' ').toUpperCase();

  switch (operator) {
    case '=':
    case '!=':
    case '<>':
    case '>':
    case '>=':
    case '<':
    case '<=':
    case 'LIKE':
    case 'NOT LIKE':
    case 'ILIKE':
    case 'NOT ILIKE': {
      assertOperand(operand, column, rawOperator);
      if (operand === null) {
        if (operator === '=') return `${column} IS NULL`;
        if (operator === '!=' || operator === '<>') return `${column} IS NOT NULL`;
        throw new Error(`Operator "${rawOperator}" for ${column} cannot be used with null`);
      }
      if (Array.isArray(operand)) {
        throw new Error(`Operand of "${rawOperator}" for ${column} must be a single value, got an array`);
      }
      params.push(operand);
      return `${column} ${operator} ?`;
    }

    case 'IN':
    case 'NOT IN': {
      if (!Array.isArray(operand)) {
        throw new Error(`Operand of "${rawOperator}" for ${column} must be an array`);
      }
      // `x IN ()` is a syntax error; an empty list matches nothing (IN) or everything (NOT IN).
      if (operand.length === 0) {
        return operator === 'IN' ? '1 = 0' : '1 = 1';
      }
      operand.forEach((item) => params.push(assertOperand(item, column, rawOperator)));
      return `${column} ${operator} (${operand.map(() => '?').join(', ')})`;
    }

    case 'BETWEEN':
    case 'NOT BETWEEN': {
      if (!Array.isArray(operand) || operand.length !== 2) {
        throw new Error(`Operand of "${rawOperator}" for ${column} must be a [low, high] array`);
      }
      operand.forEach((item) => {
        if (assertOperand(item, column, rawOperator) === null) {
          throw new Error(`Bounds of "${rawOperator}" for ${column} cannot be null`);
        }
        params.push(item);
      });
      return `${column} ${operator} ? AND ?`;
    }

    default:
      throw new Error(`Unsupported operator "${rawOperator}" for ${column}. Supported: ${SUPPORTED_OPERATORS}`);
  }
}
