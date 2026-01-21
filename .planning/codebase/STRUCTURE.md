# Codebase Structure

**Analysis Date:** 2026-01-21

## Directory Layout

```
coherent.js/
├── packages/                      # pnpm monorepo workspaces
│   ├── core/                      # Core rendering engine and component system
│   ├── client/                    # Client-side hydration and routing
│   ├── state/                     # State management and reactive updates
│   ├── api/                       # API routing, validation, security
│   ├── database/                  # Database adapters and query builder
│   ├── express/                   # Express.js integration
│   ├── fastify/                   # Fastify integration
│   ├── koa/                       # Koa integration
│   ├── nextjs/                    # Next.js integration
│   ├── adapters/                  # Astro, SvelteKit, Remix adapters
│   ├── forms/                     # Form builder and validation
│   ├── i18n/                      # Internationalization
│   ├── seo/                       # SEO utilities
│   ├── testing/                   # Testing utilities and matchers
│   ├── devtools/                  # Developer tools
│   ├── cli/                       # Command-line tools
│   ├── build-tools/               # Build system and loaders
│   ├── runtime/                   # Runtime utilities
│   ├── performance/               # Performance utilities
│   ├── profiler/                  # Performance profiling
│   ├── web-components/            # Web Components support
│   └── language-service/          # Language server support
├── examples/                      # Comprehensive usage examples
├── docs/                          # Documentation
├── website/                       # Documentation website
├── scripts/                       # Build and development scripts
├── benchmarks/                    # Performance benchmarks
├── .github/                       # GitHub CI/CD workflows
├── CLAUDE.md                      # Development guidelines for Claude
├── package.json                   # Monorepo configuration
├── tsconfig.json                  # TypeScript configuration
├── eslint.config.js               # ESLint configuration
└── vitest.config.js               # Vitest test configuration
```

## Directory Purposes

**packages/core:**
- Purpose: Core framework with component system, rendering engines, lifecycle, state, and events
- Contains: Component definitions, rendering logic, performance optimization, event bus
- Key files: `src/index.js`, `src/rendering/`, `src/components/`, `src/performance/`

**packages/client:**
- Purpose: Client-side functionality for hydration and routing
- Contains: Browser-side hydration logic, client-side routing, HMR support
- Key files: `src/hydration.js`, `src/router.js`, `src/hmr.js`

**packages/state:**
- Purpose: Reactive state management with persistence and validation
- Contains: State manager, reactive patterns, persistence adapters
- Key files: `src/state-manager.js`, `src/reactive-state.js`, `src/state-persistence.js`

**packages/api:**
- Purpose: HTTP API framework with routing, validation, security, error handling
- Contains: Router, validation schemas, auth middleware, serialization, error types
- Key files: `src/router.js`, `src/validation.js`, `src/security.js`, `src/errors.js`

**packages/database:**
- Purpose: Database abstraction layer with adapters for multiple databases
- Contains: Query builder, connection management, models, migrations
- Key files: `src/query-builder.js`, `src/connection-manager.js`, `src/model.js`, `src/adapters/`

**packages/express, packages/fastify, packages/koa, packages/nextjs:**
- Purpose: Framework-specific integration adapters
- Contains: Middleware, route handlers, engine setup, dependency injection
- Key files: `src/coherent-{framework}.js`, `src/index.js`

**packages/adapters:**
- Purpose: Integration with additional frameworks (Astro, SvelteKit, Remix)
- Contains: Framework-specific adapters
- Key files: `src/astro.js`, `src/sveltekit.js`, `src/remix.js`

**packages/forms:**
- Purpose: Form building, validation, and client-side hydration
- Contains: Form builder, validators, hydration logic
- Key files: `src/form-builder.js`, `src/validation.js`, `src/form-hydration.js`

**packages/i18n:**
- Purpose: Internationalization support
- Contains: Locale management, translation, formatting
- Key files: `src/locale-manager.js`, `src/translator.js`, `src/formatters.js`

**packages/seo:**
- Purpose: SEO optimization utilities
- Contains: Meta tag generation, structured data, sitemaps
- Key files: `src/meta.js`, `src/structured-data.js`, `src/sitemap.js`

