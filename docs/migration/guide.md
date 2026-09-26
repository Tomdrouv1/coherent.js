# Coherent.js Migration Guide

> **Upgrading Coherent.js itself?** From 1.1, see [Upgrading from 1.1](upgrading-from-1.1.md); from 1.0.0-beta.*, see [`MIGRATION-1.0.md`](../../MIGRATION-1.0.md). This page covers migrating from OTHER frameworks (React, Vue, Express, etc.) to Coherent.js.

This guide helps developers migrate from traditional frameworks (React, Vue, Express, etc.) or template engines (Handlebars, EJS, etc.) to Coherent.js.

Coherent.js focuses on small bundles and high SSR throughput. Bundle sizes are gated per-package in CI (see `packages/*/bundle-size.json` for the actual numbers); see `benchmarks/` for rendering benchmarks.

## Getting Started with Migration

### Step 1: Install Coherent.js

```bash
pnpm add @coherent.js/core @coherent.js/state @coherent.js/api

# Development tools (tree-shakable)
pnpm add -D @coherent.js/devtools
```

### Step 2: Configure Package.json

Coherent.js is ESM-only and needs Node.js 22.12 or later:

```json
{
  "type": "module",
  "engines": { "node": ">=22.12.0" }
}
```

### Step 3: Migrate State Management

```javascript
import { createFormState, createListState } from '@coherent.js/state';

const userForm = createFormState({ name: '', email: '' });
const userList = createListState([], { pageSize: 20 });
```

### Step 4: Convert Components

```javascript
const UserList = () => ({
  div: {
    className: 'user-list',
    children: userList.paginatedItems.map(user => UserCard(user))
  }
});
```

## From React

### Component Structure

**React JSX:**
```jsx
function Greeting({ name }) {
  return (
    <div className="greeting">
      <h1>Hello, {name}!</h1>
    </div>
  );
}
```

**Coherent.js Object:**
```javascript
function Greeting({ name }) {
  return {
    div: {
      className: 'greeting',
      children: [
        { h1: { text: `Hello, ${name}!` } }
      ]
    }
  };
}
```

### State Management

**React with useState:**
```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

**Coherent.js:** the server renders the initial state; `hydrate()` in the browser attaches the handler and re-renders on `setState()`:

```javascript
// Shared component
export const Counter = ({ count = 0 }) => ({
  div: {
    className: 'counter',
    children: [
      { p: { text: `Count: ${count}` } },
      { button: { text: 'Increment', onClick: (event) => event.setState({ count: event.state.count + 1 }) } }
    ]
  }
});

// Browser
import { hydrate } from '@coherent.js/client';
hydrate(Counter, document.querySelector('.counter'), { initialState: { count: 0 } });
```

### Conditional Rendering

**React:**
```jsx
function UserProfile({ user }) {
  return (
    <div>
      {user ? <p>Welcome, {user.name}!</p> : <p>Please log in</p>}
    </div>
  );
}
```

**Coherent.js:**
```javascript
function UserProfile({ user }) {
  return {
    div: {
      children: [
        user
          ? { p: { text: `Welcome, ${user.name}!` } }
          : { p: { text: 'Please log in' } }
      ]
    }
  };
}
```

`cond && { ... }` works too: `false`, `null` and `undefined` children render nothing.

### List Rendering

**React:**
```jsx
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id} className={todo.completed ? 'completed' : 'pending'}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**Coherent.js:**
```javascript
function TodoList({ todos }) {
  return {
    ul: {
      children: todos.map((todo) => ({
        li: {
          text: todo.text,
          className: todo.completed ? 'completed' : 'pending'
        }
      }))
    }
  };
}
```

### Differences to keep in mind

- Rendering is synchronous and server-first: load data before `render()`, there are no effects.
- Event handlers only run in the browser, after `hydrate()`.
- `className` accepts strings, arrays and `{ name: condition }` objects.

