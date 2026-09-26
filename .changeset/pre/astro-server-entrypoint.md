---
"@coherent.js/integrations": patch
---

Fix `astro build` with the Astro integration. `createAstroIntegration()`
registered `@coherent.js/integrations/astro` as the renderer's
`serverEntrypoint`, but Astro imports the *default export* of that module as
the SSR renderer and it had none, so every build failed with
`[MISSING_EXPORT] "default" is not exported`. The renderer now lives at the new
`@coherent.js/integrations/astro/server` subpath, whose default export is
`createRenderer()`, and the integration points Astro there.
