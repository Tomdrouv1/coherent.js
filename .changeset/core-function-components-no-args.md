---
"@coherent.js/core": patch
"@coherent.js/client": patch
---

Call function components without arguments, whatever their arity.

- **Behavior change:** a function child that declares a parameter used to receive a render callback returning an HTML string, which was then escaped (double-escaped context providers), and `({ name }) => …` children destructured their props from that callback. Every function component is now called with no arguments, on the server, inside error boundaries, and when `@coherent.js/client` pairs virtual nodes with the DOM.
- The client recognizes trusted content by the same symbol brand as core.
- Types: `className` / `class` accept arrays and `{ name: condition }` objects, and `onClick` / `onSubmit` handlers may take the event.
