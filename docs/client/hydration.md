# Client-Side Hydration in Coherent.js

> **1.0 update:** The legacy hydration helpers (`hydrateAll`, `hydrateBySelector`, `makeHydratable`, `autoHydrate`, `enableClientEvents`, `registerEventHandler`) were removed in 1.0. Use the unified `hydrate()` API documented below. See [`MIGRATION-1.0.md`](../../MIGRATION-1.0.md) for migration help.

This guide covers how to add interactivity to server-rendered Coherent.js components through client-side hydration -- from basic setup to advanced patterns.

## What is Hydration?

Hydration is the process of attaching event listeners and making server-rendered HTML interactive on the client-side. When a component is hydrated, event listeners are attached, state is initialized, and the component becomes fully interactive. Coherent.js provides seamless hydration that maintains the pure JavaScript object philosophy.

## Quick Start

```javascript
import { hydrate } from '@coherent.js/client';
import { MyComponent } from './components/MyComponent.js';

document.addEventListener('DOMContentLoaded', () => {
  const element = document.getElementById('app');
  hydrate(MyComponent, element, { initialState: { name: 'World' } });
});
```

## Hydration Utilities

### `hydrate(component, container, options)`

Hydrates a single DOM container with a Coherent component. Returns `{ unmount, rerender, getState, setState }` for lifecycle control.

```javascript
import { hydrate } from '@coherent.js/client';

const container = document.getElementById('my-component');
const instance = hydrate(MyComponent, container, { initialState: { count: 0 } });
```

Options: `initialState` (object — initial state for the component), `detectMismatch` (boolean — default `true` in dev), `strict` (boolean — throw on mismatch instead of warn), `onMismatch` (function — custom mismatch handler), `props` (object — additional props merged with state).

## Server-Side Rendering with Hydration

### Server-side (Node.js)

```javascript
import { render } from '@coherent.js/core';

function Counter(props) {
  return {
    div: {
      className: 'counter',
      'data-coherent-component': 'Counter',
      children: [
        { h3: { text: 'Counter' } },
        { span: { text: `Count: ${props.count}` } },
        { button: { 'data-action': 'increment', text: 'Increment' } },
        { button: { 'data-action': 'decrement', text: 'Decrement' } }
      ]
    }
  };
}

const html = render(Counter({ count: 0 }));

res.send(`
<!DOCTYPE html>
<html>
<head><title>Hydration Example</title></head>
<body>
  <div id="counter">${html}</div>
  <script type="module" src="/hydration.js"></script>
</body>
</html>
`);
```

Bundle the browser entrypoint:

```bash
npx esbuild client.js --bundle --format=esm --outfile=public/hydration.js
```

### Client-side (Browser)

```javascript
import { hydrate } from '@coherent.js/client';
import { Counter } from './components/Counter.js';

document.addEventListener('DOMContentLoaded', () => {
  const counterEl = document.getElementById('counter');
  if (counterEl) hydrate(Counter, counterEl);
});
```

## Hydrating Stateful Components

Components created with `withState` require special handling:

```javascript
// components/Counter.js
import { withState } from '@coherent.js/core';

const CounterComponent = withState({ count: 0, step: 1 }, { debug: true });

const CounterView = (props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;

  return {
    div: {
      className: 'counter',
      'data-coherent-component': 'counter',
      children: [
        { h2: { text: `Count: ${state.count}` } },
        {
          div: {
            className: 'controls',
            children: [
              { button: { text: 'Decrement', onclick: () => setState({ count: state.count - state.step }) } },
              { input: { type: 'number', value: state.step, min: 1, max: 10, oninput: (e) => setState({ step: parseInt(e.target.value, 10) || 1 }) } },
              { button: { text: 'Increment', onclick: () => setState({ count: state.count + state.step }) } }
            ]
          }
        }
      ]
    }
  };
};

export const Counter = CounterComponent(CounterView);

// client.js - Hydration
import { hydrate } from '@coherent.js/client';
import { Counter } from './components/Counter.js';

document.addEventListener('DOMContentLoaded', () => {
  const counterEl = document.querySelector('[data-coherent-component="counter"]');
  if (counterEl) {
    const initialState = {
      count: parseInt(counterEl.getAttribute('data-initial-count') || '0'),
      step: 1
    };
    hydrate(Counter, counterEl, { initialState });
  }
});
```

## Component Instance API

When a component is hydrated, it returns an instance object:

### `update(newProps)`

