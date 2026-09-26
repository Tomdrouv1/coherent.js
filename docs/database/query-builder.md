# Database Query Builder

Build database queries with plain JavaScript objects. For the full list of options and operators, see the [Query Builder API](query-builder-api.md).

## Philosophy: Pure Object Queries

A query is a plain object describing the table, the columns and the conditions. `executeQuery(db, query)` validates it, turns it into SQL with bound parameters and runs it:

```javascript
import { createDatabaseManager, executeQuery } from '@coherent.js/database';

const db = createDatabaseManager({ type: 'sqlite', database: ':memory:' });
await db.connect();

const { rows } = await executeQuery(db, {
  table: 'users',
  select: ['id', 'name', 'email'],
  where: { active: true, role: 'admin' },
  orderBy: { created_at: 'DESC' },
  limit: 10
});
// SELECT id, name, email FROM users WHERE active = ? AND role = ? ORDER BY created_at DESC LIMIT 10
```

Values are always sent as parameters. Everything else that ends up in the SQL text — table and column names, aliases, join conditions, sort directions, `limit` / `offset`, operators — is validated, and anything that does not match throws before the query reaches the database. `createQuery(config)` simply returns a copy of the object, so queries can be built ahead of time and executed later.

## SELECT Queries

```javascript
// All columns
await executeQuery(db, { table: 'users' });

// Specific columns, aliases and aggregates
await executeQuery(db, { table: 'users', select: ['id', 'full_name AS name', 'email'] });
await executeQuery(db, { table: 'users', select: ['COUNT(*) AS total'], where: { active: true } });

// An object maps aliases to columns
await executeQuery(db, { table: 'orders', select: { orderCount: 'COUNT(*)', revenue: 'SUM(total)' } });
```

Select entries may be a column (`name` or `table.name`), `*`, `table.*`, or `COUNT` / `SUM` / `AVG` / `MIN` / `MAX` of a column, each optionally followed by `AS alias`. Other SQL expressions (`DATE(created_at)`, `GROUP BY`, `HAVING`, subqueries) are not part of the builder: use `db.query(sql, params)` for them.

## WHERE Conditions

```javascript
// Equality (null matches NULL)
where: { active: true, role: 'admin', deleted_at: null }

// Comparison operators
where: {
  price: { '>': 100 },
  stock: { '>=': 10 },
  category: { '!=': 'deprecated' },
  rating: { '<': 3 }
}

// Lists, ranges and patterns
where: {
  role: { in: ['admin', 'moderator'] },
  status: { 'not in': ['banned', 'suspended'] },
  age: { between: [18, 65] },
  name: { like: 'John%' },
  email: { ilike: '%@example.com' }   // PostgreSQL
}

// NULL checks
where: {
  deleted_at: null,                 // IS NULL
  verified_at: { '!=': null }       // IS NOT NULL
}
```

Supported operators: `=`, `!=`, `<>`, `>`, `>=`, `<`, `<=`, `like`, `not like`, `ilike`, `not ilike`, `in`, `not in`, `between`, `not between` (any case). An empty `in` list matches nothing.

### Logical Conditions

```javascript
where: {
  active: true,                       // AND active = ?
  $or: [
    { role: 'admin' },
    { role: 'user', premium: true }
  ]
}

where: {
  category: 'electronics',
  $or: [
    { $and: [{ brand: 'Apple' }, { price: { '>': 500 } }] },
    { $and: [{ brand: 'Samsung' }, { rating: { '>=': 4.5 } }] }
  ],
  $not: { discontinued: true }
}
```

### What throws

- an unknown operator (`$gt`, `$in`, `$ne`...) or logical key;
- an `undefined` value (remove the key, or pass `null` to match NULL);
- an array used as a value (use `{ in: [...] }`).

A plain object used as a value is read as an operator object, so **never pass unvalidated request data as a WHERE value**: `where: { id: req.body.id }` lets a client send `{ "id": { ">": 0 } }`.

## INSERT

