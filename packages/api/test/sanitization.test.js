/**
 * withSanitization() rebuilt objects with `sanitized[key] = value`, so a
 * `__proto__` key became the prototype (req.body.isAdmin === true), and it
 * re-escaped existing entities: 'Tom & Jerry' became 'Tom &amp;amp; Jerry'
 * after two passes.
 */

import { describe, it, expect } from 'vitest';
import { withSanitization } from '../src/middleware.js';

function sanitize(input) {
  const req = { body: input.body, query: input.query ?? {}, params: input.params ?? {} };
  let nextCalls = 0;
  withSanitization()(req, {}, () => {
    nextCalls++;
  });
  expect(nextCalls).toBe(1);
  return req;
}

describe('withSanitization', () => {
  it('drops __proto__ instead of adopting it as the prototype', () => {
    const req = sanitize({ body: JSON.parse('{"name":"Ada","__proto__":{"isAdmin":true}}') });

    expect(req.body.isAdmin).toBeUndefined();
    expect(Object.getPrototypeOf(req.body)).toBe(Object.prototype);
    expect(req.body).toEqual({ name: 'Ada' });
  });

  it('drops constructor and prototype keys at every depth', () => {
    const req = sanitize({
      body: JSON.parse('{"a":{"constructor":{"prototype":{"x":1}}},"list":[{"__proto__":{"y":2},"ok":1}]}')
    });

    expect(req.body).toEqual({ a: {}, list: [{ ok: 1 }] });
    expect(req.body.list[0].y).toBeUndefined();
    expect({}.x).toBeUndefined();
  });

  it('escapes HTML once, and a second pass changes nothing', () => {
    const once = sanitize({ body: { name: 'Tom & Jerry', q: 'a < b', quote: `"it's"` } }).body;
    const twice = sanitize({ body: once }).body;

    expect(once).toEqual({ name: 'Tom &amp; Jerry', q: 'a &lt; b', quote: '&quot;it&#x27;s&quot;' });
    expect(twice).toEqual(once);
  });

  it('still escapes an ampersand that is not an entity', () => {
    const { body } = sanitize({ body: { a: 'AT&T', b: 'x &y z', c: '&#1234;', d: '&copy;' } });

    expect(body).toEqual({ a: 'AT&amp;T', b: 'x &amp;y z', c: '&#1234;', d: '&copy;' });
  });

  it('sanitizes query and params too, and leaves non-strings alone', () => {
    const when = new Date('2026-01-01T00:00:00Z');
    const req = sanitize({ body: { n: 1, flag: true, when }, query: { q: '<b>' }, params: { id: '"1"' } });

    expect(req.body.n).toBe(1);
    expect(req.body.flag).toBe(true);
    expect(req.body.when).toBe(when);
    expect(req.query.q).toBe('&lt;b&gt;');
    expect(req.params.id).toBe('&quot;1&quot;');
  });
});
