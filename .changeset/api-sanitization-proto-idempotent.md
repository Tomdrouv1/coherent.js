---
"@coherent.js/api": patch
---

`withSanitization()` (from `@coherent.js/api/middleware`) no longer lets a `__proto__` key become the prototype and no longer double-encodes.

- A body such as `{"__proto__":{"isAdmin":true}}` made `req.body.isAdmin === true`. `__proto__`, `constructor` and `prototype` keys are now dropped at every depth.
- Escaping is idempotent: an `&` that already starts an entity (`&amp;`, `&lt;`, `&#39;`, `&copy;`...) is left alone, so running the middleware twice, or on data that was stored escaped, no longer produces `Tom &amp;amp; Jerry`. A bare `&` is still escaped.
- Dates, Buffers and other non-plain objects are passed through instead of being turned into `{}`.
