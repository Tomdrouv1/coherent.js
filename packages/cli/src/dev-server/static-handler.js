/**
 * Static File Handler for the dev server.
 *
 * Tiny zero-dep request handler that:
 *   - Maps `req.url` to a file under `root` (with safe path-traversal
 *     rejection)
 *   - Sets a content-type by extension
 *   - For .html responses, injects a `<script>` tag pointing at the
 *     HMR client bootstrap right before `</body>`, idempotently
 *   - Serves the bootstrap itself at `/__coherent_hmr_client.js`
 *
 * Intentionally minimal — no SSR routing, no transformations, no
 * directory listing. Users wanting more reach for vite/webpack or
 * one of the integrations packages.
 *
 * @module @coherent.js/cli/dev-server/static-handler
 */

import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname, join } from 'node:path';

const HMR_CLIENT_PATH = '/__coherent_hmr_client.js';
const HMR_SCRIPT_TAG = `<script type="module" src="${HMR_CLIENT_PATH}"></script>`;

// Minimal MIME map — covers the things a Coherent dev project actually serves.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.cjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.map':  'application/json; charset=utf-8',
};

// Bootstrap shipped at /__coherent_hmr_client.js — imports hmrClient
// from the user's installed @coherent.js/client bundled entry. There
// is no standalone dist/hmr.js; the package re-exports hmrClient
// from src/index.js (see packages/client/src/index.js).
const HMR_BOOTSTRAP = `// Coherent.js HMR client bootstrap (served by coherent dev)
import { hmrClient } from '/node_modules/@coherent.js/client/dist/index.js';
hmrClient.initialize();
`;

function contentTypeFor(filePath) {
  return MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function injectHmrScript(html) {
  if (html.includes(HMR_CLIENT_PATH)) return html;
  const idx = html.lastIndexOf('</body>');
  if (idx === -1) {
    // No body tag — append at end. Browser will still execute.
    return `${html}\n${HMR_SCRIPT_TAG}\n`;
  }
  return `${html.slice(0, idx)}${HMR_SCRIPT_TAG}\n${html.slice(idx)}`;
}

/**
 * Resolve `urlPath` relative to `root` while rejecting path traversal.
 * Returns null if the resolved path escapes `root`.
 */
function safeResolve(root, urlPath) {
  // Strip query/hash; decode percent-escapes.
  const cleaned = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  // Strip leading slashes so `join` treats it as relative.
  const rel = cleaned.replace(/^\/+/, '');
  const abs = resolve(root, rel);
  const rootResolved = resolve(root);
  if (abs !== rootResolved && !abs.startsWith(rootResolved + sep)) {
    return null;
  }
  return abs;
}

/**
 * Create an HTTP request handler that serves files under `root`.
 *
 * @param {Object} options
 * @param {string} options.root - Absolute path to the project root.
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}
 */
export function createStaticHandler({ root }) {
  return async function handle(req, res) {
    try {
      const urlPath = req.url || '/';

      // Serve the inline HMR client bootstrap.
      if (urlPath === HMR_CLIENT_PATH || urlPath.startsWith(`${HMR_CLIENT_PATH}?`)) {
        res.statusCode = 200;
        res.setHeader('content-type', MIME['.js']);
        res.setHeader('cache-control', 'no-cache');
        res.end(HMR_BOOTSTRAP);
        return;
      }

      const resolved = safeResolve(root, urlPath);
      if (!resolved) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      // If the path is a directory (or '/'), try its index.html.
      let target = resolved;
      try {
        const s = await stat(target);
        if (s.isDirectory()) {
          target = join(target, 'index.html');
          await stat(target); // throws if missing
        }
      } catch {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      const buf = await readFile(target);
      const ct = contentTypeFor(target);
      res.statusCode = 200;
      res.setHeader('content-type', ct);
      res.setHeader('cache-control', 'no-cache');

      if (ct.startsWith('text/html')) {
        res.end(injectHmrScript(buf.toString('utf8')));
      } else {
        res.end(buf);
      }
    } catch (err) {
      res.statusCode = 500;
      res.end(`Internal Server Error: ${err.message}`);
    }
  };
}
