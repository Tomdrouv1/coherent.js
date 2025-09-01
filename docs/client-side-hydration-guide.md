# 🌊 Client-Side Hydration Guide

This guide covers how to set up and use client-side hydration in Coherent.js to make server-rendered components interactive in the browser.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Basic Hydration](#basic-hydration)
3. [State Management Hydration](#state-management-hydration)
4. [Auto-Hydration](#auto-hydration)
5. [Event Handler Mapping](#event-handler-mapping)
6. [Custom Hydration Scenarios](#custom-hydration-scenarios)
7. [Best Practices](#best-practices)
8. [Debugging](#debugging)
9. [Common Issues](#common-issues)

## Quick Start

The simplest way to hydrate a Coherent.js component:

```javascript
import { hydrate } from '@coherentjs/client';
import { MyComponent } from './components/MyComponent.js';

document.addEventListener('DOMContentLoaded', () => {
  const element = document.getElementById('app');
  hydrate(element, MyComponent, { name: 'World' });
});
```

## Basic Hydration

### Single Component Hydration

For hydrating a single component without state:

```javascript
// components/Greeting.js
export function Greeting({ name = 'World' }) {
  return {
    div: {
      className: 'greeting',
      'data-coherent-component': 'greeting',
      children: [
        { h1: { text: `Hello, ${name}!` } },
        { p: { text: 'Welcome to Coherent.js' } }
      ]
    }
  };
}

// client.js
import { hydrate } from '@coherentjs/client';
import { Greeting } from './components/Greeting.js';

document.addEventListener('DOMContentLoaded', () => {
  const greetingEl = document.querySelector('[data-coherent-component="greeting"]');
  if (greetingEl) {
    hydrate(greetingEl, Greeting, { name: 'Developer' });
  }
});
```

### Making Components Hydratable

For better organization, make components explicitly hydratable:

```javascript
// components/Greeting.js
import { makeHydratable } from '@coherentjs/client';

function GreetingComponent({ name = 'World' }) {
  return {
    div: {
      className: 'greeting',
      'data-coherent-component': 'greeting',
      children: [
        { h1: { text: `Hello, ${name}!` } },
        { p: { text: 'Welcome to Coherent.js' } }
      ]
    }
  };
}

export const Greeting = makeHydratable(GreetingComponent, {
  componentName: 'greeting'
});

// client.js
import { autoHydrate } from '@coherentjs/client';
import { Greeting } from './components/Greeting.js';

document.addEventListener('DOMContentLoaded', () => {
  autoHydrate({
    greeting: Greeting
  });
});
```

## State Management Hydration

### Using withState Components

Components created with `withState` require special handling for hydration:

```javascript
// components/Counter.js
import { withState } from '@coherentjs/core';

const CounterComponent = withState({
  count: 0,
  step: 1
}, {
  debug: true
});

const CounterView = (props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;

  const increment = () => {
    setState({ count: state.count + state.step });
  };

  const decrement = () => {
    setState({ count: state.count - state.step });
  };

  const changeStep = (event) => {
    const newStep = parseInt(event.target.value, 10) || 1;
    setState({ step: newStep });
  };

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
              { 
                button: { 
                  text: 'Decrement', 
                  onclick: decrement,
                  className: 'btn-decrement'
                }
              },
              {
                input: {
                  type: 'number',
                  value: state.step,
                  min: 1,
                  max: 10,
                  oninput: changeStep,
                  className: 'step-input'
                }
              },
              { 
                button: { 
                  text: 'Increment', 
                  onclick: increment,
                  className: 'btn-increment'
                }
              }
            ]
          }
        }
      ]
    }
  };
};

export const Counter = CounterComponent(CounterView);
```

### Hydrating Stateful Components

```javascript
// client.js
import { hydrate, makeHydratable } from '@coherentjs/client';
import { Counter } from './components/Counter.js';

// Method 1: Direct hydration
document.addEventListener('DOMContentLoaded', () => {
  const counterEl = document.querySelector('[data-coherent-component="counter"]');
  if (counterEl) {
    // Extract initial state from data attributes if needed
    const initialState = {
      count: parseInt(counterEl.getAttribute('data-initial-count') || '0'),
      step: 1
    };
    
    hydrate(counterEl, Counter, {}, { initialState });
  }
});

// Method 2: Auto-hydration
const HydratableCounter = makeHydratable(Counter, {
  componentName: 'counter'
});

autoHydrate({
  counter: HydratableCounter
});
```

## Auto-Hydration

### Multiple Component Auto-Hydration

For pages with multiple interactive components:

```javascript
// hydration.js
import { autoHydrate, makeHydratable } from '@coherentjs/client';
import { Counter } from './components/Counter.js';
import { TodoList } from './components/TodoList.js';
import { ContactForm } from './components/ContactForm.js';

// Make all components hydratable
const componentRegistry = {
  counter: makeHydratable(Counter, { componentName: 'counter' }),
  todolist: makeHydratable(TodoList, { componentName: 'todolist' }),
  contactform: makeHydratable(ContactForm, { componentName: 'contactform' })
};

// Auto-hydrate when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  autoHydrate(componentRegistry);
});
```

### Selective Hydration

Only hydrate components that need interactivity:

```javascript
// selective-hydration.js
document.addEventListener('DOMContentLoaded', () => {
  // Only hydrate if the page has interactive components
  const interactiveComponents = document.querySelectorAll('[data-coherent-component][data-interactive="true"]');
  
  if (interactiveComponents.length > 0) {
    import('./full-hydration.js').then(({ initializeHydration }) => {
      initializeHydration();
    });
  }
});
```

## Event Handler Mapping

### Understanding Data-Action Attributes

During server-side rendering, Coherent.js converts function event handlers to data attributes:

```javascript
// Server renders this component:
{
  button: {
    text: 'Click me',
    onclick: () => console.log('Clicked!')
  }
}

// Becomes this HTML:
// <button data-action="__coherent_action_1234567890_abc123" data-event="click">Click me</button>
```

### Auto-Reconnecting Event Handlers

The hydration system automatically reconnects these handlers:

```javascript
import { hydrate } from '@coherentjs/client';

// The hydration system will:
// 1. Find all elements with data-action attributes
// 2. Look up the functions in the global action registry
// 3. Attach the appropriate event listeners
// 4. Provide component context (state, setState) to handlers

document.addEventListener('DOMContentLoaded', () => {
  // This automatically handles data-action reconnection
  autoHydrate(componentRegistry);
});
```

### Manual Event Handler Setup

For complex cases, you might need manual event handler setup:

```javascript
// manual-handlers.js
function setupCustomHandlers() {
  // Find buttons that need special handling
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

## Custom Hydration Scenarios

### Performance Page Example

Here's a real-world example from a performance testing page:

```javascript
// performance-hydration.js
async function setupPerformancePageHydration() {
  // Wait for all scripts to load
  await waitForScriptsLoaded();
  
  // Check if this is the performance page
  const performancePage = document.querySelector('[data-coherent-component="performance"]');
  if (!performancePage) return;
  
  console.log('🎯 Setting up performance page hydration...');
  
  // Map button IDs to global functions
  const buttonMappings = [
    { id: 'run-all-tests', handler: 'runPerformanceTests' },
    { id: 'run-render-test', handler: 'runRenderingTest' },
    { id: 'run-cache-test', handler: 'runCacheTest' },
    { id: 'clear-results', handler: 'clearResults' }
  ];
  
  buttonMappings.forEach(mapping => {
    const button = document.getElementById(mapping.id);
    const handler = window[mapping.handler];
    
    if (button && handler) {
      // Clean up any conflicting attributes
      button.removeAttribute('data-action');
      button.removeAttribute('data-event');
      
      // Clone button to remove all existing listeners
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Attach clean event listener
      newButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        
        console.log(`🎯 Executing ${mapping.handler}`);
        handler();
      });
      
      console.log(`✅ Connected ${mapping.id} to ${mapping.handler}`);
    }
  });
}

function waitForScriptsLoaded() {
  return new Promise(resolve => {
    if (document.readyState === 'complete') {
      setTimeout(resolve, 100); // Small delay for deferred scripts
    } else {
      window.addEventListener('load', () => {
        setTimeout(resolve, 100);
      });
    }
  });
}

// Initialize
setupPerformancePageHydration();
```

### Form Enhancement

Enhance server-rendered forms with client-side features:

```javascript
// form-enhancement.js
import { hydrate } from '@coherentjs/client';

function enhanceForm(formElement) {
  // Add client-side validation
  const submitHandler = (event) => {
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    // Client-side validation
    if (!validateData(data)) {
      event.preventDefault();
      showValidationErrors();
      return;
    }
    
    // Enhance with loading state
    event.preventDefault();
    submitWithLoadingState(data);
  };
  
  formElement.addEventListener('submit', submitHandler);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-enhance="true"]').forEach(enhanceForm);
});
```

## Best Practices

### 1. Component Identification

Always use `data-coherent-component` attributes:

```javascript
// ✅ Good
{
  div: {
    'data-coherent-component': 'my-component',
    className: 'my-component',
    children: [...]
  }
}

// ❌ Bad - no identification
{
  div: {
    className: 'my-component',
    children: [...]
  }
}
```

### 2. Timing and Loading

Handle timing properly:

```javascript
// ✅ Good - proper timing
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    // Small delay ensures deferred scripts are loaded
    initializeHydration();
  }, 100);
});

