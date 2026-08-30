/**
 * Tests for the website's fixed-window rate limiter.
 */

import { describe, it, expect, vi } from 'vitest';
import { rateLimit } from '../website/src/rate-limit.js';

function createReq(ip = '1.2.3.4') {
  return { ip, socket: { remoteAddress: ip } };
}

function createRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

/** Drive `count` requests through the middleware, returning how many passed. */
function drive(middleware, count, ip) {
  let allowed = 0;
  const responses = [];
  for (let i = 0; i < count; i += 1) {
    const res = createRes();
    middleware(createReq(ip), res, () => { allowed += 1; });
    responses.push(res);
  }
  return { allowed, responses };
}

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 3 });

    expect(drive(middleware, 3).allowed).toBe(3);
  });

  it('rejects the request that exceeds the limit', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 3 });

    const { allowed, responses } = drive(middleware, 5);

    expect(allowed).toBe(3);
    expect(responses[3].statusCode).toBe(429);
    expect(responses[4].statusCode).toBe(429);
  });

  it('sets Retry-After on a rejection', () => {
    const now = vi.fn(() => 1_000_000);
    const middleware = rateLimit({ windowMs: 60_000, max: 1, now });

    const { responses } = drive(middleware, 2);

    expect(responses[1].headers['Retry-After']).toBe('60');
    expect(responses[1].body).toEqual({ error: 'Too many requests' });
  });

  it('counts each client separately', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 2 });

    expect(drive(middleware, 2, '1.1.1.1').allowed).toBe(2);
    expect(drive(middleware, 2, '2.2.2.2').allowed).toBe(2);
    expect(drive(middleware, 1, '1.1.1.1').allowed).toBe(0);
  });

  it('starts a fresh window once the old one elapses', () => {
    let clock = 0;
    const middleware = rateLimit({ windowMs: 1000, max: 2, now: () => clock });

    expect(drive(middleware, 3).allowed).toBe(2);

    clock = 1000;
    expect(drive(middleware, 2).allowed).toBe(2);
  });

  it('does not reset the window early', () => {
    let clock = 0;
    const middleware = rateLimit({ windowMs: 1000, max: 1, now: () => clock });

    expect(drive(middleware, 1).allowed).toBe(1);
    clock = 999;
    expect(drive(middleware, 1).allowed).toBe(0);
  });

  it('falls back to the socket address when req.ip is absent', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 1 });
    const req = { socket: { remoteAddress: '9.9.9.9' } };

    let allowed = 0;
    middleware(req, createRes(), () => { allowed += 1; });
    middleware(req, createRes(), () => { allowed += 1; });

    expect(allowed).toBe(1);
  });

  it.each([
    [{ windowMs: 0, max: 1 }, /windowMs/],
    [{ windowMs: -1, max: 1 }, /windowMs/],
    [{ windowMs: 1000, max: 0 }, /max/],
  ])('rejects invalid options %p', (options, message) => {
    expect(() => rateLimit(options)).toThrow(message);
  });
});
