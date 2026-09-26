/**
 * Behaviour the type definitions promised but the runtime did not deliver.
 */

import { describe, it, expect, afterEach } from 'vitest';
import api, {
  createRouter,
  generateToken,
  generateJWT,
  verifyToken,
  hashPassword,
  verifyPassword,
  ValidationError
} from '../src/index.js';
import { startServer, request } from './helpers/http.js';

describe('runtime matches the declared API', () => {
  let server;

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it('registers method handlers given as bare functions in object routes', async () => {
    const router = createRouter({
      api: {
        users: {
          GET: () => ({ users: [] }),
          post: (req) => ({ created: req.body })
        }
      }
    });
    server = await startServer(router);

    const list = await request(`${server.base}/api/users`);
    const created = await request(`${server.base}/api/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"name":"Ada"}'
    });

    expect(list.status).toBe(200);
    expect(list.json).toEqual({ users: [] });
    expect(created.json).toEqual({ created: { name: 'Ada' } });
  });

  it('applies the `middleware` and `prefix` router options', async () => {
    const denyAll = (req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end('{"error":"Unauthorized"}');
    };
    const ran = [];
    const router = createRouter(
      { admin: { DELETE: () => ran.push('deleted') } },
      { prefix: '/v1', middleware: [denyAll] }
    );
    server = await startServer(router);

    const prefixed = await request(`${server.base}/v1/admin`, { method: 'DELETE' });
    const unprefixed = await request(`${server.base}/admin`, { method: 'DELETE' });

    expect(prefixed.status).toBe(401);
    expect(unprefixed.status).toBe(404);
    expect(ran).toEqual([]);
  });

  it('exports generateJWT and verifyToken from the package root', () => {
    const token = generateJWT({ sub: 3 }, '1h', 'root-secret');

    expect(verifyToken(token, 'root-secret')).toMatchObject({ sub: 3 });
    expect(verifyToken(token, 'other-secret')).toBeNull();
    expect(api.generateJWT).toBe(generateJWT);
    expect(api.verifyToken).toBe(verifyToken);
  });

  it('generateToken returns random hex of 2 * length characters, as now documented', () => {
    expect(generateToken()).toMatch(/^[0-9a-f]{64}$/);
    expect(generateToken(8)).toMatch(/^[0-9a-f]{16}$/);
    expect(generateToken(8)).not.toBe(generateToken(8));
  });

  it('generateToken called as the old JWT signature points to generateJWT', () => {
    expect(() => generateToken({ userId: 1 }, { secret: 's' })).toThrow(TypeError);
    expect(() => generateToken({ userId: 1 }, { secret: 's' })).toThrow(/generateJWT/);
    expect(() => generateToken(0)).toThrow(/byte count/);
  });

  it('hashPassword and verifyPassword are synchronous, as now documented', () => {
    const hash = hashPassword('correct horse');

    expect(typeof hash).toBe('string');
    expect(verifyPassword('correct horse', hash)).toBe(true);
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('ValidationError exposes the field errors it was built with', () => {
    const errors = [{ field: 'email', message: 'Invalid email format', rule: 'format' }];
    const error = new ValidationError(errors);

    expect(error.errors).toBe(errors);
    expect(error.details).toEqual({ errors });
    expect(error.statusCode).toBe(400);
  });

  it('the default export has no BadRequestError, which the types used to declare', () => {
    expect('BadRequestError' in api).toBe(false);
    expect(Object.keys(api).sort()).toEqual(
      [
        'ApiError', 'AuthenticationError', 'AuthorizationError', 'ConflictError', 'NotFoundError',
        'ValidationError', 'createErrorHandler', 'createRouter', 'deserializeDate', 'deserializeMap',
        'deserializeSet', 'generateJWT', 'generateToken', 'hashPassword', 'serializeDate',
        'serializeForJSON', 'serializeMap', 'serializeSet', 'validateAgainstSchema', 'validateField',
        'verifyPassword', 'verifyToken', 'withAuth', 'withErrorHandling', 'withInputValidation',
        'withParamsValidation', 'withQueryValidation', 'withRole', 'withSerialization', 'withValidation'
      ].sort()
    );
  });
});
