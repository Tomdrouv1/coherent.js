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

## License

MIT
