# Architecture

**Analysis Date:** 2026-01-21

## Pattern Overview

**Overall:** Object-Based Rendering Framework with Multi-Layer Architecture

**Key Characteristics:**
- Pure JavaScript object components (no JSX or templates)
- Server-side rendering (SSR) primary, with optional client-side hydration
- Plugin-based extensibility with framework adapters
- Performance-first with streaming, caching, and memoization
- Monorepo structure with specialized packages for different concerns

## Layers

**Core Rendering Layer:**
- Purpose: Transform object-based components into HTML strings
- Location: `packages/core/src/rendering/`
- Contains: `html-renderer.js`, `base-renderer.js`, `css-manager.js`
- Depends on: Core utilities, performance monitoring
- Used by: All framework integrations and rendering consumers

**Component System Layer:**
- Purpose: Define and manage components, lifecycle, state, and composition
- Location: `packages/core/src/components/`
- Contains: `component-system.js`, `lifecycle.js`, `error-boundary.js`, `lazy-loading.js`, `enhanced-composition.js`
- Depends on: Core object utilities, performance caching
- Used by: Applications building with Coherent.js components

**Framework Integration Layer:**
- Purpose: Connect Coherent.js to specific web frameworks
- Location: `packages/express/`, `packages/fastify/`, `packages/koa/`, `packages/nextjs/`, `packages/adapters/`
- Contains: Framework-specific middleware and handlers
- Depends on: Core rendering, peer framework dependencies
- Used by: Applications using specific frameworks (Express, Fastify, Next.js, etc.)

**State Management Layer:**
- Purpose: Handle reactive state updates and persistence
- Location: `packages/state/src/`
- Contains: `state-manager.js`, `reactive-state.js`, `state-persistence.js`, `state-validation.js`
- Depends on: Core utilities
- Used by: Components requiring state management

**Data Access Layer:**
- Purpose: Provide database abstraction and query building
- Location: `packages/database/src/`
- Contains: `query-builder.js`, `model.js`, `connection-manager.js`, `adapters/`, `middleware.js`
- Depends on: Peer database packages (PostgreSQL, MySQL, SQLite, MongoDB)
- Used by: Applications requiring database operations

**API/Routing Layer:**
- Purpose: Handle HTTP routing, validation, authentication, serialization
- Location: `packages/api/src/`
- Contains: `router.js`, `validation.js`, `security.js`, `errors.js`, `serialization.js`
- Depends on: Core utilities
- Used by: Applications building API endpoints

**Client-Side Layer:**
- Purpose: Handle hydration, routing, and hot module reloading on browser
- Location: `packages/client/src/`
- Contains: `hydration.js`, `router.js`, `hmr.js`
- Depends on: Core component system
- Used by: SSR applications enabling client-side interactivity

**Utilities & Cross-Cutting:**
- Location: `packages/core/src/utils/`, `packages/core/src/performance/`
- Contains: Error handling, validation, dependency injection, caching, performance monitoring
- Used by: All layers

## Data Flow

**Server-Side Rendering (SSR) Flow:**

1. Application defines component as pure JavaScript object
2. Component is passed to `render()` function in `packages/core/src/index.js`
3. Renderer checks cache (`packages/core/src/performance/cache-manager.js`)
4. If cached, returns cached HTML; otherwise proceeds to rendering
5. HTMLRenderer (`packages/core/src/rendering/html-renderer.js`) recursively traverses component tree
6. Each element's attributes are formatted via `packages/core/src/core/html-utils.js`
7. HTML is escaped for safety via `escapeHtml()` utility
8. Framework integration layer (e.g., `packages/express/src/coherent-express.js`) wraps result in template
9. Final HTML sent to client with `text/html` content-type

**Component Lifecycle Flow:**

1. Component function called with props
2. Props trigger computation in component function
3. Returns object representing element tree
4. Lifecycle hooks in `packages/core/src/components/lifecycle.js` are available for extension
5. State changes trigger re-computation of component
6. Memoization via `packages/core/src/performance/component-cache.js` prevents unnecessary re-renders

**Client-Side Hydration Flow:**

1. SSR-rendered HTML sent from server
2. Client loads JavaScript with hydration code from `packages/client/src/hydration.js`
3. `hydrate()` function attaches event listeners to pre-rendered DOM
4. Client-side router in `packages/client/src/router.js` takes over navigation
5. HMR system in `packages/client/src/hmr.js` enables hot updates during development

**State Management Flow:**

1. Component uses `withState()` HOC from `packages/core/src/components/component-system.js`
2. State manager in `packages/state/src/state-manager.js` created with initial state
3. Component receives state getter/setter functions
4. Setter triggers listeners subscribed via `packages/state/src/reactive-state.js`
5. State persisted to storage via `packages/state/src/state-persistence.js` if enabled
6. Component re-renders with new state

