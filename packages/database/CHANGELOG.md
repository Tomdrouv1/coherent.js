# @coherent.js/database

## 2.0.0-rc.0

### Major Changes

- Coherent.js 2.0: the fixes from a full audit of the framework, several of which change behavior callers rely on.
  
  The most likely to need changes in an application:
  
  - Component errors propagate out of `render()` (pass `onError` to replace a failing component).
  - On Node, `provideContext()` throws outside `runWithContext()`: a value provided outside it leaked into the next request on the same connection.
  - Framework adapters no longer render every response as HTML: use `res.coherent()` / `reply.coherent()` / `ctx.coherent()`, or `autoRender: true`.
  - The api requires a JWT secret, and rate limiting keys on the socket address unless `trustProxy` is set.
  - `Model.create()` applies `fillable` / `guarded`.
  - The render cache is opt-in (`enableCache: true`).
  
  `docs/migration/upgrading-from-1.1.md` lists every behavior change with what to do about it; each package's CHANGELOG has the full list of fixes.

### Minor Changes

- 15807dd: Start the connection health checks, and stop the backup helpers from pretending to work.
  
  - `DatabaseManager.connect()` never started its periodic health checks: it looked for `adapter.startHealthChecks` (which no adapter has) and would have called `this.startHealthChecks()` (the method is `startHealthCheck`). Health checks now start after connecting when the adapter can test its connection (`testConnection` or `ping`), run every `healthCheckInterval` ms (default 30000), emit `healthCheck` events with `status: 'healthy' | 'unhealthy'`, stop on `close()`, and do not keep the process alive. Pass `healthCheck: false` to turn them off; an invalid `healthCheckInterval` throws when the manager is created.
  - The internal `createBackup()` / `restoreBackup()` helpers only logged "Backup would be created at ..." and returned. **Behavior change:** they now throw "not implemented"; use the database's own backup and restore tools.
