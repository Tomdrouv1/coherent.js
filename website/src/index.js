import express from 'express';
import { createRouter } from '../../packages/api/src/router.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { renderWithTemplate } from '../../packages/core/src/utils/render-utils.js';
import { render } from '../../packages/core/src/rendering/html-renderer.js';
import { marked } from 'marked';
import { createHighlighter } from 'shiki';
import { performanceMonitor } from '../../packages/core/src/performance/monitor.js';

// Initialize Shiki for syntax highlighting
const highlighter = await createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['javascript', 'typescript', 'html', 'css', 'json', 'bash', 'shell'],
});

// Configure marked to use Shiki
marked.use({
  renderer: {
    code({ text, lang }) {
      try {
        return highlighter.codeToHtml(text, {
          lang: lang || 'text',
          themes: { dark: 'github-dark', light: 'github-light' },
          cssVariablePrefix: '--shiki-',
          defaultColor: 'dark',
        });
      } catch {
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre class="shiki"><code>${escaped}</code></pre>`;
      }
    }
  }
});

export function highlightCode(code, lang = 'javascript') {
  try {
    return highlighter.codeToHtml(code, {
      lang,
      themes: { dark: 'github-dark', light: 'github-light' },
      cssVariablePrefix: '--shiki-',
      defaultColor: 'dark',
    });
  } catch {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre class="shiki"><code>${escaped}</code></pre>`;
  }
}
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
  { path: '/', component: 'Home', title: 'Coherent.js - Modern Object-Based UI Framework', props: { highlightCode }, scripts: ['/coherent-hydrate.js', '/counter-demo.js'] },
  { path: '/playground', component: 'Playground', title: 'Playground - Coherent.js', scripts: ['/codemirror-editor.js', '/playground.js'] },
  { path: '/performance', component: 'Performance', title: 'Performance - Coherent.js', scripts: ['/performance.js'] },
  { path: '/coverage', component: 'Coverage', title: 'Coverage - Coherent.js' },
  { path: '/starter-app', component: 'StarterApp', title: 'Starter App - Coherent.js', props: { highlightCode } },
  { path: '/changelog', component: 'Changelog', title: 'Changelog - Coherent.js' },
];

export { getExamplesList, Layout };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Logical section order for the docs sidebar
const SECTION_ORDER = [
  'getting-started',
  'components',
  'client',
  'server',
  'api',
  'database',
  'deployment',
  'packages',
  'advanced',
  'examples',
  'migration',
];

function getDocsSidebar() {
  const docsDir = join(repoRoot, 'docs');
  const groups = {};

  function scan(dir, base = '') {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const rel = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          scan(join(dir, entry.name), rel);
        } else if (entry.name.endsWith('.md')) {
          const section = rel.includes('/') ? rel.split('/')[0] : null;
          if (!section) continue; // Skip root-level markdown files (README, etc.)
          if (!groups[section]) groups[section] = [];
          const slug = rel.replace(/\.md$/i, '').split('/').map(slugify).join('/');
          const label = entry.name.replace(/\.md$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          groups[section].push({ href: `docs/${slug}`, label });
        }
      }
    } catch {}
  }

  scan(docsDir);

  // Sort sections by defined order, unknown sections go at the end
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a);
    const ib = SECTION_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return 1;
    return ia - ib;
  });

  return sortedKeys.map(key => ({
    title: key.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    items: groups[key]
  }));
}

export { getDocsSidebar };

const CATEGORY_ORDER = ['Getting Started', 'Components', 'Features', 'Client-Side', 'Integrations', 'Full Apps'];

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
    let category = 'Other';

    try {
      code = readFileSync(filePath, 'utf-8');

      // Parse @name, @category, @description from JSDoc
      const nameMatch = code.match(/@name\s+(.+)/);
      const catMatch = code.match(/@category\s+(.+)/);
      const descMatch = code.match(/@description\s+(.+)/);

      label = nameMatch ? nameMatch[1].trim() : file.replace('.js', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      category = catMatch ? catMatch[1].trim() : 'Other';
      description = descMatch ? descMatch[1].trim() : 'Explore this Coherent.js example.';
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
      description = 'Explore this Coherent.js example.';
      label = file.replace('.js', '');
    }

    return {
      file,
      label,
      category,
      description,
      runCmd: `node examples/${file}`,
      code
    };
  }).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.category);
    const ib = CATEGORY_ORDER.indexOf(b.category);
    if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.label.localeCompare(b.label);
  });
}

