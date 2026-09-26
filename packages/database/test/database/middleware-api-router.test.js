/**
 * The database middleware under the @coherent.js/api router, over real HTTP.
 *
 * The router runs middleware on plain Node `ServerResponse` objects and answers
 * a failed request with the thrown error's `statusCode` (as its `ApiError`
 * classes carry it), not Express's `status`: a missing record came back as 500.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { withModel, withQueryValidation } from '../../src/middleware.js';
import { createRouter } from '../../../api/src/index.js';

const User = {
  name: 'User',
  find: async (id) => (id === '1' ? { id: 1, name: 'Ada' } : null)
};

let server;
afterEach(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = undefined;
  }
});

async function get(router, path) {
  server = router.createServer({ rateLimit: false });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  return { status: res.status, body: await res.json() };
}

describe('withModel under the @coherent.js/api router', () => {
  it('answers 404 for a missing record on an addRoute() route', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const router = createRouter();
    router.get('/users/:id', (req) => ({ user: req.user }), { middleware: [withModel(User)] });

    const missing = await get(router, '/users/2');
    expect(missing).toEqual({ status: 404, body: { error: 'User not found' } });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('answers 404 for a missing record on an object-config route', async () => {
    const router = createRouter({
      users: {
        ':id': {
          GET: { middleware: [withModel(User)], handler: (req) => ({ user: req.user }) }
        }
      }
    });

    const missing = await get(router, '/users/2');
    expect(missing).toEqual({ status: 404, body: { error: 'User not found' } });
  });

  it('still loads a record that exists', async () => {
    const router = createRouter();
    router.get('/users/:id', (req) => ({ user: req.user }), { middleware: [withModel(User)] });

    const found = await get(router, '/users/1');
    expect(found).toEqual({ status: 200, body: { user: { id: 1, name: 'Ada' } } });
  });

  it('answers 400 when the route parameter is missing', async () => {
    const router = createRouter();
    router.get('/users', (req) => ({ user: req.user }), { middleware: [withModel(User)] });

    const missing = await get(router, '/users');
    expect(missing).toEqual({ status: 400, body: { error: "Parameter 'id' is required" } });
  });
});

describe('withQueryValidation under the @coherent.js/api router', () => {
  it('answers 400, not 500, for an invalid query parameter', async () => {
    const router = createRouter();
    router.get('/users', (req) => ({ query: req.query }), {
      middleware: [withQueryValidation({ age: { type: 'number', min: 0 } })]
    });

    const invalid = await get(router, '/users?age=abc');
    expect(invalid).toEqual({ status: 400, body: { error: "Query parameter 'age' must be a number" } });
  });
});

describe('errors withModel passes to next()', () => {
  it('carry the status as both `status` (Express) and `statusCode` (@coherent.js/api)', async () => {
    const next = vi.fn();
    await withModel(User)({ params: { id: '2' } }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404, statusCode: 404 }));
  });
});
