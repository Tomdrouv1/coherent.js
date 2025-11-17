# @coherent.js/koa

Koa.js adapter for Coherent.js - High-performance server-side rendering with Koa integration.

## Installation

```bash
npm install @coherent.js/koa
# or
pnpm add @coherent.js/koa
# or
yarn add @coherent.js/koa
```

**Note:** You also need to install Koa and Coherent.js core:

```bash
npm install koa @coherent.js/core
# or
pnpm add koa @coherent.js/core
```

## Overview

The `@coherent.js/koa` package provides seamless integration between Coherent.js and Koa.js, enabling you to build high-performance server-side rendered applications with Koa's middleware ecosystem.

## Quick Start

```javascript
import Koa from 'koa';
import { createCoherentHandler } from '@coherent.js/koa';

// Create your Coherent.js component
function App({ name = 'World' }) {
  return {
    div: {
      children: [
        { h1: { text: `Hello, ${name}!` } },
        { p: { text: 'This is rendered with Coherent.js' } }
      ]
    }
  };
}

// Create Koa app
const app = new Koa();

// Add Coherent.js handler
app.use(createCoherentHandler(App, {
  // Optional configuration
  template: ({ html, head, body }) => `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Coherent.js Koa App</title>
        ${head}
      </head>
      <body>
        <div id="app">${body}</div>
      </body>
    </html>
  `
}));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## Features

### Middleware Integration

Use Koa middleware alongside Coherent.js rendering:

```javascript
import Koa from 'koa';
import logger from 'koa-logger';
import { createCoherentHandler } from '@coherent.js/koa';

const app = new Koa();

// Add Koa middleware
app.use(logger());

// Add Coherent.js rendering
app.use(createCoherentHandler(App));

app.listen(3000);
```

### Request Context Access

Access Koa request context in your components:

```javascript
function App({ ctx }) {
  // ctx is the Koa context object
  const userAgent = ctx.get('User-Agent');
  const ipAddress = ctx.ip;
  
  return {
    div: {
      children: [
        { p: { text: `Your IP: ${ipAddress}` } },
        { p: { text: `User Agent: ${userAgent}` } }
      ]
    }
  };
}
```

### Custom Routes

Handle specific routes with Coherent.js:

```javascript
import Koa from 'koa';
import Router from '@koa/router';
import { createCoherentHandler } from '@coherent.js/koa';

const app = new Koa();
const router = new Router();

// Handle specific routes
router.get('/', createCoherentHandler(HomePage));
router.get('/about', createCoherentHandler(AboutPage));
router.get('/users/:id', createCoherentHandler(UserProfile));

app.use(router.routes());
app.listen(3000);
```

### Error Handling

Integrate with Koa's error handling:

```javascript
import Koa from 'koa';
import { createCoherentHandler } from '@coherent.js/koa';

const app = new Koa();

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
    ctx.app.emit('error', err, ctx);
  }
});

// Coherent.js handler
app.use(createCoherentHandler(App));

app.listen(3000);
```

## Configuration Options

### Template Function

Customize the HTML template:

```javascript
app.use(createCoherentHandler(App, {
  template: ({ html, head, body, ctx }) => `
    <!DOCTYPE html>
    <html lang="${ctx.acceptsLanguages()[0] || 'en'}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${head}
      </head>
      <body>
        <div id="app">${body}</div>
        <script>
          window.__INITIAL_DATA__ = ${JSON.stringify(ctx.state)};
        </script>
      </body>
    </html>
  `
}));
```

### Props Function

Customize component props based on Koa context:

```javascript
app.use(createCoherentHandler(App, {
  props: (ctx) => ({
    userAgent: ctx.get('User-Agent'),
    url: ctx.url,
    user: ctx.state.user || null,
    query: ctx.query
  })
}));
```

### Error Component

Provide a custom error component:

```javascript
function ErrorPage({ error, status }) {
  return {
    div: {
      className: 'error-page',
      children: [
        { h1: { text: `Error ${status}` } },
        { p: { text: error.message } }
      ]
    }
  };
}

