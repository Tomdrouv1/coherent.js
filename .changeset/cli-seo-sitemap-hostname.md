---
"@coherent.js/cli": patch
---

The scaffolded seo helper builds a sitemap of absolute URLs.

`getSitemap()` in the generated `src/utils/seo.js` called `generateSitemap()`
without a `hostname`, so every `<loc>` was a bare path (`/about`), which
search engines reject. It now passes the site origin from `BASE_URL`
(`https://example.com` is a placeholder fallback), exposed as `getBaseUrl()`
and shared with `getPageMeta()`'s canonical and image URLs.
