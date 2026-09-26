/**
 * The route cache handed every request for a path the same `params` object,
 * and keyed entries by method and path only, ignoring the API version.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { SimpleRouter } from '../src/router.js';
import { startServer, request } from './helpers/http.js';

describe('route cache', () => {
  let server;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it('gives each request its own params object', async () => {
    const router = new SimpleRouter();
    router.get('/p/:name', (req) => {
      const seen = { ...req.params };
      req.params.name = 'MUTATED';
      req.params.injected = true;
      return { params: seen };
    });
    server = await startServer(router, { rateLimit: false });

    const first = await request(`${server.base}/p/ada`);
    const second = await request(`${server.base}/p/ada`);

    expect(first.json).toEqual({ params: { name: 'ada' } });
    expect(second.json).toEqual({ params: { name: 'ada' } });
  });

  it('keys cached matches by API version', async () => {
    const router = new SimpleRouter({ enableVersioning: true });
    router.addVersionedRoute('v2', 'GET', '/items/:id', (req) => ({ version: 'v2', id: req.params.id }));
    router.addVersionedRoute('v1', 'GET', '/items/:id', (req) => ({ version: 'v1', id: req.params.id }));
    server = await startServer(router, { rateLimit: false });

    const v1 = await request(`${server.base}/items/1`, { headers: { 'api-version': 'v1' } });
    const v2 = await request(`${server.base}/items/1`, { headers: { 'api-version': 'v2' } });
    const v1Again = await request(`${server.base}/items/1`, { headers: { 'api-version': 'v1' } });

    expect(v1.json).toEqual({ version: 'v1', id: '1' });
    expect(v2.json).toEqual({ version: 'v2', id: '1' });
    expect(v1Again.json).toEqual({ version: 'v1', id: '1' });
  });

  it('still counts cache hits', async () => {
    const router = new SimpleRouter({ enableMetrics: true });
    router.get('/u/:id', (req) => ({ id: req.params.id }));
    server = await startServer(router, { rateLimit: false });

    await request(`${server.base}/u/1`);
    await request(`${server.base}/u/1`);

    expect(router.getMetrics().cacheHits).toBe(1);
  });
});
