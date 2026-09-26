---
"@coherent.js/forms": minor
---

Add CSRF support.

- New server-only subpath `@coherent.js/forms/csrf`: `createCsrfToken(secret,
  sessionId)` issues a stateless token signed with HMAC-SHA256 over its issue
  time, a random nonce and the session id; `verifyCsrfToken(token, secret,
  sessionId, { maxAge })` returns `false` (never throws) for a missing,
  malformed, forged, expired or other-session token, comparing in constant
  time. It uses `node:crypto`, so it is not re-exported from the package root,
  which stays browser-safe.
- `buildForm({ csrfToken })` renders the token as a hidden `_csrf` input, first
  in the form (`csrfFieldName` renames it). `hydrateForm` submits it with the
  other values.
