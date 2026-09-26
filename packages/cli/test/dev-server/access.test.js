/**
 * Dev server access rules
 *
 * Regression coverage for a dev server that served /.env and /.git/config,
 * followed a symlink inside the project to a file anywhere on disk, answered
 * any Host header (DNS rebinding), accepted HMR WebSocket connections from
 * any Origin, and broadcast absolute file paths to them.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { request } from 'node:http';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { startDevServer } from '../../src/dev-server/index.js';
import { isHostAllowed, isOriginAllowed } from '../../src/dev-server/access.js';
import { bufferMessages, waitForOpen } from './ws-helpers.js';

/** GET with full control of the raw path and headers (fetch normalizes both). */
function get(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

/** Resolve with 'open' or the HTTP status the upgrade was refused with. */
function tryConnect(url, headers = {}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers });
    ws.once('open', () => { ws.close(); resolve('open'); });
    ws.once('unexpected-response', (_req, res) => resolve(res.statusCode));
    ws.once('error', () => resolve('error'));
  });
}

describe('dev server access rules', () => {
  let base;
  let root;
  let outside;
  let server;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'coherent-access-'));
    root = join(base, 'project');
    outside = join(base, 'outside');
    mkdirSync(join(root, '.git'), { recursive: true });
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(outside);
    writeFileSync(join(root, 'index.html'), '<!doctype html><html><body>page-content</body></html>');
    writeFileSync(join(root, 'src', 'app.js'), 'export const v = 1;');
    writeFileSync(join(root, '.env'), 'JWT_SECRET=supersecret\n');
    writeFileSync(join(root, '.npmrc'), '//registry.npmjs.org/:_authToken=npm_secret\n');
    writeFileSync(join(root, '.git', 'config'), '[remote "origin"]\n url = https://token@github.com/x/y\n');
    writeFileSync(join(outside, 'secret.txt'), 'OUTSIDE ROOT SECRET');
  });

  afterEach(async () => {
    if (server) await server.close();
    server = null;
    rmSync(base, { recursive: true, force: true });
  });

  const start = (options = {}) =>
    startDevServer({ root, port: 0, host: '127.0.0.1', open: false, log: false, ...options });

  test('refuses dotfiles and dot-directories', async () => {
    server = await start();
    for (const path of ['/.env', '/.npmrc', '/.git/config', '/src/../.env', '/%2e%2e/outside/secret.txt', '/%2eenv']) {
      const res = await get(server.port, path);
      expect([400, 403, 404], path).toContain(res.status);
      expect(res.body).not.toMatch(/supersecret|npm_secret|token@|OUTSIDE/);
    }
    expect((await get(server.port, '/.env')).status).toBe(403);
    expect((await get(server.port, '/%E0%A4%A')).status).toBe(400);
  });

  test('does not follow a symlink out of the project', async () => {
    symlinkSync(join(outside, 'secret.txt'), join(root, 'innocent.txt'));
    symlinkSync(outside, join(root, 'linked-dir'));
    symlinkSync(join(root, '.env'), join(root, 'env.txt'));
    server = await start();

    for (const path of ['/innocent.txt', '/linked-dir/secret.txt', '/env.txt']) {
      const res = await get(server.port, path);
      expect(res.status, path).toBe(403);
      expect(res.body).not.toMatch(/OUTSIDE|supersecret/);
    }
    // Regular files and symlinks that stay inside the project still work.
    symlinkSync(join(root, 'src', 'app.js'), join(root, 'alias.js'));
    expect((await get(server.port, '/src/app.js')).status).toBe(200);
    expect((await get(server.port, '/alias.js')).body).toContain('export const v');
  });

  test('serves linked node_modules packages and fsAllow directories', async () => {
    // A package linked from outside the project (npm link / link: dependency)
    mkdirSync(join(outside, 'pkg', 'dist'), { recursive: true });
    writeFileSync(join(outside, 'pkg', 'dist', 'index.js'), 'export const pkg = 1;');
    mkdirSync(join(root, 'node_modules', '@scope'), { recursive: true });
    symlinkSync(join(outside, 'pkg'), join(root, 'node_modules', '@scope', 'pkg'), 'dir');
    // pnpm layout: the entry points into node_modules/.pnpm inside the project
    mkdirSync(join(root, 'node_modules', '.pnpm', 'dep@1.0.0', 'node_modules', 'dep'), { recursive: true });
    writeFileSync(join(root, 'node_modules', '.pnpm', 'dep@1.0.0', 'node_modules', 'dep', 'index.js'), 'export const dep = 1;');
    symlinkSync(join(root, 'node_modules', '.pnpm', 'dep@1.0.0', 'node_modules', 'dep'), join(root, 'node_modules', 'dep'), 'dir');
    // Explicitly allowed directory
    symlinkSync(outside, join(root, 'shared'), 'dir');

    server = await start();
    expect((await get(server.port, '/node_modules/@scope/pkg/dist/index.js')).body).toContain('export const pkg');
    expect((await get(server.port, '/node_modules/dep/index.js')).body).toContain('export const dep');
    expect((await get(server.port, '/shared/secret.txt')).status).toBe(403);
    await server.close();

    server = await start({ fsAllow: [outside] });
    const allowed = await get(server.port, '/shared/secret.txt');
    expect(allowed.status).toBe(200);
    expect(allowed.body).toBe('OUTSIDE ROOT SECRET');
  });

  test('allows the workspace root that contains the project', async () => {
    writeFileSync(join(base, 'pnpm-workspace.yaml'), 'packages:\n  - "*"\n');
    symlinkSync(outside, join(root, 'sibling'), 'dir');
    server = await start();
    expect((await get(server.port, '/sibling/secret.txt')).status).toBe(200);
  });

  test('rejects requests addressed to another host (DNS rebinding)', async () => {
    server = await start();
    const rebinding = await get(server.port, '/index.html', { Host: `evil.example:${server.port}` });
    expect(rebinding.status).toBe(403);
    expect(rebinding.body).not.toContain('page-content');

    for (const host of [`localhost:${server.port}`, `127.0.0.1:${server.port}`, `[::1]:${server.port}`, 'app.localhost']) {
      expect((await get(server.port, '/index.html', { Host: host })).status, host).toBe(200);
    }
    await server.close();

    server = await start({ allowedHosts: ['.example.test'] });
    expect((await get(server.port, '/', { Host: 'dev.example.test' })).status).toBe(200);
    expect((await get(server.port, '/', { Host: 'example.test.evil' })).status).toBe(403);
  });

  test('refuses HMR WebSocket connections from other origins', async () => {
    server = await start();
    const url = `ws://127.0.0.1:${server.port}`;

    expect(await tryConnect(url, { Origin: 'http://evil.example' })).toBe(403);
    expect(await tryConnect(url, { Host: 'evil.example' })).toBe(403);
    expect(await tryConnect(url, { Origin: 'null' })).toBe(403);
    expect(await tryConnect(url, { Origin: `http://localhost:${server.port}` })).toBe('open');
    expect(await tryConnect(url)).toBe('open');
  });

  test('broadcasts root-relative paths only', async () => {
    server = await start();
    const client = new WebSocket(`ws://127.0.0.1:${server.port}`, {
      headers: { Origin: `http://127.0.0.1:${server.port}` }
    });
    const messages = bufferMessages(client);
    await waitForOpen(client);
    await messages.next((d) => d.type === 'connected');

    const updatePromise = messages.next((d) => d.type === 'hmr-update');
    writeFileSync(join(root, 'src', 'app.js'), 'export const v = 2;');
    const update = await updatePromise;
    client.close();

    expect(update.webPath).toBe('/src/app.js');
    expect(update.filePath).toBe('/src/app.js');
    expect(JSON.stringify(update)).not.toContain(base);
  });
});

describe('host and origin predicates', () => {
  test('isHostAllowed', () => {
    expect(isHostAllowed(undefined)).toBe(false);
    expect(isHostAllowed('evil.example')).toBe(false);
    expect(isHostAllowed('localhost.evil.example')).toBe(false);
    expect(isHostAllowed('127.0.0.1.nip.io')).toBe(false);
    expect(isHostAllowed('localhost:3000')).toBe(true);
    expect(isHostAllowed('192.168.1.20:3000')).toBe(true);
    expect(isHostAllowed('mybox.lan:3000', { host: 'mybox.lan' })).toBe(true);
    expect(isHostAllowed('anything', { allowedHosts: true })).toBe(true);
  });

  test('isOriginAllowed', () => {
    expect(isOriginAllowed(undefined)).toBe(true);
    expect(isOriginAllowed('http://evil.example')).toBe(false);
    expect(isOriginAllowed('null')).toBe(false);
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
  });
});
