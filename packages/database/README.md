# @coherent.js/database

[![npm version](https://img.shields.io/npm/v/@coherent.js/database.svg)](https://www.npmjs.com/package/@coherent.js/database)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Database utilities and adapters for Coherent.js.

- ESM-only, Node 20+
- Optional adapters for popular databases
- Designed to pair with `@coherent.js/core` and server frameworks

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/database
```

Optional peer dependencies (install as needed):
- `sqlite3` (optional)

## Quick start

JavaScript (ESM):
```js
// Import utilities from the package's public entry once you enable a specific adapter
import db from '@coherent.js/database';

// Example sketch: connect and query (adapter-specific APIs vary)
async function example() {
  // const conn = await db.connect({ url: process.env.DATABASE_URL });
  // const rows = await conn.query('select 1');
}
```

TypeScript:
```ts
import db from '@coherent.js/database';

async function example(): Promise<void> {
  // const conn = await db.connect({ url: process.env.DATABASE_URL! });
  // const rows = await conn.query('select 1');
}
```

Note: This package exposes a set of adapters and helpers. Refer to the repository docs and examples for concrete adapter APIs.

## Development

Run tests for this package:
```bash
pnpm --filter @coherent.js/database run test
```

Watch mode:
```bash
pnpm --filter @coherent.js/database run test:watch
```

Type check:
```bash
pnpm --filter @coherent.js/database run typecheck
```

Build:
```bash
pnpm --filter @coherent.js/database run build
```

## License

MIT © Coherent.js Team
