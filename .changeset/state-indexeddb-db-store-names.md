---
"@coherent.js/state": patch
---

Honour `dbName` and `storeName` in `withIndexedDB` and
`createPersistentState({ storage: 'indexedDB' })`.

The IndexedDB adapter takes a database and an object store name, but it was
always built without them, so `withIndexedDB(state, key, { dbName: 'shop',
storeName: 'carts' })` wrote to the `state` store of `coherent-db` like every
other store. Both options now reach the adapter (defaults unchanged:
`'coherent-db'` and `'state'`) and are part of the typed options.

A `storeName` that does not exist yet in an existing database (created by
another store sharing its `dbName`) is added in a version upgrade instead of
failing with `NotFoundError`; open connections give way to the upgrade and
reopen on their next access. The database is now opened at its current version
rather than always at version 1.
