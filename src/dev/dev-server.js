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

        // Check if file contains server-only imports that can't run in browser
        const fileContent = fs.readFileSync(examplePath, 'utf8');
        if (fileContent.includes('database') || 
            fileContent.includes('Migration') ||
            fileContent.includes('createObjectRouter') ||
            fileContent.includes('router-features') ||
            fileContent.includes('websocket') ||
            fileContent.includes('node:http') ||
            fileContent.includes('node:crypto')) {
          // Skip server-only examples that can't run in browser
          return res.status(500).send(`
            <html>
              <head><title>Server-Only Example</title></head>
              <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>🖥️ Server-Only Example</h1>
                <p>This example (<strong>${req.params.exampleName}.js</strong>) contains server-side code that cannot run in the browser.</p>
                <p>It includes Node.js modules like:</p>
                <ul>
                  <li>HTTP server creation</li>
                  <li>Database connections</li>
                  <li>WebSocket servers</li>
                  <li>Crypto operations</li>
                </ul>
                <p>To run this example, use: <code>node examples/${req.params.exampleName}.js</code></p>
                <a href="/">← Back to Examples</a>
              </body>
            </html>
          `);
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
                // Skip certain files that shouldn't be loaded as examples
                if (req.params.exampleName.includes('node_modules') || 
                    req.params.exampleName.includes('.test.') || 
                    req.params.exampleName.includes('.spec.') ||
                    req.params.exampleName.endsWith('.md') ||
                    req.params.exampleName.includes('router-features') ||
                    req.params.exampleName.includes('websocket') ||
                    req.params.exampleName.includes('database')) {
                  continue;
                }
                
                // Try calling with empty props first, then with default props if it fails
                let result;
                try {
                  result = exported({});
                } catch {
                  // If empty props fail, try with some common default props
                  try {
                    result = exported({ userInput: '', data: [], items: [] });
                  } catch {
                    continue;
                  }
                }
                
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
    // Dynamically load all examples from the examples directory with categorization
    const examplesDir = path.join(process.cwd(), 'examples');
    let examples = [];
    
    try {
      const files = fs.readdirSync(examplesDir);
      examples = files
        .filter(file => file.endsWith('.js'))
        .map(file => {
          const name = path.basename(file, '.js');
          // Convert filename to display name
          const displayName = name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Smart categorization based on filename and content analysis
          const category = this.categorizeExample(name, file);
          const description = this.getExampleDescription(name);
          const difficulty = this.getExampleDifficulty(name);
          
          return {
            name: displayName,
            path: `/examples/${file}`,
            filename: file,
            category,
            description,
            difficulty,
            tags: this.getExampleTags(name)
          };
        })
        .sort((a, b) => {
          // Sort by category first, then by difficulty, then by name
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          if (a.difficulty !== b.difficulty) {
            const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
            return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
          }
          return a.name.localeCompare(b.name);
        });
    } catch (err) {
      console.error('Error reading examples directory:', err);
      // Enhanced fallback examples with categories
      examples = [
        { 
          name: 'Basic Usage', 
          path: '/examples/basic-usage.js',
          category: 'Getting Started',
          description: 'Learn the fundamentals of Coherent.js components',
          difficulty: 'Beginner',
          tags: ['components', 'basics']
        },
        { 
          name: 'Component Composition', 
          path: '/examples/component-composition.js',
          category: 'Components',
          description: 'Compose complex UIs from simple components',
          difficulty: 'Intermediate',
          tags: ['components', 'composition']
        },
        { 
          name: 'Hydration Demo', 
          path: '/examples/hydration-demo.js',
          category: 'Client-Side',
          description: 'Server-side rendering with client-side hydration',
          difficulty: 'Advanced',
          tags: ['hydration', 'ssr', 'interactive']
        },
        { 
          name: 'Database Queries', 
          path: '/examples/database-queries.js',
          category: 'Database',
          description: 'Pure object database queries and models',
          difficulty: 'Intermediate',
          tags: ['database', 'queries', 'models']
        }
      ];
    }

    // Group examples by category
    const categorizedExamples = this.groupExamplesByCategory(examples);

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

          // Examples tab content with categories
          {
            div: {
              id: 'examples-tab',
              className: 'tab-content active',
              children: [
                // Search and filters
                {
                  div: {
                    className: 'examples-controls',
                    children: [
                      {
                        div: {
                          className: 'search-container',
                          children: [
                            {
                              input: {
                                type: 'text',
                                id: 'example-search',
                                placeholder: 'Search examples...',
                                className: 'search-input',
                                onkeyup: 'filterExamples()',
                              },
                            },
                            {
                              select: {
                                id: 'difficulty-filter',
                                className: 'filter-select',
                                onchange: 'filterExamples()',
                                children: [
                                  { option: { value: '', text: 'All Difficulties' } },
                                  { option: { value: 'Beginner', text: 'Beginner' } },
                                  { option: { value: 'Intermediate', text: 'Intermediate' } },
                                  { option: { value: 'Advanced', text: 'Advanced' } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                // Category sections
                ...Object.entries(categorizedExamples).map(([category, categoryExamples]) => ({
                  div: {
                    className: 'category-section',
                    'data-category': category.toLowerCase(),
                    children: [
                      // Category header
                      {
                        div: {
                          className: 'category-header',
                          children: [
                            { h2: { text: `${category} (${categoryExamples.length})` } },
                            {
                              div: {
                                className: 'category-description',
                                text: this.getCategoryDescription(category),
                              },
                            },
                          ],
                        },
                      },
                      // Examples grid
                      {
                        div: {
                          className: 'examples-grid',
                          children: categoryExamples.map((example) => ({
                            div: {
                              className: `example-card ${example.difficulty.toLowerCase()}`,
                              'data-difficulty': example.difficulty,
                              'data-tags': example.tags.join(','),
                              'data-name': example.name.toLowerCase(),
                              children: [
                                // Example header
                                {
                                  div: {
                                    className: 'example-header',
                                    children: [
                                      { h3: { text: example.name } },
                                      {
                                        span: {
                                          className: `difficulty-badge ${example.difficulty.toLowerCase()}`,
                                          text: example.difficulty,
                                        },
                                      },
                                    ],
                                  },
                                },
                                // Description
                                {
                                  p: {
                                    className: 'example-description',
                                    text: example.description,
                                  },
                                },
                                // Tags
                                {
                                  div: {
                                    className: 'example-tags',
                                    children: example.tags.slice(0, 3).map(tag => ({
                                      span: {
                                        className: 'tag',
                                        text: tag,
                                      },
                                    })),
                                  },
                                },
                                // Actions
                                {
                                  div: {
                                    className: 'example-actions',
                                    children: [
                                      {
                                        a: {
                                          href: example.path,
                                          className: 'example-link primary',
                                          text: 'View Example',
                                        },
                                      },
                                      {
                                        button: {
                                          className: 'preview-btn',
                                          onclick: `previewExample('${example.filename}')`,
                                          text: 'Quick Preview',
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          })),
                        },
                      },
                    ],
                  },
                })),
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

  // Helper method to categorize examples based on filename patterns
  categorizeExample(name) {
    const categories = {
      'Getting Started': ['basic', 'simple', 'intro'],
      'Components': ['component', 'composition', 'context', 'memo'],
      'Database': ['database', 'query', 'model', 'migration'],
      'Routing': ['router', 'routing', 'route'],
      'Client-Side': ['hydration', 'client', 'browser'],
      'Server-Side': ['express', 'nextjs', 'streaming', 'ssr'],
      'WebSockets': ['websocket', 'ws', 'realtime'],
      'Performance': ['performance', 'cache', 'static', 'optimization'],
      'Advanced': ['advanced', 'complex']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.toLowerCase().includes(keyword))) {
        return category;
      }
    }
    return 'Examples'; // Default category
  }

  // Get description for examples based on filename
  getExampleDescription(name) {
    const descriptions = {
      'basic-usage': 'Learn the fundamentals of Coherent.js with pure object components',
      'component-composition': 'Compose complex UIs from simple, reusable components',
      'context-example': 'Share state across components without prop drilling',
      'hydration-demo': 'Server-side rendering with interactive client-side hydration',
      'database-queries': 'Build database queries using pure JavaScript objects',
      'database-usage': 'Complete database integration examples and patterns',
      'pure-object-models': 'Define data models using pure JavaScript objects',
      'router-demo': 'RESTful routing with pure object configuration',
      'enhanced-router-demo': 'Advanced routing features and middleware',
      'advanced-router-features': 'Complex routing scenarios and best practices',
      'websocket-routing': 'Real-time communication with WebSocket routing',
      'websocket-object-routing': 'Object-based WebSocket message handling',
      'websocket-config-routing': 'Configure WebSocket routing declaratively',
      'express-integration': 'Integrate Coherent.js with Express.js servers',
      'nextjs-integration': 'Use Coherent.js components in Next.js applications',
      'streaming': 'Stream large responses efficiently with chunking',
      'performance-test': 'Performance benchmarks and optimization techniques',
      'static-cache-test': 'Static caching strategies for better performance',
      'memoization': 'Component memoization for performance optimization',
      'advanced-features': 'Explore advanced framework capabilities',
      'dev-preview': 'Development tools and live preview features'
    };
    return descriptions[name] || 'Explore this Coherent.js example';
  }

  // Determine difficulty level based on filename and complexity
  getExampleDifficulty(name) {
    const beginner = ['basic', 'simple', 'intro'];
    const advanced = ['advanced', 'complex', 'websocket', 'performance', 'integration'];
    
    if (beginner.some(keyword => name.toLowerCase().includes(keyword))) {
      return 'Beginner';
    }
    if (advanced.some(keyword => name.toLowerCase().includes(keyword))) {
      return 'Advanced';
    }
    return 'Intermediate';
  }

  // Get tags for examples
  getExampleTags(name) {
    const tags = [];
    const tagMap = {
      'basic': ['fundamentals', 'getting-started'],
      'component': ['components', 'ui'],
      'composition': ['composition', 'reusable'],
      'context': ['state', 'context'],
      'hydration': ['ssr', 'client-side', 'interactive'],
      'database': ['data', 'persistence'],
      'query': ['queries', 'sql'],
      'model': ['models', 'orm'],
      'router': ['routing', 'api'],
      'websocket': ['realtime', 'websockets'],
      'express': ['server', 'integration'],
      'nextjs': ['react', 'framework'],
      'streaming': ['performance', 'streaming'],
      'performance': ['optimization', 'caching'],
      'cache': ['caching', 'performance'],
      'memo': ['memoization', 'optimization'],
      'advanced': ['advanced', 'expert']
    };

    for (const [keyword, keywordTags] of Object.entries(tagMap)) {
      if (name.toLowerCase().includes(keyword)) {
        tags.push(...keywordTags);
      }
    }
    return [...new Set(tags)]; // Remove duplicates
  }

  // Group examples by category
  groupExamplesByCategory(examples) {
    const grouped = {};
    examples.forEach(example => {
      const category = example.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(example);
    });
    return grouped;
  }

  // Get description for categories
  getCategoryDescription(category) {
    const descriptions = {
      'Getting Started': 'Learn the basics of Coherent.js with fundamental concepts',
      'Components': 'Build reusable UI components with pure JavaScript objects',
      'Database': 'Work with data using pure object queries and models',
      'Routing': 'Handle HTTP routes and API endpoints declaratively', 
      'Client-Side': 'Client-side features like hydration and interactivity',
      'Server-Side': 'Server-side rendering and framework integrations',
      'WebSockets': 'Real-time communication and WebSocket routing',
      'Performance': 'Optimization techniques and performance monitoring',
      'Advanced': 'Advanced patterns and complex use cases',
      'Examples': 'Miscellaneous examples and demonstrations'
    };
    return descriptions[category] || 'Explore these examples';
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
            /* Base styles */
            * { box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; 
              max-width: 1400px; 
              margin: 0 auto; 
              padding: 20px; 
              background: #fafafa;
              line-height: 1.6;
            }
            
            /* Header */
            .header { 
              text-align: center; 
              margin-bottom: 40px;
              padding: 40px 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border-radius: 12px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            .header h1 { margin: 0 0 10px 0; font-size: 2.5em; font-weight: 600; }
            .header p { margin: 0; opacity: 0.9; font-size: 1.1em; }
            
            /* Tabs */
            .tabs { 
              display: flex; 
              margin-bottom: 30px; 
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .tab { 
              flex: 1;
              padding: 15px 20px; 
              background: white; 
              cursor: pointer; 
              border: none;
              font-size: 16px;
              font-weight: 500;
              transition: all 0.3s ease;
              text-align: center;
            }
            .tab:hover { background: #f8f9fa; }
            .tab.active { 
              background: #007acc; 
              color: white; 
            }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
            
            /* Examples controls */
            .examples-controls {
              margin-bottom: 30px;
              padding: 20px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .search-container {
              display: flex;
              gap: 15px;
              align-items: center;
              flex-wrap: wrap;
            }
            .search-input {
              flex: 1;
              min-width: 300px;
              padding: 12px 16px;
              border: 2px solid #e1e5e9;
              border-radius: 8px;
              font-size: 16px;
              transition: border-color 0.3s ease;
            }
            .search-input:focus {
              outline: none;
              border-color: #007acc;
            }
            .filter-select {
              padding: 12px 16px;
              border: 2px solid #e1e5e9;
              border-radius: 8px;
              font-size: 16px;
              background: white;
              cursor: pointer;
            }
            
            /* Category sections */
            .category-section {
              margin-bottom: 40px;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            }
            .category-header {
              padding: 20px 30px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border-bottom: 1px solid #e1e5e9;
            }
            .category-header h2 {
              margin: 0 0 8px 0;
              color: #2c3e50;
              font-size: 1.5em;
              font-weight: 600;
            }
            .category-description {
              color: #6c757d;
              font-size: 14px;
            }
            
            /* Examples grid */
            .examples-grid { 
              padding: 30px;
              display: grid; 
              grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); 
              gap: 24px; 
            }
            
            /* Example cards */
            .example-card { 
              background: white;
              border: 1px solid #e1e5e9;
              border-radius: 12px; 
              padding: 24px;
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
            }
            .example-card:hover { 
              transform: translateY(-4px);
              box-shadow: 0 12px 32px rgba(0,0,0,0.15);
              border-color: #007acc;
            }
            
            /* Difficulty-based styling */
            .example-card.beginner { border-left: 4px solid #28a745; }
            .example-card.intermediate { border-left: 4px solid #ffc107; }
            .example-card.advanced { border-left: 4px solid #dc3545; }
            
            .example-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 12px;
            }
            .example-header h3 { 
              margin: 0; 
              color: #2c3e50;
              font-size: 1.25em;
              font-weight: 600;
            }
            .difficulty-badge {
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .difficulty-badge.beginner { background: #d4edda; color: #155724; }
            .difficulty-badge.intermediate { background: #fff3cd; color: #856404; }
            .difficulty-badge.advanced { background: #f8d7da; color: #721c24; }
            
            .example-description {
              color: #6c757d;
              margin-bottom: 16px;
              font-size: 14px;
              line-height: 1.5;
            }
            
            /* Tags */
            .example-tags {
              margin-bottom: 20px;
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .tag {
              padding: 4px 8px;
              background: #f8f9fa;
              color: #495057;
              border-radius: 16px;
              font-size: 12px;
              font-weight: 500;
              border: 1px solid #e9ecef;
            }
            
            /* Actions */
            .example-actions {
              display: flex;
              gap: 12px;
            }
            .example-link {
              flex: 1;
              padding: 12px 16px;
              border-radius: 8px;
              text-decoration: none;
              text-align: center;
              font-weight: 500;
              font-size: 14px;
              transition: all 0.3s ease;
            }
            .example-link.primary {
              background: #007acc;
              color: white;
            }
            .example-link.primary:hover {
              background: #005a9e;
              transform: translateY(-1px);
            }
            .preview-btn {
              padding: 12px 16px;
              border: 2px solid #007acc;
              background: transparent;
              color: #007acc;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
              font-size: 14px;
              transition: all 0.3s ease;
            }
            .preview-btn:hover {
              background: #007acc;
              color: white;
              transform: translateY(-1px);
            }
            
            /* Status and other components */
            .status { 
              margin-top: 40px; 
              padding: 20px; 
              background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); 
              border-radius: 8px;
              border: 1px solid #c3e6cb;
            }
            .live-preview { 
              margin-top: 30px; 
              padding: 30px; 
              background: white; 
              border-radius: 12px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            }
            .preview-container { 
              margin-top: 20px; 
              border: 2px solid #e1e5e9; 
              border-radius: 8px; 
              min-height: 200px; 
              padding: 20px; 
              background: #fafafa;
            }
            .preview-controls { 
              margin-bottom: 20px; 
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              align-items: center;
            }
            .preview-controls input, 
            .preview-controls select, 
            .preview-controls button { 
              padding: 10px 14px;
              border: 2px solid #e1e5e9;
              border-radius: 6px;
              font-size: 14px;
            }
            .preview-controls button {
              background: #007acc;
              color: white;
              border-color: #007acc;
              cursor: pointer;
              font-weight: 500;
            }
            .preview-controls button:hover {
              background: #005a9e;
              border-color: #005a9e;
            }

            /* Responsive design */
            @media (max-width: 768px) {
              body { padding: 15px; }
              .header { padding: 30px 15px; }
              .header h1 { font-size: 2em; }
              .examples-grid { 
                grid-template-columns: 1fr;
                padding: 20px;
              }
              .search-container { flex-direction: column; }
              .search-input { min-width: auto; width: 100%; }
              .example-actions { flex-direction: column; }
              .tabs { flex-direction: column; }
            }
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
            
            // Enhanced dashboard functionality
            function filterExamples() {
              const searchTerm = document.getElementById('example-search').value.toLowerCase();
              const difficultyFilter = document.getElementById('difficulty-filter').value;
              
              const cards = document.querySelectorAll('.example-card');
              const sections = document.querySelectorAll('.category-section');
              
              cards.forEach(card => {
                const name = card.getAttribute('data-name') || '';
                const tags = card.getAttribute('data-tags') || '';
                const difficulty = card.getAttribute('data-difficulty') || '';
                
                const matchesSearch = name.includes(searchTerm) || 
                                    tags.includes(searchTerm);
                const matchesDifficulty = !difficultyFilter || 
                                        difficulty === difficultyFilter;
                
                card.style.display = matchesSearch && matchesDifficulty ? 'block' : 'none';
              });
              
              // Hide empty categories
              sections.forEach(section => {
                const visibleCards = section.querySelectorAll('.example-card[style*="block"], .example-card:not([style*="none"])');
                section.style.display = visibleCards.length > 0 ? 'block' : 'none';
              });
            }
            
            function previewExample(filename) {
              // Quick preview functionality
              const previewContainer = document.getElementById('preview-container');
              if (previewContainer) {
                previewContainer.innerHTML = '<p>Loading preview...</p>';
                
                // Switch to preview tab
                document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                document.querySelector('[data-tab="preview"]').classList.add('active');
                document.getElementById('preview-tab').classList.add('active');
                
                // Load the example
                fetch(\`/examples/\${filename}\`)
                  .then(response => response.text())
                  .then(html => {
                    previewContainer.innerHTML = html;
                  })
                  .catch(error => {
                    previewContainer.innerHTML = \`<p>Error loading preview: \${error.message}</p>\`;
                  });
              }
            }
            
            // Tab switching
            document.addEventListener('DOMContentLoaded', function() {
              const tabs = document.querySelectorAll('.tab');
              tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                  const tabName = this.getAttribute('data-tab');
                  
                  // Update tab appearance
                  tabs.forEach(t => t.classList.remove('active'));
                  this.classList.add('active');
                  
                  // Update content visibility
                  document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                  });
                  document.getElementById(tabName + '-tab').classList.add('active');
                });
              });
            });
            
            // Make functions globally available
            window.filterExamples = filterExamples;
            window.previewExample = previewExample;
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

      watcher.on('raw', (eventName, filePath) => {
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
