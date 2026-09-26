# Basic Components in Coherent.js

Learn how to create and use basic components in Coherent.js using pure JavaScript objects.

## What are Coherent Components?

Coherent.js components are pure JavaScript objects or functions that return objects. No JSX, no templates, no compilation required.

## Basic Object Components

### Simple Static Components

```javascript
// A simple component as a pure object
const WelcomeMessage = {
  div: {
    className: 'welcome',
    children: [
      { h1: { text: 'Welcome to Coherent.js!' } },
      { p: { text: 'Build with pure JavaScript objects' } }
    ]
  }
};
```

### Text and HTML Content

```javascript
const ContentExample = {
  div: {
    className: 'content',
    children: [
      // Text content
      { p: { text: 'This is plain text' } },
      
      // HTML content (be careful with user input!)
      { div: { html: '<strong>Bold HTML content</strong>' } },
      
      // Mixed content
      { p: { 
        text: 'Plain text with ',
        children: [
          { strong: { text: 'nested elements' } }
        ]
      }}
    ]
  }
};
```

## Function Components

### Basic Function Components

```javascript
// Component as a function for dynamic content
const Greeting = (props = {}) => {
  const { name = 'World', mood = 'happy' } = props;
  
  return {
    div: {
      className: `greeting greeting--${mood}`,
      children: [
        { h2: { text: `Hello, ${name}!` } },
        { p: { text: `You seem ${mood} today` } }
      ]
    }
  };
};

// Usage
const myGreeting = Greeting({ name: 'Developer', mood: 'fantastic' });
```

### Conditional Rendering

`null`, `undefined` and booleans in `children` render nothing, so plain JavaScript conditions work:

```javascript
const UserStatus = ({ user, isLoggedIn }) => ({
  div: {
    className: 'user-status',
    children: [
      isLoggedIn && {
        div: {
          className: 'logged-in',
          children: [
            { h3: { text: `Welcome back, ${user.name}!` } },
            { p: { text: 'You are logged in' } }
          ]
        }
      },
      !isLoggedIn && {
        div: {
          className: 'logged-out',
          children: [
            { h3: { text: 'Please log in' } },
            { a: { href: '/login', text: 'Login' } }
          ]
        }
      }
    ]
  }
});
```

### Lists and Iteration

```javascript
const TodoList = ({ todos = [] }) => ({
  div: {
    className: 'todo-list',
    children: [
      { h3: { text: 'My Todo List' } },
      { ul: {
        children: todos.map(todo => ({
          li: {
            className: todo.completed ? 'completed' : 'pending',
            children: [
              { span: { text: todo.text } },
              { button: { 
                text: todo.completed ? 'Undo' : 'Done',
                onclick: `toggleTodo(${todo.id})`
              }}
            ]
          }
        }))
      }},
      // Show message if no todos
      todos.length === 0 && {
        p: {
          className: 'empty-message',
          text: 'No todos yet. Add one!'
        }
      }
    ]
  }
});
```

## Component Attributes and Props

### HTML Attributes

```javascript
const LinkComponent = ({ href, text, target = '_self' }) => ({
  a: {
    href: href,
    target: target,
    className: 'custom-link',
    rel: target === '_blank' ? 'noopener noreferrer' : undefined,
    text: text
  }
});
```

### CSS Classes

```javascript
const Button = ({ text, variant = 'primary', size = 'medium', disabled = false }) => ({
  button: {
    // Arrays skip falsy entries; objects list the classes whose value is truthy
    className: ['btn', `btn--${variant}`, `btn--${size}`, disabled && 'btn--disabled'],
    disabled,       // true renders a bare attribute, false omits it
    text
  }
});

render(Button({ text: 'Go', disabled: true }));
// <button class="btn btn--primary btn--medium btn--disabled" disabled>Go</button>
```

`className: { active: isActive, 'btn--wide': wide }` works too, and `class` and `className` on the same element are merged.

### Event Handlers

Function-valued `on*` props render nothing on the server; `hydrate()` from `@coherent.js/client` attaches them in the browser (see [Hydration](../client/hydration.md)). String handlers are rendered as ordinary attributes:

```javascript
const InteractiveCard = ({ title }) => ({
  div: {
    className: 'interactive-card',
    onClick: (event) => event.setState({ open: !event.state.open }), // attached by hydrate()
    children: [
      { h3: { text: title } },
      { button: { text: 'Back', onclick: 'history.back()' } }         // rendered as onclick="history.back()"
    ]
  }
});
```

## Component Composition

### Building Complex Components

