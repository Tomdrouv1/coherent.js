---
"@coherent.js/core": minor
---

Make the render cache opt-in and correct.

- **Fixed:** rendering a string-shorthand element (`{ span: 'hello' }`, `{ title: 'My page' }`) poisoned the shared cache — `get`/`set` were called with swapped arguments — so every later `render()` in the process returned `undefined` (or a page lost its `<body>`).
- **Fixed (security):** the cache key left out any prop whose name didn't look like a tag name (`data_id`, `x-on:click`, `@click`, `xlink:href`), so different elements shared an entry and one request could be served another request's HTML.
- **Fixed:** the cache never evicted (it re-sorted the whole map on every insert past 1,000 entries) and counted statistics under an unbounded set of keys, so render time and memory grew with every distinct render — a 240-node page went from 13 ms to 530 ms after 150 renders.
- **Behavior change:** `enableCache` now defaults to `false`. When enabled, one entry is stored per whole render, keyed on the complete component tree; trees containing functions, class instances or Dates are never cached. Pass `cache: createCacheManager({ maxCacheSize, ttlMs })` for a dedicated cache; `cacheSize` is deprecated and ignored (it always was).
- `createCacheManager` evicts least-recently-used entries in O(1), accepts `maxSize` as an alias for `maxCacheSize`, supports a per-entry `ttlMs`, counts keys toward the memory budget, and `clear(type)` only releases that type's memory. Its type declarations now describe the real API.
- `precompileComponent` no longer throws `ReferenceError: isStaticElement is not defined`.
