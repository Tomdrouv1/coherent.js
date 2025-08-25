# Client-Side Hydration Guide

Learn how to add interactivity to server-rendered Coherent.js components through client-side hydration.

## What is Hydration?

Hydration is the process of attaching event listeners and making server-rendered HTML interactive on the client-side. Coherent.js provides seamless hydration that maintains the pure JavaScript object philosophy.

## Basic Hydration

### Simple Component Hydration

```javascript
// shared/components.js (used on both server and client)
export const Counter = ({ initialCount = 0 }) => {
  let count = initialCount;
  
  const updateDisplay = () => {
    const element = document.getElementById('counter-display');
    if (element) element.textContent = count;
  };
  
  const increment = () => {
    count++;
    updateDisplay();
  };
  
  const decrement = () => {
    count--;
    updateDisplay();
  };
  
  return {
    div: {
      className: 'counter',
      children: [
        { h2: { text: 'Counter Example' } },
        { div: {
          className: 'counter-display',
          id: 'counter-display',
          text: count.toString()
        }},
        { div: {
          className: 'counter-controls',
          children: [
            { button: {
              onclick: increment,
              text: '+',
              className: 'btn btn-increment'
            }},
            { button: {
              onclick: decrement,
              text: '-',
              className: 'btn btn-decrement'
            }}
          ]
        }}
      ]
    }
  };
};
```

### Server-Side Rendering

```javascript
// server.js
import { renderToString } from 'coherent-js';
import { Counter } from './shared/components.js';

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const component = {
      html: {
        children: [
          { head: {
            children: [
              { title: { text: 'Hydration Example' } },
              { script: { src: '/client.js', defer: true } }
            ]
          }},
          { body: {
            children: [
              Counter({ initialCount: 5 }),
              // Hydration data
              { script: {
                text: `window.__HYDRATION_DATA__ = ${JSON.stringify({
                  counter: { initialCount: 5 }
                })};`
              }}
            ]
          }}
        ]
      }
    };
    
    const html = renderToString(component);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>${html}`);
  }
});
```

### Client-Side Hydration

```javascript
// client.js
import { hydrate, hydrateAll } from 'coherent-js';
import { Counter } from './shared/components.js';

// Hydrate when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get hydration data passed from server
  const hydrationData = window.__HYDRATION_DATA__ || {};
  
  // Find and hydrate counter component
  const counterElement = document.querySelector('.counter');
  if (counterElement) {
    hydrate(counterElement, Counter, hydrationData.counter);
  }
});
```

## Advanced Hydration Patterns

### Automatic Hydration

```javascript
import { autoHydrate, makeHydratable } from 'coherent-js';

// Mark components as hydratable
const HydratableButton = makeHydratable(({ text, onClick }) => ({
  button: {
    className: 'hydratable-btn',
    'data-component': 'HydratableButton',
    onclick: onClick,
    text: text
  }
}));

// Auto-hydrate all marked components
document.addEventListener('DOMContentLoaded', () => {
  autoHydrate({
    HydratableButton: HydratableButton
  });
});
```

### Selective Hydration by Selector

```javascript
import { hydrateBySelector } from 'coherent-js';

// Hydrate all components with specific class
document.addEventListener('DOMContentLoaded', () => {
  hydrateBySelector('.interactive-component', InteractiveComponent, {
    // Component props
    theme: 'dark',
    enableAnimations: true
  });
});
```

### Batch Hydration

```javascript
import { hydrateAll } from 'coherent-js';

document.addEventListener('DOMContentLoaded', () => {
  const elements = [
    document.querySelector('.header'),
    document.querySelector('.sidebar'),
    document.querySelector('.main-content')
  ];
  
  const components = [HeaderComponent, SidebarComponent, MainComponent];
  
  const propsArray = [
    { title: 'My Site' },
    { collapsed: false },
    { content: 'Welcome!' }
  ];
  
  hydrateAll(elements, components, propsArray);
});
```

## State Management

### Component-Level State

```javascript
const TodoApp = ({ initialTodos = [] }) => {
  let todos = [...initialTodos];
  let nextId = Math.max(...todos.map(t => t.id || 0)) + 1;
  
  const render = () => {
    const container = document.getElementById('todo-app');
    if (!container) return;
    
    // Re-render the entire component
    container.innerHTML = '';
    const component = createTodoList();
    container.appendChild(renderToDOM(component));
  };
  
  const addTodo = (text) => {
    todos.push({ id: nextId++, text, completed: false });
    render();
  };
  
  const toggleTodo = (id) => {
    todos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    render();
  };
  
  const removeTodo = (id) => {
    todos = todos.filter(todo => todo.id !== id);
    render();
  };
  
  const createTodoList = () => ({
    div: {
      className: 'todo-app',
      children: [
        { h2: { text: 'Todo List' } },
        { form: {
          onsubmit: (e) => {
            e.preventDefault();
            const input = e.target.querySelector('input');
            if (input.value.trim()) {
              addTodo(input.value.trim());
              input.value = '';
            }
          },
          children: [
            { input: { 
              type: 'text', 
              placeholder: 'Add new todo...',
              className: 'todo-input'
            }},
            { button: { type: 'submit', text: 'Add' } }
          ]
        }},
        { ul: {
          className: 'todo-list',
          children: todos.map(todo => ({
            li: {
              className: todo.completed ? 'completed' : '',
              children: [
                { input: {
                  type: 'checkbox',
                  checked: todo.completed,
                  onchange: () => toggleTodo(todo.id)
                }},
                { span: { text: todo.text, className: 'todo-text' } },
                { button: {
                  text: 'Delete',
                  className: 'delete-btn',
                  onclick: () => removeTodo(todo.id)
                }}
              ]
            }
          }))
        }}
      ]
    }
  });
  
  return createTodoList();
};
```

### Global State Management

```javascript
// store.js - Simple global state management
class SimpleStore {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }
  
  getState() {
    return this.state;
  }
  
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }
  
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const store = new SimpleStore({
  user: null,
  theme: 'light',
  notifications: []
});

