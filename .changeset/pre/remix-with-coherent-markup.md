---
"@coherent.js/integrations": minor
---

Make Remix `withCoherent()` render markup instead of escaped text.

**Behavior change:** the React component returned by `withCoherent()` returned
the rendered HTML *string*, which React escapes, so pages showed
`&lt;strong&gt;Bob&lt;/strong&gt;` as literal text. It now renders the
Coherent.js output inside a wrapper element through `dangerouslySetInnerHTML`
(the Coherent.js renderer already escapes text and attribute values). The
wrapper is a `<div>` by default.

**Migration:** none for most routes. If the extra `<div>` affects layout, pick
the wrapper tag with `withCoherent(Component, { as: 'section' })` (or `'span'`
for inline content). The `remix` subpath now imports `react`, which every
Remix app already has.
