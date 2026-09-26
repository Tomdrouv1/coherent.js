# @coherent.js/integrations

Framework integration adapters for Coherent.js — bridges between your chosen HTTP/SSG framework and the Coherent.js rendering engine.

## Subpath exports

- `@coherent.js/integrations/express` — Express.js adapter
- `@coherent.js/integrations/fastify` — Fastify adapter (added in 1.0.0)
- `@coherent.js/integrations/koa` — Koa adapter (added in 1.0.0)
- `@coherent.js/integrations/nextjs` — Next.js adapter (added in 1.0.0)
- `@coherent.js/integrations/astro` — Astro adapter (added in 1.0.0)
- `@coherent.js/integrations/remix` — Remix adapter (added in 1.0.0)
- `@coherent.js/integrations/sveltekit` — SvelteKit adapter (added in 1.0.0)

**Stability:** the Astro, Remix and SvelteKit adapters are young. Their tests run a real
`astro build`, compile and server-render a component with the Svelte compiler, and server-render
the Remix wrapper with React, but the adapters have seen little production use. The Express,
Fastify and Koa adapters are tested over real HTTP requests, and the Next.js adapter with Web
`Request`/`Response` objects and `react-dom/server`.

## Migration from pre-1.0

Each framework previously shipped as its own package (`@coherent.js/express`, etc.). Migrate by changing import paths:

```diff
- import { setupCoherent } from '@coherent.js/express';
+ import { setupCoherent } from '@coherent.js/integrations/express';
```

Public API is unchanged — only the import path moves.

## Install

```bash
pnpm add @coherent.js/core @coherent.js/integrations
pnpm add express   # or fastify / koa / next / etc. — only the ones you use
```

Framework peer dependencies are declared optional, so consumers only install the framework(s) they actually use.

## Rendering components (Express, Fastify, Koa)

Render explicitly; plain objects are sent as JSON:

```js
// Express
setupCoherent(app, { template: '<!DOCTYPE html>\n{{content}}' });
app.get('/', (req, res) => res.coherent(HomePage()));
app.get('/api/users', (req, res) => res.send({ users })); // JSON

// Fastify
await fastify.register(setupCoherent, { template });
fastify.get('/', async (request, reply) => reply.coherent(HomePage()));

// Koa
setupCoherent(app, { template });
router.get('/', (ctx) => ctx.coherent(HomePage()));
```

`autoRender: true` restores the earlier behavior of rendering any
component-shaped object passed to `res.send` / returned from a Fastify handler
/ assigned to `ctx.body`. It is off by default because "component-shaped"
means "has exactly one key", which matches JSON such as `{ ok: true }` or
`{ error: 'Invalid credentials' }` too.

## License

MIT
