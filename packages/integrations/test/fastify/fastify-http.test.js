/**
 * Fastify integration against a real Fastify instance.
 *
 * The older fastify-integration.test.js only calls the plugin with a mock
 * instance; these tests register it on a real app, listen on an ephemeral
 * port and fetch.
 */

import { describe, it, expect, afterEach } from 'vitest';
import Fastify from 'fastify';
import { coherentFastify, setupCoherent } from '../../src/fastify/index.js';
import { hit } from '../helpers/listen.js';

let app;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function start(instance) {
  await instance.listen({ port: 0, host: '127.0.0.1' });
  return `http://127.0.0.1:${instance.server.address().port}`;
}

describe('Fastify: JSON responses are not auto-rendered by default', () => {
  it('keeps single-key objects returned from handlers as JSON', async () => {
    app = Fastify();
    await app.register(coherentFastify);
    app.get('/ok', async () => ({ ok: true }));
    app.get('/users', async () => ({ users: [{ name: 'a' }] }));
    app.get(
      '/schema',
      { schema: { response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
      async () => ({ ok: true })
    );
    app.post('/login', async (_request, reply) => reply.code(401).send({ error: 'Invalid credentials' }));
    const url = await start(app);

    for (const [path, expected] of [
      ['/ok', { ok: true }],
      ['/users', { users: [{ name: 'a' }] }],
      ['/schema', { ok: true }]
    ]) {
      const result = await hit(url, path);
      expect(result.status).toBe(200);
      expect(result.type).toMatch(/^application\/json/);
      expect(JSON.parse(result.body)).toEqual(expected);
    }

    const login = await hit(url, '/login', { method: 'POST' });
    expect(login.status).toBe(401);
    expect(login.type).toMatch(/^application\/json/);
    expect(JSON.parse(login.body)).toEqual({ error: 'Invalid credentials' });
  });

  it('reply.coherent renders explicitly with the plugin template', async () => {
    app = Fastify();
    await app.register(setupCoherent, { template: '<main>{{content}}</main>' });
    app.get('/', async (_request, reply) => reply.coherent({ h1: { text: 'Hi <you>' } }));
    const url = await start(app);

    const result = await hit(url, '/');
    expect(result.status).toBe(200);
    expect(result.type).toMatch(/^text\/html/);
    expect(result.body).toBe('<main><h1>Hi &lt;you&gt;</h1></main>');
  });
});

describe('Fastify: reply.coherent errors use Fastify error handling', () => {
  const broken = { p: { children: [{ get b() { throw new Error('render-fail'); } }] } };

  it('runs the app setErrorHandler and onError hooks', async () => {
    const seen = [];
    app = Fastify();
    await app.register(coherentFastify);
    app.addHook('onError', async (_request, _reply, error) => {
      seen.push(error.message);
    });
    app.setErrorHandler((error, _request, reply) => {
      reply.status(599).type('text/plain').send(`HANDLED:${error.message}`);
    });
    app.get('/returned', async (_request, reply) => reply.coherent(broken));
    app.get('/not-returned', async (_request, reply) => {
      reply.coherent(broken);
    });
    const url = await start(app);

    for (const path of ['/returned', '/not-returned']) {
      const result = await hit(url, path);
      expect(result.status).toBe(599);
      expect(result.type).toMatch(/^text\/plain/);
      expect(result.body).toMatch(/^HANDLED:.*render-fail/);
    }
    expect(seen).toHaveLength(2);
  });

  it('returns the reply', async () => {
    app = Fastify();
    await app.register(coherentFastify);
    let returned;
    app.get('/', async (_request, reply) => {
      returned = reply.coherent({ p: { text: 'ok' } });
      return returned;
    });
    const url = await start(app);

    expect((await hit(url, '/')).body).toBe('<!DOCTYPE html>\n<p>ok</p>');
    expect(returned?.constructor?.name).toMatch(/Reply/);
  });
});

describe('Fastify: setupCoherent is a plugin', () => {
  it('explains how to register it when called directly', () => {
    const instance = Fastify();
    expect(() => setupCoherent(instance, {})).toThrow(/fastify\.register\(setupCoherent/);
  });
});

describe('Fastify: autoRender: true keeps the legacy behavior', () => {
  it('renders component objects returned from handlers', async () => {
    app = Fastify();
    await app.register(coherentFastify, { autoRender: true });
    app.get('/page', async () => ({ div: { text: 'hello' } }));
    app.get('/list', async () => [1, 2]);
    const url = await start(app);

    const page = await hit(url, '/page');
    expect(page.type).toMatch(/^text\/html/);
    expect(page.body).toBe('<!DOCTYPE html>\n<div>hello</div>');

    const list = await hit(url, '/list');
    expect(JSON.parse(list.body)).toEqual([1, 2]);
  });
});
