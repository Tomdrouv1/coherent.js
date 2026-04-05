# @coherent.js/language-server

Language Server Protocol (LSP) implementation for Coherent.js, providing autocomplete, validation, hover documentation, and quick-fix code actions for IDE integration.

## Features

- **Autocomplete** for HTML tag names and element-specific attributes in Coherent.js object syntax
- **Hover documentation** with element descriptions, attribute types, and usage examples
- **Diagnostics** for invalid attributes and HTML nesting rule violations
- **Code actions** with quick fixes for common validation errors

## Installation

```bash
npm install @coherent.js/language-server
```

## Usage

Start the server with stdio transport:

```bash
npx coherent-language-server --stdio
```

The server handles JavaScript, TypeScript, JSX, and TSX files. It communicates using the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/).

## VS Code

For VS Code, use the `coherent-language-support` extension in `packages/vscode-extension/`, which bundles this server automatically.

## Building

```bash
pnpm build    # extract attributes + compile TypeScript
pnpm start    # run the server
pnpm dev      # watch mode
```

## Architecture

- `src/server.ts` -- LSP connection and capability registration
- `src/providers/` -- completion, hover, diagnostics, and code-action handlers
- `src/analysis/` -- Coherent.js AST analyzer, attribute validator, nesting validator
- `src/data/` -- HTML element/attribute database and nesting rules

## Requirements

- Node.js >= 20.0.0

## License

MIT
