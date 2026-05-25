# Milestone v1: Coherent.js Stabilization

**Status:** ✅ SHIPPED 2026-05-25
**Phases:** 1-6
**Total Plans:** 20
**Total Requirements:** 32/32

## Overview

This milestone transformed Coherent.js from a feature-rich but unstable framework into a production-ready SSR solution. The journey started with foundational rendering correctness (eliminating crashes, implementing key-based reconciliation), progressed through hydration reliability and CLI scaffolding, then delivered developer experience improvements (HMR, TypeScript, IDE support). Each phase built on the previous — rendering had to be correct before hydration could work, and both had to be stable before HMR could preserve state.

## Phases

### Phase 1: Foundation

**Goal:** Rendering engine handles all edge cases without crashing, and DOM reconciliation uses keys for stable element identity
**Depends on:** Nothing (first phase)
**Requirements:** REND-01, REND-02, REND-03, REND-04, RECON-01, RECON-02, RECON-03, RECON-04
**Plans:** 3 plans
**Completed:** 2026-01-21

Plans:
- [x] 01-01: Defensive input handling and circular reference detection
- [x] 01-02: HTML nesting validation with dev warnings
- [x] 01-03: Key prop support and key-based reconciliation

**Outcome:** Renderer accepts null/undefined/empty/circular inputs without throwing. HTML nesting validation prevents `<p><div>` mismatches. Errors surface with renderPath context. Lists keyed by `key` prop maintain state through reorders.

### Phase 2: Hydration

**Goal:** Client-side hydration reliably attaches to server-rendered HTML with event delegation and state preservation
**Depends on:** Phase 1 (key-based reconciliation required for stable hydration)
**Requirements:** HYDR-01..HYDR-07
**Plans:** 4 plans
**Completed:** 2026-01-21

Plans:
- [x] 02-01: Event delegation system with document-level listeners
- [x] 02-02: State serialization with base64 encoding
- [x] 02-03: Mismatch detection for development mode
- [x] 02-04: Clean hydrate() API integrating all modules

**Outcome:** Single document-level listener via `data-coherent-{event}` attributes. State round-trips through base64-encoded `data-state`. Dev-mode mismatch detection reports exact divergence path. New `hydrate()` returns a control object (`unmount`, `rerender`, `getState`, `setState`).

### Phase 3: CLI Scaffolding

**Goal:** `coherent create` produces immediately runnable fullstack projects using current framework APIs
**Depends on:** Phase 2 (generated projects need stable rendering and hydration)
**Requirements:** CLI-01..CLI-06
**Plans:** 3 plans
**Completed:** 2026-01-22

Plans:
- [x] 03-01: Template consolidation and import fixes
- [x] 03-02: Comprehensive test suite for scaffold permutations
- [x] 03-03: Enhanced CLI output and dev server offer

**Outcome:** Reduced templates to `basic` + `fullstack`. Fixed broken auth route imports (Express/Koa) and unified database adapter instantiation. 18-permutation scaffold matrix + 13 import-audit tests guard regressions. Post-scaffold output offers to start the dev server.

### Phase 4: Hot Module Replacement

**Goal:** File changes update the browser without full reload, preserving component state
**Depends on:** Phase 1 (state preservation requires stable reconciliation), Phase 2 (requires working hydration)
**Requirements:** HMR-01, HMR-02, HMR-03, HMR-04
**Plans:** 3 plans
**Completed:** 2026-01-22

Plans:
- [x] 04-01: Core HMR infrastructure (CleanupTracker, StateCapturer)
- [x] 04-02: UI components (error overlay, connection indicator)
- [x] 04-03: HMR client integration and exports

**Outcome:** Per-module resource tracking (timers/intervals/listeners/fetch). Form/scroll state captured and restored across updates. Shadow-DOM-isolated error overlay with click-to-open editor support. Vite-compatible hot context API. **Tech debt:** requires dev-server integration for full E2E (client side complete).

