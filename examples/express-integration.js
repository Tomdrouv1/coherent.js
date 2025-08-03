/**
 * Example demonstrating enhanced Express.js integration with Coherent.js
 */

import express from 'express';
import { coherentMiddleware, createCoherentHandler, setupCoherentExpress } from '../src/express/coherent-express.js';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Setup Coherent.js with Express
setupCoherentExpress(app, {
  useMiddleware: true,
  useEngine: false, // We'll use middleware instead of engine
  enablePerformanceMonitoring: true
});

// Alternative: Use middleware directly
// app.use(coherentMiddleware({ enablePerformanceMonitoring: true }));

// A simple Coherent.js component
function HomePage({ name = 'World' }) {
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Coherent.js Express Example' } },
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
                          { li: { text: '✅ Express.js middleware integration' } },
                          { li: { text: '✅ Zero-configuration setup' } }
                        ]
                      }
                    },
                    {
                      p: {
                        text: 'This page was rendered with Coherent.js and served by Express.js!'
                      }
                    }
                  ]
                }
              },
              {
                div: {
                  className: 'footer',
                  children: [
                    { p: { text: 'Built with Coherent.js and Express.js' } }
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
function UserPage(req) {
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: `User: ${req.params.username}` } }
            ]
          }
        },
        {
          body: {
            children: [
              { h1: { text: `User Profile: ${req.params.username}` } },
              { p: { text: `Path: ${req.path}` } },
              { p: { text: `User Agent: ${req.get('User-Agent')}` } },
              { a: { href: '/', text: '← Back to Home' } }
            ]
          }
        }
      ]
    }
  };
}

// Routes

// Home page using middleware
app.get('/', (req, res) => {
  // Just send a Coherent.js component - middleware will handle rendering
  res.send(HomePage({ name: 'Express Developer' }));
});

// User page using custom handler
app.get('/user/:username', createCoherentHandler((req) => {
  return UserPage(req);
}));

// API route (not using Coherent.js)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    framework: 'Coherent.js with Express',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express server with Coherent.js running at http://localhost:${PORT}`);
  console.log(`📖 Examples:`);
  console.log(`   Home: http://localhost:${PORT}/`);
  console.log(`   User: http://localhost:${PORT}/user/john`);
  console.log(`   API:  http://localhost:${PORT}/api/status`);
});

export default app;
