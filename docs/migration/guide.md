# Coherent.js Migration Guide

This guide helps developers migrate from traditional frameworks (React, Vue, Express, etc.) or template engines (Handlebars, EJS, etc.) to Coherent.js.

Coherent.js delivers exceptional performance with validated production metrics:
- **80.7KB gzipped** production bundle
- **247 renders/sec** performance with LRU caching
- **42.7% performance improvement** over traditional OOP
- **79.5% tree shaking reduction** for DevTools

## Getting Started with Migration

### Step 1: Install Coherent.js

```bash
pnpm add @coherent.js/core @coherent.js/state @coherent.js/api

# Development tools (tree-shakable)
pnpm add -D @coherent.js/devtools
```

### Step 2: Configure Package.json

```json
{
  "coherent": {
    "enableTreeShaking": true,
    "enableStreaming": true,
    "enableLRUCaching": true,
    "performance": {
      "enableMetrics": true
    }
  }
}
```

### Step 3: Migrate State Management

```javascript
import { createFormState, createListState } from '@coherent.js/state';

const userForm = createFormState({ name: '', email: '' });
const productList = createListState([], { pageSize: 20 });
```

### Step 4: Convert Components

```javascript
const UserList = () => ({
  div: {
    className: 'user-list',
    children: productList.sortedItems.map(user => UserCard(user))
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

**Coherent.js with withState:**
```javascript
import { withState } from '@coherent.js/core';

const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    children: [
      { p: { text: `Count: ${state.count}` } },
      { button: { text: 'Increment', onclick: () => setState({ count: state.count + 1 }) } }
    ]
  }
}));
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

### React Performance Benefits

- **42.7% faster rendering** with hybrid FP/OOP approach
- **100% cacheable** pure functional components
- **Better memory management** with OOP state encapsulation

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
      { button: { text: 'Add to Cart', onclick: () => addToCart(product) } }
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

**Coherent.js:**
```javascript
const shoppingCart = createListState([]);
shoppingCart.addToCart = (product) => {
  shoppingCart.addItem(product);
  updateTotal();
};
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

**Coherent.js API (with LRU caching):**
```javascript
const api = createAPI({
  routes: {
    'GET /api/users/:id': async ({ params }) => {
      const user = await getUser(params.id);
      return { status: 200, body: user };
    }
  },
  enableLRUCaching: true,
  cacheSize: 1000
});
```

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
// Server-side component
const Counter = withState({ count: 0 })(({ state, stateUtils }) => {
  const { setState } = stateUtils;
  return {
    div: {
      'data-coherent-component': 'counter',
      children: [
        { p: { text: `Count: ${state.count}` } },
        { button: { text: 'Increment', onclick: () => setState({ count: state.count + 1 }) } }
      ]
    }
  };
});

// Client-side hydration
import { autoHydrate } from '@coherent.js/client';
document.addEventListener('DOMContentLoaded', () => {
  autoHydrate({ counter: Counter });
});
```

### Key Hydration Differences

1. **Event Handler Serialization**: In Coherent.js, event handlers become `data-action` attributes during SSR, then are reconnected during hydration.

2. **Component Identification**: Uses explicit `data-coherent-component` attributes instead of React's reconciliation.

3. **State Initialization**: Extract from DOM or pass through props rather than automatic matching.

### Progressive Enhancement Pattern

```javascript
{
  form: {
    action: '/api/submit',      // Fallback for no-JS
    method: 'POST',
    onsubmit: enhancedSubmit,   // Enhanced with hydration
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

**After (Coherent.js):** `{ button: { text: 'Click me', onclick: handleClick } }`

### Styling

**Before:** `<div className="container highlighted">Content</div>`

**After:** `{ div: { className: 'container highlighted', text: 'Content' } }`

### Data Attributes

**Before:** `<div data-id="123" data-role="button">Content</div>`

**After:** `{ div: { 'data-id': '123', 'data-role': 'button', text: 'Content' } }`

## Performance Optimization

### Bundle Size Optimization

```javascript
// Avoid: Import entire DevTools
import DevTools from '@coherent.js/devtools';

// Recommended: Tree-shakable imports
import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard } from '@coherent.js/devtools/performance';
```

### Production Bundle Results

```
Core: 45.9KB gzipped
State: 8.5KB gzipped
API: 10.6KB gzipped
DevTools (selective): 15.7KB gzipped
Total: 80.7KB gzipped production bundle
Tree Shaking: 79.5% reduction (128.8KB -> 27KB selective)
```

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
8. **Memory Efficiency**: Smart caching and object pooling

## Migration Checklist

### Server-Side Migration

- [ ] Identify components that need to be converted
- [ ] Convert JSX/templates to Coherent.js object structure
- [ ] Replace state management with `withState`
- [ ] Update event handling (onclick, etc.)
- [ ] Add `data-coherent-component` attributes for interactive components
- [ ] Test server-side rendering output

### Client-Side Hydration Setup

- [ ] Install `@coherent.js/client` package
- [ ] Create hydration entry point (`hydration.js`)
- [ ] Set up component registry for `autoHydrate`
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
- [ ] Test bundle size (target: <85KB gzipped)
- [ ] Validate performance (target: 240+ renders/sec)
- [ ] Update build/deployment processes

---

For more details, see [Advanced Components](../components/advanced-components.md), [Hydration Guide](../client/hydration.md), and [Performance Optimizations](../performance-optimizations.md).
