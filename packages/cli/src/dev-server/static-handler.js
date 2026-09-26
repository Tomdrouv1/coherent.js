/**
 * Static File Handler for the dev server.
 *
 * Tiny zero-dep request handler that:
 *   - Answers only requests addressed to localhost / an IP / the bound
 *     host (DNS-rebinding protection)
 *   - Maps `req.url` to a file under `root`, refusing path traversal,
 *     dotfiles, and symlinks that resolve outside the allow-list
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
import { extname, join } from 'node:path';
import { createFsAccess, hasDotSegment, isHostAllowed } from './access.js';

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
 * Split a request URL into decoded path segments. Returns null for a
 * malformed escape, a NUL byte, or a '.'/'..' segment.
 *
 * @param {string} url
 * @returns {string[]|null}
 */
function urlSegments(url) {
  let decoded;
  try {
    decoded = decodeURIComponent(url.split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const segments = decoded.split(/[/\\]+/).filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) return null;
  return segments;
}

// Files are served only from an allow-list, checked against the *real* path
// after symlinks are followed (see access.js): the project root, the
// workspace root that contains it, the real directory of each
// node_modules/<pkg> entry, and anything passed as `fsAllow`. Dot segments
// (.env, .git, .npmrc, ...) are refused, both in the URL and in the path a
// symlink resolves to.
//
// This replaces an earlier rule that followed every symlink, justified by
// "pnpm builds node_modules out of links". That is true, but pnpm's links
// point into node_modules/.pnpm, which is inside the project (or workspace)
// root, so they pass the allow-list. The failure that motivated following
// everything came from the e2e harness, which linked
// node_modules/@coherent.js/client straight into <repo>/packages/client —
// a layout a real install never produces, and which the node_modules/<pkg>
// rule above covers anyway. What following everything did expose is any
// symlink in the project that points elsewhere on disk.

/**
 * Create an HTTP request handler that serves files under `root`.
 *
 * @param {Object} options
 * @param {string} options.root - Absolute path to the project root.
 * @param {boolean} [options.hmr=true] - Serve the HMR bootstrap and inject it into HTML.
 * @param {string[]} [options.fsAllow] - Extra directories files may be served from.
 * @param {string} [options.host] - Host the server is bound to (accepted as a Host header).
 * @param {string[]|true} [options.allowedHosts] - Extra accepted Host names, or `true` to accept any.
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}
 */
export function createStaticHandler({ root, hmr = true, fsAllow = [], host, allowedHosts = [] }) {
  const fsAccess = createFsAccess({ root, fsAllow });
  const hostOptions = { host, allowedHosts };

  function deny(res, status, message) {
    res.statusCode = status;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(message);
  }

  return async function handle(req, res) {
    try {
      // DNS rebinding: a page on evil.example re-pointed at 127.0.0.1 sends
      // "Host: evil.example". Only answer requests addressed to this server.
      if (!isHostAllowed(req.headers.host, hostOptions)) {
        deny(res, 403, 'Blocked request: this host is not allowed. Add it to allowedHosts to serve it.');
        return;
      }

      const urlPath = req.url || '/';

      // Serve the inline HMR client bootstrap.
      if (hmr && (urlPath === HMR_CLIENT_PATH || urlPath.startsWith(`${HMR_CLIENT_PATH}?`))) {
        res.statusCode = 200;
        res.setHeader('content-type', MIME['.js']);
        res.setHeader('cache-control', 'no-cache');
        res.end(HMR_BOOTSTRAP);
        return;
      }

      const segments = urlSegments(urlPath);
      if (!segments) {
        deny(res, 400, 'Bad Request');
        return;
      }
      if (hasDotSegment(segments)) {
        deny(res, 403, 'Forbidden: dotfiles are not served');
        return;
      }

      // If the path is a directory (or '/'), try its index.html.
      let target = join(fsAccess.roots[0], ...segments);
      try {
        const s = await stat(target);
        if (s.isDirectory()) {
          target = join(target, 'index.html');
          await stat(target); // throws if missing
        }
      } catch {
        deny(res, 404, 'Not Found');
        return;
      }

      if (!(await fsAccess.isAllowed(segments, target))) {
        deny(res, 403, 'Forbidden: outside the files the dev server may serve (see fsAllow)');
        return;
      }

      const buf = await readFile(target);
      const ct = contentTypeFor(target);
      res.statusCode = 200;
      res.setHeader('content-type', ct);
      res.setHeader('cache-control', 'no-cache');

      if (ct.startsWith('text/html') && hmr) {
        res.end(injectHmrScript(buf.toString('utf8')));
      } else {
        res.end(buf);
      }
    } catch {
      // No error details: fs messages carry absolute paths.
      deny(res, 500, 'Internal Server Error');
    }
  };
}
