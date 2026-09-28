---
"@coherent.js/api": patch
---

Stop the router warning about the deprecated `url.parse()` on its first request.

- **Fixed:** the router read each request's path and query with `url.parse()`, so every app that used it printed Node's DEP0169 deprecation warning. It now splits the request target itself and parses the query with `querystring`, which is what `url.parse()` called.
- Routing is unchanged. The path is still matched as sent: `//evil.com/x` does not reach a `/x` route and `/public/../admin` does not reach `/admin`, where the WHATWG `URL` parser would have resolved both. Repeated query keys still arrive as an array, and `req.query` still has no prototype.
