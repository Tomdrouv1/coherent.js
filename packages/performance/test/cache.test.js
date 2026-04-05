import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LRUCache, MemoryCache, MemoCache, RenderCache, createCache, memoize } from '../src/cache.js';

describe('LRUCache', () => {
  let cache;

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 3 });
  });

  it('stores and retrieves values', () => {
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts least recently used when at capacity', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // should evict 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('d')).toBe(4);
  });

  it('updates access order on get', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // access 'a', making 'b' the LRU
    cache.set('d', 4); // should evict 'b'
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
  });

  it('respects TTL expiration', () => {
    const ttlCache = new LRUCache({ maxSize: 10, ttl: 50 });
    ttlCache.set('x', 'value');
    expect(ttlCache.get('x')).toBe('value');

    vi.useFakeTimers();
    vi.advanceTimersByTime(100);
    expect(ttlCache.get('x')).toBeUndefined();
    vi.useRealTimers();
  });

  it('has() checks existence and TTL', () => {
    cache.set('a', 1);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('delete removes entries', () => {
    cache.set('a', 1);
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('clear removes all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('keys and values return correct data', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.keys()).toEqual(['a', 'b']);
    expect(cache.values()).toEqual([1, 2]);
  });

  it('getStats returns cache statistics', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(3);
    expect(stats.oldestKey).toBe('a');
    expect(stats.newestKey).toBe('b');
  });
});

describe('MemoryCache', () => {
  let cache;

  beforeEach(() => {
    cache = new MemoryCache({ maxSize: 3, strategy: 'lru' });
  });

  it('stores and retrieves values', () => {
    cache.set('a', 'value');
    expect(cache.get('a')).toBe('value');
  });

  it('tracks hits and misses', () => {
    cache.set('a', 1);
    cache.get('a'); // hit
    cache.get('b'); // miss
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('evicts with LRU strategy based on lastAccess time', async () => {
    // MemoryCache LRU uses lastAccess timestamp from metadata
    // We need time separation between accesses for reliable eviction
    vi.useFakeTimers();

    cache.set('a', 1);
    vi.advanceTimersByTime(10);
    cache.set('b', 2);
    vi.advanceTimersByTime(10);
    cache.set('c', 3);
    vi.advanceTimersByTime(10);

    // Access 'a' and 'c' so 'b' has the oldest lastAccess
    cache.get('a');
    vi.advanceTimersByTime(10);
    cache.get('c');
    vi.advanceTimersByTime(10);

    cache.set('d', 4); // should evict 'b' (oldest lastAccess)
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);

    vi.useRealTimers();
  });

  it('evicts with LFU strategy', () => {
    const lfuCache = new MemoryCache({ maxSize: 3, strategy: 'lfu' });
    lfuCache.set('a', 1);
    lfuCache.set('b', 2);
    lfuCache.set('c', 3);
    lfuCache.get('a'); // access a twice
    lfuCache.get('a');
    lfuCache.get('b'); // access b once
    lfuCache.set('d', 4); // should evict 'c' (least frequently used)
    expect(lfuCache.has('c')).toBe(false);
  });

  it('evicts with FIFO strategy', () => {
    const fifoCache = new MemoryCache({ maxSize: 3, strategy: 'fifo' });
    fifoCache.set('a', 1);
    fifoCache.set('b', 2);
    fifoCache.set('c', 3);
    fifoCache.set('d', 4); // should evict 'a' (first in)
    expect(fifoCache.has('a')).toBe(false);
  });

  it('respects per-entry TTL', () => {
    vi.useFakeTimers();
    cache.set('a', 1, { ttl: 50 });
    expect(cache.get('a')).toBe(1);
    vi.advanceTimersByTime(100);
    expect(cache.get('a')).toBeUndefined();
    vi.useRealTimers();
  });

  it('clear resets everything', () => {
    cache.set('a', 1);
    cache.get('a');
    cache.clear();
    const stats = cache.getStats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });
});

describe('MemoCache', () => {
  it('memoizes function results', () => {
    const memo = new MemoCache({ maxSize: 10 });
    const fn = vi.fn((x) => x * 2);
    const memoized = memo.memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(5)).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('caches based on different arguments', () => {
    const memo = new MemoCache({ maxSize: 10 });
    const fn = vi.fn((x) => x * 2);
    const memoized = memo.memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('supports custom key generator', () => {
    const memo = new MemoCache({
      maxSize: 10,
      keyGenerator: (obj) => obj.id
    });
    const fn = vi.fn((obj) => obj.name);
    const memoized = memo.memoize(fn);

    expect(memoized({ id: 1, name: 'Alice' })).toBe('Alice');
    expect(memoized({ id: 1, name: 'Bob' })).toBe('Alice'); // cached by id
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('clear resets cache', () => {
    const memo = new MemoCache({ maxSize: 10 });
    const fn = vi.fn((x) => x * 2);
    const memoized = memo.memoize(fn);

    memoized(5);
    memo.clear();
    memoized(5);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('RenderCache', () => {
  it('caches component renders by name and props', () => {
    const rc = new RenderCache({ maxSize: 10 });
    function MyComponent() {}
    const props = { color: 'red' };

    rc.set(MyComponent, props, '<div>red</div>');
    expect(rc.get(MyComponent, props)).toBe('<div>red</div>');
  });

  it('returns undefined for uncached renders', () => {
    const rc = new RenderCache({ maxSize: 10 });
    function MyComponent() {}
    expect(rc.get(MyComponent, {})).toBeUndefined();
  });

  it('differentiates by props', () => {
    const rc = new RenderCache({ maxSize: 10 });
    function MyComponent() {}
    rc.set(MyComponent, { a: 1 }, 'result1');
    rc.set(MyComponent, { a: 2 }, 'result2');
    expect(rc.get(MyComponent, { a: 1 })).toBe('result1');
    expect(rc.get(MyComponent, { a: 2 })).toBe('result2');
  });
});

describe('createCache', () => {
  it('creates LRU cache by default', () => {
    const c = createCache();
    expect(c).toBeInstanceOf(LRUCache);
  });

  it('creates MemoryCache', () => {
    expect(createCache('memory')).toBeInstanceOf(MemoryCache);
  });

  it('creates MemoCache', () => {
    expect(createCache('memo')).toBeInstanceOf(MemoCache);
  });

  it('creates RenderCache', () => {
    expect(createCache('render')).toBeInstanceOf(RenderCache);
  });
});

describe('memoize', () => {
  it('returns memoized function', () => {
    const fn = vi.fn((x) => x + 1);
    const memoized = memoize(fn);

    expect(memoized(1)).toBe(2);
    expect(memoized(1)).toBe(2);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
