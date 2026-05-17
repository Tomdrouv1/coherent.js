# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version Timeline

```
📅 2025-11-03  →  v1.0.0-beta.1  (RELEASED)
                   ├─ Fresh start with clean npm registry
                   ├─ All 20 packages synchronized
                   └─ Beta release for community feedback

📅 2025-11-10  →  v1.0.0-beta.2  (RELEASED)
                   ├─ Package reorganization
                   ├─ New @coherent.js/state package
                   ├─ Enhanced router and forms
                   └─ Improved documentation

📅 2026-04-06  →  v1.0.0-beta.8  (CURRENT)
                   ├─ Major website UI/UX overhaul
                   ├─ Website restructured as Coherent.js project
                   ├─ CI/CD and build fixes
                   └─ Dependency updates

📅 2026-04-04  →  v1.0.0-beta.7
                   ├─ Islands Architecture & Selective Hydration
                   ├─ Enhanced FP Support (compose, hoc, fp)
                   ├─ Hot Module Replacement (HMR) & IDE Support
                   └─ MurmurHash3 Cache Key Optimization

📅 2025-12-15  →  v1.0.0-beta.6
                   └─ Docker scaffolding support

📅 2025-12-05  →  v1.0.0-beta.5
                   ├─ API Router optimizations
                   └─ Production readiness enhancements

📅 2025-11-25  →  v1.0.0-beta.4
                   ├─ Security vulnerability patching
                   └─ CI/CD and Test stability fixes

📅 2025-11-17  →  v1.0.0-beta.3
                   ├─ Documentation refactor
                   ├─ Scaffold fixes
                   ├─ API router fixes
                   └─ Missing package READMEs

📅 Future      →  v1.0.0         (PLANNED)
                   └─ First stable release
```

## [Unreleased]

### Removed

