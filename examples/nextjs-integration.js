/**
 * Next.js Integration Example
 * 
 * This example demonstrates how to integrate Coherent.js with Next.js:
 * - API route handlers with server-side rendering
 * - Automatic component rendering
 * - Request data integration
 * - Performance monitoring
 */

import { createCoherentNextHandler } from '../src/nextjs/coherent-nextjs.js';

// Enhanced Next.js home page component
export const NextHomePage = ({ name = 'World', timestamp = new Date().toISOString() }) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Coherent.js + Next.js Integration' } },
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
                .info-section {
                  background: #edf2f7;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 30px 0;
                }
                .info-item {
                  margin: 10px 0;
                  padding: 10px;
                  background: white;
                  border-radius: 6px;
                  border-left: 4px solid #38a169;
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
                        { h1: { text: 'Coherent.js + Next.js' } },
                        { p: { text: `Welcome, ${name}! Experience seamless Next.js integration with server-side rendering.` } }
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
                                    { h3: { text: '🚀 API Route Integration' } },
                                    { p: { text: 'Seamless integration with Next.js API routes for server-side rendering.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature-card',
                                  children: [
                                    { h3: { text: '📊 Performance Monitoring' } },
                                    { p: { text: 'Built-in performance tracking and optimization for Next.js applications.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature-card',
                                  children: [
                                    { h3: { text: '🔧 Zero Configuration' } },
                                    { p: { text: 'Drop-in integration with existing Next.js projects without configuration.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature-card',
                                  children: [
                                    { h3: { text: '⚡ Static Generation' } },
                                    { p: { text: 'Compatible with Next.js static generation and incremental static regeneration.' } }
                                  ]
                                }
                              }
                            ]
                          }
                        },
                        {
                          div: {
                            className: 'info-section',
                            children: [
                              { h3: { text: 'Request Information' } },
                              {
                                div: {
                                  className: 'info-item',
                                  children: [
                                    { strong: { text: 'Rendered At: ' } },
                                    { span: { text: new Date(timestamp).toLocaleString() } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'info-item',
                                  children: [
                                    { strong: { text: 'Framework: ' } },
                                    { span: { text: 'Next.js with Coherent.js' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'info-item',
                                  children: [
                                    { strong: { text: 'Rendering: ' } },
                                    { span: { text: 'Server-Side Rendering (SSR)' } }
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
                        { p: { text: 'Powered by Coherent.js and Next.js • Built for modern web applications' } }
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

// Enhanced user profile component for Next.js integration
export async function getServerSideProps(_context) {
  const { username } = _context.query;
  const userAgent = _context.req.headers['user-agent'] || 'Unknown';
  const timestamp = new Date().toLocaleString();
  const method = _context.req.method || 'GET';
  
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: `${username}'s Profile - Next.js + Coherent.js` } },
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
                  .next-badge {
                    background: #000;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.8em;
                    margin-left: 10px;
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
                          {
                            h1: {
                              children: [
                                { span: { text: `👤 ${username}'s Profile` } },
                                { span: { text: 'Next.js', className: 'next-badge' } }
                              ]
                            }
                          },
                          { p: { text: 'User profile rendered with Next.js API routes and Coherent.js integration' } }
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
                                { strong: { text: 'Request Method: ' } },
                                { span: { text: method } }
                              ]
                            }
                          },
                          {
                            div: {
                              className: 'info-item',
                              children: [
                                { strong: { text: 'Request Path: ' } },
                                { span: { text: _context.req.url || '/api/user/[username]' } }
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
                          },
                          {
                            div: {
                              className: 'info-item',
                              children: [
                                { strong: { text: 'Framework: ' } },
                                { span: { text: 'Next.js + Coherent.js' } }
                              ]
                            }
                          }
                        ]
                      }
                    },
                    {
                      a: {
                        href: '/api/home',
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

// Create optimized Next.js API route handlers
export const homeHandler = createCoherentNextHandler(() => {
  return NextHomePage({ 
    name: 'Next.js Developer',
    timestamp: new Date().toISOString()
  });
}, {
  enablePerformanceMonitoring: true,
  cacheComponents: true
});

export const userHandler = createCoherentNextHandler((req) => {
  return NextUserPage(req);
}, {
  enablePerformanceMonitoring: true
});

// API status handler for health checks
export const statusHandler = createCoherentNextHandler((req, res) => {
  // Return JSON response for API status
  res.status(200).json({
    status: 'ok',
    framework: 'Next.js + Coherent.js',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Export as default for Next.js API routes
export default function handler(_req, _res) {
  // Return JSON response for API status
  _res.status(200).json({
    status: 'ok',
    framework: 'Next.js + Coherent.js',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}

/**
 * Usage Instructions:
 * 
 * To use these handlers in your Next.js application:
 * 
 * 1. Create pages/api/home.js:
 *    export { homeHandler as default } from '../../examples/nextjs-integration.js';
 * 
 * 2. Create pages/api/user/[username].js:
 *    export { userHandler as default } from '../../../examples/nextjs-integration.js';
 * 
 * 3. Create pages/api/status.js:
 *    export { statusHandler as default } from '../../examples/nextjs-integration.js';
 */
