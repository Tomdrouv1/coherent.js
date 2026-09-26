---
"@coherent.js/database": patch
---

Give the MongoDB and memory adapters working transactions.

- MongoDB: `db.transaction()` threw (the adapter had no `transaction` method), and the session from `beginTransaction()` was never passed to queries, so nothing ran inside it. `db.transaction()` now starts a session transaction and returns `{ session, query, collection, commit, rollback, isCommitted, isRolledBack }`; `tx.query()` passes the session to the driver. For driver calls on `tx.collection(name)`, pass `{ session: tx.session }`.
- Memory adapter: `db.transaction()` threw, and the callback-style `transaction()` never rolled back. Both now snapshot the store and restore it on rollback (or when the callback throws). The store is shared, so a rollback also undoes changes made outside the transaction while it was open.
- `createDatabaseManager({ type: 'memory' })` is accepted (the adapter and the `'memory'` type were declared but the manager rejected the type); `database` is optional for it.
