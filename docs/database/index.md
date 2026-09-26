# Database Integration Layer

`@coherent.js/database` connects Coherent.js applications to SQLite, PostgreSQL, MySQL and MongoDB: a connection manager with pooling and health checks, an object query builder, transactions, migrations, a small `Model` class and router middleware.

## Features

- **Multi-Database Support**: SQLite, PostgreSQL, MySQL, MongoDB (and an in-memory adapter for tests)
- **Object Query Builder**: queries are plain objects; values are bound as parameters and identifiers, operators and limits are validated
- **Transactions**: manual or callback-style, with isolation levels
- **Migrations**: schema builder with per-dialect DDL, batches and rollbacks
- **Models**: a `Model` base class with casting, validation and relationships
- **Middleware**: attach the database, a transaction, a model or pagination to requests

> **Stability:** `Model` and the migration runner are young APIs and may still change. SQLite uses a single connection, so concurrent transactions are not supported there: a second transaction started before the first finishes fails.

## Quick Start

### Installation

```bash
pnpm add @coherent.js/database

# Install the driver for your database (optional peer dependencies)
pnpm add sqlite3   # type: 'sqlite'
pnpm add pg        # type: 'postgresql'
pnpm add mysql2    # type: 'mysql'
pnpm add mongodb   # type: 'mongodb'
```

### Basic Setup

```javascript
import { createDatabaseManager } from '@coherent.js/database';

const db = createDatabaseManager({
  type: 'postgresql',
  host: 'localhost',
  database: 'myapp',
  username: 'app',
  password: process.env.PGPASSWORD,
  pool: { min: 2, max: 10 }
});

await db.connect();
const { rows } = await db.query('SELECT id, name FROM users WHERE active = ?', [true]);
await db.close();
```

Use `?` placeholders on every database; the PostgreSQL adapter converts them to `$1, $2...` (a `?` inside a string literal, identifier or comment is left alone; write the JSONB key-exists operator as `??`).

The package has no default export; import what you need by name.

## Database Configuration

```javascript
// SQLite (the file is created if needed; ':memory:' for a throwaway database)
{ type: 'sqlite', database: './app.db' }

// PostgreSQL
{ type: 'postgresql', host: 'localhost', port: 5432, database: 'myapp', username: 'postgres', password: '...', ssl: false }

// MySQL
{ type: 'mysql', host: 'localhost', port: 3306, database: 'myapp', username: 'root', password: '...' }

// MongoDB
{ type: 'mongodb', host: 'localhost', port: 27017, database: 'myapp' }

// In memory (tests)
{ type: 'memory' }
```

Common options: `pool` (`min`, `max`, `acquireTimeoutMillis`, `idleTimeoutMillis`...), `debug` (log every query), `healthCheck: false` and `healthCheckInterval` (ms, default 30000). After `connect()`, health checks run periodically and emit `healthCheck` events with `status: 'healthy' | 'unhealthy'`; they do not keep the process alive.

`db.query()` resolves to `{ rows, rowCount, affectedRows, insertId }` (the fields a driver can report).

## Query Builder

Queries are plain objects run with `executeQuery(db, query)`:

```javascript
import { executeQuery } from '@coherent.js/database';

const { rows } = await executeQuery(db, {
  table: 'users',
  select: ['id', 'name', 'email'],
  where: { active: true, age: { '>': 18 } },
  orderBy: { created_at: 'DESC' },
  limit: 10
});

await executeQuery(db, { table: 'users', insert: { name: 'Jane', email: 'jane@example.com' } });
await executeQuery(db, { table: 'users', update: { active: false }, where: { id: 42 } });
await executeQuery(db, { table: 'users', delete: true, where: { id: 42 } });
```

Everything that is not a value is validated before anything reaches the database: identifiers, operators, `orderBy` directions, `limit` / `offset` (non-negative integers), and UPDATE / DELETE without a `where` (pass `allowFullTable: true` to affect every row on purpose). See the [Query Builder guide](query-builder.md) and the [Query Builder API](query-builder-api.md).

## Transactions

```javascript
// Callback form: commits when the callback resolves, rolls back when it throws
const user = await db.transaction(async (tx) => {
  const { insertId } = await tx.query('INSERT INTO users (name) VALUES (?)', ['John']);
  await tx.query('INSERT INTO profiles (user_id) VALUES (?)', [insertId]);
  return insertId;
});

// Manual form
const tx = await db.transaction({ isolationLevel: 'SERIALIZABLE' });
try {
  await tx.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [10, 1]);
  await tx.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [10, 2]);
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

`isolationLevel` must be one of `READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ` or `SERIALIZABLE`; `readOnly: true` starts a read-only transaction. SQLite accepts `mode: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE'`. The MongoDB transaction exposes `tx.session`; pass `{ session: tx.session }` to driver calls on `tx.collection(name)`.

## Migrations

Migration files export `up(schema)` and `down(schema)`:

```javascript
// migrations/20240101000000_create_users_table.js
export async function up(schema) {
  await schema.createTable('users', (table) => {
    table.id();
    table.string('name').notNull();
    table.string('email').unique().notNull();
    table.integer('team_id').references('teams.id');
    table.boolean('active').default(true);
    table.timestamps();
  });
}

export async function down(schema) {
  await schema.dropTable('users');
}
```

