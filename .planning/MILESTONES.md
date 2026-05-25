# Milestones

A running log of shipped versions. Each entry is a one-screen historical record. Full details live in `.planning/milestones/v[X.Y]-ROADMAP.md`.

---

## v1.0 — Stabilization

**Shipped:** 2026-05-25
**Phases:** 6 (Phases 1-6)
**Plans:** 20
**Requirements:** 32/32

**Delivered:**
Coherent.js transitions from a feature-rich but unstable framework to a production-ready SSR solution — stable rendering, reliable hydration, working CLI scaffolding, HMR, complete TypeScript coverage, and VS Code IDE support.

**Key accomplishments:**
1. Defensive renderer + key-based reconciliation eliminate edge-case crashes
2. Clean `hydrate()` API with event delegation, base64 state serialization, and dev-mode mismatch detection
3. Consolidated 2-template CLI (`basic`/`fullstack`) with 18-permutation matrix tests and import-audit suite
4. Full HMR client: per-module cleanup tracking, form/scroll state preservation, Shadow-DOM error overlay, Vite-compatible hot context API
5. Strict per-element TypeScript types (`HTMLElementAttributeMap`) + `expectTypeOf` regression tests across every package
6. LSP server with completion/hover/validation + bundled VS Code extension (VSIX ready for marketplace)

**Stats:**
- 47 `feat(*)` commits across 6 phases
- ~93.7k LOC in packages (existing brownfield base)
- Execution: 2026-01-21 → 2026-01-24 (3 days planned work; subsequent months were CI/build housekeeping)
- Audit: PASSED — 32/32 requirements, 6/6 phases, 45/47 integration checks (95.7%)

**Archives:**
- [v1-ROADMAP.md](milestones/v1-ROADMAP.md)
- [v1-REQUIREMENTS.md](milestones/v1-REQUIREMENTS.md)
- [v1-MILESTONE-AUDIT.md](milestones/v1-MILESTONE-AUDIT.md)
- [v1-INTEGRATION-CHECK.md](milestones/v1-INTEGRATION-CHECK.md)

**Known tech debt carried forward:**
- Legacy `hydration.js` (~1850 lines) retained for backward compatibility
- HMR requires dev-server integration for full end-to-end behavior
- VS Code Marketplace publish deferred per user preference (VSIX ready)
- 6 browser-environment verification items pending hands-on validation

**Key decisions (v1):** Pure objects over JSX · SSR-first with opt-in hydration · Monorepo with focused packages · Stable core before DX polish · WeakSet circular detection · Document-level event delegation · Base64 `data-state` · Two scaffold templates · Shadow-DOM HMR overlay · `expectTypeOf` type tests · Build-time LSP attribute extraction · Bundled LSP in extension.
