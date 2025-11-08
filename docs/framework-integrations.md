# Framework Integrations

Coherent.js provides seamless integrations with popular web frameworks, making it easy to adopt in existing projects or start new ones. This guide covers setup, usage patterns, and best practices for each supported framework.

## 🚀 Overview

Coherent.js can be integrated with:
- **Express.js** - Most popular Node.js web framework
- **Fastify** - High-performance alternative to Express
- **Next.js** - React-based full-stack framework
- **Koa** - Lightweight web framework by the Express team
- **Hono** - Ultrafast web framework for edge environments
- **Raw Node.js** - Direct HTTP server implementation

## Express.js Integration

Express.js is the most popular Node.js framework, and Coherent.js integrates seamlessly with it for both simple and complex applications.

### Installation

```bash
npm install express @coherent.js/core
# or
pnpm add express @coherent.js/core
```

### Basic Setup

```javascript
import express from 'express';
import { render } from '@coherent.js/core';

const app = express();

// Simple integration - manually render components
app.get('/', (req, res) => {
  const component = {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Express + Coherent.js' } }
            ]
          }
        },
        {
          body: {
            children: [
              { h1: { text: 'Hello from Express!' } },
              { p: { text: 'This is rendered with Coherent.js' } }
            ]
          }
        }
      ]
    }
  };
  
  res.send(render(component));
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

### Advanced Setup with Middleware

```javascript
import express from 'express';
import { render, createCoherent } from '@coherent.js/core';

const app = express();
const coherent = createCoherent({
  enableCache: true,
  enableMonitoring: true
});

// Custom middleware for automatic Coherent.js rendering
const coherentMiddleware = (options = {}) => (req, res, next) => {
  const originalSend = res.send;
  
  res.sendCoherent = (component, props = {}) => {
    try {
      const rendered = coherent.render(component(props));
      res.set('Content-Type', 'text/html');
      res.send(rendered);
    } catch (error) {
      next(error);
    }
  };
  
  next();
};

app.use(coherentMiddleware());

// Create reusable components
const Layout = ({ title, children }) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: title || 'My App' } },
            {
              meta: { charset: 'utf-8' }
            },
            {
              meta: { 
                name: 'viewport', 
                content: 'width=device-width, initial-scale=1' 
              }
            }
          ]
        }
      },
      {
        body: {
          children: Array.isArray(children) ? children : [children]
        }
      }
    ]
  }
});

const HomePage = ({ user }) => Layout({
  title: 'Home - My App',
  children: [
    { h1: { text: `Welcome, ${user?.name || 'Guest'}!` } },
    { 
      nav: {
        children: [
          { a: { href: '/', text: 'Home' } },
          { a: { href: '/about', text: 'About' } },
          { a: { href: '/contact', text: 'Contact' } }
        ]
      }
    },
    {
      main: {
        children: [
          { p: { text: 'This is the home page built with Express and Coherent.js' } },
          {
            ul: {
              children: [
                { li: { text: 'Server-side rendering ✓' } },
                { li: { text: 'Pure JavaScript objects ✓' } },
                { li: { text: 'No build step required ✓' } }
              ]
            }
          }
        ]
      }
    }
  ]
});

// Use the middleware
app.get('/', (req, res) => {
  res.sendCoherent(HomePage, { user: { name: 'Express Developer' } });
});

// API routes can also return Coherent.js components
app.get('/api/users/:id/profile', (req, res) => {
  // Simulate user data
  const user = { id: req.params.id, name: 'John Doe', email: 'john@example.com' };
  
  const UserProfile = ({ user }) => ({
    div: {
      className: 'user-profile',
      children: [
        { h2: { text: user.name } },
        { p: { text: `Email: ${user.email}` } },
        { p: { text: `ID: ${user.id}` } }
      ]
    }
  });
  
  res.json({
    html: render(UserProfile({ user })),
    data: user
  });
});
```

### Error Handling

```javascript
// Error handling middleware for Coherent.js
app.use((error, req, res, next) => {
  const ErrorPage = ({ error, status }) => Layout({
    title: `Error ${status}`,
    children: [
      { h1: { text: `Error ${status}` } },
      { p: { text: error.message } },
      { a: { href: '/', text: 'Go back home' } }
    ]
  });
  
  const status = error.status || 500;
  res.status(status);
  res.sendCoherent(ErrorPage, { error, status });
});
```

### Performance Monitoring

```javascript
import { performanceMonitor } from '@coherent.js/core';

