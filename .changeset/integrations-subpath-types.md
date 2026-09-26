---
"@coherent.js/integrations": patch
---

Ship type declarations for the `koa`, `astro`, `astro/server`, `remix` and
`sveltekit` subpaths. They had none, so importing them from TypeScript failed
with TS7016 — including the `@coherent.js/integrations/koa` import in projects
scaffolded with TypeScript + Koa. The Koa declarations also add `ctx.coherent()`
to Koa's context type.