- **BREAKING (client):** Removed `legacyHydrate`, `hydrateAll`, `hydrateBySelector`, `enableClientEvents`, `makeHydratable`, `autoHydrate`, `registerEventHandler` from `@coherent.js/client` public exports. Use `hydrate()` instead. See [migration guide](https://coherentjs.dev/docs/migration/1.0#removed-legacy-hydration).
- **BREAKING (client):** `@coherent.js/client/src/hmr.js` direct imports now throw a migration error at module load. Import `{ hmrClient }` from `@coherent.js/client` instead.
- **BREAKING (forms):** Removed `createForm`, `formValidators`, `enhancedForm`, and the `advanced-validation` wildcard re-export from `@coherent.js/forms`. Use `createFormBuilder` + `hydrateForm` instead.
- **BREAKING (forms):** Removed `./forms` and `./advanced-validation` subpath exports from `@coherent.js/forms` package.json (the underlying source files are gone).

### Changed

- **forms:** `createFormBuilder({ fields: [...] })` now actually registers the passed fields (previously silently ignored). Behavior is a strict superset — callers who relied on the prior no-op behavior do not exist.
- **docs (readme):** Removed "42.7% improvement over OOP" and "95%+ cache hit rate" claims. The OOP comparison required an unmaintained benchmark fixture; the cache hit rate is workload-dependent and was misleading as a framework property.

### Known follow-ups (deferred to Wave 5 migration guide)

- `packages/forms/README.md` still documents `createForm` as the primary API (8+ references). Update with the migration guide.
- `packages/forms/types/hmr.d.ts` advertises a callable API that now throws at runtime. Wave 3 (API surface lockdown) will reconcile types with runtime.
- `examples/forms-complete-example.js` and `scripts/add-exports-sections.js` reference removed APIs. Pre-existing brokenness; fold into Wave 5 doc cleanup.

### Removed (Wave 2a)

- **BREAKING:** Removed `@coherent.js/runtime` package. The universal-runtime story (edge workers, Deno, Bun, Electron, Tauri) is post-1.0. Migration: there is no drop-in replacement in 1.0 — consumers should pin their existing `1.0.0-beta.8` version or use the underlying `@coherent.js/core` + framework-specific integration packages directly.
- **BREAKING:** Removed `@coherent.js/web-components` package. The single-file Custom Elements integration had no consumers outside the also-removed runtime package. Consumers should pin `1.0.0-beta.8` if they need the integration, or fold the small amount of code into their own project.
- **BREAKING (client):** Deleted `packages/client/src/hydration.js` and removed the `./hydration` subpath export from `@coherent.js/client/package.json`. Wave 1 already removed the legacy named exports from the main entry; this completes the removal by deleting the underlying file (1,857 lines) and its types. Modern hydration via `import { hydrate } from '@coherent.js/client'` is unchanged.
- Deleted 5 client test files (`event-system.test.js`, `hydration-enhanced.test.js`, `auto-hydration.test.js`, `integration-real.test.js`, `key-reconciliation.test.js`) and three describe blocks in `core-logic.test.js` (`Hydration Core Logic`, `Integration Logic Tests`, `Performance and Edge Cases`) — all exercised the legacy hydration API only.

### Changed (Wave 2a)

- `scripts/add-exports-sections.js` no longer generates README sections for `runtime` or `web-components` packages (they don't exist); also removed the now-orphan `generateUsageSection` helper.
- `scripts/shared-build.mjs` and `scripts/build.js` no longer hardcode `client/src/hydration.js` as the client entrypoint — both now use `src/index.js`.
- `packages/client/build.mjs` entry point updated from `src/hydration.js` to `src/index.js`.
- `website/package.json` no longer declares a dependency on `@coherent.js/runtime`.
- `eslint.config.js` no longer contains runtime- or web-components-specific override blocks.
- `tsconfig.json` no longer references the deleted packages in its project-references list.
- `.github/CODEOWNERS` and `.github/labeler.yml` no longer reference the deleted packages.

### Notes (Wave 2a)

- Workspace shrank from 24 → 22 packages (`@coherent.js/runtime`, `@coherent.js/web-components` removed).
- Test count: ~1792 → 1672 (drop of ~120 tests across deleted runtime suite, deleted web-components suite, 5 deleted legacy client hydration test files, and 3 deleted client describe blocks). Modern hydration coverage remains in `hydrate-api.test.js`, `mismatch-detection.test.js`, `state-serialization.test.js`, `vdom-diffing.test.js`, `dom-state-management.test.js`, `event-delegation.test.js`.
- Pre-existing Wave 1 follow-up about `scripts/add-exports-sections.js` referencing removed APIs is partially addressed (runtime + web-components sections trimmed); the forms references it carried will be addressed in Wave 5 doc cleanup.

### Removed (Wave 2b)

- **BREAKING:** Removed standalone `@coherent.js/build-tools` package. Its plugins (vite, webpack, rollup, loader) now ship as subpath exports of `@coherent.js/cli`. Migration: replace `import ... from '@coherent.js/build-tools/vite'` with `import ... from '@coherent.js/cli/build-tools/vite'`. The `@coherent.js/build-tools` package name is no longer published.
- **BREAKING:** Removed standalone `@coherent.js/performance` package. Its utilities (cache, code-splitting, lazy-loading) now ship as subpath exports of `@coherent.js/devtools`. Migration: replace `import ... from '@coherent.js/performance/cache'` with `import ... from '@coherent.js/devtools/performance/cache'`.
- **BREAKING:** Removed `@coherent.js/profiler` package. It contained 138 lines of placeholder scaffolding with no in-source consumers. `@coherent.js/devtools` already provides the substantive profiling code via its own `profiler.js`.
- **BREAKING:** Removed standalone `@coherent.js/testing` package. Its Vitest matchers, render harness, and test utilities now ship as subpath exports of `@coherent.js/tooling`. Migration: replace `import ... from '@coherent.js/testing'` with `import ... from '@coherent.js/tooling/testing'`. TypeScript definitions preserved.
- **BREAKING:** Removed standalone `@coherent.js/language-server` package. Its Language Server Protocol implementation and `coherent-language-server` binary now ship inside `@coherent.js/tooling`. Editor LSP configs that launched the binary by package-prefixed path should reference `@coherent.js/tooling` (or continue to invoke `coherent-language-server` if it's on PATH).
- **BREAKING:** Removed `@coherent.js/language-service` package. It was a TypeScript-only stub with no consumers; deleted with no replacement.

### Added (Wave 2b)

- **NEW:** `@coherent.js/tooling` package consolidates dev-time tooling. Subpaths: `./testing`, `./testing/renderer`, `./testing/utils`, `./testing/matchers`, `./lsp`. Bin: `coherent-language-server`. TypeScript definitions ship for testing utilities (404 lines) and LSP server.
- `@coherent.js/cli` now exposes `./build-tools`, `./build-tools/vite`, `./build-tools/webpack`, `./build-tools/rollup`, `./build-tools/loader` subpaths (absorbed from the deleted `@coherent.js/build-tools` package). Optional peer-deps for `vite`, `webpack`, `rollup` migrated to cli.
- `@coherent.js/devtools` now exposes `./performance`, `./performance/cache`, `./performance/code-splitting`, `./performance/lazy-loading`, `./performance/dashboard` subpaths. The `./performance` aggregator re-exports both the absorbed utilities AND the pre-existing `PerformanceDashboard` to preserve backward compatibility for the 5 existing in-repo consumers of the dashboard.

### Changed (Wave 2b)

- `packages/cli/src/generators/package-scaffold.js` and `packages/cli/src/commands/create.js` updated to emit/display the new `@coherent.js/tooling/testing` import path when scaffolding new projects.
- `examples/vite-integration/vite.config.js` updated to import from `@coherent.js/cli/build-tools/vite` and use the correct export name `createVitePlugin` (the prior `coherentVitePlugin` name never existed — pre-existing latent bug fixed in the same commit).
- `examples/ecommerce-fullstack/package.json` swapped its `@coherent.js/build-tools` workspace dep for `@coherent.js/cli`.
- `packages/vscode-extension/esbuild.config.mjs` updated to point at `../tooling/dist/lsp` instead of `../language-server/dist`. The vscode-extension itself remains a separate package — full absorption into `tooling/vscode-extension/` deferred to Wave 4 (paired with marketplace publish work).
- `packages/devtools/build.mjs` updated to emit the 5 new performance entry points (4 absorbed + previously-unbuilt `performance-dashboard.js`).
- `ARCHITECTURE.md` line 96 mislabel fixed (was advertising `performance-profiler/` for `@coherent.js/performance-profiler`; profiler deletion took the line with it).

### Notes (Wave 2b)

- Workspace shrank from 22 → 17 packages (5 deleted, 1 created; `vscode-extension` retained as a separate package pending Wave 4 absorption into `tooling/vscode-extension/`).
- Test count: 1672 → 1670 (small drop from removed placeholder tests; 3 migrated performance tests preserved alongside 1 migrated testing utils test).
- All package consolidations preserved test coverage end-to-end. No tests dropped for substance, only placeholders.
- Pre-existing Wave 1 follow-up about `scripts/add-exports-sections.js` referencing removed APIs is now mostly addressed — the script still exists for backward compat but its entries for runtime/web-components/build-tools/performance/profiler/testing are all removed.

### Removed (Wave 2c)

- **BREAKING:** Removed standalone `@coherent.js/express` package. Its Express.js adapter now ships as `@coherent.js/integrations/express`. Migration: replace `import ... from '@coherent.js/express'` with `import ... from '@coherent.js/integrations/express'`. Type definitions and runtime surface preserved (and aligned — pre-merge mismatch between the declared `.d.ts` and actual runtime exports was fixed during the move).
- **BREAKING:** Removed standalone `@coherent.js/fastify` package. Now ships as `@coherent.js/integrations/fastify`. Phantom `renderComponent` declaration removed from the migrated `.d.ts`.
- **BREAKING:** Removed standalone `@coherent.js/koa` package. Now ships as `@coherent.js/integrations/koa`. The Koa subpath ships without a `types` condition because the pre-merge `packages/koa/types/index.d.ts` declared an entirely phantom surface (`createComponentRoute`, `ssrMiddleware`, `errorMiddleware`, etc. — none of which existed at runtime). Future TypeScript support for Koa requires writing a fresh `.d.ts` from the actual runtime exports.
- **BREAKING:** Removed standalone `@coherent.js/nextjs` package. Now ships as `@coherent.js/integrations/nextjs`. Migrated `.d.ts` was rewritten to add the missing `createNextIntegration` declaration (existed at runtime, missing from old types) and to drop the phantom `renderComponent`.
- **BREAKING:** Removed standalone `@coherent.js/adapters` package. Its Astro, Remix, and SvelteKit adapters now ship as `@coherent.js/integrations/astro`, `@coherent.js/integrations/remix`, `@coherent.js/integrations/sveltekit`. Public APIs preserved verbatim.

### Added (Wave 2c)

- **NEW:** `@coherent.js/integrations` package consolidates ALL framework integration adapters. Subpaths: `./express`, `./fastify`, `./koa`, `./nextjs`, `./astro`, `./remix`, `./sveltekit`. Each previously shipped as its own package or (for the 3 SSG adapters) inside `@coherent.js/adapters`. Peer-dependencies for each framework declared optional, so consumers only need to install the ones they actually use.

### Changed (Wave 2c)

- `packages/cli/src/generators/runtime-scaffold.js` updated to scaffold new projects with a single `@coherent.js/integrations` dependency and framework-specific subpath imports (`import { setupCoherent } from '@coherent.js/integrations/express'` etc.). The pre-merge scaffold pinned each framework as a separate dep.
- `packages/cli/test/scaffold-matrix.test.js` and `packages/cli/test/import-audit.test.js` updated to assert the new integrations dep + subpath patterns.
- `examples/express-integration.js`, `examples/nextjs-integration.js`, `examples/vite-integration/vite.config.js` (externals collapsed to a single `@coherent.js/integrations` entry) all use the new import paths.
- `website/src/index.js` log strings updated to mention `@coherent.js/integrations/express`.
- Root `types/index.d.ts` aggregator file repointed all framework entries to the new integrations subpaths (Task 1 caught express; Tasks 2 follow-up caught koa/nextjs; Task 3 finalized including astro/remix/sveltekit + added fastify aggregator entry that was missing).
- `CLAUDE.md` removed stale parenthetical that mentioned the now-deleted standalone packages.

### Fixed (Wave 2c)

- `packages/express/src/coherent-express.d.ts` had a broken `from '../coherent'` import (the file `coherent.d.ts` never existed). Rewritten to `from '@coherent.js/core'` during the move (Task 1).
- `examples/vite-integration/vite.config.js` was importing `coherentVitePlugin` which never existed as an export of any version of `@coherent.js/build-tools` (the actual export is `createVitePlugin`). Fixed during Wave 2b Task 1 — flagging here for completeness since it's part of the consolidation story.

### Notes (Wave 2c)

- Workspace shrank from 17 → 13 packages (5 deleted, 1 created). Spec target is 12; current count 13 reflects the deliberate Wave-2b decision to defer `@coherent.js/vscode-extension` absorption into `tooling` to Wave 4 (paired with marketplace publish work). Wave 4 takes the workspace to 12.
- Total tests after Wave 2c: 1653 (small net reduction from placeholder stub deletions during the consolidations; all substantive coverage preserved via per-framework test migration).
- All 7 integrations subpaths verified at runtime (express, fastify, koa, nextjs, astro, remix, sveltekit) — each exposes the same public API surface as its pre-merge standalone package.
- Remaining 13 packages: api, cli, client, core, database, devtools, forms, i18n, integrations, seo, state, tooling, vscode-extension.

### Added (Wave 3a)

- **NEW: API surface snapshot gate.** `scripts/check-api-surface.mjs` walks each workspace package's `package.json` `exports` field, dynamic-imports each subpath, and snapshots the sorted list of exported symbol names to `packages/<name>/api-surface.txt`. CI runs the script in `--check` mode after build; any PR that changes a package's public exports without updating the snapshot fails the build. Reviewers see the surface diff explicitly, making accidental SemVer breakage impossible to merge unnoticed.
- 12 baseline `api-surface.txt` files committed — one per importable package (vscode-extension excluded; not an npm-import package).

### Notes (Wave 3a)

- The snapshot is intentionally name-level only, not type-signature level. Adding/removing/renaming any public export trips the gate; changing a method's parameters on a class that's already exported does not. This trade-off matches the spec's 1-day time-cap on homegrown tooling; type-level snapshotting can be added later via `@microsoft/api-extractor` if needed.
- The snapshot tool surfaced existing phantom paths in several packages' `exports` fields (api, database, devtools, client all have subpaths pointing at non-existent files). The baseline captures these as `# target file missing:` or `# import failed:` notes, so the gate enforces the current (broken) state and any cleanup of these phantoms will show as a reviewable diff.
- The `devtools/.` root entry currently fails to import because of a cross-package phantom dep on `@coherent.js/core/src/performance/monitor.js` (which isn't in core's exports). The entire devtools root API is therefore snapshotted as an import-failure note. Fixing this in a follow-up will surface the full root API in the diff.
- Wave 3a explicitly defers three Section-2 items to follow-on work: the `@internal` JSDoc sweep + `stripInternal` audit (per-package classification; the snapshot already catches any reclassification as a diff); the `experimental_` prefix pass (requires user input on which APIs are explicitly not SemVer-committed); and cleanup of phantom `require` → `*.cjs` declarations in package.json files (most packages still advertise `.cjs` paths their ESM-only build doesn't emit).
- Perf CI gates (Section 4 of the spec) are tracked separately as Wave 3b.

### Added (Wave 3b)

- **NEW: Bundle size gate.** `scripts/check-bundle-size.mjs` measures each package's built `dist/index.js` raw + gzipped byte length and snapshots per-package `packages/<name>/bundle-size.json` baselines. CI runs `--check` after build (right after the API surface check); fails PRs that grow any package's bundle by more than ±5% without an accompanying baseline update. Mirrors the Wave-3a API-surface gate pattern exactly.
- 13 baseline `bundle-size.json` files committed — 10 measured (api, cli, client, core, database, devtools, forms, i18n, seo, state), 3 marked `skipped` (integrations and tooling have no `.` root export; vscode-extension has no `exports` field).

### Removed (Wave 3b)

- **README:** Dropped "80.7KB gzipped production bundle" claim. Was a single-snapshot aggregate that didn't represent any real consumer's bundle. Replaced with a reference to the per-package `bundle-size.json` gates.
- **README:** Dropped "79.5% tree shaking reduction" claim. No tree-shake gate exists; the number was not reproducible from any committed benchmark. Removed rather than leave an ungated assertion.

### Notes (Wave 3b)

- The "247 renders/sec" claim in README is left untouched. It's a defensible measurement from `benchmarks/benchmark.js`. A render-throughput gate is a Wave 3c candidate — if pursued, it will either defend the number or trigger an update.
- Tree-shake reduction gating deferred to Wave 3c. The existing `scripts/analyze-bundle.mjs` references packages deleted in Wave 2c (express/fastify/koa/nextjs) so it's bit-rotted and needs a rewrite alongside any tree-shake gate work.
- Render throughput gating deferred to Wave 3c. CI variance on shared GitHub Actions runners makes throughput gating noisy and false-fail-prone; tightening would require self-hosted runners. Worth re-evaluating after some operational experience with the bundle-size gate.
- Skipped packages (integrations, tooling, vscode-extension) get re-evaluated whenever their root export shape changes — the `--write` baseline regeneration handles the transition automatically and the diff is reviewable.

### Added (Wave 4a)

- **NEW: Built-in HMR dev server.** `coherent dev --coherent` (or any project with `coherent.config.{js,mjs}`) now spins up a full HTTP + WebSocket + chokidar dev environment in-process — no vite/webpack/nodemon required. Broadcasts `{type:'hmr-update', filePath, webPath, updateType}` messages to the existing client at `packages/client/src/hmr/client.js`. ~400 lines split across four modules in `packages/cli/src/dev-server/`:
  - `hmr-server.js` — `ws` WebSocketServer wrapper with `broadcast/close/clientCount`
  - `file-watcher.js` — chokidar wrapper with debounce + `{filePath, webPath, updateType}` projection (POSIX webPath on all platforms)
  - `static-handler.js` — zero-dep static file server with idempotent HMR script injection on HTML, safe path-traversal rejection, inline `/__coherent_hmr_client.js` bootstrap
  - `index.js` — `startDevServer({root, port, host, open, log})` orchestrator
- **`ws@8.20.0` and `chokidar@5.0.0` promoted** from root devDeps to direct `@coherent.js/cli` dependencies. Both are marked `external` in `packages/cli/build.mjs` so they don't inflate the cli's bundle-size baseline.
- **ESLint test-files globals** gained `fetch` and `AbortSignal` (Node ≥ 20 natives) to support the dev-server integration tests.

### Changed (Wave 4a)

- **`coherent dev` error message** now suggests `--coherent` as a next step when no other dev-server configuration is detected.
- **`@coherent.js/cli` bundle**: dev.js now imports the dev-server orchestrator, growing `dist/index.js` by ~2.5% raw / ~3.2% gz. Well within the ±5% gate; baseline did not need to be regenerated.

### Notes (Wave 4a)

- Wave 4a is **opt-in**. Existing projects with vite/webpack/nodemon or a `dev` script in `package.json` get the same behavior as before. Making the built-in server the default for scaffolded apps requires template updates and is intentionally deferred to Wave 4b.
- **Out of scope for Wave 4a, deferred to Wave 4b:** Playwright E2E suite covering the six audit-item flows from spec Section 5 (hydration golden path, event survival, mismatch detection, HMR component update, form input preservation across HMR, scroll preservation across HMR), template updates to make `--coherent` the default for scaffolded apps, VS Code marketplace publish.
- **Out of scope, deferred to Wave 5 or post-1.0:** HTTPS/TLS for the dev server (use a reverse proxy; the client picks `wss://` automatically based on `location.protocol`), on-the-fly JSX/TS compilation (use vite/webpack via existing dev paths), full SSR routing (use the integrations package), module dependency graph (the client's `moduleTracker` already handles graph traversal).
- **Compile-error overlay path** currently only fires on chokidar `error` events (watcher errors, not module-load errors). Wiring the static handler to broadcast `hmr-error` when it can't serve a `.js` file is a small follow-up — left out of Wave 4a to keep the protocol surface minimal while we get operational experience.
- **`--no-hmr` flag** is parsed but not yet honored by the built-in server (always enabled). Trivial follow-up: when set, skip both the WebSocket server and the HTML script injection. Deferred. *(Closed in Wave 4b.)*

### Added (Wave 4b)

- **NEW: Playwright E2E suite.** `e2e/` top-level dir with Chromium-only Playwright config, a tiny static-served fixture (`e2e/fixtures/hmr-basic/`), and four tests that exercise the Wave-4a HMR dev server in a real browser:
  1. Bootstrap script tag is injected into served HTML and the `/__coherent_hmr_client.js` endpoint returns valid JS.
  2. Browser receives `{type:'connected'}` over the WebSocket on load.
  3. Touching a `.js` file fires `{type:'hmr-update', updateType:'component'}` reaching the browser with the correct `webPath`.
  4. Touching a `.css` file fires the same with `updateType:'style'`.
- **NEW: `e2e` CI job.** Runs parallel to the `test` matrix on a single ubuntu-latest + Node 22. Caches Playwright's browser download by lockfile hash so most CI runs skip the ~80MB Chromium pull. Uploads `playwright-report/` as a 7-day artifact on failure.
- **`--no-hmr` flag now honored.** When set, the built-in dev server skips both the WebSocket server and the static handler's script injection; `/__coherent_hmr_client.js` returns 404. Useful for `coherent dev --coherent --no-hmr` plain-static-serve scenarios.

### Changed (Wave 4b)

- **`startDevServer` and `createStaticHandler`** gained a new `hmr: boolean` option (defaults to true — no behavior change unless explicitly disabled). Local var in `startDevServer` renamed `hmr` → `hmrServer` to avoid colliding with the new option.
- **`pnpm-workspace.yaml`** now includes `e2e/fixtures/*` so fixture projects can declare workspace deps on framework packages.

### Notes (Wave 4b)

- Two of the spec's six audit-item E2E flows are not covered yet: SSR/hydration mismatch detection and event survival across DOM patches. Both test client-side framework features that already had unit coverage in `packages/client/` before Wave 4a; rerunning them in a browser is valuable but not blocking for 1.0. Deferred to Wave 4d (post-RC pass).
- Multi-browser E2E (Firefox/WebKit) is intentionally out of scope. Chromium-only catches the bulk of protocol bugs at much lower CI cost; expand when a browser-specific bug actually appears.
- The Wave-4a follow-up about wiring `hmr-error` from the static handler on file-read failures is **abandoned**, not deferred — the browser already gets a 404 with a clear console message, and our minimal dev server has no build pipeline that would produce broadcast-worthy compile errors. Revisit if real users complain.
- Template default-on for `--coherent` in `coherent create` is still **deferred** (now to Wave 5 or post-1.0). Scaffolded apps produce Node SSR projects today; reconciling them with the static-first dev server is a larger redesign than Wave 4 should swallow.

### Added (Wave 4c)

- **NEW: VS Code extension publish-readiness gate.** `scripts/check-vsix.mjs` unzips a freshly-built `.vsix` and asserts: required entries are present (extension entry, LSP server bundle, snippets, icon, manifest) and the `vsixmanifest`'s Identity Version matches `packages/vscode-extension/package.json`. Catches the common "shipped a broken vsix" failures before they reach the marketplace.
- **NEW: `vsix` CI job.** Builds the extension and runs `check-vsix.mjs` on every PR. Uploads the built `.vsix` as a 30-day artifact so reviewers can sideload and smoke-test without rebuilding locally.
- **NEW: `packages/vscode-extension/PUBLISHING.md`.** End-to-end maintainer documentation: marketplace publisher setup, PAT creation with the correct narrow scope (Marketplace:Manage only, 1-year max), `vsce login` flow, per-release sequence, local smoke-test, rollback options (unpublish-by-version, republish-with-fix, nuclear unpublish), and troubleshooting for the common failure modes.

### Changed (Wave 4c)

- **`packages/vscode-extension/package.json`**: added `vscode:prepublish` and `prepublishOnly` scripts (both alias `pnpm run build`). `vsce package` and `vsce publish` now always rebuild dist/ + server/ — no more "shipped a stale dist" footgun. Also added a `clean` script.
- **`packages/vscode-extension/package.json` engines.vscode** bumped from `^1.85.0` to `^1.118.0` to satisfy vsce's enforcement that `engines.vscode >= @types/vscode` (which is pinned at `^1.118.0`). Surfaced during the Task 1 verification step — pre-existing latent bug that would have blocked any future packaging attempt.

### Removed (Wave 4c)

- **`packages/vscode-extension/coherent-language-support-1.0.0.vsix`** — 4-month-stale committed binary whose filename version (1.0.0) didn't even match the current package.json (1.0.0-beta.8). Built binaries belong on the marketplace, not in git. `packages/vscode-extension/.gitignore` now excludes `*.vsix` so future builds don't sneak back in.

### Notes (Wave 4c)

- **Actual `vsce publish` is NOT automated.** It requires the maintainer's Personal Access Token, which Claude can't and shouldn't handle. PUBLISHING.md documents the exact command. The Wave 4c gates ensure the .vsix is *publishable*; pressing the button is a human step.
- **Version bump to `1.0.0` deferred to Wave 5.** The extension's `package.json` stays at `1.0.0-beta.8` matching the rest of the monorepo. Wave 5's release plan owns the coordinated bump.
- **OpenVSX publish (for VS Code forks: VSCodium, Cursor, etc.) intentionally not added.** Not a 1.0 requirement. Easy follow-up if users on those forks ask for it.
- **Absorbing `vscode-extension` into `@coherent.js/tooling`** (per spec Section 1's 12-package target) is still pending. Structural surgery; deserves its own plan. Wave 4c keeps the extension as a standalone workspace package.
- **CI auto-publish on tag intentionally not added.** Storing a PAT in GitHub Actions secrets is a security surface we don't need to open for 1.0; manual publish is fine for the cadence we expect.

## [1.0.0-beta.8] - 2026-04-06

### Added
- **Website UI/UX Overhaul**: Major visual polish across all pages with search, animations, and examples improvements.
- **Website Dynamic Docs**: Added dynamic docs route and sidebar navigation for the dev server.
- **Website Island Hydration**: Integrated `Island()` hydration, performance monitoring, and perf API into the website.
- **Website Coherent.js Dogfooding**: Restructured website as a proper Coherent.js project using framework features throughout.

### Improved
- **Website Layout**: Consistent full-width layout, page structure, and background styling across all pages.
- **Website Hero Section**: Improved hero orb animation, full-width hero, cleaner CTA buttons, and code block styling.
- **Website Navigation**: Active nav state, footer alignment, and docs sidebar on index page.
- **Code Highlighting**: Enhanced hero code highlighting and cleanup.
- **Build System**: Unified website build script with component composition.

### Fixed
- **CJS Build**: Hardcoded VERSION to avoid `import.meta.url` warning in CJS builds.
- **WebSocket**: Guarded `WebSocket.OPEN` reference for Node.js environments.
- **Test Coverage**: Pinned `@vitest/coverage-v8` to match vitest version.
- **CI/CD**: Fixed release-drafter PR trigger, resolved shellcheck warnings, and cleaned up GitHub Actions workflows.
- **VS Code Extension**: Renamed vsce publish script to avoid beta conflicts.

### Dependencies
- Bumped `esbuild` from 0.27.2 to 0.27.3.
- Bumped `next` from 16.1.4 to 16.1.7.
- Bumped `codecov/codecov-action` from 5 to 6.
- Bumped `actions/upload-artifact` from 5 to 7.
- Bumped `actions/deploy-pages` from 4 to 5.
- Bumped `pnpm/action-setup` from 4 to 5.
- Bumped `release-drafter/release-drafter` from 6 to 7.
- Bumped `dawidd6/action-download-artifact` from 6 to 20.
- Cleaned up root dependencies and fixed peer ranges.

## [1.0.0-beta.7] - 2026-04-04

### Added
- **Islands Architecture**: Added `Island()` wrapper and client-side discovery for selective hydration.
- **Selective Hydration**: Introduced `selectiveHydrate()` and `hydratable` SSR flag for targeted interactivity.
- **Functional Programming Support**: Added `hoc`, `compose`, and `fp` namespaces for functional component building.
- **IDE Support**: Created VS Code extension with language client and LSP server for Coherent object validation and snippets.
- **TypeScript Enhancements**: Added strict HTML element types and improved generics for API and database packages.
- **Hot Module Replacement (HMR)**: Implemented complete HMR infrastructure including state preservation, resource disposal, and error overlay.
- **CLI Improvements**: Consolidated scaffolding templates and enhanced UX with better success messages and file tree views.
- **New Hydration Core**: Re-engineered hydration with event delegation, state serialization, and mismatch detection.
- **Key-based Reconciliation**: Added support for `key` props to enable efficient updates and identification of changed elements.
- **HTML Nesting Validation**: Integrated defensive checks to ensure valid HTML structures (e.g., no `div` inside `p`).

### Improved
- **Streaming Renderer**: Enhanced `renderToStream` with full component and feature parity.
- **Cache Performance**: Replaced `JSON.stringify` with MurmurHash3-based object hashing for 50x faster cache key generation.
- **Defensive Rendering**: Improved circular reference detection and input validation across all renderers.
- **Documentation**: Updated website and guides with modern features and examples.

## [1.0.0-beta.6] - 2025-12-15

### Added
- **Docker Support**: Added Docker scaffolding support to the CLI for easy containerization.

## [1.0.0-beta.5] - 2025-12-05

### Improved
- **Production Readiness**: Added a comprehensive checklist for production deployment.
- **Route Cache**: Implemented LRU cache for compiled routes in @coherent.js/api.
- **Security Headers**: Added optimized security header configurations.
- **Performance**: Optimized smart route matching in the API router.

### Fixed
- **Validation Bug**: Resolved return type issue in API validation functions.

## [1.0.0-beta.4] - 2025-11-25

### Fixed
- **CI/CD Improvements**: Enhanced build and test workflows to ensure fresh artifacts and prevent stale errors.
- **Vulnerability Patching**: Resolved several moderate and high-severity security vulnerabilities.
- **Test Stability**: Fixed timing tolerance issues in profiler tests and timing-sensitive suites.

## [1.0.0-beta.3] - 2025-11-17

### Fixed
- **API Router Issues**: Resolved critical bugs in @coherent.js/api router
  - Fixed double slash generation in route compilation
  - Fixed character class escaping that broke regex patterns
  - Improved parameter handling logic for complex routes

- **Documentation System**: Comprehensive documentation refactor and cleanup
  - Reorganized documentation into clean, logical structure
  - Removed unnecessary status/log files
  - Fixed all package name references (@coherent.js/*)
  - Created missing README files for all packages

- **Package Completeness**: Added missing package documentation
  - `@coherent.js/forms` - Forms handling and validation
  - `@coherent.js/koa` - Koa.js adapter
  - `@coherent.js/nextjs` - Next.js integration
  - `@coherent.js/performance` - Performance monitoring
  - `@coherent.js/seo` - SEO optimization tools

## [1.0.0-beta.2] - 2025-11-10

### Changed
- **Package Reorganization**: Major restructuring for better separation of concerns
  - Created new **@coherent.js/state** package for reactive state management
  - Moved client-side router to **@coherent.js/client** package
  - Consolidated forms validation into **@coherent.js/forms** package
  - Consolidated dev tools into **@coherent.js/devtools** package
  - Exported lifecycle hooks, object factory, and component cache from **@coherent.js/core**
  - Removed redundant code and consolidated duplicate features
  - Updated all package dependencies and workspace references

### Added
- **@coherent.js/state** - New dedicated package for state management
  - Reactive state with observables and computed properties
  - SSR-compatible state management
  - State persistence (LocalStorage, SessionStorage, IndexedDB)
  - State validation with built-in validators
  - Context API for sharing state across components

- **Core exports** - New utilities exported from @coherent.js/core
  - Lifecycle: `ComponentLifecycle`, `LIFECYCLE_PHASES`, `withLifecycle`, `createLifecycleHooks`, `useHooks`, `lifecycleUtils`
  - Object factory: `h`, `createElement`, `createTextNode`
  - Component cache: `ComponentCache`, `createComponentCache`, `memoize`

- **Client routing** - Router moved to @coherent.js/client
  - Enhanced routing with prefetching strategies
  - Page transitions and code splitting
  - Advanced scroll behavior

- **Documentation** - Comprehensive guides for new packages
  - [Reactive State Guide](/docs/components/reactive-state.md) - Complete @coherent.js/state documentation
  - [Client Router Guide](/docs/client-side/client-router.md) - Router with prefetching & transitions
  - [Package Reorganization Migration Guide](/docs/PACKAGE_REORGANIZATION_MIGRATION.md) - Upgrade guide for v1.0.0-beta.2
  - Updated DOCS_INDEX.md with new documentation

- **Examples** - New demonstration files
  - `state-management-demo.js` - Comprehensive @coherent.js/state examples
  - `client-router-demo.js` - Client-side routing with all features

## [1.0.0-beta.1] - 2025-11-03

### 🎉 Beta Release - Fresh Start

This is the first beta release of Coherent.js after a complete version reset. We've cleaned up the npm registry and started fresh with a clear, professional versioning strategy.

**Installation**: `npm install @coherent.js/core@beta`

### ✨ Complete Feature Set

#### Core Framework
- **Pure Object Components**: Build UI with pure JavaScript objects (no JSX needed)
- **Server-Side Rendering**: Optimized SSR with streaming support
- **Client-Side Hydration**: Progressive enhancement with selective hydration
- **Performance Monitoring**: Built-in profiling and optimization tools
- **Security**: Automatic XSS protection and input validation
- **Streaming Renderer**: High-performance rendering for large documents

#### Plugin System
- Extensible architecture with lifecycle hooks
- 7 built-in plugins: Performance, DevLogger, Analytics, Cache, ErrorRecovery, Validation, Hydration
- Dependency resolution and priority-based execution
- 10+ lifecycle hooks for complete control

#### Developer Experience
- **Testing Utilities**: Complete testing package with 15+ custom matchers
- **Developer Tools**: Component inspector, performance profiler, dev logger
- **Error Boundaries**: Production-ready error handling with auto-recovery
- **Hot Module Replacement**: Fast development with HMR support

#### Framework Integrations
- Express.js adapter (`@coherent.js/express`)
- Fastify adapter (`@coherent.js/fastify`)
- Koa adapter (`@coherent.js/koa`)
- Next.js integration (`@coherent.js/nextjs`)

#### Additional Features
- **Internationalization**: Complete i18n with pluralization, formatters, RTL support
- **Form Utilities**: Comprehensive validation with 10+ built-in validators
- **SEO Optimization**: Meta tags, sitemaps, JSON-LD structured data
- **Database Layer**: Adapters for PostgreSQL, MySQL, SQLite, MongoDB
- **API Framework**: REST/RPC/GraphQL with OpenAPI generation

### 📦 Package Versions

All 20 packages released as version 1.0.0-beta.1:

**Core Packages:**
- `@coherent.js/core@1.0.0-beta.1` - Core framework
- `@coherent.js/client@1.0.0-beta.1` - Client-side hydration
- `@coherent.js/api@1.0.0-beta.1` - API framework

**Integration Packages:**
- `@coherent.js/express@1.0.0-beta.1` - Express.js integration
- `@coherent.js/fastify@1.0.0-beta.1` - Fastify integration
- `@coherent.js/koa@1.0.0-beta.1` - Koa integration
- `@coherent.js/nextjs@1.0.0-beta.1` - Next.js integration

**Feature Packages:**
- `@coherent.js/database@1.0.0-beta.1` - Database adapters
- `@coherent.js/forms@1.0.0-beta.1` - Form utilities
- `@coherent.js/i18n@1.0.0-beta.1` - Internationalization
- `@coherent.js/seo@1.0.0-beta.1` - SEO tools
- `@coherent.js/testing@1.0.0-beta.1` - Testing utilities
- `@coherent.js/devtools@1.0.0-beta.1` - Developer tools
- `@coherent.js/performance@1.0.0-beta.1` - Performance utilities
- `@coherent.js/performance-profiler@1.0.0-beta.1` - Performance profiling

**Build & Runtime:**
- `@coherent.js/cli@1.0.0-beta.1` - CLI tools
- `@coherent.js/build-tools@1.0.0-beta.1` - Build utilities
- `@coherent.js/runtime@1.0.0-beta.1` - Runtime enhancements
- `@coherent.js/adapters@1.0.0-beta.1` - Framework adapters
- `@coherent.js/web-components@1.0.0-beta.1` - Web components integration

### 🔄 What Changed

This release represents a **complete version reset**:
- Removed all previous versions from npm (0.x.x, 1.0.0-1.2.1)
- Started fresh with clean version history
- All packages synchronized to 1.0.0-beta.1
- Both `latest` and `beta` npm tags point to this version

### 📝 Notes for Beta Users

This is a beta release. We're collecting feedback before the v1.0.0 stable release:
- The API is stable and production-ready
- Breaking changes are unlikely but possible
- Please report any issues on GitHub
- Feedback and contributions are welcome!

### 🛣️ Semantic Versioning Plan

Going forward:
- **1.0.0-beta.x** - Beta releases (current phase)
- **1.0.0** - First stable release
- **1.0.x** - Patch releases (bug fixes)
- **1.x.0** - Minor releases (new features, backward compatible)
- **2.0.0** - Major releases (breaking changes)
