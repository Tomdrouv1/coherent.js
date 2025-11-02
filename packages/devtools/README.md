# @coherentjs/devtools

[![npm version](https://img.shields.io/npm/v/@coherentjs/devtools.svg)](https://www.npmjs.com/package/@coherentjs/devtools)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Developer tools for Coherent.js applications: inspector, profiler, and logger utilities.

- ESM-only, Node 20+
- Lightweight debugging and profiling helpers
- Designed to pair with `@coherentjs/core`

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherentjs/devtools
```

## Quick start

JavaScript (ESM):
```js
import { logger } from '@coherentjs/devtools/logger';
import { createProfiler } from '@coherentjs/devtools/profiler';

logger.info('Starting app');

const profiler = createProfiler('render');
profiler.start();
// ... render work ...
profiler.stop();
```

TypeScript:
```ts
import { logger } from '@coherentjs/devtools/logger';
import { createProfiler } from '@coherentjs/devtools/profiler';

logger.debug('Bootstrapping');

const profiler = createProfiler('render');
profiler.start();
// ... work ...
profiler.stop();
```

## Exports

- `@coherentjs/devtools` (index)
- `@coherentjs/devtools/inspector`
- `@coherentjs/devtools/profiler`
- `@coherentjs/devtools/logger`

## Development

```bash
pnpm --filter @coherentjs/devtools run test
pnpm --filter @coherentjs/devtools run test:watch
pnpm --filter @coherentjs/devtools run typecheck
```

## License

MIT © Coherent.js Team
