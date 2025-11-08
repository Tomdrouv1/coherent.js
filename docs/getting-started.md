# 🚀 Getting Started with Coherent.js

Welcome to Coherent.js! This guide will get you up and running with server-side rendering, state management, and client-side hydration in minutes.

## What is Coherent.js?

Coherent.js is a modern server-side rendering framework that uses pure JavaScript objects to define components. It provides:

- **Universal Components**: Same components work on server and client
- **Pure JavaScript**: No JSX, no build step required
- **Type Safety**: Full TypeScript support out of the box
- **State Management**: Built-in reactive state with `withState`
- **Client-Side Hydration**: Make server-rendered components interactive
- **Performance Optimized**: Built-in caching and performance monitoring

## Quick Start

### Installation

```bash
# Using npm
npm install @coherent.js/core@beta

# Using pnpm (recommended)
pnpm add @coherent.js/core@beta

# Using yarn
yarn add @coherent.js/core@beta
```

> **Note**: Coherent.js is currently in beta (v1.0.0-beta.1). The `@beta` tag ensures you get the latest beta release.

### Your First Component

```javascript
// components/Greeting.js
export const Greeting = ({ name = 'World' }) => ({
  div: {
    className: 'greeting',
    children: [
      { h1: { text: `Hello, ${name}!` } },
      { p: { text: 'Welcome to Coherent.js' } }
    ]
  }
});
```

### Server-Side Rendering

```javascript
// server.js
import { render } from '@coherent.js/core';
import { Greeting } from './components/Greeting.js';

const html = render(Greeting({ name: 'Developer' }));
console.log(html);
// Output: <div class="greeting"><h1>Hello, Developer!</h1><p>Welcome to Coherent.js</p></div>
```

## Adding Interactivity

### Step 1: Create a Stateful Component

```javascript
// components/Counter.js
import { withState } from '@coherent.js/core';

const CounterComponent = withState({ count: 0 })(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const increment = () => setState({ count: state.count + 1 });
  const decrement = () => setState({ count: state.count - 1 });
  const reset = () => setState({ count: 0 });

  return {
    div: {
      'data-coherent-component': 'counter', // Required for hydration
      className: 'counter-widget',
      children: [
        { h2: { text: 'Interactive Counter' } },
        { p: { text: `Count: ${state.count}`, className: 'count-display' } },
        {
          div: {
            className: 'counter-controls',
            children: [
              { button: { text: '−', onclick: decrement, className: 'btn' } },
              { button: { text: 'Reset', onclick: reset, className: 'btn' } },
              { button: { text: '+', onclick: increment, className: 'btn' } }
            ]
          }
        }
      ]
    }
  };
});

export const Counter = CounterComponent;
```

### Step 2: Set Up Client-Side Hydration

```javascript
// hydration.js
import { makeHydratable, autoHydrate } from '@coherent.js/client';
import { Counter } from './components/Counter.js';

// Make the component hydratable
const HydratableCounter = makeHydratable(Counter, {
  componentName: 'counter'
});

// Set up hydration when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  autoHydrate({
    counter: HydratableCounter
  });
});
```

### Step 3: Create a Complete Page

```javascript
// pages/app.js
import { Counter } from './components/Counter.js';

export const appPage = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'My Coherent.js App' } },
            {
              style: {
                text: `
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .counter-widget { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    border-radius: 8px; 
                    margin: 20px 0;
                    border: 1px solid #e9ecef;
                  }
                  .count-display { 
                    font-size: 1.5rem; 
                    font-weight: bold; 
                    text-align: center;
                    margin: 15px 0;
                  }
                  .counter-controls { 
                    display: flex; 
                    gap: 10px; 
                    justify-content: center; 
                  }
                  .btn { 
                    padding: 10px 20px; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer; 
                    background: #007bff; 
                    color: white; 
                  }
                  .btn:hover { background: #0056b3; }
                `
              }
            },
            { script: { src: './hydration.js', defer: true } }
          ]
        }
      },
      {
        body: {
          children: [
            { h1: { text: 'My Coherent.js App' } },
            { p: { text: 'This counter works on both server and client!' } },
            Counter()
          ]
        }
      }
    ]
  }
};
```

### Step 4: Serve Your App

```javascript
// server.js
import express from 'express';
import { render } from '@coherent.js/core';
import { appPage } from './pages/app.js';

const app = express();

// Serve static files (hydration.js, etc.)
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  const html = render(appPage);
  res.send(html);
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## Project Structure

Here's a recommended project structure:

```
my-coherent-app/
├── components/
│   ├── Counter.js
│   ├── Greeting.js
│   └── Layout.js
├── pages/
│   ├── home.js
│   └── about.js
├── public/
│   ├── hydration.js
│   └── styles.css
├── server.js
└── package.json
```

## Core Concepts

### 1. Component Definition

Components are pure functions that return JavaScript objects:

```javascript
export const MyComponent = ({ title, children }) => ({
  div: {
    className: 'my-component',
    children: [
      { h2: { text: title } },
      ...children
    ]
  }
});
```

### 2. State Management

Use `withState` for reactive components:

```javascript
import { withState } from '@coherent.js/core';

const StatefulComponent = withState({ 
  value: '', 
  submitted: false 
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;
  
  // Component logic here
  return { /* component object */ };
});
```

### 3. Event Handlers

Event handlers are functions that become `data-action` attributes during SSR:

```javascript
{
  button: {
    text: 'Click me',
    onclick: () => setState({ clicked: true })
  }
}

// Renders as: <button data-action="..." data-event="click">Click me</button>
```

### 4. Client-Side Hydration

Make server-rendered components interactive:

```javascript
import { makeHydratable, autoHydrate } from '@coherent.js/client';

// 1. Make component hydratable
const HydratableComponent = makeHydratable(MyComponent, {
  componentName: 'my-component'
});

// 2. Set up auto-hydration
autoHydrate({
  'my-component': HydratableComponent
});
```

### 5. Component Identification

Always add `data-coherent-component` to interactive components:

```javascript
{
  div: {
    'data-coherent-component': 'my-component', // Required!
    children: [...]
  }
}
```

## Common Patterns

### Form Handling

```javascript
const ContactForm = withState({
  name: '',
  email: '',
  message: '',
  submitted: false
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Submitting:', state);
    setState({ submitted: true });
  };

  const updateField = (field) => (event) => {
    setState({ [field]: event.target.value });
  };

  return {
    form: {
      'data-coherent-component': 'contact-form',
      onsubmit: handleSubmit,
      children: [
        {
          input: {
            type: 'text',
            placeholder: 'Name',
            value: state.name,
            oninput: updateField('name')
          }
        },
        {
          input: {
            type: 'email',
            placeholder: 'Email',
            value: state.email,
            oninput: updateField('email')
          }
        },
        {
          textarea: {
            placeholder: 'Message',
            value: state.message,
            oninput: updateField('message')
          }
        },
        {
          button: {
            type: 'submit',
            text: state.submitted ? 'Sent!' : 'Send'
          }
        }
      ]
    }
  };
});
```

### List Rendering

```javascript
const TodoList = ({ todos = [] }) => ({
  ul: {
    className: 'todo-list',
    children: todos.map(todo => ({
      li: {
        key: todo.id,
        className: todo.completed ? 'completed' : 'pending',
        children: [
          { span: { text: todo.text } },
          {
            button: {
              text: '✓',
              onclick: () => toggleTodo(todo.id)
            }
          }
        ]
      }
    }))
  }
});
```

### Conditional Rendering

```javascript
import { when } from '@coherent.js/core';

