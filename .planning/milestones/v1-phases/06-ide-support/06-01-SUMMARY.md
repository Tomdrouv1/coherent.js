---
phase: 06-ide-support
plan: 01
subsystem: tooling
tags: [lsp, language-server, ide, autocomplete, validation, typescript]

dependency_graph:
  requires: [05-01]
  provides: [language-server, attribute-extraction, nesting-validation, completion-provider]
  affects: [06-02]

tech_stack:
  added: [vscode-languageserver@9.0.1, vscode-languageserver-textdocument@1.0.12]
  patterns: [lsp, typescript-ast-analysis, debounced-validation]

key_files:
  created:
    - packages/language-server/package.json
    - packages/language-server/tsconfig.json
    - packages/language-server/src/server.ts
    - packages/language-server/src/analysis/coherent-analyzer.ts
    - packages/language-server/src/analysis/element-validator.ts
    - packages/language-server/src/analysis/nesting-validator.ts
    - packages/language-server/src/providers/completion.ts
    - packages/language-server/src/providers/hover.ts
    - packages/language-server/src/providers/diagnostics.ts
    - packages/language-server/src/providers/code-actions.ts
    - packages/language-server/src/data/element-attributes.ts
    - packages/language-server/src/data/nesting-rules.ts
    - packages/language-server/scripts/extract-attributes.ts
  modified: []

decisions:
  - id: build-time-extraction
    choice: TypeScript Compiler API for attribute extraction
    rationale: Single source of truth from core/types/elements.d.ts
  - id: case-insensitive-typo
    choice: Handle case-insensitive matches as distance 1
    rationale: classname -> className is common typo pattern
  - id: debounced-validation
    choice: 300ms debounce for diagnostics
    rationale: Prevents excessive validation during rapid typing
  - id: provider-registration
    choice: Register providers in onInitialized
    rationale: Ensures connection is fully established before registration

metrics:
  duration: 12 min
  completed: 2026-01-22
---

# Phase 6 Plan 1: Language Server Core Summary

LSP server with TypeScript AST analysis, attribute extraction from core types, validation providers, and autocomplete.

## What Was Built

### 1. Package Structure

Created `@coherent.js/language-server` npm package with:

- LSP server entry point (`src/server.ts`) using `vscode-languageserver@9.0.1`
- Build-time attribute extraction script (`scripts/extract-attributes.ts`)
- Runtime attribute data module (`src/data/element-attributes.ts`)
- HTML5 nesting rules (`src/data/nesting-rules.ts`)

### 2. Coherent Object Analyzer

Implemented TypeScript AST-based analysis for detecting Coherent.js elements:

- `findCoherentElements()` - Finds all Coherent elements in a source file
- `getElementAtPosition()` - Gets element at cursor position
- `getPositionContext()` - Determines context (tag-name, attribute-name, etc.)
- Handles nested elements in `children` arrays

### 3. Validation Providers

**Element Validator** (`element-validator.ts`):
- Validates attributes against per-element allowed lists
- Suggests corrections for typos (Levenshtein distance)
- Catches children on void elements

**Nesting Validator** (`nesting-validator.ts`):
- Validates HTML5 content model rules
- Block-in-inline detection
- Required parent validation (li in ul/ol, td in tr, etc.)

**Diagnostics Provider** (`diagnostics.ts`):
- 300ms debounced validation on document change
- Converts validation errors to LSP diagnostics
- Publishes to Problems panel

### 4. Feature Providers

**Completion Provider** (`completion.ts`):
- Tag name completions sorted by common usage
- Attribute completions with type info and snippets
- Child element snippets
- Component scaffolding snippets

**Hover Provider** (`hover.ts`):
- Element documentation with examples
- Attribute type and description
- Event handler type information

**Code Action Provider** (`code-actions.ts`):
- Fix typo quick actions
- Remove invalid attribute
- Remove children from void elements

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Attribute source | Build-time extraction from core types | Single source of truth, no manual duplication |
| Case-insensitive typos | Treat as distance 1 | Common error pattern (classname vs className) |
| Validation debounce | 300ms | Balance responsiveness with performance |
| AST parser | TypeScript createSourceFile | Handles all JS/TS syntax, error-tolerant |

## Commits

| Hash | Description |
|------|-------------|
| 6b3e643 | Create language-server package with LSP server entry point |
| e844d8e | Implement Coherent object analyzer and validation providers |
| 9d4c251 | Implement completion, hover, and code action providers |

## Verification Results

- Package builds: PASS
- Server starts: PASS (waiting for LSP input over stdio)
- TypeScript checks: PASS
- Monorepo integration: PASS

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### For Plan 06-02 (VS Code Extension)

The language server is ready to be consumed by the VS Code extension:

1. Server exposes all required capabilities:
   - `completionProvider` with trigger characters
   - `hoverProvider`
   - `codeActionProvider` with QuickFix kind
   - `textDocumentSync: Incremental`

2. Server can be spawned via:
   ```bash
   node node_modules/@coherent.js/language-server/dist/server.js --stdio
   ```

3. Extracted attribute data covers 113 HTML elements from core types

### Blockers/Concerns

None identified.
