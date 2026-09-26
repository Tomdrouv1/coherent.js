---
"@coherent.js/client": patch
---

Bind hydrated handlers to the element that rendered them.

`hydrate()` paired a component's children with DOM nodes by raw array index,
so anything the server does not render as an element — a `null` from a
conditional, a string, a nested array, a `text` prop, raw HTML — shifted every
following element. With `children: [null, deleteButton, saveButton]`, clicking
Save ran the delete handler. Children are now reduced to what the server
emitted (null, undefined and booleans dropped, arrays flattened, zero-argument
function components called, adjacent strings merged, whitespace-only text
ignored) and elements are paired with element nodes only; elements after raw
HTML are paired from the end.

The mismatch detector uses the same normalisation, so identical server and
client output no longer reports `children_count` and `text` mismatches, and a
`null` or `false` attribute value is expected to be absent rather than the
string `"null"`.
