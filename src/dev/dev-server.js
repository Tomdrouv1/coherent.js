/**
 * Development Server for Coherent.js
 * Provides hot reload and live preview capabilities
 */

import express from 'express';
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';


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
      // Dynamically import the component
      const modulePath = path.join(process.cwd(), data.path);
      if (!fs.existsSync(modulePath)) {
        ws.send(JSON.stringify({
          type: 'preview-error',
          error: `Module not found: ${data.path}`
        }));
        return;
      }
      
      // Import the module
      const module = await import(`file://${modulePath}`);
      
      // Get the component function
      const componentFn = module.default || module[data.component] || Object.values(module)[0];
      
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
          html = renderToString(componentFn, data.props || {});
        } else {
          // Try to render as a direct HTML object
          const { renderObjectElement } = await import('../rendering/html-renderer.js');
          html = renderObjectElement(componentFn);
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
    // Main route - serve a simple dashboard
    this.app.get('/', (req, res) => {
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
          <div class="header">
            <h1>Coherent.js Development Server</h1>
            <p>Hot reload and live preview enabled</p>
          </div>
          
          <div class="tabs">
            <div class="tab active" data-tab="examples">Examples</div>
            <div class="tab" data-tab="preview">Live Preview</div>
          </div>
          
          <div id="examples-tab" class="tab-content active">
            <div class="examples">
              <div class="example-card">
                <h3>Basic Usage</h3>
                <a href="/examples/basic-usage.js" class="example-link">View Example</a>
                <button class="example-link" onclick="previewComponent('/examples/basic-usage.js')">Live Preview</button>
              </div>
              <div class="example-card">
                <h3>Component Composition</h3>
                <a href="/examples/component-composition.js" class="example-link">View Example</a>
                <button class="example-link" onclick="previewComponent('/examples/component-composition.js')">Live Preview</button>
              </div>
              <div class="example-card">
                <h3>Context Example</h3>
                <a href="/examples/context-example.js" class="example-link">View Example</a>
                <button class="example-link" onclick="previewComponent('/examples/context-example.js')">Live Preview</button>
              </div>
              <div class="example-card">
                <h3>Hydration Example</h3>
                <a href="/examples/hydration-example.js" class="example-link">View Example</a>
                <button class="example-link" onclick="previewComponent('/examples/hydration-example.js')">Live Preview</button>
              </div>
              <div class="example-card">
                <h3>Hydration Demo</h3>
                <a href="/examples/hydration-demo.js" class="example-link">View Example</a>
                <button class="example-link" onclick="previewComponent('/examples/hydration-demo.js')">Live Preview</button>
              </div>
              <div class="example-card">
                <h3>Performance Monitoring</h3>
                <a href="/examples/performance-test.js" class="example-link">View Example</a>
                <button class="example-link" onclick="previewComponent('/examples/performance-test.js')">Live Preview</button>
              </div>
              <div class="example-card">
                <h3>Streaming Renderer</h3>
                <a href="/examples/streaming.js" class="example-link">View Example</a>
                <button class="example-link" onclick="previewComponent('/examples/streaming.js')">Live Preview</button>
              </div>
            </div>
          </div>
          
          <div id="preview-tab" class="tab-content">
            <div class="live-preview">
              <h2>Live Component Preview</h2>
              <p>Preview any Coherent.js component in real-time with custom props.</p>
              
              <div class="preview-controls">
                <input type="text" id="component-path" placeholder="Path to component file (e.g., /examples/basic-usage.js)" style="width: 300px;">
                <input type="text" id="component-name" placeholder="Component name (optional)" style="width: 150px;">
                <button onclick="previewCustomComponent()">Preview</button>
              </div>
              
              <div class="preview-controls">
                <textarea id="component-props" placeholder="Component props (JSON format)" style="width: 100%; height: 100px;">
{}
</textarea>
              </div>
              
              <div class="preview-container" id="preview-container">
                <p>Select an example or enter a component path to preview</p>
              </div>
            </div>
          </div>
          
          <div class="status">
            <p>✅ Server is running with hot reload and live preview enabled</p>
            <p>🔄 Changes to source files will automatically trigger a reload</p>
          </div>
          
          <script>
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
            
            // WebSocket client for hot reload and live preview
            const ws = new WebSocket('ws://' + location.host);
            let currentPreviewWs = null;
            
            ws.onmessage = function(event) {
              const data = JSON.parse(event.data);
              if (data.type === 'reload') {
                console.log('🔄 Reloading page...');
                location.reload();
              }
            };
            
            ws.onopen = function() {
              console.log('🔌 Connected to dev server');
            };
            
            ws.onclose = function() {
              console.log('🔌 Disconnected from dev server');
            };
            
            // Function to preview a component
            function previewComponent(path, componentName = null) {
              // Switch to preview tab
              document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
              document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
              document.querySelector('[data-tab="preview"]').classList.add('active');
              document.getElementById('preview-tab').classList.add('active');
              
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
              
              // Send preview request
              ws.send(JSON.stringify({
                type: 'preview-request',
                path: path,
                component: componentName,
                props: props
              }));
              
              // Show loading message
              document.getElementById('preview-container').innerHTML = '<p>Loading preview...</p>';
            }
            
            // Handle preview responses
            ws.onmessage = function(event) {
              const data = JSON.parse(event.data);
              
              if (data.type === 'reload') {
                console.log('🔄 Reloading page...');
                location.reload();
              } else if (data.type === 'preview-response') {
                document.getElementById('preview-container').innerHTML = data.html;
              } else if (data.type === 'preview-error') {
                document.getElementById('preview-container').innerHTML = '<p style="color: red;">Error: ' + data.error + '</p>';
              } else if (data.type === 'connected') {
                console.log('🔌 Connected to dev server');
              }
            };
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