app.use(createCoherentHandler(App, {
  errorComponent: ErrorPage
}));
```

## Performance Optimizations

### Caching

Enable response caching:

```javascript
import cache from 'koa-cache-lite';

app.use(cache({
  '/api/*': 5 * 60 * 1000, // 5 minutes for API routes
  '/static/*': 60 * 60 * 1000 // 1 hour for static assets
}));

app.use(createCoherentHandler(App));
```

### Compression

Add response compression:

```javascript
import compress from 'koa-compress';

app.use(compress({
  threshold: 2048,
  gzip: { flush: require('zlib').constants.Z_SYNC_FLUSH }
}));

app.use(createCoherentHandler(App));
```

## Advanced Usage

### Server-Side State Management

Manage state during server rendering:

```javascript
function App({ ctx }) {
  // Create request-scoped state
  const requestState = {
    requestId: Math.random().toString(36),
    renderStartTime: Date.now()
  };
  
  ctx.state.requestState = requestState;
  
  return {
    div: {
      children: [
        { p: { text: `Request ID: ${requestState.requestId}` } }
      ]
    }
  };
}
```

### Integration with Koa Router

Advanced routing with parameters:

```javascript
import Router from '@koa/router';

const router = new Router();

router.get('/', createCoherentHandler(HomePage));
router.get('/users/:id', createCoherentHandler(UserProfile, {
  props: (ctx) => ({
    userId: ctx.params.id,
    query: ctx.query
  })
}));
router.get('/api/*', createCoherentHandler(ApiDocs));

app.use(router.routes());
app.use(router.allowedMethods());
```

## API Reference

### createCoherentHandler(component, options)

Create a Koa middleware for Coherent.js rendering.

**Parameters:**
- `component` - Coherent.js component function
- `options.template` - Function to customize HTML template
- `options.props` - Function to generate component props from Koa context
- `options.errorComponent` - Component to render on errors
- `options.enableHydration` - Boolean to enable client-side hydration (default: true)

**Returns:** Koa middleware function

### Options

- `template` - Function receiving { html, head, body, ctx } and returning HTML string
- `props` - Function receiving Koa context and returning component props
- `errorComponent` - Component for error rendering
- `enableHydration` - Enable/disable hydration support

## Examples

### Full Application Example

```javascript
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import session from 'koa-session';
import { createCoherentHandler } from '@coherent.js/koa';

// Components
function HomePage({ user }) {
  return {
    div: {
      children: [
        { h1: { text: 'Welcome to Coherent.js + Koa' } },
        user 
          ? { p: { text: `Hello, ${user.name}!` } }
          : { a: { href: '/login', text: 'Login' } }
      ]
    }
  };
}

function LoginPage() {
  return {
    form: {
      action: '/login',
      method: 'POST',
      children: [
        { input: { type: 'email', name: 'email', placeholder: 'Email' } },
        { input: { type: 'password', name: 'password', placeholder: 'Password' } },
        { button: { type: 'submit', text: 'Login' } }
      ]
    }
  };
}

// Create app
const app = new Koa();
const router = new Router();

// Middleware
app.use(logger());
app.use(bodyParser());
app.keys = ['secret-key'];
app.use(session(app));

// Routes
router.get('/', createCoherentHandler(HomePage, {
  props: (ctx) => ({ user: ctx.session.user })
}));

router.get('/login', createCoherentHandler(LoginPage));
router.post('/login', async (ctx) => {
  // Simple auth (in production, use proper authentication)
  const { email, password } = ctx.request.body;
  if (email && password) {
    ctx.session.user = { name: email.split('@')[0], email };
    ctx.redirect('/');
  } else {
    ctx.status = 400;
    ctx.body = { error: 'Invalid credentials' };
  }
});

router.get('/logout', (ctx) => {
  ctx.session = null;
  ctx.redirect('/');
});

// Setup
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## Related Packages

- [@coherent.js/core](../core/README.md) - Core framework
- [@coherent.js/express](../express/README.md) - Express.js adapter
- [@coherent.js/fastify](../fastify/README.md) - Fastify adapter
- [@coherent.js/nextjs](../nextjs/README.md) - Next.js integration

## License

MIT