```javascript
// Single row
const { insertId } = await executeQuery(db, {
  table: 'users',
  insert: { name: 'John Doe', email: 'john@example.com', created_at: new Date() }
});

// Several rows (every row must have the same columns)
await executeQuery(db, {
  table: 'users',
  insert: [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' }
  ]
});

// RETURNING (PostgreSQL, and SQLite 3.35+)
const { rows } = await executeQuery(db, {
  table: 'users',
  insert: { name: 'John', email: 'john@example.com' },
  returning: ['id', 'created_at']
});
```

Columns whose value is `undefined` are left out.

## UPDATE and DELETE

```javascript
await executeQuery(db, {
  table: 'users',
  update: { name: 'John Updated', updated_at: new Date() },
  where: { id: 123 }
});

await executeQuery(db, {
  table: 'users',
  delete: true,
  where: { active: false, last_login: { '<': '2023-01-01' } }
});
```

An UPDATE or DELETE without a `where` throws; pass `allowFullTable: true` to affect every row on purpose. The result carries `affectedRows` (and `rowCount`).

## JOINs

```javascript
await executeQuery(db, {
  table: 'users',
  select: ['users.id', 'users.name', 'profiles.bio'],
  joins: [
    { type: 'inner', table: 'profiles', condition: 'users.id = profiles.user_id' },
    { type: 'left', table: 'orders', alias: 'o', condition: 'users.id = o.user_id' }
  ]
});
```

Join types: `inner`, `left`, `right`, `full`, `cross` (and `left outer`...). A condition is one or more column comparisons joined with `AND`; values are not allowed in it — put them in `where`.

## Sorting and Pagination

```javascript
orderBy: { created_at: 'DESC' }
orderBy: [{ created_at: 'DESC' }, { title: 'ASC' }]
orderBy: ['title', 'created_at DESC']

// Page 6 of 20 rows
await executeQuery(db, { table: 'users', orderBy: { id: 'ASC' }, limit: 20, offset: 100 });
```

Directions must be `ASC` or `DESC`. `limit` and `offset` must be non-negative integers — convert query-string values first (`Number.parseInt(req.query.limit, 10)`).

## Building Queries Dynamically

```javascript
const SORTABLE = new Set(['name', 'created_at']);

function buildUserQuery(filters = {}) {
  const where = {};
  if (typeof filters.role === 'string') where.role = filters.role;
  if (typeof filters.active === 'boolean') where.active = filters.active;
  if (typeof filters.search === 'string' && filters.search) {
    where.$or = [
      { name: { like: `%${filters.search}%` } },
      { email: { like: `%${filters.search}%` } }
    ];
  }

  return {
    table: 'users',
    select: ['id', 'name', 'email'],
    ...(Object.keys(where).length > 0 && { where }),
    ...(SORTABLE.has(filters.sortBy) && {
      orderBy: { [filters.sortBy]: filters.sortDirection === 'DESC' ? 'DESC' : 'ASC' }
    })
  };
}

const { rows } = await executeQuery(db, buildUserQuery({ role: 'admin', search: 'john', sortBy: 'created_at' }));
```

Check the type of every value that comes from a request, and choose identifiers (sort columns...) from an allowlist.

## Transactions

`executeQuery()` accepts anything with a `query(sql, params)` method, including a transaction:

```javascript
const userId = await db.transaction(async (tx) => {
  const { insertId } = await executeQuery(tx, {
    table: 'users',
    insert: { name: 'John', email: 'john@example.com' }
  });
  await executeQuery(tx, { table: 'profiles', insert: { user_id: insertId, bio: 'Hello world' } });
  return insertId;
});
```

## Error Handling

Validation errors are thrown before anything is sent to the database; driver errors are rethrown as `Query failed: <driver message>`:

```javascript
try {
  const { rows } = await executeQuery(db, { table: 'users', where: { id: 123 } });
} catch (error) {
  console.error(error.message);
}
```

## Query Debugging

`debug: true` logs every statement with its parameters:

```javascript
const db = createDatabaseManager({ type: 'sqlite', database: 'app.db', debug: true });
```

## MongoDB

The object query builder generates SQL. With `type: 'mongodb'`, use the driver's collection API through `db.collection(name)` (see the [database guide](index.md#mongodb)).

## Next Steps

- [Database guide](index.md) - Connections, transactions, migrations and models
- [Query Builder API](query-builder-api.md) - Every option and operator