```javascript
instance.update({ count: 10 });
```

### `setState(newState)`

```javascript
instance.setState({ count: 15 });
```

### `destroy()`

Cleans up event listeners and tears down the component.

```javascript
instance.destroy();
```

## Event Handling

### Data-Action Attributes

During server-side rendering, Coherent.js converts function event handlers to data attributes:

```javascript
// Component definition:
{ button: { text: 'Click me', onclick: () => console.log('Clicked!') } }

// Renders as HTML:
// <button data-action="__coherent_action_1234567890_abc123" data-event="click">Click me</button>
```

The hydration system automatically reconnects these handlers by finding elements with `data-action` attributes, looking up functions in the global registry, and attaching event listeners.

### Manual Event Handler Setup

For complex cases:

```javascript
function setupCustomHandlers() {
  const specialButtons = document.querySelectorAll('[data-special-handler]');
  
  specialButtons.forEach(button => {
    const handlerName = button.getAttribute('data-special-handler');
    const handler = window[handlerName];
    
    if (handler && typeof handler === 'function') {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        handler(event);
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', setupCustomHandlers);
```

## State Management During Hydration

### Component-Level State

```javascript
const TodoApp = ({ initialTodos = [] }) => {
  let todos = [...initialTodos];
  
  const addTodo = (text) => {
    todos.push({ id: Date.now(), text, completed: false });
    render();
  };

  const toggleTodo = (id) => {
    todos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    render();
  };

  return {
    div: {
      className: 'todo-app',
      children: [
        { h2: { text: 'Todo List' } },
        { ul: {
          children: todos.map(todo => ({
            li: {
              className: todo.completed ? 'completed' : '',
              children: [
                { input: { type: 'checkbox', checked: todo.completed, onchange: () => toggleTodo(todo.id) } },
                { span: { text: todo.text } }
              ]
            }
          }))
        }}
      ]
    }
  };
};
```

### Global State Management

```javascript
class SimpleStore {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }
  
  getState() { return this.state; }
  
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }
  
  subscribe(listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }
}

export const store = new SimpleStore({
  user: null,
  theme: 'light',
  notifications: []
});
```

## Advanced Hydration

### Selective Hydration

Only hydrate components that need interactivity:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const interactiveComponents = document.querySelectorAll('[data-coherent-component][data-interactive="true"]');
  
  if (interactiveComponents.length > 0) {
    import('./full-hydration.js').then(({ initializeHydration }) => {
      initializeHydration();
    });
  }
});
```

### Lazy Hydration

Use IntersectionObserver to hydrate components only when visible:

```javascript
const createLazyHydrator = (component, props = {}) => {
  return (element) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          hydrate(component, entry.target, { props });
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '100px'
    });
    
    observer.observe(element);
  };
};

document.addEventListener('DOMContentLoaded', () => {
  // Hydrate immediately visible components
  const header = document.querySelector('.header');
  if (header) hydrate(HeaderComponent, header);
  
  // Lazy hydrate below-fold components
  const lazyComponents = document.querySelectorAll('.lazy-component');
  lazyComponents.forEach(element => {
    const componentType = element.dataset.component;
    const lazyHydrator = createLazyHydrator(componentMap[componentType]);
    lazyHydrator(element);
  });
});
```

### Form Enhancement

Enhance server-rendered forms with client-side features:

```javascript
import { hydrate } from '@coherent.js/client';

function enhanceForm(formElement) {
  const submitHandler = (event) => {
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    if (!validateData(data)) {
      event.preventDefault();
      showValidationErrors();
      return;
    }
    
    event.preventDefault();
    submitWithLoadingState(data);
  };
  
  formElement.addEventListener('submit', submitHandler);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-enhance="true"]').forEach(enhanceForm);
});
```

### Hydration Error Handling

```javascript
const safeHydrate = async (component, container, props = {}) => {
  try {
    const instance = await hydrate(component, container, { props });
    console.log('Successfully hydrated:', component.name || 'Anonymous component');
    return instance;
  } catch (error) {
    console.error('Hydration failed for element:', element, error);
    element.classList.add('hydration-failed');
    element.title = 'Interactive features unavailable';
    
    if (window.errorReporting) {
      window.errorReporting.captureException(error, {
        tags: { type: 'hydration-error', component: component.name || 'unknown' }
      });
    }
    
    return null;
  }
};