**packages/testing:**
- Purpose: Testing utilities and custom matchers
- Contains: Test renderer, test utilities, custom matchers
- Key files: `src/test-renderer.js`, `src/matchers.js`, `src/test-utils.js`

**packages/devtools:**
- Purpose: Developer tools for debugging and profiling
- Contains: Inspector, profiler, logger utilities
- Key files: Located in `src/`

**packages/cli:**
- Purpose: Command-line interface for scaffolding and analysis
- Contains: Commands (init, generate, analyze), validators, generators
- Key files: `src/commands/`, `src/generators/`, `src/analyzers/`

**examples:**
- Purpose: Comprehensive examples demonstrating framework features
- Contains: SSR examples, component composition, performance testing, integrations
- Key files: `basic-usage.js`, `component-composition.js`, `streaming.js`, `express-integration.js`

**scripts:**
- Purpose: Build and development automation
- Contains: Build system, website generation, testing utilities
- Key files: `shared-build.mjs`, `build-website.js`, `dev-website.js`

## Key File Locations

**Entry Points:**
- `packages/core/src/index.js`: Core API entry point (render, components, lifecycle, state)
- `packages/express/src/index.js`: Express integration entry point
- `packages/fastify/src/index.js`: Fastify integration entry point
- `packages/api/src/index.js`: API routing entry point
- `packages/cli/src/index.js`: CLI entry point

**Configuration:**
- `package.json`: Monorepo configuration with workspaces and scripts
- `tsconfig.json`: TypeScript compiler options
- `eslint.config.js`: ESLint rules for code style
- `vitest.config.js`: Vitest test runner configuration
- `CLAUDE.md`: Development guidelines for Claude-assisted development

**Core Logic:**
- `packages/core/src/rendering/html-renderer.js`: Main HTML rendering logic
- `packages/core/src/rendering/base-renderer.js`: Base renderer class with common functionality
- `packages/core/src/components/component-system.js`: Component definition and management
- `packages/core/src/components/lifecycle.js`: Component lifecycle hooks
- `packages/core/src/events/event-bus.js`: Global event system
- `packages/core/src/performance/cache-manager.js`: Render output caching

**Testing:**
- `packages/*/test/`: Test files for each package (Vitest format)
- `packages/testing/src/test-renderer.js`: Renderer for unit tests

**Utilities:**
- `packages/core/src/utils/`: Common utilities (validation, error handling, dependency utils)
- `packages/core/src/core/`: Core utilities (object factory, HTML utils, object utils)
- `packages/core/src/performance/`: Performance utilities (monitoring, caching, optimization)

## Naming Conventions

**Files:**
- `.js` files: JavaScript source code (ES modules)
- `.d.ts` files: TypeScript type definitions
- `.test.js` or `.spec.js`: Test files
- `.config.js`: Configuration files
- `index.js`: Package entry points and barrel exports
- `coherent-{framework}.js`: Framework integration implementations

**Directories:**
- `src/`: Source code
- `test/`: Test files
- `dist/`: Built/compiled output
- `types/`: TypeScript definitions
- Package directories follow pattern: `packages/{name}/`

**Functions and Variables:**
- camelCase: Functions, variables, methods
- PascalCase: Classes, components, React-like functions
- UPPER_SNAKE_CASE: Constants
- Prefix with underscore for private/internal: `_privateFn`, `_internalVar`

**Examples:**
- Function: `render()`, `createElement()`, `withState()`
- Class: `HTMLRenderer`, `ComponentState`, `EventBus`
- Constant: `DEFAULT_RENDERER_CONFIG`, `LIFECYCLE_PHASES`
- Private: `_isTrustedContent()`, `_isVoidElement()`

## Where to Add New Code

**New Feature:**
- Primary code: `packages/core/src/` for core features, or appropriate package
- Tests: `packages/{package}/test/{feature}.test.js`
- Examples: `examples/{feature-demo}.js` to demonstrate usage

**New Component/Module:**
- Implementation: Appropriate `packages/{package}/src/` directory
- Type definitions: `packages/{package}/types/` or inline `.d.ts` file
- Tests: Alongside implementation in `packages/{package}/test/`

