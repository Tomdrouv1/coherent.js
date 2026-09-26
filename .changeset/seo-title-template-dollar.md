---
"@coherent.js/seo": patch
---

Insert titles into a title template literally.

`title(title, { template })` and `generateMeta({ titleTemplate })` used
`String#replace` with the title as the replacement string, so `$&`, `$'`,
`` $` `` and `$$` in a title were expanded as replacement patterns
(`"Win $&"` in `"Save %s now | Shop"` became `"Save Win %s now | Shop"`).

**Behavior change:** those sequences now appear in the title exactly as
written.
