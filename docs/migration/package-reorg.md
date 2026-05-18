# Package Reorganization Migration Guide

> **For the 1.0 release**, see [`MIGRATION-1.0.md`](../../MIGRATION-1.0.md) at the repo root. The 1.0 consolidation is much larger than any single beta-to-beta move; that file is the authoritative reference with sed one-liners and `pnpm add`/`pnpm remove` commands for every package.

This page preserves the historical beta.1 → beta.2 reorganization notes.

## 1.0 consolidation at a glance

- **Framework integrations** (`@coherent.js/{express,fastify,koa,nextjs}` + `@coherent.js/adapters/*`) → subpath exports of `@coherent.js/integrations`. Example: `import { coherentMiddleware } from '@coherent.js/integrations/express'`.
- **Build tools** (`@coherent.js/build-tools`) → subpath exports of `@coherent.js/cli/build-tools` (vite, webpack, rollup, loader).
- **Performance utilities** (`@coherent.js/performance`) → subpath exports of `@coherent.js/devtools/performance` (cache, code-splitting, lazy-loading).
- **Tooling** (`@coherent.js/{testing,language-server,language-service}`) → `@coherent.js/tooling` (the `coherent-language-server` binary is unchanged).
- **Dropped packages**: `@coherent.js/runtime` (edge-runtime story moves to a future extras repo), `@coherent.js/web-components` (151-line single-file integration), `@coherent.js/profiler` (placeholder; substantive code already in `@coherent.js/devtools`).

See [`MIGRATION-1.0.md`](../../MIGRATION-1.0.md) for the full table with sed one-liners.

## Historical: beta.1 → beta.2 reorganization

The beta.1 → beta.2 release moved hydration, events, and routing out of `@coherent.js/core` into the new `@coherent.js/client` package. If you have very old code still importing those from core, the fix is mechanical:

```js
// beta.1 and older
import { hydrate } from '@coherent.js/core';

// beta.2+
import { hydrate } from '@coherent.js/client';
```

Note: the legacy hydration APIs (`hydrateAll`, `hydrateBySelector`, `makeHydratable`, `autoHydrate`, etc.) that beta.2 introduced were ALL removed in 1.0 — see [`MIGRATION-1.0.md`](../../MIGRATION-1.0.md) for the modern `hydrate()` API.
