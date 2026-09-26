---
"@coherent.js/database": patch
---

Fix `next()` handling in the database middleware.

- `withDatabase`, `withModel`, `withQueryValidation` and `withHealthCheck` called `next()` inside their own `try`, so an error thrown by a later handler made them call `next(error)` (or, for `withHealthCheck`, `next()`) a second time for the same request. Only their own errors go to `next(error)` now; a later handler's error propagates unchanged.
- The middleware works with routers that call it without `next` (such as the `@coherent.js/api` router): `withDatabase`, `withModel` and `withPagination` threw `next is not a function`.
- `withQueryValidation(schema, { stripUnknown: false })` keeps the coerced values; the raw query string values used to overwrite them (`age: '42'` instead of `42`).
- `withHealthCheck` clears its timeout timer once the check settles, and `withConnectionPool` releases a connection at most once.
