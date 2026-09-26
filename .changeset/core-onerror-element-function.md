---
"@coherent.js/core": patch
---

Render `onError`'s replacement in place of an element whose content function throws.

- **Fixed:** for `{ div: () => { throw ... } }`, the component returned by `render()`'s `onError` option was used as the `<div>`'s props, so the fallback came out as `<div p="[object Object]"></div>`. It now replaces the whole element, in `render()` and `renderToStream()` alike, as it already did for function components in `children`.
