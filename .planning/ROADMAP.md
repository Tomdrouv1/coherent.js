# Roadmap: Coherent.js Stabilization

## Overview

This roadmap stabilizes Coherent.js from a feature-rich but unstable framework into a production-ready SSR solution. The journey starts with foundational rendering correctness (eliminating crashes, implementing key-based reconciliation), progresses through hydration reliability and CLI scaffolding, then delivers developer experience improvements (HMR, TypeScript, IDE support). Each phase builds on the previous — rendering must be correct before hydration can work, and both must be stable before HMR can preserve state.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Stable rendering engine with key-based reconciliation
- [x] **Phase 2: Hydration** - Reliable client-side hydration with event delegation
- [x] **Phase 3: CLI Scaffolding** - Working project generator with current APIs
- [x] **Phase 4: Hot Module Replacement** - State-preserving development updates
- [x] **Phase 5: TypeScript** - Complete type definitions across all packages
- [x] **Phase 6: IDE Support** - Language server and VS Code extension

## Phase Details

### Phase 1: Foundation
**Goal**: Rendering engine handles all edge cases without crashing, and DOM reconciliation uses keys for stable element identity
**Depends on**: Nothing (first phase)
**Requirements**: REND-01, REND-02, REND-03, REND-04, RECON-01, RECON-02, RECON-03, RECON-04
**Success Criteria** (what must be TRUE):
  1. Renderer accepts null, undefined, empty arrays, and nested objects without throwing errors
  2. HTML nesting validation prevents invalid structures (e.g., `<p><div>`) from producing browser mismatches
  3. Component errors are caught and displayed with file/line information instead of crashing the app
  4. List items with `key` props maintain their state when reordered, added, or removed
  5. Development mode warns when list items are missing keys
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Defensive input handling and circular reference detection
- [x] 01-02-PLAN.md — HTML nesting validation with dev warnings
- [x] 01-03-PLAN.md — Key prop support and key-based reconciliation

### Phase 2: Hydration
**Goal**: Client-side hydration reliably attaches to server-rendered HTML with event delegation and state preservation
**Depends on**: Phase 1 (key-based reconciliation required for stable hydration)
**Requirements**: HYDR-01, HYDR-02, HYDR-03, HYDR-04, HYDR-05, HYDR-06, HYDR-07
**Success Criteria** (what must be TRUE):
  1. Development mode detects server/client mismatch and shows exact location of divergence
  2. Event handlers work after hydration without per-element attachment (delegation pattern)
  3. Event handlers survive DOM updates without needing re-attachment
  4. Component state serializes to data-state attribute and deserializes correctly on client
  5. `hydrate()` API is simple: one function call with component and container
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Event delegation system with document-level listeners
- [x] 02-02-PLAN.md — State serialization with base64 encoding
- [x] 02-03-PLAN.md — Mismatch detection for development mode
- [x] 02-04-PLAN.md — Clean hydrate() API integrating all modules

### Phase 3: CLI Scaffolding
**Goal**: `coherent create` produces immediately runnable fullstack projects using current framework APIs
**Depends on**: Phase 2 (generated projects need stable rendering and hydration)
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06
**Success Criteria** (what must be TRUE):
  1. `coherent create my-app` produces a project that runs with `npm start` without errors
  2. Generated code uses current framework APIs (no deprecated patterns or broken imports)
  3. Generated TypeScript configuration compiles without errors
  4. Auth option produces working login/register flow connected to database
  5. Database option produces working CRUD operations with chosen adapter
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Template consolidation and import fixes
- [x] 03-02-PLAN.md — Comprehensive test suite for scaffold permutations
- [x] 03-03-PLAN.md — Enhanced CLI output and dev server offer

### Phase 4: Hot Module Replacement
**Goal**: File changes update the browser without full reload, preserving component state
**Depends on**: Phase 1 (state preservation requires stable reconciliation), Phase 2 (requires working hydration)
**Requirements**: HMR-01, HMR-02, HMR-03, HMR-04
**Success Criteria** (what must be TRUE):
  1. Saving a component file updates the browser within 1 second without page reload
  2. Form inputs, scroll position, and component state survive HMR updates
  3. Old module effects (timers, listeners) are cleaned up on HMR (no duplicates)
  4. HMR errors display in browser with file, line, and error message
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Core HMR infrastructure (cleanup tracker, state capturer)
- [x] 04-02-PLAN.md — UI components (error overlay, connection indicator)
- [x] 04-03-PLAN.md — HMR client integration and exports

### Phase 5: TypeScript
**Goal**: All public APIs have accurate TypeScript definitions that match runtime behavior
**Depends on**: Phase 1-4 (types must match stabilized APIs)
**Requirements**: TS-01, TS-02, TS-03, TS-04
**Success Criteria** (what must be TRUE):
  1. All exported functions and classes have TypeScript definitions in `.d.ts` files
  2. Component object syntax gets accurate autocomplete (tagName, attributes, children)
  3. Event handler types match actual runtime event objects
  4. Type tests verify definitions match runtime behavior (no silent mismatches)
**Plans**: 5 plans

Plans:
- [x] 05-01-PLAN.md — Core element types with strict per-element attributes
- [x] 05-02-PLAN.md — Core package type tests with Vitest expectTypeOf
- [x] 05-03-PLAN.md — Client package types and type tests
- [x] 05-04-PLAN.md — Integration package types (api, database, adapters)
- [x] 05-05-PLAN.md — Utility package types (forms, i18n, testing, etc.)

### Phase 6: IDE Support
**Goal**: VS Code provides intelligent autocomplete, go-to-definition, and error highlighting for Coherent.js
**Depends on**: Phase 5 (IDE features built on TypeScript definitions)
**Requirements**: IDE-01, IDE-02, IDE-03, IDE-04
**Success Criteria** (what must be TRUE):
  1. Typing component props shows autocomplete with valid attribute names
  2. Ctrl+Click on Coherent.js imports navigates to source definitions
  3. Invalid component syntax shows red squiggles before running code
  4. VS Code extension is published on marketplace and documented in README
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — LSP server with Coherent object analysis and validation
- [x] 06-02-PLAN.md — VS Code extension with snippets and marketplace publish

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-01-21 |
| 2. Hydration | 4/4 | Complete | 2026-01-21 |
| 3. CLI Scaffolding | 3/3 | Complete | 2026-01-22 |
| 4. Hot Module Replacement | 3/3 | Complete | 2026-01-22 |
| 5. TypeScript | 5/5 | Complete | 2026-01-22 |
| 6. IDE Support | 2/2 | Complete | 2026-01-22 |

---
*Roadmap created: 2026-01-21*
*Last updated: 2026-01-22 (Phase 6 complete - Milestone complete)*
