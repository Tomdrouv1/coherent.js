/**
 * Tests for shared validation patterns.
 */

import { describe, it, expect } from 'vitest';
import { EMAIL_PATTERN, EMAIL_MAX_LENGTH, isEmailShaped } from '../src/patterns.js';

/**
 * A subject the old `[^\s@]+\.[^\s@]+` domain pattern could split at every
 * dot. The trailing space cannot match, so the whole thing fails — after
 * O(n²) backtracking with the old pattern.
 */
const dottedNonMatch = (dots) => `a@${'a.'.repeat(dots)} `;

describe('EMAIL_PATTERN', () => {
  it.each([
    'a@b.c',
    'user@example.com',
    'first.last@example.com',
    'user+tag@example.co.uk',
    'x-y_z@sub.domain.org',
    "o'brien@example.com",
    'user@a.b.c.d',
    'UPPER@EXAMPLE.COM',
    'ünïcode@exämple.com',
  ])('accepts %j', (address) => {
    expect(EMAIL_PATTERN.test(address)).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['plain', 'no @'],
    ['a@b', 'no dot in domain'],
    ['@b.c', 'no local part'],
    ['a@.c', 'empty first label'],
    ['a@b.', 'trailing dot'],
    ['a@@b.c', 'doubled @'],
    ['a@b..c', 'consecutive dots'],
    ['a b@c.d', 'space in local part'],
    ['a@b c.d', 'space in domain'],
    [' a@b.c', 'leading space'],
    ['a@b.c ', 'trailing space'],
    ['a@b.c\n', 'trailing newline'],
  ])('rejects %j (%s)', (address) => {
    expect(EMAIL_PATTERN.test(address)).toBe(false);
  });

  // Subjects are built before timing starts — allocating a 400KB string is
  // itself slow enough to swamp the measurement otherwise.
  it.each([
    [50_000, 2853],
    [200_000, 45386],
  ])(
    'rejects a subject with %i dots well inside budget (ambiguous pattern: %ims)',
    (dots) => {
      const subject = dottedNonMatch(dots);

      const started = Date.now();
      const matched = EMAIL_PATTERN.test(subject);
      const elapsed = Date.now() - started;

      expect(matched).toBe(false);
      // Measured at ~1ms for both sizes. The bound is generous so a loaded
      // CI box does not flake it, while quadratic backtracking — which took
      // 2.8s and 45s on these two inputs — misses it by orders of magnitude.
      expect(elapsed).toBeLessThan(500);
    }
  );
});

describe('isEmailShaped', () => {
  it('accepts a well-formed address', () => {
    expect(isEmailShaped('user@example.com')).toBe(true);
  });

  it('rejects non-strings without throwing', () => {
    expect(isEmailShaped(undefined)).toBe(false);
    expect(isEmailShaped(null)).toBe(false);
    expect(isEmailShaped(42)).toBe(false);
    expect(isEmailShaped({})).toBe(false);
    expect(isEmailShaped(['a@b.c'])).toBe(false);
  });

  it(`rejects addresses longer than the RFC 5321 limit of ${EMAIL_MAX_LENGTH}`, () => {
    const atLimit = `${'a'.repeat(EMAIL_MAX_LENGTH - 'a@b.com'.length + 1)}@b.com`;
    expect(atLimit).toHaveLength(EMAIL_MAX_LENGTH);
    expect(isEmailShaped(atLimit)).toBe(true);

    expect(isEmailShaped(`a${atLimit}`)).toBe(false);
  });

  it('bounds work on a huge subject before matching', () => {
    const started = Date.now();

    expect(isEmailShaped(dottedNonMatch(200_000))).toBe(false);

    expect(Date.now() - started).toBeLessThan(1000);
  });
});
