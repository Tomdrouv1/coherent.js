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
coherent/
├── packages/
│   ├── core/                 # Core rendering engine
│   │   ├── src/
│   │   │   ├── index.js                    # Main entry point
│   │   │   ├── components/                 # Component system
│   │   │   │   └── component-system.js     # Advanced component features
│   │   │   ├── rendering/                  # Rendering engines
│   │   │   │   ├── html-renderer.js        # Main HTML renderer
│   │   │   │   └── streaming-renderer.js   # Streaming renderer
│   │   │   ├── state/                      # State management
│   │   │   │   └── state-manager.js        # Global state
│   │   │   ├── performance/                # Performance tools
│   │   │   │   └── monitor.js              # Performance monitoring
│   │   │   ├── events/                     # Event system
│   │   │   │   ├── event-bus.js            # Event bus
│   │   │   │   └── component-integration.js
│   │   │   └── utils/                      # Utilities
│   │   │       ├── render-utils.js         # Shared rendering utilities
│   │   │       └── dependency-utils.js     # Dependency management
│   │   └── types/                          # TypeScript definitions
│   │
│   ├── client/               # Client-side hydration
│   │   └── src/
│   │       └── hydration.js                # Hydration system
│   │
│   ├── api/                  # API framework
│   ├── database/             # Database adapters
│   ├── express/              # Express.js integration
│   ├── fastify/              # Fastify integration
│   ├── koa/                  # Koa integration
│   └── nextjs/               # Next.js integration
│
└── docs/                     # Documentation
```

## Rendering Pipeline

### 1. **Entry Points**

There are multiple rendering entry points depending on your use case:

```javascript
// Standard rendering (with CSS scoping by default)
import { render } from '@coherentjs/core';
const html = render(component);

// Full HTML document with DOCTYPE
import { render } from '@coherentjs/core';
const html = await render(component, {
  cssFiles: ['styles.css'],
  cssInline: 'body { margin: 0; }'
});

// Streaming for large documents
import { renderToStream } from '@coherentjs/core';
const stream = renderToStream(component);
```

### 2. **Rendering Flow**

```
Component Object
    ↓
render() / render()
    ↓
HTMLRenderer (html-renderer.js)
    ↓
- Validation
- CSS Scoping (optional)
- Performance Monitoring (optional)
- Caching (optional)
    ↓
HTML String Output
```

### 3. **CSS Scoping**

By default, Coherent.js applies CSS scoping similar to Angular's View Encapsulation:

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

// Output with scoped CSS
<div coh-0="">
  <style>.button[coh-0] { color: blue; }</style>
  <button class="button" coh-0="">Click me</button>
</div>
```

To disable scoping:
```javascript
render(component, { encapsulate: false });
```

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
import { withState } from '@coherentjs/core';

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
import { withStateUtils } from '@coherentjs/core';

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

All integrations follow this pattern:

```javascript
// packages/express/src/coherent-express.js
import { 
  renderWithTemplate, 
  renderComponentFactory,
  isCoherentComponent 
} from '../../core/src/utils/render-utils.js';

export function createCoherentHandler(componentFactory, options = {}) {
  return async (req, res, next) => {
    try {
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [req, res, next],
        options
      );
      
      res.set('Content-Type', 'text/html');
      res.send(finalHtml);
    } catch (error) {
      console.error('Coherent.js handler error:', error);
      next(error);
    }
  };
}
```

### Available Integrations

1. **Express.js** (`@coherentjs/express`)
   - Middleware for automatic rendering
   - Route handler factory
   - Error handling

2. **Fastify** (`@coherentjs/fastify`)
   - Plugin system
   - Reply decorators
   - Hook integration

3. **Koa** (`@coherentjs/koa`)
   - Middleware support
   - Context integration

4. **Next.js** (`@coherentjs/nextjs`)
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
import { memo } from '@coherentjs/core';

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
import { CoherentNode, RenderOptions } from '@coherentjs/core';

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
import { withState } from '@coherentjs/core';
const Counter = withState({ count: 0 })(CounterComponent);

// New (advanced state - same API, more features available)
import { withState } from '@coherentjs/core';
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

```javascript
// Enable caching for production
const html = render(component, {
  enableCache: true,
  cacheSize: 1000,  // Max cached items
  cacheTTL: 3600000 // 1 hour in ms
});
```

### 2. **Streaming for Large Documents**

```javascript
// Use streaming for large component trees
import { renderToStream } from '@coherentjs/core';

const stream = renderToStream(largeComponent);
stream.pipe(response);
```

### 3. **Performance Monitoring**

```javascript
import { performanceMonitor } from '@coherentjs/core';

performanceMonitor.start();
// ... render components
const stats = performanceMonitor.getStats();
console.log('Render time:', stats.averageRenderTime);
console.log('Cache hit rate:', stats.cacheHitRate);
```

## Debugging

### Enable Debug Mode

```javascript
// For state management
const Component = withState(initialState, {
  debug: true  // Logs all state changes
})(MyComponent);

// For rendering
const html = render(component, {
  enableMonitoring: true,
  enableDevTools: true
});
```

### Common Issues

1. **"Component must be an object"** - Ensure your component returns a valid object structure
2. **"Element is already hydrated"** - Check for duplicate hydration calls
3. **State not updating** - Verify you're using `setState` from `stateUtils`

## Contributing

When contributing to Coherent.js architecture:

1. **Follow DRY principles** - Use shared utilities instead of duplicating code
2. **Maintain backward compatibility** - Don't break existing APIs
3. **Add tests** - All new features must have tests
4. **Update documentation** - Keep this file and README.md in sync
5. **Performance first** - Profile changes and avoid regressions

## Version History

- **v1.0.0** - Initial release with core rendering
- **v1.1.0** - Added advanced state management, consolidated rendering utilities
- **v1.1.1** - Fixed DRY violations, improved documentation

---

For more information, see:
- [README.md](README.md) - Getting started guide
- [API Reference](docs/api-reference.md) - Complete API documentation
- [Migration Guide](docs/migration-guide.md) - Upgrading between versions
