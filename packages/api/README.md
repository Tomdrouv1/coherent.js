# @coherent.js/api

[![npm version](https://img.shields.io/npm/v/@coherent.js/api.svg)](https://www.npmjs.com/package/@coherent.js/api)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 22.12](https://img.shields.io/badge/node-%3E%3D22.12-brightgreen)](https://nodejs.org)

API framework utilities for Coherent.js (routing, validation, serialization, security).

- ESM-only, Node 22.12+
- Build APIs with an object-first approach
- Batteries-included: validation, error handling, auth helpers, and serialization

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/api
```

Requirements:
- Node.js >= 22.12
- ESM module system

## Quick start

JavaScript (ESM):
```js
import { createRouter, withAuth, generateJWT, NotFoundError } from '@coherent.js/api';

const secret = process.env.JWT_SECRET; // required: there is no default secret

const router = createRouter(
  {
    health: {
      GET: () => ({ status: 'ok' })
    },
    users: {
      POST: {
        validation: {
          name: { type: 'string', required: true, min: 1 },
          email: { type: 'email', required: true }
        },
        handler: (req) => ({ created: req.body })
      },
      ':id': {
        GET: (req) => {
          const user = findUser(req.params.id);
          if (!user) throw new NotFoundError(`User ${req.params.id} not found`);
          return user;
        },
        DELETE: {
          middleware: [withAuth({ secret })],
          handler: (req) => ({ deleted: req.params.id, by: req.user.sub })
        }
      }
    }
  },
  {
    corsOrigin: 'https://app.example.com',
    trustProxy: 1 // one reverse proxy in front; omit when clients connect directly
  }
);

router.createServer().listen(3000);

// Issue a token elsewhere, with the same secret:
const token = generateJWT({ sub: 42, role: 'admin' }, '1h', secret);
```

A method entry is either a handler function or `{ handler, middleware, validation, name, path }`.
Handlers answer by returning a value (sent as JSON) or by writing to `res`. Routes can also be
added imperatively: `router.get('/users/:id', handler, { middleware: [...] })`.

### Behavior worth knowing

- Middleware runs in order and the handler only runs if none of it has sent a response.
  Middleware may be Coherent-style `(req, res) => value` or Express-style `(req, res, next)`;
  the latter is awaited until it calls `next()` (`next(err)` fails the request).
- `validation` / `withValidation()` accept a field map (`{ email: { type: 'email', required: true } }`)
  or a JSON-Schema-style object (`{ type: 'object', required: [...], properties: {...} }`). An invalid
  body is answered with 400 and `details.errors: [{ field, message, rule }]`.
- An `ApiError` thrown with a 4xx status is answered with its message. Any 5xx is logged and answered
  with the generic status text; set `exposeErrors: true` (or run with `NODE_ENV=development`) to send
  the real message.
- Rate limiting (100 requests per minute per client by default) keys on the connecting address.
  Behind a reverse proxy set `trustProxy` to the number of proxies, or pass `rateLimit: false` to
  `createServer()` / `handle()` and limit at the proxy.
- WebSocket routes (`enableWebSockets: true`) accept same-origin browser handshakes only, unless
  `wsAllowedOrigins` (router) or `allowedOrigins` (route) lists the origins to allow.
  **Stability:** WebSocket support is experimental. It is a small built-in implementation: only
  text messages are delivered (binary frames are ignored, `send()` writes text, objects as JSON),
  there are no extensions such as compression, and messages above `wsMaxPayload` (1 MiB) close the
  connection. Use a dedicated WebSocket library for anything demanding.
- `withAuth({ secret })` verifies `Authorization: Bearer <jwt>` (HS256); `withAuth({ verify })`
  accepts any other scheme. `generateToken()` returns a random hex string, not a JWT.

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
  - `withAuth`, `withRole`, `generateJWT`, `verifyToken`, `hashPassword`, `verifyPassword`, `generateToken`, `withInputValidation`

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
