# Project Research Summary

**Project:** Coherent.js Framework Stabilization
**Domain:** Server-side rendering framework with client hydration
**Researched:** 2026-01-21
**Confidence:** HIGH

## Executive Summary

Coherent.js is a high-performance SSR framework with a unique object-based virtual DOM approach. Research reveals that while the core architecture is sound, the framework suffers from three categories of critical gaps that prevent production readiness: broken foundational features (CLI scaffolding, HMR), missing industry-standard patterns (key-based reconciliation, hydration mismatch detection), and accumulated technical debt (monolithic files, hardcoded application logic in framework code).

The recommended stabilization approach follows a strict dependency-ordered roadmap: **foundation first, reliability second, performance third**. Key-based reconciliation must come before any hydration fixes since position-based diffing is fundamentally incompatible with stable component identity. CLI scaffolding must work before developers can experience HMR improvements. Hydration mismatch detection must precede streaming optimizations since you can't optimize what you can't debug.

The critical risk is attempting performance optimizations (streaming SSR, progressive hydration) before fixing core correctness issues (key-based diffing, event handler persistence). Every major SSR framework (React, Vue, Solid) learned this lesson: a fast broken system is worse than a slow working system. Mitigation: enforce strict phase ordering with validation gates between phases.

## Key Findings

### Recommended Stack

The current Coherent.js stack is appropriate but needs augmentation rather than replacement. The core object-based virtual DOM, server rendering with `renderToString`, and client hydration architecture aligns with proven patterns from React, Vue, and Solid. The framework doesn't need new technologies—it needs proper implementation of existing patterns.

**Core architectural fixes required:**
- Key-based reconciliation algorithm: Implement LCS (Longest Common Subsequence) diffing like React's reconciler, using stable keys instead of index-based position matching. This is non-negotiable for list stability.
- Hydration mismatch detection: Add development-mode structural hashing to compare server and client DOM trees before hydration, with detailed error reporting showing exact divergence points.
- Event delegation system: Replace scattered event attachment approaches (inline handlers, function props, data attributes) with single document-level delegated listener system to prevent handler loss during re-renders.

**Modular architecture pattern:**
- Split monolithic `hydration.js` (1792 lines) and `component-system.js` (2597 lines) into focused modules: `state-serializer.js`, `reconciler/differ.js`, `reconciler/patcher.js`, `events/delegation.js`
- Use Handlebars templates for CLI generation instead of inline template strings
- Separate server/client rendering concerns with clear environment detection utilities

**Confidence:** HIGH - These patterns are universal across all modern frameworks and extensively documented in React, Vue, and Solid source code.

### Expected Features

Research into Next.js, Nuxt, SvelteKit, Remix, and Astro reveals that Coherent.js is missing **table stakes** features that users expect from any SSR framework in 2025/2026. These aren't optional enhancements—they're the baseline that determines whether developers even try the framework.

**Must have (table stakes - BLOCKING):**
- Working CLI scaffolding: `npx create-coherent` must produce immediately runnable projects. Currently produces broken/outdated code. This is the first impression developers get—broken scaffolding means immediate abandonment.
- Functional HMR: Sub-second feedback with state preservation during development. Currently non-functional, forcing full page reloads. Without HMR, developer experience feels like 2015.
- Complete TypeScript definitions: Zero-config TypeScript support with accurate type definitions. Currently incomplete, breaking IDE integration.
- IDE/Language Server support: IntelliSense, autocomplete, error highlighting without manual setup. Currently none. Developers spend 80% of time in IDE—missing this is a deal-breaker.

**Should have (competitive differentiation):**
- In-browser DevTools: Coherent.js already has `@coherent.js/devtools` package with inspector, profiler, logger. Building browser-based DevTools panel would differentiate from most frameworks (only Nuxt has comprehensive in-browser DevTools).
- Streaming SSR with boundaries: Framework has `renderToStream` partially implemented but not integrated with hydration boundaries. Completing this shows technical sophistication.
- Error overlay in development: Visual error display with stack traces and fix suggestions.

**Defer (v2+):**
- Codemods for version migrations: Not needed until framework has breaking changes between versions
- AI-assisted development: Bleeding edge, not table stakes in 2026
- Advanced server components: Can wait until core hydration is rock-solid

**Feature dependency chain:** CLI scaffolding → TypeScript definitions → IDE support → DevTools. Cannot skip steps.

### Architecture Approach

