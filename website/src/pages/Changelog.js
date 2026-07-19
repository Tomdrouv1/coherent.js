// Changelog.js - Version history and release notes
export function Changelog() {
  return {
    div: {
      className: 'changelog-page',
      children: [
        // Header
        { div: { className: 'page-header', children: [
          { h1: { text: 'Changelog' } },
          { p: { className: 'page-lead', text: 'All notable changes to Coherent.js, following Semantic Versioning.' } }
        ] } },

        // Timeline
        { section: { className: 'changelog-timeline', children: [

          // v1.0.0-rc.5
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-rc.5' } },
              { span: { className: 'changelog-date', text: '2026-07-19' } },
              { span: { className: 'changelog-badge changelog-badge-current', text: 'Current' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Highlights' } },
              { p: { text: 'Dependency-truth release: what the published packages declare now matches what they need at runtime, and the audit is clean.' } },
              { h3: { text: 'Fixed' } },
              { ul: { children: [
                { li: { text: 'core VERSION reports the real version — it had been hardcoded at 1.0.0-beta.8 since that release. Now substituted from the manifest at build time, with a CI gate so it cannot drift again.' } },
                { li: { text: 'coherent-language-server no longer crashes on a clean install: the LSP uses the TypeScript compiler API at runtime, and typescript is now a real dependency of @coherent.js/tooling.' } },
                { li: { text: 'CLI: ws bumped off an exact-pinned vulnerable version (memory-exhaustion DoS, fixed in 8.21.0), and the optional bundler peers (rollup, vite, webpack) are ranges instead of exact pins — no more unmet-peer warnings on newer versions.' } },
                { li: { text: 'database JSDoc examples import from @coherent.js/database (was the nonexistent @coherent/database).' } }
              ] } },
              { h3: { text: 'Changed' } },
              { ul: { children: [
                { li: { text: 'Dependencies updated to latest: commander 15 and ora 9 (cli), fastify-plugin 6 (integrations), vscode-languageserver/client 10 (tooling + VS Code extension).' } },
                { li: { text: 'pnpm audit reports zero vulnerabilities — overrides added for the remaining low/moderate transitive advisories.' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-rc.4
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-rc.4' } },
              { span: { className: 'changelog-date', text: '2026-07-19' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Highlights' } },
              { p: { text: 'Renderer correctness and type-truth follow-up to rc.3, plus the release guardrails that would have caught both bug classes earlier.' } },
              { h3: { text: 'Fixed' } },
              { ul: { children: [
                { li: { text: 'Void elements (meta, img, input, br, link, …) render without closing tags — the renderer previously emitted invalid HTML like <meta></meta> on every page.' } },
                { li: { text: '69 phantom type declarations removed across eight packages: .d.ts files declared values that do not exist at runtime, so broken consumer code typechecked and then crashed.' } },
                { li: { text: 'tooling testing subpaths ship per-slice declaration files matching their runtime exports; ObjectRouter’s type gained its real methods (get/post/…, toExpressRouter, createServer).' } },
                { li: { text: 'Express TypeScript scaffolds typecheck: typed error-middleware parameters.' } }
              ] } },
              { h3: { text: 'Added' } },
              { ul: { children: [
                { li: { text: 'Types-parity gate: CI fails when a declaration promises a value the runtime does not export.' } },
                { li: { text: 'Scaffold boot E2E: generated projects are installed, typechecked, tested, booted, and probed over HTTP — nightly and on PRs.' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-rc.3
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-rc.3' } },
              { span: { className: 'changelog-date', text: '2026-07-19' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Highlights' } },
              { p: { text: 'Quality release driven by end-to-end verification: consuming the published packages from a real project, scaffolding projects and running their scripts, executing every documented code sample, and link-auditing the built website.' } },
              { h3: { text: 'Fixed' } },
              { ul: { children: [
                { li: { text: 'Published exports maps: the development condition pointing at unshipped src/ broke every Vite/Vitest consumer of core, client, devtools, state, and tooling — removed. Client subpaths (./events, ./router, ./hmr) and main now resolve to built dist output. Phantom subpath exports in api, database, and devtools now have real build outputs.' } },
                { li: { text: '@coherent.js/devtools was unimportable when installed (deep @coherent.js/core/src imports) — now imports the public entry.' } },
                { li: { text: 'CLI scaffolds work out of the box: runnable test setup, strict-TypeScript-clean templates for all four runtimes, working /api routing glue for fastify and koa, and no more fabricated APIs (createI18n, createMetaTags, renderField, setupDevtools).' } },
                { li: { text: 'Docs and examples aligned with the real APIs: renderToString → render, phantom type declarations removed, 30+ dead cross-links fixed, examples are runnable again (node examples/<file>.js).' } },
                { li: { text: 'Website: broken links, stale version badge (now version-driven), SEO/a11y basics (lang, canonical, Open Graph, sitemap, robots.txt, 404 page).' } }
              ] } },
              { h3: { text: 'Added' } },
              { ul: { children: [
                { li: { text: 'CI gates: publint on every publishable package, api-surface check hard-fails on missing export targets, scaffold-matrix parses every generated file.' } },
                { li: { text: 'New docs: testing guide, i18n and seo package pages.' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-rc.2
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-rc.2' } },
              { span: { className: 'changelog-date', text: '2026-05-25' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Highlights' } },
              { p: { text: 'Hotfix release. Manual verification of `coherent create` revealed that several scaffold permutations could not boot; rc.2 fixes the boot-blocking bugs in CLI scaffolds and the Fastify/Koa/SQLite integrations. No public API was removed or renamed.' } },
              { h3: { text: 'Fixed' } },
              { ul: { children: [
                { li: { text: 'Fastify integration: coherentFastify is now wrapped with fastify-plugin so hooks and decorators apply to the parent context; auto-render moved from onSend to preSerialization with an identity serializer so rendered HTML is sent verbatim.' } },
                { li: { text: 'Koa integration: setupCoherent forwards the template option through to the middleware instead of silently dropping it.' } },
                { li: { text: 'Database: sqlite3 peer dependency relaxed from an exact 5.0.0 pin to >=5.0.0.' } },
                { li: { text: 'CLI sqlite scaffolds: switched from better-sqlite3 to sqlite3, rewrote UserModel on the database manager API, and fixed init racing that intermittently caused SQLITE_BUSY.' } },
                { li: { text: 'CLI fullstack scaffolds: auth routes are now actually mounted under /api/auth, and authMiddleware no longer 401s every request including GET /.' } },
                { li: { text: 'CLI fastify scaffold: static-file root now points at the project public/ directory; koa and fastify scaffolds wrap pages in a real HTML shell.' } },
                { li: { text: 'CLI version resolution: scaffolds correctly pin @coherent.js/* deps to ^1.0.0-rc.2 (previously a stale 1.0.0-beta.5 fallback could slip in).' } }
              ] } },
              { h3: { text: 'Changed' } },
              { ul: { children: [
                { li: { text: 'BREAKING: minimum Node.js version is now 22 (engines.node >=22.0.0 across all published packages). CI tests Node 22.x, 24.x, and 26.x.' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-rc.1
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-rc.1' } },
              { span: { className: 'changelog-date', text: '2026-05-17' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Highlights' } },
              { p: { text: 'Comprehensive v1.0 hardening across five waves. See MIGRATION-1.0.md in the repo for the full breaking-changes guide with copy-paste fixes.' } },
              { h3: { text: 'Workspace consolidation (Waves 2a/2b/2c)' } },
              { ul: { children: [
                { li: { text: 'Workspace consolidated from 21+ packages to 12 published packages (plus the standalone VS Code extension).' } },
                { li: { text: 'Framework integrations (express, fastify, koa, nextjs, adapters/*) → subpath exports of @coherent.js/integrations.' } },
                { li: { text: 'Build tools (vite, webpack, rollup, loader) → subpath exports of @coherent.js/cli/build-tools.' } },
                { li: { text: 'Performance utilities (cache, code-splitting, lazy-loading) → subpath exports of @coherent.js/devtools/performance.' } },
                { li: { text: 'LSP + testing + language-service merged into @coherent.js/tooling.' } },
                { li: { text: 'Dropped: @coherent.js/runtime, @coherent.js/web-components, @coherent.js/profiler (138 lines of placeholder).' } }
              ] } },
              { h3: { text: 'Removed APIs (Wave 1)' } },
              { ul: { children: [
                { li: { text: 'Client: legacyHydrate, hydrateAll, hydrateBySelector, enableClientEvents, makeHydratable, autoHydrate, registerEventHandler — use hydrate() instead.' } },
                { li: { text: 'Client: direct imports of @coherent.js/client/src/hmr.js throw a migration error. Use { hmrClient } from @coherent.js/client.' } },
                { li: { text: 'Forms: createForm, formValidators, enhancedForm removed. Use createFormBuilder + hydrateForm.' } }
              ] } },
              { h3: { text: 'New in 1.0' } },
              { ul: { children: [
                { li: { text: 'Built-in HMR dev server (`coherent dev --coherent`): HTTP + WebSocket + chokidar, no vite/webpack required for static-served projects.' } },
                { li: { text: 'API surface lockdown: every public export is snapshotted to packages/<name>/api-surface.txt; CI gates accidental drift.' } },
                { li: { text: 'Per-package bundle-size gates: each dist/index.js raw + gzipped size baselined to packages/<name>/bundle-size.json; CI fails on >±5% drift.' } },
                { li: { text: 'Playwright E2E suite: six audit-item browser flows automated in CI (Chromium).' } },
                { li: { text: 'VS Code extension publish-readiness check + dedicated CI job + PUBLISHING.md runbook.' } }
              ] } },
              { h3: { text: 'README claims cleaned up' } },
              { ul: { children: [
                { li: { text: 'Dropped: "42.7% improvement over OOP" (required maintaining an OOP-equivalent fixture).' } },
                { li: { text: 'Dropped: "95%+ cache hit rate" (workload-dependent, dishonest as a framework property).' } },
                { li: { text: 'Dropped: aggregate "80.7KB gzipped bundle" claim (replaced with per-package CI gates).' } },
                { li: { text: 'Dropped: "79.5% tree-shake reduction" (no gate existed to defend the number).' } },
                { li: { text: 'Retained: "247 renders/sec" (defensible from benchmarks/benchmark.js).' } }
              ] } },
              { h3: { text: 'Next' } },
              { p: { text: 'Release candidate — 1-2 week soak before promoting to 1.0.0 stable. Install with `pnpm add @coherent.js/core@rc` to try it.' } }
            ] } }
          ] } },

          // v1.0.0-beta.8
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-beta.8' } },
              { span: { className: 'changelog-date', text: '2026-04-06' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Added' } },
              { ul: { children: [
                { li: { text: 'Major website UI/UX overhaul with search, animations, and examples improvements' } },
                { li: { text: 'Dynamic docs route and sidebar navigation for the dev server' } },
                { li: { text: 'Island() hydration, performance monitoring, and perf API in the website' } },
                { li: { text: 'Website restructured as a proper Coherent.js project using framework features' } }
              ] } },
              { h3: { text: 'Improved' } },
              { ul: { children: [
                { li: { text: 'Consistent full-width layout, page structure, and background styling' } },
                { li: { text: 'Hero section: improved orb animation, cleaner CTA buttons, code highlighting' } },
                { li: { text: 'Unified website build script with component composition' } }
              ] } },
              { h3: { text: 'Fixed' } },
              { ul: { children: [
                { li: { text: 'CJS build: hardcoded VERSION to avoid import.meta.url warning' } },
                { li: { text: 'WebSocket.OPEN reference guarded for Node.js environments' } },
                { li: { text: 'CI/CD: release-drafter, shellcheck warnings, and GitHub Actions cleanup' } },
                { li: { text: 'Pinned @vitest/coverage-v8 to match vitest version' } }
              ] } },
              { h3: { text: 'Dependencies' } },
              { ul: { children: [
                { li: { text: 'Bumped esbuild, next, codecov, upload-artifact, deploy-pages, pnpm/action-setup, release-drafter, and more' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-beta.7
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-beta.7' } },
              { span: { className: 'changelog-date', text: '2026-04-04' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Added' } },
              { ul: { children: [
                { li: { text: 'Islands Architecture with Island() wrapper and client-side discovery for selective hydration' } },
                { li: { text: 'Selective Hydration via selectiveHydrate() and hydratable SSR flag' } },
                { li: { text: 'Functional Programming support with hoc, compose, and fp namespaces' } },
                { li: { text: 'VS Code extension with language client and LSP server' } },
                { li: { text: 'Hot Module Replacement (HMR) with state preservation and error overlay' } },
                { li: { text: 'Key-based reconciliation for efficient updates' } },
                { li: { text: 'HTML nesting validation for valid DOM structures' } }
              ] } },
              { h3: { text: 'Improved' } },
              { ul: { children: [
                { li: { text: 'Streaming Renderer with full component and feature parity' } },
                { li: { text: 'Cache performance: MurmurHash3-based object hashing for 50x faster cache keys' } },
                { li: { text: 'Defensive rendering with improved circular reference detection' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-beta.6
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-beta.6' } },
              { span: { className: 'changelog-date', text: '2025-12-15' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Added' } },
              { ul: { children: [
                { li: { text: 'Docker scaffolding support in the CLI for easy containerization' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-beta.5
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-beta.5' } },
              { span: { className: 'changelog-date', text: '2025-12-05' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Improved' } },
              { ul: { children: [
                { li: { text: 'Production readiness checklist for deployment' } },
                { li: { text: 'LRU cache for compiled routes in @coherent.js/api' } },
                { li: { text: 'Optimized security header configurations' } },
                { li: { text: 'Smart route matching performance in the API router' } }
              ] } },
              { h3: { text: 'Fixed' } },
              { ul: { children: [
                { li: { text: 'Return type issue in API validation functions' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-beta.4
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-beta.4' } },
              { span: { className: 'changelog-date', text: '2025-11-25' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Fixed' } },
              { ul: { children: [
                { li: { text: 'CI/CD build and test workflows for fresh artifacts' } },
                { li: { text: 'Several moderate and high-severity security vulnerabilities' } },
                { li: { text: 'Timing tolerance issues in profiler tests' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-beta.3
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-beta.3' } },
              { span: { className: 'changelog-date', text: '2025-11-17' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Fixed' } },
              { ul: { children: [
                { li: { text: 'Critical API router bugs: double slash generation and character class escaping' } },
                { li: { text: 'Comprehensive documentation refactor and reorganization' } },
                { li: { text: 'Added missing README files for forms, koa, nextjs, performance, and seo packages' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-beta.2
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-beta.2' } },
              { span: { className: 'changelog-date', text: '2025-11-10' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { h3: { text: 'Changed' } },
              { ul: { children: [
                { li: { text: 'Major package reorganization for better separation of concerns' } },
                { li: { text: 'New @coherent.js/state package for reactive state management' } },
                { li: { text: 'Client-side router moved to @coherent.js/client' } }
              ] } },
              { h3: { text: 'Added' } },
              { ul: { children: [
                { li: { text: 'Reactive state with observables, computed properties, and persistence' } },
                { li: { text: 'Enhanced client routing with prefetching, transitions, and code splitting' } },
                { li: { text: 'New lifecycle hooks and object factory exports from @coherent.js/core' } }
              ] } }
            ] } }
          ] } },

          // v1.0.0-beta.1
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-beta.1' } },
              { span: { className: 'changelog-date', text: '2025-11-03' } },
              { span: { className: 'changelog-badge changelog-badge-initial', text: 'Initial Beta' } }
            ] } },
            { div: { className: 'changelog-changes', children: [
              { p: { text: 'First beta release of Coherent.js with a complete version reset and clean npm registry.' } },
              { h3: { text: 'Highlights' } },
              { ul: { children: [
                { li: { text: 'Pure object components with optimized SSR and streaming support' } },
                { li: { text: 'Client-side hydration with progressive enhancement' } },
                { li: { text: 'Extensible plugin system with 7 built-in plugins and 10+ lifecycle hooks' } },
                { li: { text: 'Framework integrations for Express, Fastify, Koa, and Next.js' } },
                { li: { text: 'Full-featured packages for i18n, forms, SEO, database, and API' } },
                { li: { text: 'All 20 packages synchronized and released' } }
              ] } }
            ] } }
          ] } }

        ] } }
      ]
    }
  };
}
