# Framework Integrations

Coherent.js provides seamless integrations with popular web frameworks to make it easy to use in existing projects.

## Express.js Integration

The Express.js integration provides middleware and utilities for using Coherent.js with Express applications.

### Installation

```bash
npm install express
# Coherent.js is already included in your project
```

### Usage

```javascript
import express from 'express';
import { coherentMiddleware, createCoherentHandler, setupCoherentExpress } from 'coherent/express';

const app = express();

// Setup Coherent.js with Express
setupCoherentExpress(app, {
  useMiddleware: true,
  enablePerformanceMonitoring: true
});

// Create a Coherent.js component
function HomePage({ name }) {
  return {
    div: {
      children: [
        { h1: { text: `Hello, ${name}!` } },
        { p: { text: 'Welcome to Coherent.js with Express!' } }
      ]
    }
  };
}

// Route using automatic rendering
app.get('/', (req, res) => {
  res.send(HomePage({ name: 'Express User' }));
});

// Route using custom handler
app.get('/about', createCoherentHandler((req, res) => {
  return {
    div: {
      children: [
        { h1: { text: 'About' } },
        { p: { text: 'This is the about page.' } }
      ]
    }
  };
}));

app.listen(3000);
```

### API

- `coherentMiddleware(options)`: Express middleware for automatic Coherent.js rendering
- `createCoherentHandler(componentFactory, options)`: Create Express route handlers for Coherent.js components
- `setupCoherentExpress(app, options)`: Setup Coherent.js with an Express app

## Fastify Integration

The Fastify integration provides a plugin and utilities for using Coherent.js with Fastify applications.

### Installation

```bash
npm install fastify
# Coherent.js is already included in your project
```

### Usage

```javascript
import fastify from 'fastify';
import { coherentFastify, createCoherentFastifyHandler } from 'coherent/fastify';

const app = fastify();

// Register Coherent.js plugin
app.register(coherentFastify, {
  enablePerformanceMonitoring: true
});

// Create a Coherent.js component
function HomePage({ name }) {
  return {
    div: {
      children: [
        { h1: { text: `Hello, ${name}!` } },
        { p: { text: 'Welcome to Coherent.js with Fastify!' } }
      ]
    }
  };
}

// Route using automatic rendering
app.get('/', (request, reply) => {
  return HomePage({ name: 'Fastify User' });
});

// Route using custom handler
app.get('/about', createCoherentFastifyHandler((request, reply) => {
  return {
    div: {
      children: [
        { h1: { text: 'About' } },
        { p: { text: 'This is the about page.' } }
      ]
    }
  };
}));

app.listen({ port: 3000 });
```

### API

- `coherentFastify(fastify, options, done)`: Fastify plugin for Coherent.js
- `createCoherentFastifyHandler(componentFactory, options)`: Create Fastify route handlers for Coherent.js components
- `setupCoherentFastify(fastify, options)`: Setup Coherent.js with a Fastify instance

## Next.js Integration

The Next.js integration provides utilities for using Coherent.js with Next.js applications, including API routes and App Router support.

### Installation

```bash
npm install next react react-dom
# Coherent.js is already included in your project
```

### Usage with API Routes

```javascript
// pages/api/home.js
import { createCoherentNextHandler } from 'coherent/nextjs';

function HomePage({ name }) {
  return {
    div: {
      children: [
        { h1: { text: `Hello, ${name}!` } },
        { p: { text: 'Welcome to Coherent.js with Next.js!' } }
      ]
    }
  };
}

export default createCoherentNextHandler((req, res) => {
  return HomePage({ name: 'Next.js User' });
}, {
  enablePerformanceMonitoring: true
});
```

### Usage with App Router

```javascript
// app/home/route.js
import { createCoherentAppRouterHandler } from 'coherent/nextjs';

function HomePage({ name }) {
  return {
    div: {
      children: [
        { h1: { text: `Hello, ${name}!` } },
        { p: { text: 'Welcome to Coherent.js with Next.js App Router!' } }
      ]
    }
  };
}

export const GET = createCoherentAppRouterHandler((request) => {
  return HomePage({ name: 'Next.js App Router User' });
});
```

### API

- `createCoherentNextHandler(componentFactory, options)`: Create Next.js API route handlers
- `createCoherentAppRouterHandler(componentFactory, options)`: Create Next.js App Router handlers
- `createCoherentServerComponent(componentFactory, options)`: Create Next.js Server Components (async)
- `createCoherentClientComponent(componentFactory, options)`: Create Next.js Client Components (async)

## Performance Monitoring

All integrations support performance monitoring when enabled:

```javascript
setupCoherentExpress(app, {
  enablePerformanceMonitoring: true
});

// Or with middleware
app.use(coherentMiddleware({
  enablePerformanceMonitoring: true
}));
```

Performance metrics are automatically collected and can be accessed through the performance monitor:

```javascript
import { performanceMonitor } from 'coherent/performance';

// Get performance statistics
const stats = performanceMonitor.getStats();
console.log(stats);
```

## Template Customization

All integrations support custom HTML templates:

```javascript
const template = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>My App</title>
  </head>
  <body>
    {{content}}
  </body>
</html>
`;

app.use(coherentMiddleware({
  template: template
}));
```
