/**
 * Router-level `rateLimit`, `maxBodySize` and `exposeErrors` only reached
 * requests served through createServer(); an application calling
 * router.handle() itself (inside Express, a test harness...) silently got the
 * defaults instead.
 */

import { describe, it, expect, vi } from 'vitest';
import { Readable } from 'node:stream';
import { createRouter } from '../src/router.js';

function mockRes() {
  const res = { status: 0, body: '', setHeader() {}, getHeader() {} };
  res.writeHead = (status) => {
    res.status = status;
  };
  res.end = (data = '') => {
    res.body = data;
  };
  return res;
}

function request(method, url, body) {
  const req = new Readable({
    read() {
      this.push(body ?? null);
      if (body) this.push(null);
    }
  });
  Object.assign(req, {
    method,
    url,
    headers: { 'content-type': 'application/json' },
    socket: { remoteAddress: '10.1.1.1' }
  });
  return req;
}

describe('router-level options apply to direct handle() calls', () => {
  it('uses the router rateLimit', async () => {
    const router = createRouter({ ping: { GET: () => ({ ok: 1 }) } }, { rateLimit: { windowMs: 60_000, maxRequests: 1 } });

    const first = mockRes();
    const second = mockRes();
    await router.handle(request('GET', '/ping'), first);
    await router.handle(request('GET', '/ping'), second);

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });

  it('uses the router maxBodySize', async () => {
    const router = createRouter({ echo: { POST: (req) => ({ body: req.body }) } }, { maxBodySize: 10 });

    const res = mockRes();
    await router.handle(request('POST', '/echo', JSON.stringify({ text: 'x'.repeat(50) })), res);

    expect(res.status).toBe(413);
  });

  it('lets a per-call exposeErrors reach object routes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const router = createRouter({
      boom: {
        GET: () => {
          throw new Error('db-primary.internal refused');
        }
      }
    });

    const hidden = mockRes();
    const shown = mockRes();
    await router.handle(request('GET', '/boom'), hidden, { rateLimit: false });
    await router.handle(request('GET', '/boom'), shown, { rateLimit: false, exposeErrors: true });

    expect(JSON.parse(hidden.body)).toEqual({ error: 'Internal Server Error' });
    expect(JSON.parse(shown.body)).toEqual({ error: 'db-primary.internal refused' });
    vi.restoreAllMocks();
  });
});
