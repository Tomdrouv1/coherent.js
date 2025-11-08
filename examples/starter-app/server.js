/**
 * Simple Coherent.js Server
 * Demonstrates SSR with client-side hydration
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { render, dangerouslySetInnerContent } from '../../packages/core/src/index.js';
import { Counter } from './components/Counter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create the HTML page
const createPage = () => ({
  html: {
    lang: 'en',
    children: [
      {
        head: {
          children: [
            { meta: { charset: 'utf-8' } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1.0' } },
            { title: { text: 'Coherent.js Starter App' } },
            {
              style: {
                text: dangerouslySetInnerContent(`
                  * { box-sizing: border-box; margin: 0; padding: 0; }
                  
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    padding: 40px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                  }
                  
                  .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                  }
                  
                  h1 {
                    color: #333;
                    margin-bottom: 10px;
                  }
                  
                  .subtitle {
                    color: #666;
                    margin-bottom: 30px;
                  }
                  
                  .counter {
                    background: #f8f9fa;
                    padding: 30px;
                    border-radius: 8px;
                    border: 2px solid #e9ecef;
                    text-align: center;
                  }
                  
                  .counter h2 {
                    color: #495057;
                    margin-bottom: 20px;
                    font-size: 1.5rem;
                  }
                  
                  .count-display {
                    font-size: 3rem;
                    font-weight: bold;
                    color: #667eea;
                    margin: 20px 0;
                  }
                  
                  .button-group {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-top: 20px;
                  }
                  
                  .btn {
                    padding: 12px 24px;
                    font-size: 1.2rem;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    background: #667eea;
                    color: white;
                    font-weight: 600;
                    transition: all 0.2s;
                  }
                  
                  .btn:hover {
                    background: #5568d3;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                  }
                  
                  .btn:active {
                    transform: translateY(0);
                  }
                  
                  .btn-secondary {
                    background: #6c757d;
                  }
                  
                  .btn-secondary:hover {
                    background: #5a6268;
                    box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
                  }
                  
                  .info {
                    margin-top: 30px;
                    padding: 20px;
                    background: #d1ecf1;
                    border: 1px solid #bee5eb;
                    border-radius: 6px;
                    color: #0c5460;
                  }
                  
                  .info h3 {
                    margin-bottom: 10px;
                  }
                  
                  code {
                    background: #f8f9fa;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                  }
                `)
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
                  { h1: { text: '🚀 Coherent.js Starter App' } },
                  { p: { text: 'A simple full-stack example with SSR and hydration', className: 'subtitle' } },
                  
                  // Counter component
                  Counter(),
                  
                  // Info section
                  {
                    div: {
                      className: 'info',
                      children: [
                        { h3: { text: '✨ How it works' } },
                        { 
                          p: { 
                            text: '1. The counter is rendered on the server (SSR)' 
                          } 
                        },
                        { 
                          p: { 
                            text: '2. HTML is sent to the browser instantly' 
                          } 
                        },
                        { 
                          p: { 
                            text: '3. Client-side hydration makes it interactive' 
                          } 
                        },
                        { 
                          p: { 
                            text: '4. Click the buttons - they work!' 
                          } 
                        }
                      ]
                    }
                  }
                ]
              }
            },
            
            // Hydration script
            {
              script: {
                type: 'module',
                text: dangerouslySetInnerContent(`
                  import { autoHydrate } from '/hydration.js';
                  
                  console.log('🔥 Coherent.js Starter App');
                  console.log('✨ Initializing hydration...');
                  
                  // Auto-hydrate all components
                  window.componentRegistry = {};
                  
                  document.addEventListener('DOMContentLoaded', () => {
                    autoHydrate(window.componentRegistry);
                    console.log('✅ Hydration complete! Try clicking the buttons.');
                  });
                `)
              }
            }
          ]
        }
      }
    ]
  }
});

// HTTP Server
const server = createServer((req, res) => {
  // Serve hydration bundle
  if (req.url === '/hydration.js') {
    try {
      const hydrationPath = join(__dirname, '../../packages/client/src/hydration.js');
      const hydrationCode = readFileSync(hydrationPath, 'utf-8');
      res.setHeader('Content-Type', 'application/javascript');
      res.writeHead(200);
      res.end(hydrationCode);
      return;
    } catch (error) {
      console.error('Error serving hydration.js:', error);
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  }
  
  // Serve main page
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  
  try {
    const page = createPage();
    const html = render(page);
    res.writeHead(200);
    res.end(html);
  } catch (error) {
    console.error('Rendering error:', error);
    res.writeHead(500);
    res.end('Server Error');
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 Coherent.js Starter App');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('✨ Features:');
  console.log('   • Server-Side Rendering (SSR)');
  console.log('   • Client-Side Hydration');
  console.log('   • Interactive Components');
  console.log('   • State Management');
  console.log('');
  console.log('👉 Open your browser and try the counter!');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
