/**
 * Shared validation patterns.
 *
 * Internal to @coherent.js/forms — not re-exported from index.js.
 */

/**
 * Email shape check: a local part, then a dotted domain.
 *
 * Domain labels use `[^\s@.]` rather than `[^\s@]` so that the literal dot
 * separators are the only thing that can match a dot. Allowing `[^\s@]+` on
 * both sides of `\.` makes the split ambiguous, and a non-matching subject
 * with many dots ("a@" + "a." * n + " ") then costs O(n²) backtracking —
 * CodeQL js/polynomial-redos.
 *
 * This is a shape check, not RFC 5322 conformance. Deliverability is only
 * ever established by sending mail.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * Longest address RFC 5321 permits, used to bound work before matching.
 */
export const EMAIL_MAX_LENGTH = 254;

/**
 * Test whether a value has the shape of an email address.
 *
 * @param {unknown} value - Value to check
 * @returns {boolean} True if the value looks like an email address
 */
export function isEmailShaped(value) {
  return (
    typeof value === 'string' &&
    value.length <= EMAIL_MAX_LENGTH &&
    EMAIL_PATTERN.test(value)
  );
}
