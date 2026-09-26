---
"@coherent.js/database": patch
---

Make the SQLite adapter -- the default configuration -- honour the DatabaseManager contract.

- `INSERT` / `UPDATE` / `DELETE` now resolve to `{ rows: [], rowCount, affectedRows, insertId }` from sqlite3's `this.changes` / `this.lastID`. Before, every statement went through `db.all()` and resolved to `{ rows: [] }`, so callers never learned the generated id or how many rows changed.
- `db.transaction()` works with SQLite (it threw `this.adapter.transaction is not a function`), returning `{ query, commit, rollback, isCommitted, isRolledBack }`; an optional `mode` of `DEFERRED` / `IMMEDIATE` / `EXCLUSIVE` is supported.
- `db.getStats()` no longer throws for adapters without `getPoolStats` (it returned an error for SQLite, so `withHealthCheck` reported a healthy database as unhealthy), and SQLite now reports its single connection.
- `DatabaseManager.testConnection()` fails when an adapter's `ping()` resolves to `false`; the result used to be ignored, so a dead SQLite connection passed.
