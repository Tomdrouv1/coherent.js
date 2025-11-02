# @coherentjs/core

[![npm version](https://img.shields.io/npm/v/@coherentjs/core.svg)](https://www.npmjs.com/package/@coherentjs/core)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Core runtime for Coherent.js — an object-based SSR framework focused on performance, streaming, and simplicity.

- ESM-only, Node 20+
- Pure object rendering to HTML
- Optional CSS-like scoping for component encapsulation
- Component system utilities, error boundaries, and performance hooks

For a high-level overview and repository-wide instructions, see the root README: ../../README.md

## Installation

```bash
pnpm add @coherentjs/core
```

Requirements:
- Node.js >= 20
- ESM module system

## Quick start

JavaScript (ESM):
```js
import { renderToString } from '@coherentjs/core';

const html = await renderToString({
  div: { class: 'greeting', text: 'Hello Coherent' }
});

console.log(html);
```

TypeScript:
```ts
import { renderToString } from '@coherentjs/core';

async function main() {
  const html = await renderToString({
    div: { class: 'greeting', text: 'Hello Coherent (TS)' }
  });
  console.log(html);
}

main();
```

## Exports overview

The package uses conditional exports; in development it may resolve to `src` while production resolves to `dist`.

Key APIs (selected):
- Rendering
  - `renderToString(input, options?)`
  - `render(input)` (alias of `renderToString`)
  - `renderScopedComponent(input)` – applies scoped attributes and style processing
  - `renderUnsafe(input)` – render without encapsulation
- Component system (re-exported from internal modules)
  - `createComponent`, `defineComponent`, `registerComponent`, `getComponent`, `getRegisteredComponents`
  - State helpers: `withState`, `withStateUtils`, `createStateManager`
  - Lazy: `lazy`, `isLazy`, `evaluateLazy`
- Error boundaries (selected)
  - `createErrorBoundary`, `withErrorBoundary`, `createAsyncErrorBoundary`
  - `createGlobalErrorHandler`, `GlobalErrorHandler`

Tip: When working in the monorepo website/dev flow, imports can resolve to `src` via `exports.development`.

## Minimal component example

```js
import { createComponent, renderToString } from '@coherentjs/core';

const Counter = createComponent(({ count = 0 }) => ({
  div: {
    class: 'counter',
    children: [
      { span: { text: `Count: ${count}` } }
    ]
  }
}));

const html = await renderToString(Counter({ count: 2 }));
```

TypeScript:
```ts
import { createComponent, renderToString } from '@coherentjs/core';

type Props = { count?: number };

const Counter = createComponent((props: Props) => ({
  div: {
    class: 'counter',
    children: [ { span: { text: `Count: ${props.count ?? 0}` } } ]
  }
}));

const html = await renderToString(Counter({ count: 2 }));
```

## Development

Run tests for this package:
```bash
pnpm --filter @coherentjs/core run test
```

Watch mode:
```bash
pnpm --filter @coherentjs/core run test:watch
```

Type check:
```bash
pnpm --filter @coherentjs/core run typecheck
```

Build (from package dir or via workspace filter):
```bash
pnpm --filter @coherentjs/core run build
```

## License

MIT © Coherent.js Team
