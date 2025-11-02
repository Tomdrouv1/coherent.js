# @coherentjs/express

[![npm version](https://img.shields.io/npm/v/@coherentjs/express.svg)](https://www.npmjs.com/package/@coherentjs/express)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Express adapter for Coherent.js.

- ESM-only, Node 20+
- Works with `express@4.x`
- Designed to pair with `@coherentjs/core`

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherentjs/express express @coherentjs/core
```

Peer dependencies:
- `express` >= 4.18 < 6
- `@coherentjs/core`

## Quick start

You can use `@coherentjs/core` rendering inside Express handlers.

JavaScript (ESM):
```js
import express from 'express';
import { renderToString } from '@coherentjs/core';

const app = express();

app.get('/', async (_req, res) => {
  const html = await renderToString({ div: { text: 'Hello from Express + Coherent' } });
  res.type('html').send(html);
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

TypeScript:
```ts
import express, { Request, Response } from 'express';
import { renderToString } from '@coherentjs/core';

const app = express();

app.get('/', async (_req: Request, res: Response) => {
  const html = await renderToString({ div: { text: 'Hello TS' } });
  res.type('html').send(html);
});

app.listen(3000);
```

## Development

```bash
pnpm --filter @coherentjs/express run test
pnpm --filter @coherentjs/express run test:watch
pnpm --filter @coherentjs/express run typecheck
pnpm --filter @coherentjs/express run build
```

## License

MIT © Coherent.js Team
