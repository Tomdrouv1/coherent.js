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

// Determine base href for GitHub Pages project site
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
const baseHref = repoName ? `/${repoName}/` : '/';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function linkForDoc(d){
  const href = 'docs/' + slugifySegment(d.rel.replace(/\\/g, '/')).split('/').map(slugifySegment).join('/');
  const label = slugifySegment(path.basename(d.rel)).replace(/-/g, ' ');
  return { href, label };
}

function buildPrevNext(prev, next){
  if(!prev && !next) return '';
  const left = prev ? `<a class="button" href="/${prev.href}">← ${escapeHtml(prev.label)}</a>` : '<span></span>';
  const right = next ? `<a class="button" href="/${next.href}">${escapeHtml(next.label)} →</a>` : '<span></span>';
  return `<nav class="prev-next"><div>${left}</div><div>${right}</div></nav>`;
}

function buildBreadcrumbs(rel){
  const parts = rel.replace(/\\/g,'/').split('/');
  const crumbs = [];
  let acc = 'docs';
  crumbs.push(`<a href="/docs">Docs</a>`);
  for (const p of parts.slice(0, -1)) {
    acc += '/' + slugifySegment(p);
    crumbs.push(`<span class="sep">/</span><a href="/${acc}">${escapeHtml(p.replace(/-/g,' '))}</a>`);
  }
  const last = parts[parts.length-1].replace(/\.md$/i,'');
  crumbs.push(`<span class="sep">/</span><span class="current">${escapeHtml(last.replace(/-/g,' '))}</span>`);
  return crumbs.join(' ');
}

function enhanceHeadings(html){
  // ensure h2/h3 have ids and collect them
  const headings = [];
  const newHtml = html.replace(/<(h[23])(\s+[^>]*)?>(.*?)<\/h[23]>/gi, (m, tag, attrs = '', inner) => {
    let text = inner.replace(/<[^>]+>/g,'').trim();
    const id = (attrs && attrs.match(/id="([^"]+)"/i)) ? RegExp.$1 : slugifySegment(text);
    if(!/id=/i.test(attrs)) attrs = (attrs || '') + ` id="${id}"`;
    headings.push({ level: tag.toLowerCase(), id, text });
    return `<${tag}${attrs}>${inner}</${tag}>`;
  });
  return { html: newHtml, headings };
}

