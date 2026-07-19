# Coherent.js Documentation

Welcome to the official documentation for Coherent.js, a high-performance server-side rendering framework built on pure JavaScript objects.

## 📚 Documentation Structure

### 🚀 Getting Started
- [Quick Start](getting-started/quick-start.md) - 5-minute setup guide
- [Installation](getting-started/installation.md) - Detailed setup instructions

### 🧩 Components
- [Basic Components](components/basics.md) - Building with pure objects
- [Advanced Components](components/advanced.md) - Complex patterns
- [State Management](components/state.md) - Component state
- [Styling Components](components/styling.md) - Component styling

### 🌊 Client-Side
- [Hydration](client/hydration.md) - Make components interactive
- [Router](client/router.md) - Client-side routing

### 🏗️ Server-Side
- [SSR Guide](server/ssr.md) - Server-side rendering

### 🗄️ Database
- [Integration](database/index.md) - Database setup
- [Query Builder](database/query-builder.md) - SQL utilities
- [Query Builder API](database/query-builder-api.md) - API reference

### 🌐 API Framework
- [Reference](api/reference.md) - Complete API documentation
- [Usage](api/usage.md) - Practical examples

### ☁️ Deployment
- [Guide](deployment/index.md) - Deployment strategies
- [Integrations](deployment/integrations.md) - Framework adapters
- [Performance](deployment/performance.md) - Optimization techniques
- [Security](deployment/security.md) - Security best practices

### 🧪 Testing & Tooling
- [Testing Guide](testing/guide.md) - Testing utilities and matchers

### 🧩 Extended Packages
- [Forms](packages/forms.md) - Form building, validation, and hydration
- [i18n](packages/i18n.md) - Translations, formatters, and locale management
- [SEO](packages/seo.md) - Meta tags, sitemaps, and structured data

### 🛠️ Editor Support
- [VS Code Extension](packages/vscode-extension.md) - IntelliSense and snippets for VS Code
- LSP server for any editor — ships with `@coherent.js/tooling` (binary: `coherent-language-server`)

### 🔧 Advanced
- [Utilities](advanced/utilities.md) - Shared rendering utilities

### 📖 Examples
- [Performance](examples/performance.md) - Performance patterns
- [Full Stack](examples/full-stack.md) - Complete applications
- [Tutorial](examples/tutorial.md) - Step-by-step guide

### 🔄 Migration
- [From Other Frameworks](migration/guide.md) - React/Vue migration
- [Package Reorganization](migration/package-reorg.md) - v1.0.0-beta.2 upgrade

## 🎯 Quick Navigation

### I want to...
- **Get started quickly** → [Quick Start](getting-started/quick-start.md)
- **Build components** → [Basic Components](components/basics.md)
- **Add interactivity** → [Hydration](client/hydration.md)
- **Manage state** → [State Management](components/state.md)
- **Handle routing** → [Router](client/router.md)
- **Work with databases** → [Database Integration](database/index.md)
- **Deploy to production** → [Deployment Guide](deployment/index.md)
- **Migrate from React/Vue** → [Migration Guide](migration/guide.md)
- **Build forms** → [Forms Guide](packages/forms.md)
- **Test components** → [Testing Guide](testing/guide.md)
- **Set up VS Code** → [VS Code Extension](packages/vscode-extension.md)

## 📦 Package Reference

Coherent.js is a monorepo with multiple packages:

### Core Packages
- `@coherent.js/core` - Core framework
- `@coherent.js/client` - Client-side utilities
- `@coherent.js/api` - API framework

### Integration Packages
- `@coherent.js/integrations` - Framework integration adapters via subpath exports (`/express`, `/fastify`, `/koa`, `/nextjs`, `/astro`, `/remix`, `/sveltekit`)

### Feature Packages
- `@coherent.js/database` - Database adapters
- `@coherent.js/forms` - [Form utilities](packages/forms.md)
- `@coherent.js/i18n` - [Internationalization](packages/i18n.md)
- `@coherent.js/seo` - [SEO tools](packages/seo.md)
- `@coherent.js/tooling` - [Testing utilities](testing/guide.md) (`/testing` subpath) and Language Server (`coherent-language-server` binary)
- `@coherent.js/state` - Reactive state management
- `@coherent.js/devtools` - Developer tools, performance profiling, and optimization utilities (cache, code-splitting, lazy-loading via `/performance` subpath)

### Editor Tooling
- `@coherent.js/tooling` - LSP server (binary: `coherent-language-server`) and testing utilities (`/testing` subpath)
- `coherent-language-support` - [VS Code extension](packages/vscode-extension.md)

## 🆘 Getting Help

If you need help:
1. Check the [API Reference](api/reference.md) for function signatures
2. Look at [Examples](examples/) for practical implementations
3. Try the [Quick Start](getting-started/quick-start.md) guide
4. Review [Performance Patterns](examples/performance.md) for optimization
5. Open an issue on [GitHub](https://github.com/Tomdrouv1/coherent.js/issues)

## 📄 License

Coherent.js is MIT licensed.
