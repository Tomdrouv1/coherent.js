# 🚀 Getting Started with Coherent.js

Welcome to Coherent.js! This guide will help you get started with building fast, scalable web applications using pure JavaScript objects.

## What is Coherent.js?

Coherent.js is a modern framework that lets you build web applications using **pure JavaScript objects** instead of JSX, templates, or string concatenation. No compilation step required!

```javascript
// Instead of JSX like this:
// <div className="greeting"><h1>Hello World!</h1></div>

// You write pure JavaScript objects like this:
const component = {
  div: {
    className: 'greeting',
    children: [
      { h1: { text: 'Hello World!' } }
    ]
  }
};
```

## Quick Start

### 1. Installation

```bash
npm install @coherentjs/core@beta
# or
pnpm add @coherentjs/core@beta
```

> **Note**: Coherent.js is currently in beta (v1.0.0-beta.1).

### 2. Your First Component

```javascript
import { render } from '@coherentjs/core';

// Define a component as a pure JavaScript object
const WelcomeComponent = {
  div: {
    className: 'welcome',
    children: [
      { h1: { text: 'Welcome to Coherent.js!' } },
      { p: { text: 'Build with pure JavaScript objects' } }
    ]
  }
};

// Render to HTML string
const html = render(WelcomeComponent);
console.log(html);
// Output: <div class="welcome"><h1>Welcome to Coherent.js!</h1><p>Build with pure JavaScript objects</p></div>
```

### 3. Interactive Components with Functions

```javascript
// Component as a function for dynamic content
const Greeting = ({ name = 'World', mood = 'happy' }) => ({
  div: {
    className: `greeting greeting--${mood}`,
    children: [
      { h2: { text: `Hello, ${name}!` } },
      { p: { text: `You seem ${mood} today` } },
      // Conditional rendering with pure JS
      mood === 'fantastic' ? {
        div: {
          className: 'celebration',
          text: '🎉 Amazing! 🎉'
        }
      } : null
    ].filter(Boolean) // Remove null values
  }
});

// Use the component
const html = render(Greeting({ name: 'Developer', mood: 'fantastic' }));
```

## Core Concepts

### Pure Object Syntax

Coherent.js uses a simple object structure where:
- **Keys** are HTML tag names (`div`, `h1`, `p`, etc.)
- **Values** are objects containing properties and children

```javascript
const structure = {
  tagName: {
    // HTML attributes
    className: 'my-class',
    id: 'my-id',
    
    // Text content
    text: 'Hello World',
    
    // Child elements
    children: [
      { span: { text: 'Child element' } }
    ]
  }
};
```

### Component Composition

Build complex UIs by composing simple components:

```javascript
const Button = ({ text, onClick, variant = 'primary' }) => ({
  button: {
    className: `btn btn--${variant}`,
    onclick: onClick,
    text: text
  }
});

const Card = ({ title, content, actions = [] }) => ({
  div: {
    className: 'card',
    children: [
      { div: { className: 'card-header', children: [
        { h3: { text: title } }
      ]}},
      { div: { className: 'card-body', children: [
        { p: { text: content } }
      ]}},
      actions.length > 0 ? {
        div: {
          className: 'card-actions',
          children: actions.map(action => Button(action))
        }
      } : null
    ].filter(Boolean)
  }
});

// Use composed components
const MyCard = Card({
  title: 'Welcome Card',
  content: 'This card is built with pure JavaScript objects!',
  actions: [
    { text: 'Learn More', onClick: 'showMore()', variant: 'primary' },
    { text: 'Close', onClick: 'close()', variant: 'secondary' }
  ]
});
```

### Factory Functions Over Classes

Coherent.js emphasizes factory functions for a pure object approach:

```javascript
// ✅ Recommended: Factory functions
import { render } from '@coherentjs/core';

const db = render({ type: 'sqlite', database: ':memory:' });
const query = render({ table: 'users', select: ['*'] });

// ✅ Also available: Direct class access (for advanced use)
import { render } from '@coherentjs/core';
const db = new render(config);
```

## Framework Features Overview

### 🎨 Components & Rendering
- Pure JavaScript object components
- Server-side rendering (SSR)
- Client-side hydration
- Component memoization

### 💾 Database Integration
- Object-based query builder
- Multiple database adapters (SQLite, PostgreSQL, MySQL, MongoDB)
- Pure JavaScript models

### 🛣️ Routing & APIs
- Declarative routing configuration
- RESTful API builders
- WebSocket routing support

### ⚡ Performance
- Intelligent caching
- Performance monitoring
- Static optimization
- Streaming responses

## Next Steps

Now that you understand the basics, explore these guides based on what you want to build:

### 🎯 **Choose Your Learning Path:**

#### 🌱 **New to Web Development?**
1. [Basic Components](../components/basic-components.md) - Learn component fundamentals
2. [State Management](../components/state-management.md) - Handle dynamic data
3. [Styling & CSS](../components/styling.md) - Make it look great

#### 🖥️ **Building Web Apps?**
1. [Server-Side Rendering](../server-side/ssr-guide.md) - Fast initial loads
2. [Client-Side Hydration](../client-side/hydration.md) - Add interactivity
3. [Express Integration](../server-side/express-integration.md) - Full web apps

#### 💾 **Working with Data?**
1. [Database Queries](../database/query-builder.md) - Pure object queries
2. [Database Models](../database/models.md) - Structure your data
3. [Migrations](../database/migrations.md) - Manage schema changes

#### 🚀 **Building APIs?**
1. [API Routing](../routing/api-routing.md) - RESTful endpoints
2. [WebSocket APIs](../routing/websocket-routing.md) - Real-time features
3. [API Security](../routing/api-security.md) - Secure your endpoints

## Examples

Check out our [enhanced example browser](../../examples/) with categorized examples:

- **🚀 Getting Started**: `basic-usage.js`
- **🧩 Components**: `component-composition.js`, `context-example.js`
- **💾 Database**: `database-queries.js`, `pure-object-models.js`
- **🛣️ Routing**: `router-demo.js`, `enhanced-router-demo.js`
- **💻 Client-Side**: `hydration-demo.js`
- **🖥️ Server-Side**: `express-integration.js`, `nextjs-integration.js`
- **⚡ Performance**: `performance-test.js`, `memoization.js`

## Development Server

Start the enhanced development server to explore examples:

```bash
npm run dev
# Visit http://localhost:3000 for categorized examples
```

## Getting Help

- 📖 [Full API Reference](../api-reference.md)
- 🎯 [Examples Browser](../../examples/)
- 🐛 [GitHub Issues](https://github.com/coherent-js/coherent/issues)
- 💬 [Discussions](https://github.com/coherent-js/coherent/discussions)

---

**Ready to build with pure JavaScript objects? Let's go! 🚀**
