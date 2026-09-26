---
"@coherent.js/seo": patch
---

Escape and validate every sitemap field.

`lastmod`, `changefreq` and `priority` were written into the XML verbatim, so a
value such as `</lastmod></url><url><loc>https://evil.example/</loc>` added a
URL of the attacker's choosing to the sitemap. Every text node (and the `xmlns`
attribute) is now XML-escaped, and `loc` is serialized with `new URL(...).href`,
so spaces and non-ASCII characters are percent-encoded.

**Behavior change:** `add()` / `addMultiple()` / `generateSitemap()` now throw a
`RangeError` for a `changefreq` outside `always | hourly | daily | weekly |
monthly | yearly | never` or a `priority` that is not a number from 0.0 to 1.0,
and a `TypeError` for an absolute URL that is not `http:` or `https:` (for
example `javascript:` or `ftp:`). A path that merely starts with `http` (such
as `http-status`) is now treated as relative instead of absolute, and an
`options.loc` no longer overrides the normalized URL. Pass `null` for
`lastmod`, `changefreq` or `priority` to omit that element (a `null` priority
used to print `<priority>null</priority>`).
