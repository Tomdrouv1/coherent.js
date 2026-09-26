---
"@coherent.js/api": patch
---

Router-level `rateLimit`, `maxBodySize` and `exposeErrors` apply when `router.handle()` is called directly (from Express middleware, a custom server or tests), not only to requests served by `router.createServer()`. Per-call `handle()` options still take precedence, and a per-call `exposeErrors` now reaches object routes as well as `addRoute()` routes.

**Behavior change:** an application that configured `rateLimit` or `maxBodySize` in `createRouter(routes, options)` and calls `handle()` itself now gets those limits instead of the defaults.
