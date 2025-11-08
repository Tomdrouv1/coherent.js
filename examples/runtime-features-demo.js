/**
 * Coherent.js Runtime Features Demo
 * 
 * Demonstrates streaming, middleware, and Node.js runtime features
 */

import { createRuntime, RuntimeEnvironment } from '../packages/runtime/src/index.js';

console.log('\n=== Coherent.js Runtime Features Demo ===\n');

// Example 1: Edge Runtime with Streaming
console.log('--- Example 1: Edge Runtime with Streaming ---\n');

const edgeRuntime = await createRuntime(RuntimeEnvironment.EDGE, {
  streaming: true,
  streamChunkSize: 512
});

const edgeApp = edgeRuntime.createApp();

edgeApp.get('/stream', async () => {
  const largeComponent = {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Streaming Demo' } }
            ]
          }
        },
        {
          body: {
            children: Array.from({ length: 100 }, (_, i) => ({
              div: {
                className: 'item',
                text: `Item ${i + 1}: ${'Lorem ipsum '.repeat(10)}`
              }
            }))
          }
        }
      ]
    }
  };

  return await edgeRuntime.renderStream(largeComponent);
});

console.log('✅ Edge runtime with streaming configured');
console.log('   Route: /stream');
console.log('   Chunk size: 512 bytes');

// Example 2: Middleware in Edge Runtime
console.log('\n--- Example 2: Middleware in Edge Runtime ---\n');

const middlewareRuntime = await createRuntime(RuntimeEnvironment.EDGE);
const middlewareApp = middlewareRuntime.createApp();

// Logging middleware
middlewareApp.use(async (context, next) => {
  const start = Date.now();
  console.log(`[Middleware] ${context.method} ${context.pathname}`);
  
  await next();
  
  const duration = Date.now() - start;
  console.log(`[Middleware] Completed in ${duration}ms`);
});

// Auth middleware
middlewareApp.use(async (context, next) => {
  const authHeader = context.headers['authorization'];
  
  if (!authHeader && context.pathname.startsWith('/protected')) {
    context.response = new Response('Unauthorized', { status: 401 });
    return;
  }
  
  context.state.user = authHeader ? { id: 1, name: 'User' } : null;
  await next();
});

// CORS middleware
middlewareApp.use(async (context, next) => {
  context.state.cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  await next();
});

middlewareApp.get('/public', async (context) => {
  return {
    component: () => ({
      div: { text: 'Public page - no auth required' }
    })
  };
});

middlewareApp.get('/protected', async (context) => {
  return {
    component: () => ({
      div: { text: `Welcome ${context.state.user?.name || 'Guest'}` }
    })
  };
});

console.log('✅ Middleware configured:');
console.log('   - Logging middleware');
console.log('   - Auth middleware');
console.log('   - CORS middleware');

// Simulate requests
console.log('\nSimulating requests:');

const publicRequest = new Request('http://localhost/public');
const publicResponse = await middlewareApp.fetch(publicRequest);
console.log(`Public route: ${publicResponse.status} ${publicResponse.statusText}`);

const protectedRequest = new Request('http://localhost/protected');
const protectedResponse = await middlewareApp.fetch(protectedRequest);
console.log(`Protected route (no auth): ${protectedResponse.status} ${protectedResponse.statusText}`);

const authedRequest = new Request('http://localhost/protected', {
  headers: { 'Authorization': 'Bearer token123' }
});
const authedResponse = await middlewareApp.fetch(authedRequest);
console.log(`Protected route (with auth): ${authedResponse.status} ${authedResponse.statusText}`);

// Example 3: Node.js Runtime
console.log('\n--- Example 3: Node.js Runtime ---\n');

const nodeRuntime = await createRuntime(RuntimeEnvironment.NODE, {
  port: 3001,
  host: 'localhost',
  caching: true
});

const nodeApp = nodeRuntime.createApp();

// Add middleware
nodeApp.use(async (context, next) => {
  console.log(`[Node] ${context.method} ${context.pathname}`);
  await next();
});

// Register components
nodeApp.component('HomePage', (props) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: props.title || 'Home' } }
          ]
        }
      },
      {
        body: {
          children: [
            { h1: { text: 'Welcome to Coherent.js' } },
            { p: { text: 'Running on Node.js runtime' } }
          ]
        }
      }
    ]
  }
}));

nodeApp.component('UserProfile', (props) => ({
  div: {
    className: 'profile',
    children: [
      { h2: { text: `User: ${props.name}` } },
      { p: { text: `ID: ${props.id}` } }
    ]
  }
}));

