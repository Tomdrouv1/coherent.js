---
"@coherent.js/integrations": minor
---

Stop turning JSON responses into HTML in the Express, Fastify and Koa adapters.

**Behavior change:** auto-rendering is now opt-in. The adapters used to treat
*any* object with exactly one key as a Coherent.js component, so ordinary JSON
was rendered as HTML: Express `res.send({ users })` answered `200 text/html`
with `<users 0="[object Object]"></users>`, a Fastify handler returning
`{ ok: true }` answered `<ok>true</ok>` even with a JSON response schema, and a
`401 { error: 'Invalid credentials' }` became an HTML page. No tag-name check
can fix that — `data`, `meta`, `title`, `label`, `summary` and `code` are both
HTML tags and common JSON keys — so objects are now sent as JSON unless you
render them explicitly:

- Express: `res.coherent(component, { template? })`, added by
  `coherentMiddleware()` / `setupCoherent()`. Render errors go to the app's
  error middleware, as with `res.render()`.
- Fastify: `reply.coherent(component, { template? })` (already existed).
- Koa: `ctx.coherent(component, { template? })`, new, added by
  `coherentKoaMiddleware()` / `setupCoherent()`. Render errors are thrown into
  the middleware chain.
- The handler factories (`createCoherentHandler`, `createHandler`) are
  unchanged.

**Migration:** to keep the old automatic rendering, pass `autoRender: true` —
`setupCoherent(app, { autoRender: true })` for Express and Koa,
`fastify.register(setupCoherent, { autoRender: true })` for Fastify (the same
option is accepted by `coherentMiddleware` and `coherentKoaMiddleware`). Or
switch component routes to the explicit calls above, e.g.
`res.send(HomePage())` → `res.coherent(HomePage())`, `return HomePage()` →
`return reply.coherent(HomePage())`, `ctx.body = HomePage()` →
`ctx.coherent(HomePage())`.

Express `setupCoherent()` also now forwards `template` to the middleware; it
was silently ignored before.
