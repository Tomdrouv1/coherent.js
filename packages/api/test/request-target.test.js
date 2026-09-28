/**
 * The router read pathname and query from url.parse(req.url, true), which
 * Node deprecates (DEP0169) and warns about on the first request. Its
 * replacement has to keep url.parse's reading of a request target: the WHATWG
 * URL parser resolves dot segments and reads `//host/x` as a host, so swapping
 * it in would let a raw path reach a route it never named. The expected values
 * below are what url.parse(target, true) returned.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { SimpleRouter } from '../src/router.js';
import { parseRequestTarget } from '../src/request-target.js';

describe('parseRequestTarget', () => {
  it.each([
    ['/users/42', '/users/42'],
    ['/users/42?x=1', '/users/42'],
    ['/path?q=1#frag', '/path'],
    ['//evil.com/x', '//evil.com/x'],
    ['/a/../b', '/a/../b'],
    ['/a/./b', '/a/./b'],
    ['/%2e%2e/x', '/%2e%2e/x'],
    ['/users/caf%C3%A9', '/users/caf%C3%A9'],
    ['/a\\b?x=\\', '/a/b'],
    ['http://host/abs?x=1', '/abs'],
    ['HTTP://Host:8080/p', '/p'],
    ['http://host', '/'],
    ['http://host?x=1', '/'],
    ['*', '*'],
    ['', null],
  ])('reads the pathname of %j as %j', (target, pathname) => {
    expect(parseRequestTarget(target).pathname).toBe(pathname);
  });

  it('parses the query as querystring does', () => {
    const { query } = parseRequestTarget(
      '/s?q=a+b&tag=x&tag=y&empty=&flag&x=\\#h'
    );
    expect({ ...query }).toEqual({
      q: 'a b',
      tag: ['x', 'y'],
      empty: '',
      flag: '',
      x: '\\',
    });
  });

  it('gives the query no prototype, so keys cannot reach Object.prototype', () => {
    const { query } = parseRequestTarget('/s?__proto__=polluted&toString=1');
    expect(Object.getPrototypeOf(query)).toBe(null);
    expect(Object.hasOwn(query, '__proto__')).toBe(true);
    expect(query.toString).toBe('1');
    expect({}.polluted).toBeUndefined();
  });

  it('gives an empty query when there is none', () => {
    expect({ ...parseRequestTarget('/s').query }).toEqual({});
  });
});

const modes = [
  ['compiled', {}],
  ['uncompiled', { enableCompilation: false }],
];

describe.each(modes)('router request targets (%s)', (_mode, options) => {
  const send = async (router, url) => {
    let status = 200;
    let body;
    const res = {
      setHeader() {},
      getHeader() {},
      writeHead(code) {
        status = code;
      },
      end(data) {
        body = data === undefined ? undefined : JSON.parse(data);
      },
    };
    await router.handle(
      { method: 'GET', url, headers: {}, socket: { remoteAddress: '::1' } },
      res,
      { rateLimit: false }
    );
    return { status, body };
  };

  it('does not read //host/x as the path /x', async () => {
    const r = new SimpleRouter(options);
    r.get('/x', () => ({ reached: true }));
    expect((await send(r, '//evil.com/x')).status).toBe(404);
    expect((await send(r, '/x')).body).toEqual({ reached: true });
  });

  it('does not resolve dot segments into another route', async () => {
    const r = new SimpleRouter(options);
    r.get('/admin', () => ({ reached: true }));
    expect((await send(r, '/public/../admin')).status).toBe(404);
  });

  it('routes an absolute-form target by its path', async () => {
    const r = new SimpleRouter(options);
    r.get('/abs', (req) => ({ x: req.query.x }));
    expect((await send(r, 'http://host/abs?x=1')).body).toEqual({ x: '1' });
  });

  it('delivers repeated query keys as an array', async () => {
    const r = new SimpleRouter(options);
    r.get('/s', (req) => ({ tag: req.query.tag }));
    expect((await send(r, '/s?tag=a&tag=b')).body).toEqual({ tag: ['a', 'b'] });
  });
});

describe('deprecation', () => {
  // Node emits a deprecation once per process, so check in a fresh one, where
  // --throw-deprecation turns the warning into a failing exit.
  it('handles a request without a deprecation warning', () => {
    const router = new URL('../src/router.js', import.meta.url).href;
    const script = `
      const { SimpleRouter } = await import(${JSON.stringify(router)});
      const r = new SimpleRouter();
      r.get('/s', (req) => ({ q: req.query.q }));
      let body;
      const res = { setHeader() {}, getHeader() {}, writeHead() {}, end(data) { body = data; } };
      await r.handle({ method: 'GET', url: '/s?q=1', headers: {}, socket: { remoteAddress: '::1' } }, res, { rateLimit: false });
      process.stdout.write(body);
    `;
    const out = execFileSync(
      process.execPath,
      ['--throw-deprecation', '--input-type=module', '-e', script],
      { encoding: 'utf8' }
    );
    expect(JSON.parse(out)).toEqual({ q: '1' });
  });
});
