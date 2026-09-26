import { describe, it, expect, beforeEach } from 'vitest';
import { render, dangerouslySetInnerContent } from '../src/index.js';
import { getCache, resetCache } from '../src/rendering/html-renderer.js';
import { createCacheManager } from '../src/performance/cache-manager.js';

describe('render cache', () => {
  beforeEach(() => {
    resetCache();
  });

  describe('default settings', () => {
    it('keeps rendering after a string-shorthand element', () => {
      // A shorthand element used to be stored under the key 'static'; every
      // later static element then read that entry and rendered `undefined`.
      expect(render({ span: 'hello' })).toBe('<span>hello</span>');
      expect(render({ div: { text: 'x' } })).toBe('<div>x</div>');
      expect(render({ p: { text: 'still here' } })).toBe('<p>still here</p>');
    });

    it('renders a full page containing a shorthand <title>, repeatedly', () => {
      const page = {
        html: {
          children: [
            { head: { children: [{ title: 'My page' }] } },
            { body: { children: [{ h1: { text: 'Hi' } }] } }
          ]
        }
      };
      const expected = '<html><head><title>My page</title></head><body><h1>Hi</h1></body></html>';

      expect(render(page)).toBe(expected);
      expect(render(page)).toBe(expected);
    });

    it('does not cache unless asked to', () => {
      render({ div: { text: 'a' } });
      render({ div: { children: [{ span: 'b' }] } });

      expect(getCache().getStats().entries).toBe(0);
    });
  });

  describe('enableCache: true', () => {
    it('never serves one element\'s HTML for another', () => {
      // Props whose names fail the tag-name pattern (data_id, x-on:click,
      // @click) used to drop out of the key, so these all collided.
      const pairs = [
        [{ div: { data_id: '1', text: 'secret-for-user-1' } }, { div: { data_id: '2', text: 'user-2' } }],
        [{ div: { 'x-on:click': 'go', text: 'Hello Alice' } }, { div: { 'x-on:click': 'go', text: 'Hello Bob' } }],
        [{ button: { '@click': 'go', text: 'A' } }, { button: { '@click': 'go', text: 'B' } }]
      ];

      for (const [first, second] of pairs) {
        const a = render(first, { enableCache: true });
        const b = render(second, { enableCache: true });
        expect(b).not.toBe(a);
        expect(b).toBe(render(second));
      }
    });

    it('distinguishes values JSON.stringify would conflate', () => {
      const date = new Date('2026-01-02T03:04:05Z');
      const cases = [
        [{ p: { text: date } }, { p: { text: date.toISOString() } }],
        [{ p: { text: NaN } }, { p: { text: null } }],
        [{ p: { text: dangerouslySetInnerContent('<b>x</b>') } }, { p: { text: { __trusted: true, __html: '<b>x</b>' } } }]
      ];

      for (const [first, second] of cases) {
        expect(render(first, { enableCache: true })).toBe(render(first));
        expect(render(second, { enableCache: true })).toBe(render(second));
      }
    });

    it('serves identical trees from the cache', () => {
      const tree = { ul: { children: [1, 2, 3].map((n) => ({ li: { text: `item ${n}` } })) } };
      const first = render(tree, { enableCache: true });
      const before = getCache().getStats().hits;

      expect(render(JSON.parse(JSON.stringify(tree)), { enableCache: true })).toBe(first);
      expect(getCache().getStats().hits).toBe(before + 1);
    });

    it('does not cache trees whose output depends on functions', () => {
      let n = 0;
      const tree = () => ({ div: { children: [() => ({ span: { text: String(++n) } })] } });

      expect(render(tree(), { enableCache: true })).toBe('<div><span>1</span></div>');
      expect(render(tree(), { enableCache: true })).toBe('<div><span>2</span></div>');
      expect(getCache().getStats().entries).toBe(0);
    });

    it('stays bounded while rendering many distinct trees', () => {
      const cache = createCacheManager({ maxCacheSize: 50 });
      for (let i = 0; i < 500; i++) {
        render({ div: { text: `page ${i}` } }, { enableCache: true, cache });
      }

      expect(cache.getStats().entries).toBe(50);
    });
  });
});

describe('createCacheManager', () => {
  it('evicts least recently used entries beyond maxCacheSize', () => {
    const cache = createCacheManager({ maxCacheSize: 3 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // a is now the most recently used
    cache.set('d', 4);

    expect(cache.get('b')).toBeNull();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
    expect(cache.getStats().entries).toBe(3);
  });

  it('accepts maxSize as an alias for maxCacheSize', () => {
    const cache = createCacheManager({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.getStats().entries).toBe(2);
  });

  it('keeps statistics bounded when called with unknown types', () => {
    const cache = createCacheManager();
    for (let i = 0; i < 100; i++) {
      cache.get(`key-${i}`, `not-a-type-${i}`);
    }

    expect(Object.keys(cache.getStats().accessCount)).toEqual(['static', 'component', 'template', 'data']);
  });

  it('honours a per-entry TTL', async () => {
    const cache = createCacheManager({ ttlMs: 60_000 });
    cache.set('short', 'v', 'component', { ttlMs: 1 });
    cache.set('long', 'v');
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(cache.get('short')).toBeNull();
    expect(cache.get('long')).toBe('v');
  });

  it('only releases the memory of the type it clears', () => {
    const cache = createCacheManager();
    cache.set('a', 'x'.repeat(100), 'static');
    cache.set('b', 'y'.repeat(100), 'data');
    const before = cache.memoryUsage;
    cache.clear('static');

    expect(cache.memoryUsage).toBeGreaterThan(0);
    expect(cache.memoryUsage).toBeLessThan(before);
    expect(cache.get('b', 'data')).toBe('y'.repeat(100));
  });
});