const hydrateWithRetry = async (elements, components, propsArray = []) => {
  const results = [];
  for (let i = 0; i < elements.length; i++) {
    try {
      results.push(await safeHydrate(elements[i], components[i], propsArray[i] || {}));
    } catch (error) {
      console.warn(`Skipping hydration for element ${i}:`, error);
      results.push(null);
    }
  }
  return results;
};
```

### Hydration Data Management

Serialize complex data safely for hydration:

```javascript
const serializeHydrationData = (data) => {
  return JSON.stringify(data, (key, value) => {
    if (value instanceof Date) return { __type: 'Date', value: value.toISOString() };
    if (typeof value === 'function') return undefined;
    return value;
  });
};

const deserializeHydrationData = (json) => {
  return JSON.parse(json, (key, value) => {
    if (value && value.__type === 'Date') return new Date(value.value);
    return value;
  });
};
```

## Best Practices

### 1. Component Identification

Always use `data-coherent-component` attributes:

```javascript
// Good
{ div: { 'data-coherent-component': 'my-component', className: 'my-component', children: [...] } }

// Bad - no identification
{ div: { className: 'my-component', children: [...] } }
```

### 2. Timing and Loading

```javascript
// Good - proper timing
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initializeHydration();
  }, 100);
});

// Bad - too early
initializeHydration(); // Scripts might not be loaded yet
```

### 3. Progressive Enhancement

Ensure functionality works without JavaScript:

```javascript
{
  form: {
    action: '/api/submit',          // Works without JS
    method: 'POST',
    onsubmit: clientSideEnhancement, // Enhanced with JS
    children: [
      { input: { name: 'email', type: 'email', required: true } },
      { button: { type: 'submit', text: 'Submit' } }
    ]
  }
}
```

### 4. Error Handling

```javascript
try {
  hydrate(Component, container, { props });
  console.log('Hydration successful');
} catch (error) {
  console.error('Hydration failed:', error);
}
```

### 5. State Preservation

```javascript
const initialState = extractStateFromDOM(container);
hydrate(Component, container, { initialState, props });

function extractStateFromDOM(element) {
  const stateAttr = element.getAttribute('data-coherent-state');
  return stateAttr ? JSON.parse(stateAttr) : {};
}
```

### 6. Server-Client Code Sharing

```javascript
// shared/components.js - Works on both server and client
export const Button = ({ text, onClick, variant = 'primary' }) => ({
  button: {
    className: `btn btn--${variant}`,
    onclick: onClick,
    text: text
  }
});

if (typeof window !== 'undefined') {
  // Client-only code
}

if (typeof process !== 'undefined') {
  // Server-only code
}
```

## Debugging

### Enable Debug Mode

```javascript
// For state components
const DebugComponent = withState(initialState, { debug: true });

// For hydration
window.COHERENT_DEBUG = true;
```

### Common Debug Patterns

```javascript
// Check if components are found
const components = document.querySelectorAll('[data-coherent-component]');
console.log(`Found ${components.length} components to hydrate`);

// Check if handlers are available
const requiredHandlers = ['runPerformanceTests', 'clearResults'];
const availableHandlers = requiredHandlers.filter(name => typeof window[name] === 'function');
console.log(`Available handlers: ${availableHandlers.join(', ')}`);
```

## Troubleshooting

### "Hydration can only be performed in a browser environment"

This error occurs when trying to hydrate in Node.js. Make sure hydration code only runs in the browser.

### Buttons don't work after hydration

1. Check if functions are loaded: `console.log(typeof window.myFunction);`
2. Verify timing: `setTimeout(initHydration, 200);`
3. Check for conflicting handlers: `button.removeAttribute('data-action');`

### State not updating

1. Ensure proper `setState` usage (not direct mutation)
2. Check that the component was properly wrapped with `withState`

### Hydration mismatch

1. Ensure server and client render identically
2. Handle client-only content: `const isClient = typeof window !== 'undefined';`

### Memory leaks

1. Clean up event listeners when components are removed
2. Use `instance.destroy()` when components are no longer needed

```javascript
const instance = hydrate(Component, container, { props });
// Later:
if (instance && instance.unmount) {
  instance.unmount();
}
```

## Browser Support

Hydration requires a modern browser with support for ES modules. For older browsers, you may need to transpile the code or provide polyfills.

---

## Related Documentation

- [Basic Components](../components/basics.md) - Component creation guide
- [State Management](../components/state.md) - Using withState
- [Performance Guide](../performance-optimizations.md) - Optimization strategies
