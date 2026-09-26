/**
 * The Express, Fastify and Koa servers `coherent create` generates render
 * pages explicitly (`res.coherent()`, `reply.coherent()`, `ctx.coherent()`)
 * instead of relying on the adapters' opt-in `autoRender`, which renders any
 * single-key object body (`{ error }`, `{ user }`) as HTML.
 *
 * Each generated `src/index.js` is imported and served for real. The
 * framework packages come from the monorepo; the few add-ons it does not
 * install (@koa/router, koa-body, koa-static, @fastify/static) are stubbed in
 * the scaffold's node_modules, and the framework's `listen()` is wrapped to
 * bind a free port.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import Koa from 'koa';
import { setupCoherent as setupKoa } from '../../integrations/src/koa/index.js';
import { scaffoldProject } from '../src/generators/project-scaffold.js';

const require = createRequire(import.meta.url);
const realModule = (name) => JSON.stringify(pathToFileURL(require.resolve(name)).href);

const tempDirs = [];
globalThis.__scaffoldServers = [];

afterEach(async () => {
  for (const server of globalThis.__scaffoldServers.splice(0)) {
    await new Promise((resolve) => server.close(resolve));
  }
  while (tempDirs.length) {
    await rm(tempDirs.pop(), { recursive: true, force: true });
  }
});

function stubPackage(projectDir, name, source) {
  const dir = join(projectDir, 'node_modules', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, type: 'module', main: 'index.js' }));
  writeFileSync(join(dir, 'index.js'), source);
}

const STUBS = {
  express: {
    express: `
import realExpress from ${realModule('express')};
function express(...args) {
  const app = realExpress(...args);
  const listen = app.listen.bind(app);
  app.listen = (_port, callback) => {
    const server = listen(0, '127.0.0.1', callback);
    globalThis.__scaffoldServers.push(server);
    return server;
  };
  return app;
}
Object.assign(express, realExpress);
export default express;
`
  },
  fastify: {
    fastify: `
import realFastify from ${realModule('fastify')};
export default function Fastify(options = {}) {
  const app = realFastify({ ...options, logger: false });
  const listen = app.listen.bind(app);
  app.listen = async (options = {}) => {
    const address = await listen({ ...options, port: 0, host: '127.0.0.1' });
    globalThis.__scaffoldServers.push(app.server);
    return address;
  };
  return app;
}
`,
    '@fastify/static': 'export default async function fastifyStatic() {}'
  },
  koa: {
    koa: `
import RealKoa from ${realModule('koa')};
export default class Koa extends RealKoa {
  listen(_port, callback) {
    const server = super.listen(0, '127.0.0.1', callback);
    globalThis.__scaffoldServers.push(server);
    return server;
  }
}
`,
    '@koa/router': `
export default class Router {
  constructor() { this.stack = []; }
  get(path, ...handlers) { this.stack.push({ method: 'GET', path, handlers }); return this; }
  routes() {
    return async (ctx, next) => {
      const route = this.stack.find((layer) => layer.method === ctx.method && layer.path === ctx.path);
      if (!route) return next();
      for (const handler of route.handlers) await handler(ctx, async () => {});
    };
  }
  allowedMethods() { return (ctx, next) => next(); }
}
`,
    'koa-body': 'export const koaBody = () => (ctx, next) => next();',
    'koa-static': 'export default () => (ctx, next) => next();'
  }
};

async function bootScaffold(runtime) {
  const dir = await mkdtemp(join(tmpdir(), `coherent-explicit-render-${runtime}-`));
  tempDirs.push(dir);
  await scaffoldProject(dir, {
    name: `explicit-render-${runtime}`,
    template: 'basic',
    runtime,
    packages: ['api'],
    skipInstall: true,
    skipGit: true
  });
  for (const [name, source] of Object.entries(STUBS[runtime])) {
    stubPackage(dir, name, source);
  }

  const index = readFileSync(join(dir, 'src/index.js'), 'utf8');
  await import(pathToFileURL(join(dir, 'src/index.js')).href);
  await expect.poll(() => globalThis.__scaffoldServers[0]?.listening).toBe(true);
  const { port } = globalThis.__scaffoldServers[0].address();
  return { index, baseUrl: `http://127.0.0.1:${port}` };
}

describe.each(['express', 'fastify', 'koa'])('generated %s server', (runtime) => {
  it('renders the home page explicitly and keeps API responses JSON', async () => {
    const { index, baseUrl } = await bootScaffold(runtime);

    expect(index).not.toContain('autoRender');
    const explicitCall = { express: 'res.coherent(HomePage({}))', fastify: 'reply.coherent(HomePage({}))', koa: 'ctx.coherent(HomePage({}))' };
    expect(index).toContain(explicitCall[runtime]);

    const home = await fetch(`${baseUrl}/`);
    expect(home.status).toBe(200);
    expect(home.headers.get('content-type')).toMatch(/^text\/html/);
    const html = await home.text();
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<title>Coherent.js App</title>');
    expect(html).toContain(`<h1>Welcome to explicit-render-${runtime}!</h1>`);

    const user = await fetch(`${baseUrl}/api/users/7`);
    expect(user.status).toBe(200);
    expect(user.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await user.json()).toMatchObject({ id: 7 });
  });
});

describe('generated Koa JWT middleware', () => {
  it('answers with JSON objects under the generated setupCoherent() options', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'coherent-explicit-render-koa-auth-'));
    tempDirs.push(dir);
    await scaffoldProject(dir, {
      name: 'explicit-render-koa-auth',
      template: 'basic',
      runtime: 'koa',
      database: 'sqlite',
      auth: 'jwt',
      packages: [],
      skipInstall: true,
      skipGit: true
    });
    stubPackage(dir, 'jsonwebtoken', 'export default { sign: () => "t", verify: () => { throw new Error("bad"); } };');
    process.env.JWT_SECRET = 'test-secret';

    try {
      const { authMiddleware, sendJson } = await import(pathToFileURL(join(dir, 'src/middleware/auth.js')).href);
      // sendJson hands Koa the object itself: no pre-serialized string
      expect(readFileSync(join(dir, 'src/middleware/auth.js'), 'utf8')).not.toContain('JSON.stringify(body)');

      // Same Coherent setup as the generated src/index.js (explicit rendering only)
      const app = new Koa();
      setupKoa(app, { template: '<!DOCTYPE html>{{content}}' });
      app.use(authMiddleware);
      app.use((ctx) => sendJson(ctx, 200, { user: ctx.state.user }));
      const server = app.listen(0, '127.0.0.1');
      globalThis.__scaffoldServers.push(server);
      await new Promise((resolve) => server.once('listening', resolve));
      const baseUrl = `http://127.0.0.1:${server.address().port}`;

      const anonymous = await fetch(`${baseUrl}/api/protected/x`);
      expect(anonymous.status).toBe(401);
      expect(anonymous.headers.get('content-type')).toMatch(/^application\/json/);
      expect(await anonymous.json()).toEqual({ error: 'No token provided' });

      const forged = await fetch(`${baseUrl}/api/protected/x`, { headers: { authorization: 'Bearer forged' } });
      expect(forged.status).toBe(401);
      expect(await forged.json()).toEqual({ error: 'Invalid or expired token' });
    } finally {
      delete process.env.JWT_SECRET;
    }
  });
});
