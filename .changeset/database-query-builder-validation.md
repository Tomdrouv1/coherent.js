---
"@coherent.js/database": minor
---

Harden the object query builder (`createQuery` / `executeQuery`) against SQL injection and silently dropped conditions.

Values were already bound as parameters, but everything else was interpolated into the SQL text unchecked, and conditions the builder did not understand were dropped without a word. `{ table: 'users', delete: true, where: { id: undefined } }` ran `DELETE FROM users`.

- Table names, columns, aliases, WHERE keys, ORDER BY columns and RETURNING columns must be identifiers (`name` or `table.name`). Select entries may also be `*`, `table.*` or `COUNT|SUM|AVG|MIN|MAX(column)`, each optionally with `AS alias`. Join types are whitelisted and join conditions must be column comparisons joined with `AND`.
- ORDER BY directions must be `ASC` or `DESC` (any case). `orderBy` also accepts the documented array forms (`['name', 'created_at DESC']`, `[{ created_at: 'DESC' }]`).
- `LIMIT` and `OFFSET` must be non-negative integers.
- WHERE operators are whitelisted: `=`, `!=`, `<>`, `>`, `>=`, `<`, `<=`, `like`, `not like`, `ilike`, `not ilike`, `in`, `not in`, `between`, `not between` (any case). `$not` is now supported alongside `$or` / `$and`. `{ '=': null }` / `{ '!=': null }` become `IS NULL` / `IS NOT NULL`, and an empty `in` list matches nothing instead of producing `IN ()`.
- `insert` accepts an array of rows, `returning` adds a `RETURNING` clause, and `undefined` columns are left out of INSERT and UPDATE data.

**Behavior change:** the builder now throws, before anything reaches the database, on:

- an identifier, alias, select expression, join or ORDER BY direction that does not match the rules above;
- a `limit` / `offset` that is not a non-negative integer (numeric strings such as `'10'` included -- convert them first);
- an unknown WHERE operator (e.g. `$ne`) or logical key, an `undefined` WHERE value or operand, an empty operator object, an empty `$or` / `$and`, or an array used as a plain value (use `{ in: [...] }`);
- an UPDATE or DELETE without a WHERE clause -- pass `allowFullTable: true` to affect every row on purpose;
- an unknown query option (e.g. `groupBy`, which was ignored) or a select-only option (`limit`, `orderBy`, ...) on an insert, update or delete;
- a query without a table.

A plain object used as a WHERE value is read as an operator object, so do not pass unvalidated request bodies as WHERE values.