**New Framework Integration:**
- Adapter file: `packages/adapters/src/{framework}.js` for new frameworks
- Or new package: `packages/{framework}/src/coherent-{framework}.js` for major integrations
- Tests: `packages/{framework}/test/`

**Utilities:**
- Shared helpers: `packages/core/src/utils/` if used across packages
- Package-specific: `packages/{package}/src/utils.js` if only used locally
- Performance utilities: `packages/performance/src/` or `packages/core/src/performance/`

**Database Adapters:**
- Location: `packages/database/src/adapters/{database-type}.js`
- Must export: Connection factory, query executor, schema mapper
- Examples: PostgreSQL in `adapters/postgres.js`, MySQL in `adapters/mysql.js`

**API Endpoints:**
- Setup: `packages/api/src/router.js` for route definition
- Handlers: As functions passed to router
- Middleware: `packages/api/src/middleware.js` or inline

## Special Directories

**node_modules:**
- Purpose: Dependencies installed via pnpm
- Generated: Yes (created by package manager)
- Committed: No (in .gitignore)

**dist/:**
- Purpose: Built/compiled output from esbuild
- Generated: Yes (created during `pnpm build`)
- Committed: No (in .gitignore for packages, committed for website)

**coverage/:**
- Purpose: Code coverage reports from Vitest
- Generated: Yes (created during `pnpm test:coverage`)
- Committed: No (in .gitignore)

**types/:**
- Purpose: TypeScript type definitions for distribution
- Generated: Yes (created during build via tsc)
- Committed: Yes (important for consumers)
- Location: `packages/{package}/types/index.d.ts`

**.planning/:**
- Purpose: Planning and analysis documents for Claude-assisted development
- Generated: During analysis phase
- Committed: Yes (consumed by future planning phases)

**docs/ and website/:**
- Purpose: Documentation and generated documentation site
- Generated: Yes for website (via `pnpm website:build`)
- Committed: Yes for docs source files

## File Tree Example (packages/core)

```
packages/core/
├── src/
│   ├── index.js                 # Main entry point with re-exports
│   ├── rendering/
│   │   ├── index.js             # Rendering exports barrel
│   │   ├── html-renderer.js     # HTML string renderer
│   │   ├── base-renderer.js     # Base class for all renderers
│   │   └── css-manager.js       # CSS handling and scoping
│   ├── components/
│   │   ├── component-system.js  # Component factory and registry
│   │   ├── lifecycle.js         # Lifecycle hooks system
│   │   ├── error-boundary.js    # Error boundary component
│   │   ├── lazy-loading.js      # Lazy component loading
│   │   └── enhanced-composition.js
│   ├── core/
│   │   ├── object-factory.js    # createElement, h, createTextNode
│   │   ├── object-utils.js      # Object validation and manipulation
│   │   └── html-utils.js        # HTML escaping, formatting, utilities
│   ├── performance/
│   │   ├── monitor.js           # Performance monitoring
│   │   ├── cache-manager.js     # Render caching
│   │   ├── component-cache.js   # Memoization
│   │   └── bundle-optimizer.js  # Bundle size optimization
│   ├── events/
│   │   ├── event-bus.js         # Global event system
│   │   ├── index.js             # Events exports
│   │   ├── dom-integration.js   # DOM event binding
│   │   └── component-integration.js
│   ├── utils/
│   │   ├── validation.js        # Input validation
│   │   ├── error-handler.js     # Error handling system
│   │   ├── render-utils.js      # Shared rendering utilities
│   │   └── dependency-utils.js  # Peer dependency checking
│   ├── shadow-dom.js            # Shadow DOM utilities
│   └── coherent.d.ts            # TypeScript definitions
├── test/
│   ├── rendering.test.js
│   ├── components.test.js
│   └── ...
├── types/
│   └── index.d.ts               # TypeScript definitions for distribution
├── dist/                        # Built output
├── package.json
├── build.mjs                    # Build script
└── tsconfig.json
```

---

*Structure analysis: 2026-01-21*
