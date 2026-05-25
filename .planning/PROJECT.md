# Coherent.js

## What This Is

A fullstack JavaScript framework built around pure object components for server-side rendering with optional client-side hydration. The framework provides a complete ecosystem for building web applications without JSX or templates — just plain JavaScript objects that map directly to HTML — and after v1.0 it ships a stable rendering pipeline, working client-side hydration, a CLI that scaffolds runnable fullstack apps in seconds, hot module replacement, complete TypeScript definitions, and first-class VS Code support.

## Core Value

A developer can run `coherent create my-app`, get a working fullstack app with authentication and database, and start building in 5 minutes. Reaffirmed at v1.0 — every v1 phase fed directly into this promise.

## Current State

**Shipped:** v1.0 Stabilization (2026-05-25) — see `MILESTONES.md`.

The framework is production-ready for opinionated SSR apps. Known gaps are tracked as tech debt below; nothing blocks first-party use.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Pure object component system — existing
- ✓ Server-side HTML rendering — existing
- ✓ Framework adapters (Express, Fastify, Koa, Next.js) — existing
- ✓ Database adapters (PostgreSQL, MySQL, SQLite, MongoDB) — existing
- ✓ API routing with validation — existing
- ✓ Form builder and validation — existing
- ✓ i18n support — existing
- ✓ SEO utilities — existing
- ✓ Client-side hydration system — existing
- ✓ Lazy loading components — existing
- ✓ CLI with scaffolding generators — existing
- ✓ Stable rendering engine (null/undefined/circular handling, HTML nesting validation, actionable errors) — v1.0
- ✓ Key-based reconciliation with dev warnings for missing keys — v1.0
- ✓ Clean `hydrate()` API with event delegation and mismatch detection — v1.0
- ✓ State serialization via base64 `data-state` — v1.0
- ✓ Working CLI generators (basic + fullstack templates, current APIs only) — v1.0
- ✓ Hot Module Replacement (cleanup tracking, state preservation, error overlay) — v1.0 (client side)
- ✓ Complete TypeScript definitions across all packages — v1.0
- ✓ IDE/language server support (LSP + VS Code extension VSIX) — v1.0

### Active

<!-- Building toward these in the next milestone. -->

- [ ] HMR dev-server integration for full end-to-end behavior (client done, server missing)
- [ ] VS Code Marketplace publish of the extension (VSIX ready)
- [ ] Browser hands-on verification of hydration, event delegation, and HMR
- [ ] Removal of legacy `hydration.js` (~1850 lines) now that the new API is the default
- [ ] Define v1.1 scope (candidates: in-browser DevTools, progressive hydration, streaming SSR, codemods, perf benchmarks against competitors)

### Out of Scope

<!-- Explicit boundaries. Reasoning preserved. -->

- Mobile/React Native support — web-first, defer to future
- GraphQL integration — REST/JSON APIs sufficient for v1 (revisit in v2 if user demand appears)
- Real-time/WebSocket features — added complexity, not core to initial value
- Full Virtual DOM rewrite — improve existing, don't start over
- Qwik-style resumability — interesting but architectural change too large for v1

## Context

Brownfield monorepo of 17 packages (~93.7k LOC). After v1.0 the architecture (pure object components, SSR-first with hydration) is no longer just sound on paper — it is stable in practice with regression coverage at the type and integration levels.

Key technical context after v1.0:
- Legacy `hydration.js` (1791 lines) still ships alongside the new modular hydration for backwards compatibility — flagged for removal
- DOM diffing now uses key-based reconciliation when `key` props are present, with index-based fallback
- Event registry handled via document-level delegation through `data-coherent-{event}` attributes — no per-element listeners to leak
- Test coverage now includes 18-permutation CLI scaffold matrix and `expectTypeOf` type tests across packages

Recent housekeeping (Jan→May 2026, post-milestone):
- Node test matrix dropped 20, added 26
- pnpm minimum-release-age policy disabled via `.npmrc`
- glob upgraded 11 → 13; CLI bundle baseline regenerated
- `--no-website` recursive-build fix + prebuild added to deploy
- VSCode extension marked `private: true` to prevent accidental npm publish

## Constraints

- **Priority:** Stable core first (rendering + hydration), then developer experience (CLI, TypeScript, IDE) — ✓ held through v1
- **Runtime:** Node.js 20+ required (test matrix now 22, 24, 26 — 20 dropped post-milestone)
- **Monorepo:** Must work within existing pnpm workspace structure
- **Backward compatibility:** Existing API surface preserved where possible — legacy `hydration.js` retained for this reason

## Key Decisions

<!-- Decisions that constrain future work. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pure objects over JSX | Zero build step for components, framework-agnostic, easier SSR | ✓ Good |
| SSR-first with opt-in hydration | Better performance, progressive enhancement | ✓ Good |
| Monorepo with focused packages | Tree-shaking, pick what you need | ✓ Good |
| Stable core before DX polish | Foundation must work before optimizing onboarding | ✓ Good (validated by v1) |
| WeakSet for circular reference detection | Constant-time membership, GC-friendly | ✓ Good |
| Document-level event delegation via `data-coherent-{event}` | Single listener survives DOM patches | ✓ Good |
| Base64-encoded `data-state` attributes | Safe attribute embedding, 10KB size warning | ✓ Good |
| Two scaffold templates (basic, fullstack) | Reduces maintenance vs N×M permutations | ✓ Good |
| Shadow DOM isolation for HMR overlay | Prevents app CSS leakage | ✓ Good |
| `expectTypeOf` + `@ts-expect-error` patterns | Compile-time regression coverage | ✓ Good |
| Build-time attribute extraction for LSP | Single source of truth from core types | ✓ Good |
| Bundled language server inside extension | Offline-capable, avoids npm resolution | ✓ Good |
| 300ms validation debounce | Balance responsiveness with performance | ✓ Good |
| Keep legacy `hydration.js` for backward compatibility | Avoid breaking changes mid-milestone | ⚠️ Revisit in v1.1 (remove once consumers migrate) |
| Defer VS Code Marketplace publish | User preference — VSIX hand-off | — Pending (v1.1 candidate) |

---
*Last updated: 2026-05-25 after v1.0 Stabilization milestone*