// components/UserProfile.js
import { store } from '../store.js';

export const UserProfile = () => {
  let currentUser = store.getState().user;
  
  // Subscribe to state changes
  store.subscribe((state) => {
    if (state.user !== currentUser) {
      currentUser = state.user;
      updateUserDisplay();
    }
  });
  
  const updateUserDisplay = () => {
    const element = document.getElementById('user-profile');
    if (element) {
      element.innerHTML = renderUserContent();
    }
  };
  
  const renderUserContent = () => {
    if (!currentUser) {
      return '<p>Please log in</p>';
    }
    return `
      <h3>Welcome, ${currentUser.name}!</h3>
      <p>Email: ${currentUser.email}</p>
    `;
  };
  
  const login = async (credentials) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const user = await response.json();
      store.setState({ user });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  return {
    div: {
      id: 'user-profile',
      className: 'user-profile',
      html: renderUserContent()
    }
  };
};
```

## Event Handling

### Complex Event Patterns

```javascript
const InteractiveForm = ({ onSubmit }) => {
  const validateField = (field, value) => {
    const errors = {};
    
    if (field === 'email' && !value.includes('@')) {
      errors.email = 'Invalid email address';
    }
    
    if (field === 'password' && value.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    return errors;
  };
  
  const handleFieldChange = (field, value) => {
    const errorElement = document.getElementById(`${field}-error`);
    const errors = validateField(field, value);
    
    if (errorElement) {
      errorElement.textContent = errors[field] || '';
      errorElement.style.display = errors[field] ? 'block' : 'none';
    }
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validate all fields
    const errors = {};
    Object.keys(data).forEach(field => {
      const fieldErrors = validateField(field, data[field]);
      Object.assign(errors, fieldErrors);
    });
    
    if (Object.keys(errors).length > 0) {
      // Show validation errors
      Object.keys(errors).forEach(field => {
        const errorElement = document.getElementById(`${field}-error`);
        if (errorElement) {
          errorElement.textContent = errors[field];
          errorElement.style.display = 'block';
        }
      });
      return;
    }
    
    // Submit form
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  };
  
  return {
    form: {
      className: 'interactive-form',
      onsubmit: handleSubmit,
      children: [
        { div: {
          className: 'form-group',
          children: [
            { label: { text: 'Email:', for: 'email' } },
            { input: {
              type: 'email',
              id: 'email',
              name: 'email',
              required: true,
              oninput: (e) => handleFieldChange('email', e.target.value)
            }},
            { div: {
              id: 'email-error',
              className: 'error-message',
              style: 'display: none; color: red;'
            }}
          ]
        }},
        { div: {
          className: 'form-group',
          children: [
            { label: { text: 'Password:', for: 'password' } },
            { input: {
              type: 'password',
              id: 'password',
              name: 'password',
              required: true,
              oninput: (e) => handleFieldChange('password', e.target.value)
            }},
            { div: {
              id: 'password-error',
              className: 'error-message',
              style: 'display: none; color: red;'
            }}
          ]
        }},
        { button: {
          type: 'submit',
          text: 'Submit',
          className: 'submit-btn'
        }}
      ]
    }
  };
};
```

### Custom Event System

```javascript
// EventBus for component communication
class EventBus {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

export const eventBus = new EventBus();

// Component using event bus
const ShoppingCart = ({ items = [] }) => {
  let cartItems = [...items];
  
  // Listen for add to cart events
  eventBus.on('addToCart', (product) => {
    cartItems.push(product);
    updateCartDisplay();
  });
  
  // Listen for remove from cart events
  eventBus.on('removeFromCart', (productId) => {
    cartItems = cartItems.filter(item => item.id !== productId);
    updateCartDisplay();
  });
  
  const updateCartDisplay = () => {
    const element = document.getElementById('cart-items');
    if (element) {
      element.innerHTML = renderCartItems();
    }
    
    const countElement = document.getElementById('cart-count');
    if (countElement) {
      countElement.textContent = cartItems.length.toString();
    }
  };
  
  const renderCartItems = () => {
    return cartItems.map(item => `
      <div class="cart-item">
        <span>${item.name}</span>
        <span>$${item.price}</span>
        <button onclick="eventBus.emit('removeFromCart', ${item.id})">Remove</button>
      </div>
    `).join('');
  };
  
  return {
    div: {
      className: 'shopping-cart',
      children: [
        { h3: { text: 'Shopping Cart' } },
        { div: {
          className: 'cart-count',
          children: [
            { span: { text: 'Items: ' } },
            { span: { id: 'cart-count', text: cartItems.length.toString() } }
          ]
        }},
        { div: { id: 'cart-items', html: renderCartItems() } }
      ]
    }
  };
};
```

## Performance Optimization

### Lazy Hydration

```javascript
// Intersection Observer for lazy hydration
const createLazyHydrator = (component, props = {}) => {
  return (element) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Element is visible, hydrate it
          hydrate(entry.target, component, props);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '100px' // Start loading 100px before visible
    });
    
    observer.observe(element);
  };
};