// Add performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    performanceMonitor.recordMetric('request', {
      path: req.path,
      method: req.method,
      status: res.statusCode,
      duration
    });
  });
  
  next();
});

// Performance dashboard endpoint
app.get('/admin/performance', (req, res) => {
  const stats = performanceMonitor.getStats();
  
  const DashboardPage = ({ stats }) => Layout({
    title: 'Performance Dashboard',
    children: [
      { h1: { text: 'Performance Metrics' } },
      {
        div: {
          children: [
            { h3: { text: `Total Requests: ${stats.totalRequests}` } },
            { h3: { text: `Average Response Time: ${stats.averageResponseTime}ms` } },
            { h3: { text: `Cache Hit Rate: ${stats.cacheHitRate}%` } }
          ]
        }
      }
    ]
  });
  
  res.sendCoherent(DashboardPage, { stats });
});
```

## Fastify Integration

Fastify is a high-performance alternative to Express with built-in support for JSON schemas, logging, and plugins. Coherent.js integrates perfectly with Fastify's architecture.

### Installation

```bash
npm install fastify @coherent.js/core
# or
pnpm add fastify @coherent.js/core
```

### Basic Setup

```javascript
import Fastify from 'fastify';
import { render } from '@coherent.js/core';

const fastify = Fastify({ logger: true });

// Simple route with Coherent.js
fastify.get('/', async (request, reply) => {
  const component = {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Fastify + Coherent.js' } }
            ]
          }
        },
        {
          body: {
            children: [
              { h1: { text: 'Hello from Fastify!' } },
              { p: { text: 'Ultra-fast server-side rendering' } }
            ]
          }
        }
      ]
    }
  };
  
  reply.type('text/html');
  return render(component);
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### Plugin-Based Setup

```javascript
import Fastify from 'fastify';
import { render, createCoherent } from '@coherent.js/core';

const fastify = Fastify({ logger: true });

// Create Coherent.js plugin
async function coherentPlugin(fastify, options) {
  const coherent = createCoherent({
    enableCache: true,
    enableMonitoring: true
  });

  // Add coherent rendering to reply object
  fastify.decorateReply('sendCoherent', function(component, props = {}) {
    const rendered = coherent.render(component(props));
    this.type('text/html');
    return this.send(rendered);
  });

  // Add coherent instance to fastify
  fastify.decorate('coherent', coherent);
}

await fastify.register(coherentPlugin);

// Reusable components
const Layout = ({ title, children }) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: title || 'Fastify App' } },
            { meta: { charset: 'utf-8' } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }
          ]
        }
      },
      {
        body: {
          style: 'font-family: Arial, sans-serif; margin: 40px;',
          children: Array.isArray(children) ? children : [children]
        }
      }
    ]
  }
});

const HomePage = ({ user, stats }) => Layout({
  title: 'Fastify Performance Demo',
  children: [
    { h1: { text: `Welcome, ${user?.name || 'Guest'}!` } },
    {
      div: {
        children: [
          { h2: { text: 'Performance Stats' } },
          { p: { text: `Server uptime: ${stats.uptime}ms` } },
          { p: { text: `Requests handled: ${stats.requestCount}` } },
          { p: { text: `Memory usage: ${Math.round(stats.memory / 1024 / 1024)}MB` } }
        ]
      }
    }
  ]
});

// Routes
fastify.get('/', async (request, reply) => {
  const stats = {
    uptime: process.uptime() * 1000,
    requestCount: Math.floor(Math.random() * 1000),
    memory: process.memoryUsage().heapUsed
  };
  
  return reply.sendCoherent(HomePage, { 
    user: { name: 'Fastify Developer' },
    stats 
  });
});

// JSON API that includes HTML preview
fastify.get('/api/users/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  const user = { 
    id: request.params.id, 
    name: 'John Doe', 
    email: 'john@example.com' 
  };
  
  const UserCard = ({ user }) => ({
    div: {
      className: 'user-card',
      style: 'border: 1px solid #ccc; padding: 20px; border-radius: 8px;',
      children: [
        { h3: { text: user.name } },
        { p: { text: `Email: ${user.email}` } },
        { p: { text: `User ID: ${user.id}` } }
      ]
    }
  });
  
  return {
    user,
    html: render(UserCard({ user }))
  };
});
```

### Schema Validation with Coherent.js

