/**
 * JWT signatures and password hashes were compared with `===`/`!==`, which
 * returns as soon as a character differs and so leaks, through timing, how
 * much of a forged signature was right.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { timingSafeEqualSpy } = vi.hoisted(() => ({ timingSafeEqualSpy: { fn: null } }));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal();
  timingSafeEqualSpy.fn = vi.fn(actual.timingSafeEqual);
  return { ...actual, default: actual, timingSafeEqual: (...args) => timingSafeEqualSpy.fn(...args) };
});

const { generateJWT, verifyToken, hashPassword, verifyPassword } = await import('../src/security.js');

const SECRET = 'constant-time-secret';

/** Replace the last character of the signature. */
function tamper(token) {
  const last = token.at(-1) === 'A' ? 'B' : 'A';
  return token.slice(0, -1) + last;
}

describe('constant-time comparisons', () => {
  beforeEach(() => {
    timingSafeEqualSpy.fn.mockClear();
  });

  it('verifies JWT signatures with crypto.timingSafeEqual', () => {
    const token = generateJWT({ sub: 1 }, '1h', SECRET);

    expect(verifyToken(token, SECRET)).toMatchObject({ sub: 1 });
    expect(timingSafeEqualSpy.fn).toHaveBeenCalledTimes(1);

    expect(verifyToken(tamper(token), SECRET)).toBeNull();
    expect(timingSafeEqualSpy.fn).toHaveBeenCalledTimes(2);
  });

  it('rejects a signature of the wrong length without comparing', () => {
    const token = generateJWT({ sub: 1 }, '1h', SECRET);

    expect(verifyToken(`${token}xx`, SECRET)).toBeNull();
    expect(verifyToken(token.slice(0, -4), SECRET)).toBeNull();
    expect(timingSafeEqualSpy.fn).not.toHaveBeenCalled();
  });

  it('verifies passwords with crypto.timingSafeEqual', () => {
    const stored = hashPassword('hunter2');

    expect(verifyPassword('hunter2', stored)).toBe(true);
    expect(verifyPassword('hunter3', stored)).toBe(false);
    expect(timingSafeEqualSpy.fn).toHaveBeenCalledTimes(2);
  });

  it('still verifies hashes in the existing "<salt>:<hash>" format', async () => {
    // The format previous releases stored: PBKDF2-SHA512, 10,000 iterations.
    const { pbkdf2Sync } = await vi.importActual('crypto');
    const salt = '0123456789abcdef0123456789abcdef';
    const legacy = `${salt}:${pbkdf2Sync('legacy-pw', salt, 10000, 64, 'sha512').toString('hex')}`;

    expect(verifyPassword('legacy-pw', legacy)).toBe(true);
    expect(verifyPassword('other-pw', legacy)).toBe(false);
    expect(hashPassword('legacy-pw')).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(verifyPassword('legacy-pw', 'malformed')).toBe(false);
    expect(verifyPassword('legacy-pw', `${salt}:`)).toBe(false);
  });
});
