# Requirements: Coherent.js Stabilization

**Defined:** 2026-01-21
**Core Value:** A developer can run `coherent create my-app`, get a working fullstack app with auth and database, and start building in 5 minutes

## v1 Requirements

Requirements for operational framework. Each maps to roadmap phases.

### Core Rendering

- [x] **REND-01**: Renderer handles null/undefined inputs without crashing
- [x] **REND-02**: Renderer validates HTML nesting (no `<p><div>` producing mismatches)
- [x] **REND-03**: Error boundaries catch component render errors with actionable messages
- [x] **REND-04**: Rendering depth limit prevents stack overflow on circular structures

### Reconciliation

- [x] **RECON-01**: Component syntax supports `key` property for stable element identity
- [x] **RECON-02**: Diffing algorithm uses keys to match elements (not array indices)
- [x] **RECON-03**: List reordering preserves component state correctly
- [x] **RECON-04**: Dev mode warns when list items are missing keys

### Hydration

- [x] **HYDR-01**: Hydration detects server/client mismatch in development mode
- [x] **HYDR-02**: Mismatch errors show specific location (path to differing element)
- [x] **HYDR-03**: Hydration works without hardcoded state patterns (generic state extraction)
- [x] **HYDR-04**: Event delegation system with single document-level listener
- [x] **HYDR-05**: Event handlers survive DOM patches (no re-attachment required)
- [x] **HYDR-06**: `hydrate()` function has simple, documented API
- [x] **HYDR-07**: State serialization uses data-state attributes with base64-encoded JSON

### CLI Scaffolding

- [x] **CLI-01**: `coherent create <name>` produces immediately runnable project
- [x] **CLI-02**: Generated project uses current framework APIs (no deprecated patterns)
- [x] **CLI-03**: Generated files have correct import paths and connections
- [x] **CLI-04**: Scaffold includes working TypeScript configuration
- [x] **CLI-05**: Scaffold includes auth option that integrates with database
- [x] **CLI-06**: Scaffold includes database option with working adapter

### Hot Module Replacement

- [x] **HMR-01**: File changes trigger partial updates without full page reload
- [x] **HMR-02**: Component state preserved across HMR updates
- [x] **HMR-03**: Old module effects cleaned up (no duplicate listeners)
- [x] **HMR-04**: HMR errors shown with actionable messages

### TypeScript

- [x] **TS-01**: All public APIs have TypeScript definitions
- [x] **TS-02**: Component object syntax has accurate type inference
- [x] **TS-03**: Event handler types match runtime behavior
- [x] **TS-04**: Generated types tested against actual runtime

### IDE Support

- [ ] **IDE-01**: Language Server provides component prop autocompletion
- [ ] **IDE-02**: Go-to-definition works for Coherent.js imports
- [ ] **IDE-03**: Syntax errors highlighted before runtime
- [ ] **IDE-04**: VS Code extension published and documented

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced DevTools

- **DEVT-01**: In-browser DevTools panel showing component tree
- **DEVT-02**: DevTools visualizes render performance metrics
- **DEVT-03**: DevTools shows hydration state and events

### Advanced Performance

- **PERF-01**: Progressive hydration (hydrate on viewport entry)
- **PERF-02**: Streaming SSR with hydration boundaries
- **PERF-03**: Automatic code-splitting for lazy components

### Migration Tools

- **MIGR-01**: Codemods for API changes between versions
- **MIGR-02**: Deprecation warnings with upgrade guidance

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile/React Native support | Web-first, complexity too high for v1 |
| GraphQL integration | REST/JSON APIs sufficient, add later if needed |
| Real-time/WebSocket features | Not core to SSR framework value |
| Full Virtual DOM rewrite | Improve existing, don't start over |
| Qwik-style resumability | Interesting but architectural change too large for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REND-01 | Phase 1: Foundation | Complete |
| REND-02 | Phase 1: Foundation | Complete |
| REND-03 | Phase 1: Foundation | Complete |
| REND-04 | Phase 1: Foundation | Complete |
| RECON-01 | Phase 1: Foundation | Complete |
| RECON-02 | Phase 1: Foundation | Complete |
| RECON-03 | Phase 1: Foundation | Complete |
| RECON-04 | Phase 1: Foundation | Complete |
| HYDR-01 | Phase 2: Hydration | Complete |
| HYDR-02 | Phase 2: Hydration | Complete |
| HYDR-03 | Phase 2: Hydration | Complete |
| HYDR-04 | Phase 2: Hydration | Complete |
| HYDR-05 | Phase 2: Hydration | Complete |
| HYDR-06 | Phase 2: Hydration | Complete |
| HYDR-07 | Phase 2: Hydration | Complete |
| CLI-01 | Phase 3: CLI Scaffolding | Complete |
| CLI-02 | Phase 3: CLI Scaffolding | Complete |
| CLI-03 | Phase 3: CLI Scaffolding | Complete |
| CLI-04 | Phase 3: CLI Scaffolding | Complete |
| CLI-05 | Phase 3: CLI Scaffolding | Complete |
| CLI-06 | Phase 3: CLI Scaffolding | Complete |
| HMR-01 | Phase 4: Hot Module Replacement | Complete |
| HMR-02 | Phase 4: Hot Module Replacement | Complete |
| HMR-03 | Phase 4: Hot Module Replacement | Complete |
| HMR-04 | Phase 4: Hot Module Replacement | Complete |
| TS-01 | Phase 5: TypeScript | Complete |
| TS-02 | Phase 5: TypeScript | Complete |
| TS-03 | Phase 5: TypeScript | Complete |
| TS-04 | Phase 5: TypeScript | Complete |
| IDE-01 | Phase 6: IDE Support | Pending |
| IDE-02 | Phase 6: IDE Support | Pending |
| IDE-03 | Phase 6: IDE Support | Pending |
| IDE-04 | Phase 6: IDE Support | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-22 (Phase 5 complete)*