**Database Access Flow:**

1. Application uses query builder from `packages/database/src/query-builder.js`
2. Query builder supports multiple database adapters (`packages/database/src/adapters/`)
3. Connection manager in `packages/database/src/connection-manager.js` handles connections
4. Model layer in `packages/database/src/model.js` provides ORM-like interface
5. Results serialized for safe transmission via `packages/api/src/serialization.js`

**State Management:**
- Server-side: Component state via `ComponentState` class with listeners
- Client-side: Reactive state via `packages/state/src/reactive-state.js` with validation
- Persistence: LocalStorage/custom backends via `packages/state/src/state-persistence.js`

## Key Abstractions

**Component Object:**
- Purpose: Represents a single HTML element and its tree
- Examples: `packages/examples/basic-usage.js` (Greeting, UserCard, UserList)
- Pattern: `{ tagName: { attributes, children } }` where tagName is HTML tag name

**Component Factory (Function):**
- Purpose: Returns a component object based on props
- Examples: `export const Greeting = ({ name = 'World', mood = 'happy' }) => ({ div: {...} })`
- Pattern: Pure function accepting props object, returning component object

**Renderer:**
- Purpose: Converts component tree to HTML string
- Implementations: `HTMLRenderer` in `packages/core/src/rendering/html-renderer.js`
- Pattern: Recursive traversal with caching and performance monitoring

**Middleware/Handler:**
- Purpose: Framework-specific adapters that integrate Coherent.js with existing frameworks
- Examples: `coherentMiddleware()`, `createCoherentHandler()` in `packages/express/src/coherent-express.js`
- Pattern: Express/Fastify/Koa-compatible middleware taking req/res/next

**HOC (Higher-Order Component):**
- Purpose: Wraps components to add functionality (state, lifecycle, error handling)
- Examples: `withState()`, `withErrorBoundary()`, `withLifecycle()` in `packages/core/src/components/`
- Pattern: Function taking component, returning enhanced component

**Event Bus:**
- Purpose: Global pub/sub for component communication
- Location: `packages/core/src/events/event-bus.js`
- Pattern: `emit()`, `on()`, `once()`, `off()` functions for event management

## Entry Points

**Server Rendering:**
- Location: `packages/core/src/index.js`
- Triggers: Application calls `render(component, options)` or framework integration
- Responsibilities: Coordinate rendering pipeline, apply options, return HTML

**Express/Fastify/Koa Integration:**
- Location: `packages/express/src/index.js`, `packages/fastify/src/index.js`, `packages/koa/src/index.js`
- Triggers: Framework middleware runs on HTTP request
- Responsibilities: Parse request, execute handler, render component, send response

**CLI:**
- Location: `packages/cli/src/index.js`
- Triggers: User runs `coherent` command in terminal
- Responsibilities: Scaffold projects, analyze code, generate documentation

**Build System:**
- Location: `packages/build-tools/src/index.js`
- Triggers: Build process in `scripts/shared-build.mjs`
- Responsibilities: Bundle code, optimize for distribution, generate types

## Error Handling

**Strategy:** Layered error handling with fallback mechanisms

**Patterns:**
- Global error handler: `packages/core/src/utils/error-handler.js` catches unhandled errors
- Error boundary: `packages/core/src/components/error-boundary.js` isolates component errors
- Async error boundary: `createAsyncErrorBoundary()` for async operations
- API errors: Specialized error types in `packages/api/src/errors.js` (ValidationError, AuthenticationError, etc.)
- Validation: Input validation via `packages/core/src/utils/validation.js` before rendering
- Safe HTML: `escapeHtml()` prevents XSS, `dangerouslySetInnerContent()` marked explicitly

## Cross-Cutting Concerns

**Logging:** Console-based in development, customizable via `packages/devtools/` (inspector, profiler)

**Validation:** Layers at multiple points:
- Component input validation in `packages/core/src/utils/validation.js`
- API validation in `packages/api/src/validation.js`
- State validation in `packages/state/src/state-validation.js`
- Form validation in `packages/forms/src/validation.js`

**Authentication:** API-level authentication in `packages/api/src/security.js` with token generation and verification

**Performance:**
- Caching: `packages/core/src/performance/cache-manager.js` for rendered output
- Memoization: `packages/core/src/performance/component-cache.js` for expensive computations
- Monitoring: `packages/core/src/performance/monitor.js` tracks render times
- Optimization: `packages/core/src/performance/bundle-optimizer.js` for bundle size

**Internationalization:** `packages/i18n/src/` provides locale management, translation, and formatting

**SEO:** `packages/seo/src/` handles meta tags, structured data, sitemaps

**Forms:** `packages/forms/src/` provides form building, validation, and hydration

---

*Architecture analysis: 2026-01-21*
