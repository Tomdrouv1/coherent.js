---
"@coherent.js/core": patch
---

Give every `memo()` its own cache.

- **Fixed (security):** `memo` from `@coherent.js/core` kept one module-level Map keyed only by props, so `UserCard({ id: 1 })` could return `AdminPanel({ id: 1 })`'s output. Each memoized function now owns a bounded LRU cache.
- **Fixed:** props differing only in a callback (`onSelect`) no longer share a key; falsy results are cached; the `ttl` strategy checks expiry on read instead of starting a timer per entry (which kept the process alive); the `weak` strategy keys on the first argument's identity instead of throwing; arguments that can't be serialized (circular, BigInt) are passed through uncached.
- `memo(fn, keyFn)` keeps working; `memo(fn, { keyFn, maxSize, strategy, ttl, stats, onHit, onMiss, onEvict })` — the signature the type declarations always described — now works too. The never-implemented `compareFn` / `shallow` options were removed from the types.
