---
phase: 06-ide-support
plan: 02
subsystem: tooling
tags: [vscode, extension, snippets, marketplace, ide]

dependency_graph:
  requires: [06-01]
  provides: [vscode-extension, snippets, marketplace-package]
  affects: []

tech_stack:
  added: [vscode-languageclient@9.0.1, esbuild@0.25.0, @vscode/vsce@3.3.2]
  patterns: [bundled-server, ipc-transport, code-snippets]

key_files:
  created:
    - packages/vscode-extension/package.json
    - packages/vscode-extension/tsconfig.json
    - packages/vscode-extension/src/extension.ts
    - packages/vscode-extension/snippets/coherent.json
    - packages/vscode-extension/README.md
    - packages/vscode-extension/.vscodeignore
    - packages/vscode-extension/esbuild.config.mjs
    - packages/vscode-extension/icon.svg
    - packages/vscode-extension/icon.png
    - packages/vscode-extension/CHANGELOG.md
  modified:
    - README.md

decisions:
  - id: bundled-server
    choice: Bundle language server in extension's server/ directory
    rationale: Avoids npm dependency resolution issues, works offline
  - id: ipc-transport
    choice: Use IPC transport for language client
    rationale: More reliable than stdio for VS Code extensions
  - id: cjs-extension
    choice: Bundle extension as CommonJS
    rationale: VS Code requires CommonJS for extension main entry
  - id: publish-deferred
    choice: Package VSIX but defer marketplace publish
    rationale: User preference - VSIX ready for manual publish

metrics:
  duration: 8 min
  completed: 2026-01-22
---

# Phase 6 Plan 2: VS Code Extension Summary

VS Code extension wrapping the Coherent.js language server with snippets, bundled server, and marketplace-ready package.

## What Was Built

### 1. Extension Structure

Created `packages/vscode-extension` with:

- **package.json**: Extension manifest with activation events, snippets, and configuration
- **src/extension.ts**: Language client spawning bundled server via IPC
- **esbuild.config.mjs**: Bundles extension and copies server to server/ directory
- **snippets/coherent.json**: 8 code snippets for common patterns

### 2. Code Snippets

| Prefix | Description |
|--------|-------------|
| `cel` | Coherent element |
| `ccomp` | Component function |
| `cinput` | Input element |
| `cform` | Form element |
| `cbtn` | Button element |
| `clink` | Anchor element |
| `clist` | List (ul/ol) |
| `cchildren` | Children array |

### 3. Extension Icon

Created 128x128 PNG icon with:
- Purple-to-blue gradient background (#6B46C1 to #4299E1)
- White "C" letter centered
- Rounded corners

### 4. Documentation

- **packages/vscode-extension/README.md**: Marketplace description with features
- **README.md**: Added "IDE Support" section documenting extension and standalone LSP

### 5. Package

- VSIX packaged at 151KB
- Ready for manual marketplace publish when desired

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Server bundling | Copy to server/ directory | Works offline, no npm resolution |
| Transport | IPC (not stdio) | More reliable for VS Code |
| Extension format | CommonJS | VS Code requirement |
| Publish | Deferred | User preference |

## Commits

| Hash | Description |
|------|-------------|
| a9927e6 | Create VS Code extension with language client |
| fabfa2e | Add code snippets and extension icon |
| 8c24ec0 | Add extension README and update project README |

## Verification Results

- Extension builds: PASS
- Server bundled: PASS (server/server.js exists)
- VSIX packaged: PASS (151KB)
- Local install: PASS (user verified)
- Autocomplete: PASS (user verified)
- Snippets: PASS (user verified)
- Validation: PASS (user verified)
- Go-to-definition: PASS (user verified)

## Deviations from Plan

- Marketplace publish deferred per user request
- VSIX ready for manual publish at any time

## Next Steps

To publish to VS Code Marketplace when ready:

1. Create publisher "coherentjs" at https://marketplace.visualstudio.com/manage/publishers
2. Create Personal Access Token at Azure DevOps with Marketplace (Publish) scope
3. Set VSCE_PAT environment variable
4. Run: `cd packages/vscode-extension && pnpm run publish`

Or upload VSIX manually at https://marketplace.visualstudio.com/manage/publishers/coherentjs
