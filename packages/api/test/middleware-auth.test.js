/**
 * `@coherent.js/api/middleware`'s withAuth(verifyToken) only answered 401
 * when the verifier threw. The package's own verifyToken() returns null for a
 * bad token, so the pair called next() with req.user = null and let every
 * request through.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { SimpleRouter } from '../src/router.js';
import { withAuth, withPermission } from '../src/middleware.js';
import { generateJWT, verifyToken } from '../src/security.js';
import { startServer, request } from './helpers/http.js';

const SECRET = 'middleware-auth-test-secret';

/** Minimal Express-like response. */
function expressRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
}

/** Call an Express-style middleware and wait for it to settle. */
async function run(middleware, req) {
  const res = expressRes();
  const next = vi.fn();
  await middleware(req, res, next);
  return { res, next };
}

describe('middleware withAuth(verifyToken)', () => {
  let server;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it('answers 401 when the verifier returns null (the package verifyToken on a bad token)', async () => {
    const auth = withAuth((token) => verifyToken(token, SECRET));
    const req = { headers: { authorization: 'Bearer not.a.token' } };

    const { res, next } = await run(auth, req);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('answers 401 for falsy and rejected async verifiers', async () => {
    for (const verifier of [async () => null, async () => undefined, () => false, async () => { throw new Error('bad'); }]) {
      const { res, next } = await run(withAuth(verifier), { headers: { authorization: 'Bearer x' } });
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('sets req.user and continues for a valid token', async () => {
    const auth = withAuth((token) => verifyToken(token, SECRET));
    const token = generateJWT({ sub: 5 }, '1h', SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };

    const { res, next } = await run(auth, req);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user.sub).toBe(5);
  });

  it('protects a Coherent router route (plain node:http response)', async () => {
    const ran = [];
    const router = new SimpleRouter();
    router.delete(
      '/users/:id',
      (req) => {
        ran.push(req.user.sub);
        return { ok: true };
      },
      { middleware: [withAuth((token) => verifyToken(token, SECRET))] }
    );
    server = await startServer(router);

    const missing = await request(`${server.base}/users/1`, { method: 'DELETE' });
    const invalid = await request(`${server.base}/users/1`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer forged.token.here' }
    });
    const valid = await request(`${server.base}/users/1`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${generateJWT({ sub: 9 }, '1h', SECRET)}` }
    });

    expect(missing.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(valid.status).toBe(200);
    expect(ran).toEqual([9]);
  });

  it('throws at creation when no verifier function is given', () => {
    expect(() => withAuth()).toThrow(TypeError);
    expect(() => withAuth({ secret: 'x' })).toThrow(/verifyToken/);
  });

  it('withPermission answers 401/403 on a plain node:http response', async () => {
    const router = new SimpleRouter();
    router.get('/admin', () => ({ ok: true }), {
      middleware: [
        (req) => {
          if (req.headers['x-role']) req.user = { role: req.headers['x-role'] };
        },
        withPermission((user) => user.role === 'admin')
      ]
    });
    server = await startServer(router);

    expect((await request(`${server.base}/admin`)).status).toBe(401);
    expect((await request(`${server.base}/admin`, { headers: { 'x-role': 'user' } })).status).toBe(403);
    expect((await request(`${server.base}/admin`, { headers: { 'x-role': 'admin' } })).status).toBe(200);
  });
});
