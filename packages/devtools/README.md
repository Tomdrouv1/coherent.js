# @coherent.js/devtools

[![npm version](https://img.shields.io/npm/v/@coherent.js/devtools.svg)](https://www.npmjs.com/package/@coherent.js/devtools)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 22.12](https://img.shields.io/badge/node-%3E%3D22.12-brightgreen)](https://nodejs.org)

Developer tools for Coherent.js applications: inspector, profiler, and logger utilities.

- ESM-only, Node 22.12+
- Lightweight debugging and profiling helpers
- Designed to pair with `@coherent.js/core`

**Stability:** development-only tooling. Don't ship it in production bundles or rely on it in production servers: `createDevTools()` is off unless `NODE_ENV=development` (or a localhost page in the browser) or `{ enabled: true }` is passed, and profilers record nothing until enabled.

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/devtools
```


## Exports

Tree-shakable developer tools for debugging and performance monitoring

### Modular Imports (Tree-Shakable)

- Component visualizer: `@coherent.js/devtools/visualizer`
- Performance aggregator (dashboard + optimization utilities): `@coherent.js/devtools/performance`
- Performance dashboard only: `@coherent.js/devtools/performance/dashboard`
- Cache (LRU/Memory/Render/memoize): `@coherent.js/devtools/performance/cache`
- Code-splitting (lazy components, route splitter): `@coherent.js/devtools/performance/code-splitting`
- Lazy-loading (images, IntersectionObserver, preloader): `@coherent.js/devtools/performance/lazy-loading`
- Enhanced errors: `@coherent.js/devtools/errors`
- Hybrid integration: `@coherent.js/devtools/hybrid`
- Inspector: `@coherent.js/devtools/inspector`
- Profiler: `@coherent.js/devtools/profiler`
- Logger: `@coherent.js/devtools/logger`

### Example Usage

```javascript
import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard } from '@coherent.js/devtools/performance';
import { LRUCache, memoize } from '@coherent.js/devtools/performance/cache';
```

> **Note**: All exports are tree-shakable. Import only what you need for optimal bundle size.
## Quick start

JavaScript (ESM):
```js
import { createLogger, LogLevel } from '@coherent.js/devtools/logger';
import { createProfiler } from '@coherent.js/devtools/profiler';

const logger = createLogger({ level: LogLevel.DEBUG });
logger.info('Starting app');

// Profilers record nothing until enabled
const profiler = createProfiler({ enabled: true });
const session = profiler.start('render');
// ... render work ...
console.log(profiler.stop(session).duration); // ms, from performance.now()
```

TypeScript (the declarations ship with the root entry point):
```ts
import { createLogger, createProfiler, LogLevel } from '@coherent.js/devtools';

const logger = createLogger({ level: LogLevel.DEBUG });
logger.debug('Bootstrapping');

const profiler = createProfiler({ enabled: process.env.NODE_ENV !== 'production' });
const session = profiler.start('render');
// ... work ...
profiler.stop(session);
```

## Exports

- `@coherent.js/devtools` (index)
- `@coherent.js/devtools/inspector`
- `@coherent.js/devtools/profiler`
- `@coherent.js/devtools/logger`

## Development

```bash
pnpm --filter @coherent.js/devtools run test
pnpm --filter @coherent.js/devtools run test:watch
pnpm --filter @coherent.js/devtools run typecheck
```

## License

MIT © Coherent.js Team
