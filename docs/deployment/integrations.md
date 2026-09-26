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

## ⚡ The official integrations package (recommended)

Before hand-rolling anything, reach for `@coherent.js/integrations` — it ships
ready-made adapters as subpath exports. Install the framework you use next to it
(the frameworks are optional peer dependencies):

```bash
pnpm add @coherent.js/core @coherent.js/integrations express   # or fastify / koa / next ...
```

The Express, Fastify and Koa adapters render **explicitly**: you hand them a
component and they send HTML. Anything else — `res.send({ users })`, an object
returned from a Fastify handler, `ctx.body = { ok: true }` — stays JSON.

**Express** — `setupCoherent()` adds `res.coherent(component, { template? })`:

```javascript
import express from 'express';
import { setupCoherent, createCoherentHandler } from '@coherent.js/integrations/express';

const app = express();
setupCoherent(app, { template: '<!DOCTYPE html>\n<html><body>{{content}}</body></html>' });

app.get('/', (req, res) => res.coherent(HomePage({ user: req.user })));
app.get('/api/users', (req, res) => res.send({ users }));   // JSON

// Or a handler factory; the factory receives (req, res, next) and may respond itself
app.get('/profile', createCoherentHandler((req) => ProfilePage({ id: req.query.id })));

// Render errors go to your error middleware, as with res.render()
app.use((err, req, res, next) => res.status(500).send('Something went wrong'));
```

To use `res.render()` with Coherent.js views, opt into the view engine. A `.js`
view module's default export is the component (a function receives the render
locals):

```javascript
// views/home.js
export default ({ name }) => ({ h1: { text: `Hello ${name}` } });

// app.js
setupCoherent(app, { useEngine: true, engineName: 'js' });
app.get('/', (req, res) => res.render('home', { name: 'Ada' }));
```

The engine only becomes the app's `view engine` when none is set; otherwise call
`app.set('view engine', 'js')` yourself.

**Fastify** — `setupCoherent` is a Fastify plugin; register it, then use
`reply.coherent(component, { template? })`:

```javascript
import Fastify from 'fastify';
import { setupCoherent } from '@coherent.js/integrations/fastify';

const fastify = Fastify();
await fastify.register(setupCoherent, {
  template: '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body>{{content}}</body></html>'
});

fastify.get('/', async (request, reply) => reply.coherent(HomePage()));
fastify.get('/api/status', async () => ({ ok: true }));        // JSON
```

Calling `setupCoherent(fastify, options)` directly throws; always `register` it.
Render errors inside `reply.coherent()` go through Fastify's error pipeline
(`onError` hooks, `setErrorHandler`, the request logger).

**Koa** — `setupCoherent()` adds `ctx.coherent(component, { template? })`:

```javascript
import Koa from 'koa';
import { setupCoherent } from '@coherent.js/integrations/koa';

const app = new Koa();
setupCoherent(app, { template: '<!DOCTYPE html>\n{{content}}' });

app.use(async (ctx) => {
  if (ctx.path === '/api/status') {
    ctx.body = { ok: true };            // JSON
    return;
  }
  ctx.coherent(HomePage());             // render errors are thrown into the middleware chain
});
```

**Automatic rendering (opt-in).** `autoRender: true` —
`setupCoherent(app, { autoRender: true })` for Express and Koa,
`fastify.register(setupCoherent, { autoRender: true })` for Fastify — also renders
any *component-shaped* value passed to `res.send()`, returned from a Fastify
handler or assigned to `ctx.body`. "Component-shaped" means "an object with exactly
one key", which JSON such as `{ ok: true }` or `{ error: 'Invalid credentials' }`
matches too, so only enable it for apps that serve no JSON through those paths.

**Next.js** — wrap a component factory as a route handler:

```javascript
// app/users/[id]/route.js (App Router)
import { createCoherentAppRouterHandler } from '@coherent.js/integrations/nextjs';

export const GET = createCoherentAppRouterHandler(async (request, { params }) => {
  const { id } = await params; // a Promise from Next.js 15 on
  return UserPage({ id });
});
```

