/**
 * Route pattern compilation bugs found by the audit:
 * - the regex escape never escaped anything, so `.` matched any character;
 * - `/users/:id/*` swapped `id` and `splat`;
 * - `:id?` was read as a parameter named `id?`, so optional params never
 *   matched their absence;
 * - parameters were not URL-decoded.
 * Both matching modes (compiled and `enableCompilation: false`) are checked.
 */

import { describe, it, expect } from 'vitest';
import { SimpleRouter } from '../src/router.js';

const modes = [
  ['compiled', {}],
  ['uncompiled', { enableCompilation: false }]
];

describe.each(modes)('route matching (%s)', (_mode, options) => {
  const router = () => new SimpleRouter(options);

  it('matches a literal dot only as a dot', () => {
    const r = router();
    r.get('/files/report.pdf', () => ({}));
    r.get('/v1.0/:name', () => ({}));

    expect(r.testRoute('GET', '/files/report.pdf').matched).toBe(true);
    expect(r.testRoute('GET', '/files/reportXpdf').matched).toBe(false);
    expect(r.testRoute('GET', '/v1.0/x').params).toEqual({ name: 'x' });
    expect(r.testRoute('GET', '/v1x0/x').matched).toBe(false);
  });

  it('escapes other regex metacharacters in literal segments', () => {
    const r = router();
    r.get('/a+b/:id', () => ({}));
    r.get('/c$/(x)/:id', () => ({}));

    expect(r.testRoute('GET', '/a+b/1').params).toEqual({ id: '1' });
    expect(r.testRoute('GET', '/aab/1').matched).toBe(false);
    expect(r.testRoute('GET', '/c$/(x)/2').params).toEqual({ id: '2' });
  });

  it('assigns a parameter and a following wildcard to the right names', () => {
    const r = router();
    r.get('/users/:id/*', () => ({}));
    r.get('/files/:bucket/**', () => ({}));

    expect(r.testRoute('GET', '/users/42/avatar').params).toEqual({ id: '42', splat: 'avatar' });
    expect(r.testRoute('GET', '/files/b1/a/b/c.txt').params).toEqual({ bucket: 'b1', splat: 'a/b/c.txt' });
  });

  it('matches an optional parameter when it is absent', () => {
    const r = router();
    r.get('/opt/:id?', () => ({}));
    r.get('/search/:query?/:page(\\d+)?', () => ({}));

    expect(r.testRoute('GET', '/opt').params).toEqual({});
    expect(r.testRoute('GET', '/opt/5').params).toEqual({ id: '5' });
    expect(r.testRoute('GET', '/search').params).toEqual({});
    expect(r.testRoute('GET', '/search/cats/2').params).toEqual({ query: 'cats', page: '2' });
    expect(r.testRoute('GET', '/search/cats/two').matched).toBe(false);
  });

  it('applies constraints', () => {
    const r = router();
    r.get('/users/:id(\\d+)', () => ({}));
    r.get('/export.:format(json|csv)', () => ({}));

    expect(r.testRoute('GET', '/users/12').params).toEqual({ id: '12' });
    expect(r.testRoute('GET', '/users/abc').matched).toBe(false);
    expect(r.testRoute('GET', '/export.csv').params).toEqual({ format: 'csv' });
    expect(r.testRoute('GET', '/export.xml').matched).toBe(false);
  });

  it('reads two parameters in one segment', () => {
    const r = router();
    r.get('/range/:from-:to', () => ({}));

    expect(r.testRoute('GET', '/range/1-9').params).toEqual({ from: '1', to: '9' });
  });

  it('URL-decodes parameters and keeps malformed escapes as sent', () => {
    const r = router();
    r.get('/p/:name', () => ({}));

    expect(r.testRoute('GET', '/p/John%20Doe').params).toEqual({ name: 'John Doe' });
    expect(r.testRoute('GET', '/p/caf%C3%A9').params).toEqual({ name: 'café' });
    expect(r.testRoute('GET', '/p/a%2Fb').params).toEqual({ name: 'a/b' });
    expect(r.testRoute('GET', '/p/100%').params).toEqual({ name: '100%' });
  });

  it('delivers decoded params to the handler', async () => {
    const r = router();
    r.get('/p/:name', (req) => ({ name: req.params.name }));

    let body;
    const res = { setHeader() {}, getHeader() {}, writeHead() {}, end(data) { body = JSON.parse(data); } };
    await r.handle({ method: 'GET', url: '/p/John%20Doe', headers: {}, socket: { remoteAddress: '::1' } }, res, { rateLimit: false });

    expect(body).toEqual({ name: 'John Doe' });
  });
});

describe('route compilation stays linear', () => {
  it('compiles a pathological pattern quickly', () => {
    const r = new SimpleRouter();
    const pattern = `/${':a('.repeat(20_000)}`;

    const started = Date.now();
    r.compileRoute(pattern);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
