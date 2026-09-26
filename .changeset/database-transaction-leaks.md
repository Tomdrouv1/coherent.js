---
"@coherent.js/database": minor
---

Stop transactions and connection retries from leaking pooled connections, and honour transaction options.

- PostgreSQL and MySQL: a transaction whose `BEGIN` failed never released its connection back to the pool. It is released now (PostgreSQL discards the client). A failed `COMMIT` also releases it exactly once and marks the transaction rolled back.
- `db.transaction(options)` passes `isolationLevel` / `readOnly` to the adapter; `withTransaction(db, options)` used to lose them because `DatabaseManager.transaction()` took no arguments. MySQL now applies both (`SET TRANSACTION ISOLATION LEVEL ...`, `START TRANSACTION READ ONLY`).
- `db.transaction(async (tx) => ...)` runs the callback in a transaction, commits when it resolves and rolls back when it throws (the callback form was declared in the types but did nothing).
- `connect()` closes the pool of a failed attempt before retrying; three failed attempts used to leave three open pools.
- `withTransaction` no longer commits before the handler is done. When `next()` returns a promise it still commits after it resolves. When it does not (Express, whose `next()` returns before an async handler finishes, or a router that calls middleware without `next`), the transaction is committed when the response finishes with a status below 400 and rolled back on an error status or when the connection closes first. A transaction the handler finished itself is left alone.

**Behavior change:**

- `isolationLevel` must be one of `READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE` (any case and spacing); anything else throws before a connection is taken. It was interpolated into `BEGIN` unchecked.
- `withTransaction` throws, after rolling back, when `next()` does not return a promise and the response has no `once()`/`on()` to report when it ends.
