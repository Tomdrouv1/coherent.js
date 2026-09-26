---
"@coherent.js/cli": patch
---

`@coherent.js/cli/build-tools`: stop breaking builds and stop pretending.

- The Rollup plugin's `resolveId` returned the raw relative id for any
  `*.coherent.js` import, so every build importing one failed with "Could not
  load ./components/Button.coherent.js". The plugin no longer claims module
  ids, and no longer returns `map: null` from `transform` (which dropped the
  source map chain).
- **Behavior change:** the Rollup, Vite (`createVitePlugin`, `createSSRPlugin`)
  and webpack plugins and the webpack loader are documented as experimental
  pass-throughs — they did nothing before either — and print a one-time notice
  saying so. Pass `{ silent: true }` to hide it. The loader forwards the
  incoming source map.
- `generateManifest()` records the installed `@coherent.js/cli` version instead
  of a hard-coded `'1.1.1'`.
