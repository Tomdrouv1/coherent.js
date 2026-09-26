---
"@coherent.js/core": patch
---

Make rendering 2–5× faster without changing its output.

Render paths are linked lists formatted only when an error or warning needs them (copying an array per node and formatting a string per child made rendering quadratic in depth); HTML nesting is checked against the forbidden-children table before any path is formatted; `escapeHtml` does one pass and returns untouched strings without allocating; `isVoidElement` no longer allocates a Set per call; `performance.now()` is only called when monitoring is on; element props are no longer copied to strip `children`/`text`/`key`/`html`; already-flat children arrays aren't re-allocated.

Measured with the new `pnpm perf:render` benchmark (Node 22, median of 3 rounds): a ~300-node page 0.52 → 0.22 ms, a 1,000×5 table 12.4 → 4.9 ms, a 90-level tree 0.34 → 0.06 ms. `formatAttributes(props, skip)` accepts an optional set of prop names to leave out.
