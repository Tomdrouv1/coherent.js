# Coherent.js API Reference

This document provides a comprehensive reference for all public APIs available in Coherent.js.

> **Pure Object Philosophy**: Coherent.js emphasizes **factory functions** over class instantiation. Throughout this API reference, we recommend using factory functions for a pure JavaScript object approach.

## Supported Imports

Use only the package entrypoints:

```javascript
import { render } from '@coherent.js/core';
import { hydrate } from '@coherent.js/client';
```

## Core Rendering

### `render(component, options?)`

Renders a Coherent.js component to an HTML string.

**Parameters:**
- `component` (CoherentNode): The component to render
- `options` (Object, optional): Rendering options

**Returns:** String - The rendered HTML

**Example:**
```javascript
import { render } from '@coherent.js/core';

const component = {
  div: {
    className: 'greeting',
    children: [
      { h1: { text: 'Hello, World!' } }
    ]
  }
};

const html = render(component);
// Output: <div class="greeting"><h1>Hello, World!</h1></div>
```

**Options:**
- `enableCache` (boolean): Enable caching (default: true)
- `enableMonitoring` (boolean): Enable performance monitoring (default: false)
- `minify` (boolean): Minify output HTML
- `maxDepth` (number): Maximum tree depth
- `cacheSize` (number): Cache size limit
- `cacheTTL` (number): Cache TTL in ms
- `scoped` (boolean): Enable CSS scoping (alias of `encapsulate`)
- `encapsulate` (boolean): Enable CSS scoping

**Returns:** string - The rendered HTML

**Example:**
```javascript
import { render } from '@coherent.js/core';

const App = () => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'My App' } },
            { meta: { charset: 'utf-8' } }
          ]
        }
      },
      {
        body: {
          className: 'app',
          children: [
            { h1: { text: 'Welcome!' } }
          ]
        }
      }
    ]
  }
});

const html = render(App(), {
  enableCache: true,
  enableMonitoring: false,
  minify: true,
  encapsulate: true
});
```

### Streaming

Streaming rendering is not currently part of the stable public API surface.

## Component Utilities

### `createComponent(renderFunction)`

Creates a component from a render function.

**Parameters:**
- `renderFunction` (Function): A function that returns a CoherentNode

**Returns:** Function - A component function

**Example:**
```javascript
import { createComponent } from '@coherent.js/core';

const Greeting = createComponent(({ name }) => ({
  div: {
    children: [
      { h1: { text: `Hello, ${name}!` } }
    ]
  }
}));
```

### `withState(initialState, options?)`

Adds reactive state management to a component with automatic re-rendering on state changes.

**Parameters:**
- `initialState` (Object): The initial state object
- `options` (Object, optional): State management options
  - `debug` (Boolean): Enable debug logging for state changes
  - `middleware` (Array): Array of middleware functions to apply to state changes
  - `validator` (Function): Function to validate state changes

**Returns:** Function - A higher-order component function that wraps the component with state

**Example:**
```javascript
import { withState } from '@coherent.js/core';

// Basic state management
const Counter = withState({ count: 0 })((props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;
  
  return {
    div: {
      'data-coherent-component': 'counter',
      children: [
        { p: { text: `Count: ${state.count}` } },
        { 
          button: { 
            text: 'Increment', 
            onclick: () => setState({ count: state.count + 1 })
          }
        },
        { 
          button: { 
            text: 'Reset', 
            onclick: () => setState({ count: 0 })
          }
        }
      ]
    }
  };
});

// With options and debugging
const TodoApp = withState({
  todos: [],
  filter: 'all',
  newTodo: ''
}, {
  debug: true, // Logs all state changes
  validator: (newState) => {
    if (newState.todos && !Array.isArray(newState.todos)) {
      throw new Error('todos must be an array');
    }
    return true;
  }
})((props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;
  
  const addTodo = () => {
    if (state.newTodo.trim()) {
      setState({
        todos: [...state.todos, {
          id: Date.now(),
          text: state.newTodo.trim(),
          completed: false
        }],
        newTodo: ''
      });
    }
  };
  
  return {
    div: {
      'data-coherent-component': 'todo-app',
      children: [
        {
          input: {
            type: 'text',
            value: state.newTodo,
            placeholder: 'Add new todo...',
            oninput: (e) => setState({ newTodo: e.target.value })
          }
        },
        {
          button: {
            text: 'Add Todo',
            onclick: addTodo
          }
        },
        {
          ul: {
            children: state.todos.map(todo => ({
              li: { 
                text: todo.text,
                className: todo.completed ? 'completed' : ''
              }
            }))
          }
        }
      ]
    }
  };
});
```

**State Management API:**

