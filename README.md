# 🚀 Coherent.js

**High-performance server-side rendering framework built on pure JavaScript objects**

[![npm version](https://badge.fury.io/js/%40coherent.js%2Fcore.svg)](https://badge.fury.io/js/%40coherent.js%2Fcore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ⚡ **Performance**

Measured, not claimed — run `pnpm perf:render` to reproduce on your machine:

- **~0.2 ms** to render a ~300-node page, **~5 ms** for a 1,000 × 5 table (Node 22, median, fresh data every render)
- about **4–5× the cost of a hand-written template string** producing the same HTML — the price of the object model and escaping
- **Streaming** with `renderToStream()`: the first bytes of a 10,000-row page leave after ~20 ms instead of ~80–100 ms
- **Per-package bundle size gated by CI** (see `packages/*/bundle-size.json`), and a rendering budget gate (`pnpm perf:gate`)

## 🎯 **Why Coherent.js?**

### **Hybrid FP/OOP Architecture**
- **OOP State Management**: Encapsulation, methods, and lifecycle management
- **FP Component Composition**: Purity, composability, and 100% cacheability
- **Best of Both Worlds**: Developer productivity + runtime performance

### **Production-Optimized**
- **Tree Shaking**: `sideEffects: false` across all packages
- **Modular Exports**: Conditional exports for optimal bundle sizes
- **Opt-in caching**: `memo()` per component, and `render(c, { enableCache: true })` for whole renders of identical trees
- **Bundle Analysis**: Real production validation and optimization

### **Developer Experience**
- **Pure Objects**: No JSX, no compilation, just JavaScript
- **TypeScript Support**: Full type definitions and generics
- **Enhanced DevTools**: Component visualization, performance monitoring
- **Migration Friendly**: Easy paths from React/Vue/Express

## 🚀 **Quick Start**

```bash
# Install Coherent.js
pnpm add @coherent.js/core @coherent.js/state @coherent.js/api

# Development tools (tree-shakable)
pnpm add -D @coherent.js/devtools
```

### **Your First Component**

```javascript
// Pure functional component (100% cacheable)
const Welcome = ({ name }) => ({
  div: {
    className: 'welcome',
    children: [
      { h1: { text: `Welcome, ${name}!` }},
      { p: { text: 'Built with pure JavaScript objects' }}
    ]
  }
});

// Enhanced OOP state management
import { createFormState } from '@coherent.js/state';

const userForm = createFormState({
  name: '',
  email: ''
});

// Add validation (OOP encapsulation)
userForm.addValidator('email', (value) => {
  if (!value.includes('@')) return 'Valid email required';
});
```

### **Production Bundle Optimization**

```javascript
// ✅ Tree-shakable imports (recommended)
import { render } from '@coherent.js/core';
import { createFormState } from '@coherent.js/state';
import { logComponentTree } from '@coherent.js/devtools/visualizer';

// ❌ Avoid: Import entire packages
import * as coherent from '@coherent.js/core';
```

## 📊 **Performance Benchmarks**

`benchmarks/render-bench.js` renders realistic trees with warm-up and several timed rounds, and checks the output byte-for-byte against a hand-written template-string baseline. Typical results (Node 22, median ms per render):

| Case | `render()` | Template-string baseline | Overhead |
|------|-----------:|-------------------------:|---------:|
| Page, ~300 nodes | 0.22 | 0.05 | ~4.5× |
| Table, 1,000 × 5 | 4.9 | 1.1 | ~4.5× |
| Tree, 90 levels deep | 0.06 | 0.001 | ~45× |

Numbers vary with hardware; compare runs on the same machine.

## 🏗️ **Architecture Overview**

```
📦 Core Framework
├── Components (pure FP objects)
├── Rendering (SSR + streaming)
├── Performance (memo, opt-in render cache)
└── Utils (tree-shakable)

🧩 State Management
├── Reactive State (core)
├── Enhanced Patterns (FormState, ListState)
├── Persistence & Validation
└── Tree-shakable modules

🌐 API Framework
├── Smart Routing (LRU cached)
├── Middleware & Security
├── Validation & Serialization
└── Modular exports

🔧 DevTools
├── Component Visualizer
├── Performance Dashboard
├── Enhanced Error Context
└── Tree-shakable
```

## 📚 **Documentation**

- **[Getting Started](docs/getting-started/quick-start.md)** - 5-minute setup
- **[Deployment Guide](docs/deployment/index.md)** - Production deployment
- **[Migration Guide](docs/migration/guide.md)** - From React/Vue/Express
- **[Upgrading from 1.1](docs/migration/upgrading-from-1.1.md)** - Behavior changes and how to adapt
- **[API Reference](docs/api/reference.md)** - Complete documentation
- **[Examples](examples/)** - Full-stack applications

## 📦 **Which Package Do I Need?**

| Use Case | Package(s) |
|----------|------------|
| Server-side rendering | `@coherent.js/core` |
| Client-side hydration | `@coherent.js/core` + `@coherent.js/client` |
| Express integration | `@coherent.js/core` + `@coherent.js/integrations` |
| Fastify integration | `@coherent.js/core` + `@coherent.js/integrations` |
| Next.js integration | `@coherent.js/core` + `@coherent.js/integrations` |
| State management | `@coherent.js/state` |
| Forms & validation | `@coherent.js/forms` |
| SEO (meta tags, sitemap, JSON-LD) | `@coherent.js/seo` |
| Database ORM | `@coherent.js/database` |
| API routing & middleware | `@coherent.js/api` |
| Internationalization | `@coherent.js/i18n` |
| Testing utilities | `@coherent.js/tooling/testing` |
| Performance profiling & optimization | `@coherent.js/devtools/performance` |

> All packages are ESM-only and require Node.js 22+. Install with `pnpm add @coherent.js/<name>`.

## 🛠️ **Development Tools**

```javascript
// Development only (excluded from production bundle)
import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard } from '@coherent.js/devtools/performance';

// Component debugging
logComponentTree(MyComponent, 'MyComponent', {
  colorOutput: true,
  showProps: true
});

// Performance monitoring
const dashboard = createPerformanceDashboard();
dashboard.start();
```

## 🚀 **Production Deployment**

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'coherent-core': ['@coherent.js/core'],
          'coherent-state': ['@coherent.js/state']
        }
      }
    }
  }
};
```

## 📦 **Packages**

### **Core**
- `@coherent.js/core` - Framework core
- `@coherent.js/state` - State management
- `@coherent.js/api` - API framework
- `@coherent.js/client` - Client utilities

### **Features**
- `@coherent.js/database` - Database adapters
- `@coherent.js/forms` - Form utilities
- `@coherent.js/devtools` - Development tools

### **Integrations**
- `@coherent.js/integrations` - Framework integration adapters via subpath exports (`/express`, `/fastify`, `/koa`, `/nextjs`, `/astro`, `/remix`, `/sveltekit`)

### **Tooling**
- `@coherent.js/tooling` - Testing utilities (`/testing` subpath) and Language Server (`coherent-language-server` binary)
- `coherent-language-support` - VS Code extension

## IDE Support

Coherent.js provides first-class IDE support for an excellent developer experience.

### VS Code Extension

The **Coherent.js Language Support** extension provides:

- **IntelliSense** - Autocomplete for HTML attributes and event handlers
- **Validation** - Real-time warnings for invalid attributes and HTML nesting
- **Snippets** - Quick patterns like `cel`, `ccomp`, `cinput`, and more
- **Hover Info** - Type information and documentation on hover

CI builds it as a VSIX (the `coherent-vscode-extension` artifact); you can also build it locally and install the file:

```bash
pnpm --filter coherent-language-support run package
code --install-extension packages/vscode-extension/coherent-language-support-*.vsix
```

### Language Server (for other editors)

The `@coherent.js/tooling` package ships a `coherent-language-server` binary that provides LSP support for any editor:

```bash
# Install globally
npm install -g @coherent.js/tooling

# Run the server
coherent-language-server --stdio
```

Configure your editor's LSP client to use `coherent-language-server` for JavaScript and TypeScript files.

## 🎯 **Quality Gates**

Every push runs lint, type checks, the test suite with coverage, API- and type-surface checks (declared types must match runtime exports), publint, bundle-size budgets, the rendering performance budget, and Playwright end-to-end tests.

## 🆘 **Getting Help**

- 📖 [Documentation](docs/) - Complete guides and API reference
- 🚀 [Examples](examples/) - Full-stack applications
- 🐛 [Issues](https://github.com/Tomdrouv1/coherent.js/issues) - Report bugs
- 💬 [Discussions](https://github.com/Tomdrouv1/coherent.js/discussions) - Community support

## 📄 **License**

MIT © [Coherent.js Team](https://github.com/Tomdrouv1/coherent.js)

---

**🎉 Start building high-performance web applications with Coherent.js today!**
