---
"@coherent.js/api": patch
---

`withAuth(verifyToken)` from `@coherent.js/api/middleware` answers 401 when the verifier returns `null`, `undefined` or `false`.

It only rejected a token when the verifier threw. The package's own `verifyToken()` returns `null` for an invalid or forged token, so the two together called `next()` with `req.user = null` and let every request through. Async verifiers are now awaited, and their rejections are a 401 too.

`withAuth`, `withPermission` and `withRateLimit` also answer on a plain `node:http` response (the Coherent router), not only on an Express one, and `createApiMiddleware` passes rejections of an async handler to `next(err)`.

**Behavior change:** `withAuth()` from `@coherent.js/api/middleware` throws a `TypeError` when called without a verifier function, instead of answering 401 to every request.
