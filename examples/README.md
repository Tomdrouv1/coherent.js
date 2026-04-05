# Coherent.js Examples

All examples can be run from the **repository root** after installing dependencies:

```bash
pnpm install
pnpm build
```

## Quick Start

| Example | Command | Description |
|---------|---------|-------------|
| Basic Usage | `pnpm example:basic` | Simple components, conditional rendering, composition |
| Components | `pnpm example:components` | Higher-order components, mixins, hydration patterns |
| Streaming | `pnpm example:streaming` | Streaming SSR for large documents |
| Performance | `pnpm example:performance` | Benchmarks, caching, recursive components |
| Hydration | `pnpm example:hydration` | Server-to-client state transfer |
| Advanced | `pnpm example:advanced` | Master showcase of all features |

## All Examples

### Core

- **basic-usage.js** — Greeting components, user cards, page composition
- **component-composition.js** — HOCs, `withState`, `makeHydratable`
- **master-showcase.js** — Comprehensive demo (SSR + hydration + esbuild)
- **streaming.js** — Streaming rendering for large datasets

### State & Events

- **state-management-demo.js** — Reactive observables, computed properties, persistence
- **event-bus-demo.js** — Declarative event handling, action dispatching
- **hydration-demo.js** — Client-side hydration with interactive components

### Forms & i18n

- **forms-complete-example.js** — Multi-step forms, sync/async validation
- **i18n-complete-example.js** — Multi-language support, RTL, pluralization

### Framework Integration

- **express-integration.js** — Express middleware and routing (requires `express`)
- **nextjs-integration.js** — Next.js API routes and SSR (requires `next`)

### Developer Tools

- **devtools-demo.js** — Inspector, profiler, logger
- **plugin-system-demo.js** — Plugin architecture, hooks, custom extensions
- **error-boundary-demo.js** — Error handling, fallback UI, recovery
- **runtime-features-demo.js** — Edge runtime and environment features
- **performance-test.js** — Performance monitoring and cache benchmarks

### Testing

- **testing-demo.test.js** — Component testing with Vitest (`pnpm test -- examples/testing-demo.test.js`)

## Project Examples

| Project | Description | Run |
|---------|-------------|-----|
| **starter-app/** | Minimal SSR app with counter hydration | `cd examples/starter-app && node server.js` |
| **ecommerce-starter/** | Product catalog with cart and SEO | `cd examples/ecommerce-starter && node src/server.js` |
| **ecommerce-fullstack/** | Production architecture with state and API | See its README |
| **css-file-usage/** | External CSS integration patterns | `node examples/css-file-usage/basic-example.js` |
| **vite-integration/** | Vite build tool configuration | See vite.config.js |

## Running Individual Examples

```bash
# From repository root:
node examples/basic-usage.js
node examples/streaming.js
node examples/error-boundary-demo.js
```

Examples that start a server will print the URL to open in your browser.
