# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-21)

**Core value:** A developer can run `coherent create my-app`, get a working fullstack app with auth and database, and start building in 5 minutes
**Current focus:** Phase 4 - Hot Module Replacement (COMPLETE)

## Current Position

Phase: 4 of 6 (Hot Module Replacement)
Plan: 3/3 plans complete in Phase 4
Status: Phase complete
Last activity: 2026-01-22 - Phase 4 verified and approved

Progress: [███████░░░] 72% (13 of 18 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 7 min
- Total execution time: 87 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 27 min | 9 min |
| 02-hydration | 4 | 19 min | 5 min |
| 03-cli-scaffolding | 3 | 17 min | 6 min |
| 04-hot-module-replacement | 3 | 24 min | 8 min |

**Recent Trend:**
- Last 5 plans: 03-03 (5 min), 04-01 (7 min), 04-02 (10 min), 04-03 (7 min)
- Trend: Consistent performance

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Date | Plan | Decision | Rationale |
|------|------|----------|-----------|
| 2026-01-21 | 01-01 | WeakSet for circular detection | Automatic GC of tracked objects |
| 2026-01-21 | 01-01 | Check circulars in renderComponent AND renderElement | Catch prop-level circulars |
| 2026-01-21 | 01-01 | Return false from isStaticElement for circulars | Skip caching, detect in render |
| 2026-01-21 | 01-02 | Dev-mode only warnings | Zero production overhead |
| 2026-01-21 | 01-02 | Warning-only (no blocking) | Progressive adoption |
| 2026-01-21 | 01-02 | Include path in warnings | Easy debugging |
| 2026-01-21 | 01-03 | Key extracted but not rendered | Matches React behavior for reconciliation identity |
| 2026-01-21 | 01-03 | Warnings for top-level arrays only | Children arrays handled by reconciler |
| 2026-01-21 | 01-03 | Keyless items use index fallback | Backward compatibility |
| 2026-01-21 | 01-03 | Key maps for O(1) lookups | Performance optimization |
| 2026-01-21 | 02-02 | Base64 encoding for state | Avoids HTML special char escaping |
| 2026-01-21 | 02-02 | Silent omission of non-serializable values | Functions/symbols reconstruct on hydrate |
| 2026-01-21 | 02-02 | 10KB warning threshold | Practical limit before state management |
| 2026-01-21 | 02-01 | data-coherent-{eventType} naming | Descriptive, matches CONTEXT.md decision |
| 2026-01-21 | 02-01 | Singleton pattern for delegation | Single listener set, consistent pattern |
| 2026-01-21 | 02-01 | Capture phase for focus/blur | Non-bubbling events require capture |
| 2026-01-21 | 02-01 | Handler-by-ID pattern | Handlers survive DOM updates |
| 2026-01-21 | 02-03 | Recursive depth-first comparison | Matches tree structure, precise paths |
| 2026-01-21 | 02-03 | Filter whitespace text nodes | Prevents false positives |
| 2026-01-21 | 02-03 | Warning by default, strict optional | Non-breaking dev, strict for CI |
| 2026-01-21 | 02-04 | Control object pattern | Matches React/Preact convention |
| 2026-01-21 | 02-04 | Dev-mode mismatch detection | Zero prod overhead, catches issues early |
| 2026-01-21 | 02-04 | initialState overrides extracted | Explicit intent beats implicit extraction |
| 2026-01-21 | 02-04 | legacyHydrate alias | Zero breaking changes for existing users |
| 2026-01-22 | 03-01 | Template consolidation from 6 to 2 | Simpler UX, basic and fullstack cover all use cases |
| 2026-01-22 | 03-01 | Runtime selection for both templates | No template-to-runtime mapping, flexible choice |
| 2026-01-22 | 03-01 | Adapter factories receive dbConfig directly | Consistent instantiation pattern |
| 2026-01-22 | 03-01 | Koa auth uses export default router | Clean module exports |
| 2026-01-22 | 03-02 | PACKAGE_EXPORTS map for import validation | Detects when scaffolded code imports non-existent exports |
| 2026-01-22 | 03-02 | Matrix testing pattern for permutations | Systematic coverage without duplicating test code |
| 2026-01-22 | 03-02 | extractImports/validateImports utilities | Reusable import analysis for CLI testing |
| 2026-01-22 | 03-03 | onProgress callback with default no-op | Backward compatible progress reporting |
| 2026-01-22 | 03-03 | Dev server spawn with detached + unref | CLI exits cleanly while server continues |
| 2026-01-22 | 03-03 | Dev server prompt only with deps installed | Prevents broken state if deps missing |
| 2026-01-22 | 04-01 | Per-module resource tracking via Map | Targeted cleanup on HMR dispose |
| 2026-01-22 | 04-01 | Input key priority: id > name+type > path | Balance stability with fallback coverage |
| 2026-01-22 | 04-01 | 50px layout change threshold | Matches scroll anchoring patterns |
| 2026-01-22 | 04-01 | Tracked fetch with auto AbortController | Clean resource management for pending requests |
| 2026-01-22 | 04-02 | Shadow DOM for overlay style isolation | Prevents CSS conflicts with app |
| 2026-01-22 | 04-02 | Dracula color scheme for overlay | Matches Vite aesthetic per CONTEXT.md |
| 2026-01-22 | 04-02 | 8px indicator dot (unobtrusive) | Per CONTEXT.md "small colored dot, not a banner" |
| 2026-01-22 | 04-02 | Lazy indicator creation | Element only created on first status update |
| 2026-01-22 | 04-02 | Editor URL schemes via window.open | Standard click-to-open pattern |
| 2026-01-22 | 04-03 | Vite-compatible hot context API | Industry standard, familiar to developers |
| 2026-01-22 | 04-03 | Module boundary via accept or __hmrBoundary | Explicit opt-in for HMR |
| 2026-01-22 | 04-03 | Exponential backoff with jitter (1-30s) | Prevents thundering herd on restart |
| 2026-01-22 | 04-03 | Full page reload on reconnect after disconnect | Server may have restarted |
| 2026-01-22 | 04-03 | State capture/restore wraps entire update | Form inputs survive even on fallback |
| 2026-01-22 | 04-03 | Backward compatible deprecation | Re-export + IIFE auto-init |

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-22T10:42:55Z
Stopped at: Completed 04-03-PLAN.md (HMR Client Integration)
Resume file: None
