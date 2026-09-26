---
"@coherent.js/core": patch
---

`renderWithTemplate` no longer corrupts pages containing `$` sequences. It
inserted the rendered HTML with `String.prototype.replace(placeholder, html)`,
which expands replacement patterns, so user text such as `Pay $$10` lost a
dollar sign and `` $` `` / `$'` spliced the template's own markup into the
page. This affected every Express, Fastify, Koa and Next.js response rendered
through a template.
