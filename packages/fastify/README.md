# @coherentjs/fastify

[![npm version](https://img.shields.io/npm/v/@coherentjs/fastify.svg)](https://www.npmjs.com/package/@coherentjs/fastify)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Fastify adapter for Coherent.js.

- ESM-only, Node 20+
- Works with `fastify@4.x`
- Designed to pair with `@coherentjs/core`

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherentjs/fastify fastify @coherentjs/core
```

Peer dependencies:
- `fastify` >= 4 < 6
- `@coherentjs/core`

## Quick start

You can use `@coherentjs/core` rendering inside Fastify route handlers.

JavaScript (ESM):
```js
import Fastify from 'fastify';
import { renderToString } from '@coherentjs/core';

const app = Fastify();

app.get('/', async (_req, reply) => {
  const html = await renderToString({ div: { text: 'Hello from Fastify + Coherent' } });
  reply.type('text/html').send(html);
});

app.listen({ port: 3000 });
```

TypeScript:
```ts
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { renderToString } from '@coherentjs/core';

const app = Fastify();

app.get('/', async (_req: FastifyRequest, reply: FastifyReply) => {
  const html = await renderToString({ div: { text: 'Hello TS' } });
  reply.type('text/html').send(html);
});

app.listen({ port: 3000 });
```

## Development

```bash
pnpm --filter @coherentjs/fastify run test
pnpm --filter @coherentjs/fastify run test:watch
pnpm --filter @coherentjs/fastify run typecheck
pnpm --filter @coherentjs/fastify run build
```

## License

MIT © Coherent.js Team
