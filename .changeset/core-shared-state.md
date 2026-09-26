---
"@coherent.js/core": patch
---

Make `withStateUtils.shared()` usable.

- **Fixed:** it threw `middleware is not iterable` as soon as it was called, because the state container it created received no middleware list.
- Note that a shared container is process-wide by design: on a server it is shared by every request, so keep per-request data in props.
