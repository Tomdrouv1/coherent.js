# 🚀 Coherent.js

[![npm version](https://img.shields.io/npm/v/@coherent.js/core/beta.svg)](https://www.npmjs.com/package/@coherent.js/core)
[![Beta Status](https://img.shields.io/badge/status-beta-orange.svg)](https://github.com/Tomdrouv1/coherent.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A high-performance JavaScript framework for building modern web applications with a focus on speed, simplicity, and developer experience.

> **⚠️ Beta Release**: Coherent.js is currently in beta (v1.0.0-beta.1). The API is stable, but we're collecting feedback before the v1.0.0 stable release. Install with `npm install @coherent.js/core@beta`

## ✨ Features

### Core Framework

- **Lightweight & Fast**: Optimized for performance with minimal overhead
- **Component-Based**: Build reusable UI components with a simple API
- **Server-Side Rendering (SSR)**: Built-in SSR for better SEO and performance
- **Progressive Enhancement**: Graceful fallback to client-side rendering when needed
- **State Management**: Built-in reactive state management
- **Routing**: Declarative client-side routing
- **Build Tooling**: Works with modern build tools like Vite and Webpack

### 🎯 Features (v1.0.0-beta.1)

#### **Plugin System**
- Extensible plugin architecture with lifecycle hooks
- 7 built-in plugins (Performance, DevLogger, Analytics, Cache, ErrorRecovery, Validation, Hydration)
- Dependency resolution and priority-based execution
- 10+ lifecycle hooks for complete control

#### **Testing Utilities**
- Complete testing package with test renderer
- 15+ custom matchers for Coherent.js
- Event simulation and async testing utilities
- Mock functions and spies
- Snapshot testing support

#### **Error Boundaries**
- Production-ready error handling
- Custom fallback components
- Reset functionality and auto-recovery
- Async error boundaries
- Global error handler

#### **Developer Tools**
- Component inspector for structure analysis
- Performance profiler with session tracking
- Development logger with 6 log levels
- Real-time debugging and statistics

#### **Internationalization (i18n)**
- Complete translation system with interpolation
- Pluralization support (Intl.PluralRules)
- Date/Number/Currency/List formatters
- Automatic locale detection
- RTL language support

#### **Form Utilities**
- Comprehensive validation system
- 10+ built-in validators
- Form builder with auto-generation
- Field-level and form-level validation
- Touch tracking and error management

#### **SEO Optimization**
- Meta tag builder (Open Graph, Twitter Cards)
- XML sitemap generator
- JSON-LD structured data
- Automatic SEO optimization

#### **Performance Optimization**
- Code splitting with dynamic imports
- Advanced caching (LRU, LFU, FIFO)
- Lazy loading with Intersection Observer
- Memoization utilities
- Progressive image loading

### Performance Highlights

- **Fast Hydration**: Efficient client-side hydration
- **Optimized Updates**: Smart re-rendering and DOM updates
- **Tree-shaking Support**: Only include what you use
- **Small Bundle Size**: Minimal footprint for faster loading
- **Smart Caching**: Multiple caching strategies built-in
- **Code Splitting**: Automatic route-based splitting

## 📦 Packages

Coherent.js is distributed as a collection of packages:

### Core Packages
- `@coherent.js/core`: Core framework with component system and state management
- `@coherent.js/router`: Client-side routing solution
- `@coherent.js/ssr`: Server-side rendering utilities
- `@coherent.js/hmr`: Hot Module Replacement support

### Additional Packages
- `@coherent.js/plugins`: Plugin system with 7 built-in plugins
- `@coherent.js/testing`: Complete testing utilities and matchers
- `@coherent.js/devtools`: Developer tools (inspector, profiler, logger)
- `@coherent.js/runtime`: Enhanced runtimes (Node.js, Edge)
- `@coherent.js/i18n`: Full internationalization support
- `@coherent.js/forms`: Form utilities and validation
- `@coherent.js/seo`: SEO optimization tools
- `@coherent.js/performance`: Performance optimization utilities

### Integration Packages
- `@coherent.js/api`: API framework with validation and OpenAPI
- `@coherent.js/express`: Express.js integration
- `@coherent.js/fastify`: Fastify integration
- `@coherent.js/koa`: Koa.js integration

## 🚀 Getting Started

### Installation

```bash
# Using npm
npm install @coherent.js/core@beta

# Using yarn
yarn add @coherent.js/core@beta

# Using pnpm
pnpm add @coherent.js/core@beta
```

> **Note**: Coherent.js is currently in beta (v1.0.0-beta.1). Use the `@beta` tag to install the latest beta version.

### Development Installation

To contribute or test the framework locally:

```bash
git clone https://github.com/Tomdrouv1/coherent.js.git
cd coherent.js
pnpm install
pnpm build
pnpm test
```

### Basic Usage

```javascript
// App.js - Using pure JavaScript objects (no JSX needed!)
import { createComponent } from '@coherent.js/core';

export const Counter = createComponent(({ initialCount = 0 }) => {
  let count = initialCount;
  
  return {
    div: {
      className: 'counter',
      children: [
        { h2: { text: `Count: ${count}` } },
        { 
          button: { 
            text: 'Increment',
            onclick: () => {
              count++;
              // Re-render logic handled by framework
            }
          }
        }
      ]
    }
  };
});

// Client-side hydration
import { hydrate } from '@coherent.js/client';
import { Counter } from './App.js';

hydrate(Counter({ initialCount: 0 }), document.getElementById('app'));
```

### Server-Side Rendering (SSR)

```js
// server.js
import { render } from '@coherent.js/core';
import { Counter } from './App.js';

const html = render(Counter({ initialCount: 5 }));
// Send this HTML to the client
```

## 🔌 API Framework

Coherent.js includes a comprehensive API framework for building REST, RPC, and GraphQL APIs:

- **API Router**: Lightweight routing system with all HTTP methods
- **Validation**: Schema-based request validation with JSON Schema
- **Error Handling**: Standardized error classes and global error handling
- **Serialization**: Automatic serialization of complex data types (Date, Map, Set)
- **OpenAPI**: Automatic OpenAPI 3.0 documentation generation with Swagger UI
- **Middleware**: Extensible middleware system for authentication, logging, CORS, etc.
- **Adapters**: Pre-built adapters for REST, RPC, and GraphQL patterns

## 📦 Installation

```bash
# Core package (required)
npm install @coherent.js/core@beta

# Framework integrations (choose what you need)
npm install @coherent.js/express@beta      # Express.js integration
npm install @coherent.js/fastify@beta      # Fastify integration
npm install @coherent.js/koa@beta          # Koa integration
npm install @coherent.js/nextjs@beta       # Next.js integration

# Additional packages
npm install @coherent.js/api@beta          # API framework utilities
npm install @coherent.js/database@beta     # Database layer with multiple adapters
npm install @coherent.js/client@beta       # Client-side hydration
```

### Available Packages

- `@coherent.js/core` - Core framework with component system and state management
- `@coherent.js/api` - API framework with validation, OpenAPI generation, and error handling
- `@coherent.js/database` - Database layer with PostgreSQL, MySQL, SQLite, MongoDB adapters
- `@coherent.js/client` - Client-side hydration and progressive enhancement
- `@coherent.js/express` - Express.js integration
- `@coherent.js/fastify` - Fastify integration
- `@coherent.js/koa` - Koa.js integration
- `@coherent.js/nextjs` - Next.js integration

## 🚀 Quick Start

### 1. Create a Simple Component

```javascript
// components/HelloWorld.js
import { createComponent } from '@coherent.js/core';

export const HelloWorld = createComponent(() => ({
  div: {
    className: 'hello',
    children: [
      { h1: { text: 'Hello, World!' } },
      { p: { text: 'Welcome to Coherent.js' } }
    ]
  }
}));
```

### 2. Server-Side Rendering

```js
// server.js
import express from 'express';
import { render } from '@coherent.js/core/ssr';
import { HelloWorld } from './components/HelloWorld';

const app = express();

app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Coherent.js App</title>
      </head>
      <body>
        <div id="root">${render(HelloWorld())}</div>
        <script src="/client.js" type="module"></script>
      </body>
    </html>
  `;
  
  res.send(html);
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 3. Client-Side Hydration

```jsx
// client.js
import { hydrate, makeHydratable, autoHydrate } from '@coherent.js/client';
import { HelloWorld } from './components/HelloWorld';

// Method 1: Direct hydration
hydrate(HelloWorld, document.getElementById('root'));

// Method 2: Auto-hydration for multiple components
const HydratableHelloWorld = makeHydratable(HelloWorld);
autoHydrate({
  HelloWorld: HydratableHelloWorld
});
```

## 🌊 Client-Side Hydration Guide

Coherent.js provides powerful client-side hydration capabilities to make server-rendered components interactive in the browser.

### Basic Hydration Setup

For simple cases, directly hydrate a single component:

```javascript
import { hydrate } from '@coherent.js/client';
import { MyComponent } from './components/MyComponent.js';

// Hydrate a component on page load
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('app');
  if (rootElement) {
    hydrate(rootElement, MyComponent, { initialProps: {} });
  }
});
```

### State Management with Hydration

For components with state management using `withState`:

```javascript
// components/Counter.js
import { withState } from '@coherent.js/core';

const CounterComponent = withState({
  count: 0
}, {
  debug: true
});

const CounterView = (props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;

  const increment = () => {
    setState({ count: state.count + 1 });
  };

  return {
    div: {
      className: 'counter',
      'data-coherent-component': 'counter',
      children: [
        { h2: { text: `Count: ${state.count}` } },
        { 
          button: { 
            id: 'increment-btn',
            text: 'Increment',
            onclick: increment
          }
        }
      ]
    }
  };
};

export const Counter = CounterComponent(CounterView);
```

### Auto-Hydration for Multiple Components

For pages with multiple interactive components:

```javascript
// hydration.js
import { makeHydratable, autoHydrate } from '@coherent.js/client';
import { Counter } from './components/Counter.js';
import { TodoList } from './components/TodoList.js';

// Make components hydratable
const HydratableCounter = makeHydratable(Counter);
const HydratableTodoList = makeHydratable(TodoList);

// Auto-hydrate all components on page load
document.addEventListener('DOMContentLoaded', () => {
  autoHydrate({
    counter: HydratableCounter,
    todolist: HydratableTodoList
  });
});
```

### Handling Event Listeners

Coherent.js automatically converts function event handlers to `data-action` attributes during SSR:

```javascript
// Server renders this:
{ button: { onclick: () => alert('Clicked!') } }
// Becomes: <button data-action="__coherent_action_123" data-event="click">

// Client-side hydration automatically reconnects these handlers
```

### Custom Hydration for Complex Cases

For complex interactive pages, you might need custom hydration logic:

```javascript
// custom-hydration.js
async function setupPageHydration() {
  // Wait for all scripts to load
  await new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
  
  // Custom button mapping for specific pages
  if (document.querySelector('[data-coherent-component="performance"]')) {
    setupPerformancePageHandlers();
  }
  
  // Generic auto-hydration for other components
  autoHydrate(componentRegistry);
}

function setupPerformancePageHandlers() {
  const buttonMappings = [
    { id: 'run-all-tests', handler: 'runPerformanceTests' },
    { id: 'run-render-test', handler: 'runRenderingTest' },
    { id: 'clear-results', handler: 'clearResults' }
  ];

  buttonMappings.forEach(mapping => {
    const button = document.getElementById(mapping.id);
    const handler = window[mapping.handler];
    
    if (button && handler) {
      // Remove any conflicting attributes
      button.removeAttribute('data-action');
      button.removeAttribute('data-event');
      
      // Attach clean event listener
      button.addEventListener('click', (e) => {
        e.preventDefault();
        handler();
      });
    }
  });
}

// Initialize hydration
setupPageHydration();
```

### Best Practices for Hydration

1. **Use data-coherent-component attributes** to identify components:
   ```javascript
   {
     div: {
       'data-coherent-component': 'my-component',
       className: 'my-component',
       children: [...]
     }
   }
   ```

2. **Handle timing properly** - ensure DOM and scripts are loaded:
   ```javascript
   document.addEventListener('DOMContentLoaded', () => {
     setTimeout(initHydration, 100); // Small delay for deferred scripts
   });
   ```

3. **Clean up conflicting handlers** when needed:
   ```javascript
   // Remove server-rendered data-action attributes if they conflict
   element.removeAttribute('data-action');
   element.removeAttribute('data-event');
   ```

4. **Provide fallbacks** for when JavaScript is disabled:
   ```javascript
   // Server-rendered forms should work without JavaScript
   { 
     form: { 
       action: '/api/submit', 
       method: 'POST',
       onsubmit: enhancedSubmitHandler // Enhanced with JS
     }
   }
   ```

### Debugging Hydration Issues

Add debugging to understand what's happening:

```javascript
console.log('🌊 Hydration starting...');
console.log('Available functions:', Object.keys(window).filter(k => typeof window[k] === 'function'));
console.log('Component elements:', document.querySelectorAll('[data-coherent-component]'));

// Enable debug mode for withState components
const ComponentWithDebug = withState({
  // initial state
}, {
  debug: true // Logs all state changes
});
```

## 🛠️ API Framework

### Basic API Endpoint

```js
// api/users.js
import { createApiRouter, withValidation } from '@coherent.js/api';

const router = createApiRouter();

// Validation schema
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

// GET /api/users
router.get('/users', (req, res) => {
  return { users: [] };
});

// POST /api/users
router.post('/users', 
  withValidation(userSchema),
  (req, res) => {
    const { name, email } = req.body;
    // Create user logic here
    return { user: { id: 1, name, email } };
  }
);

export default router;
```

### API with Express.js

```javascript
import express from 'express';
import apiRouter from './api-router.js'; // Your API router
import { createErrorHandler } from '@coherent/api';

const app = express();
app.use(express.json());

// Mount the API router
app.use('/api', apiRouter.toExpress());

// Global error handler
app.use(createErrorHandler());

app.listen(3000, () => {
  console.log('API server running on http://localhost:3000');
});
```

## 🎯 Performance

### Built-in Monitoring

```javascript
import { performanceMonitor } from '@coherent.js/core';

performanceMonitor.start();

// Your rendering code here

const stats = performanceMonitor.generateReport();
console.log(stats);
```

### Memoization

```javascript
import { memo } from '@coherent/core';

const ExpensiveComponent = memo(
  (context) => {
    // Expensive computation here
    return { div: { text: computeResult(context.data) } };
  },
  (context) => context.data.id // Custom key function
);
```

### Streaming for Large Documents

```javascript
import { renderToStream } from '@coherent/core';

const stream = renderToStream(largeComponent, context);

stream.on('data', (chunk) => {
  response.write(chunk);
});

stream.on('end', () => {
  response.end();
});
```

## 📚 Documentation

- [API Reference](docs/api-reference.md) - Complete documentation of all Coherent.js APIs
- [Migration Guide](docs/migration-guide.md) - Instructions for migrating from React, template engines, and string-based frameworks
- [Examples](examples) - Practical examples demonstrating various features

### Using UI Components

Coherent.js uses a pure object syntax for defining components, making it intuitive and powerful:

```javascript
import { createComponent, render } from '@coherent/core';

// Create a simple component
const Greeting = createComponent(({ name = 'World' }) => ({
  div: {
    className: 'greeting',
    children: [
      { h1: { text: `Hello, ${name}!` } },
      { p: { text: 'Welcome to Coherent.js' } }
    ]
  }
}));

// Render the component
const html = render(Greeting({ name: 'Developer' }));
console.log(html);
```

### Using the API Framework

Coherent.js includes a powerful API framework for building REST APIs:

```javascript
import { createApiRouter, withValidation } from '@coherent.js/api';

// Create an API router
const router = createApiRouter();

// Define a validation schema
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

// Define routes
router.get('/users', (req, res) => {
  // Get all users
  return { users: [] };
});

router.post('/users', 
  withValidation(userSchema),
  (req, res) => {
    // Create a new user
    const { name, email } = req.body;
    return { user: { id: 1, name, email } };
  }
);

// Export for use with Express, Fastify, etc.
export default router;
```

### Integration with Express.js

```javascript
// server.js
import express from 'express';
import apiRouter from './api.js';
import { createErrorHandler } from '@coherent.js/api';
import { setupCoherent, createCoherentHandler } from '@coherent.js/express';

const app = express();
app.use(express.json());

// Setup Coherent.js with Express
setupCoherent(app);

// Mount API routes
app.use('/api', apiRouter.toExpress());

// Error handling
app.use(createErrorHandler());

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Integration with Fastify

```javascript
// server.js
import fastify from 'fastify';
import apiRouter from './api.js';
import { setupCoherent, createHandler } from '@coherent.js/fastify';

const app = fastify();

// Setup Coherent.js with Fastify
setupCoherent(app);

// Register API routes
app.register(apiRouter.toFastify());

app.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server running on ${address}`);
});
```

### Using in Another Project

To use Coherent.js in your own project:

1. **Install the package**

   ```bash
   npm install @coherent.js/core
   ```

2. **Import and use components**

   ```javascript
   import { createComponent, render } from '@coherent.js/core';
   
   const MyComponent = createComponent(({ message }) => ({
     div: {
       className: 'my-component',
       children: [
         { h2: { text: message } },
         { p: { text: 'This is my Coherent.js component!' } }
       ]
     }
   }));
   
   const html = render(MyComponent({ message: 'Hello from Coherent.js!' }));
   ```

3. **API usage**

   ```javascript
   import { createApiRouter } from '@coherent.js/api';
   
   // Create a new API router
   const router = createApiRouter();
   
   // Define a simple endpoint
   router.get('/hello', (req, res) => {
     return { message: 'Hello from Coherent.js API!' };
   });
   
   export default router;
   ```

4. **Express.js integration**

   ```javascript
   import express from 'express';
   import { setupCoherent } from '@coherent/express';
   
   const app = express();
   setupCoherent(app);
   
   // Now you can return Coherent.js components directly from routes
   app.get('/', (req, res) => {
     res.send({
       html: {
         children: [
           { h1: { text: 'Hello from Coherent.js with Express!' } }
         ]
       }
     });
   });
   
   app.listen(3000);
   ```

5. **Fastify integration**

   ```javascript
   import fastify from 'fastify';
   import { setupCoherent } from '@coherent/fastify';
   
   const app = fastify();
   setupCoherent(app);
   
   // Now you can return Coherent.js components directly from routes
   app.get('/', (req, res) => {
     return {
       html: {
         children: [
           { h1: { text: 'Hello from Coherent.js with Fastify!' } }
         ]
       }
     };
   });
   
   app.listen({ port: 3000 });
   ```

## 🏗️ Object Structure

Coherent.js is built around pure JavaScript objects that represent HTML structures:

```javascript
// Basic structure
{
  tagName: {
    attribute: 'value',
    className: 'css-class',
    text: 'Simple text content',
    html: '<raw>HTML content</raw>',
    children: [/* Array of child elements */]
  }
}
```

### Special Properties

- `text` - Escaped text content
- `html` - Unescaped HTML content
- `children` - Array of child elements
- `className` - Converted to `class` attribute
- `htmlFor` - Converted to `for` attribute

### Examples

```javascript
// Simple element with text
{ h1: { text: 'Page Title' } }
// → <h1>Page Title</h1>

// Element with attributes
{ input: { type: 'text', placeholder: 'Enter name', required: true } }
// → <input type="text" placeholder="Enter name" required>

// Nested elements
{
  div: {
    className: 'container',
    children: [
      { h2: { text: 'Section Title' } },
      { p: { text: 'Some content here' } }
    ]
  }
}
// → <div class="container"><h2>Section Title</h2><p>Some content here</p></div>

// Raw HTML (use with caution!)
{ div: { html: '<strong>Bold</strong> text' } }
// → <div><strong>Bold</strong> text</div>
```

## 🛠️ Development

### Running the Demo

```bash
git clone https://github.com/your-username/coherent-js.git
cd coherent-js
pnpm install
pnpm run demo
```

### Project Structure

```bash
coherent-framework/
├── src/
│   ├── coherent.js              # Main entry point
│   ├── core/                    # Core utilities and helpers
│   │   ├── object-utils.js
│   │   ├── html-utils.js
│   │   └── validation.js
│   ├── rendering/               # Rendering engines
│   │   ├── html-renderer.js
│   │   └── streaming-renderer.js
│   ├── performance/             # Performance monitoring
│   │   └── monitor.js
│   ├── components/              # Component system
│   │   └── component-system.js
│   ├── client/                  # Client-side hydration
│   │   └── client.js
│   ├── express/                 # Express.js integration
│   │   └── index.js
│   ├── fastify/                 # Fastify integration
│   │   └── index.js
│   └── nextjs/                  # Next.js integration
│       └── index.js
├── examples/                    # Example applications
│   ├── basic-usage.js
│   ├── advanced-features.js
│   ├── express-integration.js
│   ├── fastify-integration.js
│   ├── nextjs-integration.js
│   ├── performance-test.js
│   └── streaming-test.js
├── docs/                        # Documentation
│   ├── api-reference.md
│   └── migration-guide.md
├── tests/                       # Test suite
│   └── rendering.test.js
├── scripts/                     # Development scripts
│   └── dev-server.js
├── package.json
├── README.md
├── LICENSE
├── CONTRIBUTING.md
└── CHANGELOG.md
```

## Why Choose Coherent.js?

### vs JSX/React SSR

- ✅ **No build step required** - Pure JavaScript, no compilation
- ✅ **Smaller bundle size** - Minimal overhead, maximum performance
- ✅ **Server-optimized** - Built specifically for SSR from ground up
- ✅ **Better debugging** - Full object visibility and inspection

### vs Template Engines (Handlebars, Mustache, etc.)

- ✅ **Type-safe with IDE support** - Full autocomplete and error checking
- ✅ **Component composition** - Reusable, composable components
- ✅ **Performance monitoring** - Built-in optimization tools
- ✅ **Streaming support** - Handle large documents efficiently

### vs Virtual DOM (React, Vue, etc.)

- ✅ **Faster rendering** - No diffing overhead
- ✅ **Smaller bundle size** - Minimal overhead, maximum performance
- ✅ **Server-optimized** - Built specifically for SSR from ground up
- ✅ **Better debugging** - Full object visibility and inspection

### vs String Concatenation/Template Literals

- ✅ **Automatic HTML escaping** - Built-in XSS protection
- ✅ **Structured, maintainable code** - Clear object hierarchy
- ✅ **Component reusability** - DRY principle enforcement
- ✅ **Performance optimization** - Smart caching and memoization

## 🔒 Security

Coherent.js includes built-in security features:

- **Automatic HTML escaping** - All text content is automatically escaped to prevent XSS attacks
- **XSS protection** by default for user-generated content
- **Safe attribute handling** with proper escaping
- **Void element validation** to prevent malformed HTML

```javascript
// This is automatically escaped
{ p: { text: '<script>alert("xss")</script>' } }
// → <p>&lt;script&gt;alert("xss")&lt;/script&gt;</p>
## 🚀 Performance Benchmarks

Coherent.js is designed for speed:

- **~2-5ms** average render time for typical components
- **Sub-millisecond** rendering for cached components
- **Memory efficient** with automatic garbage collection
- **Streaming support** for large documents without memory issues

### Benchmark Results (1000 requests)

| Server Configuration | Requests per Second | Comparison to Fastest |
|---------------------|-------------------:|---------------------:|
| Coherent.js API Server (HTTP/1.1) | 9,627.87 req/s | 100.0% (baseline) |
| Node.js HTTP Server | 8,837.48 req/s | 91.8% (slower) |
| Coherent.js API Server (HTTP/2) | 8,745.49 req/s | 90.8% (slower) |
| Coherent.js API Server (Pure Node.js) | 7,997.86 req/s | 83.1% (slower) |
| Express.js Server | 7,553.39 req/s | 78.5% (slower) |

```javascript
// Example performance monitoring output
{
  totalRenders: 1247,
  averageRenderTime: 2.3,
  cacheHitRate: 78.5,
  memoryEfficiency: 94.2,
  recommendations: [
    {
      type: 'caching_opportunity',
      component: 'UserProfile',
      potentialSavings: '15ms per render'
    }
  ]
}
```

## 🗺️ Roadmap

### Current Status: Beta (v1.0.0-beta.1)

**What's Complete:**
- [x] Core object-to-HTML rendering
- [x] Performance monitoring system
- [x] Streaming support
- [x] Component utilities (memo, compose, etc.)
- [x] TypeScript definitions - Full type safety
- [x] Client-side hydration - Progressive enhancement
- [x] Framework integrations - Express, Fastify, Next.js adapters
- [x] Comprehensive API documentation
- [x] Plugin system with 7 built-in plugins
- [x] Testing utilities and matchers
- [x] Developer tools (inspector, profiler, logger)
- [x] Internationalization (i18n) support
- [x] Form utilities and validation
- [x] SEO optimization tools

**In Progress:**
- [ ] Collect beta user feedback
- [ ] Performance optimizations based on real-world usage
- [ ] Additional examples and tutorials

**Planned for v1.0.0 Stable:**
- [ ] Production-ready stability
- [ ] Comprehensive test coverage (>95%)
- [ ] Performance benchmarks against other frameworks
- [ ] Migration tools from React/Vue

**Future (v1.1.0+):**
- [ ] IDE plugins - Syntax highlighting and autocomplete
- [ ] Component library ecosystem - Reusable UI components
- [ ] Advanced optimizations - Tree shaking, code splitting
- [ ] Visual development tools

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** and add tests
4. **Run the demo**: `pnpm run demo` to ensure everything works
5. **Submit a pull request**

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation for API changes
- Performance test significant changes

### Issues and Discussions

- 🐛 **Bug reports**: Use GitHub Issues
- 💡 **Feature requests**: Start a GitHub Discussion
- ❓ **Questions**: Check existing issues or start a discussion

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: This README and code examples
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Email**: [thomas.drouvin@gmail.com](mailto:thomas.drouvin@gmail.com) (for security issues)

---

<!-- CENTER_START -->

**Coherent.js** - Pure objects, pure performance, pure simplicity. 🚀

[Get Started](#-quick-start) • [API Reference](docs/api-reference.md) • [Examples](examples/) • [Contribute](#-contributing)

<!-- CENTER_END -->
