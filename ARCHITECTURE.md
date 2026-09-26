# Coherent.js Architecture

This document provides an overview of the Coherent.js framework architecture, design decisions, and best practices.

## Table of Contents

- [Core Principles](#core-principles)
- [Package Structure](#package-structure)
- [Rendering Pipeline](#rendering-pipeline)
- [State Management](#state-management)
- [Framework Integrations](#framework-integrations)
- [Best Practices](#best-practices)

## Core Principles

### 1. **Object-Based Syntax**
Coherent.js uses pure JavaScript objects to represent HTML structures. No JSX, no templates, just objects.

```javascript
// Component definition
{
  div: {
    className: 'container',
    children: [
      { h1: { text: 'Hello World' } },
      { p: { text: 'Pure objects, pure simplicity' } }
    ]
  }
}
```

### 2. **Zero Hard Dependencies**
The core framework has zero runtime dependencies. Framework integrations (Express, Fastify, Koa, Next.js) are
optional peer dependencies.

### 3. **Performance First**
- Built-in caching and memoization
- Streaming support for large documents
- Performance monitoring tools
- Optimized rendering pipeline

### 4. **Developer Experience**
- TypeScript definitions included
- Hot Module Replacement (HMR) support
- Comprehensive error messages
- Extensive documentation

## Package Structure

```
coherent.js/
├── packages/
│   ├── core/                           # @coherent.js/core - Core rendering engine
│   │   ├── src/
│   │   │   ├── index.js                    # Main entry point
│   │   │   ├── core/                       # Core utilities
│   │   │   │   ├── object-factory.js       # Object creation helpers (h, createElement)
│   │   │   │   └── object-utils.js         # Object validation and utilities
│   │   │   ├── components/                 # Component system
│   │   │   │   ├── component-system.js     # Advanced component features
│   │   │   │   ├── lifecycle.js            # Component lifecycle hooks
│   │   │   │   ├── error-boundary.js       # Error handling
│   │   │   │   └── lazy-loading.js         # Code splitting support
│   │   │   ├── rendering/                  # Rendering engines
│   │   │   │   ├── html-renderer.js        # Main HTML + streaming renderer
│   │   │   │   ├── base-renderer.js        # Shared renderer base class
│   │   │   │   └── css-manager.js          # CSS injection utilities
│   │   │   ├── performance/                # Performance tools
│   │   │   │   ├── monitor.js              # Performance monitoring
│   │   │   │   ├── component-cache.js      # Component caching
│   │   │   │   └── cache-manager.js        # Cache management
│   │   │   ├── events/                     # Event system
│   │   │   │   ├── event-bus.js            # Event bus
│   │   │   │   └── component-integration.js
│   │   │   └── utils/                      # Utilities
│   │   │       ├── error-handler.js        # Error handling
│   │   │       └── render-utils.js         # Shared rendering utilities
│   │   └── types/                          # TypeScript definitions
│   │
│   ├── client/                         # @coherent.js/client - Client-side hydration & routing
│   ├── api/                            # @coherent.js/api - API framework
│   ├── state/                          # @coherent.js/state - Reactive state management
│   │
│   ├── integrations/                   # @coherent.js/integrations - Framework adapters via subpath exports (express, fastify, koa, nextjs, astro, remix, sveltekit)
│   │
│   ├── database/                       # @coherent.js/database - Database adapters
│   ├── forms/                          # @coherent.js/forms - Form utilities & validation
│   ├── i18n/                           # @coherent.js/i18n - Internationalization
│   ├── seo/                            # @coherent.js/seo - SEO tools
│   ├── tooling/                        # @coherent.js/tooling - Testing utilities (/testing subpath) and Language Server (coherent-language-server binary)
│   ├── devtools/                       # @coherent.js/devtools - Developer tools, debugging, and performance utilities (cache, code-splitting, lazy-loading via /performance subpath)
│   │
│   ├── cli/                            # @coherent.js/cli - CLI tools (includes build-tools subpath)
│   └── vscode-extension/               # coherent-language-support - VS Code extension (bundles tooling LSP)
│
├── scripts/                            # Build and utility scripts
├── examples/                           # Example applications
├── website/                            # Documentation website
└── docs/                               # Documentation files
```

## Rendering Pipeline

### 1. **Entry Points**

There are multiple rendering entry points depending on your use case:

```javascript
// Standard rendering: synchronous, returns a string
import { render } from '@coherent.js/core';
const html = render(component);

// With scoped CSS (opt-in)
const scopedHtml = render(component, { scoped: true });

// Streaming for large documents: an async generator of HTML chunks with the
// same output as render(); the event loop gets a turn after every chunk
import { Readable } from 'node:stream';
import { renderToStream } from '@coherent.js/core';
Readable.from(renderToStream(component)).pipe(res);
```

`render()` is synchronous: await data and async components before calling it (a Promise in the tree throws). A function component that throws makes `render()` throw with the component's path; pass `onError: (error, { path }) => fallback` to render a replacement instead.

### 2. **Rendering Flow**

```
Component Object
    ↓
render() / renderToStream()
    ↓
- CSS scoping (optional, `scoped: true`)
- Hydration attributes (optional)
    ↓
HTMLRenderer (html-renderer.js)
    ↓
- Validation
- Whole-render cache lookup (optional, `enableCache: true`)
- elementParts(): tags, escaped attributes and text (shared by both paths)
- Performance monitoring (optional, `enableMonitoring: true`)
    ↓
HTML string, or chunks
```

### 3. **CSS Scoping**

With `render(component, { scoped: true })` (alias `encapsulate`), Coherent.js scopes a component's `<style>` rules, similar to Angular's View Encapsulation. The scope id is derived from the component's CSS, so the output is deterministic; rules inside `@media`, `@supports`, `@container` and `@layer` are scoped, while `@keyframes` and `@font-face` are left as they are:

```javascript
// Input component with styles
{
  div: {
    children: [
      { style: { text: '.button { color: blue; }' } },
      { button: { className: 'button', text: 'Click me' } }
    ]
  }
}

// Output with scoped CSS (the id is a hash of the CSS)
<div coh-1x2y3z="">
  <style coh-1x2y3z="">.button[coh-1x2y3z] { color: blue; }</style>
  <button class="button" coh-1x2y3z="">Click me</button>
</div>
```

Scoping is off by default.

## State Management

Coherent.js provides **two tiers of state management**:

### Tier 1: Simple State (Legacy - Deprecated)

**Location:** Previously in `packages/core/src/index.js` (now removed)

**Status:** ⚠️ **Deprecated** - Use Tier 2 instead

### Tier 2: Advanced State (Recommended)

**Location:** `packages/core/src/components/component-system.js`

**Features:**
- Persistent state with localStorage
- Reducer pattern support
- Middleware system
- Async state updates
- State validation
- Undo/redo functionality
- Form state utilities

**Usage:**

```javascript
import { withState } from '@coherent.js/core';

// Basic usage
const Counter = withState({ count: 0 })(({ state, stateUtils }) => ({
  div: {
    children: [
      { p: { text: `Count: ${state.count}` } },
      { 
        button: { 
          text: 'Increment',
          onclick: () => stateUtils.setState({ count: state.count + 1 })
        }
      }
    ]
  }
}));

// Advanced usage with options
const PersistentCounter = withState({ count: 0 }, {
  persistent: true,
  storageKey: 'my-counter',
  validator: (state) => state.count >= 0,
  onStateChange: (newState, oldState) => {
    console.log('State changed:', oldState, '->', newState);
  }
})(CounterComponent);

// With reducer pattern
const TodoList = withState({ todos: [] }, {
  reducer: (state, action) => {
    switch (action.type) {
      case 'ADD_TODO':
        return { ...state, todos: [...state.todos, action.payload] };
      case 'REMOVE_TODO':
        return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };
      default:
        return state;
    }
  },
  actions: {
    addTodo: (state, setState, { args: [todo] }) => {
      setState({ type: 'ADD_TODO', payload: todo });
    },
    removeTodo: (state, setState, { args: [id] }) => {
      setState({ type: 'REMOVE_TODO', payload: id });
    }
  }
})(TodoListComponent);
```

### State Utilities

```javascript
import { withStateUtils } from '@coherent.js/core';

// Simple local state
withStateUtils.local({ count: 0 });

// Persistent state
withStateUtils.persistent({ user: null }, 'user-data');

// Reducer pattern
withStateUtils.reducer(initialState, reducer, actions);

// Async state
withStateUtils.async({ data: null }, {
  fetchData: async (state, setState) => {
    const data = await fetch('/api/data');
    setState({ data });
  }
});

// Form state
withStateUtils.form({ name: '', email: '' });

// Undo/redo
withStateUtils.withHistory({ text: '' }, 10);

// Shared state across components
withStateUtils.shared({ theme: 'light' }, 'app-theme');
```

## Framework Integrations

All framework integrations use **shared rendering utilities** to eliminate code duplication.

### Shared Utilities

**Location:** `packages/core/src/utils/render-utils.js`

**Functions:**
- `renderWithMonitoring()` - Render with optional performance tracking
- `renderWithTemplate()` - Render and apply HTML template
- `renderComponentFactory()` - Handle component factory pattern
- `isCoherentComponent()` - Check if object is a Coherent component
- `createErrorResponse()` - Standardized error responses

### Integration Pattern

Adapters render only what they are explicitly handed: `res.coherent(component)` (Express), `reply.coherent(component)` (Fastify), `ctx.coherent(component)` (Koa), or a handler factory. Guessing from the payload's shape (any single-key object looks like a component) turned JSON API responses such as `{ users: [...] }` into HTML, so it is opt-in with `autoRender: true`.

```javascript
import express from 'express';
import { setupCoherent } from '@coherent.js/integrations/express';

const app = express();
setupCoherent(app);

app.get('/', (req, res) => res.coherent(HomePage({ user: req.user })));
app.get('/api/users', (req, res) => res.json({ users })); // stays JSON
```

### Available Integrations

1. **Express.js** (`@coherent.js/integrations/express`)
   - Middleware for automatic rendering
   - Route handler factory
   - Error handling

2. **Fastify** (`@coherent.js/integrations/fastify`)
   - Plugin system
   - Reply decorators
   - Hook integration

3. **Koa** (`@coherent.js/integrations/koa`)
   - Middleware support
   - Context integration

4. **Next.js** (`@coherent.js/integrations/nextjs`)
   - Server Components
   - Client Components
   - App Router support

## Best Practices

### 1. **Component Organization**

```javascript
// ✅ Good: Single responsibility
const Button = ({ text, onClick }) => ({
  button: {
    className: 'btn',
    text,
    onclick: onClick
  }
});

// ❌ Bad: Too much logic in component
const ComplexComponent = (props) => ({
  div: {
    children: [
      // ... 100 lines of nested components
    ]
  }
});
```

### 2. **State Management**

```javascript
// ✅ Good: Use advanced withState for complex state
const TodoApp = withState({ todos: [], filter: 'all' }, {
  persistent: true,
  storageKey: 'todos',
  actions: {
    addTodo: (state, setState, { args: [todo] }) => {
      setState({ todos: [...state.todos, todo] });
    }
  }
})(TodoAppComponent);

// ❌ Bad: Manual state management
let globalTodos = []; // Don't do this
```

### 3. **Performance**

```javascript
// ✅ Good: Use memo for expensive components
import { memo } from '@coherent.js/core';

const ExpensiveList = memo(
  ({ items }) => ({
    ul: {
      children: items.map(item => ({ li: { text: item.name } }))
    }
  }),
  ({ items }) => items.map(i => i.id).join(',') // Custom key
);

// ✅ Good: Enable caching for repeated renders
render(component, { enableCache: true });
```

### 4. **Error Handling**

```javascript
// ✅ Good: Proper error boundaries
const SafeComponent = withState({ error: null })(({ state, stateUtils }) => {
  if (state.error) {
    return { div: { className: 'error', text: state.error } };
  }
  
  try {
    return RiskyComponent();
  } catch (error) {
    stateUtils.setState({ error: error.message });
    return { div: { text: 'Something went wrong' } };
  }
});
```

### 5. **TypeScript Usage**

```typescript
import { CoherentNode, RenderOptions } from '@coherent.js/core';

interface ButtonProps {
  text: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

const Button = ({ text, onClick, variant = 'primary' }: ButtonProps): CoherentNode => ({
  button: {
    className: `btn btn-${variant}`,
    text,
    onclick: onClick
  }
});
```

## Migration Guide

### From Simple State to Advanced State

```javascript
// Old (simple state)
import { withState } from '@coherent.js/core';
const Counter = withState({ count: 0 })(CounterComponent);

// New (advanced state - same API, more features available)
import { withState } from '@coherent.js/core';
const Counter = withState({ count: 0 }, {
  // Now you can add options
  persistent: true,
  storageKey: 'counter',
  debug: true
})(CounterComponent);
```

The API is backward compatible, so existing code will continue to work!

## Performance Considerations

### 1. **Caching Strategy**

Caching is opt-in. `memo()` caches a component's output per props (each memoized component has its own LRU). `enableCache: true` caches whole renders keyed on the complete component tree, which only pays off when identical trees are re-rendered; trees containing functions are never cached.

```javascript
import { render, memo, createCacheManager } from '@coherent.js/core';

const ProductCard = memo(({ product }) => ({ article: { text: product.name } }), {
  keyFn: ({ product }) => `${product.id}:${product.updatedAt}`,
  maxSize: 500
});

const pageCache = createCacheManager({ maxCacheSize: 1000, ttlMs: 60 * 60 * 1000 });
const html = render(StaticPage(), { enableCache: true, cache: pageCache });
```

### 2. **Streaming for Large Documents**

```javascript
// Use streaming for large component trees
import { renderToStream, streamingUtils } from '@coherent.js/core';

// Writes with backpressure and aborts the response if rendering fails
await streamingUtils.streamToResponse(renderToStream(largeComponent), res);
```

Streaming trades total render time for time-to-first-byte: the event loop gets a turn after every chunk.

### 3. **Performance Monitoring**

```javascript
import { render, performanceMonitor } from '@coherent.js/core';

render(component, { enableMonitoring: true });
const report = performanceMonitor.generateReport();
console.log('Render time (avg ms):', report.metrics.renderTime.avg);
console.log('Elements rendered:', report.metrics.componentCount.value);
```

## Debugging

### Enable Debug Mode

```javascript
// For state management
const Component = withState(initialState, {
  debug: true  // Logs all state changes
})(MyComponent);

// For rendering
const html = render(component, { enableMonitoring: true });
```

### Common Issues

1. **"Component must be an object"** - Ensure your component returns a valid object structure
2. **"Element is already hydrated"** - Check for duplicate hydration calls
3. **State not updating** - Verify you're using `setState` from `stateUtils`

---

For more information, see:
- [README.md](README.md) - Getting started guide
- [API Reference](https://github.com/Tomdrouv1/coherent.js/tree/main/docs/api-reference.md) - Complete API documentation
- [Migration Guide](docs/migration-guide.md) - Upgrading between versions
