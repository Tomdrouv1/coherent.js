/**
 * 500 responses echoed the thrown message to the client, e.g.
 * `connect ECONNREFUSED 10.0.3.7:5432 (db-primary.internal)`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { SimpleRouter, createRouter } from '../src/router.js';
import { ApiError, NotFoundError, createErrorHandler } from '../src/errors.js';
import { startServer, request } from './helpers/http.js';

const INTERNAL = 'connect ECONNREFUSED 10.0.3.7:5432 (db-primary.internal)';

function failingRouters(options) {
  const simple = new SimpleRouter(options);
  simple.get('/boom', () => {
    throw new Error(INTERNAL);
  });
  simple.get('/missing', () => {
    throw new NotFoundError('User 7 not found');
  });
  simple.get('/unavailable', () => {
    throw new ApiError('Replica lag on db-replica-3', 503);
  });

  const object = createRouter(
    {
      api: {
        users: {
          GET: {
            handler: () => {
              throw new Error(INTERNAL);
            }
          }
        }
      }
    },
    options
  );
  return { simple, object };
}

describe('5xx responses do not leak internal error messages', () => {
  const servers = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
    vi.unstubAllEnvs();
  });

  async function serve(router) {
    const server = await startServer(router, { rateLimit: false });
    servers.push(server);
    return server;
  }

  it('answers a generic message and logs the real error (addRoute routes)', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { simple } = failingRouters();
    const server = await serve(simple);

    const res = await request(`${server.base}/boom`);

    expect(res.status).toBe(500);
    expect(res.json).toEqual({ error: 'Internal Server Error' });
    expect(res.text).not.toContain('ECONNREFUSED');
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('GET /boom'), expect.objectContaining({ message: INTERNAL }));
  });

  it('answers a generic message and logs the real error (object routes)', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { object } = failingRouters();
    const server = await serve(object);

    const res = await request(`${server.base}/api/users`);

    expect(res.status).toBe(500);
    expect(res.json).toEqual({ error: 'Internal Server Error' });
    expect(logged).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ message: INTERNAL }));
  });

  it('uses the status text for other 5xx ApiErrors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const server = await serve(failingRouters().simple);

    const res = await request(`${server.base}/unavailable`);

    expect(res.status).toBe(503);
    expect(res.json).toEqual({ error: 'Service Unavailable' });
  });

  it('keeps 4xx ApiError messages', async () => {
    const server = await serve(failingRouters().simple);

    const res = await request(`${server.base}/missing`);

    expect(res.status).toBe(404);
    expect(res.json).toEqual({ error: 'User 7 not found' });
  });

  it('exposes the message with exposeErrors: true', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { simple, object } = failingRouters({ exposeErrors: true });
    const simpleServer = await serve(simple);
    const objectServer = await serve(object);

    expect((await request(`${simpleServer.base}/boom`)).json).toEqual({ error: INTERNAL });
    expect((await request(`${objectServer.base}/api/users`)).json).toEqual({ error: INTERNAL });
  });

  it('exposes the message when NODE_ENV is development', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
    const server = await serve(failingRouters().simple);

    expect((await request(`${server.base}/boom`)).json).toEqual({ error: INTERNAL });
  });
});

describe('createErrorHandler', () => {
  function run(handler, error) {
    const res = { headersSent: false };
    res.status = vi.fn((code) => {
      res.statusCode = code;
      return res;
    });
    res.json = vi.fn((body) => {
      res.body = body;
      return res;
    });
    handler(error, { method: 'GET', url: '/' }, res, vi.fn());
    return res;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('masks 5xx messages and details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new ApiError(INTERNAL, 500, { host: 'db-primary.internal' });

    const res = run(createErrorHandler(), error);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Error', message: 'Internal Server Error', statusCode: 500 });
  });

  it('keeps 4xx messages, and exposes 5xx when asked', () => {
    const logger = vi.fn();

    expect(run(createErrorHandler({ logger }), new NotFoundError('No such order')).body).toMatchObject({
      message: 'No such order',
      statusCode: 404
    });
    expect(run(createErrorHandler({ logger, exposeErrors: true }), new Error(INTERNAL)).body).toMatchObject({
      message: INTERNAL,
      statusCode: 500
    });
    expect(logger).toHaveBeenCalledTimes(2);
  });
});
