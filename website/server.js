import { createRouter } from '../packages/api/src/router.js';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';
import { render } from '../packages/core/src/rendering/html-renderer.js';
import { Examples } from './src/pages/Examples.js';
import { Home } from './src/pages/Home.js';
import { DocsPage } from './src/pages/DocsPage.js';
import { Playground } from './src/pages/Playground.js';
import { Performance } from './src/pages/Performance.js';
import { Coverage } from './src/pages/Coverage.js';
import { StarterAppPage } from './src/pages/StarterApp.js';
import { Layout } from './src/layout/Layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = process.env.PORT || 3000;

// Helper function to scan examples directory - show all examples
function getExamplesList() {
  const examplesDir = join(__dirname, '../examples');

  const files = readdirSync(examplesDir).filter(file => {
    const filePath = join(examplesDir, file);
    return statSync(filePath).isFile() &&
           file.endsWith('.js') &&
           !file.endsWith('.test.js'); // Exclude test files
  });

  return files.map(file => {
    const filePath = join(examplesDir, file);
    let code = '';
    let description = '';
    let label = '';

    try {
      code = readFileSync(filePath, 'utf-8');

      // Extract description from first comment or JSDoc comment
      const commentMatch = code.match(/\/\*\*(.*?)\*\//s) || code.match(/\/\*(.*?)\*\//s);
      if (commentMatch) {
        description = commentMatch[1].replace(/\*/g, '').trim();
        // Clean up description - take first meaningful line
        const lines = description.split('\n').map(l => l.trim()).filter(Boolean);
        description = lines[0] || 'Explore this practical Coherent.js example.';
      }

      // Generate label from filename
      label = file.replace('.js', '').split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      // Special handling for specific examples
      if (file === 'basic-usage.js') {
        label = '🚀 Basic Usage';
        description = 'Basic component examples showing greetings, user cards, and complete page composition patterns with styling.';
      } else if (file === 'dev-preview.js') {
        label = '🔧 Dev Preview';
        description = 'Development server preview component demonstrating basic structure and styling capabilities.';
      }

    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
      description = 'Explore this practical Coherent.js example.';
      label = file.replace('.js', '');
    }

    return {
      file,
      label,
      description: description.length > 150 ? `${description.substring(0, 147)  }...` : description,
      runCmd: `node examples/${file}`,
      code: code.length > 5000 ? `${code.substring(0, 4997)  }...` : code
    };
  }).sort((a, b) => {
    // Sort basic-usage.js first, then alphabetical
    if (a.file === 'basic-usage.js') return -1;
    if (b.file === 'basic-usage.js') return 1;
    return a.label.localeCompare(b.label);
  });
}

// Base HTML template
function renderPage(layoutHtml, pageContent, title = 'Coherent.js', scripts = []) {
  // Replace the content placeholder with actual page content
  let html = layoutHtml.replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', pageContent);

  // Add scripts if provided
  if (scripts.length > 0) {
    const scriptTags = scripts.map(script => `<script src="${script}"></script>`).join('\n  ');
    html = html.replace('</body>', `  ${scriptTags}\n</body>`);
  }

  return html;
}

// Static file serving middleware
function staticFileMiddleware(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Define static directories
  const staticPaths = [
    { prefix: '/examples/', dir: join(__dirname, '../examples') },
    { prefix: '/dist/', dir: join(__dirname, 'dist') },
    { prefix: '/', dir: join(__dirname, 'public') }
  ];

  for (const { prefix, dir } of staticPaths) {
    if (pathname.startsWith(prefix)) {
      const filePath = join(dir, pathname.slice(prefix.length));

      try {
        const stat = statSync(filePath);
        if (stat.isFile()) {
          const content = readFileSync(filePath);

          // Determine content type
          const ext = filePath.split('.').pop();
          const contentTypes = {
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'ico': 'image/x-icon',
            'woff': 'font/woff',
            'woff2': 'font/woff2',
            'ttf': 'font/ttf',
            'eot': 'application/vnd.ms-fontobject'
          };

          res.writeHead(200, {
            'Content-Type': contentTypes[ext] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=3600'
          });
          res.end(content);
          return true; // Response handled, stop middleware chain
        }
      } catch (error) {
        // File not found, continue
      }
    }
  }

  return null; // Not a static file, continue to routes
}

// Page render helper
function renderPageRoute(currentPath, PageComponent, title, scripts = []) {
  return (req, res) => {
    try {
      const layoutHtml = render(Layout({
        currentPath,
        children: []
      }));
      const pageContent = typeof PageComponent === 'function'
        ? render(PageComponent())
        : PageComponent;

      const html = renderPage(layoutHtml, pageContent, title, scripts);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (error) {
      console.error(`Error rendering ${currentPath}:`, error);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error</h1><p>${error.message}</p>`);
    }
  };
}

// Create router with object-based route definitions
const router = createRouter({
  // Root route
  '/': {
    GET: {
      handler: renderPageRoute('/', Home, 'Coherent.js - Modern Object-Based UI Framework')
    }
  },

  // Examples route
  '/examples': {
    GET: {
      handler: (req, res) => {
        const examples = getExamplesList();
        return renderPageRoute('/examples',
          () => Examples({ items: examples }),
          'Examples - Coherent.js'
        )(req, res);
      }
    }
  },

  // Docs route
  '/docs': {
    GET: {
      handler: renderPageRoute('/docs',
        () => DocsPage({ title: 'Documentation', html: '' }),
        'Documentation - Coherent.js')
    }
  },

  // Playground route
  '/playground': {
    GET: {
      handler: renderPageRoute('/playground', Playground, 'Playground - Coherent.js',
        ['/codemirror-editor.js', '/playground.js'])
    }
  },

  // Performance route
  '/performance': {
    GET: {
      handler: renderPageRoute('/performance', Performance, 'Performance - Coherent.js',
        ['/performance.js'])
    }
  },

  // Coverage route
  '/coverage': {
    GET: {
      handler: renderPageRoute('/coverage', Coverage, 'Coverage - Coherent.js')
    }
  },

  // Starter app route
  '/starter-app': {
    GET: {
      handler: renderPageRoute('/starter-app', StarterAppPage, 'Starter App - Coherent.js')
    }
  },

  // Changelog route
  '/changelog': {
    GET: {
      handler: renderPageRoute('/changelog',
        '<div class="content"><h1>Changelog</h1><p>Version history and release notes coming soon...</p></div>',
        'Changelog - Coherent.js')
    }
  },

  // Playground execution endpoint
  '/__playground': {
    run: {
      POST: {
        handler: async (req, res) => {
          return new Promise((resolve) => {
            try {
              const { code } = req.body;

              if (!code) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 1, stderr: 'No code provided' }));
                resolve();
                return;
              }

              // Wrap code in an async IIFE to allow top-level return/await
              const wrappedCode = `(async () => {\n${code}\n})().catch(console.error);`;

              // Execute code in a child process for security
              import('child_process').then(({ spawn }) => {
                const child = spawn('node', ['--input-type=module'], {
                  timeout: 5000 // 5 second timeout
                });

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', (data) => {
                  stdout += data.toString();
                });

                child.stderr.on('data', (data) => {
                  stderr += data.toString();
                });

                child.on('close', (exitCode) => {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    code: exitCode || 0,
                    stdout,
                    stderr
                  }));
                  resolve();
                });

                child.on('error', (error) => {
                  if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                      code: 1,
                      stdout: '',
                      stderr: error.message
                    }));
                    resolve();
                  }
                });

                // Write wrapped code to stdin
                child.stdin.write(wrappedCode);
                child.stdin.end();
              });

            } catch (error) {
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  code: 1,
                  stdout: '',
                  stderr: error.message
                }));
              }
              resolve();
            }
          });
        }
      }
    }
  },

  // API routes
  '/api': {
    examples: {
      GET: {
        handler: (req, res) => {
          const examples = getExamplesList();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(examples));
        }
      },

      // Dynamic route with parameter
      ':filename': {
        GET: {
          handler: (req, res) => {
            const { filename } = req.params;
            const filePath = join(__dirname, '../examples', filename);

            // Security check - ensure filename doesn't contain path traversal
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid filename' }));
              return;
            }

            try {
              // Check if file exists and read it
              if (!statSync(filePath).isFile()) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Example file not found' }));
                return;
              }

              const content = readFileSync(filePath, 'utf-8');
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end(content);

            } catch (error) {
              if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Example file not found' }));
              } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
              }
            }
          }
        }
      }
    }
  }
});

// Create HTTP server with custom handler that runs static files first, then router
const server = createServer(async (req, res) => {
  // Try static files first
  const staticHandled = staticFileMiddleware(req, res);
  if (staticHandled) {
    return; // Static file was served
  }

  // Fall back to router for dynamic routes
  await router.handle(req, res);
});

// Start server
server.listen(port, () => {
  console.log(`🚀 Coherent.js website running at http://localhost:${port}`);
  console.log('   Using Coherent.js API Router (Object-based routing)!');
  console.log('📚 Examples:', `http://localhost:${port}/examples`);
  console.log('🧪 Playground:', `http://localhost:${port}/playground`);
  console.log('📖 Docs:', `http://localhost:${port}/docs`);
  console.log('\n✨ Pure Coherent.js stack: API Router + Core SSR!');
});
