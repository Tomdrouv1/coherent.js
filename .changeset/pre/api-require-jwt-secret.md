---
"@coherent.js/api": minor
---

Require an explicit JWT secret.

`generateJWT()`, `verifyToken()` and `withAuth()` used to fall back to the built-in secret `'your-secret-key'`. It is public, so anyone could sign a token (`{ role: 'admin' }` included) that a `withAuth()` without a configured secret accepted.

**Behavior change:** there is no default secret any more.

- `withAuth()` throws a `TypeError` when created without `secret` (or `verify`). Pass it explicitly: `withAuth({ secret: process.env.JWT_SECRET })`.
- `generateJWT(payload, expiresIn, secret)` and `verifyToken(token, secret)` throw a `TypeError` when `secret` is missing or empty, instead of signing or verifying with the public default.

New: `withAuth({ verify: (req) => user | null })` authenticates through a custom (optionally async) verifier instead of a JWT secret. The `AuthConfig` type now declares `secret` and drops `roles`, `permissions` and `strategy`, which were never implemented.
