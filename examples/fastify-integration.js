/**
 * Example demonstrating Fastify integration with Coherent.js
 */

import fastify from 'fastify';
import { coherentFastify, createCoherentFastifyHandler } from '../src/fastify/coherent-fastify.js';

// Create Fastify app
const app = fastify({
  logger: true
});

const PORT = process.env.PORT || 3000;

// Register Coherent.js plugin
app.register(coherentFastify, {
  enablePerformanceMonitoring: true
});

// A simple Coherent.js component
function HomePage({ name = 'World' }) {
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Coherent.js Fastify Example' } },
              {
                style: {
                  text: `
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; color: #333; }
                    .content { margin-top: 30px; }
                    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 0.9em; }
                  `
                }
              }
            ]
          }
        },
        {
          body: {
            children: [
              {
                div: {
                  className: 'header',
                  children: [
                    { h1: { text: 'Welcome to Coherent.js!' } },
                    { p: { text: `Hello, ${name}!` } }
                  ]
                }
              },
              {
                div: {
                  className: 'content',
                  children: [
                    { h2: { text: 'Features' } },
                    {
                      ul: {
                        children: [
                          { li: { text: '✅ Server-side rendering with Coherent.js' } },
                          { li: { text: '✅ Automatic performance monitoring' } },
                          { li: { text: '✅ Fastify plugin integration' } },
                          { li: { text: '✅ Zero-configuration setup' } }
                        ]
                      }
                    },
                    {
                      p: {
                        text: 'This page was rendered with Coherent.js and served by Fastify!'
                      }
                    }
                  ]
                }
              },
              {
                div: {
                  className: 'footer',
                  children: [
                    { p: { text: 'Built with Coherent.js and Fastify' } }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
}

// A component that uses request data
function UserPage(request) {
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: `User: ${request.params.username}` } }
            ]
          }
        },
        {
          body: {
            children: [
              { h1: { text: `User Profile: ${request.params.username}` } },
              { p: { text: `Path: ${request.url}` } },
              { p: { text: `User Agent: ${request.headers['user-agent']}` } },
              { a: { href: '/', text: '← Back to Home' } }
            ]
          }
        }
      ]
    }
  };
}

// Routes

// Home page using automatic rendering
app.get('/', (request, reply) => {
  // Just return a Coherent.js component - plugin will handle rendering
  return HomePage({ name: 'Fastify Developer' });
});

// User page using custom handler
app.get('/user/:username', createCoherentFastifyHandler((request, reply) => {
  return UserPage(request);
}));

// API route (not using Coherent.js)
app.get('/api/status', (request, reply) => {
  return {
    status: 'ok',
    framework: 'Coherent.js with Fastify',
    timestamp: new Date().toISOString()
  };
});

// Using the reply.coherent() method
app.get('/about', (request, reply) => {
  reply.coherent({
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'About' } }
            ]
          }
        },
        {
          body: {
            children: [
              { h1: { text: 'About This Project' } },
              { p: { text: 'This is a Coherent.js application running on Fastify.' } },
              { a: { href: '/', text: '← Back to Home' } }
            ]
          }
        }
      ]
    }
  });
});

// Error handling
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(500).send({
    error: 'Internal Server Error',
    message: error.message
  });
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Fastify server with Coherent.js running at http://localhost:${PORT}`);
    console.log(`📖 Examples:`);
    console.log(`   Home: http://localhost:${PORT}/`);
    console.log(`   User: http://localhost:${PORT}/user/john`);
    console.log(`   About: http://localhost:${PORT}/about`);
    console.log(`   API:  http://localhost:${PORT}/api/status`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export default app;
