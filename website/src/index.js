import express from 'express';
import { createRouter } from '../../packages/api/src/router.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { renderWithTemplate } from '../../packages/core/src/utils/render-utils.js';
import { render } from '../../packages/core/src/rendering/html-renderer.js';
import { marked } from 'marked';
import { performanceMonitor } from '../../packages/core/src/performance/monitor.js';
import { registerComponent, getComponent } from '../../packages/core/src/components/component-system.js';
import { createErrorBoundary } from '../../packages/core/src/components/error-boundary.js';
import { Examples } from './pages/Examples.js';
import { Home } from './pages/Home.js';
import { DocsPage, DocsIndexPage } from './pages/DocsPage.js';
import { Playground } from './pages/Playground.js';
import { Performance } from './pages/Performance.js';
import { Coverage } from './pages/Coverage.js';
import { StarterAppPage } from './pages/StarterApp.js';
import { Changelog } from './pages/Changelog.js';
import { Layout } from './layout/Layout.js';

// ---------------------------------------------------------------------------
// Component Registry
// ---------------------------------------------------------------------------
registerComponent('Home', Home);
registerComponent('Examples', Examples);
registerComponent('DocsPage', DocsPage);
registerComponent('DocsIndex', DocsIndexPage);
registerComponent('Playground', Playground);
registerComponent('Performance', Performance);
registerComponent('Coverage', Coverage);
registerComponent('StarterApp', StarterAppPage);
registerComponent('Changelog', Changelog);

// Error boundary
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
const websiteRoot = join(__dirname, '..');
const repoRoot = join(__dirname, '../..');

const port = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Shared rendering — exported for use by build.js
// ---------------------------------------------------------------------------

