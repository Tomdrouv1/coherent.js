---
"@coherent.js/devtools": minor
"@coherent.js/cli": patch
---

Make the profiler measure accurately and stay bounded.

**Behavior change:**

- Profilers are disabled by default: `createProfiler()` / `new PerformanceProfiler()`
  record nothing until constructed with `{ enabled: true }` or `enable()` is
  called. `measure()` without a profiler and `profile()` without one use an
  enabled profiler of their own. (The `@coherent.js/cli` devtools scaffold now
  creates its profiler with `enabled: process.env.NODE_ENV !== 'production'`.)
- Timings use `performance.now()` instead of `Date.now()`: sub-millisecond
  renders no longer all measure 0 or 1 ms. `startTime`/`endTime`/mark
  timestamps are therefore relative to the time origin, not epoch
  milliseconds. `memoryDelta` is the change in used heap bytes (it was `NaN`),
  or `null` where heap usage is unavailable.
- `endRender()` honours `maxSamples` (it only applied to sessions), and a
  session's own measurement and mark lists are capped the same way.
- The profiler clears the marks and measures it adds to the global
  `performance` timeline once measured, and `profiler.mark()` no longer adds
  global marks, so long-running processes stop accumulating timeline entries.
- `profile(fn, profilerOrOptions?)` now records every call (sync or async,
  including throws) on `wrapped.profiler`; it used to return a wrapper that
  recorded nothing.
- `measure()` rejects with the `Error` the function threw (non-`Error` values
  are wrapped, with the original as `cause`), carrying a `duration` property,
  instead of a plain `{ error, duration }` object.
