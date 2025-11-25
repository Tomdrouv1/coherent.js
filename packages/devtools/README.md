# @coherent.js/devtools

[![npm version](https://img.shields.io/npm/v/@coherent.js/devtools.svg)](https://www.npmjs.com/package/@coherent.js/devtools)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Developer tools for Coherent.js applications: inspector, profiler, and logger utilities.

- ESM-only, Node 20+
- Lightweight debugging and profiling helpers
- Designed to pair with `@coherent.js/core`

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/devtools
```


## Exports

Tree-shakable developer tools for debugging and performance monitoring

### Modular Imports (Tree-Shakable)

- Component visualizer: `@coherent.js/devtools/visualizer`
- Performance dashboard: `@coherent.js/devtools/performance`
- Enhanced errors: `@coherent.js/devtools/errors`
- Hybrid integration: `@coherent.js/devtools/hybrid`
- Inspector: `@coherent.js/devtools/inspector`
- Profiler: `@coherent.js/devtools/profiler`
- Logger: `@coherent.js/devtools/logger`

### Example Usage

```javascript
import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard } from '@coherent.js/devtools/performance';
```

> **Note**: All exports are tree-shakable. Import only what you need for optimal bundle size.
## Quick start

JavaScript (ESM):
```js
import { logger } from '@coherent.js/devtools/logger';
import { createProfiler } from '@coherent.js/devtools/profiler';

logger.info('Starting app');

const profiler = createProfiler('render');
profiler.start();
// ... render work ...
profiler.stop();
```

TypeScript:
```ts
import { logger } from '@coherent.js/devtools/logger';
import { createProfiler } from '@coherent.js/devtools/profiler';

logger.debug('Bootstrapping');

const profiler = createProfiler('render');
profiler.start();
// ... work ...
profiler.stop();
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
