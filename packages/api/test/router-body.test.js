/**
 * Tests for request body parsing in the object router.
 *
 * The body goes through stripUnsafeKeys(), which is private, so these
 * exercise it end-to-end through router.handle().
 */

import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { createRouter } from '../src/router.js';

/** Build a router whose single route captures req.body and hands it back. */
function createEchoRouter() {
  const seen = {};
  const router = createRouter({
    echo: {
      post: {
        path: '/echo',
        handler: (req) => {
          seen.body = req.body;
          return { ok: true };
        },
      },
    },
  });
  return { router, seen };
}

function createBodyReq(raw) {
  const req = new Readable({
    read() {
      this.push(raw);
      this.push(null);
    },
  });
  req.method = 'POST';
  req.url = '/echo';
  req.headers = { 'content-type': 'application/json' };
  req.connection = { remoteAddress: '127.0.0.1' };
  return req;
}

function createMockRes() {
  return { setHeader() {}, writeHead() {}, end() {} };
}

/** POST `payload` as JSON and return whatever the handler saw as req.body. */
async function postBody(payload) {
  const { router, seen } = createEchoRouter();
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  await router.handle(createBodyReq(raw), createMockRes(), {});
  return seen.body;
}

describe('router request body parsing', () => {
  it('preserves arrays as arrays', async () => {
    const body = await postBody({ tags: ['alpha', 'beta'] });

    expect(Array.isArray(body.tags)).toBe(true);
    expect(body.tags).toEqual(['alpha', 'beta']);
  });

  it('preserves arrays nested inside objects', async () => {
    const body = await postBody({ nested: { list: [1, 2, 3] } });

    expect(Array.isArray(body.nested.list)).toBe(true);
    expect(body.nested.list).toEqual([1, 2, 3]);
  });

  it('preserves objects nested inside arrays', async () => {
    const body = await postBody({ users: [{ name: 'ada' }, { name: 'grace' }] });

    expect(body.users).toEqual([{ name: 'ada' }, { name: 'grace' }]);
  });

  it('leaves string values byte-for-byte intact', async () => {
    const strings = {
      scheme: 'I love javascript: the language',
      word: 'the onset= of winter',
      markup: 'compare <script> and </script > in the docs',
      unicode: 'naïve café — 日本語',
    };

    const body = await postBody(strings);

    expect(body).toEqual(strings);
  });

  it('preserves primitive types', async () => {
    const body = await postBody({ n: 42, f: 1.5, t: true, f2: false, nil: null });

    expect(body).toEqual({ n: 42, f: 1.5, t: true, f2: false, nil: null });
  });

  it('drops __proto__ without reassigning the body prototype', async () => {
    const body = await postBody('{"__proto__":{"polluted":"yes"},"ok":1}');

    expect(body.polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(body)).toBe(Object.prototype);
    expect(body.ok).toBe(1);
  });

  it('drops constructor and prototype keys', async () => {
    const body = await postBody('{"constructor":{"prototype":{"p":1}},"prototype":{"q":2},"ok":1}');

    expect(Object.hasOwn(body, 'constructor')).toBe(false);
    expect(Object.hasOwn(body, 'prototype')).toBe(false);
    expect({}.p).toBeUndefined();
    expect({}.q).toBeUndefined();
    expect(body.ok).toBe(1);
  });

  it('strips unsafe keys at every depth, including through arrays', async () => {
    const body = await postBody('{"items":[{"__proto__":{"bad":1},"keep":"me"}]}');

    expect({}.bad).toBeUndefined();
    expect(body.items[0]).toEqual({ keep: 'me' });
  });

  it('keeps double-underscore keys that are not prototype-polluting', async () => {
    const body = await postBody({ __typename: 'User', __v: 3 });

    expect(body.__typename).toBe('User');
    expect(body.__v).toBe(3);
  });

  it('returns an empty body for a non-JSON content type', async () => {
    const { router, seen } = createEchoRouter();
    const req = createBodyReq('name=ada');
    req.headers = { 'content-type': 'application/x-www-form-urlencoded' };

    await router.handle(req, createMockRes(), {});

    expect(seen.body).toEqual({});
  });
});
