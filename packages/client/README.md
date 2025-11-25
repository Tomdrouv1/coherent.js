# @coherent.js/client

[![npm version](https://img.shields.io/npm/v/@coherent.js/client.svg)](https://www.npmjs.com/package/@coherent.js/client)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Client-side hydration and HMR utilities for Coherent.js applications.

- ESM-only, Node 20+
- Progressive enhancement for server-rendered HTML
- Lightweight event system and instance lifecycle helpers
- Optional HMR support for dev workflows

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/client
```

Requirements:
- Node.js >= 20
- ESM module system


## Exports

Client-side hydration and HMR utilities

### Modular Imports (Tree-Shakable)

- Hydration utilities: `@coherent.js/client`
- Client router: `@coherent.js/client/router`
- HMR support: `@coherent.js/client/hmr`

### Example Usage

```javascript
import { hydrateComponent } from '@coherent.js/client';
import { createClientRouter } from '@coherent.js/client/router';
```

> **Note**: All exports are tree-shakable. Import only what you need for optimal bundle size.
## Quick start

The client package pairs with server-rendered HTML produced by `@coherent.js/core`.

JavaScript (ESM):
```js
import { autoHydrate } from '@coherent.js/client';

// Hydrate elements that were marked as hydratable on the server
autoHydrate();
```

TypeScript:
```ts
import { autoHydrate } from '@coherent.js/client';

document.addEventListener('DOMContentLoaded', () => {
  autoHydrate();
});
```

### Attaching custom handlers

The client exposes an event registry you can populate during hydration.

```js
import { registerEventHandler } from '@coherent.js/client';

registerEventHandler('increment', (el, evt, ctx) => {
  // custom logic using element, DOM event, and context
});
```

TypeScript:
```ts
import { registerEventHandler } from '@coherent.js/client';

type Ctx = { state?: unknown };

registerEventHandler('increment', (el: HTMLElement, evt: Event, ctx: Ctx) => {
  console.log('clicked', el, ctx);
});
```

## Notes on testing

When testing client-side utilities in Node, provide light DOM shims (see repository tests under `packages/client/test/`). Example:

```js
import { vi } from 'vitest';

global.window = { __coherentEventRegistry: {}, addEventListener: vi.fn() };
global.document = { querySelector: vi.fn(), querySelectorAll: vi.fn(() => []) };
```

## Development

Run tests for this package:
```bash
pnpm --filter @coherent.js/client run test
```

Watch mode:
```bash
pnpm --filter @coherent.js/client run test:watch
```

Type check:
```bash
pnpm --filter @coherent.js/client run typecheck
```

Build:
```bash
pnpm --filter @coherent.js/client run build
```

## License

MIT © Coherent.js Team
