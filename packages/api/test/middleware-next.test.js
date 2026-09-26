/**
 * Middleware may be written Coherent-style, `(req, res) => value`, or
 * Express-style, `(req, res, next)`. The router used to call every
 * middleware as `fn(req, res)`: withValidation's `next()` then threw
 * "next is not a function" (a 500 for every VALID body), and an Express-style
 * middleware that continued asynchronously was raced by the handler.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { SimpleRouter, createRouter } from '../src/router.js';
import { withValidation } from '../src/validation.js';
import { startServer, request, jsonInit } from './helpers/http.js';

const userSchema = {
  type: 'object',
  required: ['name'],
  properties: { name: { type: 'string' } }
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('middleware next() contract', () => {
  let server;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it('object route with `validation:` accepts a valid body', async () => {
    const router = createRouter({
      api: {
        users: {
          POST: { validation: userSchema, handler: (req) => ({ created: req.body }) }
        }
      }
    });
    server = await startServer(router);

    const res = await request(`${server.base}/api/users`, jsonInit('POST', { name: 'Ada' }));

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ created: { name: 'Ada' } });
  });

  it('withValidation() as addRoute middleware accepts a valid body', async () => {
    const router = new SimpleRouter();
    router.post('/users', (req) => ({ created: req.body }), {
      middleware: [withValidation(userSchema)]
    });
    server = await startServer(router);

    const res = await request(`${server.base}/users`, jsonInit('POST', { name: 'Ada' }));

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ created: { name: 'Ada' } });
  });

  it('waits for an Express-style middleware that calls next() asynchronously', async () => {
    const asyncAuth = (req, res, next) => {
      tick().then(() => {
        req.user = { id: 7 };
        next();
      });
    };
    const router = new SimpleRouter();
    router.get('/me', (req) => ({ user: req.user ?? null }), { middleware: [asyncAuth] });
    server = await startServer(router);

    const res = await request(`${server.base}/me`);

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ user: { id: 7 } });
  });

  it('does not run the handler when an Express-style middleware rejects asynchronously', async () => {
    const ran = [];
    const asyncReject = (req, res) => {
      tick().then(() => {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
      });
    };
    // Declared with three parameters: Express-style, even though it never
    // calls next.
    const expressStyle = (req, res, next) => asyncReject(req, res, next);

    const router = new SimpleRouter();
    router.delete('/users/:id', () => ran.push('deleted'), { middleware: [expressStyle] });
    const objectRouter = createRouter({
      items: { DELETE: { middleware: [expressStyle], handler: () => ran.push('item deleted') } }
    });
    server = await startServer(router);
    const objectServer = await startServer(objectRouter);

    try {
      const res = await request(`${server.base}/users/1`, { method: 'DELETE' });
      const objectRes = await request(`${objectServer.base}/items`, { method: 'DELETE' });

      expect(res.status).toBe(401);
      expect(objectRes.status).toBe(401);
      await tick();
      expect(ran).toEqual([]);
    } finally {
      await objectServer.close();
    }
  });

  it('turns next(err) into an error response without running the handler', async () => {
    const ran = [];
    const failing = (req, res, next) => next(new Error('lookup failed'));
    const router = new SimpleRouter();
    router.get('/x', () => ran.push('handler'), { middleware: [failing] });
    server = await startServer(router);

    const res = await request(`${server.base}/x`);

    expect(res.status).toBe(500);
    expect(ran).toEqual([]);
  });

  it('conditional middleware waits for an Express-style inner middleware', async () => {
    const router = new SimpleRouter();
    router.use({
      condition: { method: 'GET' },
      middleware: (req, res, next) => {
        tick().then(() => {
          req.tag = 'late';
          next();
        });
      }
    });
    router.get('/tagged', (req) => ({ tag: req.tag ?? null }));
    server = await startServer(router);

    const res = await request(`${server.base}/tagged`);

    expect(res.json).toEqual({ tag: 'late' });
  });

  it('toExpressRouter() runs Coherent-style middleware that never calls next', async () => {
    const router = new SimpleRouter();
    router.get('/x', (req) => ({ seen: req.seen }), {
      middleware: [(req) => {
        req.seen = 1;
        return null;
      }]
    });

    const registered = {};
    const fakeExpress = {
      Router: () => ({
        get: (path, handler) => {
          registered[path] = handler;
        }
      })
    };
    router.toExpressRouter(fakeExpress);

    let sent;
    const res = { headersSent: false, json: (body) => { sent = body; } };
    await Promise.race([
      registered['/x']({}, res, () => {}),
      new Promise((resolve) => setTimeout(resolve, 500))
    ]);

    expect(sent).toEqual({ seen: 1 });
  });
});
