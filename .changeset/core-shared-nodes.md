---
"@coherent.js/core": patch
---

Allow the same object to appear more than once in a component tree.

- **Fixed:** cycle detection added every rendered object to a set and never removed it, so reusing an element, a props object or a children array — or rendering the same `memo()` result twice on a page — threw "Circular reference detected". Only the current ancestor path is tracked now; real cycles, including an array that contains itself, are still reported.
