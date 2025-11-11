# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Coherent.js is a high-performance server-side rendering framework built around pure JavaScript objects.
The project is structured as a pnpm monorepo with multiple packages providing different framework
integrations and utilities.

## Development Commands

### Building
- `pnpm build` - Build all packages
- `pnpm build:packages` - Build all packages with streaming output
- `pnpm build:types` - Build TypeScript definitions

### Testing
- `pnpm test` - Run all tests using Vitest
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:packages` - Run tests in all packages
- `pnpm test:ui` - Run tests with Vitest UI

### Linting and Formatting
- `pnpm lint` - Run ESLint with max 0 warnings
- `pnpm lint:fix` - Run ESLint with auto-fix
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm typecheck` - TypeScript type checking
- `pnpm typecheck:packages` - Type check all packages

### Development
- `pnpm dev` - Build and start website development server
- `pnpm website:dev` - Start website development server only

### Examples
- `pnpm example:basic` - Run basic usage example
- `pnpm example:components` - Run component system examples
- `pnpm example:performance` - Run performance testing examples
- `pnpm example:advanced` - Run advanced features demo
- `pnpm example:streaming` - Run streaming renderer demo
- `pnpm example:hydration` - Run client-side hydration demo

## Architecture

### Monorepo Structure
The project uses pnpm workspaces with packages in `/packages/`:

- **`@coherent.js/core`** - Core framework with component system, rendering engines, and state management
- **`@coherent.js/api`** - API framework with validation, routing, and OpenAPI generation  
- **`@coherent.js/database`** - Database layer with adapters for PostgreSQL, MySQL, SQLite, MongoDB
- **`@coherent.js/client`** - Client-side hydration and progressive enhancement utilities
- **`@coherent.js/express`** - Express.js integration adapter
- **`@coherent.js/fastify`** - Fastify integration adapter  
- **`@coherent.js/koa`** - Koa.js integration adapter
- **`@coherent.js/nextjs`** - Next.js integration adapter
- **`@coherent.js/testing`** - Testing utilities and matchers
- **`@coherent.js/devtools`** - Developer tools (inspector, profiler, logger)
- **`@coherent.js/cli`** - CLI tools for development and scaffolding
- **`@coherent.js/i18n`** - Internationalization support
- **`@coherent.js/forms`** - Form utilities and validation
- **`@coherent.js/seo`** - SEO optimization tools
- **`@coherent.js/performance`** - Performance optimization utilities

### Core Concepts

1. **Pure Object Components**: Components are defined as pure JavaScript objects representing HTML structures
2. **Server-Side Rendering**: Primary focus is on fast server-side rendering with optional client-side hydration
3. **Framework Agnostic**: Can integrate with Express, Fastify, Koa, Next.js, and other frameworks
4. **Performance-First**: Built-in performance monitoring, memoization, and streaming support

### Key Files and Directories

- `/packages/core/src/` - Core rendering engine and component system
- `/examples/` - Comprehensive examples demonstrating framework features
- `/scripts/` - Development and build scripts
- `/website/` - Documentation website
- `vitest.config.js` - Root Vitest configuration for testing
- `eslint.config.js` - ESLint configuration with specific rules for different file types

### Object Structure Pattern

Components use this object structure:
```javascript
{
  tagName: {
    attribute: 'value',
    className: 'css-class', 
    text: 'Escaped text content',
    html: '<raw>HTML content</raw>',
    children: [/* Array of child elements */]
  }
}
```

### Integration Patterns

Each framework integration package (`/packages/express/`, `/packages/fastify/`, etc.) provides:
- Setup functions to configure the framework
- Handler utilities to render Coherent.js components
- Middleware for automatic component rendering

### Testing Strategy

- Uses Vitest for all testing with coverage reporting
- Tests are located in `packages/*/test/` directories  
- Global test configuration allows 10s timeout for complex rendering tests
- Coverage excludes config files, build outputs, and test files themselves
- Tests run with process isolation (`pool: 'forks'`, `isolate: true`)

### Performance Focus

The framework includes built-in performance monitoring and optimization:
- Memoization utilities for expensive components
- Streaming rendering for large documents  
- Bundle size optimization and tree-shaking support
- Performance benchmarking examples in `/examples/performance-test.js`

## Development Guidelines

### Code Style
- Use ESM imports/exports exclusively
- Target Node.js 20+ features
- Prefer `const` over `let`
- Use strict equality (`===` and `!==`)
- Avoid `eval()` and `new Function()`

### Testing Practices
- Place tests in `packages/*/test/` directories
- Use package-scoped test runs for reliability:
  ```bash
  pnpm --filter @coherent.js/core run test -- test/example-render.test.js
  ```
- For browser-like tests, create shims:
  ```js
  global.window = { __coherentEventRegistry: {}, addEventListener: vi.fn() };
  global.document = { querySelector: vi.fn(), querySelectorAll: vi.fn(() => []) };
  ```

### Package Development
- Each package uses the shared build system in `scripts/shared-build.mjs`
- Follow the conditional exports pattern for development/production builds
- Respect the ESM-only policy in `src/` files
- Add TypeScript definitions where applicable

### Contributing
- Follow the guidelines in `CONTRIBUTING.md`
- Ensure all tests pass before submitting PRs
- Run `pnpm lint` and `pnpm format` on changes
- Update documentation when changing APIs