// Add routes
nodeApp.get('/', async () => ({
  component: 'HomePage',
  props: { title: 'Home Page' }
}));

nodeApp.get('/user/:id', async (context) => ({
  component: 'UserProfile',
  props: {
    id: context.params.id,
    name: `User ${context.params.id}`
  }
}));

nodeApp.get('/api/data', async () => ({
  json: {
    message: 'Hello from API',
    timestamp: Date.now()
  }
}));

console.log('✅ Node.js runtime configured');
console.log('   Port: 3001');
console.log('   Components: HomePage, UserProfile');
console.log('   Routes: /, /user/:id, /api/data');

// Example 4: Framework Integration Helpers
console.log('\n--- Example 4: Framework Integration Helpers ---\n');

console.log('Express middleware:');
console.log('```javascript');
console.log('const express = require("express");');
console.log('const app = express();');
console.log('');
console.log('app.use(nodeRuntime.expressMiddleware());');
console.log('');
console.log('app.get("/", async (req, res) => {');
console.log('  await req.coherent.render(HomePage, { title: "Home" });');
console.log('});');
console.log('```');

console.log('\nFastify plugin:');
console.log('```javascript');
console.log('const fastify = require("fastify")();');
console.log('');
console.log('fastify.register(nodeRuntime.fastifyPlugin());');
console.log('');
console.log('fastify.get("/", async (request, reply) => {');
console.log('  const html = await fastify.coherent.render(HomePage);');
console.log('  reply.type("text/html").send(html);');
console.log('});');
console.log('```');

console.log('\nKoa middleware:');
console.log('```javascript');
console.log('const Koa = require("koa");');
console.log('const app = new Koa();');
console.log('');
console.log('app.use(nodeRuntime.koaMiddleware());');
console.log('');
console.log('app.use(async (ctx) => {');
console.log('  await ctx.coherent.render(HomePage, { title: "Home" });');
console.log('});');
console.log('```');

// Example 5: Runtime Statistics
console.log('\n--- Example 5: Runtime Statistics ---\n');

const stats = nodeApp.getStats();
console.log('Node.js Runtime Stats:');
console.log(`- Render Count: ${stats.renderCount}`);
console.log(`- Cache Size: ${stats.cacheSize}`);
console.log(`- Component Count: ${stats.componentCount}`);
console.log(`- Route Count: ${stats.routeCount}`);
console.log(`- Middleware Count: ${stats.middlewareCount}`);

// Example 6: Middleware Chain
console.log('\n--- Example 6: Advanced Middleware Chain ---\n');

const advancedRuntime = await createRuntime(RuntimeEnvironment.EDGE);
const advancedApp = advancedRuntime.createApp();

// Request timing middleware
advancedApp.use(async (context, next) => {
  context.state.startTime = Date.now();
  await next();
  context.state.duration = Date.now() - context.state.startTime;
});

// Request ID middleware
advancedApp.use(async (context, next) => {
  context.state.requestId = Math.random().toString(36).substring(7);
  await next();
});

// Error handling middleware
advancedApp.use(async (context, next) => {
  try {
    await next();
  } catch (error) {
    console.error(`[Error] Request ${context.state.requestId}:`, error.message);
    context.response = new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

// Response headers middleware
advancedApp.use(async (context, next) => {
  await next();
  
  if (context.response) {
    const headers = new Headers(context.response.headers);
    headers.set('X-Request-ID', context.state.requestId);
    headers.set('X-Response-Time', `${context.state.duration}ms`);
    
    context.response = new Response(context.response.body, {
      status: context.response.status,
      headers
    });
  }
});

advancedApp.get('/test', async (context) => {
  return {
    component: () => ({
      div: { text: `Request ID: ${context.state.requestId}` }
    })
  };
});

console.log('✅ Advanced middleware chain configured:');
console.log('   1. Request timing');
console.log('   2. Request ID generation');
console.log('   3. Error handling');
console.log('   4. Response headers');

const testRequest = new Request('http://localhost/test');
const testResponse = await advancedApp.fetch(testRequest);
console.log('\nTest request headers:');
console.log(`   X-Request-ID: ${testResponse.headers.get('X-Request-ID')}`);
console.log(`   X-Response-Time: ${testResponse.headers.get('X-Response-Time')}`);

console.log('\n=== Demo Complete ===\n');
console.log('Runtime features implemented:');
console.log('✅ Streaming rendering in Edge runtime');
console.log('✅ Middleware support in Edge runtime');
console.log('✅ Complete Node.js runtime');
console.log('✅ Framework integration helpers (Express, Fastify, Koa)');
console.log('✅ Advanced middleware chains');
console.log('✅ Runtime statistics');