The component receives the following props:
- `state` (Object): Current state object
- `stateUtils` (Object): State management utilities
  - `setState(newState)`: Update state (triggers re-render)
  - `getState()`: Get current state
  - `resetState()`: Reset to initial state
  - `subscribe(callback)`: Subscribe to state changes

### `memo(component, keyFunction?)`

Memoizes a component to prevent unnecessary re-renders.

**Parameters:**
- `component` (Function): The component to memoize
- `keyFunction` (Function, optional): A function that returns a cache key based on props

**Returns:** Function - A memoized component function

**Example:**
```javascript
import { memo } from '@coherent.js/core';

const ExpensiveComponent = memo(
  (context) => {
    // Expensive computation here
    return { div: { text: computeResult(context.data) } };
  },
  (context) => context.data.id // Custom key function
);
```

## Conditional Rendering

Use standard JavaScript ternary operators for conditional rendering:

**Example:**
```javascript
const UserProfile = (context) => ({
  div: {
    children: [
      context.user
        ? { p: { text: `Welcome, ${context.user.name}!` } }
        : { p: { text: 'Please log in' } }
    ]
  }
});
```

## List Rendering

Use standard JavaScript `Array.map()` to render lists:

**Example:**
```javascript
const TodoList = (context) => ({
  ul: {
    children: context.todos.map((todo) => ({
      li: { 
        text: todo.text,
        className: todo.completed ? 'completed' : 'pending'
      }
    }))
  }
});
```

## Performance Monitoring

### `performanceMonitor.start()`

Starts performance monitoring.

**Returns:** String - A unique render ID

### `performanceMonitor.end(renderId)`

Ends performance monitoring for a specific render.

**Parameters:**
- `renderId` (String): The render ID returned by `start()`

### `performanceMonitor.getStats()`

Gets current performance statistics.

**Returns:** Object - Performance metrics

### `performanceMonitor.reset()`

Resets performance statistics.

### `performanceMonitor.getRecommendations()`

Gets performance optimization recommendations.

**Returns:** Array - Array of recommendation objects

## Database Layer

### Factory Functions (Recommended)

#### `createDatabaseManager(config)`

**✅ Recommended**: Creates a database manager instance using factory function.

**Parameters:**
- `config` (Object): Database configuration

**Returns:** DatabaseManager - A database manager instance

**Example:**
```javascript
import { createDatabaseManager } from '@coherent.js/core';

// Recommended approach
const db = createDatabaseManager({
  type: 'sqlite',
  database: ':memory:'
});
```

#### `createQuery(config)`

**✅ Recommended**: Creates a query builder instance using factory function.

**Parameters:**
- `config` (Object): Query configuration

**Returns:** QueryBuilder - A query builder instance

**Example:**
```javascript
import { createQuery } from '@coherent.js/core';

// Pure object approach
const query = createQuery({
  table: 'users',
  select: ['id', 'name'],
  where: { active: true }
});
```

#### `executeQuery(query, database?)`

**✅ Recommended**: Executes a query created with factory functions.

**Parameters:**
- `query` (Object): Query object from createQuery
- `database` (DatabaseManager, optional): Database instance

**Returns:** Promise - Query results

**Example:**
```javascript
import { createQuery, executeQuery, createDatabaseManager } from '@coherent.js/core';

const db = createDatabaseManager({ type: 'sqlite', database: ':memory:' });
const query = createQuery({ table: 'users', select: ['*'] });
const results = await executeQuery(query, db);
```

### Direct Class Access (Advanced Usage)

> **Note**: While direct class access is available for advanced use cases, we recommend using factory functions for consistency with the pure object philosophy.

#### `new DatabaseManager(config)`

**Alternative**: Direct class instantiation for advanced usage.

#### `new QueryBuilder(options)`

**Alternative**: Direct class instantiation for advanced usage.

## Client-side Hydration

### `hydrate(component, container, options?)`

Hydrates a DOM container with a Coherent component to enable client-side interactivity.

**Parameters:**
- `component` (Function): The Coherent component function
- `container` (HTMLElement): The DOM element to hydrate
- `options` (Object, optional): Hydration options
  - `initialState` (Object): Initial state for stateful components (merged with `props`)
  - `props` (Object): Additional props passed to the component
  - `detectMismatch` (Boolean): Enable SSR/component mismatch detection (default: `true` in dev, `false` in prod)
  - `strict` (Boolean): Throw on mismatch instead of warning (default: `false`)
  - `onMismatch` (Function): Custom mismatch handler called with the list of detected mismatches

**Returns:** `{ unmount, rerender, getState, setState }` — instance handle for lifecycle control.

