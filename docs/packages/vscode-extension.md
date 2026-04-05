# VS Code Extension

`coherent-language-support` is the official Visual Studio Code extension for Coherent.js. It provides IntelliSense, validation, hover documentation, and code snippets for Coherent.js component development.

## Installation

Install from the VS Code Marketplace by searching for "Coherent.js Language Support", or build from source:

```bash
cd packages/vscode-extension
pnpm install
pnpm build
pnpm package   # produces a .vsix file
```

Then install the `.vsix` file via **Extensions > Install from VSIX...** in VS Code.

## Features

- **Autocomplete** -- tag names, attributes, and Coherent.js-specific properties in JS/TS files.
- **Hover documentation** -- element descriptions, attribute types, and usage examples on hover.
- **Validation** -- diagnostics for invalid attributes and HTML nesting errors.
- **Quick fixes** -- code actions to correct common issues flagged by the language server.
- **Snippets** -- predefined snippets for Coherent.js elements and component functions (JS, TS, JSX, TSX).

## Supported Languages

The extension activates for: JavaScript, TypeScript, JSX, and TSX files.

## Configuration

| Setting | Type | Default | Description |
|---|---|---|---|
| `coherent.trace.server` | `"off" \| "messages" \| "verbose"` | `"off"` | Trace communication between VS Code and the language server |

## Architecture

The extension is a Language Server Protocol (LSP) client that launches the bundled `@coherent.js/language-server`. The server runs via IPC for performance and provides completions, hover, diagnostics, and code actions.

```
VS Code Extension (client)
  |-- src/extension.ts  -- activates LanguageClient
  |-- server/server.js  -- bundled language server
  |-- snippets/coherent.json
```

## Requirements

- VS Code 1.85.0 or later.
- The language server is bundled with the extension; no separate installation is needed.

## Known Limitations

- The extension relies on heuristic AST analysis to detect Coherent.js objects; it may not recognize all patterns.
- Snippets are static and do not adapt to project-specific component libraries.
- The extension does not yet support `.coherent.js` file associations or custom file icons.