```javascript
import { createMigration, runMigrations } from '@coherent.js/database';

const applied = await runMigrations(db, { directory: './migrations' }); // names of the applied migrations

const migrations = createMigration(db, { directory: './migrations' });
await migrations.create('create_posts_table');  // writes a timestamped file
await migrations.status();                      // applied and pending migrations
await migrations.rollback(1);                   // undo the most recent batch
```

- The directory resolves against the working directory; a file that fails to import makes `run()`, `rollback()` and `status()` throw.
- DDL follows the database type (`SERIAL` on PostgreSQL, `AUTO_INCREMENT` on MySQL); pass `{ dialect }` to override it. MongoDB is not supported.
- Each migration runs in a transaction when the database supports them; `{ transactional: false }` turns that off.
- Column builders: `id()`, `string(name, length?)`, `text()`, `integer()`, `boolean()`, `datetime()`, `timestamps()`, with `.notNull()`, `.unique()`, `.default(value)`, `.defaultRaw(sql)` and `.references('table.column')`. `schema.raw(sql, params)` runs anything else.

## Models

### The `Model` class

```javascript
import { Model } from '@coherent.js/database/model';

class Post extends Model {
  static tableName = 'posts';
}

class User extends Model {
  static tableName = 'users';
  static fillable = ['name', 'email', 'age'];
  static hidden = ['password_hash'];
  static casts = { age: 'number', active: 'boolean' };
  static validationRules = {
    name: { required: true, minLength: 2 },
    email: { required: true, email: true }
  };
  static relationships = {
    posts: { type: 'hasMany', model: Post, foreignKey: 'user_id' }
  };
}

User.setDatabase(db);
Post.setDatabase(db);

const user = await User.create({ name: 'Ada', email: 'ada@example.com', age: 36 });
const found = await User.find(user.get('id'));      // null when no row matches
const admins = await User.where({ role: 'admin' });  // equality conditions only
found.set('name', 'Ada Lovelace');
await found.save();
const posts = await found.posts();                   // relationship accessor
await User.updateWhere({ active: false }, { archived: true }); // affected-row count
await found.delete();
```

- Every query method throws when no database is set (`setDatabase(db)`); `find()` returns `null` and `findOrFail()` throws when nothing matches.
- `where()`, `updateWhere()` and `deleteWhere()` accept `{ column: value }` equality only and reject operator objects and arrays, so a request body cannot inject an operator; use `executeQuery()` for anything else. `updateWhere()` / `deleteWhere()` require a condition.
- `save()` validates first (it throws with `error.errors` on failure), adds `created_at` / `updated_at` unless `static timestamps = false`, and reads the new primary key from the driver. `create()`, `save()` and `delete()` accept `{ transaction: tx }`.
- Relationships (`hasMany`, `hasOne`, `belongsTo`) run real queries; `model` is the related class.

### The model registry

`createModel(db)` returns a registry of plain-object models:

```javascript
import { createModel } from '@coherent.js/database';

const models = createModel(db);
const Users = models.registerModel('User', {
  tableName: 'users',
  attributes: { id: { type: 'integer' }, name: { type: 'string' } },
  methods: { greet() { return `Hello ${this.name}`; } }
});

const ada = await Users.create({ name: 'Ada' });
ada.greet();                          // 'Hello Ada'
await Users.where({ select: '*', where: { name: 'Ada' } });
```

## Router Integration

```javascript
import { withDatabase, withTransaction, withModel, withPagination } from '@coherent.js/database';
```

| Middleware | Adds |
| --- | --- |
| `withDatabase(db)` | `req.db`, `req.dbQuery(sql, params)`, `req.transaction(callback)`; connects if needed |
| `withTransaction(db, { isolationLevel, readOnly })` | `req.tx`, committed when the handler finishes successfully and rolled back on an error or an error status |
| `withModel(ModelClass, paramName = 'id', requestKey?)` | Loads `ModelClass.find(req.params[paramName])` into `req[requestKey ?? modelname]`; a missing record is passed to `next()` as an error with `status: 404` |
| `withPagination({ defaultLimit, maxLimit })` | `req.pagination = { page, limit, offset, hasPrev, ... }` from `?page=&limit=` |

```javascript
import express from 'express';

const app = express();

app.get('/users/:id', withModel(User), (req, res) => res.json(req.user));

app.get('/users', withPagination({ defaultLimit: 20 }), async (req, res) => {
  const { rows } = await executeQuery(db, {
    table: 'users',
    limit: req.pagination.limit,
    offset: req.pagination.offset
  });
  res.json({ data: rows, pagination: req.pagination });
});

app.post('/teams', express.json(), withTransaction(db), async (req, res) => {
  await req.tx.query('INSERT INTO teams (name) VALUES (?)', [req.body.name]);
  res.status(201).json({ ok: true }); // committed once the response finishes
});
```

`withDatabase`, `withTransaction` and `withPagination` also work as middleware in the `@coherent.js/api` router, which calls them without relying on Express. `@coherent.js/database/middleware` also exports `withQueryValidation`, `withHealthCheck` and `withConnectionPool`.

## MongoDB

With `type: 'mongodb'`, use the driver's collection API:

```javascript
const users = db.collection('users');
await users.insertOne({ name: 'John', active: true });
const active = await users.find({ active: true }).toArray();
```

## Best Practices

1. **Use migrations** for every schema change
2. **Never pass request bodies as `where` values**: a plain object is read as an operator object
3. **Use transactions** for operations that must succeed or fail together
4. **Keep credentials in the environment**
5. **Back up with your database's own tools** (the package has no backup helpers)
