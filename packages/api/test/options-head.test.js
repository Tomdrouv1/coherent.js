/**
 * Every OPTIONS request got an automatic 204, so router.options() handlers
 * never ran, and HEAD requests were a 404 unless a HEAD route existed.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { SimpleRouter } from '../src/router.js';
import { startServer, request } from './helpers/http.js';

describe('OPTIONS and HEAD', () => {
  let server;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it('runs a registered OPTIONS handler', async () => {
    const router = new SimpleRouter();
    router.options('/cors-custom', () => ({ custom: true }));
    server = await startServer(router);

    const res = await request(`${server.base}/cors-custom`, { method: 'OPTIONS' });

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ custom: true });
  });

  it('still answers a preflight with 204 and CORS headers where no OPTIONS route exists', async () => {
    const router = new SimpleRouter({ corsOrigin: 'https://app.example' });
    router.get('/data', () => ({ ok: 1 }));
    server = await startServer(router);

    const res = await request(`${server.base}/data`, {
      method: 'OPTIONS',
      headers: { origin: 'https://app.example', 'access-control-request-method': 'GET' }
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example');
  });

  it('serves HEAD from the GET route, without a body', async () => {
    const calls = [];
    const router = new SimpleRouter();
    router.get('/login', (req) => {
      calls.push(req.method);
      return { ok: 1 };
    });
    server = await startServer(router);

    const res = await request(`${server.base}/login`, { method: 'HEAD' });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.text).toBe('');
    expect(calls).toEqual(['HEAD']);
  });

  it('prefers an explicit HEAD route over the GET fallback', async () => {
    const router = new SimpleRouter();
    router.get('/x', () => ({ from: 'get' }));
    router.head('/x', (req, res) => {
      res.writeHead(204, { 'X-From': 'head' });
      res.end();
    });
    server = await startServer(router);

    const res = await request(`${server.base}/x`, { method: 'HEAD' });

    expect(res.status).toBe(204);
    expect(res.headers.get('x-from')).toBe('head');
  });

  it('answers HEAD for an unknown path with 404', async () => {
    const router = new SimpleRouter();
    router.get('/x', () => ({}));
    server = await startServer(router);

    expect((await request(`${server.base}/nope`, { method: 'HEAD' })).status).toBe(404);
  });
});
