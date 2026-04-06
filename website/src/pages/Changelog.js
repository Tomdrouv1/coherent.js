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

          // v1.0.0-beta.8
          { article: { className: 'changelog-entry', children: [
            { div: { className: 'changelog-entry-header', children: [
              { span: { className: 'changelog-version', text: 'v1.0.0-beta.8' } },
              { span: { className: 'changelog-date', text: '2026-04-06' } },
              { span: { className: 'changelog-badge changelog-badge-current', text: 'Current' } }
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
