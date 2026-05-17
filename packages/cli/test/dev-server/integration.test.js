/**
 * Full dev server integration test
 *
 * Boots the orchestrator (HTTP + WS + watcher), connects a real ws
 * client, touches a real file, asserts the correct HMR message
 * arrives over the wire.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { startDevServer } from '../../src/dev-server/index.js';

function waitForMessage(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeListener('message', onMessage);
      reject(new Error(`timeout waiting for message after ${timeoutMs}ms`));
    }, timeoutMs);

    function onMessage(buf) {
      let data;
      try { data = JSON.parse(buf.toString()); } catch { return; }
      if (predicate(data)) {
        clearTimeout(timer);
        ws.removeListener('message', onMessage);
        resolve(data);
      }
    }
    ws.on('message', onMessage);
  });
}

function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

describe('startDevServer (integration)', () => {
  let root;
  let server;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'coherent-devsrv-'));
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><html><body><h1>hi</h1></body></html>');
    writeFileSync(join(root, 'src', 'app.js'), 'export const v = 1;');
  });

  afterEach(async () => {
    if (server) await server.close();
    rmSync(root, { recursive: true, force: true });
  });

  test('serves index.html with the HMR script injected', async () => {
    server = await startDevServer({ root, port: 0, host: '127.0.0.1', open: false, log: false });
    const res = await fetch(`http://127.0.0.1:${server.port}/`);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('__coherent_hmr_client.js');
  });

  test('broadcasts hmr-update when a watched file changes', async () => {
    server = await startDevServer({ root, port: 0, host: '127.0.0.1', open: false, log: false });

    const client = new WebSocket(`ws://127.0.0.1:${server.port}`);
    await waitForOpen(client);
    await waitForMessage(client, (d) => d.type === 'connected');

    const updatePromise = waitForMessage(client, (d) => d.type === 'hmr-update');

    // Touch the file *after* the watcher is ready (startDevServer awaits ready).
    writeFileSync(join(root, 'src', 'app.js'), 'export const v = 2;');

    const update = await updatePromise;
    expect(update.filePath).toBe(join(root, 'src', 'app.js'));
    expect(update.webPath).toBe('/src/app.js');
    expect(update.updateType).toBe('component');

    client.close();
  });

  test('close() shuts down HTTP, WS, and watcher cleanly', async () => {
    server = await startDevServer({ root, port: 0, host: '127.0.0.1', open: false, log: false });
    const port = server.port;
    await server.close();
    server = null;

    // Subsequent fetch should fail (connection refused).
    let errored = false;
    try {
      await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) });
    } catch {
      errored = true;
    }
    expect(errored).toBe(true);
  });
});
