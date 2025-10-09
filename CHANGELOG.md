# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-13

### 🎉 Major Release - Clean Version Reset

This is the official stable release of Coherent.js! We've reset the versioning to provide a clean, professional version history going forward.

### ✨ What's New in 1.0.0

- **Complete UI/Theme System**: Beautiful dark/light theme toggle with localStorage persistence
- **Enhanced Documentation Website**: Comprehensive documentation with improved navigation and search
- **TOC Navigation**: Smart table of contents with scroll-based highlighting and manual override
- **Framework Integrations**: Full support for Express, Fastify, Koa, and Next.js
- **Database Layer**: Complete database abstraction with multiple adapter support
- **CLI Tools**: Command-line interface for project scaffolding and development
- **Client-side Hydration**: Progressive enhancement with selective hydration
- **Performance Monitoring**: Built-in performance profiling and optimization tools
- **Security Features**: XSS protection, input validation, and safe rendering
- **Streaming Renderer**: High-performance streaming for large documents

### 🔄 Migration from Previous Versions

**Important**: This is a breaking change from previous versions (0.x.x and 1.x.x-beta series).

If you're upgrading from a previous version:
1. Update your package.json dependencies to `^1.0.0`
2. No API changes are required - this is purely a version reset
3. All existing code will continue to work without modifications

### 📦 Package Versions

All packages released as version 1.0.0:

- `@coherentjs/core`: 1.0.0 - Core runtime for Coherent.js (SSR framework)
- `@coherentjs/api`: 1.0.0 - API framework for Coherent.js (REST/RPC/GraphQL)
- `@coherentjs/client`: 1.0.0 - Client-side hydration/HMR utilities for Coherent.js
- `@coherentjs/express`: 1.0.0 - Express adapter for Coherent.js
- `@coherentjs/fastify`: 1.0.0 - Fastify adapter for Coherent.js
- `@coherentjs/koa`: 1.0.0 - Koa adapter for Coherent.js
- `@coherentjs/nextjs`: 1.0.0 - Next.js integration for Coherent.js
- `@coherentjs/database`: 1.0.0 - Database utilities and adapters for Coherent.js
- `@coherentjs/cli`: 1.0.0 - Command-line interface for Coherent.js projects

### 🛣️ Future Roadmap

Going forward, we'll follow strict semantic versioning:
- **1.0.x** - Patch releases (bug fixes)
- **1.x.0** - Minor releases (new features, backward compatible)
- **2.0.0** - Major releases (breaking changes)

---

## Legacy Versions (Pre-1.0.0)

*The following versions represent the development history leading to the stable 1.0.0 release. These versions are deprecated and should not be used in new projects.*

## [1.2.1] - 2025-01-13 [DEPRECATED]

### Added

- Comprehensive UI and theme improvements to documentation website
- Moon/sun icon theme toggle with localStorage persistence
- Enhanced light theme styling with improved visibility and colorful design
- Fixed TOC scroll-based highlighting with manual click override system
- Improved search functionality with better contrast in both themes

### Fixed

- Light theme visibility issues across all website pages
- Theme persistence across browser sessions
- TOC automatic highlighting conflicting with manual navigation
- Search input visibility in light theme
- Button hover states and color schemes in light theme
- H2 element visibility issues in documentation pages

### Changed

- Theme toggle now uses intuitive moon/sun icons instead of text
- Light theme now features colorful gradients and effects matching dark theme quality
- Enhanced button styling with gradients, shadows, and interactive hover effects
- Improved overall user experience with better contrast and visual appeal

### Package Versions

All packages updated to version 1.2.1:

- `@coherentjs/core`: 1.2.1 - Core runtime for Coherent.js (SSR framework)
- `@coherentjs/api`: 1.2.1 - API framework for Coherent.js (REST/RPC/GraphQL)
- `@coherentjs/client`: 1.2.1 - Client-side hydration/HMR utilities for Coherent.js
- `@coherentjs/express`: 1.2.1 - Express adapter for Coherent.js
- `@coherentjs/fastify`: 1.2.1 - Fastify adapter for Coherent.js
- `@coherentjs/koa`: 1.2.1 - Koa adapter for Coherent.js
- `@coherentjs/nextjs`: 1.2.1 - Next.js integration for Coherent.js
- `@coherentjs/database`: 1.2.1 - Database utilities and adapters for Coherent.js
- `@coherentjs/cli`: 1.2.1 - Command-line interface for Coherent.js projects

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v1.2.0...v1.2.1)