```javascript
const Header = ({ title, subtitle }) => ({
  header: {
    className: 'page-header',
    children: [
      { h1: { text: title } },
      subtitle && { p: { className: 'subtitle', text: subtitle } }
    ]
  }
});

const Navigation = ({ links = [] }) => ({
  nav: {
    className: 'navigation',
    children: [
      { ul: {
        children: links.map(link => ({
          li: {
            children: [
              LinkComponent({ href: link.url, text: link.title })
            ]
          }
        }))
      }}
    ]
  }
});

const Layout = ({ title, subtitle, navLinks, children }) => ({
  div: {
    className: 'layout',
    children: [
      Header({ title, subtitle }),
      Navigation({ links: navLinks }),
      { main: {
        className: 'main-content',
        children: Array.isArray(children) ? children : [children]
      }}
    ]
  }
});
```

## Rendering Components

### Server-Side Rendering

```javascript
import { render } from '@coherent.js/core';

const component = Greeting({ name: 'Server User', mood: 'excited' });
const html = render(component);
console.log(html);
// Output: <div class="greeting greeting--excited">...</div>
```

`render()` is synchronous: load data first, then render. If a component throws, `render()` throws a `RenderingError` naming the component's path; pass `onError: (error, { path }) => fallback` to render a replacement instead.

For large pages, `renderToStream()` yields the same HTML in chunks (see [Server-Side Rendering](../server/ssr.md)).

## Best Practices

### 1. Use Descriptive Component Names

```javascript
// ✅ Good
const UserProfileCard = ({ user }) => ({ /* ... */ });

// ❌ Avoid
const Card = ({ user }) => ({ /* ... */ });
```

### 2. Validate Props

```javascript
const SafeComponent = (props = {}) => {
  const { title, items = [] } = props;
  
  if (!title) {
    return { div: { text: 'Error: Title is required' } };
  }
  
  return {
    div: {
      children: [
        { h2: { text: title } },
        // ... rest of component
      ]
    }
  };
};
```

### 3. Keep Components Pure

```javascript
// ✅ Pure component - same input, same output
const PureGreeting = ({ name }) => ({
  div: { text: `Hello, ${name}!` }
});

// ❌ Impure - uses external state
let globalCounter = 0;
const ImpureCounter = () => ({
  div: { text: `Count: ${++globalCounter}` }
});
```

### 4. Use Composition Over Inheritance

```javascript
// ✅ Compose smaller components
const ProfilePage = ({ user }) => ({
  div: {
    className: 'profile-page',
    children: [
      Header({ title: 'User Profile' }),
      UserCard({ user }),
      UserPosts({ posts: user.posts })
    ]
  }
});
```

## Common Patterns

### 1. Default Props Pattern

```javascript
const ComponentWithDefaults = (props = {}) => {
  const config = {
    title: 'Default Title',
    showIcon: true,
    variant: 'primary',
    ...props // Override defaults with provided props
  };
  
  return {
    div: {
      className: `component component--${config.variant}`,
      children: [
        config.showIcon && { i: { className: 'icon' } },
        { h3: { text: config.title } }
      ]
    }
  };
};
```

### 2. Children Pattern

```javascript
const Container = ({ className, children }) => ({
  div: {
    className: `container ${className || ''}`,
    children: Array.isArray(children) ? children : [children]
  }
});

// Usage
const page = Container({
  className: 'page-container',
  children: [
    { h1: { text: 'Page Title' } },
    { p: { text: 'Page content' } }
  ]
});
```

### 3. Higher-Order Components

```javascript
const withLoading = (component, isLoading) => {
  if (isLoading) {
    return { div: { className: 'loading', text: 'Loading...' } };
  }
  return component;
};

// Usage
const MyComponent = { div: { text: 'Loaded content' } };
const LoadingComponent = withLoading(MyComponent, true);
```

## Event Handling

Event handlers are ordinary function props. They do nothing on the server — `render()` omits them — and become live when the same component is hydrated in the browser:

```javascript
// Shared by server and client
export const Counter = ({ count = 0 }) => ({
  div: {
    className: 'counter',
    children: [
      { span: { text: `Count: ${count}` } },
      { button: { text: '+1', onClick: (event) => event.setState({ count: event.state.count + 1 }) } }
    ]
  }
});

// Server
render(Counter({ count: 0 }));
// <div class="counter"><span>Count: 0</span><button>+1</button></div>

// Browser
hydrate(Counter, document.querySelector('.counter'), { initialState: { count: 0 } });
```

A handler receives one wrapped event with `originalEvent`, `target`, `preventDefault()`, `stopPropagation()`, and the component's `state`, `setState()` and `props`. See [Client-Side Hydration](../client/hydration.md) for the details.

## Next Steps

Now that you understand basic components, explore:

1. [State Management](state.md) - Handle dynamic data
2. [Component Styling](./styling.md) - Make components look great
3. [Advanced Components](advanced.md) - Complex patterns and optimization