// ❌ Bad - too early
initializeHydration(); // Scripts might not be loaded yet
```

### 3. Progressive Enhancement

Ensure functionality works without JavaScript:

```javascript
// ✅ Good - works without JS
{
  form: {
    action: '/api/submit',
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

Always include error handling:

```javascript
// ✅ Good - with error handling
try {
  hydrate(element, Component, props);
  console.log('✅ Hydration successful');
} catch (error) {
  console.error('❌ Hydration failed:', error);
  // Fallback behavior
}
```

### 5. State Preservation

For stateful components, preserve initial state:

```javascript
// ✅ Good - preserve server state
const initialState = extractStateFromDOM(element);
hydrate(element, Component, props, { initialState });

function extractStateFromDOM(element) {
  const stateAttr = element.getAttribute('data-coherent-state');
  return stateAttr ? JSON.parse(stateAttr) : {};
}
```

## Debugging

### Enable Debug Mode

```javascript
// Enable debugging for state components
const DebugComponent = withState(initialState, {
  debug: true // Logs all state changes
});

// Enable hydration debugging
window.COHERENT_DEBUG = true;

// Add custom logging
console.log('🌊 Starting hydration...');
console.log('Available functions:', Object.keys(window).filter(k => typeof window[k] === 'function'));
console.log('Components found:', document.querySelectorAll('[data-coherent-component]'));
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

// Verify button connections
document.querySelectorAll('button[id]').forEach(btn => {
  const hasListeners = btn.cloneNode().onclick !== null;
  console.log(`Button ${btn.id}: ${hasListeners ? 'has' : 'no'} listeners`);
});
```

## Common Issues

### Issue: Buttons Don't Work

**Symptoms:** Clicking buttons has no effect, no console errors

**Solutions:**
1. Check if functions are loaded:
   ```javascript
   console.log(typeof window.myFunction); // Should be 'function'
   ```

2. Verify timing:
   ```javascript
   // Add delay for script loading
   setTimeout(initHydration, 200);
   ```

3. Check for conflicting handlers:
   ```javascript
   // Remove conflicting attributes
   button.removeAttribute('data-action');
   ```

### Issue: State Not Updating

**Symptoms:** Component renders but state changes don't reflect

**Solutions:**
1. Ensure proper setState usage:
   ```javascript
   // ✅ Correct
   setState({ count: state.count + 1 });
   
   // ❌ Wrong
   state.count += 1; // Direct mutation
   ```

2. Check component structure:
   ```javascript
   // Component must be wrapped with withState
   const MyComponent = withState(initialState)(MyView);
   ```

### Issue: Hydration Mismatch

**Symptoms:** Console warnings about hydration mismatches

**Solutions:**
1. Ensure server and client render identically:
   ```javascript
   // Use same props on server and client
   const props = { timestamp: '2024-01-01' }; // Fixed timestamp
   ```

2. Handle client-only content properly:
   ```javascript
   const isClient = typeof window !== 'undefined';
   {
     div: {
       text: isClient ? new Date().toISOString() : ''
     }
   }
   ```

### Issue: Memory Leaks

**Symptoms:** Performance degrades over time

**Solutions:**
1. Clean up event listeners:
   ```javascript
   // Store references for cleanup
   const handlers = new Map();
   
   function attachHandler(element, handler) {
     const wrappedHandler = (e) => handler(e);
     element.addEventListener('click', wrappedHandler);
     handlers.set(element, wrappedHandler);
   }
   
   function cleanup() {
     handlers.forEach((handler, element) => {
       element.removeEventListener('click', handler);
     });
     handlers.clear();
   }
   ```

2. Use component destroy methods:
   ```javascript
   const instance = hydrate(element, Component, props);
   
   // Later, when component is no longer needed
   if (instance && instance.destroy) {
     instance.destroy();
   }
   ```

---

## Related Documentation

- [API Reference](api-reference.md) - Complete API documentation
- [Component System](components/basic-components.md) - Component creation guide  
- [State Management](components/state-management.md) - Using withState
- [Performance Guide](performance-optimizations.md) - Optimization strategies