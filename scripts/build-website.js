#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { renderToString } from '../src/coherent.js';
import { Layout } from '../website/src/layout/Layout.js';
import { Home } from '../website/src/pages/Home.js';
import { Examples } from '../website/src/pages/Examples.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DOCS_DIR = path.join(repoRoot, 'docs');
const WEBSITE_DIR = path.join(repoRoot, 'website');
const PUBLIC_DIR = path.join(WEBSITE_DIR, 'public');
const DIST_DIR = path.join(WEBSITE_DIR, 'dist');
const EXAMPLES_DIR = path.join(repoRoot, 'examples');
const BENCH_DIR = path.join(repoRoot, 'benchmarks');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function buildPerformance(sidebar) {
  let md = '';
  try {
    md = await fs.readFile(path.join(BENCH_DIR, 'REPORT.md'), 'utf8');
  } catch {
    try {
      md = await fs.readFile(path.join(BENCH_DIR, 'README.md'), 'utf8');
    } catch {}
  }
  const htmlBody = md ? marked.parse(md) : '<h1>Performance</h1><p>No benchmark report found.</p>';
  const page = Layout({ title: 'Performance | Coherent.js', sidebar, currentPath: '/performance' });
  const html = renderToString(page).replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', htmlBody);
  await writePage('performance', html);
}

function slugifySegment(name) {
  return name
    .replace(/\.md$/i, '')
    .replace(/[^a-zA-Z0-9\-_/]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

function groupFor(relPath) {
  // Very simple grouping based on top-level folder/file
  const p = relPath.split(path.sep);
  const top = p[0];
  switch (top) {
    case 'getting-started': return 'Getting Started';
    case 'components':
    case 'server-side':
    case 'client-side':
    case 'function-on-element-events.md':
      return 'Core Concepts';
    case 'api-usage.md':
    case 'api-reference.md':
    case 'object-based-routing.md':
    case 'routing':
    case 'framework-integrations.md':
    case 'security-guide.md':
      return 'API & Routing';
    case 'database':
    case 'database-integration.md':
    case 'query-builder.md':
      return 'Database';
    case 'migration-guide.md':
      return 'Migration';
    case 'performance':
    case 'performance-optimizations.md':
      return 'Performance';
    case 'advanced':
      return 'Advanced';
    case 'api-enhancement-plan.md':
      return 'Plans';
    default:
      return 'Other';
  }
}

async function walkDir(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = await walkDir(full, base);
      files.push(...sub);
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      const rel = path.relative(base, full);
      files.push({ full, rel });
    }
  }
  return files;
}

function buildSidebarFromDocs(docs) {
  const groups = new Map();
  for (const d of docs) {
    const group = groupFor(d.rel);
    if (!groups.has(group)) groups.set(group, []);
    const href = '/docs/' + slugifySegment(d.rel.replace(/\\\\/g, '/'))
      .split('/')
      .map(slugifySegment)
      .join('/');
    const label = slugifySegment(path.basename(d.rel)).replace(/-/g, ' ');
    groups.get(group).push({ href, label });
  }
  // Sort groups and items
  return Array.from(groups.entries()).map(([title, items]) => ({
    title,
    items: items.sort((a,b)=>a.label.localeCompare(b.label))
  })).sort((a,b)=>a.title.localeCompare(b.title));
}

async function writePage(routePath, html) {
  const outDir = path.join(DIST_DIR, routePath);
  await ensureDir(outDir);
  await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
  // Ensure stylesheet exists per-folder for relative ./styles.css links
  try {
    await fs.copyFile(path.join(DIST_DIR, 'styles.css'), path.join(outDir, 'styles.css'));
  } catch {}
}

async function copyPublic() {
  try {
    await ensureDir(DIST_DIR);
    const files = await fs.readdir(PUBLIC_DIR, { withFileTypes: true });
    for (const f of files) {
      const src = path.join(PUBLIC_DIR, f.name);
      const dst = path.join(DIST_DIR, f.name);
      if (f.isDirectory()) continue; // no nested assets yet
      await fs.copyFile(src, dst);
    }
  } catch (e) {
    // no public dir or other issue
  }
}

async function buildHome(sidebar) {
  const content = renderToString(Home());
  const page = Layout({ title: 'Coherent.js', sidebar, currentPath: '/' });
  let html = renderToString(page);
  html = html.replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', content);
  await writePage('', html);
}

async function buildExamples(sidebar) {
  let items = [];
  try {
    const entries = await fs.readdir(EXAMPLES_DIR, { withFileTypes: true });
    items = entries
      .filter(e => e.isFile() && e.name.endsWith('.js'))
      .map(e => {
        const file = e.name;
        const base = file.replace(/\.js$/i, '');
        const label = base.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return { file, label, runCmd: `node examples/${file}` };
      })
      .sort((a,b)=>a.label.localeCompare(b.label));
  } catch {}
  const content = renderToString(Examples({ items }));
  const page = Layout({ title: 'Examples | Coherent.js', sidebar, currentPath: '/examples' });
  let html = renderToString(page);
  html = html.replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', content);
  await writePage('examples', html);
}

async function buildDocs(docs) {
  const sidebar = buildSidebarFromDocs(docs);
  for (const d of docs) {
    const md = await fs.readFile(d.full, 'utf8');
    const htmlBody = marked.parse(md);
    const title = (md.match(/^#\s+(.+)$/m) || [null, 'Documentation'])[1];
    const page = Layout({ title: `${title} | Coherent.js Docs`, sidebar, currentPath: '/docs' });
    let finalHtml = renderToString(page).replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', htmlBody);
    const route = slugifySegment(d.rel.replace(/\\\\/g, '/')).split('/').map(slugifySegment).join('/');
    await writePage(path.join('docs', route), finalHtml);
  }
}

async function buildChangelog(sidebar) {
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  try {
    const md = await fs.readFile(changelogPath, 'utf8');
    const htmlBody = marked.parse(md);
    const page = Layout({ title: 'Changelog | Coherent.js', sidebar, currentPath: '/changelog' });
    const html = renderToString(page).replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', htmlBody);
    await writePage('changelog', html);
  } catch {}
}

async function main() {
  // clean dist
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await ensureDir(DIST_DIR);

  const docs = await walkDir(DOCS_DIR);
  const sidebar = buildSidebarFromDocs(docs);

  await copyPublic();
  await buildHome(sidebar);
  await buildExamples(sidebar);
  await buildPerformance(sidebar);
  await buildDocs(docs);
  await buildChangelog(sidebar);

  console.log(`Built website to ${DIST_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