## From Vue

### Template System

**Vue Template:**
```html
<template>
  <div class="product-card">
    <h3>{{ product.name }}</h3>
    <p>${{ product.price }}</p>
    <button @click="addToCart">Add to Cart</button>
  </div>
</template>
```

**Coherent.js:**
```javascript
const ProductCard = (product) => ({
  div: {
    className: 'product-card',
    children: [
      { h3: { text: product.name } },
      { p: { text: `$${product.price}` } },
      { button: { text: 'Add to Cart', onClick: () => addToCart(product) } } // attached by hydrate()
    ]
  }
});
```

### Vue State Management

**Vue Composition API:**
```javascript
import { ref, computed } from 'vue';
const cart = ref([]);
const total = computed(() => cart.value.reduce((sum, item) => sum + item.price, 0));
```

**Coherent.js (`@coherent.js/state`):**
```javascript
import { observable, computed } from '@coherent.js/state';

const cart = observable([]);
const total = computed(() => cart.value.reduce((sum, item) => sum + item.price, 0));

cart.value = [...cart.value, { name: 'Book', price: 12 }];
total.value; // 12
```

## From Template Engines (Handlebars, EJS)

### Basic Template

**Handlebars:**
```handlebars
<div class="greeting">
  <h1>Hello, {{name}}!</h1>
  <p>You have {{notifications}} notifications</p>
</div>
```

**Coherent.js:**
```javascript
function Greeting({ name, notifications }) {
  return {
    div: {
      className: 'greeting',
      children: [
        { h1: { text: `Hello, ${name}!` } },
        { p: { text: `You have ${notifications} notifications` } }
      ]
    }
  };
}
```

### Conditional Blocks

**Handlebars:**
```handlebars
{{#if user}}
  <p>Welcome, {{user.name}}!</p>
{{else}}
  <p>Please log in</p>
{{/if}}
```

**Coherent.js:**
```javascript
function UserProfile({ user }) {
  return {
    div: {
      children: [
        user
          ? { p: { text: `Welcome, ${user.name}!` } }
          : { p: { text: 'Please log in' } }
      ]
    }
  };
}
```

## From String Concatenation

**String Concatenation:**
```javascript
function createGreeting(name) {
  return `<div class="greeting"><h1>Hello, ${name}!</h1></div>`;
}
```

**Coherent.js:**
```javascript
import { render } from '@coherent.js/core';

function Greeting({ name }) {
  return {
    div: {
      className: 'greeting',
      children: [{ h1: { text: `Hello, ${name}!` } }]
    }
  };
}

const html = render(Greeting({ name: 'World' }));
```

## From Express to Coherent.js API

### Route Definition

**Express:**
```javascript
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await getUser(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Coherent.js API (`@coherent.js/api`):**
```javascript
import { createRouter, NotFoundError } from '@coherent.js/api';

const router = createRouter({
  api: {
    users: {
      ':id': {
        GET: async (req) => {
          const user = await getUser(req.params.id);
          if (!user) throw new NotFoundError('User not found');
          return user; // sent as JSON
        }
      }
    }
  }
});

router.createServer().listen(3000);
```

Errors thrown by a handler become JSON responses with their status; a 5xx answers with the generic status text instead of the internal message. See the [API usage guide](../api/usage.md).

## Hydration Migration

One of the most critical aspects when migrating from client-side frameworks is understanding how to make server-rendered components interactive.

### From React Hydration

**React (automatic):**
```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

**Coherent.js (explicit hydration):**
```javascript
// Shared component
const Counter = ({ count = 0 }) => ({
  button: {
    text: `Count: ${count}`,
    onClick: (event) => event.setState({ count: event.state.count + 1 })
  }
});

// Server: <button>Count: 0</button>
render(Counter({ count: 0 }));

// Client
import { hydrate } from '@coherent.js/client';
hydrate(Counter, document.querySelector('#counter-root > button'), { initialState: { count: 0 } });
```

