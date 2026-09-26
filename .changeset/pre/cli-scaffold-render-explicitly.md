---
"@coherent.js/cli": patch
---

Scaffolded Koa and Express apps render pages explicitly.

**Behavior change:**

- The generated Koa app renders its home page with `ctx.coherent(HomePage({}))`
  and no longer passes `autoRender: true` to `setupCoherent()`. Auto-rendering
  turns every single-key object body (`{ error }`, `{ user }`, `{ ok: true }`)
  into HTML, so routes added to the app answered JSON as markup.
- The generated Express app installs `setupCoherent(app, { template })` from
  `@coherent.js/integrations/express` (already a dependency of the scaffold)
  and renders with `res.coherent(HomePage({}))` instead of concatenating
  `render()` output into an inline HTML string.
- The Fastify/Koa auth `sendJson()` helper hands the object to the framework
  instead of pre-serializing it, now that nothing renders object bodies.
