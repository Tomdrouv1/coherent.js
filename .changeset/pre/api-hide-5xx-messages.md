---
"@coherent.js/api": minor
---

5xx responses no longer echo internal error messages.

A handler that threw `new Error('connect ECONNREFUSED 10.0.3.7:5432 (db-primary.internal)')` sent that string to the client. The router (addRoute and object routes) and `createErrorHandler()` now log the real error with `console.error` and answer 5xx with the generic status text (`{ "error": "Internal Server Error" }`, `"Service Unavailable"` for a 503...). 4xx `ApiError` messages and details are unchanged.

New option `exposeErrors: true` (router options, `handle()` options, or `createErrorHandler({ exposeErrors })`) sends the real message; when it is unset, messages are exposed only with `NODE_ENV=development`. `createErrorHandler()` also implements the `includeStack`, `logger` and `transform` options its type already declared. `withErrorHandling()` keeps the original error as `cause` on the 500 `ApiError` it wraps it in.

**Behavior change:** clients that parsed 5xx messages outside development only see the generic status text; set `exposeErrors: true` to restore the old output.
