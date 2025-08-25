# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.2.3...v0.2.4)

## [0.2.3] - 2025-08-25

### Added

- Husky pre-commit hooks and commitlint configuration

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.2.2...v0.2.3)

## [0.2.2] - 2025-08-25

### Fixed

- Hydration missing exports

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.2.1...v0.2.2)

## [0.2.1] - 2025-08-25

### Fixed

- PNPM version mismatch in release pipeline

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

#### Links

- [Compare changes](https://github.com/Tomdrouv1/coherent.js/compare/v0.1.3...v0.2.0)

## [0.1.0] - 2025-08-03

### Added

- Initial release of Coherent.js framework
- Core rendering functionality
- Basic performance monitoring
- Component system foundation
- Example applications
- Documentation and README