`createCoherentNextHandler()` does the same for Pages Router API routes.
`createCoherentServerComponent()` and `createCoherentClientComponent()` are async
and resolve to React components; pass `{ React }` to supply the React module
explicitly.

**Astro, Remix and SvelteKit** — `@coherent.js/integrations/astro`
(`createAstroIntegration()`, with the renderer at `/astro/server`), `/remix`
(`withCoherent(Component, { as })`, which renders the markup inside a wrapper
element, a `<div>` by default) and `/sveltekit` (`createPreprocessor()`,
`createHandle()`).

> **Stability:** the Astro, Remix and SvelteKit adapters are young. Their tests run a real `astro build`, compile and server-render a component with the Svelte compiler, and server-render the Remix wrapper with React, but the adapters have seen little production use.

The sections below show *manual* integration patterns — useful to understand
what the adapters do under the hood, or when you want full control.

## Manual Express.js Integration

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
import { render } from '@coherent.js/core';

const app = express();

// Custom middleware that adds res.sendCoherent()
const coherentMiddleware = () => (req, res, next) => {
  res.sendCoherent = (component, props = {}) => {
    try {
      const rendered = render(component(props));
      res.set('Content-Type', 'text/html');
      res.send(`<!DOCTYPE html>${rendered}`);
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
  // Never show internal error messages to users
  res.sendCoherent(ErrorPage, { error: status < 500 ? error : { message: 'Internal Server Error' }, status });
});
```

### Performance Monitoring

```javascript
import { render, performanceMonitor } from '@coherent.js/core';

// Record render timings
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>${render(HomePage({ user: req.user }), { enableMonitoring: true })}`);
});

// Performance dashboard endpoint (protect it in production)
app.get('/admin/performance', (req, res) => {
  const { metrics } = performanceMonitor.generateReport();

  const DashboardPage = () => Layout({
    title: 'Performance Dashboard',
    children: [
      { h1: { text: 'Performance Metrics' } },
      { p: { text: `Renders: ${metrics.renderTime.count}` } },
      { p: { text: `Average render time: ${metrics.renderTime.avg.toFixed(2)} ms` } }
    ]
  });

  res.sendCoherent(DashboardPage);
});
```

## Manual Fastify Integration

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
import { render } from '@coherent.js/core';

const fastify = Fastify({ logger: true });

// Add coherent rendering to the reply object. Decorating the root instance
// directly keeps it visible to every route (a decorator added inside a
// registered plugin is scoped to that plugin unless it skips encapsulation).
fastify.decorateReply('sendCoherent', function (component, props = {}) {
  const rendered = render(component(props));
  this.type('text/html');
  return this.send(`<!DOCTYPE html>${rendered}`);
});

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
      { p: { text: status < 500 ? error.message : 'Internal Server Error' } },
      { a: { href: '/', text: 'Go Home' } }
    ]
  });

  request.log.error(error);
  reply.status(status);
  return reply.sendCoherent(ErrorPage, { error, status });
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
  return reply.sendCoherent(NotFoundPage);
});
```

## Next.js Integration

The Next.js integration renders Coherent.js components from API routes and App Router route handlers.

### Installation

```bash
pnpm add @coherent.js/core @coherent.js/integrations next react react-dom
```

### Usage with API Routes

```javascript
// pages/api/home.js
import { createCoherentNextHandler } from '@coherent.js/integrations/nextjs';

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
// app/users/[id]/route.js
import { createCoherentAppRouterHandler } from '@coherent.js/integrations/nextjs';

