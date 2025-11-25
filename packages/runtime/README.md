# @coherent.js/runtime

[![npm version](https://badge.fury.io/js/%40coherent.js%2Fruntime.svg)](https://www.npmjs.com/package/%40coherent.js%2Fruntime)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Universal runtime for Coherent.js — works in browsers, edge workers, desktop, and any JavaScript environment.

- ESM-only, Node 18+
- Universal compatibility (browser, edge, desktop, server)
- Streaming SSR with hydration support
- Built-in performance optimization

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/runtime
```

Requirements:
- Node.js >= 18 (for development)
- ESM module system
- Compatible with browsers, edge workers, and desktop environments

## Usage

```javascript
import { createCoherent } from '@coherent.js/runtime';

// Create universal app
const app = createCoherent({
  components: { 
    App: () => ({ div: { text: 'Hello World' } }) 
  }
});

// Browser usage
import { createBrowserApp } from '@coherent.js/runtime/browser';
const browserApp = createBrowserApp(app);

// Edge usage  
import { createEdgeApp } from '@coherent.js/runtime/edge';
const edgeApp = createEdgeApp(app);

// Static site usage
import { createStaticApp } from '@coherent.js/runtime/static';
const staticApp = createStaticApp(app);

// Desktop usage
import { createDesktopApp } from '@coherent.js/runtime/desktop';
const desktopApp = createDesktopApp(app);
```

## Exports

Universal runtime for multiple JavaScript environments with optimized builds for each target.

### Modular Imports (Tree-Shakable)

- Universal runtime: `@coherent.js/runtime`
- Browser runtime: `@coherent.js/runtime/browser`
- Edge runtime: `@coherent.js/runtime/edge`
- Static runtime: `@coherent.js/runtime/static`
- Desktop runtime: `@coherent.js/runtime/desktop`

### Example Usage

```javascript
import { createCoherent } from '@coherent.js/runtime';
import { createBrowserApp } from '@coherent.js/runtime/browser';
import { createEdgeApp } from '@coherent.js/runtime/edge';
```

> **Note**: All exports are tree-shakable. Import only what you need for optimal bundle size.

## Environment-Specific Builds

| Environment | Import Path | Bundle Size | Features |
|-------------|-------------|-------------|----------|
| Universal | `@coherent.js/runtime` | ~118KB | All environments |
| Browser | `@coherent.js/runtime/browser` | ~45KB | Browser-optimized |
| Edge | `@coherent.js/runtime/edge` | ~35KB | Edge worker optimized |
| Static | `@coherent.js/runtime/static` | ~25KB | Static site generation |
| Desktop | `@coherent.js/runtime/desktop` | ~50KB | Electron/Tauri support |

## Performance

- **Streaming SSR**: 247 renders/sec with LRU caching
- **Bundle Size**: 118KB source → 35KB gzipped (edge)
- **Tree Shaking**: 100% tree-shakable with sideEffects: false
- **Compatibility**: Works across browsers, edge workers, and desktop

## Development

Run tests for this package:
```bash
pnpm --filter @coherent.js/runtime run test
```

Browser testing:
```bash
pnpm --filter @coherent.js/runtime run test:browser
```

Build (from package dir or via workspace filter):
```bash
pnpm --filter @coherent.js/runtime run build
```

## License

MIT © Coherent.js Team
