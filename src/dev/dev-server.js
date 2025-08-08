/**
 * Development Server for Coherent.js
 * Provides hot reload and live preview capabilities
 */

import express from 'express';
import chokidar from 'chokidar';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { renderToString } from '../rendering/html-renderer.js';

export class DevServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.watchPaths = options.watchPaths || ['src/**/*', 'examples/**/*'];
    this.staticPaths = options.staticPaths || ['examples', 'public', 'src'];

    this.app = express();
    this.wss = null;
    this.server = null;
    this.watchers = [];
    this.buildTimeout = null;

    this.setupMiddleware();
    // Do not start listening in constructor to avoid hanging test runner
    this.setupRoutes();
  }

  setupMiddleware() {
    // Parse JSON bodies
    this.app.use(express.json());

    // Serve raw JavaScript files for module imports (when Accept header indicates module)
    this.app.get('/examples/:exampleName.js', (req, res, next) => {
      // Check if this is a module import request
      const acceptHeader = req.get('Accept') || '';
      const isModuleImport = acceptHeader.includes('application/javascript') || 
                           acceptHeader.includes('text/javascript') ||
                           acceptHeader.includes('*/*') && !acceptHeader.includes('text/html');
      
      if (isModuleImport) {
        // Serve the raw JavaScript file for module imports
        const examplePath = path.join(
          process.cwd(),
          'examples',
          req.params.exampleName + '.js'
        );
        
        if (!fs.existsSync(examplePath)) {
          return res.status(404).send('Example not found');
        }
        
        // Set correct MIME type for JavaScript modules
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(examplePath);
        return;
      }
      
      // Continue to HTML rendering for direct browser access
      next();
    });
    
    // Special handling for example files to serve rendered HTML for direct browser access
    // This must be after the module import handler
    this.app.get('/examples/:exampleName.js', async (req, res) => {
      try {
        const examplePath = path.join(
          process.cwd(),
          'examples',
          req.params.exampleName + '.js'
        );

        if (!fs.existsSync(examplePath)) {
          return res.status(404).send('Example not found');
        }

        // Dynamically import the component
        const module = await import(`file://${examplePath}`);

        // Get the component function
        let componentFn;
        if (module.default) {
          componentFn = module.default;
        } else {
          // Try to find a component function
          const exports = Object.entries(module);
          for (const [name, exported] of exports) {
            if (['hydrateClientSide', 'renderServerSide'].includes(name)) {
              continue;
            }

            if (typeof exported === 'function') {
              try {
                const result = exported({});
                if (typeof result === 'string') {
                  componentFn = exported;
                  break;
                } else if (result && typeof result === 'object') {
                  const keys = Object.keys(result);
                  if (keys.length > 0 && typeof keys[0] === 'string') {
                    componentFn = exported;
                    break;
                  }
                }
              } catch {
                continue;
              }
            } else if (exported && typeof exported === 'object') {
              const keys = Object.keys(exported);
              if (keys.length > 0 && typeof keys[0] === 'string') {
                componentFn = exported;
                break;
              }
            }
          }

          // Fallback to first export if no component found
          if (!componentFn && exports.length > 0) {
            componentFn = exports[0][1];
          }
        }

        if (!componentFn) {
          return res.status(500).send('No component found in example');
        }

        // Render the component with hydration support
        let html = '';
        try {
          const { renderToString } = await import(
            '../rendering/html-renderer.js'
          );

          // Use renderWithHydration if available for hydratable components
          if (componentFn.renderWithHydration && componentFn.isHydratable) {
            const hydratedResult = componentFn.renderWithHydration({});
            html = renderToString(hydratedResult);
          } else {
            html = renderToString(componentFn, {});
          }
        } catch (renderError) {
          console.error('Error rendering component:', renderError);
          return res
            .status(500)
            .send(`Error rendering component: ${renderError.message}`);
        }

        // Get the action registry from global (after rendering)
        const actionRegistry =
          typeof global !== 'undefined' && global.__coherentActionRegistry
            ? global.__coherentActionRegistry
            : {};

        // Send the rendered HTML with embedded action registry
        res.send(
          '<!DOCTYPE html>\n' +
            '<html>\n' +
            '<head>\n' +
            '  <title>' +
            req.params.exampleName +
            ' - Coherent.js Example</title>\n' +
            '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
            '  <style>\n' +
            "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }\n" +
            '    .container { max-width: 1200px; margin: 0 auto; }\n' +
            '  </style>\n' +
            '</head>\n' +
            '<body>\n' +
            '  <div class="container">\n' +
            '    ' +
            html +
            '\n' +
            '  </div>\n' +
            '  <script>\n' +
            '    // Transfer server-side action registry to client-side\n' +
            '    window.__coherentActionRegistry = window.__coherentActionRegistry || {};\n' +
            '    \n' +
            '    // Embed the action registry in the page\n' +
            '    const serverActionRegistry = ' +
            JSON.stringify(actionRegistry).replace(/</g, '\u003c') +
            ';\n' +
            '    Object.assign(window.__coherentActionRegistry, serverActionRegistry);\n' +
            '    \n' +
            '  </script>\n' +
            '  <script type="module">\n' +
            '    // Import and initialize hydration\n' +
            "    import { autoHydrate } from '/src/client/hydration.js';\n" +
            '    // This ensures the component registry is properly initialized before hydration\n' +
            "    import('/examples/" +
            req.params.exampleName +
            ".js').then(() => {\n" +
            '      // Now the component registry should be properly initialized\n' +
            '      const registry = window.componentRegistry || {};\n' +
            '      autoHydrate(registry);\n' +
            '    }).catch(error => {\n' +
            "      console.error('❌ Failed to load example module:', error);\n" +
            '      // Fallback to empty registry\n' +
            '      autoHydrate({});\n' +
            '    });\n' +
            '  </script>\n' +
            '  <script type="module">\n' +
            "    import '/src/client/hmr.js';\n" +
            '  </script>\n' +
            '</body>\n' +
            '</html>\n'
        );
      } catch (err) {
        console.error('Error serving example:', err);
        res.status(500).send(`Error loading example: ${err.message}`);
      }
    });

    // Serve static files
    this.staticPaths.forEach((staticPath) => {
      const fullPath = path.join(process.cwd(), staticPath);
      if (fs.existsSync(fullPath)) {
        this.app.use(`/${staticPath}`, express.static(fullPath));
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
      { name: 'Basic Demo', path: '/examples/basic-usage.js' },
      {
        name: 'Component Demo',
        path: '/examples/component-composition.js',
      },
      { name: 'Context Demo', path: '/examples/context-example.js' },
      { name: 'Hydration Demo', path: '/examples/hydration-demo.js' },
      { name: 'Performance Monitoring Demo', path: '/examples/performance-test.js' },
      { name: 'Streaming Renderer Demo', path: '/examples/streaming.js' },
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
                { p: { text: 'Hot reload and live preview enabled' } },
              ],
            },
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
                    text: 'Examples',
                  },
                },
                {
                  div: {
                    className: 'tab',
                    'data-tab': 'preview',
                    text: 'Live Preview',
                  },
                },
              ],
            },
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
                    children: examples.map((example) => ({
                      div: {
                        className: 'example-card',
                        children: [
                          { h3: { text: example.name } },
                          {
                            a: {
                              href: example.path,
                              className: 'example-link',
                              text: 'View Example',
                            },
                          },
                        ],
                      },
                    })),
                  },
                },
              ],
            },
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
                      {
                        p: {
                          text: 'Preview any Coherent.js component in real-time with custom props.',
                        },
                      },

                      // Preview controls
                      {
                        div: {
                          className: 'preview-controls',
                          children: [
                            {
                              input: {
                                type: 'text',
                                id: 'component-path',
                                placeholder:
                                  'Path to component file (e.g., /examples/basic-usage.js)',
                                style: 'width: 300px;',
                              },
                            },
                            {
                              input: {
                                type: 'text',
                                id: 'component-name',
                                placeholder: 'Component name (optional)',
                                style: 'width: 150px;',
                              },
                            },
                            {
                              button: {
                                onclick: 'previewCustomComponent()',
                                text: 'Preview',
                              },
                            },
                          ],
                        },
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
                                text: '{}',
                              },
                            },
                          ],
                        },
                      },

                      // Preview container
                      {
                        div: {
                          className: 'preview-container',
                          id: 'preview-container',
                          children: [
                            {
                              p: {
                                text: 'Select an example or enter a component path to preview',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Status
          {
            div: {
              className: 'status',
              children: [
                {
                  p: {
                    text: '✅ Server is running with hot reload and live preview enabled',
                  },
                },
                {
                  p: {
                    text: '🔄 Changes to source files will automatically trigger a reload',
                  },
                },
              ],
            },
          },
        ],
      },
    };
  }

  setupWebSocket(server) {
    // WebSocket server for hot reload and live preview (expects an existing HTTP server)
    this.wss = new WebSocketServer({ server });

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
  }

  async handlePreviewRequest(ws, data) {
    try {
      // Dynamically import the component
      const modulePath = path.join(process.cwd(), data.path);
      if (!fs.existsSync(modulePath)) {
        ws.send(
          JSON.stringify({
            type: 'preview-error',
            error: `Module not found: ${data.path}`,
          })
        );
        return;
      }

      // Import the module
      const module = await import(`file://${modulePath}`);

      // Get the component function
      let componentFn;
      if (module.default) {
        componentFn = module.default;
      } else if (data.component && module[data.component]) {
        componentFn = module[data.component];
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
                break;
              } else if (result && typeof result === 'object') {
                // Check if it's a valid component object (has a tag name as first key)
                const keys = Object.keys(result);
                if (keys.length > 0 && typeof keys[0] === 'string') {
                  componentFn = exported;
                  break;
                }
              }
            } catch {
              // If calling the function fails, it's not a component function
              continue;
            }
          } else if (exported && typeof exported === 'object') {
            // Direct object export - check if it's a valid component object
            const keys = Object.keys(exported);
            if (keys.length > 0 && typeof keys[0] === 'string') {
              componentFn = exported;
              break;
            }
          }
        }

        // Fallback to first export if no component found
        if (!componentFn && exports.length > 0) {
          componentFn = exports[0][1];
        }
      }

      if (!componentFn) {
        ws.send(
          JSON.stringify({
            type: 'preview-error',
            error: `No component found in module: ${data.path}`,
          })
        );
        return;
      }

      // Render the component with provided props
      let html = '';
      try {
        if (typeof componentFn === 'function') {
          // Try to render as a Coherent component
          // First try DOM rendering for better hydration support
          try {
            const { renderToDOM } = await import(
              '../rendering/dom-renderer.js'
            );

            // Create a temporary container to render the component
            const tempContainer = document.createElement('div');
            renderToDOM(componentFn, tempContainer, {
              props: data.props || {},
            });
            html = tempContainer.innerHTML;
          } catch {
            // Fallback to HTML rendering
            const { renderToString } = await import(
              '../rendering/html-renderer.js'
            );

            // Use renderWithHydration if available for hydratable components
            if (componentFn.renderWithHydration && componentFn.isHydratable) {
              const hydratedResult = componentFn.renderWithHydration(
                data.props || {}
              );
              html = renderToString(hydratedResult);
            } else {
              html = renderToString(componentFn, { props: data.props || {} });
            }
          }
        } else {
          // Force HTML rendering for preview to ensure action registry is populated
          try {
            const { renderToString } = await import(
              '../rendering/html-renderer.js'
            );
            html = renderToString(componentFn, data.props || {});
          } catch {
            // Fallback to DOM rendering
            const { renderToDOM } = await import(
              '../rendering/dom-renderer.js'
            );
            const tempContainer = document.createElement('div');
            renderToDOM(componentFn, tempContainer, data.props || {});
            html = tempContainer.innerHTML;
          }
        }
      } catch (renderError) {
        console.error('Error rendering component:', renderError);
        ws.send(
          JSON.stringify({
            type: 'preview-error',
            error: `Error rendering component: ${renderError.message}`,
          })
        );
        return;
      }

      // Get the action registry from global and send it to the client
      const actionRegistry =
        typeof global !== 'undefined' && global.__coherentActionRegistry
          ? global.__coherentActionRegistry
          : {};

      // Deep clone the action registry to avoid reference issues
      const clonedActionRegistry = {};
      Object.keys(actionRegistry).forEach((key) => {
        clonedActionRegistry[key] = actionRegistry[key];
      });

      // Send the rendered HTML and action registry back to the client
      const response = {
        type: 'preview-response',
        html: html,
        actionRegistry: clonedActionRegistry,
      };

      ws.send(JSON.stringify(response));
    } catch (err) {
      console.error('Error handling preview request:', err);
      ws.send(
        JSON.stringify({
          type: 'preview-error',
          error: `Error loading module: ${err.message}`,
        })
      );
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
            // Transfer server-side action registry to client-side
            window.__coherentActionRegistry = window.__coherentActionRegistry || {};
            window.__coherentEventRegistry = window.__coherentEventRegistry || {};
            
            // Transfer action registry from server to client
            if (typeof global !== 'undefined') {
              // Transfer action registry
              if (global.__coherentActionRegistry) {
                Object.assign(window.__coherentActionRegistry, global.__coherentActionRegistry);
              }
              
              // Transfer event registry (legacy support)
              if (global.__coherentEventRegistry) {
                Object.assign(window.__coherentEventRegistry, global.__coherentEventRegistry);
              }
            }
          </script>
          <script type="module">
            // Import and initialize hydration
            import { autoHydrate } from './src/client/hydration.js';
            
            // Auto-hydrate components when DOM is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', autoHydrate);
            } else {
              autoHydrate();
            }
          </script>
          <script type="module">
            import './src/client/hmr.js';
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
          return res
            .status(500)
            .json({ error: 'Failed to read examples directory' });
        }

        const examples = files
          .filter((file) => file.endsWith('.js'))
          .map((file) => ({
            name: path.basename(file, '.js'),
            path: `/examples/${file}`,
          }));

        res.json(examples);
      });
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Dev-only: trigger a test HMR broadcast
    this.app.get('/dev/hmr-test', (req, res) => {
      const file = req.query.file || path.join(process.cwd(), 'examples/hydration-demo.js');
      const type = req.query.type || this.determineUpdateType(String(file));
      console.log('🧪 HMR test trigger:', { file, type });
      this.broadcastHMRUpdate(String(file), String(type));
      res.json({ ok: true, file, type });
    });
  }

  startWatching() {
    // Watch for file changes
    this.watchPaths.forEach((watchPath) => {
      const fullPath = path.join(process.cwd(), watchPath);

      const watcher = chokidar.watch(watchPath, {
        cwd: process.cwd(),
        ignored: /node_modules/,
        persistent: true,
        usePolling: true,
        interval: 300,
        binaryInterval: 300,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 }
      });

      watcher.on('change', (filePath) => {
        console.log('🔥 HMR: File changed:', filePath);
        
        // Determine update type for intelligent HMR
        const updateType = this.determineUpdateType(filePath);
        
        // Debounce rapid changes
        if (this.pendingBuild) return;
        this.pendingBuild = true;
        setTimeout(() => {
          this.pendingBuild = false;
          console.log('🔥 HMR: File changed:', filePath);
          console.log('🔥 HMR: Determined update type:', updateType);
          // Only rebuild when server/dev tooling changed; HMR for client/examples doesn't need build
          if (updateType === 'full-reload') {
            console.log('🛠️  Auto-building due to full-reload update');
            this.autoBuild();
          }
          console.log('🔥 HMR: Broadcasting', updateType, 'for', filePath);
          this.broadcastHMRUpdate(filePath, updateType);
          if (
            filePath.endsWith('.js') &&
            (filePath.includes('examples') || filePath.includes('components'))
          ) {
            console.log('🎯 Preview update for', filePath);
            this.broadcastPreviewUpdate(filePath);
          }
        }, 50);
      });

      watcher.on('add', (p) => {
        console.log('📄 file added:', p);
        console.log('📄 Broadcasting reload for added file:', p);
        this.broadcastReload();
      });

      watcher.on('unlink', (p) => {
        console.log('🗑️  file removed:', p);
        this.broadcastReload();
      });

      this.watchers.push(watcher);

      watcher.on('ready', () => {
        console.log('👂 watcher ready for', fullPath);
      });

      watcher.on('raw', (eventName, filePath, details) => {
        // Low-level events for debugging
        console.log('🪵 raw event:', eventName, filePath);
      });
    });
  }

  autoBuild() {
    // Debounce builds to avoid multiple builds for rapid file changes
    if (this.buildTimeout) {
      clearTimeout(this.buildTimeout);
    }

    this.buildTimeout = setTimeout(() => {
      exec('npm run build', { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Build failed:', error.message);
          return;
        }
        if (stderr) {
          console.error('⚠️ Build warnings:', stderr);
        }
        console.log(stdout);

        // Broadcast reload after successful build
        this.broadcastReload();
      });
    }, 500); // 500ms debounce
  }

  broadcastReload() {
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'reload' }));
        }
      });
    }
  }

  broadcastPreviewUpdate(filePath) {
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: 'preview-update',
              path: filePath,
            })
          );
        }
      });
    }
  }

  /**
   * Determine the type of update needed based on file path
   */
  determineUpdateType(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    if (normalizedPath.includes('examples/') && normalizedPath.endsWith('.js')) {
      return 'component';
    }
    
    if (normalizedPath.includes('src/') && normalizedPath.endsWith('.js')) {
      // Any dev-server or tooling change should force a full reload
      if (normalizedPath.includes('src/dev/')) {
        return 'full-reload';
      }
      if (normalizedPath.includes('components/') || 
          normalizedPath.includes('client/') ||
          normalizedPath.includes('rendering/')) {
        return 'component';
      }
      return 'dependency';
    }
    
    if (normalizedPath.endsWith('.css') || normalizedPath.endsWith('.scss')) {
      return 'style';
    }
    
    if (normalizedPath.includes('package.json') || normalizedPath.includes('webpack')) {
      return 'full-reload';
    }
    
    return 'dependency';
  }

  /**
   * Broadcast intelligent HMR updates
   */
  broadcastHMRUpdate(filePath, updateType) {
    if (!this.wss) return;
    
    const normalizedPath = filePath.replace(/\\/g, '/');
    const moduleId = this.getModuleId(normalizedPath);
    const cwd = process.cwd().replace(/\\/g, '/');
    let rel = normalizedPath.startsWith(cwd) ? normalizedPath.slice(cwd.length) : normalizedPath;
    if (!rel.startsWith('/')) rel = `/${rel}`;
    // Derive a web-served path based on our static mounts
    // We statically serve '/src', '/examples', '/public', '/node_modules'
    let webPath = null;
    for (const base of ['/src/', '/examples/', '/public/', '/node_modules/']) {
      const idx = rel.indexOf(base);
      if (idx !== -1) { webPath = rel.slice(idx); break; }
    }
    
    let message = {
      type: updateType === 'component' ? 'hmr-component-update' : 'hmr-update',
      filePath: normalizedPath,
      moduleId,
      updateType,
      ...(webPath ? { webPath } : {})
    };
    
    if (updateType === 'component') {
      message.componentName = this.extractComponentName(normalizedPath);
    }
    
    if (updateType === 'full-reload') {
      message = {
        type: 'hmr-full-reload',
        reason: 'Configuration file changed',
        filePath: normalizedPath
      };
    }
    
    console.log('🔔 HMR broadcast:', { updateType, file: normalizedPath, webPath });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
    
    if (updateType === 'full-reload') {
      setTimeout(() => this.broadcastReload(), 100);
    }
  }

  /**
   * Generate module ID from file path
   */
  getModuleId(filePath) {
    return filePath
      .replace(process.cwd().replace(/\\/g, '/'), '')
      .replace(/^\//g, '')
      .replace(/\//g, '_')
      .replace(/\./g, '_');
  }

  /**
   * Extract component name from file path
   */
  extractComponentName(filePath) {
    const fileName = path.basename(filePath, '.js');
    return fileName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  start() {
    // Start HTTP server and websocket, then start watching
    this.app.server = this.app.listen(this.port, this.host, () => {
      // Expose server on instance and avoid keeping event loop alive when idle
      this.server = this.app.server;
      if (this.server && typeof this.server.unref === 'function') {
        this.server.unref();
      }
      console.log(
        `🚀 Development server running at http://${this.host}:${this.port}`
      );
      console.log(`👀 Watching for changes in: ${this.watchPaths.join(', ')}`);

      // Setup WebSocket server after HTTP server is listening
      this.setupWebSocket(this.app.server);

      // Start file watchers
      this.startWatching();
    });
  }

  stop() {
    // Close watchers
    this.watchers.forEach((watcher) => watcher.close());

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
