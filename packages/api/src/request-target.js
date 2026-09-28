/**
 * Request-target parsing for the router.
 *
 * @module @coherent.js/api/request-target
 */

import { parse as parseQueryString } from 'node:querystring';

/**
 * Split a request target (`req.url`) into its pathname and parsed query, as
 * `url.parse(target, true)` did, without that deprecated parser (DEP0169).
 *
 * Deliberately not `new URL()`: it resolves dot segments (`/a/../b` becomes
 * `/b`) and reads `//host/x` as a host, so a raw path could reach a route it
 * never named. What `url.parse` did is kept:
 *
 * - the path is neither normalized nor decoded (the router decodes params);
 * - backslashes before the query become slashes;
 * - an absolute-form target (`http://host/p`) contributes only its path, and
 *   an empty one reads as `/`;
 * - an empty path is `null`;
 * - the query comes from `querystring.parse`, so repeated keys give arrays
 *   and the object has no prototype.
 *
 * @param {string} target - The request target, as in `req.url`
 * @returns {{ pathname: string|null, query: Object }}
 */
export function parseRequestTarget(target) {
  const hash = target.indexOf('#');
  const beforeHash = hash === -1 ? target : target.slice(0, hash);
  const q = beforeHash.indexOf('?');
  let pathname = (q === -1 ? beforeHash : beforeHash.slice(0, q)).replace(
    /\\/g,
    '/'
  );
  const authority = /^[a-z][a-z0-9+.-]*:\/\/[^/]*/i.exec(pathname);
  if (authority) pathname = pathname.slice(authority[0].length) || '/';
  return {
    pathname: pathname || null,
    query: parseQueryString(q === -1 ? '' : beforeHash.slice(q + 1)),
  };
}
