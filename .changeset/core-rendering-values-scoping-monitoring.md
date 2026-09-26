---
"@coherent.js/core": minor
---

Fix value rendering, CSS scoping, monitoring and a few leaks.

- **Behavior change:** booleans in `children` render nothing, so `cond && { li: ... }` works (it printed `false`). `text: false` still prints `false`; `text: null` now renders empty instead of `null`.
- `className` accepts arrays and objects (`['btn', cond && 'active']`, `{ active: cond }`) instead of printing `a,b` / `[object Object]`; `class` and `className` together are merged into one attribute; `aria-*`, `spellcheck`, `draggable` and `contenteditable` write `"false"` instead of dropping the attribute.
- **Behavior change:** scoped CSS (`scoped` / `encapsulate`) derives its `coh-…` id from the component's CSS, so a component renders the same HTML every time (it was `coh-0`, `coh-1`… from a global counter). Rules inside `@media`, `@supports`, `@container` and `@layer` are scoped; `@keyframes`, `@font-face` and other at-rules are left intact (they were corrupted into `@media (max-width[coh-3]: 600px)`); `render(Fn, { scoped: true })` is now scoped.
- **Fixed:** `render(c, { enableMonitoring: true })` and `renderWithTiming()` always threw `performanceMonitor.recordError is not a function`; the monitor now implements `recordRender` / `recordError`, and `endRender()` records into `renderTime`.
- **Fixed (security):** `CSSManager.escapeHtml` was a no-op, so `generateCSSLinks` wrote hrefs unescaped (`"><script>` broke out); inline styles can no longer close their `<style>` element.
- **Fixed:** `memoize()` / `ComponentCache` started an un-`unref`'d cleanup interval, so scripts, CLIs and static builds that used it never exited.
