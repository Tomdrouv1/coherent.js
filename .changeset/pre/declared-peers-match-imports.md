---
"@coherent.js/client": patch
"@coherent.js/database": patch
"@coherent.js/forms": patch
"@coherent.js/i18n": patch
"@coherent.js/integrations": patch
"@coherent.js/state": patch
---

Declare the peer dependencies packages actually use.

- `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
- Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
