/**
 * Access rules for the dev server: which requests it answers and which
 * files it may read. Modeled on Vite's `server.allowedHosts` and
 * `server.fs.allow` / `server.fs.deny`.
 *
 * Why this exists: the dev server is reachable by every web page the
 * developer visits. Without a Host check, a DNS-rebinding page
 * (evil.example re-pointed at 127.0.0.1) reads anything the server serves;
 * without an Origin check, any page can open the HMR WebSocket; and
 * without a filesystem allow-list, a symlink inside the project exposes
 * whatever it points at.
 *
 * @module @coherent.js/cli/dev-server/access
 */

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { isIP } from 'node:net';
import { dirname, join, relative, resolve, sep, isAbsolute } from 'node:path';

/**
 * @typedef {Object} HostOptions
 * @property {string} [host] - The host the server was bound to; accepted as a Host header value.
 * @property {string[]|true} [allowedHosts] - Extra accepted host names (a leading `.` also accepts
 *   subdomains), or `true` to disable the check.
 */

/**
 * Extract the lower-cased host name (no port, no IPv6 brackets) from a
 * Host header or an Origin URL. Returns null when it cannot be parsed.
 *
 * @param {string} value
 * @param {boolean} [isUrl=false] - `value` is a full URL (Origin) rather than a Host header.
 * @returns {string|null}
 */
function hostnameOf(value, isUrl = false) {
  try {
    const url = new URL(isUrl ? value : `http://${value}`);
    if (!isUrl && (url.pathname !== '/' || url.username || url.password)) return null;
    return url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  } catch {
    return null;
  }
}

function isHostnameAllowed(hostname, { host, allowedHosts = [] } = {}) {
  if (!hostname) return false;
  // DNS rebinding needs a DNS name: an IP literal can't be re-pointed.
  if (isIP(hostname)) return true;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (host && hostname === String(host).replace(/^\[|\]$/g, '').toLowerCase()) return true;
  return allowedHosts.some((entry) => {
    const allowed = String(entry).toLowerCase();
    return allowed.startsWith('.')
      ? hostname === allowed.slice(1) || hostname.endsWith(allowed)
      : hostname === allowed;
  });
}

/**
 * True when a request's Host header names this dev server: localhost,
 * `*.localhost`, an IP address, the bound host, or an `allowedHosts` entry.
 *
 * @param {string|undefined} hostHeader
 * @param {HostOptions} [options]
 * @returns {boolean}
 */
export function isHostAllowed(hostHeader, options = {}) {
  if (options.allowedHosts === true) return true;
  if (!hostHeader) return false;
  return isHostnameAllowed(hostnameOf(hostHeader), options);
}

/**
 * True when a WebSocket upgrade's Origin may connect. Browsers always send
 * Origin on WebSocket handshakes, so a missing Origin is a non-browser
 * client (a CLI tool or a test) and is accepted; a page on any other site
 * is refused.
 *
 * @param {string|undefined} origin
 * @param {HostOptions} [options]
 * @returns {boolean}
 */
export function isOriginAllowed(origin, options = {}) {
  if (options.allowedHosts === true) return true;
  if (origin === undefined) return true;
  const hostname = hostnameOf(origin, true);
  // 'null' origins (sandboxed iframes, file://) have no hostname
  return isHostnameAllowed(hostname, options);
}

/**
 * Find the monorepo/workspace root containing `start` (a directory with
 * pnpm-workspace.yaml, lerna.json, or a package.json declaring
 * `workspaces`), or null if there is none.
 *
 * @param {string} start - Absolute directory to start from.
 * @returns {string|null}
 */
export function findWorkspaceRoot(start) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, 'lerna.json'))) {
      return dir;
    }
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        if (JSON.parse(readFileSync(pkgPath, 'utf8')).workspaces) return dir;
      } catch {
        // unreadable package.json: keep looking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function isInside(dir, target) {
  const rel = relative(dir, target);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

/**
 * Dot segments ('.env', '.git', '.npmrc', …) are never served. Inside a
 * node_modules tree they are the package manager's own layout
 * (pnpm's node_modules/.pnpm) and are allowed.
 *
 * @param {string[]} segments
 * @returns {boolean}
 */
export function hasDotSegment(segments) {
  for (const segment of segments) {
    if (segment === 'node_modules') return false;
    if (segment.startsWith('.')) return true;
  }
  return false;
}

function realpathOrNull(p) {
  try {
    return realpathSync(p);
  } catch {
    return null;
  }
}

/**
 * Build the filesystem allow-list for a dev server rooted at `root`.
 *
 * A file is served only when its real path (after following symlinks) is
 * inside one of:
 *   - the project root;
 *   - the workspace root containing it, if any (so pnpm workspace packages
 *     linked into node_modules still load);
 *   - the real directory of the `node_modules/<pkg>` entry the URL goes
 *     through (so `npm link` / `link:` dependencies still load);
 *   - any directory listed in `fsAllow`.
 *
 * @param {Object} options
 * @param {string} options.root - Project root.
 * @param {string[]} [options.fsAllow] - Extra directories (absolute or relative to root).
 * @returns {{ roots: string[], isAllowed: (urlSegments: string[], absPath: string) => Promise<boolean> }}
 */
export function createFsAccess({ root, fsAllow = [] }) {
  const projectRoot = realpathOrNull(root) ?? resolve(root);
  const roots = [projectRoot];
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  if (workspaceRoot) roots.push(realpathOrNull(workspaceRoot) ?? workspaceRoot);
  for (const dir of fsAllow) {
    const abs = resolve(projectRoot, dir);
    roots.push(realpathOrNull(abs) ?? abs);
  }

  /** Real directory of the node_modules/<pkg> (or @scope/<pkg>) entry a URL goes through. */
  function packageRootFor(urlSegments) {
    if (urlSegments[0] !== 'node_modules' || urlSegments.length < 2) return null;
    const nameLength = urlSegments[1].startsWith('@') ? 2 : 1;
    if (urlSegments.length < 1 + nameLength) return null;
    return realpathOrNull(join(projectRoot, ...urlSegments.slice(0, 1 + nameLength)));
  }

  return {
    roots,
    async isAllowed(urlSegments, absPath) {
      let real;
      try {
        real = await realpath(absPath);
      } catch {
        return false;
      }
      const candidates = [...roots];
      const packageRoot = packageRootFor(urlSegments);
      if (packageRoot) candidates.push(packageRoot);

      return candidates.some((dir) => {
        if (!isInside(dir, real)) return false;
        // A symlink must not reach a dotfile the URL itself could not name.
        return !hasDotSegment(relative(dir, real).split(sep));
      });
    },
  };
}
