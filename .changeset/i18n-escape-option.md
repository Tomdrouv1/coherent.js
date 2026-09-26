---
"@coherent.js/i18n": minor
---

Add an `escape` option that HTML-escapes interpolated params.

A translation with user-supplied params rendered through core's `html:` was an
XSS sink, and there was no way to escape just the params. `createTranslator({
escape: true })` now escapes `&`, `<`, `>`, `"` and `'` in every interpolated
value, and `t(key, params, { escape: true })` does it for one call (`{ escape:
false }` opts a call back out). The translation template itself is never
escaped, so markup in your own messages keeps working. The third argument of
`t()` accepts `{ locale, escape }` as well as the locale string it took before.

The default stays `false`, so existing output is unchanged. `text:` remains
the safe sink: core escapes it already.
