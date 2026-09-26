---
"@coherent.js/api": patch
---

Route handlers no longer run after middleware rejected the request.

`withAuth`, `withRole` and `withInputValidation` answer 401/403/400 by writing the response and returning nothing. The router only looked at return values, so the handler ran anyway: `DELETE /users/42` without a token answered 401 and still deleted the user. The chain now stops as soon as a response has been sent, for `router.addRoute()` routes, object routes (`createRouter({...})`) and `toExpressRouter()`.

Middleware also receives a `next()` callback. Express-style middleware (declared as `(req, res, next)`) is awaited until it calls `next()` or responds, even after an `await`; `next(err)` fails the request. `withValidation()` used as middleware or through an object route's `validation:` no longer throws "next is not a function".

**Behavior change:** middleware that returns an object or a string now sends it as the response and skips the handler, as object routes already did. A middleware declared with three parameters must call `next()` (or respond) for the request to continue.
