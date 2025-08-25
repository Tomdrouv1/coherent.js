# 🚀 Coherent.js

A high-performance JavaScript framework for building modern web applications with a focus on speed, simplicity, and developer experience.

## ✨ Features

### Core Framework

- **Lightweight & Fast**: Optimized for performance with minimal overhead
- **Component-Based**: Build reusable UI components with a simple API
- **Server-Side Rendering (SSR)**: Built-in SSR for better SEO and performance
- **Progressive Enhancement**: Graceful fallback to client-side rendering when needed
- **State Management**: Built-in reactive state management
- **Routing**: Declarative client-side routing
- **Build Tooling**: Works with modern build tools like Vite and Webpack

### Performance Highlights

- **Fast Hydration**: Efficient client-side hydration
- **Optimized Updates**: Smart re-rendering and DOM updates
- **Tree-shaking Support**: Only include what you use
- **Small Bundle Size**: Minimal footprint for faster loading

## 📦 Packages

Coherent.js is distributed as a collection of packages:

- `@coherentjs/core`: Core framework with component system and state management
- `@coherentjs/router`: Client-side routing solution
- `@coherentjs/ssr`: Server-side rendering utilities
- `@coherentjs/hmr`: Hot Module Replacement support

## 🚀 Getting Started

### Installation

```bash
# Using npm
npm install @coherentjs/core

# Using yarn
yarn add @coherentjs/core

# Using pnpm
pnpm add @coherentjs/core
```

### Basic Usage

```jsx
// App.jsx
import { createComponent, useState } from '@coherentjs/core';

export const Counter = createComponent(() => {
  const [count, setCount] = useState(0);
  
  return {
    render: () => (
      <div class="counter">
        <h2>Count: {count}</h2>
        <button onclick={() => setCount(c => c + 1)}>Increment</button>
      </div>
    )
  };
});

// Client-side hydration
import { hydrate } from '@coherentjs/core';
import { Counter } from './App';

hydrate(Counter, document.getElementById('app'));
```

### Server-Side Rendering (SSR)

```js
// server.js
import { renderToString } from '@coherentjs/core/ssr';
import { App } from './App';

const html = renderToString(App);
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
# Core package
npm install @coherentjs/core

# Additional integrations (optional)
npm install @coherentjs/express @coherentjs/fastify @coherentjs/api
```

### Available Packages

- `@coherentjs/core` - Core framework with component system and state management
- `@coherentjs/express` - Express.js integration
- `@coherentjs/fastify` - Fastify integration
- `@coherentjs/api` - API framework utilities

## 🚀 Quick Start

### 1. Create a Simple Component

```jsx
// components/HelloWorld.jsx
import { createComponent } from '@coherentjs/core';

export const HelloWorld = createComponent(() => {
  return {
    render: () => (
      <div className="hello">
        <h1>Hello, World!</h1>
        <p>Welcome to Coherent.js</p>
      </div>
    )
  };
});
```

### 2. Server-Side Rendering

```js
// server.js
import express from 'express';
import { renderToString } from '@coherentjs/core/ssr';
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
        <div id="root">${renderToString(HelloWorld())}</div>
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
import { hydrate } from '@coherentjs/core';
import { HelloWorld } from './components/HelloWorld';

hydrate(HelloWorld, document.getElementById('root'));
```

## 🛠️ API Framework

### Basic API Endpoint

```js
// api/users.js
import { createApiRouter, withValidation } from '@coherentjs/api';

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
import { performanceMonitor } from '@coherent/core';

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
- [Examples](examples/) - Practical examples demonstrating various features

### Using UI Components

Coherent.js uses a pure object syntax for defining components, making it intuitive and powerful:

```javascript
import { createComponent, renderToString } from '@coherent/core';

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
const html = renderToString(Greeting({ name: 'Developer' }));
console.log(html);
```

### Using the API Framework

Coherent.js includes a powerful API framework for building REST APIs:

```javascript
import { createApiRouter, withValidation } from '@coherent/api';

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
import { createErrorHandler } from '@coherent/api';
import { setupCoherentExpress, createCoherentHandler } from '@coherent/express';

const app = express();
app.use(express.json());

// Setup Coherent.js with Express
setupCoherentExpress(app);

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
import { setupCoherentFastify, createCoherentFastifyHandler } from '@coherent/fastify';

const app = fastify();

// Setup Coherent.js with Fastify
setupCoherentFastify(app);

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
   npm install @coherent/core
   ```

2. **Import and use components**

   ```javascript
   import { createComponent, renderToString } from '@coherent/core';
   
   const MyComponent = createComponent(({ message }) => ({
     div: {
       className: 'my-component',
       children: [
         { h2: { text: message } },
         { p: { text: 'This is my Coherent.js component!' } }
       ]
     }
   }));
   
   const html = renderToString(MyComponent({ message: 'Hello from Coherent.js!' }));
   ```

3. **API usage**

   ```javascript
   import { createApiRouter } from '@coherentjs/api';
   
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
   import { setupCoherentExpress } from '@coherent/express';
   
   const app = express();
   setupCoherentExpress(app);
   
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
   import { setupCoherentFastify } from '@coherent/fastify';
   
   const app = fastify();
   setupCoherentFastify(app);
   
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
npm install
npm run demo
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

### Phase 1 (Completed)

- [x] Core object-to-HTML rendering
- [x] Performance monitoring system
- [x] Streaming support
- [x] Component utilities (memo, compose, etc.)

### Phase 2 (Current Focus)

- [x] TypeScript definitions - Full type safety
- [x] Client-side hydration - Progressive enhancement
- [x] Hot reload development server - Faster development
- [x] Framework integrations - Express, Fastify, Next.js adapters
- [x] Comprehensive API documentation
- [x] Migration guides and examples
- [ ] Prepare for npm publication
- [ ] Collect early user/developer feedback

### Phase 3 (Future)

- [ ] IDE plugins - Syntax highlighting and autocomplete
- [ ] Component library ecosystem - Reusable UI components
- [ ] Advanced optimizations - Tree shaking, code splitting
- [ ] Testing utilities - Component testing framework

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make your changes** and add tests
4. **Run the demo**: `npm run demo` to ensure everything works
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
