# Development Guide

This guide explains how to set up and contribute to the Coherent.js monorepo.

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0 (recommended package manager)
- Git

## Project Structure

```
coherent.js/
├── packages/                            # Individual packages
│   ├── core/                           # @coherent.js/core - Core rendering engine
│   ├── client/                         # @coherent.js/client - Client-side hydration
│   ├── api/                            # @coherent.js/api - API framework
│   │
│   ├── express/                        # @coherent.js/express - Express.js integration
│   ├── fastify/                        # @coherent.js/fastify - Fastify integration
│   ├── koa/                            # @coherent.js/koa - Koa.js integration
│   ├── nextjs/                         # @coherent.js/nextjs - Next.js integration
│   │
│   ├── database/                       # @coherent.js/database - Database adapters
│   ├── forms/                          # @coherent.js/forms - Form utilities
│   ├── i18n/                           # @coherent.js/i18n - Internationalization
│   ├── seo/                            # @coherent.js/seo - SEO tools
│   ├── testing/                        # @coherent.js/testing - Testing utilities
│   ├── devtools/                       # @coherent.js/devtools - Developer tools
│   ├── performance/                    # @coherent.js/performance - Performance utilities
│   ├── performance-profiler/           # @coherent.js/performance-profiler - Profiling
│   │
│   ├── cli/                            # @coherent.js/cli - CLI tools
│   ├── build-tools/                    # @coherent.js/build-tools - Build utilities
│   ├── runtime/                        # @coherent.js/runtime - Runtime enhancements
│   ├── adapters/                       # @coherent.js/adapters - Framework adapters
│   └── web-components/                 # @coherent.js/web-components - Web components
│
├── scripts/                            # Build and utility scripts
├── examples/                           # Example applications
├── website/                            # Documentation website
└── docs/                               # Documentation files
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tomdrouv1/coherent.js.git
   cd coherent.js
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build all packages**
   ```bash
   pnpm build
   ```

4. **Run tests**
   ```bash
   pnpm test
   ```

## Development Workflow

### Building Packages

- **Build all packages**: `pnpm build`
- **Build packages only**: `pnpm build:packages`
- **Build TypeScript declarations**: `pnpm build:types`
- **Clean all builds**: `pnpm clean`

### Testing

- **Run all tests**: `pnpm test`
- **Run unit tests only**: `pnpm test:unit`
- **Run integration tests**: `pnpm test:integration`
- **Test a specific package**: `pnpm --filter @coherent.js/core test`

### Code Quality

- **Lint code**: `pnpm lint`
- **Fix linting issues**: `pnpm lint:fix`
- **Format code**: `pnpm format`
- **Check formatting**: `pnpm format:check`
- **Type check**: `pnpm typecheck`

### Development Server

- **Start development mode**: `pnpm dev`
- **Start website development**: `pnpm website:dev`
- **Build and serve website**: `pnpm website:start`

## Working with Packages

### Adding a New Package

1. Create package directory: `packages/new-package/`
2. Add `package.json` with correct metadata
3. Create `build.mjs` using shared build system
4. Add TypeScript configuration `tsconfig.json`
5. Update root `tsconfig.json` references
6. Add to build order in `scripts/shared-build.mjs`

### Package Dependencies

- **Core package** (`@coherent.js/core`) should be dependency-free
- **Integration packages** depend on `@coherent.js/core` + their respective framework
- **Use peer dependencies** for optional framework integrations
- **External dependencies** should be marked as external in build config

### Build System

Each package uses the shared build system in `scripts/shared-build.mjs`:

```javascript
// packages/example/build.mjs
import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherent.js/example',
  entryPoint: '../../src/example/index.js',
  external: ['@coherent.js/core', 'external-dep']
});
```

## Code Guidelines

### Style Guide

- **ES Modules**: All code uses ES modules (`import`/`export`)
- **Node.js 20+**: Target Node.js 20+ features
- **TypeScript**: Provide type definitions for all packages
- **Pure Functions**: Prefer pure functions and immutable operations
- **Error Handling**: Use proper error classes and consistent error handling

### API Design

- **Consistent Naming**: Use consistent naming across packages
- **Progressive Enhancement**: APIs should work without client-side JavaScript
- **Performance First**: Optimize for server-side rendering performance
- **Developer Experience**: Prioritize clear APIs and good error messages

### Testing

- **Unit Tests**: Test individual functions and modules
- **Integration Tests**: Test package interactions
- **Example Tests**: Ensure all examples work correctly
- **Performance Tests**: Include benchmark tests for core features

## Release Process

### Version Management

This project uses Changesets for version management:

1. **Create changeset**: `pnpm changeset`
2. **Version packages**: `pnpm version`
3. **Publish packages**: `pnpm release`

### Release Checklist

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Examples work correctly
- [ ] CHANGELOG is updated
- [ ] Version numbers are consistent
- [ ] TypeScript declarations are generated
- [ ] Packages build successfully

## Troubleshooting

### Common Issues

**Build failures**:
- Ensure all dependencies are installed: `pnpm install`
- Clean and rebuild: `pnpm clean && pnpm build`
- Check for circular dependencies

**TypeScript errors**:
- Rebuild TypeScript project: `pnpm build:types`
- Check tsconfig.json configurations
- Verify path mappings

**Test failures**:
- Ensure packages are built: `pnpm build`
- Check for missing test dependencies
- Run tests individually to isolate issues

**Development server issues**:
- Check port availability (3000, 5173)
- Ensure website is built: `pnpm website:build`
- Check for missing dependencies

## Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** and add tests
4. **Run the full test suite**: `pnpm test`
5. **Create a changeset**: `pnpm changeset`
6. **Submit a pull request**

### Pull Request Guidelines

- Include tests for new features
- Update documentation as needed
- Follow the existing code style
- Include a changeset for version management
- Provide clear description of changes

## Getting Help

- **Documentation**: Check the `docs/` directory
- **Examples**: Look at `examples/` for usage patterns  
- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

## Architecture Decisions

### Monorepo Structure

- **Shared Source**: All packages share source code from `src/`
- **Individual Builds**: Each package has its own build configuration
- **Consistent APIs**: All packages follow the same API patterns
- **Minimal Dependencies**: Keep external dependencies to a minimum

### Build Strategy

- **ESBuild**: Fast bundling with ESBuild
- **Dual Format**: Both ESM and CommonJS outputs
- **TypeScript**: Generated declarations for all packages
- **Tree Shaking**: Optimized for tree shaking

### Performance Strategy

- **Server-First**: Optimized for server-side rendering
- **Minimal Runtime**: Keep client-side runtime small
- **Caching**: Built-in intelligent caching
- **Streaming**: Support for streaming large responses
