/**
 * JWT helpers used to fall back to the public secret 'your-secret-key', so
 * anyone could mint a token -- role: 'admin' included -- that withAuth()
 * accepted. A secret is now mandatory.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { SimpleRouter } from '../src/router.js';
import { generateJWT, verifyToken, withAuth } from '../src/security.js';
import { startServer, request } from './helpers/http.js';

const OLD_PUBLIC_DEFAULT = 'your-secret-key';

/** Sign a token by hand, the way an attacker would with the old default. */
function forge(payload, secret) {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

describe('JWT secret is mandatory', () => {
  let server;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it('withAuth() without a secret throws at creation', () => {
    expect(() => withAuth()).toThrow(TypeError);
    expect(() => withAuth()).toThrow(/secret/);
    expect(() => withAuth({})).toThrow(/secret/);
    expect(() => withAuth({ secret: '' })).toThrow(/secret/);
    expect(() => withAuth({ required: false })).toThrow(/secret/);
  });

  it('generateJWT() without a secret throws instead of signing with a public default', () => {
    expect(() => generateJWT({ sub: 1, role: 'admin' }, '1h')).toThrow(/secret/);
    expect(() => generateJWT({ sub: 1 })).toThrow(TypeError);
  });

  it('verifyToken() without a secret throws instead of trusting the public default', () => {
    const forged = forge({ sub: 1, role: 'admin' }, OLD_PUBLIC_DEFAULT);
    expect(() => verifyToken(forged)).toThrow(/secret/);
  });

  it('a token forged with the old default is rejected by a configured withAuth', async () => {
    const router = new SimpleRouter();
    router.get('/me', (req) => ({ user: req.user }), {
      middleware: [withAuth({ secret: 's3cret-from-env' })]
    });
    server = await startServer(router);

    const forged = forge({ sub: 1, role: 'admin' }, OLD_PUBLIC_DEFAULT);
    const res = await request(`${server.base}/me`, { headers: { authorization: `Bearer ${forged}` } });

    expect(res.status).toBe(401);
  });

  it('round-trips a token signed and verified with the same explicit secret', async () => {
    const router = new SimpleRouter();
    router.get('/me', (req) => ({ user: req.user.sub }), {
      middleware: [withAuth({ secret: 's3cret-from-env' })]
    });
    server = await startServer(router);

    const token = generateJWT({ sub: 42 }, '1h', 's3cret-from-env');
    const res = await request(`${server.base}/me`, { headers: { authorization: `Bearer ${token}` } });

    expect(res.status).toBe(200);
    expect(res.json).toEqual({ user: 42 });
  });

  it('withAuth({ verify }) authenticates through a custom verifier instead of a secret', async () => {
    const router = new SimpleRouter();
    router.get('/me', (req) => ({ user: req.user }), {
      middleware: [
        withAuth({
          verify: async (req) => (req.headers['x-api-key'] === 'k-1' ? { id: 'svc' } : null)
        })
      ]
    });
    server = await startServer(router);

    const ok = await request(`${server.base}/me`, { headers: { 'x-api-key': 'k-1' } });
    const denied = await request(`${server.base}/me`, { headers: { 'x-api-key': 'nope' } });

    expect(ok.status).toBe(200);
    expect(ok.json).toEqual({ user: { id: 'svc' } });
    expect(denied.status).toBe(401);
  });
});