// ---------------------------------------------------------------------------
// Express app (only starts when run directly, not when imported by build.js)
// ---------------------------------------------------------------------------

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = express();
  app.set('strict routing', true);

  app.use(express.json({ limit: '100kb' }));

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
      props: { items: getExamplesList(), highlightCode },
      title: 'Examples - Coherent.js',
    });
    res.type('html').send(html);
  });

  // Docs index — with sidebar
  app.get('/docs', (req, res) => {
    const sidebar = getDocsSidebar();
    const page = Layout({ title: 'Documentation | Coherent.js', sidebar, currentPath: 'docs', baseHref: '/', content: DocsIndexPage({}) });
    const html = '<!DOCTYPE html>\n' + render(page);
    res.type('html').send(html);
  });

  // Dynamic docs routes — reads markdown from docs/ and renders with Layout
  app.get('/docs/{*slug}', (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug.join('/') : req.params.slug;
    if (!slug) { res.redirect('/docs'); return; }
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

    // Extract headings from the rendered HTML (not raw markdown) for accurate matching
    const headings = [];
    const htmlHeadingRegex = /<(h[23])>([\s\S]*?)<\/\1>/gi;
    let hMatch;
    while ((hMatch = htmlHeadingRegex.exec(htmlBody)) !== null) {
      const level = hMatch[1].toLowerCase();
      const innerHtml = hMatch[2];
      // Strip HTML tags to get plain text for the TOC label
      const plainText = innerHtml.replace(/<[^>]+>/g, '').trim();
      const id = slugify(plainText);
      headings.push({ level, text: plainText, id, original: hMatch[0] });
    }

    const currentDocPath = `docs/${slug}`;
    const tocHtml = headings.length > 0
      ? `<div class="toc-box"><div class="toc-title">On this page</div><ul class="toc-list">${headings.map(h =>
          `<li class="${h.level}"><a href="${currentDocPath}#${h.id}" data-toc-target="${h.id}" onclick="event.preventDefault(); document.getElementById('${h.id}')?.scrollIntoView({behavior: 'smooth', block: 'start'});">${h.text}</a></li>`
        ).join('')}</ul></div>`
      : '';

    // Inject IDs into the heading tags in the rendered HTML
    let contentHtml = htmlBody;
    for (const h of headings) {
      contentHtml = contentHtml.replace(
        h.original,
        `<${h.level} id="${h.id}">${h.original.slice(h.level.length + 2, -(h.level.length + 3))}</${h.level}>`
      );
    }

    // Render with Layout
    const sidebar = getDocsSidebar();
    const page = Layout({ title: `${title} | Coherent.js Docs`, sidebar, currentPath: `docs/${slug}`, baseHref: '/' });
    let html = '<!DOCTYPE html>\n' + render(page);
    html = html.replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', `<div class="markdown-body">${contentHtml}</div>`);
    html = html.replace('[[[COHERENT_BREADCRUMBS_PLACEHOLDER]]]', '');
    html = html.replace('[[[COHERENT_TOC_PLACEHOLDER]]]', tocHtml);

    res.type('html').send(html);
  });

  // Static files
  const isDev = process.env.NODE_ENV !== 'production';
  const staticOpts = isDev ? { etag: false, lastModified: false, maxAge: 0 } : { maxAge: '1h' };
  app.use(express.static(join(websiteRoot, 'public'), staticOpts));
  app.use('/examples-src', express.static(join(repoRoot, 'examples'), staticOpts));

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
                if (code.length > 102400) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 1, stderr: 'Code exceeds maximum size (100KB)' })); resolve(); return; }

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

  // Search index — built from actual docs and pages
  app.get('/api/search-index', (req, res) => {
    const index = [];

    // Add page routes
    for (const route of pageRoutes) {
      index.push({ title: route.title.replace(' - Coherent.js', ''), url: route.path, type: 'page' });
    }
    index.push({ title: 'Examples & Demos', url: '/examples', type: 'page' });

    // Add docs
    const docsDir = join(repoRoot, 'docs');
    function scanDocs(dir, base) {
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const rel = base ? `${base}/${entry.name}` : entry.name;
          if (entry.isDirectory()) { scanDocs(join(dir, entry.name), rel); }
          else if (entry.name.endsWith('.md')) {
            const content = readFileSync(join(dir, entry.name), 'utf-8');
            const title = (content.match(/^#\s+(.+)$/m) || [null, entry.name.replace('.md', '')])[1];
            const slug = rel.replace(/\.md$/i, '').split('/').map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('/');
            const snippet = content.replace(/^#.+$/gm, '').replace(/[#*`\[\]()]/g, '').trim().substring(0, 150);
            index.push({ title, url: `/docs/${slug}`, content: snippet, type: 'docs' });
          }
        }
      } catch {}
    }
    scanDocs(docsDir, '');

    res.json(index);
  });

  // Playground execution — direct Express route (API router hangs with Express)
  app.post('/__playground/run', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ code: 1, stderr: 'No code provided' });
    if (code.length > 102400) return res.status(400).json({ code: 1, stderr: 'Code exceeds maximum size (100KB)' });

    const blockedModules = ['fs', 'child_process', 'net', 'http', 'https', 'os', 'path', 'cluster', 'worker_threads', 'dgram', 'tls', 'dns', 'readline', 'vm', 'crypto'];
    const blockedGlobals = ['process.exit', 'process.kill', 'process.env', 'process.chdir'];
    const importPattern = /import\s*\(?[^)]*['"](?!@coherent\.js\/)([^'"]+)['"]/g;
    for (const match of [...code.matchAll(importPattern)]) {
      const mod = match[1].split('/')[0];
      if (blockedModules.includes(mod)) return res.status(400).json({ code: 1, stderr: `Import of '${mod}' is not allowed.` });
    }
    for (const blocked of blockedGlobals) {
      if (code.includes(blocked)) return res.status(400).json({ code: 1, stderr: `Use of '${blocked}' is not allowed.` });
    }

    const wrappedCode = `(async () => {\n${code}\n})().catch(console.error);`;
    import('child_process').then(({ spawn }) => {
      const child = spawn('node', ['--input-type=module'], { timeout: 5000, env: { NODE_ENV: 'sandbox', PATH: process.env.PATH } });
      let stdout = '', stderr = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('close', (exitCode) => { res.json({ code: exitCode || 0, stdout, stderr }); });
      child.on('error', (error) => { if (!res.headersSent) res.status(500).json({ code: 1, stdout: '', stderr: error.message }); });
      child.stdin.write(wrappedCode);
      child.stdin.end();
    });
  });

  app.use(async (req, res, next) => { const handled = await apiRouter.handle(req, res); if (!handled) next(); });

  app.listen(port, () => {
    console.log(`Coherent.js website running at http://localhost:${port}`);
    console.log('  Stack: Express + @coherent.js/express + @coherent.js/api + @coherent.js/core SSR');
  });
}
