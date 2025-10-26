# Coherent.js Migration Guide

This guide helps developers migrate from traditional frameworks (React, Vue, etc.) or template engines (Handlebars, EJS, etc.) to Coherent.js.

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
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

**Coherent.js with withState:**
```javascript
import { withState } from '@coherentjs/core';

const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    children: [
      { p: { text: `Count: ${state.count}` } },
      { 
        button: { 
          text: 'Increment', 
          onclick: () => setState({ count: state.count + 1 })
        }
      }
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
      {user ? (
        <p>Welcome, {user.name}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

**Coherent.js:**
```javascript
import { when } from '@coherentjs/core';

function UserProfile({ user }) {
  return {
    div: {
      children: [
        when(user,
          { p: { text: `Welcome, ${user.name}!` } },
          { p: { text: 'Please log in' } }
        )
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
import { forEach } from '@coherentjs/core';

function TodoList({ todos }) {
  return {
    ul: {
      children: forEach(todos, (todo) => ({
        li: { 
          text: todo.text,
          className: todo.completed ? 'completed' : 'pending'
        }
      }))
    }
  };
}
```

## From Template Engines (Handlebars, EJS, etc.)

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
import { when } from '@coherentjs/core';

function UserProfile({ user }) {
  return {
    div: {
      children: [
        when(user,
          { p: { text: `Welcome, ${user.name}!` } },
          { p: { text: 'Please log in' } }
        )
      ]
    }
  };
}
```

### Loops

**Handlebars:**
```handlebars
<ul>
  {{#each todos}}
    <li class="{{#if completed}}completed{{else}}pending{{/if}}">
      {{text}}
    </li>
  {{/each}}
</ul>
```

**Coherent.js:**
```javascript
import { forEach } from '@coherentjs/core';

function TodoList({ todos }) {
  return {
    ul: {
      children: forEach(todos, (todo) => ({
        li: { 
          text: todo.text,
          className: todo.completed ? 'completed' : 'pending'
        }
      }))
    }
  };
}
```

## From String Concatenation

### Basic HTML Generation

**String Concatenation:**
```javascript
function createGreeting(name) {
  return `<div class="greeting">
    <h1>Hello, ${name}!</h1>
  </div>`;
}
```

**Coherent.js:**
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

// Render with:
import { renderToString } from '@coherentjs/core';
const html = renderToString(Greeting({ name: 'World' }));
```

## Client-Side Hydration for Interactive Components

One of the most critical aspects when migrating from client-side frameworks is understanding how to make server-rendered components interactive in the browser.

### From React Hydration to Coherent.js Hydration

**React with Next.js:**
```jsx
// pages/counter.js
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// Client-side hydration happens automatically
```

**Coherent.js with Manual Hydration:**
```javascript
// Server-side component (components/Counter.js)
import { withState } from '../../../src/coherent.js';

const CounterComponent = withState({ count: 0 }, { debug: true });

const CounterView = (props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;

  const increment = () => {
    setState({ count: state.count + 1 });
  };

  return {
    div: {
      'data-coherent-component': 'counter',
      children: [
        { p: { text: `Count: ${state.count}` } },
        { 
          button: { 
            id: 'increment-btn',
            text: 'Increment', 
            onclick: increment  // Becomes data-action attribute
          }
        }
      ]
    }
  };
};

export const Counter = CounterComponent(CounterView);

// Client-side hydration (hydration.js)
import { hydrate, autoHydrate } from '@coherentjs/client';
import { Counter } from './components/Counter.js';

document.addEventListener('DOMContentLoaded', () => {
  autoHydrate({
    counter: Counter
  });
});
```

### Key Hydration Concepts for Migrants

#### 1. Event Handler Serialization

**In React:** Event handlers stay as functions, hydration reconnects them automatically.

**In Coherent.js:** Event handlers become `data-action` attributes during SSR:
```html
<!-- Server renders: -->
<button data-action="__coherent_action_123_abc" data-event="click">Increment</button>

<!-- Client hydration reconnects the original function -->
```

#### 2. Component Identification

**React:** Uses component names and React's reconciliation algorithm.

**Coherent.js:** Uses explicit `data-coherent-component` attributes:
```javascript
{
  div: {
    'data-coherent-component': 'my-component', // Required for hydration
    children: [...]
  }
}
```

#### 3. State Initialization

**React with Next.js:**
```jsx
function MyComponent({ initialData }) {
  const [state, setState] = useState(initialData);
  // Hydration matches server state automatically
}
```

**Coherent.js:**
```javascript
// Method 1: Extract from DOM
const initialState = extractStateFromDOM(element);
hydrate(element, Component, props, { initialState });

// Method 2: Pass through props
const Component = withState(serverState)(View);
```

### Migration Pattern: Interactive Forms

**From React Form:**
```jsx
function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitForm(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**To Coherent.js with Hydration:**
```javascript
// Server-side component
const ContactFormComponent = withState({ 
  name: '', 
  email: '', 
  isSubmitting: false 
});

const ContactFormView = ({ state, stateUtils }) => {
  const { setState } = stateUtils;
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ isSubmitting: true });
    
    const formData = new FormData(event.target);
    await submitForm(Object.fromEntries(formData));
    
    setState({ isSubmitting: false, name: '', email: '' });
  };

  const updateName = (event) => {
    setState({ name: event.target.value });
  };

  return {
    form: {
      'data-coherent-component': 'contact-form',
      onsubmit: handleSubmit,  // Becomes data-action
      children: [
        {
          input: {
            name: 'name',
            value: state.name,
            oninput: updateName,  // Becomes data-action
            placeholder: 'Your name'
          }
        },
        {
          button: {
            type: 'submit',
            text: state.isSubmitting ? 'Submitting...' : 'Submit',
            disabled: state.isSubmitting
          }
        }
      ]
    }
  };
};

export const ContactForm = ContactFormComponent(ContactFormView);

// Client-side hydration
document.addEventListener('DOMContentLoaded', () => {
  autoHydrate({
    'contact-form': ContactForm
  });
});
```

### Common Hydration Migration Issues

#### Issue 1: "My buttons don't work after migration"

**Cause:** Missing hydration setup or timing issues.

**Solution:**
```javascript
// Ensure proper timing
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    // Small delay ensures all scripts are loaded
    autoHydrate(componentRegistry);
  }, 100);
});
```

#### Issue 2: "State changes don't update the UI"

**Cause:** Not using `setState` properly or missing component wrapper.

**React pattern:**
```jsx
const [count, setCount] = useState(0);
setCount(count + 1); // React handles re-rendering
```

**Coherent.js pattern:**
```javascript
const { setState } = stateUtils;
setState({ count: state.count + 1 }); // Must use setState for reactivity
```

#### Issue 3: "Hydration mismatch warnings"

**Cause:** Server and client render differently.

**Solution:** Ensure identical props and handle client-only content:
```javascript
const isClient = typeof window !== 'undefined';

return {
  div: {
    children: [
      { p: { text: 'Always rendered' } },
      // Client-only content after hydration
      isClient ? { p: { text: new Date().toISOString() } } : null
    ].filter(Boolean)
  }
};
```

### Advanced Hydration Patterns

#### Selective Hydration (Performance Optimization)

```javascript
// Only hydrate interactive components
document.addEventListener('DOMContentLoaded', () => {
  const interactiveComponents = document.querySelectorAll('[data-interactive="true"]');
  
  if (interactiveComponents.length > 0) {
    // Lazy load hydration code
    import('./full-hydration.js').then(({ initializeHydration }) => {
      initializeHydration();
    });
  }
});
```

#### Progressive Enhancement Pattern

```javascript
// Server-side: Works without JavaScript
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

// Client-side: Enhanced functionality
const enhancedSubmit = async (event) => {
  event.preventDefault(); // Override default form submission
  
  // Add loading states, validation, etc.
  const formData = new FormData(event.target);
  await submitWithEnhancements(formData);
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
- [ ] Convert JSX/components to Coherent.js object structure
- [ ] Replace state management with `withState`
- [ ] Replace conditional rendering with `when`
- [ ] Replace list rendering with `forEach`
- [ ] Update event handling (onclick, etc.)
- [ ] Add `data-coherent-component` attributes for interactive components
- [ ] Test server-side rendering output matches original

### Client-Side Hydration Setup

- [ ] Install `@coherentjs/client` package (when available)
- [ ] Create hydration entry point (`hydration.js`)
- [ ] Set up component registry for `autoHydrate`
- [ ] Add hydration script to HTML pages
- [ ] Handle timing with `DOMContentLoaded` events
- [ ] Test that interactive features work after hydration
- [ ] Verify no hydration mismatch warnings
- [ ] Add error handling for hydration failures

### Testing and Optimization

- [ ] Verify performance improvements
- [ ] Test progressive enhancement (works without JS)
- [ ] Implement selective hydration for performance
- [ ] Update build/deployment processes
- [ ] Add debugging for development environment
- [ ] Document hydration patterns for team

## Common Patterns

### Event Handling

**Before (React):**
```jsx
<button onClick={handleClick}>Click me</button>
```

**After (Coherent.js):**
```javascript
{ button: { text: 'Click me', onclick: handleClick } }
```

### Styling

**Before (React with className):**
```jsx
<div className="container highlighted">Content</div>
```

**After (Coherent.js):**
```javascript
{ div: { className: 'container highlighted', text: 'Content' } }
```

### Data Attributes

**Before (React):**
```jsx
<div data-id="123" data-role="button">Content</div>
```

**After (Coherent.js):**
```javascript
{ div: { 'data-id': '123', 'data-role': 'button', text: 'Content' } }
```

This migration guide should help you transition your existing codebase to Coherent.js while maintaining functionality and improving performance and security.