Modern SSR frameworks achieve reliability through strict separation of concerns: state serialization, DOM reconciliation, event management, and component lifecycle must be independent modules with clear interfaces. Coherent.js currently violates this principle with monolithic files that mix responsibilities.

**Major components (recommended decomposition):**
1. **State Serializer** — Extract/restore component state from DOM `data-*` attributes, serialize for SSR output. Single responsibility: state transfer between server and client.
2. **Reconciler** — Key-based diff algorithm (LCS pattern) and DOM patcher. Computes minimal changes and applies them. Independent of hydration lifecycle.
3. **Event Delegation** — Single document-level listener that routes events via `data-coherent-event` attributes. Prevents handler loss during re-renders since listeners never detach.
4. **Hydration Controller** — Orchestrates the hydration process: state extraction → component instantiation → reconciliation → event registration. Uses other modules, doesn't implement their logic.
5. **CLI Generator System** — Template engine (Handlebars) with action-based generators (Plop.js pattern). Templates as external files, not inline strings.

**Key architectural patterns:**
- Key-based identity: Every list item must have stable `key` prop for reconciliation
- Progressive hydration: Hydrate components on-demand (viewport intersection, interaction) rather than all-at-once
- Deterministic rendering: Enforce identical output on server and client (no `Date.now()`, `Math.random()` in render path)
- Event delegation: One listener per event type at document level, not per-element attachment

**Data flow (one direction only):** State change → Reconcile vDOM → Key-based diff → Minimal DOM patches → Re-register handlers if needed. Never derive state from DOM during updates.

### Critical Pitfalls

Research into SSR framework failure modes reveals patterns that have broken production applications across React, Vue, and Next.js deployments. Coherent.js codebase analysis shows it's vulnerable to all five critical pitfalls.

