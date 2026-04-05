# Language Server

`@coherent.js/language-server` is a Language Server Protocol (LSP) implementation that provides IDE support for Coherent.js. It powers the VS Code extension and can be used with any LSP-compatible editor.

## Installation

```bash
pnpm add @coherent.js/language-server
```

Or run directly:

```bash
npx coherent-language-server --stdio
```

## Features

### Autocomplete

- HTML tag names, prioritizing commonly used elements (div, span, p, a, button, etc.).
- Attribute names for each element, with type-aware insert snippets (strings get quotes, booleans get `true|false`, children get array brackets).
- Child element scaffolding inside `children` arrays.
- Coherent.js element and component snippets when outside any element context.

### Hover Documentation

- Element descriptions with example usage in Coherent.js object syntax.
- Attribute type information and usage examples for common properties (className, onClick, children, style, etc.).
- Event handler type mapping (e.g., `onClick` shows `MouseEvent`).

### Diagnostics

- Invalid attribute validation against known HTML element attributes.
- HTML nesting rule validation (e.g., `<p>` cannot contain `<div>`).
- Debounced validation (300ms) to avoid excessive checks during typing.

### Code Actions

- Quick fixes for diagnostics flagged by the server (e.g., attribute name corrections).

## Architecture

```
src/
  server.ts                   -- LSP connection setup
  providers/
    completion.ts             -- Autocomplete provider
    hover.ts                  -- Hover documentation
    diagnostics.ts            -- Validation and error reporting
    code-actions.ts           -- Quick fix code actions
  analysis/
    coherent-analyzer.ts      -- AST analysis for Coherent.js objects
    element-validator.ts      -- Attribute validation
    nesting-validator.ts      -- HTML nesting rules
  data/
    element-attributes.ts     -- HTML element and attribute database
    nesting-rules.ts          -- Valid parent-child relationships
```

## Editor Integration

### VS Code

Use the `coherent-language-support` extension which bundles this server. See [VS Code Extension docs](../vscode-extension/README.md).

### Other Editors

Any LSP-compatible editor can use this server. Start it with `--stdio` transport:

```bash
coherent-language-server --stdio
```

Configure your editor's LSP client to connect to the server for JavaScript, TypeScript, JSX, and TSX files.

## Configuration

The server reads configuration from the `coherent` section of your editor settings. Currently supported:

| Setting | Description |
|---|---|
| `coherent.trace.server` | Trace level for LSP communication (`off`, `messages`, `verbose`) |

## Building from Source

```bash
cd packages/language-server
pnpm build    # extracts attributes, compiles TypeScript
pnpm start    # runs the compiled server
```

## Known Limitations

- The AST analyzer uses heuristic detection to identify Coherent.js object patterns; it may miss dynamically constructed components.
- Completion trigger characters are `{`, `:`, `"`, `'` -- completions may not appear in all contexts.
- The attribute database is generated at build time; custom or non-standard attributes are not validated.
- Requires Node.js 20+.
