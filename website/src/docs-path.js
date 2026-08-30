/**
 * Path containment helpers for routes that map a URL segment onto a file.
 *
 * Kept out of index.js so they can be tested without booting the server —
 * index.js starts a syntax highlighter at import time.
 *
 * @module website/docs-path
 */

import { existsSync, realpathSync } from 'node:fs';
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
 * Resolve a `/docs/<slug>` request to a markdown file inside `docsDir`.
 *
 * Tries the slug as a file, then as a directory holding index.md or
 * README.md, and only returns a candidate that stays inside `docsDir`.
 *
 * @param {string} docsDir - Absolute path to the docs directory
 * @param {string} slug - Slug taken from the request URL
 * @returns {string|null} Absolute path to the markdown file, or null if no
 *   candidate exists or the slug escaped `docsDir`
 */
export function resolveDocFile(docsDir, slug) {
  const candidates = [`${slug}.md`, join(slug, 'index.md'), join(slug, 'README.md')];

  for (const candidate of candidates) {
    const abs = containedPath(docsDir, candidate);
    if (abs && existsSync(abs)) return abs;
  }
  return null;
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