export const GET = createCoherentAppRouterHandler(async (request, { params }) => {
  const { id } = await params; // a Promise from Next.js 15 on
  return {
    div: {
      children: [
        { h1: { text: `User ${id}` } },
        { p: { text: 'Rendered by Coherent.js in an App Router route handler' } }
      ]
    }
  };
});
```

### API

- `createCoherentNextHandler(componentFactory, options)`: Pages Router API route handler
- `createCoherentAppRouterHandler(componentFactory, options)`: App Router route handler; the factory receives `(request, context)`
- `createCoherentServerComponent(componentFactory, options)`: resolves to a Server Component (async)
- `createCoherentClientComponent(componentFactory, options)`: resolves to a Client Component (async)

`react` and `next` are optional peer dependencies of `@coherent.js/integrations`; pass `{ React }` in the options to supply React explicitly.

## Performance Monitoring

The adapters accept `enablePerformanceMonitoring`:

```javascript
setupCoherent(app, { enablePerformanceMonitoring: true });
```

The metrics are read from the core monitor:

```javascript
import { performanceMonitor } from '@coherent.js/core';

const { metrics } = performanceMonitor.generateReport();
console.log(metrics.renderTime);
```

## Template Customization

The Express, Fastify and Koa adapters take a `template` whose `{{content}}` placeholder receives the rendered component (the default is `<!DOCTYPE html>\n{{content}}`):

```javascript
const template = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>My App</title>
  </head>
  <body>
    {{content}}
  </body>
</html>`;

setupCoherent(app, { template });                    // default for every res.coherent()
app.get('/plain', (req, res) => res.coherent(Page(), { template: '{{content}}' })); // per call
```

The rendered HTML is inserted literally, so `$` sequences in page content are preserved.

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
import { render } from '@coherent.js/core';

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
    const html = render(HomePage({
      timestamp: new Date().toISOString()
    }));

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>${html}`);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(render(Layout({
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

## Manual Koa Integration

Koa provides a lightweight, expressive middleware framework for Node.js.

### Installation

```bash
npm install koa @coherent.js/core
```

### Basic Setup

```javascript
import Koa from 'koa';
import { render } from '@coherent.js/core';

const app = new Koa();

// Custom middleware for Coherent.js
app.use(async (ctx, next) => {
  ctx.sendCoherent = (component, props = {}) => {
    const html = render(component(props));
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

Hono is a small web framework that runs on several JavaScript runtimes. Coherent.js is built and tested for Node.js 22.12+; other runtimes are not tested.

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

The framework's own overhead usually dominates over rendering. Measure your pages with your framework of choice (for example with `autocannon`), and compare against the rendering benchmark in the repository (`pnpm perf:render`).

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

### 3. Cache Deliberately

Caching is opt-in. Memoize expensive components with `memo()`; for pages that are re-rendered with identical trees, use a bounded whole-render cache:

```javascript
import { render, createCacheManager } from '@coherent.js/core';

const pageCache = createCacheManager({ maxCacheSize: 500, ttlMs: 60_000 });
const html = render(AboutPage(), { enableCache: true, cache: pageCache });
```

### 4. Handle Errors Gracefully

```javascript
// Universal error page: only show messages meant for users
const ErrorPage = ({ error, status }) => Layout({
  title: `Error ${status}`,
  children: [
    { h1: { text: `Error ${status}` } },
    { p: { text: status < 500 ? error.message : 'Something went wrong' } }
  ]
});

// A component that throws makes render() throw (a RenderingError with the
// component's path), so the framework answers 500 instead of a partial page.
```

### 5. Monitor Performance

```javascript
import { performanceMonitor } from '@coherent.js/core';

// Regular monitoring of renders made with { enableMonitoring: true }
setInterval(() => {
  console.log('Render time:', performanceMonitor.generateReport().metrics.renderTime);
}, 60000).unref();
```

## Deployment Considerations

### Production Settings

- Set `NODE_ENV=production`.
- Behind a reverse proxy, tell your framework (`app.set('trust proxy', 1)` in Express) and, for the `@coherent.js/api` router, set `trustProxy`, so rate limits key on the client address.
- Keep error messages of 5xx responses out of pages and JSON (the API router and the adapters already do).

### Docker Setup

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables

```bash
NODE_ENV=production
PORT=3000
```

Besides `NODE_ENV`, `@coherent.js/core` reads `COHERENT_SILENT=1` and `COHERENT_DEBUG=1`, which turn its error logging off or on. Add your own variables (database URL, `JWT_SECRET`...) as your app needs them.
