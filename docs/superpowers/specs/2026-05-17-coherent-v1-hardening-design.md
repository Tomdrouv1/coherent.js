# Coherent.js v1.0 Stable — Comprehensive Hardening Design

**Status:** Approved (pending user review of written spec)
**Date:** 2026-05-17
**Author:** brainstorming session with Claude
**Current version:** 1.0.0-beta.8
**Target version:** 1.0.0 (stable)

## Goal

Take Coherent.js from `1.0.0-beta.8` to a stable `1.0.0` that is structurally tight, has a defended public API surface, and ships with the maintenance infrastructure required to hold those commitments through 1.x.

This is the "Approach C — Comprehensive Hardening" track agreed during brainstorming. Approaches A (minimal close of audit items) and B (proper stable release without consolidation) were considered and rejected as insufficient given that the 1.0 cutover is the last cheap opportunity to fix structural issues.

## Constraints (decided during brainstorming)

- **Breaking changes:** Anything goes. Beta users are on notice. SemVer kicks in at 1.0.
- **Package consolidation:** Aggressive — target ~10 packages, with `i18n` and `seo` kept standalone, bringing the final count to 12.
- **Browser testing dependency:** Playwright accepted.
- **Timeline:** 7-9 weeks total including release-candidate soak. Acceptable.

## Out of scope

- New feature work for 1.0
- Marketing site rewrite (decoupled — can lag npm packages by a few weeks)
- Self-hosted CI runners (deferred to post-1.0 if perf-gate variance becomes a real problem)
- Codemod packages for migration (one-liner `sed` commands are sufficient for the current user base)
- Edge-runtime story (`runtime` package demoted to extras repo or 0.x)

---

## Design — 7 Sections

### Section 1 — Target package shape (26 → 12)

| New package | Absorbs | Notes |
|---|---|---|
| `@coherent.js/core` | — | rendering, components, error boundaries, perf monitoring |
| `@coherent.js/client` | — | hydration, HMR client, events, router |
| `@coherent.js/cli` | `build-tools` | scaffolding, dev server, bundler integrations |
| `@coherent.js/api` | — | REST/RPC/GraphQL |
| `@coherent.js/database` | — | adapters |
| `@coherent.js/state` | — | reactive state |
| `@coherent.js/forms` | — | SSR + hydration forms |
| `@coherent.js/integrations` *(new)* | `express`, `fastify`, `koa`, `nextjs`, `adapters` (astro/remix/sveltekit) | subpath exports per framework: `@coherent.js/integrations/express` etc. Fixes the prior inconsistency where some frameworks had their own packages and others were bundled. |
| `@coherent.js/devtools` | `performance`, `profiler` | already contains its own profiler.js and performance-dashboard.js; the prior three-package split was artificial |
| `@coherent.js/tooling` *(new)* | `language-server`, `language-service`, `vscode-extension`, `testing` | dev-time only. VSIX continues to ship to the VS Code marketplace, built from this package. |
| `@coherent.js/i18n` | — | sizable (1.4k lines), earns standalone |
| `@coherent.js/seo` | — | kept standalone per user direction |

**Dropped:**
- `@coherent.js/web-components` (151 lines, single file) — deleted with no replacement in 1.0.
- `@coherent.js/runtime` (4.4k lines) — demoted: either ships in a sibling repo as `@coherent.js-extras/runtime@0.x` or stays in monorepo but versioned 0.x. The edge-workers story is post-1.0.

**Consequences:**
- README marketing pivots from "21 modular packages" to "12 packages you can hold in your head."
- Beta users on `@coherent.js/express` etc. get a hard break with a clear error message pointing to the migration guide (no deprecation shim).
- Subpath imports introduce a 2-level depth (`@coherent.js/integrations/express`) — bundlers and Node handle this fine but every example, tutorial, and README needs updating.

### Section 2 — API surface lockdown

Four mechanisms applied together. Each `export` becomes a SemVer commitment after 1.0; this protects against drift.

1. **`exports` field is the only gate.** Each `package.json` `exports` field enumerates exactly the import paths reachable from userland. Anything not listed is unreachable regardless of source-file exports. Audit and prune every package.

2. **`@internal` JSDoc + `stripInternal: true`.** Mix-public/private modules use `/** @internal */` on private symbols. TypeScript drops these from emitted `.d.ts`.

