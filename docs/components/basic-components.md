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

```javascript
const UserStatus = ({ user, isLoggedIn }) => ({
  div: {
    className: 'user-status',
    children: [
      // Conditional rendering with pure JS
      isLoggedIn ? {
        div: {
          className: 'logged-in',
          children: [
            { h3: { text: `Welcome back, ${user.name}!` } },
            { p: { text: 'You are logged in' } }
          ]
        }
      } : {
        div: {
          className: 'logged-out',
          children: [
            { h3: { text: 'Please log in' } },
            { button: { text: 'Login', onclick: 'showLogin()' } }
          ]
        }
      }
    ].filter(Boolean) // Remove null/undefined values
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
      todos.length === 0 ? {
        p: { 
          className: 'empty-message',
          text: 'No todos yet. Add one!' 
        }
      } : null
    ].filter(Boolean)
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
    className: [
      'btn',
      `btn--${variant}`,
      `btn--${size}`,
      disabled ? 'btn--disabled' : null
    ].filter(Boolean).join(' '),
    disabled: disabled,
    text: text
  }
});
```

### Event Handlers

```javascript
const InteractiveCard = ({ title, onClick, onHover }) => ({
  div: {
    className: 'interactive-card',
    onclick: onClick,
    onmouseover: onHover,
    children: [
      { h3: { text: title } },
      { p: { text: 'Click or hover me!' } }
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
      subtitle ? { p: { className: 'subtitle', text: subtitle } } : null
    ].filter(Boolean)
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
import { render } from '@coherentjs/core';

const component = Greeting({ name: 'Server User', mood: 'excited' });
const html = render(component);
console.log(html);
// Output: <div class="greeting greeting--excited">...</div>
```

### Using the Factory Function

```javascript
import { createCoherent } from '@coherentjs/core';

const coherent = createCoherent({
  enableCache: true,
  enableMonitoring: true
});

const html = coherent.render(component);
```

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
        config.showIcon ? { i: { className: 'icon' } } : null,
        { h3: { text: config.title } }
      ].filter(Boolean)
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

## Next Steps

Now that you understand basic components, explore:

1. [State Management](./state-management.md) - Handle dynamic data
2. [Component Styling](./styling.md) - Make components look great
3. [Advanced Components](./advanced-components.md) - Complex patterns and optimization
