/**
 * COHERENT.JS LIVE DEMO
 * 
 * This file demonstrates real Coherent.js usage with actual imports
 * and can be run directly with Node.js or bundled for the browser.
 * 
 * Run with: node coherent-master-demo.js
 * Or serve with: node -e "const demo = require('./coherent-master-demo.js'); console.log(demo.render());"
 */

import { render, render, withState, memo, VERSION } from '@coherentjs/core';
import { createServer } from 'http';
import { parse as parseUrl } from 'url';

// ===== UTILITY COMPONENTS =====

const Icon = ({ name, size = '1rem' }) => ({
  span: {
    className: `icon icon-${name}`,
    style: `font-size: ${size}; display: inline-flex; align-items: center;`,
    'aria-hidden': true,
    text: {
      check: '✅',
      star: '⭐',
      rocket: '🚀',
      fire: '🔥',
      code: '💻',
      heart: '❤️',
      lightning: '⚡',
      gear: '⚙️',
      target: '🎯',
      chart: '📊'
    }[name] || '📦'
  }
});

const Button = ({ variant = 'primary', children, onClick, ...props }) => ({
  button: {
    className: `btn btn-${variant}`,
    onclick: onClick,
    ...props,
    children: Array.isArray(children) ? children : [children]
  }
});

const Card = ({ title, children, className = '' }) => ({
  div: {
    className: `card ${className}`,
    children: [
      title && {
        header: {
          className: 'card-header',
          children: [
            { h3: { text: title, className: 'card-title' } }
          ]
        }
      },
      {
        div: {
          className: 'card-body',
          children: Array.isArray(children) ? children : [children]
        }
      }
    ].filter(Boolean)
  }
});

// ===== STATE-DRIVEN COMPONENTS =====

const LiveCounter = withState({
  count: 0,
  lastUpdate: null,
  totalClicks: 0
})(({ state, setState }) => {
  
  const increment = () => {
    setState({
      count: state.count + 1,
      lastUpdate: new Date().toLocaleTimeString(),
      totalClicks: state.totalClicks + 1
    });
  };
  
  const decrement = () => {
    setState({
      count: state.count - 1,
      lastUpdate: new Date().toLocaleTimeString(), 
      totalClicks: state.totalClicks + 1
    });
  };
  
  const reset = () => {
    setState({
      count: 0,
      lastUpdate: new Date().toLocaleTimeString(),
      totalClicks: state.totalClicks + 1
    });
  };
  
  return Card({
    title: 'Live Counter with State Management',
    children: [
      {
        div: {
          className: 'counter-display',
          children: [
            { 
              div: { 
                className: 'count-value',
                text: state.count.toString(),
                style: 'font-size: 3rem; font-weight: bold; text-align: center; color: #2563eb; margin: 20px 0;'
              }
            },
            state.lastUpdate && {
              div: {
                className: 'last-update',
                style: 'text-align: center; color: #64748b; margin-bottom: 20px;',
                children: [
                  Icon({ name: 'clock' }),
                  { span: { text: ` Last update: ${state.lastUpdate}` } },
                  { br: {} },
                  { span: { text: `Total clicks: ${state.totalClicks}` } }
                ]
              }
            }
          ].filter(Boolean)
        }
      },
      {
        div: {
          className: 'counter-controls',
          style: 'display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;',
          children: [
            Button({
              variant: 'danger',
              onclick: decrement,
              children: [Icon({ name: 'minus' }), { span: { text: ' Decrease' } }]
            }),
            Button({
              variant: 'success', 
              onclick: increment,
              children: [Icon({ name: 'plus' }), { span: { text: ' Increase' } }]
            }),
            Button({
              variant: 'secondary',
              onclick: reset,
              children: [Icon({ name: 'refresh' }), { span: { text: ' Reset' } }]
            })
          ]
        }
      }
    ]
  });
});

