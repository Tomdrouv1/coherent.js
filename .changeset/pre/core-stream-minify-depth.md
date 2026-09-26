---
"@coherent.js/core": patch
---

Make `renderToStream()` honour `minify` and `maxDepth` like `render()`.

- **Fixed:** `renderToStream(tree, { minify: true })` ignored `minify`, so the stream differed from `render()`. Streamed output is now minified incrementally and matches `render(tree, { minify: true })` exactly, whatever the `chunkSize`.
- **Fixed:** very deeply nested arrays overflowed the call stack (`RangeError`) instead of reporting `Maximum render depth exceeded`: the input check recursed through nested arrays without a bound (in `render()` too), and streaming did not check the depth of arrays and function results.
