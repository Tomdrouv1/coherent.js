---
"@coherent.js/database": minor
---

Align the TypeScript declarations with the runtime API.

- `createModel(db)` returns a model registry (`registerModel(name, definition)`, `execute()`, `getModel()`); it was declared as `createModel(config)` returning a chainable `Model<T>` that does not exist. New types: `ModelDefinition`, `RegisteredModel`, `ModelRecord`, `ModelRegistry`.
- `createMigration(db, options?)` returns a `MigrationRunner` (`run`, `rollback`, `status`, `create`, `initialize`) and `runMigrations(db, options?)` resolves to the applied names; both were declared with other signatures. `SchemaBuilder` / `TableBuilder` / `ColumnBuilder` now describe the methods that exist (including `defaultRaw()` and `references()`), with `MigrationOptions` for `directory`, `tableName`, `dialect` and `transactional`.
- `withDatabase(db, options?)`, `withTransaction(db, options?)`, `withModel(Model, paramName?, requestKey?)` and `withPagination(options?)` have their runtime parameters and options, and return a typed `DatabaseMiddleware` instead of `any`.
- `DatabaseManager`, `Transaction`, `DatabaseConfig`, `PoolConfig`, `QueryResult` and the adapter factories describe the runtime objects (`transaction(options | callback)`, `getStats()`, `isCommitted` / `isRolledBack`, custom `adapter` configs, ...). `createConnection()` resolves to a `DatabaseManager`.
- The declared `export default` is gone: the package has no default export at runtime, so `import db from '@coherent.js/database'` compiled but was `undefined`. Use named imports.

Types that described APIs which never existed (`Model<T>`, `ModelInstance`, `ModelQuery`, `ModelConfig`, `Migration`, `MigrationConfig`, `DatabaseAdapter`, `DatabaseConnection`, ...) are kept for now but marked `@deprecated`.
