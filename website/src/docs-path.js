/**
 * Path containment helpers for routes that map a URL segment onto a file.
 *
 * Kept out of index.js so they can be tested without booting the server —
 * index.js starts a syntax highlighter at import time.
 *
 * @module website/docs-path
 */

import { readdirSync, realpathSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

/**
 * True when `target` is `root` itself or sits inside it.
 *
 * The trailing separator matters: without it a sibling whose name merely
 * extends the root ('/srv/docs-private' against '/srv/docs') would pass.
 *
 * @param {string} root - Containing directory, already resolved
 * @param {string} target - Candidate path, already resolved
 * @returns {boolean} True when target is contained by root
 */
function isInside(root, target) {
  return target === root || target.startsWith(root + sep);
}

/**
 * Resolve `relativePath` against `rootDir`, or null if it escapes.
 *
 * Rejecting '..' textually is not enough here: Express percent-decodes the
 * request path before it reaches a handler, so '%2e%2e%2f' and '..%2f'
 * arrive as '../' too. Resolving first and then checking containment covers
 * every spelling at once.
 *
 * The trailing separator in the comparison matters — without it a sibling
 * directory whose name merely starts with the root ('/srv/docs-private'
 * against a root of '/srv/docs') would pass.
 *
 * @param {string} rootDir - Directory the result must stay inside
 * @param {string} relativePath - Untrusted path, relative to rootDir
 * @returns {string|null} Absolute contained path, or null if it escapes
 */
export function containedPath(rootDir, relativePath) {
  const root = resolve(rootDir);
  const abs = resolve(join(root, relativePath));
  if (!isInside(root, abs)) return null;

  // Textual containment is not enough on its own: a symlink sitting inside
  // the root can still point outside it, and resolve() does not follow links.
  // Re-check the real path of whatever actually exists. The root is resolved
  // too, since it may itself sit under a link (/tmp -> /private/tmp on macOS).
  // realpathSync throws when the path is absent, which is harmless — a path
  // that does not exist is never read, and the check above already stands.
  try {
    if (!isInside(realpathSync(root), realpathSync(abs))) return null;
  } catch {
    // Nothing there to follow.
  }

  return abs;
}

/**
 * @typedef {Object} DocEntry
 * @property {string} slug - Canonical slug ('guide', 'section/README', 'section')
 * @property {string} file - Absolute path to the markdown file
 * @property {string} dir - Directory of the file relative to docsDir ('' at the top)
 */

/**
 * Every page under `docsDir`, by slug: each `<path>.md` as `<path>`, and each
 * directory as its index.md (or else README.md) unless a `<dir>.md` exists.
 *
 * Built from a directory listing, so a request can only ever reach a file
 * that is really there: symbolic links (to files or directories) and
 * dotfiles are left out, and no part of the URL becomes part of a path.
 *
 * @param {string} docsDir - Absolute path to the docs directory
 * @returns {Map<string, DocEntry>}
 */
function listDocs(docsDir) {
  const docs = new Map();
  const directories = [];

  const walk = (absDir, relDir) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        directories.push(rel);
        walk(join(absDir, entry.name), rel);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const slug = rel.slice(0, -'.md'.length);
        docs.set(slug, { slug, file: join(absDir, entry.name), dir: relDir });
      }
    }
  };
  walk(resolve(docsDir), '');

  for (const dir of directories) {
    const index = docs.get(`${dir}/index`) ?? docs.get(`${dir}/README`);
    if (index && !docs.has(dir)) docs.set(dir, { ...index, slug: dir });
  }
  return docs;
}

/**
 * The doc page a `/docs/<slug>` request names, or null.
 *
 * The slug is only ever a lookup key: the returned entry's path and slug
 * come from the listing, so they are safe to read and to put in markup.
 * Traversals ('../SECRET', 'a/../b') name no page and return null.
 *
 * @param {string} docsDir - Absolute path to the docs directory
 * @param {string} slug - Slug taken from the request URL (one trailing
 *   slash is ignored)
 * @returns {DocEntry|null}
 */
export function findDoc(docsDir, slug) {
  if (typeof slug !== 'string') return null;
  const key = slug.endsWith('/') ? slug.slice(0, -1) : slug;
  return listDocs(docsDir).get(key) ?? null;
}

/**
 * Resolve a `/docs/<slug>` request to a markdown file inside `docsDir`:
 * the slug as a file, then as a directory holding index.md or README.md.
 *
 * @param {string} docsDir - Absolute path to the docs directory
 * @param {string} slug - Slug taken from the request URL
 * @returns {string|null} Absolute path to the markdown file, or null
 */
export function resolveDocFile(docsDir, slug) {
  return findDoc(docsDir, slug)?.file ?? null;
}

/**
 * Remove markup tags (`<...>`) from `html`, in one linear pass. A `<` with
 * no `>` after it is kept as text.
 *
 * /<[^>]*>/g rescans the rest of the input from every `<` when no `>`
 * follows, which is quadratic on input like '<<<<…'.
 *
 * @param {string} html
 * @returns {string}
 */
export function stripTags(html) {
  let out = '';
  let cursor = 0;
  while (cursor < html.length) {
    const open = html.indexOf('<', cursor);
    if (open === -1) break;
    const close = html.indexOf('>', open + 1);
    if (close === -1) break;
    out += html.slice(cursor, open);
    cursor = close + 1;
  }
  return out + html.slice(cursor);
}

/**
 * Escape text for interpolation into HTML markup.
 *
 * Covers both text and quoted-attribute positions, so one helper is enough
 * for the small amount of markup this server assembles by hand.
 *
 * @param {*} value - Value to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
