/**
 * The router's rate limiter keyed on the raw X-Forwarded-For header, so a
 * client rotating that header was never limited; its store was one
 * module-global Map shared by every router and never pruned.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { SimpleRouter, createRouter } from '../src/router.js';
import { startServer, request } from './helpers/http.js';

const LIMIT = { windowMs: 60_000, maxRequests: 3 };

/** Minimal request/response pair for driving handle() directly. */
function mockExchange(address, headers = {}) {
  const req = { method: 'GET', url: '/', headers, socket: { remoteAddress: address }, on() {} };
  const res = { statusCode: 0, headers: {}, setHeader() {}, getHeader() {}, end() {} };
  res.writeHead = (status, extra) => {
    res.statusCode = status;
    Object.assign(res.headers, extra);
  };
  return { req, res };
}

async function statuses(router, count, headersFor, address = '10.0.0.1', options = { rateLimit: LIMIT }) {
  const seen = [];
  for (let i = 0; i < count; i++) {
    const { req, res } = mockExchange(address, headersFor(i));
    await router.handle(req, res, options);
    seen.push(res.statusCode || 200);
  }
  return seen;
}

describe('router rate limiting', () => {
  let server;

  afterEach(async () => {
    await server?.close();
    server = undefined;
    vi.useRealTimers();
  });

  it('is not bypassed by rotating X-Forwarded-For', async () => {
    const router = new SimpleRouter();
    router.get('/login', () => ({ ok: 1 }));
    server = await startServer(router, { rateLimit: LIMIT });

    const seen = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(`${server.base}/login`, { headers: { 'x-forwarded-for': `1.2.3.${i}` } });
      seen.push(res.status);
    }

    expect(seen).toEqual([200, 200, 200, 429, 429]);
  });

  it('sends Retry-After with a 429', async () => {
    const router = new SimpleRouter();
    router.get('/', () => ({ ok: 1 }));
    await statuses(router, 3, () => ({}));

    const { req, res } = mockExchange('10.0.0.1');
    await router.handle(req, res, { rateLimit: LIMIT });

    expect(res.statusCode).toBe(429);
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0);
  });

  it('keeps a separate store per router', async () => {
    const first = new SimpleRouter();
    const second = new SimpleRouter();
    first.get('/', () => ({ ok: 1 }));
    second.get('/', () => ({ ok: 1 }));

    expect(await statuses(first, 4, () => ({}))).toEqual([200, 200, 200, 429]);
    expect(await statuses(second, 1, () => ({}))).toEqual([200]);
  });

  it('prunes expired windows instead of keeping every client forever', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const router = new SimpleRouter();
    router.get('/', () => ({ ok: 1 }));
    for (let i = 0; i < 500; i++) {
      await statuses(router, 1, () => ({}), `10.0.${Math.floor(i / 250)}.${i % 250}`);
    }
    expect(router.rateLimiter.size).toBe(500);

    vi.setSystemTime(new Date('2026-01-01T00:02:00Z'));
    await statuses(router, 1, () => ({}), '10.9.9.9');

    expect(router.rateLimiter.size).toBe(1);
  });

  it('reads X-Forwarded-For only as far as trustProxy allows', async () => {
    const router = createRouter(null, { trustProxy: 1 });
    router.get('/', () => ({ ok: 1 }));
    const proxy = '10.0.0.254';

    // Two real clients behind one proxy get separate budgets...
    expect(await statuses(router, 3, () => ({ 'x-forwarded-for': '203.0.113.1' }), proxy)).toEqual([200, 200, 200]);
    expect(await statuses(router, 1, () => ({ 'x-forwarded-for': '203.0.113.2' }), proxy)).toEqual([200]);

    // ...and a client cannot escape by prepending spoofed hops: the proxy
    // appends the address it saw, which is what gets counted.
    const spoofed = await statuses(
      router,
      2,
      (i) => ({ 'x-forwarded-for': `6.6.6.${i}, 203.0.113.1` }),
      proxy,
      { rateLimit: LIMIT, trustProxy: 1 }
    );
    expect(spoofed).toEqual([429, 429]);
  });

  it('can be turned off with rateLimit: false', async () => {
    const router = new SimpleRouter();
    router.get('/', () => ({ ok: 1 }));

    const seen = await statuses(router, 5, () => ({}), '10.0.0.1', { rateLimit: false });

    expect(seen).toEqual([200, 200, 200, 200, 200]);
  });
});