```javascript
// Define component with validation
fastify.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' }
      }
    }
  }
}, async (request, reply) => {
  const { name, email } = request.body;
  
  // Create user (simulate)
  const user = { id: Date.now(), name, email };
  
  const SuccessPage = ({ user }) => Layout({
    title: 'User Created',
    children: [
      { h1: { text: 'User Created Successfully!' } },
      { p: { text: `Name: ${user.name}` } },
      { p: { text: `Email: ${user.email}` } },
      { p: { text: `ID: ${user.id}` } },
      { a: { href: '/', text: 'Back to Home' } }
    ]
  });
  
  reply.status(201);
  return reply.sendCoherent(SuccessPage, { user });
});
```

### Error Handling

```javascript
// Custom error handler with Coherent.js
fastify.setErrorHandler((error, request, reply) => {
  const status = error.statusCode || 500;
  
  const ErrorPage = ({ error, status }) => Layout({
    title: `Error ${status}`,
    children: [
      { h1: { text: `Error ${status}` } },
      { p: { text: error.message } },
      { a: { href: '/', text: 'Go Home' } }
    ]
  });
  
  reply.status(status);
  reply.sendCoherent(ErrorPage, { error, status });
});

// Not found handler
fastify.setNotFoundHandler((request, reply) => {
  const NotFoundPage = () => Layout({
    title: '404 - Page Not Found',
    children: [
      { h1: { text: '404 - Page Not Found' } },
      { p: { text: `The page ${request.url} could not be found.` } },
      { a: { href: '/', text: 'Go Home' } }
    ]
  });
  
  reply.status(404);
  reply.sendCoherent(NotFoundPage);
});
```

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
setupCoherent(app, {
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

## Raw Node.js Integration

For maximum performance and control, use Coherent.js directly with Node.js HTTP server.

### Installation

```bash
npm install @coherent.js/core
# No additional dependencies needed
```

### Basic HTTP Server

```javascript
import http from 'node:http';
import { render, createCoherent } from '@coherent.js/core';

const coherent = createCoherent({
  enableCache: true,
  enableMonitoring: true
});

const Layout = ({ title, children }) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: title } },
            { meta: { charset: 'utf-8' } }
          ]
        }
      },
      {
        body: {
          style: 'font-family: Arial, sans-serif; margin: 40px;',
          children: Array.isArray(children) ? children : [children]
        }
      }
    ]
  }
});

const HomePage = ({ timestamp }) => Layout({
  title: 'Node.js + Coherent.js',
  children: [
    { h1: { text: 'Raw Node.js Performance' } },
    { p: { text: 'Ultra-fast server-side rendering without framework overhead' } },
    { p: { text: `Generated at: ${timestamp}` } }
  ]
});

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const html = coherent.render(HomePage({ 
      timestamp: new Date().toISOString() 
    }));
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(coherent.render(Layout({
      title: '404 - Not Found',
      children: [
        { h1: { text: '404 - Page Not Found' } },
        { p: { text: `${req.url} not found` } }
      ]
    })));
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## Koa Integration

Koa provides a lightweight, expressive middleware framework for Node.js.

### Installation

```bash
npm install koa @coherent.js/core
```

### Basic Setup

```javascript
import Koa from 'koa';
import { render, createCoherent } from '@coherent.js/core';

const app = new Koa();
const coherent = createCoherent({
  enableCache: true,
  enableMonitoring: true
});

// Custom middleware for Coherent.js
app.use(async (ctx, next) => {
  ctx.sendCoherent = (component, props = {}) => {
    const html = coherent.render(component(props));
    ctx.type = 'html';
    ctx.body = html;
  };
  
  await next();
});

const Layout = ({ title, children }) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: title || 'Koa App' } },
            { meta: { charset: 'utf-8' } }
          ]
        }
      },
      {
        body: {
          style: 'font-family: Arial, sans-serif; margin: 40px;',
          children: Array.isArray(children) ? children : [children]
        }
      }
    ]
  }
});