const UserProfile = ({ user }) => ({
  div: {
    children: [
      when(user,
        { p: { text: `Welcome, ${user.name}!` } },
        { p: { text: 'Please log in' } }
      )
    ]
  }
});
```

## Integration Examples

### With Express.js

```javascript
import express from 'express';
import { render } from '@coherent.js/core';

const app = express();

app.get('*', (req, res) => {
  const component = getComponentForRoute(req.path);
  const html = render(component);
  res.send(html);
});
```

### With Next.js

```javascript
// pages/index.js
import { render } from '@coherent.js/core';
import { HomePage } from '../components/HomePage.js';

export default function Page(props) {
  const html = render(HomePage(props));
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### Progressive Enhancement

Ensure your components work without JavaScript:

```javascript
{
  form: {
    action: '/api/submit',      // Works without JS
    method: 'POST',
    onsubmit: enhancedSubmit,   // Enhanced with JS
    children: [
      // Form fields
    ]
  }
}
```

## Best Practices

### 1. Component Structure

```javascript
// ✅ Good - clear structure
export const UserCard = ({ user }) => ({
  div: {
    className: 'user-card',
    'data-coherent-component': 'user-card',
    children: [
      { h3: { text: user.name } },
      { p: { text: user.email } },
      { img: { src: user.avatar, alt: user.name } }
    ]
  }
});

// ❌ Bad - unclear structure  
export const UserCard = ({ user }) => ({
  div: {
    children: [user.name, user.email, user.avatar].map(item => ({ p: { text: item } }))
  }
});
```

### 2. State Management

```javascript
// ✅ Good - immutable updates
setState({ todos: [...state.todos, newTodo] });

// ❌ Bad - direct mutation
state.todos.push(newTodo);
setState(state);
```

### 3. Event Handlers

```javascript
// ✅ Good - proper event handling
const handleClick = (event) => {
  event.preventDefault();
  setState({ clicked: true });
};

// ❌ Bad - no event handling
const handleClick = () => {
  setState({ clicked: true }); // Form will submit!
};
```

### 4. Hydration Setup

```javascript
// ✅ Good - proper timing
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    autoHydrate(componentRegistry);
  }, 100);
});

// ❌ Bad - too early
autoHydrate(componentRegistry); // DOM might not be ready
```

### 5. Error Handling

```javascript
// ✅ Good - with error handling
try {
  autoHydrate(componentRegistry);
  console.log('Hydration successful');
} catch (error) {
  console.error('Hydration failed:', error);
  // Provide fallback behavior
}
```

## Debugging

### Enable Debug Mode

```javascript
// For state components
const DebugComponent = withState(initialState, {
  debug: true // Logs all state changes
});

// For hydration
window.COHERENT_DEBUG = true;
```

### Common Debug Commands

```javascript
// Check if components are found
document.querySelectorAll('[data-coherent-component]');

// Check if handlers are available
console.log(typeof window.myHandler);

// Verify button connections
document.querySelectorAll('button[data-action]');
```

## Next Steps

1. **Explore Examples**: Check out the `examples/` directory for more patterns
2. **Read the API Reference**: Full documentation of all functions and options
3. **Migration Guide**: Moving from React, Vue, or other frameworks
4. **Performance Guide**: Optimization strategies and best practices
5. **Advanced Features**: Streaming, caching, and performance monitoring

## Getting Help

- **Documentation**: Complete API reference and guides
- **Examples**: Real-world usage patterns in `examples/`
- **Issues**: Report bugs and request features on GitHub
- **Community**: Join discussions and get help

---

You're now ready to build universal, performant web applications with Coherent.js! Start with simple components and gradually add state management and interactivity as needed.
