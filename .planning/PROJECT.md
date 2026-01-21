# Coherent.js

## What This Is

A fullstack JavaScript framework built around pure object components for server-side rendering with optional client-side hydration. The framework provides a complete ecosystem for building web applications without JSX or templates — just plain JavaScript objects that map directly to HTML.

## Core Value

A developer can run `coherent create my-app`, get a working fullstack app with authentication and database, and start building in 5 minutes.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — these packages/features exist in the codebase. -->

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

### Active

<!-- Current scope. Building toward these. -->

- [ ] Stable rendering engine (fix crashes and edge case failures)
- [ ] Stable hydration (fix bugs, simplify frontend setup)
- [ ] Working CLI generators (scaffolded apps use current framework APIs)
- [ ] Hot Module Replacement (HMR) functional
- [ ] Complete TypeScript definitions across all packages
- [ ] IDE/language server support for autocompletion
- [ ] Integrated fullstack experience (auth + database + API + forms + i18n + hydration work together seamlessly)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Mobile/React Native support — web-first, defer to future
- GraphQL integration — REST/JSON APIs sufficient for v1
- Real-time/WebSocket features — added complexity, not core to initial value

## Context

This is a brownfield project with an existing monorepo of 17 packages. The framework architecture is sound (pure object components, SSR-first with hydration), but stability issues and incomplete tooling prevent production use.

Key technical context from codebase analysis:
- Large files need refactoring (hydration.js: 1791 lines, component-system.js: 2596 lines)
- DOM diffing uses index-based algorithm (no key-based reconciliation)
- Event registry exposed globally and could be hardened
- Test coverage exists but has gaps in edge cases

The CLI scaffolding generates files but they reference outdated APIs or produce disconnected code that doesn't work together.

## Constraints

- **Priority**: Stable core first (rendering + hydration), then developer experience (CLI, TypeScript, IDE)
- **Runtime**: Node.js 20+ required (already enforced in package.json)
- **Monorepo**: Must work within existing pnpm workspace structure
- **Backward compatibility**: Existing API surface should be preserved where possible

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pure objects over JSX | Zero build step for components, framework-agnostic, easier SSR | ✓ Good |
| SSR-first with opt-in hydration | Better performance, progressive enhancement | ✓ Good |
| Monorepo with focused packages | Tree-shaking, pick what you need | ✓ Good |
| Stable core before DX polish | Foundation must work before optimizing onboarding | — Pending |

---
*Last updated: 2026-01-21 after initialization*
