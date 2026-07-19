# @coherent.js/core

[![npm version](https://img.shields.io/npm/v/@coherent.js/core.svg)](https://www.npmjs.com/package/@coherent.js/core)
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
pnpm add @coherent.js/core
```

Requirements:
- Node.js >= 20
- ESM module system

## Quick start

JavaScript (ESM):
```js
import { render } from '@coherent.js/core';

const html = render({
  div: { class: 'greeting', text: 'Hello Coherent' }
});

console.log(html);
```

TypeScript:
```ts
import { render } from '@coherent.js/core';

const html = render({
  div: { class: 'greeting', text: 'Hello Coherent (TS)' }
});
console.log(html);
```

## Exports overview

The package ships built ESM and CJS bundles under `dist/` with types under `types/`.

Key APIs (selected):
- Rendering
  - `render(input, options?)` – renders a component object to an HTML string
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
import { createComponent, render } from '@coherent.js/core';

const Counter = createComponent(({ count = 0 }) => ({
  div: {
    class: 'counter',
    children: [
      { span: { text: `Count: ${count}` } }
    ]
  }
}));

const html = render(Counter({ count: 2 }));
```

TypeScript:
```ts
import { createComponent, render } from '@coherent.js/core';

type Props = { count?: number };

const Counter = createComponent((props: Props) => ({
  div: {
    class: 'counter',
    children: [ { span: { text: `Count: ${props.count ?? 0}` } } ]
  }
}));

const html = render(Counter({ count: 2 }));
```

## Development

Run tests for this package:
```bash
pnpm --filter @coherent.js/core run test
```

Watch mode:
```bash
pnpm --filter @coherent.js/core run test:watch
```

Type check:
```bash
pnpm --filter @coherent.js/core run typecheck
```

Build (from package dir or via workspace filter):
```bash
pnpm --filter @coherent.js/core run build
```

## License

MIT © Coherent.js Team
