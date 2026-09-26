/**
 * WebSocket routing: the handshake accepted any Origin (cross-site
 * WebSocket hijacking), each TCP chunk was parsed as exactly one frame (a
 * frame split across chunks, or a second frame in the same chunk, was
 * lost), and frames sent together with the handshake were dropped.
 */

import { describe, it, expect, afterEach } from 'vitest';
import net from 'node:net';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { SimpleRouter } from '../src/router.js';

/** A masked client-to-server frame. */
function clientFrame(text, { opcode = 0x1, fin = true } = {}) {
  const payload = Buffer.from(text);
  const mask = randomBytes(4);
  const masked = Buffer.from(payload.map((byte, i) => byte ^ mask[i & 3]));
  let header;
  if (payload.length < 126) {
    header = Buffer.from([(fin ? 0x80 : 0) | opcode, 0x80 | payload.length]);
  } else {
    header = Buffer.alloc(4);
    header[0] = (fin ? 0x80 : 0) | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }
  return Buffer.concat([header, mask, masked]);
}

function handshake({ origin, host = 'localhost' } = {}) {
  const lines = [
    'GET /chat HTTP/1.1',
    `Host: ${host}`,
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
    'Sec-WebSocket-Version: 13'
  ];
  if (origin) lines.push(`Origin: ${origin}`);
  return `${lines.join('\r\n')}\r\n\r\n`;
}

async function startWsServer(routerOptions = {}, routeOptions = {}) {
  const received = [];
  const router = new SimpleRouter({ enableWebSockets: true, ...routerOptions });
  router.addWebSocketRoute(
    '/chat',
    (ws) => {
      ws.onmessage = (event) => {
        received.push(event.data);
        ws.send(`echo:${event.data}`);
      };
    },
    routeOptions
  );
  const server = router.createServer();
  server.on('upgrade', (req, socket, head) => router.handleWebSocketUpgrade(req, socket, head));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, router, received, port: server.address().port };
}

/** Connect, send the handshake, and resolve with the status line. */
async function connect(port, options) {
  const socket = net.connect(port, '127.0.0.1');
  await once(socket, 'connect');
  const data = [];
  socket.on('data', (chunk) => data.push(chunk));
  socket.write(options?.withFirstFrame ? Buffer.concat([Buffer.from(handshake(options)), options.withFirstFrame]) : handshake(options));
  await waitFor(() => Buffer.concat(data).includes('\r\n\r\n') || socket.destroyed);
  const text = Buffer.concat(data).toString('latin1');
  return { socket, status: text.split('\r\n')[0], data };
}

async function waitFor(check, timeout = 1000) {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) return false;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return true;
}

describe('WebSocket routes', () => {
  let current;

  afterEach(async () => {
    if (current) {
      current.server.closeAllConnections?.();
      await new Promise((resolve) => current.server.close(resolve));
      current = undefined;
    }
  });

  it('rejects a cross-origin handshake by default', async () => {
    current = await startWsServer();

    const evil = await connect(current.port, { origin: 'https://evil.example' });
    const same = await connect(current.port, { origin: 'http://localhost' });
    const noOrigin = await connect(current.port, {});

    expect(evil.status).toBe('HTTP/1.1 403 Forbidden');
    expect(same.status).toBe('HTTP/1.1 101 Switching Protocols');
    expect(noOrigin.status).toBe('HTTP/1.1 101 Switching Protocols');
    for (const client of [evil, same, noOrigin]) client.socket.destroy();
  });

  it('honours allowedOrigins on the route and wsAllowedOrigins on the router', async () => {
    current = await startWsServer({ wsAllowedOrigins: ['https://app.example'] });

    const allowed = await connect(current.port, { origin: 'https://app.example' });
    const other = await connect(current.port, { origin: 'https://other.example' });

    expect(allowed.status).toBe('HTTP/1.1 101 Switching Protocols');
    expect(other.status).toBe('HTTP/1.1 403 Forbidden');
    allowed.socket.destroy();
    other.socket.destroy();

    await new Promise((resolve) => current.server.close(resolve));
    current = await startWsServer({}, { allowedOrigins: '*' });
    const any = await connect(current.port, { origin: 'https://anything.example' });
    expect(any.status).toBe('HTTP/1.1 101 Switching Protocols');
    any.socket.destroy();
  });

  it('reassembles a frame split across TCP chunks', async () => {
    current = await startWsServer();
    const { socket } = await connect(current.port);

    const frame = clientFrame('hello world');
    socket.write(frame.subarray(0, 3));
    await new Promise((resolve) => setTimeout(resolve, 20));
    socket.write(frame.subarray(3, 9));
    await new Promise((resolve) => setTimeout(resolve, 20));
    socket.write(frame.subarray(9));

    expect(await waitFor(() => current.received.length === 1)).toBe(true);
    expect(current.received).toEqual(['hello world']);
    socket.destroy();
  });

  it('delivers every frame of a chunk carrying several', async () => {
    current = await startWsServer();
    const { socket } = await connect(current.port);

    socket.write(Buffer.concat([clientFrame('one'), clientFrame('two'), clientFrame('x'.repeat(300))]));

    expect(await waitFor(() => current.received.length === 3)).toBe(true);
    expect(current.received).toEqual(['one', 'two', 'x'.repeat(300)]);
    socket.destroy();
  });

  it('delivers a frame sent together with the handshake', async () => {
    current = await startWsServer();
    const { socket } = await connect(current.port, { withFirstFrame: clientFrame('early') });

    expect(await waitFor(() => current.received.length === 1)).toBe(true);
    expect(current.received).toEqual(['early']);
    socket.destroy();
  });

  it('reassembles fragmented messages and answers pings', async () => {
    current = await startWsServer();
    const client = await connect(current.port);
    const before = Buffer.concat(client.data).length;

    client.socket.write(
      Buffer.concat([
        clientFrame('frag', { fin: false }),
        clientFrame('ping-body', { opcode: 0x9 }),
        clientFrame('mented', { opcode: 0x0 })
      ])
    );

    expect(await waitFor(() => current.received.length === 1)).toBe(true);
    expect(current.received).toEqual(['fragmented']);
    const sent = Buffer.concat(client.data).subarray(before);
    expect(sent[0]).toBe(0x8a); // FIN + pong
    expect(sent.subarray(2, 2 + sent[1]).toString()).toBe('ping-body');
    client.socket.destroy();
  });

  it('closes its side and forgets the connection when the client leaves without a close frame', async () => {
    current = await startWsServer();
    const { socket } = await connect(current.port);
    expect(await waitFor(() => current.router.getWebSocketConnections().length === 1)).toBe(true);

    socket.end();

    expect(await waitFor(() => current.router.getWebSocketConnections().length === 0)).toBe(true);
    expect(await waitFor(() => socket.readableEnded || socket.destroyed)).toBe(true);
    socket.destroy();
  });

  it('closes the connection when a frame exceeds wsMaxPayload', async () => {
    current = await startWsServer({ wsMaxPayload: 100 });
    const { socket } = await connect(current.port);

    socket.write(clientFrame('y'.repeat(200)));

    expect(await waitFor(() => socket.destroyed || socket.readableEnded)).toBe(true);
    expect(current.received).toEqual([]);
    socket.destroy();
  });
});
