#!/usr/bin/env node
/**
 * Static site generator for the Coherent.js website.
 * Imports the same renderFullPage() used by the dev server,
 * so dev and production always produce identical output.
 */
import fs from 'node:fs/promises';
import { existsSync, readdirSync, statSync, readFileSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { createHighlighter } from 'shiki';

// Reuse the same rendering pipeline as the dev server
import { renderFullPage, pageRoutes, getExamplesList, Layout } from './src/index.js';
import { render } from '../packages/core/src/rendering/html-renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const DIST_DIR = path.join(__dirname, 'dist');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DOCS_DIR = path.join(repoRoot, 'docs');

// ---------------------------------------------------------------------------
// Shiki syntax highlighting for markdown docs
// ---------------------------------------------------------------------------
const highlighter = await createHighlighter({
  themes: ['github-dark', 'github-light'],
  langs: ['javascript', 'typescript', 'html', 'css', 'json', 'bash', 'shell', 'yaml', 'markdown', 'jsx', 'tsx'],
});

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = lang || 'text';
      try {
        return highlighter.codeToHtml(text, {
          lang: language,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writePage(route, html) {
  const dir = path.join(DIST_DIR, route);
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, 'index.html'), html);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Build pages — uses renderFullPage from dev server
// ---------------------------------------------------------------------------

async function buildPages() {
  console.log('Building pages...');

  // Build all routes from the shared route table
  for (const route of pageRoutes) {
    const html = renderFullPage({
      currentPath: route.path,
      componentName: route.component,
      props: route.props,
      title: route.title,
      scripts: route.scripts,
    });
    const dir = route.path === '/' ? '' : route.path.replace(/^\//, '');
    await writePage(dir, html);
    console.log(`  ${route.path}`);
  }

  // Examples page (dynamic data)
  const examplesHtml = renderFullPage({
    currentPath: '/examples',
    componentName: 'Examples',
    props: { items: getExamplesList() },
    title: 'Examples - Coherent.js',
  });
  await writePage('examples', examplesHtml);
  console.log('  /examples');
}

// ---------------------------------------------------------------------------
// Build docs — markdown processing with Shiki highlighting
// ---------------------------------------------------------------------------

async function collectDocs(dir, base = '') {
  const docs = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        docs.push(...await collectDocs(path.join(dir, entry.name), rel));
      } else if (entry.name.endsWith('.md')) {
        docs.push({ rel, full: path.join(dir, entry.name) });
      }
    }
  } catch {}
  return docs;
}

function buildSidebar(docs) {
  const groups = {};
  for (const d of docs) {
    const parts = d.rel.replace(/\\/g, '/').split('/');
    const section = parts.length > 1 ? parts[0] : 'General';
    if (!groups[section]) groups[section] = [];
    const slug = d.rel.replace(/\.md$/i, '').replace(/\\/g, '/').split('/').map(slugify).join('/');
    const label = path.basename(d.rel, '.md').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    groups[section].push({ href: `docs/${slug}`, label });
  }
  return Object.entries(groups).map(([title, items]) => ({
    title: title.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    items
  }));
}

async function buildDocs() {
  console.log('Building docs...');
  const docs = await collectDocs(DOCS_DIR);
  if (!docs.length) { console.log('  No docs found'); return; }

  const sidebar = buildSidebar(docs);

  for (const d of docs) {
    const md = await fs.readFile(d.full, 'utf8');
    const htmlBody = marked.parse(md);
    const title = (md.match(/^#\s+(.+)$/m) || [null, 'Documentation'])[1];
    const slug = d.rel.replace(/\.md$/i, '').replace(/\\/g, '/').split('/').map(slugify).join('/');

    // Docs pages still use placeholder approach for breadcrumbs/TOC
    const page = Layout({ title: `${title} | Coherent.js Docs`, sidebar, currentPath: `docs/${slug}`, baseHref: '/' });
    let html = render(page);
    html = '<!DOCTYPE html>\n' + html;
    html = html.replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', `<div class="markdown-body">${htmlBody}</div>`);
    html = html.replace('[[[COHERENT_BREADCRUMBS_PLACEHOLDER]]]', '');
    html = html.replace('[[[COHERENT_TOC_PLACEHOLDER]]]', '');

    await writePage(path.join('docs', slug), html);
    console.log(`  /docs/${slug}`);
  }

  // Docs index
  const { DocsIndexPage } = await import('./src/pages/DocsPage.js');
  const indexPage = Layout({ title: 'Documentation | Coherent.js', sidebar, currentPath: 'docs', baseHref: '/', content: DocsIndexPage({}) });
  const indexHtml = '<!DOCTYPE html>\n' + render(indexPage);
  await writePage('docs', indexHtml);
  console.log('  /docs (index)');
}

// ---------------------------------------------------------------------------
// Copy static assets
// ---------------------------------------------------------------------------

async function copyPublic() {
  console.log('Copying public assets...');
  if (existsSync(PUBLIC_DIR)) {
    cpSync(PUBLIC_DIR, DIST_DIR, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Building Coherent.js website...\n');

  // Clean dist
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await ensureDir(DIST_DIR);

  // Copy public assets first (pages overwrite index.html)
  await copyPublic();

  // Build pages using the same renderFullPage as dev server
  await buildPages();

  // Build docs with Shiki highlighting
  await buildDocs();

  console.log(`\nBuilt website to ${DIST_DIR}`);
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
