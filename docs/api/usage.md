# Coherent.js API Framework Usage Guide

This guide shows how to build HTTP APIs with `@coherent.js/api`: declarative object routes, middleware, validation, errors, serialization and the security helpers.

## Table of Contents

1. [Object Router](#object-router)
2. [Imperative Routes](#imperative-routes)
3. [Middleware](#middleware)
4. [Error Handling](#error-handling)
5. [Validation](#validation)
6. [Serialization](#serialization)
7. [Running the Router](#running-the-router)
8. [Security Features](#security-features)

## Object Router

Routes are nested objects: path segments are keys, HTTP methods are keys holding either a handler or a `{ handler, middleware, validation, name, path }` object.

```javascript
import { createRouter } from '@coherent.js/api';

const routes = {
  api: {
    users: {
      GET: () => ({ users: [] }),
      POST: {
        handler: (req) => ({ user: { id: 1, name: req.body.name } })
      },
      ':id': {
        GET: (req) => ({ user: { id: req.params.id } })
      }
    }
  }
};

const router = createRouter(routes);
router.createServer().listen(3000);
```

- Method keys are case-insensitive (`GET` or `get`); `GET`, `POST`, `PUT`, `DELETE` and `PATCH` are supported in objects. `HEAD` falls back to the matching `GET` route.
- A handler answers by **returning** an object (sent as JSON with status 200) or by writing to `res` itself. Returning nothing from an object route sends `204 No Content`.
- Parameter names are identifiers (`:id`, `:userId`); `/:from-:to` declares two parameters. `:id?` is optional, `*` matches one segment and `**` the rest of the path, both as `params.splat`. Parameters are URL-decoded.

## Imperative Routes

The router returned by `createRouter()` also has `get`, `post`, `put`, `patch`, `delete`, `options` and `head` methods taking `(path, handler, options)`:

```javascript
import { createRouter, NotFoundError } from '@coherent.js/api';

const router = createRouter();

router.get('/users/:id', (req) => {
  const user = users.get(req.params.id);
  if (!user) throw new NotFoundError('User not found');
  return user;
}, { name: 'getUser' });

router.group('/admin', [requireAdmin], (r) => {
  r.get('/stats', () => ({ uptime: process.uptime() }));
});

router.generateUrl('getUser', { id: 42 }); // '/users/42'
```

Route-level middleware goes in `options.middleware`: `router.post('/users', handler, { middleware: [withValidation(schema)] })`.

## Middleware

Middleware runs in order before the handler, and the handler only runs if no middleware has sent a response. Two styles are accepted:

```javascript
// Coherent style: return nothing to continue, or return a value to answer with it
const requireJson = (req) => {
  if (!String(req.headers['content-type']).includes('application/json')) {
    return { error: 'JSON expected' }; // sent as the response; the handler is skipped
  }
};

// Express style: declared with three parameters, awaited until next() is called
const timing = (req, res, next) => {
  req.startedAt = Date.now();
  next(); // next(err) fails the request
};

const router = createRouter({
  api: {
    users: {
      POST: {
        middleware: [timing, requireJson],
        handler: (req) => ({ received: req.body, after: Date.now() - req.startedAt })
      }
    }
  }
});
```

Middleware that should apply to every route goes in the router options, `createRouter(routes, { middleware: [...] })`, or is registered with `router.use(fn)` **before** the routes it should cover (`router.use()` does not reach routes added earlier).

`@coherent.js/api/middleware` provides more helpers:

```javascript
import {
  withAuth,          // withAuth((token) => user | null): Bearer token with your own verifier
  withPermission,    // withPermission((user, req) => boolean): 401 without user, 403 when false
  withRateLimit,     // withRateLimit({ windowMs, max }): per-route limit keyed on req.ip / socket address
  withSanitization,  // HTML-escapes strings in body, query and params; drops __proto__ keys
  withCors,          // Express-only: sets CORS headers, answers preflights with res.status()
  withLogging,       // Express-only: logs the request and, via res.send, the response
  createApiMiddleware // wraps a (req, res, next) function so thrown errors go to next(err)
} from '@coherent.js/api/middleware';
```

The router already applies CORS headers, rate limiting and body size limits itself (see [Security Features](#security-features)), so `withCors` and `withRateLimit` are mainly for Express apps.

## Error Handling

Throw one of the error classes; the router answers with its status:

- `ApiError(message, statusCode = 500, details?)` - base class
- `ValidationError(errors, message?)` - 400
- `AuthenticationError` - 401
- `AuthorizationError` - 403
- `NotFoundError` - 404
- `ConflictError` - 409

```javascript
import { NotFoundError, ConflictError } from '@coherent.js/api';

const routes = {
  users: {
    ':id': {
      GET: (req) => {
        const user = users.get(req.params.id);
        if (!user) throw new NotFoundError('User not found');
        return user;
      }
    },
    POST: (req) => {
      if (users.has(req.body.email)) throw new ConflictError('Email already registered');
      return { created: true };
    }
  }
};
```

4xx errors are answered with their message (and `details`). Any 5xx — including a plain `Error` thrown by a handler — is logged with `console.error` and answered with the generic status text (`{ "error": "Internal Server Error" }`), so internal messages such as database host names never reach clients. Set `exposeErrors: true` in the router options (or run with `NODE_ENV=development`) to send the real message.

For Express apps, `createErrorHandler({ exposeErrors, includeStack, logger, transform })` returns an error middleware with the same rules:

```javascript
import express from 'express';
import { createErrorHandler } from '@coherent.js/api';

const app = express();
// ... routes ...
app.use(createErrorHandler());
```

## Validation

Add `validation` to a method entry, or use `withValidation(schema)` as middleware. A schema is either a **field map** or a **JSON-Schema-style object**:

```javascript
const routes = {
  users: {
    POST: {
      // Field map
      validation: {
        name: { type: 'string', required: true, minLength: 1, maxLength: 100, trim: true },
        email: { type: 'email', required: true },
        role: { type: 'string', enum: ['user', 'admin'], default: 'user' }
      },
      handler: (req) => ({ user: req.body }) // validated data, defaults applied
    }
  },
  posts: {
    POST: {
      // JSON-Schema-style object
      validation: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1 },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 5 }
        },
        additionalProperties: false
      },
      handler: (req) => ({ post: req.body })
    }
  }
};
```

An invalid body is answered with 400:

```json
{
  "error": "Validation failed",
  "details": { "errors": [{ "field": "email", "message": "Invalid email format", "rule": "email" }] }
}
```

Supported keywords include `type` (also `integer`, `email`, `url`, `uuid`, `phone`, `credit-card`, `date`, and type arrays), `required`, `enum`, `const`, `pattern`, `minLength`/`maxLength`, `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`, `min`/`max`, `items`, `minItems`/`maxItems`, nested `properties`, `additionalProperties`, `nullable`, `format`, `custom`, `message`, `trim`, `transform` and `default`. Options: `abortEarly`, `stripUnknown`, `allowUnknown`, `coerceTypes`.

### Query and Parameter Validation

```javascript
import { createRouter, withQueryValidation, withParamsValidation } from '@coherent.js/api';

const router = createRouter();

router.get('/users', (req) => ({ limit: req.query.limit }), {
  middleware: [withQueryValidation({ limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 } })]
});

router.get('/users/:id', (req) => ({ id: req.params.id }), {
  middleware: [withParamsValidation({ id: { type: 'integer', required: true } })]
});
```

Query and path values are strings; these two convert numeric and boolean strings for `number`, `integer` and `boolean` fields and write the converted values back (`req.query.limit` is the number `20`).

You can also validate by hand with `validateAgainstSchema(schema, data, options)`, which returns `{ valid, errors, data }`.

## Serialization

`serializeForJSON(data)` converts Dates to ISO strings, Maps to plain objects and Sets to arrays, recursively:

```javascript
import { serializeForJSON } from '@coherent.js/api';

router.get('/events', () => serializeForJSON({
  events: [{
    date: new Date('2023-01-01T12:00:00Z'),
    tags: new Set(['important', 'meeting']),
    metadata: new Map([['location', 'Room A']])
  }]
}));
```

The individual helpers are `serializeDate` / `deserializeDate`, `serializeMap` / `deserializeMap` and `serializeSet` / `deserializeSet`. `withSerialization({ enableDate, enableMap, enableSet, custom })` is middleware that attaches them as `res.serialize.*` and `req.deserialize.*`.

## Running the Router

### Built-in server

```javascript
const router = createRouter(routes, {
  corsOrigin: 'https://app.example.com',
  maxBodySize: 2 * 1024 * 1024,
  rateLimit: { windowMs: 60_000, maxRequests: 200 }
});

router.createServer().listen(3000);
```

### Inside Express or another server

`router.handle(req, res)` answers every request it is given — with a 404 JSON body when no route matches — and resolves to `undefined`. Hand it only the requests that belong to the API:

```javascript
import express from 'express';

const app = express();
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  router.handle(req, res).catch(next);
});
```

Router-level options (`rateLimit`, `maxBodySize`, `exposeErrors`, `trustProxy`) apply to `handle()` calls too. Do not put a body parser such as `express.json()` in front of the router for these requests: the router reads the body itself.

Alternatively, `router.toExpressRouter(express)` registers the routes on an Express router (`app.use(router.toExpressRouter(express))`); requests then go through Express's own error handling and do not use the router's rate limiter or body parser.

## Security Features

### Security Headers and CORS

Responses carry `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Strict-Transport-Security`, `Referrer-Policy` and a `Content-Security-Policy` (`enableSecurityHeaders: false` turns them off), plus CORS headers for `corsOrigin`:

```javascript
createRouter(routes, { corsOrigin: 'https://yourdomain.com' });                  // one origin
createRouter(routes, { corsOrigin: ['https://app.com', 'https://admin.com'] }); // allowlist
```

`Access-Control-Allow-Credentials: true` is sent only when `corsOrigin` is set. Omit it and the router serves the development default (`http://localhost:3000`) without credentials.

With an allowlist, the request's `Origin` is matched against it: a match is echoed back alongside `Vary: Origin`, and any other origin receives no CORS headers at all.

`corsOrigin: '*'` is served as-is, but never with credentials: browsers reject a wildcard origin combined with them. List the origins you trust to enable credentialed requests. A malformed value warns and falls back to the development default rather than throwing, so a bad config cannot take a running server down.

### Rate Limiting

The router allows 100 requests per minute per client by default and answers 429 with `Retry-After` beyond that. The client is the **TCP peer address**:

```javascript
createRouter(routes, {
  rateLimit: { windowMs: 300_000, maxRequests: 1000 },
  trustProxy: 1 // one reverse proxy appends to X-Forwarded-For
});
```

- Behind a reverse proxy, set `trustProxy` to the number of proxies (`true` means one). Without it every client shares the proxy's single budget, and a one-time warning is logged when `X-Forwarded-For` arrives.
- `rateLimit: false` turns the limiter off (for example when the proxy already limits), and `rateLimit.keyGenerator(req)` supplies your own key.

### Request Size Limits

Bodies above `maxBodySize` (1 MB by default) are answered with 413; a `Content-Length` above the limit is rejected before the body is read.

### Authentication and Authorization

`withAuth` needs an explicit secret — there is no default:

```javascript
import { createRouter, withAuth, withRole, generateJWT, verifyPassword } from '@coherent.js/api';

const secret = process.env.JWT_SECRET;
const auth = withAuth({ secret }); // verifies Authorization: Bearer <jwt> (HS256)

const router = createRouter({
  api: {
    profile: {
      GET: { middleware: [auth], handler: (req) => ({ user: req.user }) }
    },
    admin: {
      GET: { middleware: [auth, withRole('admin')], handler: () => ({ ok: true }) }
    },
    login: {
      POST: (req, res) => {
        const account = accounts.get(req.body.username);
        if (!account || !verifyPassword(req.body.password, account.passwordHash)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
          return;
        }
        return { token: generateJWT({ sub: account.id, role: account.role }, '1h', secret) };
      }
    }
  }
});
```

- `withAuth({ verify: (req) => user | null })` authenticates with your own (optionally async) check instead of a JWT secret.
- `generateJWT(payload, expiresIn, secret)` and `verifyToken(token, secret)` throw a `TypeError` without a secret; `verifyToken` returns `null` for an invalid, forged or expired token. Signatures are compared in constant time.
- `generateToken(length)` returns a random hex string (for API keys, reset tokens...), not a JWT.

### Password Hashing

```javascript
import { hashPassword, verifyPassword } from '@coherent.js/api';

const stored = hashPassword('userPassword');          // "<salt>:<hash>", synchronous
const isValid = verifyPassword('userPassword', stored); // true
```

Both are synchronous and use PBKDF2-SHA512 with 10,000 iterations, which is below current OWASP guidance; use a dedicated password-hashing library (argon2, scrypt or bcrypt) for new systems.

### WebSockets

With `enableWebSockets: true`, `router.addWebSocketRoute(path, handler, { allowedOrigins })` accepts upgrades. Only same-origin browser handshakes are accepted unless `wsAllowedOrigins` (router) or `allowedOrigins` (route) lists the origins to allow; messages above `wsMaxPayload` (1 MiB) close the connection.

> **Stability:** WebSocket routing is experimental: a minimal built-in implementation that delivers text messages only (binary frames are ignored). Use a dedicated WebSocket library for anything demanding.

## Security Best Practices

1. **Validate input** - use `validation` / `withValidation` on every write route
2. **Escape on output** - escape at render time (`@coherent.js/core` does this for you); the router does not rewrite request bodies
3. **Use HTTPS** - deploy with TLS
4. **Configure CORS** - list the origins you trust
5. **Keep secrets out of code** - read `JWT_SECRET` from the environment
6. **Set `trustProxy`** when running behind a reverse proxy
7. **Monitor logs** - 5xx errors are logged, not sent to clients
8. **Keep dependencies updated**
