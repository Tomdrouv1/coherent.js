/**
 * Koa integration against a real Koa app over HTTP.
 *
 * middleware.test.js only exercises mock contexts; these tests mount the
 * middleware on a real app, listen on an ephemeral port and fetch.
 */

import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import Koa from 'koa';
import { coherentKoaMiddleware, setupCoherent } from '../../src/koa/index.js';
import { listen, hit } from '../helpers/listen.js';

let server;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

function serve(app) {
  app.silent = true;
  return listen(http.createServer(app.callback()));
}

/** Error boundary so thrown errors are observable in the response. */
async function errorBoundary(ctx, next) {
  try {
    await next();
  } catch (error) {
    ctx.status = 599;
    ctx.type = 'text/plain';
    ctx.body = `HANDLED:${error.message}`;
  }
}

describe('Koa: JSON bodies are not auto-rendered by default', () => {
  it('keeps single-key ctx.body objects as JSON with setupCoherent defaults', async () => {
    const app = new Koa();
    setupCoherent(app);
    app.use(async (ctx) => {
      if (ctx.path === '/ok') ctx.body = { ok: true };
      else if (ctx.path === '/users') ctx.body = { users: [{ name: 'a' }] };
      else if (ctx.path === '/401') {
        ctx.status = 401;
        ctx.body = { error: 'Invalid credentials' };
      }
    });
    server = await serve(app);

    const ok = await hit(server.url, '/ok');
    expect(ok.type).toMatch(/^application\/json/);
    expect(JSON.parse(ok.body)).toEqual({ ok: true });

    const users = await hit(server.url, '/users');
    expect(users.type).toMatch(/^application\/json/);
    expect(JSON.parse(users.body)).toEqual({ users: [{ name: 'a' }] });

    const denied = await hit(server.url, '/401');
    expect(denied.status).toBe(401);
    expect(denied.type).toMatch(/^application\/json/);
    expect(JSON.parse(denied.body)).toEqual({ error: 'Invalid credentials' });
  });
});

describe('Koa: ctx.coherent renders explicitly', () => {
  it('renders a component into ctx.body as text/html with the configured template', async () => {
    const app = new Koa();
    setupCoherent(app, { template: '<main>{{content}}</main>' });
    app.use(async (ctx) => {
      ctx.status = 201;
      ctx.coherent({ h1: { text: 'Hi <you>' } });
    });
    server = await serve(app);

    const result = await hit(server.url, '/');
    expect(result.status).toBe(201);
    expect(result.type).toMatch(/^text\/html/);
    expect(result.body).toBe('<main><h1>Hi &lt;you&gt;</h1></main>');
  });

  it('throws render errors into the middleware chain', async () => {
    const app = new Koa();
    app.use(errorBoundary);
    app.use(coherentKoaMiddleware());
    app.use(async (ctx) => {
      ctx.coherent({ div: { children: [{ get span() { throw new Error('boom'); } }] } });
    });
    server = await serve(app);

    const result = await hit(server.url, '/');
    expect(result.status).toBe(599);
    expect(result.body).toMatch(/^HANDLED:.*boom/);
  });
});

describe('Koa: autoRender: true keeps the legacy behavior', () => {
  it('renders component-shaped ctx.body values', async () => {
    const app = new Koa();
    setupCoherent(app, { autoRender: true });
    app.use(async (ctx) => {
      ctx.body = { div: { text: 'hello' } };
    });
    server = await serve(app);

    const result = await hit(server.url, '/');
    expect(result.type).toMatch(/^text\/html/);
    expect(result.body).toBe('<!DOCTYPE html>\n<div>hello</div>');
  });
});
