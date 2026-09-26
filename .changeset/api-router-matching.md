---
"@coherent.js/api": patch
---

Router matching fixes.

- Literal route text is escaped: `/files/report.pdf` no longer matches `/files/reportXpdf` (the escape step never escaped anything).
- `/users/:id/*` gives `{ id: '42', splat: 'avatar' }`; the names were swapped.
- Optional parameters work: `/opt/:id?` matches `/opt`.
- Parameters are URL-decoded (`/users/John%20Doe` gives `'John Doe'`); a malformed escape is passed through as sent.
- Each request gets its own `req.params`: a handler mutating it no longer changes it for later requests to the same path.
- With `enableVersioning`, the route cache is keyed by API version, so a v2 request is no longer served by a cached v1 handler.
- `router.options(path, handler)` routes run; other OPTIONS requests still get the automatic 204 preflight answer.
- `HEAD` falls back to the matching `GET` route (without a body) instead of answering 404.
- `enableCompilation: false` matches exactly the same paths as the compiled mode.

**Behavior change:** parameter names are identifiers (`[A-Za-z_$][A-Za-z0-9_$]*`), so `/:from-:to` and `/:file.:ext` declare two parameters each; a name such as `:user-id` is now the parameter `user` followed by the literal `-id`.
