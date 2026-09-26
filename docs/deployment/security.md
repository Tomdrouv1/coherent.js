# Coherent.js Security Guide

This guide covers the security features built into Coherent.js — the renderer, the `@coherent.js/api` router and the other packages — and how to use them safely.

## Table of Contents

- [Rendering and XSS](#rendering-and-xss)
- [Authentication & Authorization](#authentication--authorization)
- [Input Validation](#input-validation)
- [Rate Limiting & DoS Protection](#rate-limiting--dos-protection)
- [Security Headers](#security-headers)
- [CORS Configuration](#cors-configuration)
- [Request Size Limits](#request-size-limits)
- [Error Messages](#error-messages)
- [Password Security](#password-security)
- [CSRF Protection](#csrf-protection)
- [Database Queries](#database-queries)
- [Development Server](#development-server)
- [Security Testing](#security-testing)

## Rendering and XSS

`@coherent.js/core` escapes by default:

- `text` and every attribute value are HTML-escaped.
- Attribute **names** are validated: a name containing whitespace, quotes, `<`, `>`, `/`, `=` or control characters makes `render()` throw, so spreading request data into props cannot inject an attribute or break out of a tag.
- Function-valued `on*` props render nothing on the server.
- The text of a `<script>` or `<style>` element cannot close the element.

Raw HTML only goes through two explicit doors, `html:` and `dangerouslySetInnerContent()`:

```javascript
import { dangerouslySetInnerContent } from '@coherent.js/core';

{ div: { html: sanitizedHtml } }                                   // raw
{ div: { children: [dangerouslySetInnerContent(sanitizedHtml)] } } // raw
```

Markers from `dangerouslySetInnerContent()` carry a non-enumerable symbol brand. A plain object such as `{ "__html": "<img onerror=...>", "__trusted": true }` — for example from a JSON request body — is never treated as trusted. Only pass HTML you produced or sanitized with a dedicated HTML sanitizer (a regex-based "escape" is not a sanitizer).

Related helpers:

- `@coherent.js/seo` writes JSON-LD with `<`, `>` and `&` escaped, so structured data cannot swallow the page.
- `@coherent.js/i18n` can escape interpolated params: `createTranslator({ escape: true })` or `t(key, params, { escape: true })`. `text:` is escaped by core anyway; this matters when you insert a translation through `html:`.

## Authentication & Authorization

### JWT Authentication

`@coherent.js/api` has no default secret: `withAuth()`, `generateJWT()` and `verifyToken()` throw without one.

```javascript
import { createRouter, withAuth, withRole, generateJWT } from '@coherent.js/api';

const secret = process.env.JWT_SECRET; // e.g. `openssl rand -hex 32`
const auth = withAuth({ secret });     // verifies Authorization: Bearer <jwt> (HS256)

// Issue a token (payload, expiresIn, secret)
const token = generateJWT({ sub: 123, role: 'user' }, '24h', secret);

const router = createRouter({
  api: {
    profile: {
      GET: { middleware: [auth], handler: (req) => ({ user: req.user }) }
    },
    admin: {
      GET: { middleware: [auth, withRole('admin')], handler: () => ({ message: 'Admin access granted' }) }
    }
  }
});
```

Middleware that answers (401 from `withAuth`, 403 from `withRole`) stops the chain: the handler does not run. Signatures are compared in constant time, and `verifyToken()` returns `null` for an invalid, forged or expired token.

### Custom Authentication

`withAuth({ verify })` accepts any scheme; the verifier may be async and returns the user or `null`:

```javascript
const apiKeyAuth = withAuth({
  verify: async (req) => {
    const apiKey = req.headers['x-api-key'];
    return apiKey ? await getUserByApiKey(apiKey) : null; // null → 401
  }
});
```

Or throw an error class from middleware:

```javascript
import { AuthenticationError } from '@coherent.js/api';

const requireApiKey = async (req) => {
  if (!(await validateApiKey(req.headers['x-api-key']))) {
    throw new AuthenticationError('Invalid API key'); // answered with 401
  }
};
```

## Input Validation

```javascript
import { createRouter } from '@coherent.js/api';

const userSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' },
    email: { type: 'string', format: 'email', maxLength: 255 },
    age: { type: 'integer', minimum: 13, maximum: 120 }
  },
  required: ['username', 'email'],
  additionalProperties: false
};

const router = createRouter({
  api: {
    users: {
      POST: {
        validation: userSchema,              // or middleware: [withValidation(userSchema)]
        handler: (req) => createUser(req.body) // req.body is the validated data
      }
    }
  }
});
```

Invalid input is answered with 400 and `details.errors: [{ field, message, rule }]`. JSON bodies are parsed with `__proto__`, `constructor` and `prototype` keys removed at every depth.

### Custom Validation

```javascript
import { ApiError, ConflictError } from '@coherent.js/api';

const validateUserInput = async (req) => {
  if (await userExists(req.body.username)) {
    throw new ConflictError('Username already exists');    // 409
  }
  if (await isEmailBlocked(req.body.email)) {
    throw new ApiError('Email domain not allowed', 400);
  }
};
```

`withSanitization()` from `@coherent.js/api/middleware` HTML-escapes every string in `req.body`, `req.query` and `req.params` (idempotently). Prefer escaping at render time, which core already does; sanitizing input changes the data you store.

## Rate Limiting & DoS Protection

### Router Rate Limiting

The router limits every client to 100 requests per minute by default and answers 429 with `Retry-After`:

```javascript
const router = createRouter(routes, {
  rateLimit: { windowMs: 60_000, maxRequests: 100 },
  trustProxy: 1 // one reverse proxy in front of the server
});
```

- The client is the **TCP peer address**. Behind a reverse proxy, set `trustProxy` to the number of proxies that append to `X-Forwarded-For` (`true` means one); the client is then read that many hops from the right, so spoofed leading entries are ignored. Without it, every client shares the proxy's budget.
- `rateLimit.keyGenerator(req)` supplies your own key (for example the user id); `rateLimit: false` disables the limiter when the proxy already limits.
- Each router has its own store, capped at 100,000 clients.

### Per-Route Limits

`withRateLimit({ windowMs, max })` from `@coherent.js/api/middleware` adds a stricter limit to one route (it keys on `req.ip`, or the socket address):

```javascript
import { withRateLimit } from '@coherent.js/api/middleware';

router.post('/api/login', loginHandler, {
  middleware: [withRateLimit({ windowMs: 5 * 60_000, max: 5 })]
});
```

## Security Headers

The router adds these headers to every response (`enableSecurityHeaders: false` turns them off):

```javascript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

Add others with middleware:

```javascript
const addCustomHeaders = (req, res) => {
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
};

router.get('/api/secure', () => ({ message: 'Secure endpoint' }), { middleware: [addCustomHeaders] });
```

## CORS Configuration

```javascript
createRouter(routes, { corsOrigin: 'https://yourdomain.com' });

createRouter(routes, {
  corsOrigin: ['https://app.yourdomain.com', 'https://admin.yourdomain.com']
});
```

The request's `Origin` is matched against the allowlist and echoed back on a
match, together with `Vary: Origin` so caches do not serve one origin's
response to another. An unlisted origin receives no CORS headers.
`Access-Control-Allow-Credentials: true` is sent only for an explicitly configured origin, never with `'*'`.

### WebSockets

WebSocket routes (`enableWebSockets: true`) accept only same-origin browser handshakes unless `wsAllowedOrigins` (router) or `allowedOrigins` (route) lists the origins to allow, which prevents cross-site WebSocket hijacking. Messages above `wsMaxPayload` (1 MiB) close the connection.

## Request Size Limits

```javascript
createRouter(routes, { maxBodySize: 5 * 1024 * 1024 }); // default 1 MB
```

Larger bodies are answered with 413; a `Content-Length` above the limit is rejected before the body is read, and the connection is closed. For an endpoint that needs its own limit, check it in middleware:

```javascript
import { ApiError } from '@coherent.js/api';

const limitUploads = (req) => {
  if (Number(req.headers['content-length'] ?? 0) > 50 * 1024 * 1024) {
    throw new ApiError('File too large', 413);
  }
};
```

The router-level `maxBodySize` must be at least as large as any per-route limit, since the body is read before the route runs.

## Error Messages

5xx responses carry only the generic status text (`{ "error": "Internal Server Error" }`); the real error is logged with `console.error`. `exposeErrors: true` (or `NODE_ENV=development`) sends the message, for local debugging only. The same rule applies to `createErrorHandler()` for Express, and the Fastify adapter routes render errors through Fastify's own error handler.

## Password Security

```javascript
import { hashPassword, verifyPassword, generateJWT } from '@coherent.js/api';

// Registration
const passwordHash = hashPassword(password);   // "<salt>:<hash>", synchronous
await createUser({ username, passwordHash });

// Login
const user = await getUserByUsername(username);
if (!user || !verifyPassword(password, user.passwordHash)) {
  throw new AuthenticationError('Invalid credentials');
}
const token = generateJWT({ sub: user.id }, '1h', process.env.JWT_SECRET);
```

`hashPassword()` uses PBKDF2-SHA512 with 10,000 iterations, below current OWASP guidance; for new systems prefer argon2, scrypt or bcrypt. `verifyPassword()` compares in constant time.

### Password Policies

```javascript
const validatePassword = (password) => {
  if (password.length < 12) {
    throw new ApiError('Password must be at least 12 characters long', 400);
  }
};
```

Length matters more than character classes; also reject passwords known from breaches.

## CSRF Protection

`@coherent.js/forms/csrf` (server-only) issues stateless tokens tied to a session:

```javascript
import { render } from '@coherent.js/core';
import { createFormBuilder } from '@coherent.js/forms';
import { createCsrfToken, verifyCsrfToken } from '@coherent.js/forms/csrf';

const signup = createFormBuilder({ action: '/signup', method: 'post', fields: [/* ... */] });

// GET: the token becomes a hidden _csrf input
const csrfToken = createCsrfToken(process.env.CSRF_SECRET, req.session.id);
res.send(render(signup.buildForm({ csrfToken })));

// POST: reject the request unless the token matches this session
if (!verifyCsrfToken(req.body._csrf, process.env.CSRF_SECRET, req.session.id, { maxAge: 3_600_000 })) {
  return res.status(403).send('Invalid CSRF token');
}
```

`verifyCsrfToken()` returns `false` (it never throws) for a missing, malformed, forged, expired or other-session token, and compares in constant time. See [Forms](../packages/forms.md).

## Database Queries

- `db.query(sql, params)`: always use `?` placeholders for values.
- The object query builder (`executeQuery`) binds values and validates identifiers, operators, `orderBy` directions and `limit` / `offset`; it refuses UPDATE and DELETE without `where` unless `allowFullTable: true`.
- **Do not pass request data as a WHERE value unchecked**: a plain object is read as an operator object, so `where: { id: req.body.id }` lets a client send `{ "id": { ">": 0 } }`. Check the type first (`Number.isInteger(id)`), or use `Model.where()`, which rejects operator objects and arrays.

## Development Server

The CLI's built-in development server (`coherent dev --coherent`) serves only files whose real path (after symlinks) is inside the project, its workspace root or the real directory of a linked `node_modules` package; dotfiles such as `.env` and `.git` are refused. Requests whose `Host` is not `localhost`, an IP address, the bound host or a name passed with `--allowed-hosts a,b` get 403, and HMR WebSocket connections from another origin are refused. It is still a development tool: do not expose it publicly.

## Security Testing

```javascript
import { describe, it, expect } from 'vitest';

describe('security', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await fetch(`${baseUrl}/api/profile`);
    expect(res.status).toBe(401);
  });

  it('rejects invalid input', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '<script>', email: 'nope' })
    });
    expect(res.status).toBe(400);
  });

  it('escapes user content in pages', () => {
    const html = render({ p: { text: '<script>alert(1)</script>' } });
    expect(html).not.toContain('<script>');
  });

  it('does not leak internal errors', async () => {
    const res = await fetch(`${baseUrl}/api/boom`);
    expect(await res.json()).toEqual({ error: 'Internal Server Error' });
  });
});
```

## Conclusion

Security is a shared responsibility. Keep dependencies updated, keep secrets out of code, set `trustProxy` behind proxies, validate input, and let the renderer escape output. To report a vulnerability, see the project's [security policy](../../SECURITY.md).
