import express from 'express';
import { createRouter } from '../packages/api/src/router.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';
import { renderWithTemplate } from '../packages/core/src/utils/render-utils.js';
import { performanceMonitor } from '../packages/core/src/performance/monitor.js';
import { registerComponent, getComponent } from '../packages/core/src/components/component-system.js';
import { createErrorBoundary } from '../packages/core/src/components/error-boundary.js';
import { setupCoherent } from '../packages/express/src/coherent-express.js';
import { Examples } from './src/pages/Examples.js';
import { Home } from './src/pages/Home.js';
import { DocsPage } from './src/pages/DocsPage.js';
import { Playground } from './src/pages/Playground.js';
import { Performance } from './src/pages/Performance.js';
import { Coverage } from './src/pages/Coverage.js';
import { StarterAppPage } from './src/pages/StarterApp.js';
import { Changelog } from './src/pages/Changelog.js';
import { Layout } from './src/layout/Layout.js';

// ---------------------------------------------------------------------------
// Component Registry — register all page components
// ---------------------------------------------------------------------------
registerComponent('Home', Home);
registerComponent('Examples', Examples);
registerComponent('DocsPage', DocsPage);
registerComponent('Playground', Playground);
registerComponent('Performance', Performance);
registerComponent('Coverage', Coverage);
registerComponent('StarterApp', StarterAppPage);
registerComponent('Changelog', Changelog);