**Example:**
```javascript
import { hydrate } from '@coherent.js/client';
import { Counter } from './components/Counter.js';

// Basic hydration
const container = document.getElementById('counter');
const instance = hydrate(Counter, container, { initialState: { count: 5 } });

// With state initialization and additional props
const instance = hydrate(Counter, container, {
  initialState: { count: 10, step: 2 },
  props: { theme: 'dark' },
});

// State-driven re-render
instance.setState({ count: 11 });
```

### Removed in 1.0

The following client-side APIs were removed in 1.0.0 in favor of the unified `hydrate()` API documented above:

- `legacyHydrate`, `hydrateAll`, `hydrateBySelector` — use `hydrate(component, container, options)` per root.
- `makeHydratable` — any pure-object component is hydratable; no wrapper needed.
- `autoHydrate(registry)` — call `hydrate()` explicitly for each root.
- `enableClientEvents` — automatic; `hydrate()` initializes event delegation.
- `registerEventHandler` — define handlers inline on the component (`onClick: () => {...}`).

See [`MIGRATION-1.0.md`](../../MIGRATION-1.0.md) for before/after code samples.

### `extractInitialState(element, options?)`

Extracts initial state from DOM element data attributes.

**Parameters:**
- `element` (HTMLElement): The DOM element
- `options` (Object, optional): Extraction options

**Returns:** Object|null - The extracted state or null

**Example:**
```javascript
import { extractInitialState } from '@coherent.js/client';

const element = document.getElementById('counter');
// <div id="counter" data-coherent-state='{"count": 5}'>
const state = extractInitialState(element);
// Returns: { count: 5 }
```

## Framework Integrations

### Express.js Integration

#### `express.coherentMiddleware(options?)`

Express middleware for Coherent.js.

**Parameters:**
- `options` (Object, optional): Configuration options

#### `express.createCoherentHandler(componentFactory, options?)`

Creates an Express route handler for Coherent.js components.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Handler options

#### `express.setupCoherent(app, options?)`

Sets up Coherent.js with Express app.

**Parameters:**
- `app` (Express.Application): Express application instance
- `options` (Object, optional): Configuration options

### Fastify Integration

#### `fastify.coherentFastify(fastify, options, done)`

Fastify plugin for Coherent.js.

**Parameters:**
- `fastify` (FastifyInstance): Fastify instance
- `options` (Object): Plugin options
- `done` (Function): Callback to signal plugin registration completion

#### `fastify.createHandler(componentFactory, options?)`

Creates a Fastify route handler for Coherent.js components.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Handler options

#### `fastify.setupCoherent(fastify, options?)`

Sets up Coherent.js with Fastify instance.

**Parameters:**
- `fastify` (FastifyInstance): Fastify instance
- `options` (Object, optional): Configuration options

### Next.js Integration

#### `nextjs.createCoherentNextHandler(componentFactory, options?)`

Creates a Next.js API route handler for Coherent.js components.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Handler options

#### `nextjs.createCoherentAppRouterHandler(componentFactory, options?)`

Creates a Next.js App Router route handler for Coherent.js components.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Handler options

#### `nextjs.createCoherentServerComponent(componentFactory, options?)`

Creates a Next.js Server Component for Coherent.js.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Component options

#### `nextjs.createCoherentClientComponent(componentFactory, options?)`

Creates a Next.js Client Component for Coherent.js with hydration support.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Component options

## Utilities

### `escapeHtml(text)`

Escapes HTML entities in a string.

**Parameters:**
- `text` (String): The text to escape

**Returns:** String - The escaped text

### `validateComponent(component)`

Validates a Coherent.js component.

**Parameters:**
- `component` (any): The component to validate

**Returns:** Boolean - Whether the component is valid

### `extractProps(element)`

Extracts props from a Coherent.js element.

**Parameters:**
- `element` (Object): The element to extract props from

**Returns:** Object - The extracted props

## Types

### `CoherentNode`

Represents a Coherent.js node, which can be:
- A CoherentElement object
- A string
- A number
- A boolean
- null
- undefined

### `CoherentElement`

Represents a Coherent.js element with the structure:
```typescript
{
  [tagName: string]: {
    text?: string;
    html?: string;
    children?: CoherentNode[];
    className?: string | (() => string);
    [key: string]: any;
  }
}
```

### `ComponentFunction`

Represents a Coherent.js component function:
```typescript
(props?: Record<string, any>) => CoherentNode;
```

### `HydratedComponentInstance`

Represents a hydrated component instance:
```typescript
{
  element: HTMLElement;
  component: ComponentFunction;
  props: Record<string, any>;
  isHydrated: boolean;
  update(newProps: Record<string, any>): void;
  destroy(): void;
}
```
