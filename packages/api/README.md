# @coherent.js/api

[![npm version](https://img.shields.io/npm/v/@coherent.js/api.svg)](https://www.npmjs.com/package/@coherent.js/api)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

API framework utilities for Coherent.js (routing, validation, serialization, security).

- ESM-only, Node 20+
- Build APIs with an object-first approach
- Batteries-included: validation, error handling, auth helpers, and serialization

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/api
```

Requirements:
- Node.js >= 20
- ESM module system

## Quick start

JavaScript (ESM):
```js
import { createRouter, withValidation, ApiError } from '@coherent.js/api';

const router = createRouter({
  'GET /health': () => ({ status: 'ok' }),
  'POST /echo': withValidation({ body: { message: 'string' } }, ({ body }) => ({ message: body.message }))
});

// router.handle(req) -> { statusCode, headers, body }
```

TypeScript:
```ts
import { createRouter, withValidation, ApiError } from '@coherent.js/api';

type EchoBody = { message: string };

const router = createRouter({
  'GET /health': () => ({ status: 'ok' }),
  'POST /echo': withValidation<{ body: EchoBody }>({ body: { message: 'string' } }, ({ body }) => ({ message: body.message }))
});
```

## Exports overview (selected)

- Routing
  - `createRouter`
- Errors & handlers
  - `ApiError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`
  - `withErrorHandling`, `createErrorHandler`
- Validation
  - `validateAgainstSchema`, `validateField`, `withValidation`, `withQueryValidation`, `withParamsValidation`
- Serialization
  - `serializeDate`, `deserializeDate`, `serializeMap`, `deserializeMap`, `serializeSet`, `deserializeSet`, `withSerialization`, `serializeForJSON`
- Security
  - `withAuth`, `withRole`, `hashPassword`, `verifyPassword`, `generateToken`, `withInputValidation`

Tip: Combine `withValidation`, `withAuth`, and `withErrorHandling` to build robust endpoints.

## Development

Run tests for this package:
```bash
pnpm --filter @coherent.js/api run test
```

Watch mode:
```bash
pnpm --filter @coherent.js/api run test:watch
```

Type check:
```bash
pnpm --filter @coherent.js/api run typecheck
```

Build:
```bash
pnpm --filter @coherent.js/api run build
```

## License

MIT © Coherent.js Team
