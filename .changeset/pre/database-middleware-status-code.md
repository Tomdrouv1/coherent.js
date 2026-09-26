---
"@coherent.js/database": patch
---

Make `withModel` answer 404 under the `@coherent.js/api` router.

The errors raised by `withModel` (record not found, route parameter missing)
and `withQueryValidation` (invalid query parameter) carried their HTTP status
only as `status`, which Express reads. The `@coherent.js/api` router reads
`statusCode`, as its `ApiError` classes set it, so it answered a missing record
with `500 Internal Server Error` (and logged it as a server failure) instead of
`404`. These errors now carry the status as both `status` and `statusCode`
(and `expose: true`, like `http-errors`), so Express, Koa and the api router
all answer 404 / 400 with the error message.
