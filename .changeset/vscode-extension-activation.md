---
"coherent-language-support": patch
"@coherent.js/tooling": patch
---

Make the VS Code extension start, and its language server load.

- `activationEvents` was empty and the extension contributes no languages or
  commands, so VS Code never activated it. It now activates on JavaScript,
  TypeScript, JSX and TSX files.
- `server/` was a plain copy of `@coherent.js/tooling`'s build, but the
  `.vsix` ships without `node_modules`, so the server died with
  `ERR_MODULE_NOT_FOUND 'vscode-languageserver'`. The build now bundles the
  server from tooling's source into one self-contained `server/server.js`
  (dependencies and the extracted element data inlined). It no longer depends
  on tooling being built first, which also removes the race where the element
  data JSON could be missing. `server/` is build output and no longer
  committed.
- `coherent.trace.server` now takes effect (the client id did not match the
  setting's prefix).
- `scripts/check-vsix.mjs` now also checks the activation events and spawns the
  packaged server alone with `--stdio`, requiring an answer to `initialize`.
- tooling: the element data loader lives in its own module
  (`lsp/data/generated-data`) so bundlers can inline it, and
  `scripts/extract-attributes.ts` accepts `--out <file>`.