// Error boundary — wraps page rendering with graceful fallback
const withPageErrorBoundary = createErrorBoundary({
  fallback: (error) => ({
    div: {
      className: 'error-page',
      children: [
        { h1: { text: 'Something went wrong' } },
        { p: { text: error?.message || 'An unexpected error occurred while rendering this page.' } },
        { a: { href: '/', className: 'button primary', text: 'Go Home' } },
      ],
    },
  }),
  onError: (error) => console.error('[Coherent.js] Page render error:', error),
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Scan examples directory
function getExamplesList() {
  const examplesDir = join(__dirname, '../examples');

  const files = readdirSync(examplesDir).filter(file => {
    const filePath = join(examplesDir, file);
    return statSync(filePath).isFile() &&
           file.endsWith('.js') &&
           !file.endsWith('.test.js');
  });

  return files.map(file => {
    const filePath = join(examplesDir, file);
    let code = '';
    let description = '';
    let label = '';

    try {
      code = readFileSync(filePath, 'utf-8');

      const commentMatch = code.match(/\/\*\*(.*?)\*\//s) || code.match(/\/\*(.*?)\*\//s);
      if (commentMatch) {
        description = commentMatch[1].replace(/\*/g, '').trim();
        const lines = description.split('\n').map(l => l.trim()).filter(Boolean);
        description = lines[0] || 'Explore this practical Coherent.js example.';
      }

      label = file.replace('.js', '').split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

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
      description: description.length > 150 ? `${description.substring(0, 147)}...` : description,
      runCmd: `node examples/${file}`,
      code: code.length > 5000 ? `${code.substring(0, 4997)}...` : code
    };
  }).sort((a, b) => {
    if (a.file === 'basic-usage.js') return -1;
    if (b.file === 'basic-usage.js') return 1;
    return a.label.localeCompare(b.label);
  });
}

// Render a full page — error boundary + Layout composition + renderWithTemplate
function renderFullPage({ currentPath, componentName, props = {}, title = 'Coherent.js', scripts = [] }) {
  const Component = getComponent(componentName);
  const SafeComponent = withPageErrorBoundary(Component);
  const content = SafeComponent(props);
  // Layout expects paths without leading slash (e.g. 'examples', not '/examples')
  const layoutPath = currentPath === '/' ? '' : currentPath.replace(/^\//, '');
  const page = Layout({ title, currentPath: layoutPath, content, scripts });
  return renderWithTemplate(page, {
    template: '<!DOCTYPE html>\n{{content}}',
    enablePerformanceMonitoring: true,
  });
}

// Declarative route table
const pageRoutes = [
  { path: '/', component: 'Home', title: 'Coherent.js - Modern Object-Based UI Framework', scripts: ['/coherent-hydrate.js', '/counter-demo.js'] },
  { path: '/docs', component: 'DocsPage', title: 'Documentation - Coherent.js', props: { title: 'Documentation', html: '' } },
  { path: '/playground', component: 'Playground', title: 'Playground - Coherent.js', scripts: ['/codemirror-editor.js', '/playground.js'] },
  { path: '/performance', component: 'Performance', title: 'Performance - Coherent.js', scripts: ['/performance.js'] },
  { path: '/coverage', component: 'Coverage', title: 'Coverage - Coherent.js' },
  { path: '/starter-app', component: 'StarterApp', title: 'Starter App - Coherent.js' },
  { path: '/changelog', component: 'Changelog', title: 'Changelog - Coherent.js' },
];

// ---------------------------------------------------------------------------
// Express app setup
// ---------------------------------------------------------------------------
const app = express();

// Coherent.js Express integration — auto-renders component objects via res.send()
setupCoherent(app, { useEngine: false });

// JSON body parsing for playground
app.use(express.json({ limit: '12kb' }));

// Static files — replaces custom staticFileMiddleware
app.use('/examples', express.static(join(__dirname, '../examples'), { maxAge: '1h' }));
app.use('/dist', express.static(join(__dirname, 'dist'), { maxAge: '1h' }));
app.use(express.static(join(__dirname, 'public'), { maxAge: '1h' }));

// ---------------------------------------------------------------------------
// Page routes — declarative, registry-driven, with error boundaries
// ---------------------------------------------------------------------------

// Register all static page routes from the route table
for (const route of pageRoutes) {
  app.get(route.path, (req, res) => {
    const html = renderFullPage({
      currentPath: route.path,
      componentName: route.component,
      props: route.props,
      title: route.title,
      scripts: route.scripts,
    });
    res.type('html').send(html);
  });
}

// Examples needs dynamic data, so it's registered separately
app.get('/examples', (req, res) => {
  const html = renderFullPage({
    currentPath: '/examples',
    componentName: 'Examples',
    props: { items: getExamplesList() },
    title: 'Examples - Coherent.js',
  });
  res.type('html').send(html);
});

// ---------------------------------------------------------------------------
// API routes — powered by @coherent.js/api Router
// ---------------------------------------------------------------------------
const apiRouter = createRouter({
  '/api': {
    examples: {
      GET: {
        handler: (req, res) => {
          const examples = getExamplesList();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(examples));
        }
      },
      ':filename': {
        GET: {
          handler: (req, res) => {
            const { filename } = req.params;
            const filePath = join(__dirname, '../examples', filename);

            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid filename' }));
              return;
            }

            try {
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
  },
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

              if (code.length > 10240) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 1, stderr: 'Code exceeds maximum size (10KB)' }));
                resolve();
                return;
              }

              // Rate limiting
              const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
              const now = Date.now();
              if (!global._playgroundRateLimit) global._playgroundRateLimit = new Map();
              const rateMap = global._playgroundRateLimit;
              const entry = rateMap.get(clientIp) || { count: 0, resetAt: now + 60000 };
              if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
              entry.count++;
              rateMap.set(clientIp, entry);
              if (entry.count > 10) {
                res.writeHead(429, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 1, stderr: 'Rate limit exceeded. Try again in a minute.' }));
                resolve();
                return;
              }

              // Security: block dangerous imports and globals
              const blockedModules = ['fs', 'child_process', 'net', 'http', 'https', 'os', 'path', 'cluster', 'worker_threads', 'dgram', 'tls', 'dns', 'readline', 'vm', 'crypto'];
              const blockedGlobals = ['process.exit', 'process.kill', 'process.env', 'process.chdir'];
              const importPattern = /import\s*\(?[^)]*['"](?!@coherent\.js\/)([^'"]+)['"]/g;
              const dynamicImportPattern = /import\s*\(\s*['"](?!@coherent\.js\/)([^'"]+)['"]\s*\)/g;
              const requirePattern = /require\s*\(\s*['"](?!@coherent\.js\/)([^'"]+)['"]\s*\)/g;

              const allImports = [...code.matchAll(importPattern), ...code.matchAll(dynamicImportPattern), ...code.matchAll(requirePattern)];
              for (const match of allImports) {
                const mod = match[1].split('/')[0];
                if (blockedModules.includes(mod)) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ code: 1, stderr: `Import of '${mod}' is not allowed in the playground.` }));
                  resolve();
                  return;
                }
              }

              for (const blocked of blockedGlobals) {
                if (code.includes(blocked)) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ code: 1, stderr: `Use of '${blocked}' is not allowed in the playground.` }));
                  resolve();
                  return;
                }
              }

              const wrappedCode = `(async () => {\n${code}\n})().catch(console.error);`;

              import('child_process').then(({ spawn }) => {
                const child = spawn('node', ['--input-type=module'], {
                  timeout: 5000,
                  env: { NODE_ENV: 'sandbox', PATH: process.env.PATH }
                });

                let stdout = '';
                let stderr = '';
                const MAX_OUTPUT = 102400;

                child.stdout.on('data', (data) => { stdout += data.toString(); if (stdout.length > MAX_OUTPUT) child.kill(); });
                child.stderr.on('data', (data) => { stderr += data.toString(); if (stderr.length > MAX_OUTPUT) child.kill(); });

                child.on('close', (exitCode) => {
                  if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(0, MAX_OUTPUT) + '\n... output truncated';
                  if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(0, MAX_OUTPUT) + '\n... output truncated';
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ code: exitCode || 0, stdout, stderr }));
                  resolve();
                });

                child.on('error', (error) => {
                  if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ code: 1, stdout: '', stderr: error.message }));
                    resolve();
                  }
                });

                child.stdin.write(wrappedCode);
                child.stdin.end();
              });

            } catch (error) {
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 1, stdout: '', stderr: error.message }));
              }
              resolve();
            }
          });
        }
      }
    }
  }
});

// Performance stats endpoint — powered by @coherent.js/core performanceMonitor
app.get('/api/perf', (req, res) => {
  res.json(performanceMonitor.getStats());
});

// Mount the Coherent.js API router as Express middleware
app.use(async (req, res, next) => {
  const handled = await apiRouter.handle(req, res);
  if (!handled) next();
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`Coherent.js website running at http://localhost:${port}`);
  console.log('  Stack: Express + @coherent.js/express + @coherent.js/api + @coherent.js/core SSR');
  console.log(`  Examples: http://localhost:${port}/examples`);
  console.log(`  Playground: http://localhost:${port}/playground`);
  console.log(`  Docs: http://localhost:${port}/docs`);
});