### Phase 5: TypeScript

**Goal:** All public APIs have accurate TypeScript definitions that match runtime behavior
**Depends on:** Phases 1-4 (types must match stabilized APIs)
**Requirements:** TS-01..TS-04
**Plans:** 5 plans
**Completed:** 2026-01-22

Plans:
- [x] 05-01: Core element types with strict per-element attributes
- [x] 05-02: Core package type tests with Vitest expectTypeOf
- [x] 05-03: Client package types and type tests
- [x] 05-04: Integration package types (api, database, adapters)
- [x] 05-05: Utility package types (forms, i18n, testing, etc.)

**Outcome:** `HTMLElementAttributeMap` maps tag → strict attribute shape. `VoidElementTagNames` blocks invalid children. Opt-in `StrictCoherentElement`. Type tests use `expectTypeOf` + `@ts-expect-error` for compile-time regressions. Generic chaining through DB query/model layer.

### Phase 6: IDE Support

**Goal:** VS Code provides intelligent autocomplete, go-to-definition, and error highlighting for Coherent.js
**Depends on:** Phase 5 (IDE features built on TypeScript definitions)
**Requirements:** IDE-01..IDE-04
**Plans:** 2 plans
**Completed:** 2026-01-22

Plans:
- [x] 06-01: LSP server with Coherent object analysis and validation
- [x] 06-02: VS Code extension with snippets and marketplace publish

**Outcome:** `@coherent.js/language-server` ships a binary (`coherent-language-server`) bundled inside the VS Code extension. Completion, hover, code actions, element/nesting validation with 300ms debounce. Esbuild-bundled CJS extension via IPC transport. VSIX produced; marketplace publish deferred per user preference.

---

## Milestone Summary

**Decimal Phases:** None — clean execution, no urgent insertions

**Key Decisions** (from PROJECT.md and phase summaries):
- Pure objects over JSX — Zero build step, framework-agnostic, easier SSR ✓ Good
- SSR-first with opt-in hydration — Better performance, progressive enhancement ✓ Good
- Monorepo with focused packages — Tree-shaking, pick what you need ✓ Good
- Stable core before DX polish — Foundation must work before optimizing onboarding ✓ Good
- WeakSet for circular reference detection — Constant-time membership, GC-friendly ✓ Good
- Document-level event delegation via `data-coherent-{event}` — Single listener survives DOM patches ✓ Good
- Base64-encoded `data-state` — Safe attribute embedding, 10KB size warning ✓ Good
- Two scaffold templates (basic, fullstack) — Reduces maintenance vs N×M permutations ✓ Good
- Shadow DOM isolation for HMR overlay — Prevents app CSS leakage ✓ Good
- `expectTypeOf` + `@ts-expect-error` patterns — Compile-time regression coverage ✓ Good
- Build-time attribute extraction for LSP — Single source of truth from core types ✓ Good
- Bundled language server inside extension — Offline-capable, avoids npm resolution ✓ Good

**Issues Resolved:**
- Renderer crashes on null/undefined/circular inputs
- Index-based reconciliation losing list-item state
- Broken auth route imports in Express/Koa scaffolds
- Inconsistent database adapter instantiation
- Missing TypeScript coverage across packages
- No IDE autocomplete/validation for Coherent objects

**Issues Deferred / Tech Debt:**
- Legacy `hydration.js` (~1850 lines) retained for backward compatibility — to be removed in v2
- HMR requires dev server integration for full E2E (client code complete)
- VS Code Marketplace publish deferred per user request — VSIX ready
- 2 of 47 integration checks soft-flagged (acceptable per audit)

**Human Verification Pending (browser environments):**
- Visual hydration behavior in browser
- Event delegation survives DOM updates (real interaction)
- Mismatch detection console output quality
- End-to-end HMR with dev server
- Form state preservation through updates
- Connection indicator status changes

---

*Archived: 2026-05-25*
*For current project status, see ../ROADMAP.md*
