/**
 * parseBody() decoded each chunk on its own, so a multibyte UTF-8 character
 * split across two chunks was corrupted, and a request stream that closed
 * before 'end' left handle() pending forever.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import net from 'node:net';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { SimpleRouter } from '../src/router.js';

function echoRouter(seen) {
  const router = new SimpleRouter();
  router.post('/echo', (req) => {
    seen.push(req.body);
    return { body: req.body };
  });
  return router;
}

function mockRes() {
  const res = { status: 0, body: '', setHeader() {}, getHeader() {} };
  res.writeHead = (status) => {
    res.status = status;
  };
  res.end = (data = '') => {
    res.body = data;
  };
  return res;
}

/** A POST request stream that yields `chunks` one by one. */
function streamReq(chunks, headers = {}) {
  const queue = [...chunks];
  const req = new Readable({
    read() {
      setImmediate(() => this.push(queue.length ? queue.shift() : null));
    }
  });
  req.method = 'POST';
  req.url = '/echo';
  req.headers = { 'content-type': 'application/json', ...headers };
  req.socket = { remoteAddress: '127.0.0.1' };
  return req;
}

describe('request body streaming', () => {
  let server;

  afterEach(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      server = undefined;
    }
  });

  it('decodes a multibyte character split across chunks', async () => {
    const payload = Buffer.from(JSON.stringify({ name: 'Zoë 日本' }));
    const cut = payload.indexOf(Buffer.from('ë')) + 1; // inside the 2-byte 'ë'
    const cut2 = payload.indexOf(Buffer.from('日')) + 2; // inside the 3-byte '日'
    const seen = [];

    const res = mockRes();
    await echoRouter(seen).handle(
      streamReq([payload.subarray(0, cut), payload.subarray(cut, cut2), payload.subarray(cut2)]),
      res,
      { rateLimit: false }
    );

    expect(res.status).toBe(200);
    expect(seen).toEqual([{ name: 'Zoë 日本' }]);
  });

  it('decodes a split character arriving over a real socket', async () => {
    const seen = [];
    const router = echoRouter(seen);
    server = router.createServer({ rateLimit: false });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    const payload = Buffer.from(JSON.stringify({ name: 'Zoë' }));
    const cut = payload.indexOf(Buffer.from('ë')) + 1;
    const reply = await new Promise((resolve) => {
      const socket = net.connect(server.address().port, '127.0.0.1', () => {
        socket.write(
          `POST /echo HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: ${payload.length}\r\nConnection: close\r\n\r\n`
        );
        socket.write(payload.subarray(0, cut));
        setTimeout(() => socket.write(payload.subarray(cut)), 30);
      });
      let data = '';
      socket.on('data', (chunk) => {
        data += chunk;
      });
      socket.on('end', () => resolve(data));
    });

    expect(reply).toContain('{"body":{"name":"Zoë"}}');
  });

  it('settles handle() when the request stream closes before the body ends', async () => {
    const seen = [];
    const req = new Readable({ read() {} });
    Object.assign(req, {
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      socket: { remoteAddress: '127.0.0.1' }
    });
    req.push('{"a":');
    setTimeout(() => req.destroy(), 20);

    const res = mockRes();
    const outcome = await Promise.race([
      echoRouter(seen).handle(req, res, { rateLimit: false }).then(() => 'settled'),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 1000))
    ]);

    expect(outcome).toBe('settled');
    expect(seen).toEqual([]);
  });

  it('settles handle() when a client aborts mid-body over a real socket', async () => {
    const seen = [];
    const router = echoRouter(seen);
    let settled = 0;
    server = createServer((req, res) => {
      router.handle(req, res, { rateLimit: false }).then(() => {
        settled++;
      });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    await new Promise((resolve) => {
      const socket = net.connect(server.address().port, '127.0.0.1', () => {
        socket.write('POST /echo HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{"a":');
        setTimeout(() => {
          socket.destroy();
          resolve();
        }, 30);
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(settled).toBe(1);
    expect(seen).toEqual([]);
  });

  it('rejects a declared oversized body with 413 before reading it', async () => {
    const res = mockRes();
    await echoRouter([]).handle(streamReq([], { 'content-length': String(2 * 1024 * 1024) }), res, { rateLimit: false });

    expect(res.status).toBe(413);
  });

  it('rejects an oversized streamed body with 413', async () => {
    const res = mockRes();
    const big = Buffer.alloc(600, 'a');
    await echoRouter([]).handle(streamReq([big, big]), res, { rateLimit: false, maxBodySize: 1000 });

    expect(res.status).toBe(413);
    expect(JSON.parse(res.body)).toEqual({ error: 'Request body too large' });
  });
});
