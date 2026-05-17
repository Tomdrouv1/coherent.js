/**
 * Static file handler tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticHandler } from '../../src/dev-server/static-handler.js';

async function startServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}`,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

async function fetchText(url) {
  const res = await fetch(url);
  return { status: res.status, contentType: res.headers.get('content-type'), text: await res.text() };
}

describe('createStaticHandler', () => {
  let root;
  let server;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'coherent-sh-'));
  });

  afterEach(async () => {
    if (server) await server.stop();
    rmSync(root, { recursive: true, force: true });
  });

  test('serves a JS file with text/javascript', async () => {
    writeFileSync(join(root, 'app.js'), 'export const x = 1;');
    server = await startServer(createStaticHandler({ root }));

    const { status, contentType, text } = await fetchText(`${server.base}/app.js`);
    expect(status).toBe(200);
    expect(contentType).toMatch(/text\/javascript|application\/javascript/);
    expect(text).toContain('export const x = 1');
  });

  test('serves an HTML file with the HMR client bootstrap script injected before </body>', async () => {
    writeFileSync(join(root, 'index.html'), '<!doctype html><html><body><h1>hi</h1></body></html>');
    server = await startServer(createStaticHandler({ root }));

    const { status, contentType, text } = await fetchText(`${server.base}/index.html`);
    expect(status).toBe(200);
    expect(contentType).toMatch(/text\/html/);
    expect(text).toMatch(/<script[^>]+src="\/__coherent_hmr_client\.js"[^>]*><\/script>/);
    expect(text.indexOf('__coherent_hmr_client')).toBeLessThan(text.indexOf('</body>'));
  });

  test('does not inject the bootstrap twice if already present', async () => {
    const html = '<!doctype html><html><body><script src="/__coherent_hmr_client.js"></script></body></html>';
    writeFileSync(join(root, 'index.html'), html);
    server = await startServer(createStaticHandler({ root }));

    const { text } = await fetchText(`${server.base}/index.html`);
    const matches = text.match(/__coherent_hmr_client\.js/g) || [];
    expect(matches.length).toBe(1);
  });

  test('serves /__coherent_hmr_client.js with a tiny bootstrap that imports the client HMR module', async () => {
    server = await startServer(createStaticHandler({ root }));

    const { status, contentType, text } = await fetchText(`${server.base}/__coherent_hmr_client.js`);
    expect(status).toBe(200);
    expect(contentType).toMatch(/text\/javascript|application\/javascript/);
    expect(text).toContain('@coherent.js/client');
    expect(text).toContain('hmrClient');
    expect(text).toContain('initialize');
  });

  test('serves / as /index.html when an index.html exists in the root', async () => {
    writeFileSync(join(root, 'index.html'), '<!doctype html><html><body>root</body></html>');
    server = await startServer(createStaticHandler({ root }));

    const { status, text } = await fetchText(`${server.base}/`);
    expect(status).toBe(200);
    expect(text).toContain('root');
  });

  test('returns 404 for paths that do not resolve to a file in root', async () => {
    server = await startServer(createStaticHandler({ root }));

    const { status } = await fetchText(`${server.base}/no-such-file.txt`);
    expect(status).toBe(404);
  });

  test('refuses path traversal (does not serve files outside root)', async () => {
    writeFileSync(join(root, 'safe.txt'), 'safe');
    // Write a file in the temp parent that shouldn't be reachable
    const sibling = join(tmpdir(), `coherent-sh-sibling-${Date.now()}.txt`);
    writeFileSync(sibling, 'secret');
    try {
      server = await startServer(createStaticHandler({ root }));
      const { status } = await fetchText(`${server.base}/../coherent-sh-sibling-${sibling.split('coherent-sh-sibling-')[1]}`);
      expect(status).toBe(404);
    } finally {
      rmSync(sibling, { force: true });
    }
  });
});
