---
"@coherent.js/cli": patch
---

Make the `coherent create` combinations the CLI offers actually boot.

- **Fastify + auth** crashed on start with `FST_ERR_HOOK_INVALID_HANDLER`: the
  generated `authPlugin` ran in an encapsulated context, so the auth routes
  could not see `fastify.authenticate`. The plugin now sets the
  `skip-override` flag (what `fastify-plugin` does, without adding the
  dependency).
- **Koa + auth + api** answered every `/api/auth/*` with the object router's
  404, because the `/api` catch-all was mounted first. `/api/auth` and
  `/api/protected` are now left to the Koa router.
- **Behavior change:** generated Fastify/Koa auth code sends JSON
  pre-serialized through a `sendJson()` helper. `setupCoherent()` renders any
  single-key object (`{ error }`, `{ user }`) as an HTML component, so
  `GET /api/auth/me` and every error reply used to come back as HTML.
- The scaffold pinned `vitest: ^4.1.10`; it now uses the monorepo's major
  (`^5.0.0`).
- **Behavior change:** the generated JavaScript `dev` script is
  `node --watch --env-file-if-exists=.env src/index.js`, so it reloads on
  change like the TypeScript one.
- The generated client hydration loader called `hydrate(element, Component)`;
  `@coherent.js/client` expects `hydrate(component, container)`.
