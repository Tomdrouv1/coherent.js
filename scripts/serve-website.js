#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const DIST_DIR = path.join(repoRoot, 'website', 'dist');

const PORT = Number(process.env.PORT || 8081);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=UTF-8'
};

function safeJoin(base, target) {
  const sanitized = path.normalize(target).replace(/^\/+/, '');
  const p = path.join(base, sanitized);
  if (!p.startsWith(base)) return base; // prevent path traversal
  return p;
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '') urlPath = '/';

    let filePath = safeJoin(DIST_DIR, urlPath);
    let statIsDir = false;

    try {
      const s = await fs.stat(filePath);
      statIsDir = s.isDirectory();
    } catch {}

    if (statIsDir) {
      // Append trailing slash and serve index.html
      if (!urlPath.endsWith('/')) {
        res.statusCode = 301;
        res.setHeader('Location', urlPath + '/');
        res.end();
        return;
      }
      filePath = path.join(filePath, 'index.html');
    } else {
      // If path has no extension and no direct file, try directory index
      if (!path.extname(filePath)) {
        const asDir = filePath + '/';
        if (await exists(asDir)) {
          res.statusCode = 301;
          res.setHeader('Location', urlPath + '/');
          res.end();
          return;
        }
        const indexHtml = path.join(filePath, 'index.html');
        if (await exists(indexHtml)) filePath = indexHtml;
      }
    }

    if (!(await exists(filePath))) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const content = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    res.end(content);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
    res.end('Internal Server Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Serving website from ${DIST_DIR}`);
  console.log(`→ http://${HOST}:${PORT}/`);
});