## [1.2.0] - 2025-01-13

### Added

- Enhanced playground functionality with CodeMirror integration
- Missing codemirror-editor.js script added to playground page

### Fixed

- CI workflow updated to use correct pnpm version 10.18.1
- Various build and deployment improvements

### Package Versions

All packages updated to version 1.2.0:

- `@coherentjs/core`: 1.2.0
- `@coherentjs/api`: 1.2.0
- `@coherentjs/client`: 1.2.0
- `@coherentjs/express`: 1.2.0
- `@coherentjs/fastify`: 1.2.0
- `@coherentjs/koa`: 1.2.0
- `@coherentjs/nextjs`: 1.2.0
- `@coherentjs/database`: 1.2.0
- `@coherentjs/cli`: 1.2.0

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v1.1.1...v1.2.0)

## [1.1.1] - 2025-01-13

### Fixed

- Bug fixes and stability improvements
- Performance optimizations

### Package Versions

All packages updated to version 1.1.1:

- `@coherentjs/core`: 1.1.1
- `@coherentjs/api`: 1.1.1
- `@coherentjs/client`: 1.1.1
- `@coherentjs/express`: 1.1.1
- `@coherentjs/fastify`: 1.1.1
- `@coherentjs/koa`: 1.1.1
- `@coherentjs/nextjs`: 1.1.1
- `@coherentjs/database`: 1.1.1
- `@coherentjs/cli`: 1.1.1

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v1.1.0...v1.1.1)

## [1.1.0] - 2025-01-13

### Added

- Major feature updates and framework enhancements
- New functionality and API improvements

### Package Versions

All packages updated to version 1.1.0:

- `@coherentjs/core`: 1.1.0
- `@coherentjs/api`: 1.1.0
- `@coherentjs/client`: 1.1.0
- `@coherentjs/express`: 1.1.0
- `@coherentjs/fastify`: 1.1.0
- `@coherentjs/koa`: 1.1.0
- `@coherentjs/nextjs`: 1.1.0
- `@coherentjs/database`: 1.1.0
- `@coherentjs/cli`: 1.1.0

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v1.0.1...v1.1.0)

## [1.0.1] - 2025-01-13

### Added

- Initial major release with stable API
- Core framework functionality and integrations

### Fixed

- Bug fixes and stability improvements for 1.0 release

### Package Versions

All packages updated to version 1.0.1:

- `@coherentjs/core`: 1.0.1
- `@coherentjs/api`: 1.0.1
- `@coherentjs/client`: 1.0.1
- `@coherentjs/express`: 1.0.1
- `@coherentjs/fastify`: 1.0.1
- `@coherentjs/koa`: 1.0.1
- `@coherentjs/nextjs`: 1.0.1
- `@coherentjs/database`: 1.0.1
- `@coherentjs/cli`: 1.0.1

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.2.5...v1.0.1)

## [0.2.5] - 2025-08-25

### Fixed

- PNPM version mismatch in release pipeline
- CI workflow improvements and lint warnings removed
- Release process now only triggers when NPM_TOKEN is set

### Package Versions

All packages updated to version 0.2.5:

- `@coherentjs/core`: 0.2.5
- `@coherentjs/api`: 0.2.5
- `@coherentjs/client`: 0.2.5
- `@coherentjs/express`: 0.2.5
- `@coherentjs/fastify`: 0.2.5
- `@coherentjs/koa`: 0.2.5
- `@coherentjs/nextjs`: 0.2.5
- `@coherentjs/database`: 0.2.5
- `@coherentjs/cli`: 0.2.5

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.2.4...v0.2.5)

## [0.2.4] - 2025-08-25

### Added

- Project website with GitHub Pages deployment
- Unified GitHub Actions workflow that runs CI, deploys Pages, and publishes to npm

### Fixed

- Website links

### Changed

- Consolidated CI workflows and removed redundant ones

### Deprecated

- None

### Removed

- None

### Security
- Automatic HTML escaping for XSS protection
- Safe attribute handling
- Void element validation

### Package Versions

All packages updated to version 0.2.4:

- `@coherentjs/core`: 0.2.4
- `@coherentjs/api`: 0.2.4
- `@coherentjs/client`: 0.2.4
- `@coherentjs/express`: 0.2.4
- `@coherentjs/fastify`: 0.2.4
- `@coherentjs/koa`: 0.2.4
- `@coherentjs/nextjs`: 0.2.4
- `@coherentjs/database`: 0.2.4
- `@coherentjs/cli`: 0.2.4

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.2.3...v0.2.4)

