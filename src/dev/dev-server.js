/**
 * Development Server for Coherent.js
 * Provides hot reload and live preview capabilities
 */

import express from 'express';
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { renderToString } from '../rendering/html-renderer.js';


export class DevServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.watchPaths = options.watchPaths || ['src/**/*', 'examples/**/*'];
    this.staticPaths = options.staticPaths || ['examples', 'public'];
    
    this.app = express();
    this.wss = null;
    this.server = null;
    this.watchers = [];
    
    this.setupMiddleware();
    this.setupWebSocket();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Serve static files
    this.staticPaths.forEach(staticPath => {
      const fullPath = path.join(process.cwd(), staticPath);
      if (fs.existsSync(fullPath)) {
        this.app.use(`/${staticPath}`, express.static(fullPath));
        console.log(`Serving static files from: ${fullPath}`);
      }
    });
    
    // Serve node_modules for client-side libraries
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      this.app.use('/node_modules', express.static(nodeModulesPath));
    }
  }
  
  createDashboardComponent() {
    // Define the examples data
    const examples = [
      { name: 'Basic Usage', path: '/examples/basic-usage.js' },
      { name: 'Component Composition', path: '/examples/component-composition.js' },
      { name: 'Context Example', path: '/examples/context-example.js' },
      { name: 'Hydration Example', path: '/examples/hydration-example.js' },
      { name: 'Hydration Demo', path: '/examples/hydration-demo.js' },
      { name: 'Performance Monitoring', path: '/examples/performance-test.js' },
      { name: 'Streaming Renderer', path: '/examples/streaming.js' }
    ];

    // Create the dashboard component using Coherent.js syntax
    return {
      div: {
        children: [
          // Header
          {
            div: {
              className: 'header',
              children: [
                { h1: { text: 'Coherent.js Development Server' } },
                { p: { text: 'Hot reload and live preview enabled' } }
              ]
            }
          },
          
          // Tabs
          {
            div: {
              className: 'tabs',
              children: [
                {
                  div: {
                    className: 'tab active',
                    'data-tab': 'examples',
                    text: 'Examples'
                  }
                },
                {
                  div: {
                    className: 'tab',
                    'data-tab': 'preview',
                    text: 'Live Preview'
                  }
                }
              ]
            }
          },
          
          // Examples tab content
          {
            div: {
              id: 'examples-tab',
              className: 'tab-content active',
              children: [
                {
                  div: {
                    className: 'examples',
                    children: examples.map(example => ({
                      div: {
                        className: 'example-card',
                        children: [
                          { h3: { text: example.name } },
                          {
                            a: {
                              href: example.path,
                              className: 'example-link',
                              text: 'View Example'
                            }
                          },
                          {
                            button: {
                              className: 'example-link',
                              onclick: `previewComponent('${example.path}')`,
                              text: 'Live Preview'
                            }
                          }
                        ]
                      }
                    }))
                  }
                }
              ]
            }
          },
          
          // Preview tab content
          {
            div: {
              id: 'preview-tab',
              className: 'tab-content',
              children: [
                {
                  div: {
                    className: 'live-preview',
                    children: [
                      { h2: { text: 'Live Component Preview' } },
                      { p: { text: 'Preview any Coherent.js component in real-time with custom props.' } },
                      
                      // Preview controls
                      {
                        div: {
                          className: 'preview-controls',
                          children: [
                            {
                              input: {
                                type: 'text',
                                id: 'component-path',
                                placeholder: 'Path to component file (e.g., /examples/basic-usage.js)',
                                style: 'width: 300px;'
                              }
                            },
                            {
                              input: {
                                type: 'text',
                                id: 'component-name',
                                placeholder: 'Component name (optional)',
                                style: 'width: 150px;'
                              }
                            },
                            {
                              button: {
                                onclick: 'previewCustomComponent()',
                                text: 'Preview'
                              }
                            }
                          ]
                        }
                      },
                      
                      // Props textarea
                      {
                        div: {
                          className: 'preview-controls',
                          children: [
                            {
                              textarea: {
                                id: 'component-props',
                                placeholder: 'Component props (JSON format)',
                                style: 'width: 100%; height: 100px;',
                                text: '{}'
                              }
                            }
                          ]
                        }
                      },
                      
                      // Preview container
                      {
                        div: {
                          className: 'preview-container',
                          id: 'preview-container',
                          children: [
                            { p: { text: 'Select an example or enter a component path to preview' } }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          },
          
          // Status
          {
            div: {
              className: 'status',
              children: [
                { p: { text: '✅ Server is running with hot reload and live preview enabled' } },
                { p: { text: '🔄 Changes to source files will automatically trigger a reload' } }
              ]
            }
          }
        ]
      }
    };
  }

  setupWebSocket() {
    // WebSocket server for hot reload and live preview
    this.app.server = this.app.listen(this.port, this.host, () => {
      console.log(`🚀 Development server running at http://${this.host}:${this.port}`);
      console.log(`👀 Watching for changes in: ${this.watchPaths.join(', ')}`);
      
      // Setup WebSocket server after HTTP server is listening
      this.wss = new WebSocketServer({ server: this.app.server });
      
      this.wss.on('connection', (ws) => {
        console.log('🔌 WebSocket client connected');
        ws.send(JSON.stringify({ type: 'connected' }));
        
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            if (data.type === 'preview-request') {
              this.handlePreviewRequest(ws, data);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        });
        
        ws.on('close', () => {
          console.log('🔌 WebSocket client disconnected');
        });
      });
    });
  }
  
  async handlePreviewRequest(ws, data) {
    try {
      console.log('Preview request data:', data);
      // Dynamically import the component
      const modulePath = path.join(process.cwd(), data.path);
      console.log('Module path:', modulePath);
      if (!fs.existsSync(modulePath)) {
        ws.send(JSON.stringify({
          type: 'preview-error',
          error: `Module not found: ${data.path}`
        }));
        return;
      }
      
      // Import the module
      const module = await import(`file://${modulePath}`);
      console.log('Module exports:', Object.keys(module));
      
      // Get the component function
      let componentFn;
      if (module.default) {
        componentFn = module.default;
        console.log('Using default export');
      } else if (data.component && module[data.component]) {
        componentFn = module[data.component];
        console.log('Using named export:', data.component);
      } else if (Object.values(module).length > 0) {
        // Try to find a component function (a function that returns an object or a direct object)
        const exports = Object.entries(module);
        for (const [name, exported] of exports) {
          // Skip known utility functions that are not components
          if (['hydrateClientSide', 'renderServerSide'].includes(name)) {
            continue;
          }
          
          if (typeof exported === 'function') {
            // Check if it's likely a component function by calling it with empty props
            try {
              const result = exported({});
              // A valid component should return an object with a tag name as the first key
              // or a string
              if (typeof result === 'string') {
                componentFn = exported;
                console.log('Using component function export (returns string):', name);
                break;
              } else if (result && typeof result === 'object') {
                // Check if it's a valid component object (has a tag name as first key)
                const keys = Object.keys(result);
                if (keys.length > 0 && typeof keys[0] === 'string') {
                  componentFn = exported;
                  console.log('Using component function export (returns object):', name);
                  break;
                }
              }
            } catch (e) {
              // If calling the function fails, it's not a component function
              continue;
            }
          } else if (exported && typeof exported === 'object') {
            // Direct object export - check if it's a valid component object
            const keys = Object.keys(exported);
            if (keys.length > 0 && typeof keys[0] === 'string') {
              componentFn = exported;
              console.log('Using direct object export:', name);
              break;
            }
          }
        }
        
        // Fallback to first export if no component found
        if (!componentFn && exports.length > 0) {
          componentFn = exports[0][1];
          console.log('Using first export as fallback:', exports[0][0]);
        }
      }
      
      if (!componentFn) {
        ws.send(JSON.stringify({
          type: 'preview-error',
          error: `No component found in module: ${data.path}`
        }));
        return;
      }
      
      // Render the component with provided props
      let html = '';
      try {
        if (typeof componentFn === 'function') {
          // Try to render as a Coherent component
          const { renderToString } = await import('../rendering/html-renderer.js');
          
          // Use renderWithHydration if available for hydratable components
          if (componentFn.renderWithHydration && componentFn.isHydratable) {
            console.log('Using renderWithHydration for component');
            const hydratedResult = componentFn.renderWithHydration(data.props || {});
            console.log('Hydrated result:', JSON.stringify(hydratedResult, null, 2));
            html = renderToString(hydratedResult);
            console.log('Rendered HTML:', html);
          } else {
            html = renderToString(componentFn, { props: data.props || {} });
          }
        } else {
          // Try to render as a direct HTML object
          const { renderToString } = await import('../rendering/html-renderer.js');
          html = renderToString(componentFn, data.props || {});
        }
      } catch (renderError) {
        console.error('Error rendering component:', renderError);
        ws.send(JSON.stringify({
          type: 'preview-error',
          error: `Error rendering component: ${renderError.message}`
        }));
        return;
      }
      
      // Send the rendered HTML back to the client
      ws.send(JSON.stringify({
        type: 'preview-response',
        html: html
      }));
    } catch (err) {
      console.error('Error handling preview request:', err);
      ws.send(JSON.stringify({
        type: 'preview-error',
        error: `Error loading module: ${err.message}`
      }));
    }
  }
  
  setupRoutes() {
    // Main route - serve dashboard using Coherent.js components
    this.app.get('/', (req, res) => {
      const dashboardComponent = this.createDashboardComponent();
      const html = renderToString(dashboardComponent);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Coherent.js Dev Server</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; }
            .examples { margin-top: 30px; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
            .example-card { padding: 20px; background: #f5f5f5; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .example-card h3 { margin-top: 0; }
            .example-link { display: block; margin: 10px 0; padding: 8px; background: #007acc; border-radius: 4px; text-decoration: none; color: white; text-align: center; }
            .example-link:hover { background: #005a9e; }
            .status { margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 4px; }
            .live-preview { margin-top: 30px; padding: 20px; background: #f0f8ff; border-radius: 8px; }
            .preview-container { margin-top: 20px; border: 1px solid #ddd; border-radius: 4px; min-height: 200px; padding: 20px; background: white; }
            .preview-controls { margin-bottom: 15px; }
            .preview-controls input, .preview-controls select, .preview-controls button { margin: 5px; padding: 8px; }
            .tabs { display: flex; margin-bottom: 20px; }
            .tab { padding: 10px 20px; background: #e0e0e0; cursor: pointer; border: 1px solid #ccc; }
            .tab.active { background: #007acc; color: white; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
          </style>
        </head>
        <body>
          ${html}
          <script>
            // Initialize WebSocket connection when page loads
            let ws;
            let reconnectAttempts = 0;
            const maxReconnectAttempts = 10;
            
            function initWebSocket() {
              // Close existing connection if any
              if (ws) {
                ws.close();
              }
              
              // Create new WebSocket connection
              ws = new WebSocket('ws://' + location.host);
              
              ws.onopen = function() {
                console.log('🔌 Connected to dev server');
                reconnectAttempts = 0; // Reset reconnect attempts on successful connection
              };
              
              ws.onclose = function(event) {
                console.log('🔌 Disconnected from dev server. Code: ' + event.code + ', Reason: ' + event.reason);
                
                // Try to reconnect with exponential backoff
                if (reconnectAttempts < maxReconnectAttempts) {
                  reconnectAttempts++;
                  const delay = Math.min(3000 * Math.pow(1.5, reconnectAttempts), 30000); // Max 30 seconds
                  console.log('Attempting to reconnect in ' + delay + 'ms (attempt ' + reconnectAttempts + '/' + maxReconnectAttempts + ')');
                  setTimeout(initWebSocket, delay);
                } else {
                  console.error('Maximum reconnection attempts reached. Please refresh the page.');
                }
              };
              
              // Handle WebSocket messages
              ws.onmessage = function(event) {
                try {
                  const data = JSON.parse(event.data);
                  
                  if (data.type === 'reload') {
                    console.log('🔄 Reloading page...');
                    location.reload();
                  } else if (data.type === 'preview-response') {
                    console.log('Received preview response');
                    document.getElementById('preview-container').innerHTML = data.html;
                  } else if (data.type === 'preview-error') {
                    console.log('Received preview error:', data.error);
                    document.getElementById('preview-container').innerHTML = '<p style="color: red;">Error: ' + data.error + '</p>';
                  } else if (data.type === 'connected') {
                    console.log('🔌 Connected to dev server');
                  }
                } catch (e) {
                  console.error('Error parsing WebSocket message:', e);
                }
              };
              
              // Handle WebSocket errors
              ws.onerror = function(error) {
                console.error('WebSocket error:', error);
              };
            }
            
            // Initialize WebSocket on page load
            initWebSocket();
            
            // Tab switching
            document.querySelectorAll('.tab').forEach(tab => {
              tab.addEventListener('click', () => {
                // Remove active class from all tabs and content
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding content
                const tabName = tab.getAttribute('data-tab');
                document.getElementById(tabName + '-tab').classList.add('active');
              });
            });
            
            // Live Preview button event listeners for tab switching
            document.querySelectorAll('.preview-btn').forEach(btn => {
              btn.addEventListener('click', () => {
                // Switch to preview tab after a short delay to let the onclick handler run first
                setTimeout(() => {
                  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                  document.querySelector('[data-tab="preview"]').classList.add('active');
                  document.getElementById('preview-tab').classList.add('active');
                }, 100);
              });
            });
            
            // Function to preview a component
            function previewComponent(path, componentName = null) {
              // Set the path in the input
              document.getElementById('component-path').value = path;
              if (componentName) {
                document.getElementById('component-name').value = componentName;
              }
              
              // Preview the component
              previewCustomComponent();
            }
            
            // Function to preview a custom component
            function previewCustomComponent() {
              const path = document.getElementById('component-path').value;
              const componentName = document.getElementById('component-name').value;
              const propsText = document.getElementById('component-props').value;
              
              if (!path) {
                alert('Please enter a component path');
                return;
              }
              
              let props = {};
              try {
                props = JSON.parse(propsText);
              } catch (e) {
                alert('Invalid JSON in props: ' + e.message);
                return;
              }
              
              // Check if WebSocket is open
              if (ws.readyState !== WebSocket.OPEN) {
                alert('Not connected to dev server. Please wait for reconnection.');
                return;
              }
              
              try {
                // Send preview request
                ws.send(JSON.stringify({
                  type: 'preview-request',
                  path: path,
                  component: componentName,
                  props: props
                }));
                
                // Show loading message
                document.getElementById('preview-container').innerHTML = '<p>Loading preview...</p>';
              } catch (e) {
                console.error('Error sending preview request:', e);
                document.getElementById('preview-container').innerHTML = '<p style="color: red;">Error sending preview request: ' + e.message + '</p>';
              }
            }
          </script>
        </body>
        </html>
      `);
    });
    
    // API endpoint to list examples
    this.app.get('/api/examples', (req, res) => {
      const examplesDir = path.join(process.cwd(), 'examples');
      fs.readdir(examplesDir, (err, files) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to read examples directory' });
        }
        
        const examples = files
          .filter(file => file.endsWith('.js'))
          .map(file => ({
            name: path.basename(file, '.js'),
            path: `/examples/${file}`
          }));
          
        res.json(examples);
      });
    });
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }
  
  startWatching() {
    // Watch for file changes
    this.watchPaths.forEach(watchPath => {
      const fullPath = path.join(process.cwd(), watchPath);
      const watcher = chokidar.watch(fullPath, {
        ignored: /node_modules/,
        persistent: true
      });
      
      watcher.on('change', (filePath) => {
        console.log(`🔄 File changed: ${filePath}`);
        this.broadcastReload();
        
        // If it's a component file, broadcast preview update
        if (filePath.endsWith('.js') && (filePath.includes('examples') || filePath.includes('components'))) {
          this.broadcastPreviewUpdate(filePath);
        }
      });
      
      watcher.on('add', (filePath) => {
        console.log(`➕ File added: ${filePath}`);
        this.broadcastReload();
      });
      
      watcher.on('unlink', (filePath) => {
        console.log(`➖ File removed: ${filePath}`);
        this.broadcastReload();
      });
      
      this.watchers.push(watcher);
    });
  }
  
  broadcastReload() {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === WebSocketServer.OPEN) {
          client.send(JSON.stringify({ type: 'reload' }));
        }
      });
    }
  }
  
  broadcastPreviewUpdate(filePath) {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === WebSocketServer.OPEN) {
          client.send(JSON.stringify({ 
            type: 'preview-update', 
            path: filePath 
          }));
        }
      });
    }
  }
  
  start() {
    this.startWatching();
    console.log(`🚀 Coherent.js Dev Server started`);
    console.log(`📡 Server: http://${this.host}:${this.port}`);
    console.log(`📁 Watching: ${this.watchPaths.join(', ')}`);
  }
  
  stop() {
    // Close watchers
    this.watchers.forEach(watcher => watcher.close());
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    // Close HTTP server
    if (this.server) {
      this.server.close();
    }
    
    console.log('🛑 Dev server stopped');
  }
}

export default DevServer;
