---
"@coherent.js/integrations": minor
---

Route Fastify `reply.coherent()` render errors through Fastify, and type the
plugin as a plugin.

**Behavior change:** when rendering fails inside `reply.coherent()`, the error
is now sent through Fastify's error pipeline — `onError` hooks, your
`setErrorHandler`, the request logger — instead of the adapter answering
`500 { error: 'Internal Server Error', message: <raw err.message> }` itself,
which bypassed the app's handler and leaked internal messages. `reply.coherent()`
also returns the reply now, so `return reply.coherent(page)` is the idiomatic
form in async handlers.

**Migration:** if a client parsed the old `{ error, message }` body, produce it
from `setErrorHandler`; otherwise nothing to do.

The `.d.ts` declared `setupCoherent(fastify, options)` as a directly callable
function, but calling it threw `TypeError: done is not a function` — it is a
Fastify plugin. `coherentFastify` and `setupCoherent` are now typed as
`FastifyPluginCallback<CoherentFastifyOptions>`, so
`await fastify.register(setupCoherent, options)` typechecks and a direct call
does not; a direct call from JavaScript now throws an error that names the
`register` form.
