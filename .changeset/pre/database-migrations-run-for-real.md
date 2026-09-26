---
"@coherent.js/database": minor
---

Fix the migration runners (`createMigration` / `runMigrations` and the `Migration` class).

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