1. **Hydration mismatch from non-deterministic rendering** — Server and client produce different HTML due to `Date.now()`, `Math.random()`, browser-only APIs, or time zone differences. Results in broken event handlers (buttons don't work), UI flickering, and intermittent bugs. **Prevention:** Enforce deterministic initial render, add development-mode mismatch detection with detailed error reporting. **Current status:** No detection mechanism exists.

2. **Index-based DOM diffing without keys** — Position-based child matching (`hydration.js` lines 384-404) causes state to jump between list items during reorder. Leads to wrong checkbox states, unnecessary re-renders, form input loss. **Prevention:** Implement key-based reconciliation algorithm (LCS pattern from React). **Current status:** Uses index-based diffing, will cause bugs in any dynamic list.

3. **Event handler loss during re-render** — `updateTodoList()` uses `innerHTML` replacement (lines 847-867), destroying all event listeners. After state change, buttons become unclickable. **Prevention:** Event delegation at document level (handlers never detach) or tracked re-attachment. **Current status:** Multiple conflicting event strategies, handler loss confirmed in code.

4. **HMR state loss and handler disconnection** — `hmr.js` lines 76-102 re-imports module without state preservation or cleanup. Causes form inputs to reset on every save, duplicate event listeners, memory leaks. **Prevention:** Implement `dispose` handlers for cleanup, state transfer protocol across updates. **Current status:** No state preservation, will frustrate developers.

5. **CLI template drift** — Generated project files use outdated framework patterns, mismatched versions, deprecated APIs. New users report "fresh project doesn't work." **Prevention:** CI testing of generated projects, dynamic version syncing. **Current status:** Templates not tested in CI, likely to drift.

**Coherent.js-specific vulnerabilities identified:**
- `hydration.js` line 384-404: Index-based child patching
- `hydration.js` line 847-867: `innerHTML` replacement destroys listeners
- `hmr.js` line 76-102: No state preservation/dispose handlers
- `component-system.js` line 2363: Shared state Map never cleaned up (memory leak)
- Application-specific logic (todo list, counter) hardcoded in framework files

## Implications for Roadmap

Based on research findings, stabilization must follow strict dependency ordering. Each phase builds on the previous, and skipping steps will result in wasted effort. The architecture cannot support streaming SSR while index-based diffing breaks basic lists. HMR is meaningless if the CLI generates broken projects.

### Phase 1: Foundation (Core Rendering & CLI)
**Rationale:** Broken CLI means developers can't even start using the framework. Index-based diffing breaks basic functionality. These must be fixed before anything else matters.

**Delivers:**
- Working CLI scaffolding that produces runnable projects
- Key-based reconciliation algorithm implementation
- Hydration mismatch detection (development mode)
- Environment detection utilities (isServer/isClient)
- Defensive rendering with null checks, depth limits, error boundaries

**Addresses features:**
- CLI scaffolding (table stakes, BLOCKING)
- Basic correctness for list rendering

**Avoids pitfalls:**
- Pitfall 1: Non-deterministic rendering (enforce deterministic patterns)
- Pitfall 2: Index-based diffing (implement key support)
- Pitfall 5: Rendering crashes (defensive checks)
- Pitfall 6: CLI template drift (start with working templates)

**Research needs:** None - these are well-documented patterns with clear implementations in React/Vue.

### Phase 2: Reliability (Hydration & State Management)
**Rationale:** With key-based diffing working, now fix event handlers and state lifecycle. Cannot optimize what doesn't work correctly.

**Delivers:**
- Event delegation system (single document-level listener)
- State container lifecycle management with cleanup
- Component state serialization (centralized `__COHERENT_STATE__` script)
- CSP-compliant event handling (no inline handlers)
- Comprehensive error messages with fix suggestions

**Addresses features:**
- Event handler persistence
- State management without leaks

**Avoids pitfalls:**
- Pitfall 3: Event handler loss (delegation prevents detachment)
- Pitfall 9: State container leaks (lifecycle-tied cleanup)
- Pitfall 10: Inline handler security (CSP-compliant approach)

**Research needs:** None - event delegation is standard pattern, well-documented.

### Phase 3: Developer Experience (HMR & TypeScript)
**Rationale:** With core rendering working, make development fast. HMR requires stable reconciliation (from Phase 1-2) to preserve state correctly.

**Delivers:**
- Functional HMR with state preservation
- Complete TypeScript definitions
- Basic Language Server integration
- Error overlay in development
- Template testing in CI

**Addresses features:**
- Functional HMR (table stakes, BLOCKING)
- Complete TypeScript support (table stakes)
- IDE support foundation

**Avoids pitfalls:**
- Pitfall 4: HMR state loss (dispose handlers, state transfer)
- Pitfall 6: CLI template drift (CI testing)
- Pitfall 13: TypeScript/runtime mismatch (test types)

**Research needs:** Minimal - Vite HMR API is well-documented, TypeScript LSP has clear patterns.

### Phase 4: Modular Architecture (Refactoring)
**Rationale:** With working features, address technical debt. Split monolithic files for maintainability and testing.

**Delivers:**
- Decomposed `hydration.js` into `state-serializer.js`, `reconciler/`, `events/`
- Decomposed `component-system.js` into focused modules
- CLI template engine with external Handlebars files
- Separated SSR/client rendering concerns

**Addresses features:**
- Code maintainability
- Easier testing and debugging

**Avoids pitfalls:**
- Pitfall 7: Missing SSR/client guards (clear environment detection)
- Better foundation for streaming SSR (next phase)

**Research needs:** None - architecture patterns from React Fiber and SolidJS are proven.

### Phase 5: Performance (Streaming & Progressive Hydration)
**Rationale:** Only after core is stable can performance optimizations be safely added. Requires all previous work to function correctly.

**Delivers:**
- Integrated streaming SSR with hydration boundaries
- Progressive/selective hydration support
- Streaming error boundary patterns
- Performance monitoring integration

**Addresses features:**
- Streaming SSR (differentiator)
- Progressive hydration (differentiator)

**Avoids pitfalls:**
- Pitfall 8: Streaming error handling (buffer critical path)

**Research needs:** MEDIUM - Streaming with hydration boundaries requires design decisions. Recommend `/gsd:research-phase` for streaming patterns.

### Phase 6: Advanced DX (DevTools & IDE)
**Rationale:** With stable, fast framework, add advanced developer tools. These differentiate from competitors.

**Delivers:**
- In-browser DevTools panel
- Advanced Language Server features
- Component inspector integration
- Performance profiling UI

**Addresses features:**
- In-browser DevTools (differentiator)
- Advanced IDE support

**Research needs:** LOW - Nuxt DevTools provides clear reference implementation.

### Phase Ordering Rationale

**Why this strict order:**
1. **Foundation must be correct** — Key-based diffing is prerequisite for everything else. Cannot build reliable hydration on position-based diffing. Cannot optimize broken rendering.
2. **Developer experience requires stability** — HMR state preservation needs reconciliation to work correctly. TypeScript types must match working runtime behavior.
3. **Performance requires correctness** — Streaming SSR assumes hydration works. Progressive hydration needs stable event system.
4. **Refactoring enables advanced features** — Modular architecture makes streaming boundaries easier to implement. Clean separation enables DevTools integration.

**Dependency graph:**
```
Phase 1 (Keys + CLI) → Phase 2 (Events + State) → Phase 3 (HMR + TS)
                                                        ↓
Phase 4 (Modular) ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← Phase 5 (Streaming)
        ↓
Phase 6 (DevTools)
```

**How this avoids pitfalls:**
- Addressing pitfalls 1-2-5 first unblocks basic functionality
- Pitfalls 3-9-10 fixed before performance work prevents optimization of broken patterns
- Pitfall 4 (HMR) can only be fixed after Phase 1-2 work
- Pitfall 6 (template drift) caught early with CI testing
- Pitfall 8 (streaming errors) addressed after streaming actually works

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 5 (Streaming SSR):** Complex integration of streaming with hydration boundaries. Multiple approaches possible (React Suspense, Nuxt lazy hydration, Qwik resumability). Recommend `/gsd:research-phase` to evaluate trade-offs for Coherent.js object-based architecture.

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Key-based reconciliation has canonical implementation in React reconciler. Event delegation is well-established pattern.
- **Phase 2:** State lifecycle management follows standard React patterns. CSP-compliant events are documented.
- **Phase 3:** Vite HMR API is clear and well-documented. TypeScript LSP has reference implementations.
- **Phase 4:** Modular architecture patterns are extensively documented in React Fiber, Clean Architecture resources.
- **Phase 6:** Nuxt DevTools provides complete reference for browser-based framework DevTools.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Key-based reconciliation and event delegation are universal patterns with extensive documentation and proven implementations. No novel technologies required. |
| Features | HIGH | Table stakes features validated against 5+ mature frameworks (Next.js, Nuxt, SvelteKit, Remix, Astro). Clear consensus on CLI, HMR, TypeScript as baseline expectations. |
| Architecture | HIGH | Module decomposition patterns match React Fiber and SolidJS implementations. Event delegation and state serialization are standard approaches. |
| Pitfalls | HIGH | Critical pitfalls verified in official Next.js/React documentation as real production issues. Coherent.js vulnerabilities confirmed by code analysis. |

**Overall confidence:** HIGH

Research drew from official framework documentation (React, Vue, Next.js, Nuxt), verified implementation patterns in open-source framework code, and analyzed actual Coherent.js codebase to identify specific line numbers of vulnerabilities. All major findings corroborated by multiple independent sources.

### Gaps to Address

**Architecture decisions requiring validation during Phase 5 planning:**
- Streaming SSR boundary syntax: Should Coherent.js use React-style Suspense boundaries, Nuxt-style lazy hydration markers, or custom object-based boundary syntax that fits its component model? Recommend research during Phase 5 planning to evaluate ergonomics.
- Progressive hydration priority strategy: By viewport intersection (standard), by interaction (Qwik), by explicit priority attribute, or combination? Needs user testing to determine best developer experience.

**Testing strategy gaps:**
- No existing tests for CLI-generated projects. Need to establish CI pipeline for template testing before Phase 1 completes.
- Hydration mismatch test patterns need development. React has snapshot testing approach, but object-based vDOM may need custom matchers.

**Documentation gaps (not blocking development):**
- Key-based reconciliation requires explaining to users when/how to add keys. Needs migration guide from current index-based approach.
- Event delegation changes event handler API. Need clear upgrade path from current multiple-strategy approach.

**Gaps do not affect Phase 1-4 confidence:** These are tactical decisions within proven patterns, not fundamental unknowns. Research during Phase 5 planning will resolve streaming boundary questions.

## Sources

### Primary (HIGH confidence)

**React Architecture & Patterns:**
- [React Reconciliation Algorithm](https://legacy.reactjs.org/docs/reconciliation.html) — Key-based diffing canonical implementation
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture) — Modular reconciler architecture
- [Understanding Reconciliation in React 19](https://medium.com/@souviksen093/understanding-reconciliation-in-react-19-19-2-a-deep-dive-into-modern-ui-rendering-ed433ce1e375) — Modern reconciliation patterns

**Vue & Nuxt Official Documentation:**
- [Vue.js SSR Guide](https://vuejs.org/guide/scaling-up/ssr.html) — SSR best practices
- [Nuxt 4.0 Announcement](https://nuxt.com/blog/v4) — Modern framework features
- [Nuxt DevTools Features](https://devtools.nuxt.com/guide/features) — In-browser DevTools reference

**Next.js Official Documentation:**
- [Next.js Hydration Error Documentation](https://nextjs.org/docs/messages/react-hydration-error) — Mismatch detection and resolution
- [Next.js CLI Documentation](https://nextjs.org/docs/app/api-reference/cli/create-next-app) — Scaffolding patterns
- [Next.js Development Environment Guide](https://nextjs.org/docs/app/guides/local-development) — HMR and dev server

**SolidJS Patterns:**
- [SolidJS Fine-Grained Reactivity](https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity) — Reactivity without virtual DOM
- [The Road to SolidJS 2.0](https://github.com/solidjs/solid/discussions/2425) — Framework evolution insights

**SvelteKit & Other Frameworks:**
- [SvelteKit Creating a Project](https://svelte.dev/docs/kit/creating-a-project) — CLI scaffolding approach
- [Astro TypeScript Guide](https://docs.astro.build/en/guides/typescript/) — Zero-config TypeScript
- [Remix TypeScript Guide](https://v2.remix.run/docs/guides/typescript/) — TypeScript in SSR context

### Secondary (MEDIUM confidence)

**Hydration Research:**
- [Josh Comeau: The Perils of Rehydration](https://www.joshwcomeau.com/react/the-perils-of-rehydration/) — Common hydration pitfalls explained
- [Patterns.dev: Streaming SSR](https://www.patterns.dev/react/streaming-ssr/) — Streaming patterns
- [DEV.to: Hydration Explained](https://dev.to/vishwark/hydration-selective-hydration-progressive-hydration-explained-react-vs-vuenuxt-vs-others-47fc) — Framework comparison
- [Conquering JavaScript Hydration](https://dev.to/this-is-learning/conquering-javascript-hydration-a9f) — Best practices

**Developer Experience:**
- [Developer Experience 2025](https://jellyfish.co/library/developer-experience/) — DX expectations
- [Best JavaScript Debugging Tools 2025](https://devtechinsights.com/best-javascript-debugging-tools-2025/) — Modern tooling landscape

**HMR & Tooling:**
- [Vite HMR API](https://vite.dev/guide/api-hmr) — HMR implementation guide
- [Webpack HMR Guide](https://webpack.js.org/guides/hot-module-replacement/) — HMR patterns
- [SurviveJS HMR Appendix](https://survivejs.com/books/webpack/appendices/hmr/) — HMR deep dive

**CLI & Code Generation:**
- [Plop.js Documentation](https://plopjs.com/) — Template-based generation
- [Hygen GitHub](https://github.com/jondot/hygen) — Alternative generator approach
- [Next.js Codemods](https://nextjs.org/docs/app/guides/upgrading/codemods) — Migration tooling

**Framework Comparisons:**
- [Nuxt vs Next.js 2025](https://strapi.io/blog/nuxt-vs-nextjs-framework-comparison-guide) — Framework feature comparison
- [Frontend Framework Showdown 2025](https://leapcell.io/blog/the-2025-frontend-framework-showdown-next-js-nuxt-js-sveltekit-and-astro) — Market landscape
- [SvelteKit vs Next.js 2025](https://prismic.io/blog/sveltekit-vs-nextjs) — Architecture differences

**Architecture Patterns:**
- [Addy Osmani: Large-Scale JavaScript Architecture](https://addyosmani.com/largescalejavascript/) — Modular architecture patterns
- [GeeksforGeeks React Architecture](https://www.geeksforgeeks.org/reactjs/react-architecture-pattern-and-best-practices/) — Component architecture

### Tertiary (LOW confidence - informational)

**Emerging Patterns:**
- [Builder.io: Resumability vs Hydration](https://www.builder.io/blog/resumability-vs-hydration) — Qwik alternative approach
- [Qwik Resumable Documentation](https://qwik.dev/docs/concepts/resumable/) — No-hydration architecture
- [FreeCodeCamp: Next.js 15 Streaming](https://www.freecodecamp.org/news/the-nextjs-15-streaming-handbook/) — Advanced streaming patterns

**Additional Context:**
- [DhiWise React Reconciliation Guide](https://www.dhiwise.com/post/a-deep-dive-into-react-reconciliation-algorithm) — Reconciliation deep dive
- [Sentry: Fixing Hydration Errors](https://sentry.io/answers/hydration-error-nextjs/) — Production debugging
- [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server) — LSP reference

---

**Research completed:** 2026-01-21
**Ready for roadmap:** YES

**Next step:** Orchestrator should proceed to requirements definition using this summary as foundation for phase planning. Phase 1 can begin immediately with high confidence. Phase 5 should trigger `/gsd:research-phase` during planning to evaluate streaming boundary options.
