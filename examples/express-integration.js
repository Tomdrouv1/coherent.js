/**
 * Express.js Integration Example
 * Demonstrates Coherent.js components with Express middleware and routing
 */

import express from 'express';
import { createCoherentHandler, setupCoherentExpress } from '../packages/express/src/coherent-express.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Coherent.js with Express
setupCoherentExpress(app, {
  useMiddleware: true,
  useEngine: false,
  enablePerformanceMonitoring: true
});

// Express integration home page component
function ExpressHomePage({ name = 'Express Developer' }) {
  const styles = `
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px; margin: 0 auto; padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; color: white;
    }
    .container { background: rgba(255,255,255,0.1); border-radius: 20px; padding: 40px; backdrop-filter: blur(10px); }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 3em; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    .header p { font-size: 1.2em; margin: 10px 0; opacity: 0.9; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
    .feature { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; }
    .feature h3 { margin: 0 0 10px 0; color: #ffd700; }
    .links { text-align: center; margin-top: 30px; }
    .links a { color: #ffd700; text-decoration: none; margin: 0 15px; font-weight: bold; }
    .links a:hover { text-decoration: underline; }
  `;

  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Coherent.js + Express Integration' } },
              { style: { text: styles } }
            ]
          }
        },
        {
          body: {
            children: [
              {
                div: {
                  class: 'container',
                  children: [
                    {
                      div: {
                        class: 'header',
                        children: [
                          { h1: { text: '🚀 Express + Coherent.js' } },
                          { p: { text: `Welcome, ${name}!` } },
                          { p: { text: 'Server-side rendering made simple' } }
                        ]
                      }
                    },
                    {
                      div: {
                        class: 'features',
                        children: [
                          {
                            div: {
                              class: 'feature',
                              children: [
                                { h3: { text: '⚡ Fast Rendering' } },
                                { p: { text: 'Server-side rendering with automatic optimization' } }
                              ]
                            }
                          },
                          {
                            div: {
                              class: 'feature',
                              children: [
                                { h3: { text: '🔧 Easy Integration' } },
                                { p: { text: 'Drop-in middleware for existing Express apps' } }
                              ]
                            }
                          },
                          {
                            div: {
                              class: 'feature',
                              children: [
                                { h3: { text: '📊 Performance Monitoring' } },
                                { p: { text: 'Built-in performance tracking and metrics' } }
                              ]
                            }
                          },
                          {
                            div: {
                              class: 'feature',
                              children: [
                                { h3: { text: '🛡️ Type Safety' } },
                                { p: { text: 'Full TypeScript support and type safety' } }
                              ]
                            }
                          }
                        ]
                      }
                    },
                    {
                      div: {
                        class: 'links',
                        children: [
                          { a: { href: '/user/demo', text: '👤 User Profile Demo' } },
                          { a: { href: '/api/status', text: '📡 API Status' } }
                        ]
                      }
                    }
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

// User profile component using Express request data
function ExpressUserPage(req) {
  const { username } = req.params;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const timestamp = new Date().toLocaleString();
  
  const styles = `
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px; margin: 0 auto; padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; color: white;
    }
    .profile { background: rgba(255,255,255,0.1); border-radius: 20px; padding: 40px; backdrop-filter: blur(10px); }
    .profile h1 { text-align: center; margin-bottom: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    .info { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0; }
    .info h3 { margin: 0 0 10px 0; color: #ffd700; }
    .info p { margin: 5px 0; opacity: 0.9; }
    .back-link { display: inline-block; margin-top: 20px; color: #ffd700; text-decoration: none; font-weight: bold; }
    .back-link:hover { text-decoration: underline; }
  `;

  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: `User Profile - ${username}` } },
              { style: { text: styles } }
            ]
          }
        },
        {
          body: {
            children: [
              {
                div: {
                  class: 'profile',
                  children: [
                    { h1: { text: `👤 ${username}` } },
                    {
                      div: {
                        class: 'info',
                        children: [
                          { h3: { text: '🔗 Request Info' } },
                          { p: { text: `Path: ${req.path}` } },
                          { p: { text: `Method: ${req.method}` } },
                          { p: { text: `Timestamp: ${timestamp}` } }
                        ]
                      }
                    },
                    {
                      div: {
                        class: 'info',
                        children: [
                          { h3: { text: '🌐 Browser Info' } },
                          { p: { text: `User Agent: ${userAgent.substring(0, 80)}${userAgent.length > 80 ? '...' : ''}` } },
                          { p: { text: `IP: ${req.ip || 'Unknown'}` } }
                        ]
                      }
                    },
                    { a: { href: '/', text: '← Back to Home', class: 'back-link' } }
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

// Routes
app.get('/', (req, res) => {
  res.send(ExpressHomePage({ name: 'Express Developer' }));
});

app.get('/user/:username', createCoherentHandler((req) => {
  return ExpressUserPage(req);
}));

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    framework: 'Coherent.js with Express',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling
app.use((err, req, res) => {
  res.status(500).send({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server only if not imported as module
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Express + Coherent.js server: http://localhost:${PORT}`);
    }
  });
}

// Demo component for live preview
const ExpressIntegrationDemo = () => {
  const styles = `
    .demo { max-width: 800px; margin: 0 auto; padding: 20px; font-family: system-ui, sans-serif; }
    .demo h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .demo .section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .demo pre { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .demo .highlight { background: #ffd700; padding: 2px 4px; border-radius: 3px; }
  `;

  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Express.js Integration Demo' } },
              { style: { text: styles } }
            ]
          }
        },
        {
          body: {
            children: [
              {
                div: {
                  class: 'demo',
                  children: [
                    { h2: { text: '🚀 Express.js Integration with Coherent.js' } },
                    {
                      div: {
                        class: 'section',
                        children: [
                          { h3: { text: 'Setup' } },
                          { p: { text: 'Install the Express integration:' } },
                          { pre: { text: 'npm install @coherent/express' } },
                          { p: { text: 'Configure your Express app:' } },
                          { pre: { text: `import { setupCoherentExpress } from '@coherent/express';

setupCoherentExpress(app, {
  useMiddleware: true,
  enablePerformanceMonitoring: true
});` } }
                        ]
                      }
                    },
                    {
                      div: {
                        class: 'section',
                        children: [
                          { h3: { text: 'Features' } },
                          {
                            ul: {
                              children: [
                                { li: { text: 'Automatic component rendering with Express middleware' } },
                                { li: { text: 'Request data injection into components' } },
                                { li: { text: 'Performance monitoring and metrics' } },
                                { li: { text: 'Error handling and debugging support' } }
                              ]
                            }
                          }
                        ]
                      }
                    },
                    {
                      div: {
                        class: 'section',
                        children: [
                          { h3: { text: 'Usage Example' } },
                          { p: { text: 'Create routes that return Coherent.js components:' } },
                          { pre: { text: `app.get('/', (req, res) => {
  res.send(HomePage({ user: req.user }));
});

app.get('/user/:id', createCoherentHandler((req) => {
  return UserProfile(req.params.id);
}));` } }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
};

export default ExpressIntegrationDemo;
export { app };
