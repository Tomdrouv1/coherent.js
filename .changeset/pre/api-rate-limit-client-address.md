---
"@coherent.js/api": minor
---

The router's rate limiter can no longer be bypassed or used to exhaust memory.

- Requests are counted per TCP peer address. The limiter used to key on the raw `X-Forwarded-For` header, so a client sending a different value on each request was never limited.
- New `trustProxy` option (`createRouter(routes, { trustProxy: 1 })`, `new SimpleRouter({ trustProxy: 1 })`, or per `handle()` call): the number of reverse proxies that append to `X-Forwarded-For` (`true` means one). The client is then read that many hops from the right of the header, so spoofed leading entries are ignored. A one-time warning is logged when the header arrives without `trustProxy`.
- Each router has its own store instead of one module-global `Map`, expired windows are swept, and the store is capped at 100,000 clients (it used to grow without bound: ~89 MB after 200k spoofed keys).
- `rateLimit: false` turns the limiter off, `rateLimit.keyGenerator(req)` supplies your own key, and a 429 carries `Retry-After`.

**Behavior change:** behind a reverse proxy without `trustProxy`, every client now shares the proxy's single budget (100 requests per minute by default). Set `trustProxy` to the number of proxies in front of the server, or turn the router limiter off with `rateLimit: false` if the proxy already limits.
