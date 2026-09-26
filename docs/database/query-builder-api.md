# Query Builder API

Reference for the object query builder of `@coherent.js/database`. The [Query Builder guide](query-builder.md) explains it with examples.

## Functions

```javascript
import { createQuery, executeQuery } from '@coherent.js/database';
```

| Function | |
| --- | --- |
| `executeQuery(db, query)` | Validates `query`, builds SQL with `?` parameters and runs it with `db.query(sql, params)`. `db` may be a `DatabaseManager` or a transaction. Resolves to the driver result: `{ rows, rowCount, affectedRows, insertId }`. |
| `createQuery(query)` | Returns a shallow copy of `query`. Validation happens when it is executed. |

## Query Options

| Option | Type | |
| --- | --- | --- |
| `table` (or `from`) | `string` \| `{ table, alias? }` | Required. An identifier (`name` or `schema.name`) |
| `alias` | `string` | Table alias (SELECT only) |
| `select` | `string` \| `string[]` \| `{ [alias]: column }` | Default `*`. See [Select entries](#select-entries) |
| `joins` | `Array<{ type?, table, alias?, condition }>` | SELECT only. See [Joins](#joins) |
| `where` | `object` | See [Conditions](#conditions) |
| `orderBy` | `{ column: 'ASC' \| 'DESC' }` \| `Array<string \| object>` \| `string` | SELECT only. `'name'`, `'created_at DESC'`, `[{ created_at: 'DESC' }, 'name']` |
| `limit`, `offset` | non-negative integer | SELECT only. Numeric strings are rejected |
| `insert` | `object` \| `object[]` | Rows to insert; every row must have the same columns; `undefined` values are left out |
| `update` | `object` | Columns to set; `undefined` values are left out |
| `delete` | `true` | Delete matching rows |
| `returning` | `string` \| `string[]` | Adds `RETURNING` to INSERT/UPDATE/DELETE |
| `allowFullTable` | `boolean` | Allow UPDATE/DELETE without `where` |

Any other key (for example `groupBy` or `having`) throws `Unknown query option`. Only one of `insert`, `update` and `delete` may be set, and select-only options (`select`, `joins`, `orderBy`, `limit`, `offset`, `alias`) throw on a write.

## Select entries

- a column: `id`, `users.id`
- `*` or `table.*`
- `COUNT(*)`, `COUNT(DISTINCT col)`, `SUM(col)`, `AVG(col)`, `MIN(col)`, `MAX(col)`
- any of the above except `*` / `table.*` followed by `AS alias`

```javascript
select: ['id', 'full_name AS name', 'COUNT(*) AS total']
select: { name: 'full_name', total: 'COUNT(*)' }   // alias: expression
```

Use `db.query(sql, params)` for other expressions.

## Conditions

| Form | SQL |
| --- | --- |
| `{ col: value }` | `col = ?` |
| `{ col: null }` | `col IS NULL` |
| `{ col: { '>': 1, '<=': 9 } }` | `col > ? AND col <= ?` |
| `{ col: { '=': null } }` / `{ col: { '!=': null } }` | `IS NULL` / `IS NOT NULL` |
| `{ col: { in: [1, 2] } }` / `{ col: { 'not in': [...] } }` | `col IN (?, ?)`; an empty `in` list matches nothing |
| `{ col: { between: [lo, hi] } }` / `'not between'` | `col BETWEEN ? AND ?` |
| `{ col: { like: 'a%' } }` / `'not like'` / `ilike` / `'not ilike'` | `col LIKE ?` |
| `{ $or: [cond, ...] }` / `{ $and: [cond, ...] }` | `((...) OR (...))` |
| `{ $not: cond }` | `NOT (...)` |

Operators are case-insensitive. Keys at the same level are joined with `AND`.

The builder throws on an unknown operator (`$gt`, `$ne`...) or logical key, an `undefined` value or operand, an empty operator object, an empty `$or` / `$and`, and an array used as a plain value. A plain object value is read as an operator object: do not pass unvalidated request data as a value.

## Joins

```javascript
joins: [
  { type: 'inner', table: 'profiles', condition: 'users.id = profiles.user_id' },
  { type: 'left', table: 'orders', alias: 'o', condition: 'users.id = o.user_id AND o.shop_id = users.shop_id' },
  { type: 'cross', table: 'settings' }
]
```

`type` is one of `inner` (default), `left`, `right`, `full`, `cross`, `left outer`, `right outer`, `full outer`. A `condition` (or `on`) is a string of column comparisons (`=`, `<>`, `!=`, `<`, `<=`, `>`, `>=`) joined with `AND`.

## Identifiers

Table names, columns, aliases, WHERE keys, ORDER BY and RETURNING columns must match `[A-Za-z_][A-Za-z0-9_]*`, optionally qualified once (`table.column`). Anything else throws before the query runs.

## PostgreSQL placeholders

The PostgreSQL adapter converts `?` to `$1, $2...`. A `?` inside a string literal, a quoted identifier, a dollar-quoted string or a comment is left alone, and `?|` / `?&` stay operators. Write the JSONB key-exists operator `?` as `??`, or use `jsonb_exists(column, key)`.

## Supported Databases

The builder produces SQL for PostgreSQL, MySQL and SQLite. MongoDB is queried through `db.collection(name)` instead.