function buildToc(headings){
  if(!headings || !headings.length) return '<div class="toc-empty">No sections</div>';
  const items = headings.map(h => `<li class="${h.level}"><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('');
  return `<div class="toc-box"><div class="toc-title">On this page</div><ul class="toc-list">${items}</ul></div>`;
}

function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
  const page = Layout({ title: 'Performance | Coherent.js', sidebar, currentPath: 'performance', baseHref });
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
    const href = 'docs/' + slugifySegment(d.rel.replace(/\\\\/g, '/'))
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
  const page = Layout({ title: 'Coherent.js', sidebar, currentPath: '', baseHref });
  let html = renderToString(page);
  html = html.replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', content);
  await writePage('', html);
}

async function buildExamples(sidebar) {
  let items = [];
  try {
    const entries = await fs.readdir(EXAMPLES_DIR, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile() && e.name.endsWith('.js'))
      .map(e => e.name)
      .sort((a,b)=>a.localeCompare(b));

    items = [];
    for (const file of files) {
      const full = path.join(EXAMPLES_DIR, file);
      let code = '';
      try { code = await fs.readFile(full, 'utf8'); } catch {}
      // Extract first line comment or use default
      let description = '';
      const firstLine = (code.split(/\r?\n/, 1)[0] || '').trim();
      if (firstLine.startsWith('//')) description = firstLine.replace(/^\/\/+\s*/, '');
      const base = file.replace(/\.js$/i, '');
      const label = base.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      items.push({ file, label, runCmd: `node examples/${file}`, description, code });
    }
  } catch {}
  const content = renderToString(Examples({ items }));
  const page = Layout({ title: 'Examples | Coherent.js', sidebar, currentPath: 'examples', baseHref });
  let html = renderToString(page);
  html = html.replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', content);
  await writePage('examples', html);
}

async function buildDocs(docs) {
  const sidebar = buildSidebarFromDocs(docs);
  await buildDocsIndex(sidebar);
  // Establish doc order by relative path
  const ordered = [...docs].sort((a,b)=>a.rel.localeCompare(b.rel));
  for (let i = 0; i < ordered.length; i++) {
    const d = ordered[i];
    const md = await fs.readFile(d.full, 'utf8');
    let htmlBody = marked.parse(md);
    // Ensure headings have ids and build ToC
    const enhanced = enhanceHeadings(htmlBody);
    htmlBody = `<div class="markdown-body">${enhanced.html}</div>`;
    const tocHtml = buildToc(enhanced.headings);
    // Title, breadcrumbs, prev/next
    const title = (md.match(/^#\s+(.+)$/m) || [null, 'Documentation'])[1];
    const breadcrumbs = buildBreadcrumbs(d.rel);
    const prev = ordered[i-1] ? linkForDoc(ordered[i-1]) : null;
    const next = ordered[i+1] ? linkForDoc(ordered[i+1]) : null;
    const navFooter = buildPrevNext(prev, next);

    const page = Layout({ title: `${title} | Coherent.js Docs`, sidebar, currentPath: 'docs', baseHref });
    let finalHtml = renderToString(page)
      .replace('[[[COHERENT_BREADCRUMBS_PLACEHOLDER]]]', breadcrumbs)
      .replace('[[[COHERENT_TOC_PLACEHOLDER]]]', tocHtml)
      .replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', htmlBody + navFooter);

    const route = slugifySegment(d.rel.replace(/\\/g, '/')).split('/').map(slugifySegment).join('/');
    await writePage(path.join('docs', route), finalHtml);
  }
}

async function buildDocsIndex(sidebar) {
  let htmlBody = '';
  try {
    // Try to load the docs README.md for the index page
    const docsReadmePath = path.join(DOCS_DIR, 'README.md');
    const md = await fs.readFile(docsReadmePath, 'utf8');
    htmlBody = marked.parse(md);
    
    // Enhance headings and build ToC for docs index
    const enhanced = enhanceHeadings(htmlBody);
    htmlBody = `<div class="markdown-body">${enhanced.html}</div>`;
    const tocHtml = buildToc(enhanced.headings);
    
    const page = Layout({ title: 'Documentation | Coherent.js', sidebar, currentPath: 'docs', baseHref });
    const html = renderToString(page)
      .replace('[[[COHERENT_TOC_PLACEHOLDER]]]', tocHtml)
      .replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', htmlBody)
      .replace('[[[COHERENT_BREADCRUMBS_PLACEHOLDER]]]', '<nav class="breadcrumbs"><a href="/docs">Documentation</a></nav>');
    await writePage('docs', html);
  } catch (error) {
    // Fallback if README.md doesn't exist
    let firstHref = '';
    for (const group of sidebar) {
      if (group.items && group.items.length) { firstHref = group.items[0].href; break; }
    }
    if (firstHref) {
      htmlBody = `<h1>Documentation</h1><p>Start here: <a href="${firstHref}">Open first guide</a></p>`;
    } else {
      htmlBody = '<h1>Documentation</h1><p>No docs found.</p>';
    }
    const page = Layout({ title: 'Docs | Coherent.js', sidebar, currentPath: 'docs', baseHref });
    const html = renderToString(page).replace('[[[COHERENT_CONTENT_PLACEHOLDER]]]', htmlBody);
    await writePage('docs', html);
  }
}

async function buildChangelog(sidebar) {
  const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  try {
    const md = await fs.readFile(changelogPath, 'utf8');
    const htmlBody = marked.parse(md);
    const page = Layout({ title: 'Changelog | Coherent.js', sidebar, currentPath: 'changelog', baseHref });
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