export function renderFullPage({ currentPath, componentName, props = {}, title = 'Coherent.js', scripts = [] }) {
  const Component = getComponent(componentName);
  const SafeComponent = withPageErrorBoundary(Component);
  const content = SafeComponent(props);
  const layoutPath = currentPath === '/' ? '' : currentPath.replace(/^\//, '');
  const page = Layout({ title, currentPath: layoutPath, content, scripts });
  return renderWithTemplate(page, { template: '<!DOCTYPE html>\n{{content}}' });
}

export const pageRoutes = [
  { path: '/', component: 'Home', title: 'Coherent.js - Modern Object-Based UI Framework', scripts: ['/coherent-hydrate.js', '/counter-demo.js'] },
  { path: '/docs', component: 'DocsIndex', title: 'Documentation - Coherent.js' },
  { path: '/playground', component: 'Playground', title: 'Playground - Coherent.js', scripts: ['/codemirror-editor.js', '/playground.js'] },
  { path: '/performance', component: 'Performance', title: 'Performance - Coherent.js', scripts: ['/performance.js'] },
  { path: '/coverage', component: 'Coverage', title: 'Coverage - Coherent.js' },
  { path: '/starter-app', component: 'StarterApp', title: 'Starter App - Coherent.js' },
  { path: '/changelog', component: 'Changelog', title: 'Changelog - Coherent.js' },
];

export { getExamplesList, Layout };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExamplesList() {
  const examplesDir = join(repoRoot, 'examples');

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
        label = 'Basic Usage';
        description = 'Basic component examples showing greetings, user cards, and complete page composition patterns with styling.';
      } else if (file === 'dev-preview.js') {
        label = 'Dev Preview';
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

// ---------------------------------------------------------------------------
// Express app (only starts when run directly, not when imported by build.js)
// ---------------------------------------------------------------------------

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = express();
  app.set('strict routing', true);

  app.use(express.json({ limit: '12kb' }));

  // Page routes — before static files
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

  app.get(['/examples', '/examples/'], (req, res) => {
    const html = renderFullPage({
      currentPath: '/examples',
      componentName: 'Examples',
      props: { items: getExamplesList() },
      title: 'Examples - Coherent.js',
    });
    res.type('html').send(html);
  });

  // Dynamic docs routes — reads markdown from docs/ and renders with Layout
  app.get('/docs/{*slug}', (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug.join('/') : req.params.slug;
    const docsDir = join(repoRoot, 'docs');

    // Try exact match, then with .md extension, then as index
    const candidates = [
      join(docsDir, `${slug}.md`),
      join(docsDir, slug, 'index.md'),
      join(docsDir, `${slug}/README.md`),
    ];

    const mdFile = candidates.find(f => existsSync(f));
    if (!mdFile) {
      res.status(404).type('html').send(renderFullPage({
        currentPath: '/docs',
        componentName: 'DocsPage',
        props: { title: 'Not Found', html: '<p>Documentation page not found.</p>' },
        title: 'Not Found - Coherent.js',
      }));
      return;
    }

    const md = readFileSync(mdFile, 'utf-8');
    const htmlBody = marked.parse(md);
    const title = (md.match(/^#\s+(.+)$/m) || [null, 'Documentation'])[1];

    // Render with Layout using placeholder approach (docs need breadcrumbs/TOC slots)
    const page = Layout({ title: `${title} | Coherent.js Docs`, currentPath: `docs/${slug}`, baseHref: '/' });
    let html = '<!DOCTYPE html>\n' + render(page);
    html = html.replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', `<div class="markdown-body">${htmlBody}</div>`);
    html = html.replace('[[[COHERENT_BREADCRUMBS_PLACEHOLDER]]]', '');
    html = html.replace('[[[COHERENT_TOC_PLACEHOLDER]]]', '');

    res.type('html').send(html);
  });

  // Static files
  app.use(express.static(join(websiteRoot, 'public'), { maxAge: '1h' }));
  app.use('/examples-src', express.static(join(repoRoot, 'examples'), { maxAge: '1h' }));

  // API routes
  const apiRouter = createRouter({
    '/api': {
      examples: {
        GET: {
          handler: (req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(getExamplesList()));
          }
        },
        ':filename': {
          GET: {
            handler: (req, res) => {
              const { filename } = req.params;
              if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid filename' }));
                return;
              }
              const filePath = join(repoRoot, 'examples', filename);
              try {
                if (!statSync(filePath).isFile()) {
                  res.writeHead(404, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Example file not found' }));
                  return;
                }
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(readFileSync(filePath, 'utf-8'));
              } catch (error) {
                const code = error.code === 'ENOENT' ? 404 : 500;
                res.writeHead(code, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.code === 'ENOENT' ? 'Example file not found' : error.message }));
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
                if (!code) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 1, stderr: 'No code provided' })); resolve(); return; }
                if (code.length > 10240) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 1, stderr: 'Code exceeds maximum size (10KB)' })); resolve(); return; }

                const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                const now = Date.now();
                if (!global._playgroundRateLimit) global._playgroundRateLimit = new Map();
                const rateMap = global._playgroundRateLimit;
                const entry = rateMap.get(clientIp) || { count: 0, resetAt: now + 60000 };
                if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
                entry.count++;
                rateMap.set(clientIp, entry);
                if (entry.count > 10) { res.writeHead(429, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 1, stderr: 'Rate limit exceeded. Try again in a minute.' })); resolve(); return; }

                const blockedModules = ['fs', 'child_process', 'net', 'http', 'https', 'os', 'path', 'cluster', 'worker_threads', 'dgram', 'tls', 'dns', 'readline', 'vm', 'crypto'];
                const blockedGlobals = ['process.exit', 'process.kill', 'process.env', 'process.chdir'];
                const importPattern = /import\s*\(?[^)]*['"](?!@coherent\.js\/)([^'"]+)['"]/g;
                const dynamicImportPattern = /import\s*\(\s*['"](?!@coherent\.js\/)([^'"]+)['"]\s*\)/g;
                const requirePattern = /require\s*\(\s*['"](?!@coherent\.js\/)([^'"]+)['"]\s*\)/g;

                for (const match of [...code.matchAll(importPattern), ...code.matchAll(dynamicImportPattern), ...code.matchAll(requirePattern)]) {
                  const mod = match[1].split('/')[0];
                  if (blockedModules.includes(mod)) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 1, stderr: `Import of '${mod}' is not allowed in the playground.` })); resolve(); return; }
                }
                for (const blocked of blockedGlobals) {
                  if (code.includes(blocked)) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 1, stderr: `Use of '${blocked}' is not allowed in the playground.` })); resolve(); return; }
                }

                const wrappedCode = `(async () => {\n${code}\n})().catch(console.error);`;
                import('child_process').then(({ spawn }) => {
                  const child = spawn('node', ['--input-type=module'], { timeout: 5000, env: { NODE_ENV: 'sandbox', PATH: process.env.PATH } });
                  let stdout = '', stderr = '';
                  const MAX_OUTPUT = 102400;
                  child.stdout.on('data', (d) => { stdout += d.toString(); if (stdout.length > MAX_OUTPUT) child.kill(); });
                  child.stderr.on('data', (d) => { stderr += d.toString(); if (stderr.length > MAX_OUTPUT) child.kill(); });
                  child.on('close', (exitCode) => {
                    if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(0, MAX_OUTPUT) + '\n... output truncated';
                    if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(0, MAX_OUTPUT) + '\n... output truncated';
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ code: exitCode || 0, stdout, stderr }));
                    resolve();
                  });
                  child.on('error', (error) => { if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 1, stdout: '', stderr: error.message })); resolve(); } });
                  child.stdin.write(wrappedCode);
                  child.stdin.end();
                });
              } catch (error) {
                if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 1, stdout: '', stderr: error.message })); }
                resolve();
              }
            });
          }
        }
      }
    }
  });

  app.get('/api/perf', (req, res) => { res.json(performanceMonitor.getStats()); });
  app.use(async (req, res, next) => { const handled = await apiRouter.handle(req, res); if (!handled) next(); });

  app.listen(port, () => {
    console.log(`Coherent.js website running at http://localhost:${port}`);
    console.log('  Stack: Express + @coherent.js/express + @coherent.js/api + @coherent.js/core SSR');
  });
}