// Performance-optimized component with memoization
const OptimizedList = memo(({ items = [], filter = '' }) => {
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(filter.toLowerCase())
  );
  
  return Card({
    title: `Optimized List (${filteredItems.length} items)`,
    className: 'optimized-list',
    children: [
      {
        div: {
          className: 'list-grid',
          style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;',
          children: filteredItems.map(item => ({
            div: {
              className: 'list-item',
              key: item.id,
              style: 'padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;',
              children: [
                {
                  div: {
                    style: 'font-size: 2rem; text-align: center; margin-bottom: 10px;',
                    text: item.emoji
                  }
                },
                {
                  h4: {
                    style: 'margin: 0 0 5px 0; color: #1f2937;',
                    text: item.name
                  }
                },
                {
                  p: {
                    style: 'margin: 0; color: #6b7280; font-size: 0.9rem;',
                    text: item.description
                  }
                }
              ]
            }
          }))
        }
      }
    ]
  });
}, ({ items, filter }) => `${items.length}-${filter}`);

// ===== MAIN SHOWCASE COMPONENT =====

const CoherentMasterDemo = () => {
  const sampleItems = [
    { id: 1, name: 'Server-Side Rendering', description: 'Lightning-fast initial loads', emoji: '⚡' },
    { id: 2, name: 'Client Hydration', description: 'Seamless interactivity', emoji: '💧' },
    { id: 3, name: 'State Management', description: 'withState hooks pattern', emoji: '🔄' },
    { id: 4, name: 'Component Memoization', description: 'Optimized re-rendering', emoji: '🚀' },
    { id: 5, name: 'Event Handling', description: 'Rich interactive patterns', emoji: '🎯' },
    { id: 6, name: 'Performance First', description: 'Built for speed', emoji: '📊' }
  ];
  
  return {
    html: {
      lang: 'en',
      children: [
        {
          head: {
            children: [
              { meta: { charset: 'utf-8' } },
              { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1.0' } },
              { title: { text: `Coherent.js v${VERSION} - Master Demo` } },
              { meta: { name: 'description', content: 'Live demonstration of Coherent.js capabilities with real server-side rendering and client-side hydration.' } },
              {
                style: {
                  text: `
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      line-height: 1.6; 
                      color: #1f2937;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      min-height: 100dvh;
                      padding: 20px;
                    }
                    .demo-container { 
                      max-width: 1200px; 
                      margin: 0 auto;
                      background: rgba(255, 255, 255, 0.95);
                      backdrop-filter: blur(10px);
                      border-radius: 20px;
                      padding: 40px;
                      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                    }
                    .demo-header { 
                      text-align: center; 
                      margin-bottom: 40px; 
                    }
                    .demo-title { 
                      font-size: 3rem; 
                      font-weight: 800;
                      background: linear-gradient(45deg, #667eea, #764ba2);
                      -webkit-background-clip: text;
                      -webkit-text-fill-color: transparent;
                      background-clip: text;
                      margin-bottom: 15px;
                    }
                    .demo-subtitle { 
                      font-size: 1.2rem; 
                      color: #6b7280; 
                      margin-bottom: 25px;
                    }
                    .version-badge {
                      display: inline-block;
                      background: linear-gradient(45deg, #10b981, #059669);
                      color: white;
                      padding: 8px 16px;
                      border-radius: 20px;
                      font-size: 0.9rem;
                      font-weight: 600;
                      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }
                    .features-grid { 
                      display: grid; 
                      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
                      gap: 30px; 
                      margin: 40px 0;
                    }
                    .card { 
                      background: white; 
                      border-radius: 15px; 
                      overflow: hidden;
                      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
                      border: 1px solid #e5e7eb;
                      transition: transform 0.3s ease, box-shadow 0.3s ease;
                    }
                    .card:hover { 
                      transform: translateY(-5px);
                      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
                    }
                    .card-header { 
                      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                      padding: 20px 25px; 
                      border-bottom: 1px solid #e5e7eb;
                    }
                    .card-title { 
                      font-size: 1.3rem; 
                      font-weight: 700; 
                      color: #1f2937;
                      margin: 0;
                    }
                    .card-body { 
                      padding: 25px; 
                    }
                    .btn {
                      display: inline-flex;
                      align-items: center;
                      gap: 8px;
                      padding: 12px 20px;
                      border: none;
                      border-radius: 8px;
                      cursor: pointer;
                      font-size: 0.95rem;
                      font-weight: 600;
                      transition: all 0.2s ease;
                      text-decoration: none;
                    }
                    .btn-primary { 
                      background: linear-gradient(45deg, #3b82f6, #2563eb);
                      color: white;
                      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                    }
                    .btn-primary:hover { 
                      transform: translateY(-2px);
                      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
                    }
                    .btn-success { 
                      background: linear-gradient(45deg, #10b981, #059669);
                      color: white;
                      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }
                    .btn-success:hover { 
                      transform: translateY(-2px);
                      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                    }
                    .btn-danger { 
                      background: linear-gradient(45deg, #ef4444, #dc2626);
                      color: white;
                      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                    }
                    .btn-danger:hover { 
                      transform: translateY(-2px);
                      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                    }
                    .btn-secondary { 
                      background: linear-gradient(45deg, #6b7280, #4b5563);
                      color: white;
                      box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
                    }
                    .tech-info {
                      margin-top: 40px;
                      padding: 30px;
                      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                      border-radius: 15px;
                      border: 1px solid #bae6fd;
                    }
                    .tech-title {
                      font-size: 1.5rem;
                      font-weight: 700;
                      color: #1e40af;
                      margin-bottom: 20px;
                      text-align: center;
                    }
                    .tech-grid {
                      display: grid;
                      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                      gap: 20px;
                    }
                    .tech-item {
                      text-align: center;
                      padding: 20px;
                      background: white;
                      border-radius: 10px;
                      border: 1px solid #e0f2fe;
                    }
                    .tech-icon {
                      font-size: 2rem;
                      margin-bottom: 10px;
                    }
                    .tech-name {
                      font-weight: 600;
                      color: #1e40af;
                      margin-bottom: 5px;
                    }
                    .tech-desc {
                      font-size: 0.9rem;
                      color: #64748b;
                    }
                    @media (max-width: 768px) {
                      .demo-container { padding: 20px; }
                      .demo-title { font-size: 2rem; }
                      .features-grid { grid-template-columns: 1fr; gap: 20px; }
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
                  className: 'demo-container',
                  children: [
                    // Header
                    {
                      header: {
                        className: 'demo-header',
                        children: [
                          { h1: { text: '🔥 Coherent.js Master Demo', className: 'demo-title' } },
                          { 
                            p: { 
                              text: 'Live demonstration of server-side rendering, client-side hydration, and advanced patterns',
                              className: 'demo-subtitle' 
                            }
                          },
                          {
                            div: {
                              className: 'version-badge',
                              text: `v${VERSION} • Running Live`
                            }
                          }
                        ]
                      }
                    },
                    
                    // Main Features
                    {
                      main: {
                        children: [
                          {
                            div: {
                              className: 'features-grid',
                              children: [
                                LiveCounter(),
                                OptimizedList({ items: sampleItems, filter: '' })
                              ]
                            }
                          }
                        ]
                      }
                    },
                    
                    // Technical Information
                    {
                      section: {
                        className: 'tech-info',
                        children: [
                          { h2: { text: '⚙️ Technical Implementation', className: 'tech-title' } },
                          {
                            div: {
                              className: 'tech-grid',
                              children: [
                                {
                                  div: {
                                    className: 'tech-item',
                                    children: [
                                      { div: { text: '⚡', className: 'tech-icon' } },
                                      { div: { text: 'Server-Side Rendering', className: 'tech-name' } },
                                      { div: { text: 'HTML generated on server', className: 'tech-desc' } }
                                    ]
                                  }
                                },
                                {
                                  div: {
                                    className: 'tech-item',
                                    children: [
                                      { div: { text: '🔄', className: 'tech-icon' } },
                                      { div: { text: 'State Management', className: 'tech-name' } },
                                      { div: { text: 'withState hook pattern', className: 'tech-desc' } }
                                    ]
                                  }
                                },
                                {
                                  div: {
                                    className: 'tech-item',
                                    children: [
                                      { div: { text: '🚀', className: 'tech-icon' } },
                                      { div: { text: 'Memoization', className: 'tech-name' } },
                                      { div: { text: 'Optimized re-rendering', className: 'tech-desc' } }
                                    ]
                                  }
                                },
                                {
                                  div: {
                                    className: 'tech-item',
                                    children: [
                                      { div: { text: '💧', className: 'tech-icon' } },
                                      { div: { text: 'Client Hydration', className: 'tech-name' } },
                                      { div: { text: 'Interactive on client', className: 'tech-desc' } }
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
              },
              
              // Client-side hydration script
              {
                script: {
                  text: `
                    console.log('🚀 Coherent.js v${VERSION} Master Demo loaded!');
                    console.log('✨ Server-side rendered HTML with client-side interactivity ready');
                    
                    // Performance monitoring
                    if (typeof performance !== 'undefined') {
                      window.addEventListener('load', () => {
                        const perfData = performance.getEntriesByType('navigation')[0];
                        if (perfData) {
                          console.log('📊 Performance Metrics:', {
                            'DOM Ready': Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart) + 'ms',
                            'Load Time': Math.round(perfData.loadEventEnd - perfData.fetchStart) + 'ms'
                          });
                        }
                      });
                    }
                  `
                }
              }
            ]
          }
        }
      ]
    }
  };
};

// ===== SERVER SETUP =====

export function createCoherentServer(port = 3000) {
  const server = createServer((req, res) => {
    const { pathname } = parseUrl(req.url, true);
    
    // Set proper headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    try {
      // Render the demo component to HTML string
      const htmlString = render(CoherentMasterDemo());
      
      // Send the response
      res.writeHead(200);
      res.end(htmlString);
      
    } catch (error) {
      console.error('❌ Rendering error:', error);
      
      res.writeHead(500);
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Coherent.js Demo - Error</title></head>
          <body>
            <div style="max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; font-family: sans-serif;">
              <h1 style="color: #dc2626;">⚠️ Demo Error</h1>
              <p>There was an error rendering the Coherent.js demo:</p>
              <pre style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: left; color: #dc2626; font-size: 0.9rem;">${error.message}</pre>
              <p><strong>Make sure @coherentjs/core is properly installed.</strong></p>
            </div>
          </body>
        </html>
      `);
    }
  });
  
  return server;
}

// ===== EXPORTS =====

export {
  CoherentMasterDemo,
  LiveCounter,
  OptimizedList,
  Icon,
  Button,
  Card
};

// For direct HTML rendering  
export const renderDemo = () => render(CoherentMasterDemo());
export const renderDemoHTML = renderDemo;

// ===== CLI RUNNER =====

// If this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000;
  const server = createCoherentServer(port);
  
  server.listen(port, () => {
    console.log(`🔥 Coherent.js Master Demo server running at:`);
    console.log(`   http://localhost:${port}`);
    console.log(`\n✨ Features demonstrated:`);
    console.log(`   • Server-Side Rendering (SSR)`);
    console.log(`   • Client-Side Hydration`);
    console.log(`   • Advanced State Management`);
    console.log(`   • Component Memoization`);
    console.log(`   • Event Handling`);
    console.log(`   • Performance Optimization`);
    console.log(`\n🚀 Framework Version: v${VERSION}`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down Coherent.js demo server...');
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  });
}

export default CoherentMasterDemo;
