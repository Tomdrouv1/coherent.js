---
"@coherent.js/integrations": patch
---

Next.js adapter fixes.

- `createCoherentAppRouterHandler()` now passes the route handler's second
  argument through, so the factory receives `(request, { params })` — it was
  dropped, making dynamic segments unreachable. `params` is a Promise from
  Next.js 15 on; `await` it.
- `createCoherentServerComponent()`, `createCoherentClientComponent()` and
  `createNextIntegration()` threw "requires React" whenever `react` was not
  resolvable from `@coherent.js/core`'s own directory — always the case under
  pnpm's isolated layout. They now import `react` (and `next`) from
  `@coherent.js/integrations`, which declares them as optional peers and so
  sees the app's copies, and accept an explicit `React` option
  (`createCoherentServerComponent(factory, { React })`).
