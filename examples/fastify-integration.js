/**
 * Fastify Integration Example
 * 
 * This example demonstrates how to integrate Coherent.js with Fastify:
 * - Server-side rendering with Fastify plugin
 * - Automatic component rendering
 * - Request data integration
 * - Performance monitoring
 */

import fastify from 'fastify';
import { coherentFastify, createCoherentFastifyHandler } from '../src/fastify/coherent-fastify.js';

// Create Fastify app with optimized configuration
const app = fastify({
  logger: process.env.NODE_ENV !== 'production'
});

const PORT = process.env.PORT || 3000;

// Register Coherent.js plugin with enhanced configuration
app.register(coherentFastify, {
  enablePerformanceMonitoring: true,
  cacheComponents: true
});

// Enhanced home page component
export const HomePage = ({ name = 'World' }) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Coherent.js + Fastify Integration' } },
            {
              style: {
                text: `
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  max-width: 900px; 
                  margin: 0 auto; 
                  padding: 20px; 
                  background: #f8fafc;
                  line-height: 1.6;
                }
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 40px;
                  padding-bottom: 20px;
                  border-bottom: 2px solid #e2e8f0;
                }
                .header h1 {
                  color: #1a202c;
                  margin-bottom: 10px;
                  font-size: 2.5em;
                  font-weight: 300;
                }
                .header p {
                  color: #4a5568;
                  font-size: 1.2em;
                }
                .content { 
                  margin: 30px 0; 
                }
                .features-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                  gap: 20px;
                  margin: 30px 0;
                }
                .feature-card {
                  padding: 20px;
                  background: #f7fafc;
                  border-radius: 8px;
                  border-left: 4px solid #3182ce;
                }
                .feature-card h3 {
                  color: #2d3748;
                  margin-bottom: 10px;
                }
                .feature-card p {
                  color: #4a5568;
                  margin: 0;
                }
                .navigation {
                  margin: 30px 0;
                  padding: 20px;
                  background: #edf2f7;
                  border-radius: 8px;
                }
                .nav-links {
                  display: flex;
                  gap: 15px;
                  flex-wrap: wrap;
                }
                .nav-link {
                  padding: 10px 20px;
                  background: #3182ce;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  transition: background 0.2s;
                }
                .nav-link:hover {
                  background: #2c5aa0;
                }
                .footer { 
                  margin-top: 40px; 
                  text-align: center; 
                  padding-top: 20px;
                  border-top: 1px solid #e2e8f0;
                  color: #718096; 
                  font-size: 0.9em; 
                }
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
                className: 'container',
                children: [
                  {
                    div: {
                      className: 'header',
                      children: [
                        { h1: { text: 'Coherent.js + Fastify' } },
                        { p: { text: `Welcome, ${name}! Experience server-side rendering at its finest.` } }
                      ]
                    }
                  },
                  {
                    div: {
                      className: 'content',
                      children: [
                        { h2: { text: 'Integration Features' } },
                        {
                          div: {
                            className: 'features-grid',
                            children: [
                              {
                                div: {
                                  className: 'feature-card',
                                  children: [
                                    { h3: { text: '🚀 Server-Side Rendering' } },
                                    { p: { text: 'Components are rendered on the server for optimal performance and SEO.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature-card',
                                  children: [
                                    { h3: { text: '📊 Performance Monitoring' } },
                                    { p: { text: 'Built-in performance tracking and optimization metrics.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature-card',
                                  children: [
                                    { h3: { text: '🔌 Plugin Integration' } },
                                    { p: { text: 'Seamless Fastify plugin with zero-configuration setup.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature-card',
                                  children: [
                                    { h3: { text: '⚡ High Performance' } },
                                    { p: { text: 'Optimized rendering pipeline with caching and streaming support.' } }
                                  ]
                                }
                              }
                            ]
                          }
                        },
                        {
                          div: {
                            className: 'navigation',
                            children: [
                              { h3: { text: 'Explore Examples' } },
                              {
                                div: {
                                  className: 'nav-links',
                                  children: [
                                    { a: { href: '/user/demo', text: 'User Profile', className: 'nav-link' } },
                                    { a: { href: '/about', text: 'About Page', className: 'nav-link' } },
                                    { a: { href: '/api/status', text: 'API Status', className: 'nav-link' } }
                                  ]
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                  },
                  {
                    div: {
                      className: 'footer',
                      children: [
                        { p: { text: 'Powered by Coherent.js and Fastify • Built for modern web applications' } }
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
});

// Enhanced user profile component with request data integration
export const UserPage = (request) => {
  const { username } = request.params;
  const userAgent = request.headers['user-agent'] || 'Unknown';
  const timestamp = new Date().toLocaleString();
  
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: `${username}'s Profile - Coherent.js` } },
              {
                style: {
                  text: `
                  body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px; 
                    background: #f8fafc;
                  }
                  .profile-container {
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                  }
                  .profile-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e2e8f0;
                  }
                  .profile-info {
                    background: #f7fafc;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                  }
                  .info-item {
                    margin: 10px 0;
                    padding: 10px;
                    background: white;
                    border-radius: 6px;
                    border-left: 4px solid #3182ce;
                  }
                  .back-link {
                    display: inline-block;
                    padding: 10px 20px;
                    background: #3182ce;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin-top: 20px;
                  }
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
                  className: 'profile-container',
                  children: [
                    {
                      div: {
                        className: 'profile-header',
                        children: [
                          { h1: { text: `👤 ${username}'s Profile` } },
                          { p: { text: 'User profile rendered with Coherent.js and Fastify integration' } }
                        ]
                      }
                    },
                    {
                      div: {
                        className: 'profile-info',
                        children: [
                          { h3: { text: 'Request Information' } },
                          {
                            div: {
                              className: 'info-item',
                              children: [
                                { strong: { text: 'Username: ' } },
                                { span: { text: username } }
                              ]
                            }
                          },
                          {
                            div: {
                              className: 'info-item',
                              children: [
                                { strong: { text: 'Request Path: ' } },
                                { span: { text: request.url } }
                              ]
                            }
                          },
                          {
                            div: {
                              className: 'info-item',
                              children: [
                                { strong: { text: 'User Agent: ' } },
                                { span: { text: userAgent.substring(0, 100) + (userAgent.length > 100 ? '...' : '') } }
                              ]
                            }
                          },
                          {
                            div: {
                              className: 'info-item',
                              children: [
                                { strong: { text: 'Rendered At: ' } },
                                { span: { text: timestamp } }
                              ]
                            }
                          }
                        ]
                      }
                    },
                    {
                      a: {
                        href: '/',
                        text: '← Back to Home',
                        className: 'back-link'
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

// Routes

// Home page using automatic rendering
app.get('/', async () => {
  // Just return a Coherent.js component - plugin will handle rendering
  return HomePage({ name: 'Fastify Developer' });
});

// User page using custom handler
app.get('/user/:username', createCoherentFastifyHandler((request) => {
  return UserPage(request);
}));

// API route (not using Coherent.js)
app.get('/api/status', async () => {
  return {
    status: 'ok',
    framework: 'Coherent.js with Fastify',
    timestamp: new Date().toISOString()
  };
});

// Using the reply.coherent() method
app.get('/about', async (_, _reply) => {
  _reply.coherent({
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
app.setErrorHandler((error, _request, _reply) => {
  app.log.error(error);
  _reply.status(500).send({
    error: 'Internal Server Error',
    message: error.message
  });
});

// Start server with enhanced error handling
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    if (process.env.NODE_ENV !== 'production') {
      app.log.info(`🚀 Fastify server with Coherent.js running at http://localhost:${PORT}`);
      app.log.info('📖 Available routes:');
      app.log.info(`   Home: http://localhost:${PORT}/`);
      app.log.info(`   User: http://localhost:${PORT}/user/demo`);
      app.log.info(`   About: http://localhost:${PORT}/about`);
      app.log.info(`   API:  http://localhost:${PORT}/api/status`);
    }
  } catch (err) {
    app.log.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export default app;
