---
"@coherent.js/client": patch
---

Stop production hydration from walking the DOM for mismatches.

The client build replaced `process.env.NODE_ENV` with the build machine's
value — unset, so `'development'` — which baked `detectMismatch = true` into
the published bundle: every production `hydrate()` compared the whole server
DOM and logged warnings. `process.env.NODE_ENV` is now left in the bundle for
the application's bundler to replace, and read at runtime (a page without
`process` counts as production).

**Behavior change:** mismatch detection defaults to off unless
`process.env.NODE_ENV === 'development'`, `detectMismatch: true` is passed, or
`strict` / `onMismatch` is given (both imply it). It used to default to on for
anything but `'production'`, including test runs.
