/**
 * Express integration against a real Express app over HTTP.
 *
 * The older express-integration.test.js only checks that functions exist and
 * accept a mock app; these tests listen on an ephemeral port and fetch.
 */

import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import {
  coherentMiddleware,
  setupCoherent
} from '../../src/express/index.js';
import { listen, hit } from '../helpers/listen.js';

let server;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

function errorHandler(err, _req, res, _next) {
  res.status(599).type('text/plain').send(`HANDLED:${err.message}`);
}

describe('Express: JSON responses are not auto-rendered by default', () => {
  it('res.send / res.json of single-key objects stays JSON with setupCoherent defaults', async () => {
    const app = express();
    setupCoherent(app);
    app.get('/users', (_req, res) => res.send({ users: [{ name: 'a' }] }));
    app.get('/ok', (_req, res) => res.json({ ok: true }));
    app.get('/401', (_req, res) => res.status(401).send({ error: 'Invalid credentials' }));
    server = await listen(app);

    const users = await hit(server.url, '/users');
    expect(users.status).toBe(200);
    expect(users.type).toMatch(/^application\/json/);
    expect(JSON.parse(users.body)).toEqual({ users: [{ name: 'a' }] });

    const ok = await hit(server.url, '/ok');
    expect(ok.type).toMatch(/^application\/json/);
    expect(JSON.parse(ok.body)).toEqual({ ok: true });

    const denied = await hit(server.url, '/401');
    expect(denied.status).toBe(401);
    expect(denied.type).toMatch(/^application\/json/);
    expect(JSON.parse(denied.body)).toEqual({ error: 'Invalid credentials' });
  });

  it('coherentMiddleware() alone does not touch res.send', async () => {
    const app = express();
    app.use(coherentMiddleware());
    app.get('/data', (_req, res) => res.send({ data: { id: 1 } }));
    server = await listen(app);

    const result = await hit(server.url, '/data');
    expect(result.type).toMatch(/^application\/json/);
    expect(JSON.parse(result.body)).toEqual({ data: { id: 1 } });
  });
});

describe('Express: res.coherent renders explicitly', () => {
  it('renders a component as text/html with the configured template', async () => {
    const app = express();
    setupCoherent(app, { template: '<!DOCTYPE html><main>{{content}}</main>' });
    app.get('/', (_req, res) => res.coherent({ h1: { text: 'Hello <world>' } }));
    server = await listen(app);

    const result = await hit(server.url, '/');
    expect(result.status).toBe(200);
    expect(result.type).toMatch(/^text\/html/);
    expect(result.body).toBe('<!DOCTYPE html><main><h1>Hello &lt;world&gt;</h1></main>');
  });

  it('accepts a per-call template override', async () => {
    const app = express();
    app.use(coherentMiddleware());
    app.get('/', (_req, res) => res.coherent({ p: { text: 'x' } }, { template: '[{{content}}]' }));
    server = await listen(app);

    expect((await hit(server.url, '/')).body).toBe('[<p>x</p>]');
  });

  it('forwards render errors to the app error handler', async () => {
    const app = express();
    app.use(coherentMiddleware());
    app.get('/sync', (_req, res) => {
      res.coherent({ div: { children: [{ get span() { throw new Error('boom-sync'); } }] } });
    });
    app.get('/async', async (_req, res) => {
      await Promise.resolve();
      res.coherent({ div: { children: [{ get span() { throw new Error('boom-async'); } }] } });
    });
    app.use(errorHandler);
    server = await listen(app);

    const sync = await hit(server.url, '/sync');
    expect(sync.status).toBe(599);
    expect(sync.body).toMatch(/^HANDLED:.*boom-sync/);

    const later = await hit(server.url, '/async');
    expect(later.status).toBe(599);
    expect(later.body).toMatch(/^HANDLED:.*boom-async/);
  });
});

describe('Express: autoRender: true keeps the legacy res.send behavior', () => {
  it('renders component-shaped objects passed to res.send', async () => {
    const app = express();
    setupCoherent(app, { autoRender: true });
    app.get('/page', (_req, res) => res.send({ div: { text: 'hello' } }));
    app.get('/text', (_req, res) => res.send('plain'));
    server = await listen(app);

    const page = await hit(server.url, '/page');
    expect(page.type).toMatch(/^text\/html/);
    expect(page.body).toBe('<!DOCTYPE html>\n<div>hello</div>');

    const text = await hit(server.url, '/text');
    expect(text.body).toBe('plain');
  });
});
