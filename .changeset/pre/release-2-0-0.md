---
"@coherent.js/api": major
"@coherent.js/cli": major
"@coherent.js/client": major
"@coherent.js/core": major
"@coherent.js/database": major
"@coherent.js/devtools": major
"@coherent.js/forms": major
"@coherent.js/integrations": major
"@coherent.js/seo": major
"@coherent.js/state": major
"@coherent.js/tooling": major
---

Coherent.js 2.0: the fixes from a full audit of the framework, several of which change behavior callers rely on.

The most likely to need changes in an application:

- Component errors propagate out of `render()` (pass `onError` to replace a failing component).
- On Node, `provideContext()` throws outside `runWithContext()`: a value provided outside it leaked into the next request on the same connection.
- Framework adapters no longer render every response as HTML: use `res.coherent()` / `reply.coherent()` / `ctx.coherent()`, or `autoRender: true`.
- The api requires a JWT secret, and rate limiting keys on the socket address unless `trustProxy` is set.
- `Model.create()` applies `fillable` / `guarded`.
- The render cache is opt-in (`enableCache: true`).

`docs/migration/upgrading-from-1.1.md` lists every behavior change with what to do about it; each package's CHANGELOG has the full list of fixes.
