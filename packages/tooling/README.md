# @coherent.js/tooling

Dev-time tooling for Coherent.js: testing utilities and a Language Server Protocol (LSP) implementation, consolidated into a single package.

## What's inside

### Testing utilities

Vitest matchers, a render harness, and assorted helpers for testing Coherent.js components.

```js
import { renderComponent } from '@coherent.js/tooling/testing';
// also available:
//   '@coherent.js/tooling/testing/renderer'
//   '@coherent.js/tooling/testing/utils'
//   '@coherent.js/tooling/testing/matchers'
```

These were previously published as `@coherent.js/testing`.

### Language Server

A Language Server Protocol implementation that powers the VS Code extension and works with any LSP-compatible editor. Installs a `coherent-language-server` binary.

```bash
npm install -g @coherent.js/tooling
coherent-language-server --stdio
```

Configure your editor's LSP client to invoke `coherent-language-server` for JavaScript and TypeScript files.

These were previously published as `@coherent.js/language-server`.

## Migration

If you were depending on the old packages:

| Old                              | New                                 |
|----------------------------------|-------------------------------------|
| `@coherent.js/testing`           | `@coherent.js/tooling/testing`      |
| `@coherent.js/language-server`   | `@coherent.js/tooling` (binary unchanged: `coherent-language-server`) |
| `@coherent.js/language-service`  | removed (no replacement — it was an unused stub) |

## Build

```bash
pnpm --filter @coherent.js/tooling run build
```

The build performs four steps:

1. Extracts HTML element attributes from `@coherent.js/core` types (`tsx scripts/extract-attributes.ts`).
2. Compiles the LSP TypeScript source to `dist/lsp/` (`tsc`).
3. Copies the generated attributes JSON into `dist/lsp/data/`.
4. Bundles the JavaScript testing utilities to `dist/testing/` (esbuild).

## License

MIT