- cf28e51: Fix the migration runners (`createMigration` / `runMigrations` and the `Migration` class).
  
  - Migrations run when `NODE_ENV === 'test'`. The `Migration` class swapped every migration file for a no-op in that case (and whenever a global `vi` existed), so test databases never got their schema.
  - The migrations directory resolves against the working directory and files are imported by file URL. The default `'./migrations'` used to become the bare specifier `migrations/<file>.js` ("Cannot find package 'migrations'"), and `run()` quietly returned `[]`.
  - Calling `status()` before `run()` no longer queues every migration twice (which ran `up()` twice and then failed on the tracking table's unique constraint).
  - The tracking table DDL follows the database type (`postgresql`: `SERIAL` / `TIMESTAMP`, `mysql`: `AUTO_INCREMENT` / `TIMESTAMP`, SQLite otherwise); it was SQLite-only. Table builders render `id()` and `datetime()` per dialect too. Override the detected dialect with `{ dialect }`; document databases (`mongodb`) are rejected.
  - Column defaults are escaped: `.default("O'Brien")` renders `DEFAULT 'O''Brien'`. `timestamps()` defaults to the `CURRENT_TIMESTAMP` expression instead of the string `'CURRENT_TIMESTAMP'`; use the new `.defaultRaw(sql)` for other expressions.
  - `references('table.column')` now creates a `FOREIGN KEY` constraint instead of being ignored.
  - Rollbacks undo the most recent batches, newest migration first (ordered by id rather than by a same-second timestamp). The `Migration` class also rolls back by batch now, like `createMigration`.
  - `Migration#run()` always returns migration names (strings); it returned `{ name }` objects unless `loadMigrations` had been removed. A `migrations` array in the config replaces reading the directory, and already-applied ones are skipped.
  
  **Behavior change:**
  
  - A migration file that cannot be imported (syntax error, missing dependency) now makes `run()`, `rollback()` and `status()` throw `Failed to load migration <file>: ...` instead of being skipped with a warning.
  - Running migrations on a database object without `transaction()` logs a one-time warning that a failed migration can be left half-applied; pass `{ transactional: false }` to run without transactions on purpose.
  - `rollback(steps)` throws unless `steps` is a positive integer.
- 1906107: Make `Model.create()` respect `fillable` / `guarded`, and always insert.
  
  - **Fixed (security):** `create(attributes)` handed its attributes to the constructor, which ignores `fillable` and `guarded`, so `User.create(req.body)` inserted every column the client sent (`role: 'admin'`, `is_admin: true`, an `id` of their choosing). It now applies them like `fill()`.
  - **Fixed:** with a primary key among the attributes, the new instance counted as already saved, so `create({ id: 5, ... })` ran no query at all and returned a record that did not exist. `create()` now always inserts.
  - **Behavior change:** columns missing from a non-empty `fillable` (or listed in `guarded`) are no longer set by `create()`. List them in `fillable`, or set trusted values with `setAttribute()` before `save()`. Defaults from `static attributes` still apply.
- 2633539: Remove the test scaffolding from the `Model` class (`@coherent.js/database/model`): it no longer invents data.
  
  `User.find(424242)` on an empty table returned a fake `{ name: 'John Doe', email: 'john@example.com', ... }` user (any id except 999), `updateWhere` / `deleteWhere` returned 3 / 2 when nothing changed, `withModel` could never 404 because `req.user` became that fake user, `user()` and `posts()` returned hard-coded records on every model, and without a database `all()` returned two fake users and `save()` "succeeded" with `id = 1`. Every new row also got `id = 1` whenever the driver reported no insert id, so a second `save()` overwrote the first row.
  
  - `find()` returns `null` when no row matches; `findOrFail()` throws; `withModel` responds 404.
  - `updateWhere()` / `deleteWhere()` return the affected-row count reported by the driver (`affectedRows`, `changes` or `rowCount`), 0 when nothing changed.
  - `save()` takes the primary key from the driver's `insertId` (or `RETURNING` on PostgreSQL) and never makes one up.
  - Relationships run real queries: `hasMany` / `hasOne` query the related model by foreign key, `belongsTo` loads the owner. `model` may be the related class or the name of a globally registered one. Each declared relationship gets an accessor method (`user.posts()`), replacing the hard-coded `posts()` / `user()` methods.
  - `set()` now behaves like `setAttribute()`: it casts the value and marks the model dirty, so `save()` persists it (it silently did nothing before).
  - `create(attributes, { transaction })`, `save({ transaction })` and `delete({ transaction })` run on the given transaction.
  - Table names and column keys go through the query builder's identifier validation instead of being interpolated.
  
  **Behavior change:**
  
  - Every query method (`find`, `all`, `where`, `updateWhere`, `deleteWhere`, `save`, `delete`) throws `"<Model> has no database connection. Call <Model>.setDatabase(db) before querying."` when no database is set.
  - `where()`, `updateWhere()` and `deleteWhere()` throw on keys that are not identifiers and on values that are objects or arrays (use `executeQuery()` for operators), so a request body cannot inject an operator. `updateWhere()` / `deleteWhere()` throw when given no condition.
  - A relationship whose related model cannot be found throws instead of returning fake records.
- 1718b99: Harden the object query builder (`createQuery` / `executeQuery`) against SQL injection and silently dropped conditions.
  
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
- 8d9089e: Stop transactions and connection retries from leaking pooled connections, and honour transaction options.
  
  - PostgreSQL and MySQL: a transaction whose `BEGIN` failed never released its connection back to the pool. It is released now (PostgreSQL discards the client). A failed `COMMIT` also releases it exactly once and marks the transaction rolled back.
  - `db.transaction(options)` passes `isolationLevel` / `readOnly` to the adapter; `withTransaction(db, options)` used to lose them because `DatabaseManager.transaction()` took no arguments. MySQL now applies both (`SET TRANSACTION ISOLATION LEVEL ...`, `START TRANSACTION READ ONLY`).
  - `db.transaction(async (tx) => ...)` runs the callback in a transaction, commits when it resolves and rolls back when it throws (the callback form was declared in the types but did nothing).
  - `connect()` closes the pool of a failed attempt before retrying; three failed attempts used to leave three open pools.
  - `withTransaction` no longer commits before the handler is done. When `next()` returns a promise it still commits after it resolves. When it does not (Express, whose `next()` returns before an async handler finishes, or a router that calls middleware without `next`), the transaction is committed when the response finishes with a status below 400 and rolled back on an error status or when the connection closes first. A transaction the handler finished itself is left alone.
  
  **Behavior change:**
  
  - `isolationLevel` must be one of `READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE` (any case and spacing); anything else throws before a connection is taken. It was interpolated into `BEGIN` unchecked.
  - `withTransaction` throws, after rolling back, when `next()` does not return a promise and the response has no `once()`/`on()` to report when it ends.
- 8d5a758: Align the TypeScript declarations with the runtime API.
  
  - `createModel(db)` returns a model registry (`registerModel(name, definition)`, `execute()`, `getModel()`); it was declared as `createModel(config)` returning a chainable `Model<T>` that does not exist. New types: `ModelDefinition`, `RegisteredModel`, `ModelRecord`, `ModelRegistry`.
  - `createMigration(db, options?)` returns a `MigrationRunner` (`run`, `rollback`, `status`, `create`, `initialize`) and `runMigrations(db, options?)` resolves to the applied names; both were declared with other signatures. `SchemaBuilder` / `TableBuilder` / `ColumnBuilder` now describe the methods that exist (including `defaultRaw()` and `references()`), with `MigrationOptions` for `directory`, `tableName`, `dialect` and `transactional`.
  - `withDatabase(db, options?)`, `withTransaction(db, options?)`, `withModel(Model, paramName?, requestKey?)` and `withPagination(options?)` have their runtime parameters and options, and return a typed `DatabaseMiddleware` instead of `any`.
  - `DatabaseManager`, `Transaction`, `DatabaseConfig`, `PoolConfig`, `QueryResult` and the adapter factories describe the runtime objects (`transaction(options | callback)`, `getStats()`, `isCommitted` / `isRolledBack`, custom `adapter` configs, ...). `createConnection()` resolves to a `DatabaseManager`.
  - The declared `export default` is gone: the package has no default export at runtime, so `import db from '@coherent.js/database'` compiled but was `undefined`. Use named imports.
  
  Types that described APIs which never existed (`Model<T>`, `ModelInstance`, `ModelQuery`, `ModelConfig`, `Migration`, `MigrationConfig`, `DatabaseAdapter`, `DatabaseConnection`, ...) are kept for now but marked `@deprecated`.

### Patch Changes

- e9b2138: Fix `createModel` writes.
  
  - INSERT / UPDATE / DELETE issued by a registered model targeted the table `undefined`: `query()` defaulted `config.from` to the model's table, but the write builders only read `config.table`. `query()` now defaults `table` (and the query builder accepts either).
  - `query()` no longer mutates the config object passed to it.
  - `instance.save()` no longer sends the instance's own methods (`save`, `delete`, definition `methods`) as columns, and leaves the primary key out of the UPDATE's SET clause.
  - On PostgreSQL, `create()` and `instance.save()` ask for the primary key with `RETURNING` and read it from the returned row, as `Model#save()` does; `Model#save({ transaction })` does so inside transactions too.
- f882693: Give the MongoDB and memory adapters working transactions.
  
  - MongoDB: `db.transaction()` threw (the adapter had no `transaction` method), and the session from `beginTransaction()` was never passed to queries, so nothing ran inside it. `db.transaction()` now starts a session transaction and returns `{ session, query, collection, commit, rollback, isCommitted, isRolledBack }`; `tx.query()` passes the session to the driver. For driver calls on `tx.collection(name)`, pass `{ session: tx.session }`.
  - Memory adapter: `db.transaction()` threw, and the callback-style `transaction()` never rolled back. Both now snapshot the store and restore it on rollback (or when the callback throws). The store is shared, so a rollback also undoes changes made outside the transaction while it was open.
  - `createDatabaseManager({ type: 'memory' })` is accepted (the adapter and the `'memory'` type were declared but the manager rejected the type); `database` is optional for it.
- 9da7560: Declare the database drivers as optional peer dependencies.
  
  The adapters load `pg`, `mysql2` and `mongodb` with dynamic imports, but only `sqlite3` was declared, so package managers could neither warn about a missing driver nor check its version. All four are now optional peers: `pg >=8.8.0 <9`, `mysql2 >=3.23.1 <4` (3.23.1 fixes an RCE and an identifier-escaping SQL injection), `mongodb >=5 <7`, and `sqlite3 >=5.1.0 <6` (was `>=5.0.0`). Installing without them still works; install the driver for the database you use.
- 1924c30: Fix `next()` handling in the database middleware.
  
  - `withDatabase`, `withModel`, `withQueryValidation` and `withHealthCheck` called `next()` inside their own `try`, so an error thrown by a later handler made them call `next(error)` (or, for `withHealthCheck`, `next()`) a second time for the same request. Only their own errors go to `next(error)` now; a later handler's error propagates unchanged.
  - The middleware works with routers that call it without `next` (such as the `@coherent.js/api` router): `withDatabase`, `withModel` and `withPagination` threw `next is not a function`.
  - `withQueryValidation(schema, { stripUnknown: false })` keeps the coerced values; the raw query string values used to overwrite them (`age: '42'` instead of `42`).
  - `withHealthCheck` clears its timeout timer once the check settles, and `withConnectionPool` releases a connection at most once.
- ad2fb7c: Make `withModel` answer 404 under the `@coherent.js/api` router.
  
  The errors raised by `withModel` (record not found, route parameter missing)
  and `withQueryValidation` (invalid query parameter) carried their HTTP status
  only as `status`, which Express reads. The `@coherent.js/api` router reads
  `statusCode`, as its `ApiError` classes set it, so it answered a missing record
  with `500 Internal Server Error` (and logged it as a server failure) instead of
  `404`. These errors now carry the status as both `status` and `statusCode`
  (and `expose: true`, like `http-errors`), so Express, Koa and the api router
  all answer 404 / 400 with the error message.
- b840cdb: Give a saved model its generated primary key when `fill()` dropped the key.
  
  - **Fixed:** `fill()` stores attributes it filters out (not in `fillable`, or `guarded`) as `undefined`, and `save()` only copied the driver's generated id into a key that was exactly `null`. A model filled from a request body that carried an `id` was inserted but kept no id, and its next `save()` threw `Cannot update ... without a primary key`.
- 60bfbbd: PostgreSQL: convert `?` placeholders to `$n` without touching the rest of the SQL.
  
  Every `?` was rewritten, including ones inside string literals (`WHERE question = 'Why?'` became `'Why$1'` and shifted every later parameter) and the JSONB operators `?|` / `?&`. `?` inside single-quoted strings (including `E'...'`), double-quoted identifiers, dollar-quoted strings and comments is now left alone, and `?|` / `?&` are kept as operators.
  
  **Behavior change:** the JSONB key-exists operator `?` cannot be told apart from a placeholder. Write it as `??` (sent to PostgreSQL as a single `?`), or use `jsonb_exists(column, key)`.
- 2704ace: Make the SQLite adapter -- the default configuration -- honour the DatabaseManager contract.
  
  - `INSERT` / `UPDATE` / `DELETE` now resolve to `{ rows: [], rowCount, affectedRows, insertId }` from sqlite3's `this.changes` / `this.lastID`. Before, every statement went through `db.all()` and resolved to `{ rows: [] }`, so callers never learned the generated id or how many rows changed.
  - `db.transaction()` works with SQLite (it threw `this.adapter.transaction is not a function`), returning `{ query, commit, rollback, isCommitted, isRolledBack }`; an optional `mode` of `DEFERRED` / `IMMEDIATE` / `EXCLUSIVE` is supported.
  - `db.getStats()` no longer throws for adapters without `getPoolStats` (it returned an error for SQLite, so `withHealthCheck` reported a healthy database as unhealthy), and SQLite now reports its single connection.
  - `DatabaseManager.testConnection()` fails when an adapter's `ping()` resolves to `false`; the result used to be ignored, so a dead SQLite connection passed.
- 5a150b5: Declare the peer dependencies packages actually use.
  
  - `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
  - Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
- 6bf0d21: Fix inputs that made parsing take seconds, a log format string built from the request, and a case-sensitive `<script>` match (found by CodeQL).
  
  - **Fixed (database):** a select column such as `'a'` followed by 50,000 spaces took about two seconds to validate (the `AS alias` pattern backtracked quadratically), so one request that passes column names through could hold the event loop. Parsing is now linear.
  - **Fixed (api):** the 5xx log line put the request URL inside `console.error`'s format string, so a `%s` or `%o` in the URL consumed the error argument. The URL is now an argument. The router's `prefix` is trimmed of trailing slashes in linear time.
  - **Fixed (client):** the router's `base` is trimmed of trailing slashes in linear time.
  - **Fixed (tooling):** `toHaveText` / `toContainText` strip tags in linear time (`'<'` repeated 50,000 times took about two seconds).
  - **Fixed (integrations):** the SvelteKit preprocessor now finds an instance script written `<SCRIPT>`; it used to add a second one.
- 16a6e7b: Revert an `error` → `_error` identifier rename that leaked into strings and object keys.
  
  - Error events are listened for again: `pool.on('error')` (pg), the API router's `req`/`socket` `'error'` handlers, the CLI dev server's child-process `'error'`, and devtools' `window` `'error'`. Before, an idle PostgreSQL client error or a WebSocket client reset was an uncaught exception.
  - `DatabaseManager` emits `'error'` only when a listener is attached; the failure still surfaces through the rejected `connect()` promise.
  - JSON error responses from `@coherent.js/api`, the framework adapters, and the scaffolded API/JSON-RPC code use `error` instead of `_error` (JSON-RPC requires `error`). **Behavior change:** clients that read `body._error` must read `body.error`.
  - Messages, CSS classes (`component-error`, `error-message`), log levels, event types and the generated `.gitignore` (`yarn-error.log*`) are spelled correctly again; the CLI's load-failure fallback no longer crashes on `console._error`.
  
  `withLoading`'s documented `_loading` / `_error` state keys are unchanged. An ESLint rule now rejects `_error` inside strings, template text and object keys in `packages/*/src` and `packages/*/bin`.

## 1.1.2

### Patch Changes

- Release the 1.1.1 content as 1.1.2.

  **This is the 1.1.1 content**, which reached npm only as `@coherent.js/cli` and `@coherent.js/client` before the run stopped: `@coherent.js/core@1.1.1` had been published and unpublished long before, and npm never allows a version number to be reused. 1.1.2 is clean for all twelve packages and realigns them.

  That content is unchanged from the 1.1.1 entry: request bodies are no longer rewritten during parsing, CORS credentials go only to an origin you named, email validation and eight other regexes are linear rather than quadratic, void elements are built rather than patched, HMR overlay line numbers are narrowed to integers, and profiler ids come from `crypto.getRandomValues`.

## 1.1.1

### Patch Changes

- Close out the CodeQL backlog: 28 alerts, plus the defects found underneath them.

  **Request bodies are no longer rewritten.** `@coherent.js/api` ran a blocklist
  of regexes over every string in a parsed JSON body and rebuilt every container
  as a plain object. Arrays arrived at handlers as objects — `{"tags":["a","b"]}`
  became `{"tags":{"0":"a","1":"b"}}`, so `req.body.tags.map()` threw — and
  ordinary prose was mangled, with `"I love javascript: the language"` reaching
  handlers as `"I love  the language"`. The regexes bought nothing: they never
  matched `</script >`, `data:` URLs or `<scr<script>ipt>`. Bodies now pass
  through untouched apart from `__proto__`, `constructor` and `prototype`, and
  keys like `__typename` survive where the old filter dropped every `__` prefix.

  **CORS credentials go only to an origin you named.** `corsOrigin` accepts a
  string or an array and is matched against the request `Origin`, echoed back with
  `Vary: Origin`; an unlisted origin gets no CORS headers.
  `Access-Control-Allow-Credentials` is sent only when `corsOrigin` is set, so the
  development default no longer offers credentials to an origin the router picked
  itself. `'*'` is served as-is but never with credentials, a pairing browsers
  reject anyway; a malformed value warns and falls back rather than throwing.

  **Email validation is linear.** The pattern shared by `forms`, `state` and `api`
  split a dotted domain at every dot, so a non-matching address cost O(n²): 50,000
  dots took 2.9 seconds to reject, and now take under a millisecond. Consecutive
  dots (`a@b..c`) are now rejected everywhere, and `api` no longer accepts
  addresses containing spaces, tabs or newlines.

  **Six more regexes made linear**, each measured: route compilation in `api`
  (4.7s → 2ms), comment stripping in `core` (307ms → 1ms), HMR stack parsing in
  `client` (4.7s → 0ms), the complexity heuristic in `devtools`, and the three
  tag counters behind `toBeValidHTML` in `tooling`. `minifyHtml` also stops
  leaving an unterminated comment in its output.

  **Smaller hardening.** `core` builds self-closing void elements directly instead
  of rewriting the first `>` in the tag. The `client` HMR overlay narrows error
  line and column to integers before they reach markup, one of them inside a
  quoted attribute. `devtools` seeds profiler session ids from
  `crypto.getRandomValues` rather than `Math.random`.

## 1.1.0

### Minor Changes

- 7c1f5bd: Let the form builder express a production form.

  **Forms work without JavaScript again.** `buildForm()` emitted
  `onsubmit="handleSubmit(event)"` on every form — naming a global the package
  never defines, since `hydrateForm` binds its own listener — plus `novalidate`,
  which turns off the browser validation a no-JS submission depends on.
  `novalidate: false` was ignored. Both are now off by default: the form posts to
  its `action` and validates natively with JavaScript disabled. Opt back in with
  `enhance: true` (or a handler string) and `novalidate: true`. This also stops
  the builder emitting markup that a strict CSP blocks.

  **`attributes` is honoured.** It was declared on `FormField` and read by
  nothing, so `autocomplete`, `maxlength`, `tabindex` and `data-*` were silently
  dropped. Attributes are applied before the builder's own, so `name`, `id`,
  `type` and the `aria-*` pair cannot be overridden, and names that are not valid
  HTML attribute names are rejected — `formatAttributes` escapes attribute values
  but interpolates names raw. `disabled` and `readonly` are honoured too.

  **Class names are yours.** A `classNames` option covers the wrapper, label,
  control, invalid state, error message and submit button, defaulting to the
  previous values and exported as `DEFAULT_CLASS_NAMES`. Per-field `className`
  appends to the control class. `hydrateForm` now finds the field wrapper through
  the `data-field` attribute the builder already emitted rather than
  `.form-field`, and takes the same `classNames` so the classes it writes on
  failure match what the server rendered.

  Together these make a honeypot a plain field, with no dedicated API:

  ```js
  builder.field('website', {
    label: 'Website',
    className: 'contact-form__trap',
    attributes: { tabindex: '-1', autocomplete: 'off' },
  });
  ```

  **Hidden fields are no longer rendered or validated.** `buildForm()` ignored
  `visible: false` and `showWhen`, while `validate()` skipped only `showWhen` —
  so a conditionally hidden field rendered but was never validated, and a
  `visible: false` field could block submission with an error for a control that
  was never on the page. Both now use one predicate, and `visible: false` is
  final rather than something a truthy `showWhen` can override.

  Attributes named `on*` are refused: they are syntactically valid names whose
  string values render as inline handlers, which would reintroduce per field the
  script this release stopped emitting on the form.

  Controls also no longer carry an empty `class=""` or `placeholder=""`.

  Peer ranges on workspace packages move from `workspace:*` to `workspace:^`.
  `workspace:*` publishes as an exact pin — `@coherent.js/forms@1.0.1` required
  `@coherent.js/core` at exactly `1.0.1` — so upgrading any one package
  conflicted with every other, and every release had to move all twelve in
  lockstep. `^` lets a consumer take a core minor without republishing the rest.

## 1.0.1

### Patch Changes

- Updated dependencies [2063331]
  - @coherent.js/core@1.0.1

## 1.0.0

### Patch Changes

- @coherent.js/core@1.0.0

## 1.0.0

### Patch Changes

- @coherent.js/core@1.0.0

## 1.0.0-beta.3

### Patch Changes

- CLI generators were producing projects with outdated dependency versions (`1.0.0-beta.1`) instead of the current framework version (`1.0.0-beta.2`), causing installation conflicts and inconsistent package management.

  Updated all hardcoded Coherent.js package versions from `1.0.0-beta.1` to `^1.0.0-beta.2` across all generator files:

  **Files Modified:**
  - `packages/cli/src/generators/runtime-scaffold.js`
  - `packages/cli/src/generators/database-scaffold.js`
  - `packages/cli/src/generators/package-scaffold.js`
  - `packages/cli/src/generators/project-scaffold.js`

  **Packages Updated:**
  - `@coherent.js/core`: `^1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/cli`: `^1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/express`: `1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/fastify`: `1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/koa`: `1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/database`: `^1.0.1` → `^1.0.0-beta.2`
  - `@coherent.js/api`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/client`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/i18n`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/forms`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/devtools`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/seo`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/testing`: `^1.0.0` → `^1.0.0-beta.2`
  - ✅ All 51 CLI tests pass
  - ✅ Generated projects install dependencies correctly
  - ✅ No empty files are generated
  - ✅ TypeScript configuration works properly
  - ✅ All generator types function (components, pages, APIs, models, middleware)
  - **Users now get projects with correct, up-to-date dependency versions**
  - **Eliminates package conflicts during installation**
  - **Ensures consistent framework behavior across generated projects**
  - **Maintains compatibility with latest Coherent.js features**

  Verified with multiple configurations:
  - Basic projects with all runtime options (built-in, Express, Fastify, Koa)
  - Full-stack projects with database integration (PostgreSQL, MySQL, SQLite, MongoDB)
  - Authentication scaffolding (JWT and session-based)
  - All optional packages enabled
  - Both JavaScript and TypeScript projects
  - Component, page, API, model, and middleware generation

  **No breaking changes** - this is a pure bug fix release that ensures version consistency.

- Updated dependencies
  - @coherent.js/core@1.0.0-beta.3

## 1.0.0-beta.2

### Patch Changes

- Added comprehensive TypeScript type definitions
- Updated internal dependencies to use workspace protocol

## 1.0.0-beta.1

### Features

- Initial beta release
- Database adapters for PostgreSQL, MySQL, SQLite, and MongoDB
- TypeScript type definitions included
- Full documentation and examples

### Notes

This is the first beta release of Coherent.js. The API is stable but may receive minor adjustments based on feedback before the 1.0.0 stable release.
