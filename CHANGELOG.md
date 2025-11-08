# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version Timeline

```
📅 2025-11-03  →  v1.0.0-beta.1  (CURRENT)
                   ├─ Fresh start with clean npm registry
                   ├─ All 20 packages synchronized
                   └─ Beta release for community feedback

📅 Future      →  v1.0.0         (PLANNED)
                   └─ First stable release
```

## [Unreleased]

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
  - [Migration Guide](/docs/PACKAGE_REORGANIZATION_MIGRATION.md) - Upgrade guide for v1.0.0-beta.2
  - Updated DOCS_INDEX.md with new documentation

- **Examples** - New demonstration files
  - `state-management-demo.js` - Comprehensive @coherent.js/state examples
  - `client-router-demo.js` - Client-side routing with all features

### Planned for v1.0.0 Stable
- Production-ready stability improvements
- Comprehensive test coverage (>95%)
- Performance benchmarks against other frameworks
- Migration tools from React/Vue

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
