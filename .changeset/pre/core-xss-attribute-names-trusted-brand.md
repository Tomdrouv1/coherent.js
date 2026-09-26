---
"@coherent.js/core": minor
---

Close two XSS vectors in the renderer.

- **Fixed (security):** attribute names were emitted unescaped, so `{ div: { 'onmouseover="alert(1)" x': 'y' } }` rendered a live event handler and a key containing `>` broke out of the tag — easy to hit when spreading request data into props. **Behavior change:** rendering an element whose attribute name contains whitespace, quotes, `<`, `>`, `/`, `=` or control characters now throws. Names like `data-*`, `aria-*`, `x-on:click`, `@click`, `:class` and `xlink:href` are unaffected. New export: `isValidAttributeName(name)`.
- **Fixed (security):** `isTrustedContent()` recognized any object with `__trusted: true` and a string `__html`, so a JSON request body could smuggle raw HTML into `text` or `children`. Markers from `dangerouslySetInnerContent()` now carry a non-enumerable `Symbol.for('coherent.js.trustedContent')` brand and are frozen; plain objects, including JSON and spread copies, are never trusted. Code that builds `{ __html, __trusted: true }` objects by hand must call `dangerouslySetInnerContent()` instead.
