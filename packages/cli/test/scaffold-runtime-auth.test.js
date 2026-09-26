/**
 * Scaffolded runtime combinations that `coherent create` offers but that did
 * not work:
 *  - fastify + auth crashed on boot with FST_ERR_HOOK_INVALID_HANDLER, because
 *    the generated authPlugin was encapsulated and its `authenticate`
 *    decorator was invisible to the auth routes;
 *  - fastify/koa auth replies such as `{ error }` or `{ user }` are single-key
 *    objects, which setupCoherent() renders as HTML components;
 *  - the scaffold pinned a vitest major the repo does not use, `dev` did not
 *    reload, and the client hydration loader passed hydrate()'s arguments in
 *    the wrong order.
 *
 * The koa + auth route ordering is covered end to end by
 * scripts/scaffold-boot-e2e.mjs (it needs @koa/router installed).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { setupCoherent } from '../../integrations/src/fastify/index.js';
import { hydrate as realHydrate } from '../../client/src/hydrate.js';
import { scaffoldProject } from '../src/generators/project-scaffold.js';
import { generateClientScaffolding } from '../src/generators/package-scaffold.js';

const tempDirs = [];

afterEach(async () => {
  while (tempDirs.length) {
    await rm(tempDirs.pop(), { recursive: true, force: true });
  }
});

async function scaffold(options) {
  const dir = await mkdtemp(join(tmpdir(), 'coherent-runtime-auth-'));
  tempDirs.push(dir);
  await scaffoldProject(dir, {
    name: 'runtime-auth-app',
    template: 'fullstack',
    skipInstall: true,
    skipGit: true,
    ...options
  });
  return dir;
}

function stubPackage(projectDir, name, source) {
  const dir = join(projectDir, 'node_modules', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, type: 'module', main: 'index.js' }));
  writeFileSync(join(dir, 'index.js'), source);
}

const JWT_STUB = `
export default {
  sign: (payload) => 'stub.' + Buffer.from(JSON.stringify(payload)).toString('base64url'),
  verify: (token) => {
    if (!token.startsWith('stub.')) throw new Error('invalid token');
    return JSON.parse(Buffer.from(token.slice(5), 'base64url').toString());
  }
};
`;

const USER_MODEL_STUB = `
const users = [];
export const UserModel = {
  async findByEmail(email) { return users.find((u) => u.email === email) ?? null; },
  async findById(id) { return users.find((u) => u.id === id) ?? null; },
  async create({ email, name, passwordHash }) {
    const user = { id: users.length + 1, email, name, password_hash: passwordHash };
    users.push(user);
    return user;
  }
};
`;

describe('fastify + JWT auth scaffold', () => {
  it('boots with the generated plugin and routes, and answers auth routes with JSON', async () => {
    const dir = await scaffold({ runtime: 'fastify', database: 'sqlite', auth: 'jwt', packages: [] });
    stubPackage(dir, 'jsonwebtoken', JWT_STUB);
    writeFileSync(join(dir, 'src/db/models/User.js'), USER_MODEL_STUB);
    process.env.JWT_SECRET = 'test-secret';

    const { authPlugin } = await import(pathToFileURL(join(dir, 'src/plugins/auth.js')).href);
    const { default: authRoutes } = await import(pathToFileURL(join(dir, 'src/api/auth.js')).href);

    // Same registration order as the generated src/index.js
    const app = Fastify();
    await app.register(authPlugin);
    await app.register(setupCoherent, { template: '<!DOCTYPE html>{{content}}' });
    await app.register(authRoutes, { prefix: '/api/auth' });

    try {
      // Used to throw FST_ERR_HOOK_INVALID_HANDLER: fastify.authenticate was undefined
      await app.ready();

      const anonymous = await app.inject({ method: 'GET', url: '/api/auth/me' });
      expect(anonymous.statusCode).toBe(401);
      expect(anonymous.headers['content-type']).toMatch(/^application\/json/);
      expect(anonymous.json()).toEqual({ error: 'No token provided' });

      const registered = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'ada@example.com', name: 'Ada', password: 'correct horse' }
      });
      expect(registered.statusCode).toBe(200);
      const { token } = registered.json();
      expect(token).toBeTruthy();

      const me = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token}` }
      });
      expect(me.statusCode).toBe(200);
      expect(me.headers['content-type']).toMatch(/^application\/json/);
      expect(me.json()).toEqual({ user: { id: 1, email: 'ada@example.com', name: 'Ada' } });
    } finally {
      await app.close();
      delete process.env.JWT_SECRET;
    }
  });
});

describe('generated package.json', () => {
  const repoVitestMajor = (() => {
    const rootPkg = JSON.parse(
      readFileSync(fileURLToPath(new URL('../../../package.json', import.meta.url)), 'utf8')
    );
    return /\d+/.exec(rootPkg.devDependencies.vitest)[0];
  })();

  it('pins vitest to the major the monorepo tests with', async () => {
    const dir = await scaffold({ runtime: 'express', packages: [] });
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.devDependencies.vitest).toBe(`^${repoVitestMajor}.0.0`);
  });

  it('dev restarts on file changes (node --watch / tsx watch) and loads .env', async () => {
    const js = JSON.parse(readFileSync(join(await scaffold({ runtime: 'koa' }), 'package.json'), 'utf8'));
    expect(js.scripts.dev.split(/\s+/)).toEqual(
      expect.arrayContaining(['node', '--watch', '--env-file-if-exists=.env', 'src/index.js'])
    );

    const ts = JSON.parse(
      readFileSync(join(await scaffold({ runtime: 'koa', language: 'typescript' }), 'package.json'), 'utf8')
    );
    expect(ts.scripts.dev.split(/\s+/)).toEqual(
      expect.arrayContaining(['tsx', 'watch', '--env-file-if-exists=.env', 'src/index.ts'])
    );
  });
});

describe('client hydration loader', () => {
  it('calls hydrate(component, container) in the order @coherent.js/client expects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'coherent-hydration-loader-'));
    tempDirs.push(dir);
    const scaffolding = generateClientScaffolding();

    // The generated component, served from /components/ in the app
    mkdirSync(join(dir, 'components'));
    writeFileSync(join(dir, 'components/InteractiveCounter.js'), scaffolding['src/components/InteractiveCounter.js']);

    // Stand-in for @coherent.js/client that records how hydrate() is called
    writeFileSync(join(dir, 'client-stub.mjs'), 'export const calls = []; export function hydrate(...args) { calls.push(args); }');
    const loader = scaffolding['public/js/hydration.js']
      .replace("'@coherent.js/client'", `'${pathToFileURL(join(dir, 'client-stub.mjs')).href}'`)
      .replace('`/components/', `\`${pathToFileURL(dir).href}/components/`);
    writeFileSync(join(dir, 'loader.mjs'), loader);

    const element = { getAttribute: (name) => (name === 'data-hydrate' ? 'InteractiveCounter' : null) };
    let onReady;
    globalThis.document = {
      addEventListener: (type, cb) => { if (type === 'DOMContentLoaded') onReady = cb; },
      querySelectorAll: () => [element]
    };
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args);

    try {
      await import(pathToFileURL(join(dir, 'loader.mjs')).href);
      const { calls } = await import(pathToFileURL(join(dir, 'client-stub.mjs')).href);
      onReady();
      await expect.poll(() => calls.length + errors.length).toBeGreaterThan(0);

      expect(errors).toEqual([]);
      const [component, container] = calls[0];
      expect(component.name).toBe('InteractiveCounter');
      expect(container).toBe(element);

      // The real hydrate() rejects the old (container, component) order outright
      expect(() => realHydrate(element, component)).toThrow(/requires a component function/);
    } finally {
      console.error = originalError;
      delete globalThis.document;
    }
  });
});