// Routes
app.use(async ctx => {
  if (ctx.path === '/') {
    const HomePage = () => Layout({
      title: 'Koa + Coherent.js',
      children: [
        { h1: { text: 'Hello from Koa!' } },
        { p: { text: 'Elegant middleware-based server-side rendering' } },
        { a: { href: '/about', text: 'About' } }
      ]
    });
    
    ctx.sendCoherent(HomePage);
  } else if (ctx.path === '/about') {
    const AboutPage = () => Layout({
      title: 'About - Koa App',
      children: [
        { h1: { text: 'About' } },
        { p: { text: 'This is the about page' } },
        { a: { href: '/', text: 'Home' } }
      ]
    });
    
    ctx.sendCoherent(AboutPage);
  } else {
    ctx.status = 404;
    ctx.sendCoherent(() => Layout({
      title: '404 - Not Found',
      children: [
        { h1: { text: '404 - Page Not Found' } },
        { p: { text: `${ctx.path} not found` } }
      ]
    }));
  }
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## Hono Integration

Hono is an ultrafast web framework designed for edge environments.

### Installation

```bash
npm install hono @coherent.js/core
```

### Edge-Optimized Setup

```javascript
import { Hono } from 'hono';
import { render } from '@coherent.js/core';

const app = new Hono();

// Lightweight components optimized for edge
const Layout = ({ title, children }) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: title } },
            { meta: { charset: 'utf-8' } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }
          ]
        }
      },
      {
        body: {
          style: 'font-family: system-ui, sans-serif; margin: 2rem;',
          children: Array.isArray(children) ? children : [children]
        }
      }
    ]
  }
});

const EdgePage = ({ region, timestamp }) => Layout({
  title: 'Edge Computing with Hono + Coherent.js',
  children: [
    { h1: { text: 'Edge-Optimized Rendering' } },
    { p: { text: `Rendered in region: ${region}` } },
    { p: { text: `At: ${timestamp}` } },
    { p: { text: 'Ultra-fast edge rendering with minimal overhead' } }
  ]
});

app.get('/', (c) => {
  const html = render(EdgePage({
    region: c.env?.CF_RAY || 'local',
    timestamp: new Date().toISOString()
  }));
  
  return c.html(html);
});

// API that returns both JSON and HTML
app.get('/api/status', (c) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    region: c.env?.CF_RAY || 'local'
  };
  
  const StatusCard = ({ status }) => ({
    div: {
      style: 'border: 1px solid #ccc; padding: 1rem; border-radius: 8px;',
      children: [
        { h3: { text: `Status: ${status.status}` } },
        { p: { text: `Region: ${status.region}` } },
        { p: { text: `Time: ${status.timestamp}` } }
      ]
    }
  });
  
  const accept = c.req.header('accept');
  if (accept?.includes('text/html')) {
    return c.html(render(StatusCard({ status })));
  } else {
    return c.json(status);
  }
});

export default app;
```

## Comparative Performance

Here's how different frameworks perform with Coherent.js:

| Framework | Req/sec | Memory Usage | Cold Start | Bundle Size |
|-----------|---------|--------------|------------|-------------|
| **Raw Node.js** | ~12,000 | Lowest | Fastest | Minimal |
| **Fastify** | ~10,500 | Low | Fast | Small |
| **Express** | ~8,500 | Medium | Medium | Medium |
| **Hono** | ~11,000 | Lowest | Fastest | Minimal |
| **Koa** | ~7,800 | Medium | Medium | Small |
| **Next.js** | ~6,500 | High | Slower | Large |

## Best Practices

### 1. Choose the Right Framework

**Raw Node.js**: Maximum performance, microservices
**Fastify**: High-performance APIs with validation
**Express**: Existing projects, extensive ecosystem
**Hono**: Edge computing, serverless functions
**Koa**: Modern middleware patterns
**Next.js**: Full-stack React applications

### 2. Optimize Component Rendering

```javascript
// ✅ Good - Reuse components
const Layout = ({ title, children }) => ({ /* ... */ });
const HomePage = () => Layout({ title: 'Home', children: [...] });

// ❌ Avoid - Recreating components
app.get('/', (req, res) => {
  const component = { html: { /* recreated every time */ } };
  res.send(render(component));
});
```

### 3. Enable Caching

```javascript
// Production setup
const coherent = createCoherent({
  enableCache: true,
  cacheSize: 1000,
  enableMonitoring: true
});
```

### 4. Handle Errors Gracefully

```javascript
// Universal error handling
const ErrorPage = ({ error, status }) => Layout({
  title: `Error ${status}`,
  children: [
    { h1: { text: `Error ${status}` } },
    { p: { text: error.message } }
  ]
});
```

### 5. Monitor Performance

```javascript
import { performanceMonitor } from '@coherent.js/core';

// Regular monitoring
setInterval(() => {
  const stats = performanceMonitor.getStats();
  console.log('Performance:', stats);
}, 60000);
```

## Deployment Considerations

### Production Settings

```javascript
const coherent = createCoherent({
  enableCache: process.env.NODE_ENV === 'production',
  enableMonitoring: true,
  cacheSize: parseInt(process.env.CACHE_SIZE) || 1000,
  maxMemoryUsage: '512MB'
});
```

### Docker Setup

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables

```bash
NODE_ENV=production
CACHE_SIZE=2000
ENABLE_MONITORING=true
PORT=3000
```
```
