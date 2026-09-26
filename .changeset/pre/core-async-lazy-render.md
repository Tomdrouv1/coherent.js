---
"@coherent.js/core": patch
---

Render `lazy()` values and reject Promises explicitly.

- **Fixed:** a `lazy()` value in a tree rendered as nothing unless `evaluateLazy()` ran first; the renderer now evaluates it.
- **Behavior change:** an async component or a Promise in a tree rendered as an empty string without any signal; `render()` now throws `Cannot render a Promise at <path>: render() is synchronous`. Await async components and their data before rendering.
