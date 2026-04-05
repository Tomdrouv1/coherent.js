import { describe, test, assert } from 'vitest';
import { createCacheManager } from '../src/performance/cache-manager.js';

describe('Cache Key Generation Benchmark', () => {
  const cache = createCacheManager();
  
  const complexComponent = {
    div: {
      className: 'container',
      children: Array.from({ length: 100 }, (_, i) => ({
        section: {
          id: `section-${i}`,
          children: [
            { h2: { text: `Section ${i}` } },
            { p: { text: 'Some long text content that repeated many times in this component tree to make it large enough for JSON.stringify to be slow.' } },
            { 
              ul: {
                children: Array.from({ length: 10 }, (_, j) => ({
                  li: { text: `Item ${i}-${j}`, className: j % 2 === 0 ? 'even' : 'odd' }
                }))
              }
            }
          ]
        }
      }))
    }
  };
  
  const props = {
    user: { id: 1, name: 'John Doe', roles: ['admin', 'editor'] },
    settings: { theme: 'dark', notifications: true, lang: 'en-US' },
    data: Array.from({ length: 50 }, (_, i) => ({ id: i, value: Math.random() }))
  };
  
  const context = {
    requestId: 'req-123456',
    timestamp: Date.now(),
    config: { apiVersion: 'v1', baseUrl: 'https://api.example.com' }
  };

  test('Benchmark current JSON.stringify performance', () => {
    const iterations = 1000;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      cache.generateCacheKey(complexComponent, props, context);
    }
    
    const end = performance.now();
    const duration = end - start;
    console.log(`Optimized key generation took ${duration.toFixed(2)}ms for ${iterations} iterations (${(duration / iterations).toFixed(4)}ms per op)`);
    
    assert.ok(true);
  });

  test('Verify cache key consistency and collisions', () => {
    const key1 = cache.generateCacheKey({ div: { text: 'a' } }, { id: 1 });
    const key2 = cache.generateCacheKey({ div: { text: 'a' } }, { id: 1 });
    const key3 = cache.generateCacheKey({ div: { text: 'b' } }, { id: 1 });
    const key4 = cache.generateCacheKey({ div: { text: 'a' } }, { id: 2 });
    
    assert.strictEqual(key1, key2, 'Same component and props should produce same key');
    assert.notStrictEqual(key1, key3, 'Different component should produce different key');
    assert.notStrictEqual(key1, key4, 'Different props should produce different key');
    
    // Test with functions
    const fn1 = () => ({ div: '1' });
    const fn2 = () => ({ div: '1' });
    const keyFn1 = cache.generateCacheKey(fn1, { id: 1 });
    const keyFn2 = cache.generateCacheKey(fn1, { id: 1 });
    const keyFn3 = cache.generateCacheKey(fn2, { id: 1 });
    
    assert.strictEqual(keyFn1, keyFn2, 'Same function instance should produce same key');
    // If they have same name, they might produce same key if anonymous, but let's check
    if (fn1.name && fn1.name !== fn2.name) {
       assert.notStrictEqual(keyFn1, keyFn3, 'Different named functions should produce different keys');
    }
  });

  test('Verify deep object hashing', () => {
    const obj1 = { a: { b: { c: { d: 1 } } } };
    const obj2 = { a: { b: { c: { d: 1 } } } };
    const obj3 = { a: { b: { c: { d: 2 } } } };
    
    const h1 = cache.hashObject(obj1);
    const h2 = cache.hashObject(obj2);
    const h3 = cache.hashObject(obj3);
    
    assert.strictEqual(h1, h2, 'Deeply identical objects should have same hash');
    assert.notStrictEqual(h1, h3, 'Deeply different objects should have different hash');
  });
});