3. **API surface snapshot tests.** Generate `api-surface.txt` per package at build time (sorted list of exported symbol names + their type signatures). Committed file. CI fails on any PR that changes the surface without also updating the snapshot — forces conscious approval, same idea as a lockfile for the API. Time-cap homegrown tooling at 1 day; fall back to `@microsoft/api-extractor` if stuck.

4. **`experimental_` prefix for unfinished surfaces.** React's pattern. Anything shipping in 1.0 but not SemVer-committed gets renamed `experimental_foo`. Removes pressure to delay the release for half-done APIs. Candidates from audit: HMR error overlay UI, language-service stub, anything in `seo` we are not 100% sure of.

**Output:** Every package has a known, machine-checked public surface. A `coherent_v1_api_lock.md` doc lists every exported symbol per package with `stable | experimental | internal` classification.

### Section 3 — Tech debt closure

**Hard deletes (no shims):**
- `packages/client/src/hydration.js` (1,857 lines, the `legacyHydrate` re-export)
- `packages/client/src/hmr.js` (deprecated shim)
- The 3 deprecated exports in `packages/forms/src/index.js` and `form-builder.js`
- All `@deprecated` symbols across all packages (full grep audit at start of execution; expect 5-15 more beyond what's already identified)

**Migration aid:** every removed entrypoint ships a `throw new Error("Coherent.js 1.0: this API was removed. See https://coherentjs.dev/docs/migration/1.0#removed-XYZ")`. Costs ~5 lines per removal, saves real-world frustration.

**Repo cruft:**
- `.DS_Store` files (root + any nested)
- `output.txt` (leftover debug artifact)
- `dist/`, `coverage/` at repo root if committed (`pnpm clean` should fully reproduce)
- `.idea/` — keep if intentional JetBrains config, drop if accidental

### Section 4 — Perf CI gate

Gateable headline claims:

| Claim | Type | Treatment |
|---|---|---|
| 80.7KB gzipped bundle | Deterministic | Hard gate, baseline file |
| 247 renders/sec | Throughput | Soft gate, ±15% tolerance band |
| 79.5% tree-shake reduction | Deterministic | Hard gate, baseline file |
| 42.7% improvement over OOP | Comparative | **Dropped from README.** Maintaining an OOP equivalent for benchmarking is not worth the cost. |
| 95%+ cache hit rate | Workload-dependent | **Dropped from headline.** Reframe as "observed in benchmark X" if mentioned at all. |

**Implementation:**
- `bundle-size` gate: measure gzip(dist/*) per package, baseline in `perf/baseline.json`, fail if >5% growth without baseline update committed in the same PR
- `render-throughput` gate: extend `benchmark.js` to emit JSON, run 3x on CI, take median; <10% regression warns, ≥20% fails; existing `perf-gate.js` becomes one of several gates
- `tree-shake-reduction` gate: wire `analyze-bundle.mjs` to baseline-compare
- New CI job `perf` in `.github/workflows/ci.yml` runs after build, parallel to test/e2e

**Note on GH Actions variance:** ±15% throughput tolerance is realistic on shared runners. Tightening requires self-hosted runners — out of scope for 1.0.

### Section 5 — HMR dev server + automated browser verification

**HMR dev server (~300-500 lines in `cli/src/dev-server/`):**
1. `coherent dev` spins up HTTP server for scaffolded app
2. File watcher via `chokidar` (already a dep)
3. On change: invalidate module cache, broadcast `{type: "update", path, hash}` over WebSocket
4. Compile errors broadcast as `{type: "error", file, line, message, frame}` to the existing client overlay

Client side is already done. This wires the server.

**Playwright E2E suite:**
- New top-level `e2e/` directory (not in any package — tests the framework as a whole)
- Test fixtures: tiny scaffolded apps, generated by the real `cli`, served by the real `cli dev`
- Six initial test cases:
  1. Hydration golden path: SSR a component, mount in browser, click handler fires
  2. Event handlers survive a DOM patch
  3. Mismatch detection logs the correct divergence path
  4. HMR updates a component without page reload
  5. Form input state preserved across HMR update
  6. Scroll position preserved across HMR update
- New CI job `e2e` runs on PRs, parallel to `perf` and `test`, uses Playwright's bundled Chromium

**Output:** every "human verification" item from the v1 audit becomes an automated check.

### Section 6 — Migration guide

**Location:**
- Source-of-truth: `MIGRATION-1.0.md` at repo root (GitHub discoverability)
- Website mirror: `/docs/migration/1.0`
- Linked from every removed-API error message (Section 3 shims embed a `#fragment` URL)
- Linked from `CHANGELOG.md` 1.0 entry

**Structure:**

1. **Quick scan table** — one row per breaking change, ~50 rows expected, ctrl-F-friendly summary
2. **Package renames** — old → new path with copy-paste `sed` one-liners (six lines cover all renames)
3. **Removed APIs** — `legacyHydrate`, forms deprecations, all other `@deprecated` removals, before/after code per entry
4. **Removed packages** — `web-components` and `runtime`, with where to track them if interested
5. **`experimental_` renames** — list with one-sentence "may change in 1.x" warning
6. **README claims removed** — short note explaining the OOP-comparison and cache-hit-rate claims were removed for honesty; framework hasn't gotten slower

Not included: a long "philosophy of v1.0" essay. Operational doc. Marketing goes in the announcement blog post.

### Section 7 — Sequencing (waves)

**Wave 1 — Demolition (3-5 days)** — Section 3 deletions, README claim strip (Section 4 prelude), repo cruft cleanup. No dependencies; runs first.

**Wave 2 — Restructure (~2 weeks)** — Section 1 package consolidation. One PR per consolidation, atomic and revertable. Order: drop `web-components` and `runtime` first, then merges (`performance`+`profiler` → `devtools`, three LSP packages → `tooling`), then renames-into-subpaths (`express`/`fastify`/`koa`/`nextjs`/`adapters` → `integrations/*`). Examples and website code updated in each PR.

**Wave 3 — Lockdown (~1.5 weeks)** — Sections 2 + 4. Snapshot API surface per package, audit `exports`, sweep `@internal`, rename undecided APIs to `experimental_`, baseline bundle sizes, set up perf CI gates. Snapshot-tooling time-cap: 1 day homegrown, then `@microsoft/api-extractor` fallback.

**Wave 4 — Browser parity (~1.5 weeks)** — Section 5 HMR dev server + Playwright E2E + VS Code marketplace publish (small, slots in anywhere).

**Wave 5 — Release (~1 week + 1-2 week soak)** — Section 6 migration guide finalized, tag `1.0.0-rc.1`, announce on Discord/GitHub, 1-2 week soak, fix anything reported (cut `rc.2` if needed), tag `1.0.0` after rc has been quiet ~5 days.

**Total: 7-9 weeks** including soak. Add 1-2 weeks buffer.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Wave 2 cascade — package renames touch examples, website, docs | If website rewrite slips, decouple from npm release — website can lag by a couple weeks pointing at old API |
| Wave 3 snapshot tooling becomes a rabbit hole | Hard 1-day time cap before falling back to `api-extractor` |
| Perf gate false-fails from CI variance | Generous ±15% tolerance; if false fails persist, raise tolerance or skip the throughput gate (keep bundle-size + tree-shake) |
| `@deprecated` audit reveals far more than expected | Each removal is independent; ship what's clean, defer the rest to 1.1 with no shame |
| Beta users on dropped packages (`runtime`, `web-components`) | Migration guide names them explicitly; runtime moves to extras repo so it isn't simply gone |

## Success criteria for 1.0.0

1. 12 packages, no more, no fewer
2. Every public export has classification `stable | experimental | internal`; CI fails on undeclared surface changes
3. README claims have CI gates defending them
4. All 4 "human verification" items from v1 audit have automated coverage
5. VS Code extension on marketplace
6. `MIGRATION-1.0.md` covers every breaking change with copy-pasteable fix
7. `rc.1` has soaked for ≥5 days quietly before `1.0.0` tag

## Open items deferred to 1.1+

- Edge-runtime story (lives in extras repo as 0.x)
- Self-hosted CI runners for tighter perf gates
- Migration codemod package (the sed one-liners are enough for current user base)
- VS Code extension marketplace ratings/reviews iteration
- Performance comparison fixtures (if "vs OOP" claim is ever wanted back)

## Acknowledgements

This design supersedes the v1 milestone audit's "tech debt" disposition, which preserved legacy code and deferred publishing decisions. The decision to treat the 1.0 cutover as the last cheap opportunity for structural change drives most of the scope expansion beyond what the audit recommended.
