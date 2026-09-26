/**
 * Coherent.js Forms - CSRF tokens (server only)
 *
 * Stateless, session-bound tokens signed with HMAC-SHA256. Uses `node:crypto`,
 * so import it on the server only; the package root stays browser-safe.
 *
 * @module @coherent.js/forms/csrf
 */

/** Name of the hidden field `buildForm({ csrfToken })` renders: `'_csrf'`. */
export const CSRF_FIELD_NAME: '_csrf';

/**
 * Create a token bound to `sessionId`, signed with `secret`.
 * Throws a `TypeError` when the secret or session id is missing.
 */
export function createCsrfToken(
  secret: string | Uint8Array,
  sessionId: string,
  options?: { /** Issue time in ms; defaults to `Date.now()` */ now?: number }
): string;

/**
 * Check a submitted token against the current session. Returns `false`
 * (never throws) for a missing, malformed, forged, expired or other-session
 * token; throws a `TypeError` only when `secret` is missing.
 */
export function verifyCsrfToken(
  token: unknown,
  secret: string | Uint8Array,
  sessionId: string,
  options?: {
    /** Reject tokens older than this many milliseconds */
    maxAge?: number;
    /** Current time in ms; defaults to `Date.now()` */
    now?: number;
  }
): boolean;

declare const _default: {
  CSRF_FIELD_NAME: typeof CSRF_FIELD_NAME;
  createCsrfToken: typeof createCsrfToken;
  verifyCsrfToken: typeof verifyCsrfToken;
};
export default _default;
