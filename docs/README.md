# Coherent.js Documentation

Welcome to **Coherent.js** - the pure JavaScript framework that revolutionizes how you build modern web applications.

## 🚀 What is Coherent.js?

Coherent.js is a **lightweight, high-performance server-side rendering framework** that uses pure JavaScript objects to define UI components. Unlike traditional frameworks that require JSX, complex build tools, or virtual DOM abstractions, Coherent.js lets you build fast, maintainable applications using nothing but plain JavaScript objects.

## 🎯 Core Philosophy

**Pure Objects, Pure Performance, Pure Simplicity**

- **No compilation required** - Write components as plain JS objects
- **SSR-first approach** - Built for server-side rendering from the ground up
- **Performance optimized** - Outperforms Express and raw Node.js in benchmarks
- **Developer friendly** - Minimal API surface with maximum capability

## ✨ What Problems Does Coherent.js Solve?

### 🔥 **Build Tool Fatigue**
- **Problem**: Modern frameworks require complex build systems, bundlers, and compilation steps
- **Solution**: Coherent.js works with pure JavaScript - no build step needed

### ⚡ **Performance Bottlenecks**
- **Problem**: Virtual DOM and runtime overhead slow down applications
- **Solution**: Direct object-to-HTML rendering with intelligent caching

### 🧩 **Template Complexity**
- **Problem**: Template engines mix logic and markup in confusing ways
- **Solution**: Structured JavaScript objects provide clear, maintainable component definitions

### 🏗️ **SSR Complexity**
- **Problem**: Server-side rendering is often an afterthought, leading to hydration mismatches
- **Solution**: SSR-first design ensures perfect server/client consistency

## 🎨 How It Works

### Traditional JSX Approach:
```jsx
function WelcomeCard({ name }) {
  return (
    <div className="welcome-card">
      <h2>Hello, {name}!</h2>
      <button onClick={handleClick}>
        Get Started
      </button>
    </div>
  );
}
```

### Coherent.js Approach:
```javascript
const WelcomeCard = (name) => ({
  div: {
    className: 'welcome-card',
    children: [
      { h2: { text: `Hello, ${name}!` } },
      { button: { 
        onclick: 'handleClick()', 
        text: 'Get Started' 
      } }
    ]
  }
});

// Render anywhere
const html = render(WelcomeCard('Developer'));
```

## 🏆 Key Advantages

### **🚀 Performance Leadership**
- **9,627 requests/second** - Beats Express.js and raw Node.js
- **<2ms render time** - Average component rendering
- **94% memory efficiency** - Optimized resource usage

### **📦 Zero Dependencies**
- Pure JavaScript implementation
- No external runtime dependencies
- Works in any JavaScript environment

### **🔒 Security by Default**
- Automatic HTML escaping
- XSS protection built-in
- Safe attribute handling

### **🔧 Framework Agnostic**
- Express.js integration
- Fastify support
- Next.js compatibility
- Koa integration

## 🛠️ Perfect For

- **Server-side rendered applications**
- **High-performance web services** 
- **Progressive web applications**
- **Microservices with UI components**
- **APIs that serve HTML content**
- **Template engine replacements**

## 📊 When to Choose Coherent.js

| Use Case | Coherent.js | Traditional Frameworks |
|----------|-------------|----------------------|
| **Server-side rendering** | ✅ Built-in, optimized | ⚠️ Complex setup |
| **Build complexity** | ✅ Zero build tools | ❌ Webpack, Babel, etc. |
| **Performance** | ✅ Native speed | ⚠️ Virtual DOM overhead |
| **Learning curve** | ✅ Minimal API | ❌ Complex abstractions |
| **Bundle size** | ✅ Tiny footprint | ❌ Large runtime |
| **TypeScript** | ✅ Full support | ✅ Good support |

## 📚 Complete Documentation

> **📖 Looking for something specific?** Check out the **[Complete Documentation Index](DOCS_INDEX.md)** for organized access to all guides and references.


### 🚀 **Getting Started**
- **[Quick Start Guide](getting-started.md)** - Get up and running in 5 minutes
- **[Installation Guide](getting-started/installation.md)** - Detailed setup instructions
- **[Migration Guide](migration-guide.md)** - Moving from other frameworks

### 🧩 **Component System**
- **[Basic Components](components/basic-components.md)** - Learn the object syntax
- **[State Management](components/state-management.md)** - Reactive components with `withState`
- **[Advanced Components](components/advanced-components.md)** - HOCs, composition, and complex patterns
- **[Styling Components](components/styling-components.md)** - CSS-in-JS and styling patterns

### 🌊 **Client-Side Features**
- **[Hydration Guide](client-side-hydration-guide.md)** - Making components interactive
- **[Advanced Hydration](client-side/hydration.md)** - Deep dive into hydration patterns
- **[Event Handling](function-on-element-events.md)** - User interactions and forms

### 🏗️ **Server-Side Rendering**
- **[SSR Guide](server-side/ssr-guide.md)** - Server-side rendering essentials
- **[Framework Integrations](framework-integrations.md)** - Express, Fastify, Next.js, Koa
- **[Performance Optimizations](performance-optimizations.md)** - Caching and optimization
- **[Deployment Guide](deployment-guide.md)** - Production deployment strategies

### 🗄️ **Database & Data**
- **[Database Integration](database-integration.md)** - Working with databases
- **[Query Builder](database/query-builder.md)** - SQL query building utilities
- **[Query Builder API](query-builder.md)** - Alternative query builder reference

### 🛠️ **Advanced Topics**
- **[Object-Based Routing](object-based-routing.md)** - Advanced routing patterns
- **[Security Guide](security-guide.md)** - Security best practices
- **[API Reference](api-reference.md)** - Complete function documentation
- **[API Usage Guide](api-usage.md)** - Practical API examples
- **[API Enhancement Plan](api-enhancement-plan.md)** - Future API roadmap

### 📖 **Examples & Patterns**
- **[Real-World Examples](examples/)** - Production-ready implementations
- **[Performance Patterns](examples/performance-page-integration.md)** - Optimization techniques
- **[Hydration Patterns](hydration-guide.md)** - Interactive component examples

## 💡 Quick Taste

Want to see Coherent.js in action? Here's a complete example:

```javascript
import { render, createComponent } from '@coherentjs/core';

// Define a reusable component
const TodoItem = createComponent(({ task, completed }) => ({
  li: {
    className: completed ? 'completed' : 'pending',
    children: [
      { span: { text: task } },
      { button: { 
        onclick: `toggleTask('${task}')`, 
        text: completed ? '✓' : '○' 
      } }
    ]
  }
}));

// Use it in a larger component
const TodoApp = {
  div: {
    className: 'todo-app',
    children: [
      { h1: { text: 'My Todo List' } },
      { ul: { 
        children: tasks.map(task => TodoItem(task))
      } }
    ]
  }
};

// Render to HTML
const html = render(TodoApp);
```

## 🌟 Community & Support

- **[Examples Repository](/examples)** - Practical, runnable examples
- **[GitHub Discussions](https://github.com/Tomdrouv1/coherent.js/discussions)** - Community help
- **[Issue Tracker](https://github.com/Tomdrouv1/coherent.js/issues)** - Bug reports and features
- **[Performance Benchmarks](/performance)** - Real-world metrics

---

**Ready to build faster, simpler web applications?** 

👉 **[Start with the Installation Guide →](/docs/getting-started/)**

*Coherent.js - Where pure JavaScript meets peak performance.*
