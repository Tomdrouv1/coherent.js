/**
 * Coherent.js Forms - CSRF tokens (server only)
 *
 * Stateless, session-bound CSRF tokens signed with HMAC-SHA256. Import from
 * `@coherent.js/forms/csrf` on the server; the package root stays free of
 * `node:crypto` so it keeps working in the browser.
 *
 * ```js
 * import { createCsrfToken, verifyCsrfToken } from '@coherent.js/forms/csrf';
 *
 * // GET: render the form with a token for this session
 * const csrfToken = createCsrfToken(process.env.CSRF_SECRET, req.session.id);
 * render(form.buildForm({ csrfToken }));   // adds <input type="hidden" name="_csrf">
 *
 * // POST: reject the request unless the token matches the session
 * if (!verifyCsrfToken(req.body._csrf, process.env.CSRF_SECRET, req.session.id, { maxAge: 3_600_000 })) {
 *   return res.status(403).end();
 * }
 * ```
 *
 * A token is `<issuedAt>.<nonce>.<mac>`, where the MAC covers the issue time,
 * the nonce and the session id, so a token minted for one session is rejected
 * for any other, and `maxAge` bounds how long it stays valid.
 *
 * @module forms/csrf
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

/** Default name of the hidden field the form builder renders. */
export const CSRF_FIELD_NAME = '_csrf';

const TOKEN_PATTERN = /^([0-9a-z]{1,13})\.([A-Za-z0-9_-]{16,64})\.([A-Za-z0-9_-]{43})$/;

const CLOCK_SKEW_MS = 60_000;

function assertSecret(secret) {
  const usable = (typeof secret === 'string' && secret.length > 0) ||
    (secret instanceof Uint8Array && secret.length > 0);
  if (!usable) {
    throw new TypeError('A CSRF secret (non-empty string or Buffer) is required');
  }
}

function assertSessionId(sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new TypeError('A CSRF token must be bound to a non-empty session id string');
  }
}

function sign(secret, issuedAt, nonce, sessionId) {
  return createHmac('sha256', secret)
    .update(`${issuedAt}.${nonce}.${sessionId}`)
    .digest('base64url');
}

/**
 * Create a CSRF token bound to `sessionId`.
 *
 * @param {string|Buffer} secret - Server-side signing secret
 * @param {string} sessionId - The session the token belongs to
 * @param {{ now?: number }} [options] - `now` (ms) overrides the issue time
 * @returns {string} The token
 */
export function createCsrfToken(secret, sessionId, options = {}) {
  assertSecret(secret);
  assertSessionId(sessionId);

  const issuedAt = Math.floor(options.now ?? Date.now()).toString(36);
  const nonce = randomBytes(16).toString('base64url');
  return `${issuedAt}.${nonce}.${sign(secret, issuedAt, nonce, sessionId)}`;
}

/**
 * Check a submitted CSRF token. Returns `false` (never throws) for a missing,
 * malformed, forged, expired or other-session token.
 *
 * @param {unknown} token - The submitted token (e.g. `req.body._csrf`)
 * @param {string|Buffer} secret - The secret the token was created with
 * @param {string} sessionId - The current request's session id
 * @param {{ maxAge?: number, now?: number }} [options] - `maxAge` in ms
 * @returns {boolean} Whether the token is valid for this session
 */
export function verifyCsrfToken(token, secret, sessionId, options = {}) {
  assertSecret(secret);
  if (typeof sessionId !== 'string' || sessionId.length === 0) return false;
  if (typeof token !== 'string') return false;

  const match = TOKEN_PATTERN.exec(token);
  if (!match) return false;
  const [, issuedAt, nonce, mac] = match;

  const expected = Buffer.from(sign(secret, issuedAt, nonce, sessionId));
  const actual = Buffer.from(mac);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return false;
  }

  if (options.maxAge !== undefined) {
    const age = (options.now ?? Date.now()) - parseInt(issuedAt, 36);
    // A minute of tolerance for clocks that differ between servers.
    if (!(age >= -CLOCK_SKEW_MS && age <= options.maxAge)) return false;
  }

  return true;
}

export default {
  CSRF_FIELD_NAME,
  createCsrfToken,
  verifyCsrfToken
};
