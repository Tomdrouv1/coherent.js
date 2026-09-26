---
"@coherent.js/i18n": minor
---

Add `Translator#forLocale()` for request-scoped translation on the server.

`currentLocale` lives on the translator instance, so concurrent SSR requests
sharing one translator raced: a `setLocale()` in one request changed the
language of another request's output. `i18n.forLocale(locale, { escape })`
returns `{ locale, t, has, getLocale }` bound to that locale; it never reads or
writes `currentLocale` and sees translations added to the shared instance
later. The locale resolves like `setLocale()` (`fr-FR` → `fr`) and falls back
to the fallback locale without a console warning. `setLocale()` is unchanged
and remains the API for client-side use.