### Key Hydration Differences

1. **Handlers are client-only**: function-valued `on*` props render nothing on the server; `hydrate()` calls the component again in the browser and attaches them through event delegation.

2. **Explicit mounting**: call `hydrate(Component, element)` for each interactive root, where `element` is the element the component's root renders. There is no automatic component registry scan.

3. **State initialization**: pass `initialState`, or render it into a `data-state` attribute with `serializeState()`.

4. **Mismatch detection** runs in development (`NODE_ENV=development`) or with `detectMismatch: true`.

### Progressive Enhancement Pattern

```javascript
{
  form: {
    action: '/api/submit',      // Fallback for no-JS
    method: 'POST',
    onSubmit: enhancedSubmit,   // Attached by hydrate()
    children: [
      { input: { name: 'email', required: true } },
      { button: { type: 'submit', text: 'Submit' } }
    ]
  }
}
```

## Common Patterns

### Event Handling

**Before (React):** `<button onClick={handleClick}>Click me</button>`

**After (Coherent.js):** `{ button: { text: 'Click me', onClick: handleClick } }` — attached in the browser by `hydrate()`

### Styling

**Before:** `<div className="container highlighted">Content</div>`

**After:** `{ div: { className: ['container', isHighlighted && 'highlighted'], text: 'Content' } }`

### Data Attributes

**Before:** `<div data-id="123" data-role="button">Content</div>`

**After:** `{ div: { 'data-id': '123', 'data-role': 'button', text: 'Content' } }`

## Performance Optimization

### Bundle Size Optimization

```javascript
// Avoid: the root entry point pulls in every tool
import { logComponentTree } from '@coherent.js/devtools';

// Recommended: subpath imports
import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard } from '@coherent.js/devtools/performance';
```

### Production Bundle Results

Bundle sizes are gated per-package in CI. See `packages/*/bundle-size.json` for current baselines.

### Build Configuration

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
    },
    minify: 'terser',
    target: 'es2020'
  }
};
```

## Key Benefits of Migrating to Coherent.js

1. **Universal Rendering**: Same components work on server and client
2. **Type Safety**: Full TypeScript support with built-in type definitions
3. **Performance**: Built-in performance monitoring and optimization
4. **Security**: Automatic HTML escaping and XSS protection
5. **No Build Step**: Pure JavaScript with no compilation required
6. **Progressive Enhancement**: Forms and interactions work without JavaScript
7. **Streaming**: Native support for streaming large documents
8. **Opt-in Caching**: per-component `memo()` and whole-render caching when you ask for it

## Migration Checklist

### Server-Side Migration

- [ ] Identify components that need to be converted
- [ ] Convert JSX/templates to Coherent.js object structure
- [ ] Load data before rendering (`render()` is synchronous)
- [ ] Move event handlers to function `on*` props (attached by `hydrate()`)
- [ ] Test server-side rendering output

### Client-Side Hydration Setup

- [ ] Install `@coherent.js/client` package
- [ ] Create hydration entry point (`hydration.js`)
- [ ] Mount each interactive root with `hydrate(Component, container)`
- [ ] Bundle hydration script for the browser
- [ ] Add hydration script to HTML pages
- [ ] Handle timing with `DOMContentLoaded` events
- [ ] Test interactive features after hydration
- [ ] Verify no hydration mismatch warnings

### Testing and Optimization

- [ ] Verify performance improvements
- [ ] Test progressive enhancement (works without JS)
- [ ] Implement selective hydration for performance
- [ ] Configure tree shaking for production
- [ ] Test bundle size (see `packages/*/bundle-size.json` for per-package baselines)

- [ ] Update build/deployment processes

---

For more details, see [Advanced Components](../components/advanced.md), [Hydration Guide](../client/hydration.md), and [Performance Optimizations](../deployment/performance.md).
