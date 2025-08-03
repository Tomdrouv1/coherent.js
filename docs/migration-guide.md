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
import { withState } from 'coherent-js';

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
import { when } from 'coherent-js';

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
import { forEach } from 'coherent-js';

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
import { when } from 'coherent-js';

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
import { forEach } from 'coherent-js';

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
import { renderToString } from 'coherent-js';
const html = renderToString(Greeting({ name: 'World' }));
```

## Key Benefits of Migrating to Coherent.js

1. **Type Safety**: Full TypeScript support with built-in type definitions
2. **Performance**: Built-in performance monitoring and optimization
3. **Security**: Automatic HTML escaping and XSS protection
4. **No Build Step**: Pure JavaScript with no compilation required
5. **Streaming**: Native support for streaming large documents
6. **Memory Efficiency**: Smart caching and object pooling

## Migration Checklist

- [ ] Identify components that need to be converted
- [ ] Convert JSX/components to Coherent.js object structure
- [ ] Replace state management with `withState`
- [ ] Replace conditional rendering with `when`
- [ ] Replace list rendering with `forEach`
- [ ] Update event handling (onclick, etc.)
- [ ] Test rendering output matches original
- [ ] Verify performance improvements
- [ ] Update build/deployment processes

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