## [0.2.3] - 2025-08-25

### Added

- Husky pre-commit hooks and commitlint configuration

### Package Versions

All packages updated to version 0.2.3:

- `@coherentjs/core`: 0.2.3
- `@coherentjs/api`: 0.2.3
- `@coherentjs/client`: 0.2.3
- `@coherentjs/express`: 0.2.3
- `@coherentjs/fastify`: 0.2.3
- `@coherentjs/koa`: 0.2.3
- `@coherentjs/nextjs`: 0.2.3
- `@coherentjs/database`: 0.2.3
- `@coherentjs/cli`: 0.2.3

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.2.2...v0.2.3)

## [0.2.2] - 2025-08-25

### Fixed

- Hydration missing exports

### Package Versions

All packages updated to version 0.2.2:

- `@coherentjs/core`: 0.2.2
- `@coherentjs/api`: 0.2.2
- `@coherentjs/client`: 0.2.2
- `@coherentjs/express`: 0.2.2
- `@coherentjs/fastify`: 0.2.2
- `@coherentjs/koa`: 0.2.2
- `@coherentjs/nextjs`: 0.2.2
- `@coherentjs/database`: 0.2.2
- `@coherentjs/cli`: 0.2.2

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.2.1...v0.2.2)

## [0.2.1] - 2025-08-25

### Fixed

- PNPM version mismatch in release pipeline

### Package Versions

All packages updated to version 0.2.1:

- `@coherentjs/core`: 0.2.1
- `@coherentjs/api`: 0.2.1
- `@coherentjs/client`: 0.2.1
- `@coherentjs/express`: 0.2.1
- `@coherentjs/fastify`: 0.2.1
- `@coherentjs/koa`: 0.2.1
- `@coherentjs/nextjs`: 0.2.1
- `@coherentjs/database`: 0.2.1
- `@coherentjs/cli`: 0.2.1

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.2.0...v0.2.1)

## [0.2.0] - 2025-08-25

### Added

- Security, database, and routing features
- Developer experience improvements to HMR (auto-reload on reconnect, stable watcher/broadcast, dev:watch script)

### Changed

- Multi-tier caching with significant performance improvements
- CI pipeline hardening (switch to pnpm cache, ensure pnpm is installed, lockfile updates)
- Remove lint warnings and ensure releases only occur when NPM_TOKEN is set

### Package Versions

All packages updated to version 0.2.0:

- `@coherentjs/core`: 0.2.0
- `@coherentjs/api`: 0.2.0
- `@coherentjs/client`: 0.2.0
- `@coherentjs/express`: 0.2.0
- `@coherentjs/fastify`: 0.2.0
- `@coherentjs/koa`: 0.2.0
- `@coherentjs/nextjs`: 0.2.0
- `@coherentjs/database`: 0.2.0
- `@coherentjs/cli`: 0.2.0

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.1.3...v0.2.0)

## [0.1.3] - 2025-08-25

### Fixed

- Bug fixes and improvements
- Stability enhancements

### Package Versions

All packages updated to version 0.1.3:

- `@coherentjs/core`: 0.1.3
- `@coherentjs/api`: 0.1.3
- `@coherentjs/client`: 0.1.3
- `@coherentjs/express`: 0.1.3
- `@coherentjs/fastify`: 0.1.3
- `@coherentjs/koa`: 0.1.3
- `@coherentjs/nextjs`: 0.1.3
- `@coherentjs/database`: 0.1.3
- `@coherentjs/cli`: 0.1.3

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.1.0...v0.1.3)

## [0.1.0] - 2025-08-03

### Added

- Initial release of Coherent.js framework
- Core rendering functionality
- Basic performance monitoring
- Component system foundation
- Example applications
- Documentation and README

### Package Versions

All packages updated to version 0.1.0:

- `@coherentjs/core`: 0.1.0
- `@coherentjs/api`: 0.1.0
- `@coherentjs/client`: 0.1.0
- `@coherentjs/express`: 0.1.0
- `@coherentjs/fastify`: 0.1.0
- `@coherentjs/koa`: 0.1.0
- `@coherentjs/nextjs`: 0.1.0
- `@coherentjs/database`: 0.1.0
- `@coherentjs/cli`: 0.1.0
