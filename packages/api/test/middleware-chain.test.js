/**
 * A middleware that writes a response has rejected the request: the route
 * handler must not run after it.
 *
 * withAuth / withRole / withInputValidation answer 401 / 403 / 400 by writing
 * the response and returning nothing, so the chain has to look at the
 * response state rather than at the return value.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { SimpleRouter, createRouter } from '../src/router.js';
import { withAuth, withRole, withInputValidation } from '../src/security.js';
import { startServer, request, jsonInit } from './helpers/http.js';

const SECRET = 'middleware-chain-test-secret';

describe('middleware chain stops once a response is sent', () => {
  let server;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  describe('router.addRoute() routes', () => {
    it('does not run the handler after withAuth answered 401', async () => {
      const deleted = [];
      const router = new SimpleRouter();
      router.delete(
        '/users/:id',
        (req) => {
          deleted.push(req.params.id);
          return { ok: true };
        },
        { middleware: [withAuth({ secret: SECRET })] }
      );
      server = await startServer(router);

      const res = await request(`${server.base}/users/42`, { method: 'DELETE' });

      expect(res.status).toBe(401);
      expect(res.json).toEqual({ error: 'Unauthorized' });
      expect(deleted).toEqual([]);
    });

    it('does not run the handler after withRole answered 401/403', async () => {
      const actions = [];
      const router = new SimpleRouter();
      const setUser = (role) => (req) => {
        if (role) req.user = { id: 1, role };
      };
      router.post('/anon', () => actions.push('anon'), { middleware: [withRole('admin')] });
      router.post('/user', () => actions.push('user'), {
        middleware: [setUser('user'), withRole('admin')]
      });
      server = await startServer(router);

      const anon = await request(`${server.base}/anon`, jsonInit('POST', {}));
      const user = await request(`${server.base}/user`, jsonInit('POST', {}));

      expect(anon.status).toBe(401);
      expect(user.status).toBe(403);
      expect(actions).toEqual([]);
    });

    it('does not run the handler after withInputValidation answered 400', async () => {
      const signups = [];
      const router = new SimpleRouter();
      router.post(
        '/signup',
        (req) => {
          signups.push(req.body);
          return { ok: true };
        },
        { middleware: [withInputValidation({ email: { required: true, type: 'string' } })] }
      );
      server = await startServer(router);

      const res = await request(`${server.base}/signup`, jsonInit('POST', { email: 123 }));

      expect(res.status).toBe(400);
      expect(res.json.error).toBe('Validation failed');
      expect(signups).toEqual([]);
    });

    it('does not run later middleware either', async () => {
      const ran = [];
      const router = new SimpleRouter();
      router.get('/x', () => ran.push('handler'), {
        middleware: [withAuth({ secret: SECRET }), () => ran.push('second')]
      });
      server = await startServer(router);

      const res = await request(`${server.base}/x`);

      expect(res.status).toBe(401);
      expect(ran).toEqual([]);
    });

    it('still runs the handler when middleware lets the request through', async () => {
      const router = new SimpleRouter();
      router.get('/open', (req) => ({ tagged: req.tagged }), {
        middleware: [(req) => {
          req.tagged = true;
        }]
      });
      server = await startServer(router);

      const res = await request(`${server.base}/open`);

      expect(res.status).toBe(200);
      expect(res.json).toEqual({ tagged: true });
    });

    it('sends an object returned by middleware instead of running the handler', async () => {
      const ran = [];
      const router = new SimpleRouter();
      router.get('/short', () => ran.push('handler'), {
        middleware: [() => ({ from: 'middleware' })]
      });
      server = await startServer(router);

      const res = await request(`${server.base}/short`);

      expect(res.status).toBe(200);
      expect(res.json).toEqual({ from: 'middleware' });
      expect(ran).toEqual([]);
    });
  });

  describe('object routes (createRouter)', () => {
    it('does not run the handler after withAuth answered 401', async () => {
      const effects = [];
      const router = createRouter({
        api: {
          users: {
            DELETE: {
              middleware: [withAuth({ secret: SECRET })],
              handler: () => {
                effects.push('deleted');
                return { ok: 1 };
              }
            }
          }
        }
      });
      server = await startServer(router);

      const res = await request(`${server.base}/api/users`, { method: 'DELETE' });

      expect(res.status).toBe(401);
      expect(res.json).toEqual({ error: 'Unauthorized' });
      expect(effects).toEqual([]);
    });

    it('does not overwrite a response a handler wrote itself', async () => {
      const router = createRouter({
        created: {
          POST: {
            handler: (req, res) => {
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ id: 7 }));
            }
          }
        }
      });
      server = await startServer(router);

      const res = await request(`${server.base}/created`, jsonInit('POST', {}));

      expect(res.status).toBe(201);
      expect(res.json).toEqual({ id: 7 });
    });
  });
});