// Usage
document.addEventListener('DOMContentLoaded', () => {
  // Hydrate immediately visible components
  const header = document.querySelector('.header');
  if (header) {
    hydrate(header, HeaderComponent);
  }
  
  // Lazy hydrate below-fold components
  const lazyComponents = document.querySelectorAll('.lazy-component');
  lazyComponents.forEach(element => {
    const componentType = element.dataset.component;
    const lazyHydrator = createLazyHydrator(componentMap[componentType]);
    lazyHydrator(element);
  });
});
```

### Selective Event Binding

```javascript
import { enableClientEvents } from 'coherent-js';

// Only enable events on specific parts of the page
document.addEventListener('DOMContentLoaded', () => {
  // Enable events only for interactive sections
  const interactiveSections = [
    document.querySelector('.interactive-form'),
    document.querySelector('.navigation'),
    document.querySelector('.sidebar')
  ];
  
  interactiveSections.forEach(section => {
    if (section) {
      enableClientEvents(section);
    }
  });
});
```

### Hydration Error Handling

```javascript
const safeHydrate = async (element, component, props = {}) => {
  try {
    const instance = await hydrate(element, component, props);
    console.log('Successfully hydrated:', component.name || 'Anonymous component');
    return instance;
  } catch (error) {
    console.error('Hydration failed for element:', element, error);
    
    // Add error indicator to element
    element.classList.add('hydration-failed');
    element.title = 'Interactive features unavailable';
    
    // Optionally report error to monitoring service
    if (window.errorReporting) {
      window.errorReporting.captureException(error, {
        tags: {
          type: 'hydration-error',
          component: component.name || 'unknown'
        }
      });
    }
    
    return null;
  }
};

// Batch hydration with error handling
const hydrateWithRetry = async (elements, components, propsArray = []) => {
  const results = [];
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const component = components[i];
    const props = propsArray[i] || {};
    
    try {
      const instance = await safeHydrate(element, component, props);
      results.push(instance);
    } catch (error) {
      console.warn(`Skipping hydration for element ${i}:`, error);
      results.push(null);
    }
  }
  
  return results;
};
```

## Best Practices

### 1. Server-Client Code Sharing

```javascript
// shared/components.js - Works on both server and client
export const Button = ({ text, onClick, variant = 'primary' }) => ({
  button: {
    className: `btn btn--${variant}`,
    onclick: onClick,
    text: text
  }
});

// Only attach event listeners on client
if (typeof window !== 'undefined') {
  // Client-only code
}

// Only use Node.js APIs on server
if (typeof process !== 'undefined') {
  // Server-only code
}
```

### 2. Progressive Enhancement

```javascript
// Ensure base functionality works without JavaScript
const ProgressiveForm = ({ action, method = 'POST' }) => ({
  form: {
    action: action,      // Works without JS
    method: method,      // Works without JS
    className: 'progressive-form',
    onsubmit: (e) => {   // Enhanced with JS
      e.preventDefault();
      // AJAX submission
      handleAjaxSubmit(e);
    },
    children: [
      // Form fields...
    ]
  }
});
```

### 3. Hydration Data Management

```javascript
// Serialize complex data safely
const serializeHydrationData = (data) => {
  return JSON.stringify(data, (key, value) => {
    // Handle dates
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    
    // Handle functions (remove them)
    if (typeof value === 'function') {
      return undefined;
    }
    
    return value;
  });
};

const deserializeHydrationData = (json) => {
  return JSON.parse(json, (key, value) => {
    // Restore dates
    if (value && value.__type === 'Date') {
      return new Date(value.value);
    }
    
    return value;
  });
};
```

## Next Steps

- [Advanced Components](../components/advanced-components.md) - Complex component patterns
- [State Management](../components/state-management.md) - Managing application state
- [Performance Optimization](../performance/optimization.md) - Advanced performance techniques