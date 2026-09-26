---
"@coherent.js/cli": patch
---

Scaffolded apps no longer rely on implicit auto-rendering by the framework
adapters.

**Behavior change:** the generated Fastify home route renders explicitly with
`reply.coherent(HomePage({}))`, and the generated Koa app passes
`autoRender: true` to `setupCoherent()` (its `ctx.body = HomePage({})` route
keeps working whether the adapter auto-renders by default or only on request).
Express already rendered explicitly with `render()`.
