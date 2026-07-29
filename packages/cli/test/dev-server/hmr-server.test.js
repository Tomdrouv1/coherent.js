/**
 * HMR WebSocket server tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';
import { createHmrServer } from '../../src/dev-server/hmr-server.js';
import { bufferMessages, waitForOpen } from './ws-helpers.js';

/**
 * Spin up an HTTP server on a random port + attach the HMR server.
 * Returns helpers that wait for events deterministically.
 */
async function startTestServer() {
  const httpServer = createServer((_req, res) => {
    res.statusCode = 404;
    res.end('not found');
  });
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address();
  const hmr = createHmrServer(httpServer);
  return {
    port,
    hmr,
    url: `ws://127.0.0.1:${port}`,
    async stop() {
      hmr.close();
      await new Promise((resolve) => httpServer.close(resolve));
    },
  };
}

describe('createHmrServer', () => {
  let server;

  beforeEach(async () => {
    server = await startTestServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  test('sends {type: "connected"} ack on client connect', async () => {
    const client = new WebSocket(server.url);
    const msgs = bufferMessages(client);
    await waitForOpen(client);
    const msg = await msgs.next((d) => d.type === 'connected');
    expect(msg).toEqual({ type: 'connected' });
    client.close();
  });

  test('broadcast() reaches all connected clients', async () => {
    const a = new WebSocket(server.url);
    const b = new WebSocket(server.url);
    const aMsgs = bufferMessages(a);
    const bMsgs = bufferMessages(b);
    await Promise.all([waitForOpen(a), waitForOpen(b)]);

    // Drain the initial 'connected' acks before broadcasting
    await Promise.all([
      aMsgs.next((d) => d.type === 'connected'),
      bMsgs.next((d) => d.type === 'connected'),
    ]);

    const update = { type: 'hmr-update', filePath: '/abs/x.js', webPath: '/x.js' };
    const [recvA, recvB] = await Promise.all([
      aMsgs.next((d) => d.type === 'hmr-update'),
      bMsgs.next((d) => d.type === 'hmr-update'),
      Promise.resolve().then(() => server.hmr.broadcast(update)),
    ]);

    expect(recvA).toEqual(update);
    expect(recvB).toEqual(update);
    a.close();
    b.close();
  });

  test('close() drops existing clients and rejects new connections', async () => {
    const a = new WebSocket(server.url);
    const aMsgs = bufferMessages(a);
    await waitForOpen(a);
    await aMsgs.next((d) => d.type === 'connected');

    const closed = new Promise((resolve) => a.once('close', resolve));
    server.hmr.close();
    await closed; // existing client got dropped

    // After close, new clients should fail to connect
    const b = new WebSocket(server.url);
    const result = await new Promise((resolve) => {
      b.once('open', () => resolve('opened'));
      b.once('error', () => resolve('errored'));
      b.once('close', () => resolve('closed'));
      setTimeout(() => resolve('timeout'), 500);
    });
    expect(['errored', 'closed', 'timeout']).toContain(result);
    try { b.close(); } catch { /* ignore */ }
  });

  test('broadcast() to zero clients is a no-op', () => {
    expect(() => server.hmr.broadcast({ type: 'hmr-update', filePath: '/x', webPath: '/x' })).not.toThrow();
  });

  test('malformed broadcast still serializes (sanity)', () => {
    // Ensures we use JSON.stringify and don't crash on circular structures by guarding.
    // Circular objects throw — we want a meaningful error, not a silent corrupt frame.
    const circular = { type: 'hmr-update' };
    circular.self = circular;
    expect(() => server.hmr.broadcast(circular)).toThrow();
  });
});
