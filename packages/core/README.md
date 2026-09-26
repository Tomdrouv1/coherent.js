# @coherent.js/core

[![npm version](https://img.shields.io/npm/v/@coherent.js/core.svg)](https://www.npmjs.com/package/@coherent.js/core)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 22.12](https://img.shields.io/badge/node-%3E%3D22.12-brightgreen)](https://nodejs.org)

Core runtime for Coherent.js — an object-based SSR framework: components are plain JavaScript objects rendered to HTML.

- ESM-only, Node 22.12+
- Synchronous `render()` to a string, and `renderToStream()` for large pages
- Escaped text and attribute values by default; raw HTML only through `html:` or `dangerouslySetInnerContent()`
- Opt-in scoped CSS, memoization and whole-render caching

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherent.js/core
```

## Quick start

```js
import { render } from '@coherent.js/core';

const Greeting = ({ name }) => ({
  div: {
    className: ['greeting', name === 'Ada' && 'greeting--vip'],
    children: [
      { h1: { text: `Hello ${name}` } },           // text is escaped
      name === 'Ada' && { p: { text: 'Welcome back' } } // false renders nothing
    ]
  }
});

render(Greeting({ name: 'Ada' }));
// <div class="greeting greeting--vip"><h1>Hello Ada</h1><p>Welcome back</p></div>
```

## Rendering

- `render(component, options?)` returns an HTML string. It is synchronous: await data and async components first (a Promise in the tree throws).
- A function component that throws makes `render()` throw a `RenderingError` naming the component's path, with the original error as `cause`. Pass `onError: (error, { path }) => replacement` to render something else in its place (`null` omits it).
- Options: `scoped` (scoped CSS), `minify`, `maxDepth`, `enableMonitoring`, `enableCache` / `cache` (see below), `onError`.

### Streaming

```js
import { Readable } from 'node:stream';
import { renderToStream, streamingUtils } from '@coherent.js/core';

// An async generator of HTML chunks with exactly render()'s output
Readable.from(renderToStream(Page(), { chunkSize: 16384 })).pipe(res);

// or: writes with backpressure and aborts the response if rendering fails
await streamingUtils.streamToResponse(renderToStream(Page()), res);
```

The event loop gets a turn after every chunk, so the first bytes of a large page leave early and other requests keep being served; total render time is somewhat higher than `render()`.

### Caching

Nothing is cached unless you ask:

```js
import { memo, render, createCacheManager } from '@coherent.js/core';

// Per-component memoization; every memoized component has its own LRU
const Row = memo(({ item }) => ({ li: { text: item.name } }), {
  keyFn: ({ item }) => `${item.id}:${item.version}`,
  maxSize: 1000
});

// Whole-render cache, keyed on the complete tree (trees containing
// functions are never cached). Only useful for re-rendering identical trees.
const cache = createCacheManager({ maxCacheSize: 500, ttlMs: 60_000 });
render(StaticPage(), { enableCache: true, cache });
```

### Raw HTML

Text and attribute values are always escaped. Raw markup goes through the `html:` key or `dangerouslySetInnerContent()`; markers from that function carry a symbol brand, so objects parsed from JSON are never treated as trusted. Attribute names that could break out of the tag (whitespace, quotes, `<`, `>`, `/`, `=`) make `render()` throw.

### Event handlers

Function-valued `on*` props render nothing on the server; `@coherent.js/client`'s `hydrate()` attaches them in the browser. Inline string handlers (`onclick: 'history.back()'`) are rendered as attributes.

## Exports overview

- Rendering: `render`, `renderToStream`, `streamingUtils`, `formatAttributes`, `escapeHtml`, `isValidAttributeName`, `dangerouslySetInnerContent`, `isTrustedContent`
- Components: `createComponent`, `defineComponent`, `registerComponent`, `memo`, `memoComponent`, `lazy`, `withState`, `withStateUtils`
- Error boundaries: `createErrorBoundary`, `withErrorBoundary`, `createAsyncErrorBoundary`, `createGlobalErrorHandler`
- Caching and monitoring: `createCacheManager`, `cacheManager`, `memoize`, `performanceMonitor`
- Events: `createEventBus`, `globalEventBus`, `withEventBus`, `eventSystem`

`createComponent()` returns a *stateful instance* (`mount`, `update`, `destroy`, instance state) meant for the browser. On the server, pass per-request data through props: instance state is shared by every request that renders the same component.

## Development

```bash
pnpm vitest run packages/core     # tests (from the repo root)
pnpm --filter @coherent.js/core run typecheck
pnpm --filter @coherent.js/core run build
pnpm perf:render                  # rendering benchmark
```

## License

MIT © Coherent.js Team
