# Requirements: Coherent.js Stabilization

**Defined:** 2026-01-21
**Core Value:** A developer can run `coherent create my-app`, get a working fullstack app with auth and database, and start building in 5 minutes

## v1 Requirements

Requirements for operational framework. Each maps to roadmap phases.

### Core Rendering

- [ ] **REND-01**: Renderer handles null/undefined inputs without crashing
- [ ] **REND-02**: Renderer validates HTML nesting (no `<p><div>` producing mismatches)
- [ ] **REND-03**: Error boundaries catch component render errors with actionable messages
- [ ] **REND-04**: Rendering depth limit prevents stack overflow on circular structures

### Reconciliation

- [ ] **RECON-01**: Component syntax supports `key` property for stable element identity
- [ ] **RECON-02**: Diffing algorithm uses keys to match elements (not array indices)
- [ ] **RECON-03**: List reordering preserves component state correctly
- [ ] **RECON-04**: Dev mode warns when list items are missing keys

### Hydration

- [ ] **HYDR-01**: Hydration detects server/client mismatch in development mode
- [ ] **HYDR-02**: Mismatch errors show specific location (path to differing element)
- [ ] **HYDR-03**: Hydration works without hardcoded state patterns (generic state extraction)
- [ ] **HYDR-04**: Event delegation system with single document-level listener
- [ ] **HYDR-05**: Event handlers survive DOM patches (no re-attachment required)
- [ ] **HYDR-06**: `hydrate()` function has simple, documented API
- [ ] **HYDR-07**: State serialization uses centralized JSON script tag pattern

### CLI Scaffolding

- [ ] **CLI-01**: `coherent create <name>` produces immediately runnable project
- [ ] **CLI-02**: Generated project uses current framework APIs (no deprecated patterns)
- [ ] **CLI-03**: Generated files have correct import paths and connections
- [ ] **CLI-04**: Scaffold includes working TypeScript configuration
- [ ] **CLI-05**: Scaffold includes auth option that integrates with database
- [ ] **CLI-06**: Scaffold includes database option with working adapter

### Hot Module Replacement

- [ ] **HMR-01**: File changes trigger partial updates without full page reload
- [ ] **HMR-02**: Component state preserved across HMR updates
- [ ] **HMR-03**: Old module effects cleaned up (no duplicate listeners)
- [ ] **HMR-04**: HMR errors shown with actionable messages

### TypeScript

- [ ] **TS-01**: All public APIs have TypeScript definitions
- [ ] **TS-02**: Component object syntax has accurate type inference
- [ ] **TS-03**: Event handler types match runtime behavior
- [ ] **TS-04**: Generated types tested against actual runtime

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
| REND-01 | TBD | Pending |
| REND-02 | TBD | Pending |
| REND-03 | TBD | Pending |
| REND-04 | TBD | Pending |
| RECON-01 | TBD | Pending |
| RECON-02 | TBD | Pending |
| RECON-03 | TBD | Pending |
| RECON-04 | TBD | Pending |
| HYDR-01 | TBD | Pending |
| HYDR-02 | TBD | Pending |
| HYDR-03 | TBD | Pending |
| HYDR-04 | TBD | Pending |
| HYDR-05 | TBD | Pending |
| HYDR-06 | TBD | Pending |
| HYDR-07 | TBD | Pending |
| CLI-01 | TBD | Pending |
| CLI-02 | TBD | Pending |
| CLI-03 | TBD | Pending |
| CLI-04 | TBD | Pending |
| CLI-05 | TBD | Pending |
| CLI-06 | TBD | Pending |
| HMR-01 | TBD | Pending |
| HMR-02 | TBD | Pending |
| HMR-03 | TBD | Pending |
| HMR-04 | TBD | Pending |
| TS-01 | TBD | Pending |
| TS-02 | TBD | Pending |
| TS-03 | TBD | Pending |
| TS-04 | TBD | Pending |
| IDE-01 | TBD | Pending |
| IDE-02 | TBD | Pending |
| IDE-03 | TBD | Pending |
| IDE-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 0
- Unmapped: 32 ⚠️

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-21 after initial definition*
