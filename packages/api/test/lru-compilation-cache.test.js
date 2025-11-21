import { describe, it, expect, beforeEach } from 'vitest';
import { createRouter } from '../src/index.js';

describe('LRU Route Compilation Cache', () => {
  let router;

  beforeEach(() => {
    router = createRouter(null, {
      enableMetrics: true,
      maxCompilationCacheSize: 3 // Small cache for testing LRU behavior
    });
  });

  describe('LRU Cache Behavior', () => {
    it('should implement LRU eviction when cache is full', () => {
      // Fill cache beyond capacity
      router.compileRoute('/route1');
      router.compileRoute('/route2');
      router.compileRoute('/route3');
      router.compileRoute('/route4'); // Should evict /route1

      expect(router.routeCompilationCache.size).toBe(3);
      expect(router.routeCompilationCache.has('/route1')).toBe(false);
      expect(router.routeCompilationCache.has('/route2')).toBe(true);
      expect(router.routeCompilationCache.has('/route3')).toBe(true);
      expect(router.routeCompilationCache.has('/route4')).toBe(true);
    });

    it('should move accessed items to end (most recently used)', () => {
      // Fill cache
      router.compileRoute('/route1');
      router.compileRoute('/route2');
      router.compileRoute('/route3');

      // Access /route1 to make it most recently used
      router.compileRoute('/route1');

      // Add new item to trigger eviction
      router.compileRoute('/route4');

      // /route2 should be evicted (least recently used)
      expect(router.routeCompilationCache.size).toBe(3);
      expect(router.routeCompilationCache.has('/route1')).toBe(true); // Still there (accessed)
      expect(router.routeCompilationCache.has('/route2')).toBe(false); // Evicted
      expect(router.routeCompilationCache.has('/route3')).toBe(true);
      expect(router.routeCompilationCache.has('/route4')).toBe(true);
    });

    it('should track compilation hits for cache performance', () => {
      // Compile route (miss)
      router.compileRoute('/users/:id');
      expect(router.metrics.compilationHits).toBe(0);

      // Compile same route again (hit)
      router.compileRoute('/users/:id');
      expect(router.metrics.compilationHits).toBe(1);

      // Compile same route again (hit)
      router.compileRoute('/users/:id');
      expect(router.metrics.compilationHits).toBe(2);
    });

    it('should respect custom cache size configuration', () => {
      const customRouter = createRouter(null, {
        maxCompilationCacheSize: 5
      });

      // Fill cache to custom capacity
      for (let i = 1; i <= 7; i++) {
        customRouter.compileRoute(`/route${i}`);
      }

      expect(customRouter.routeCompilationCache.size).toBe(5);
      expect(customRouter.routeCompilationCache.has('/route1')).toBe(false);
      expect(customRouter.routeCompilationCache.has('/route2')).toBe(false);
      expect(customRouter.routeCompilationCache.has('/route7')).toBe(true);
    });
  });

  describe('Cache Performance Benefits', () => {
    it('should improve performance for repeated route patterns', () => {
      const startTime = Date.now();

      // First compilation (cache miss)
      const result1 = router.compileRoute('/users/:id/posts/:postId');
      const _firstTime = Date.now() - startTime;

      // Second compilation (cache hit)
      const hitStartTime = Date.now();
      const result2 = router.compileRoute('/users/:id/posts/:postId');
      const _secondTime = Date.now() - hitStartTime;

      // Results should be identical
      expect(result1.regex).toEqual(result2.regex);
      expect(result1.paramNames).toEqual(result2.paramNames);

      // Cache hit should be tracked
      expect(router.metrics.compilationHits).toBe(1);

      // Both compiled routes should be identical objects
      expect(result1).toBe(result2); // Same object from cache
    });

    it('should handle complex route patterns efficiently', () => {
      const performanceRouter = createRouter(null, {
        enableMetrics: true,
        maxCompilationCacheSize: 10 // Larger cache for this test
      });

      const complexPatterns = [
        '/api/v1/users/:id/profile',
        '/api/v1/users/:id/posts/:postId/comments/:commentId',
        '/files/:category/**',
        '/search/:query?/:page?/:limit?',
        '/admin/users/:id/edit'
      ];

      // First pass (cache misses)
      complexPatterns.forEach(pattern => {
        const result = performanceRouter.compileRoute(pattern);
        expect(result.regex).toBeInstanceOf(RegExp);
        expect(result.paramNames.length).toBeGreaterThan(0);
      });

      expect(performanceRouter.routeCompilationCache.size).toBe(5);
      expect(performanceRouter.metrics.compilationHits).toBe(0);

      // Second pass (should have cache hits)
      const hitCount = performanceRouter.metrics.compilationHits;
      complexPatterns.forEach(pattern => {
        performanceRouter.compileRoute(pattern);
      });

      expect(performanceRouter.metrics.compilationHits).toBeGreaterThan(hitCount);
      expect(performanceRouter.metrics.compilationHits).toBe(5); // All 5 patterns should hit cache
    });
  });

  describe('Integration with Smart Routing', () => {
    it('should work seamlessly with smart routing enabled', () => {
      const smartRouter = createRouter(null, {
        enableSmartRouting: true,
        enableMetrics: true,
        maxCompilationCacheSize: 10
      });

      // Add routes that will trigger compilation
      smartRouter.get('/static', () => 'static');
      smartRouter.get('/users/:id', (req, _res) => ({ userId: req.params.id }));
      smartRouter.get('/posts/:id/comments/:commentId', (req, _res) => ({
        postId: req.params.postId,
        commentId: req.params.commentId
      }));

      // Routes should be registered and compiled
      expect(smartRouter.routes.length).toBe(3);
      expect(smartRouter.staticRoutes.size).toBe(1); // Only /static is static

      // Compilation cache should have entries for dynamic routes
      expect(smartRouter.routeCompilationCache.size).toBeGreaterThan(0);

      // Smart routing metrics should be available
      expect(smartRouter.metrics).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should provide compilation cache statistics', () => {
      // Add some compiled routes
      router.compileRoute('/users/:id');
      router.compileRoute('/posts/:id');
      router.compileRoute('/users/:id'); // Cache hit

      const stats = router.getCompilationStats();

      expect(stats.compilationEnabled).toBe(true);
      expect(stats.compilationCacheSize).toBe(2);
      expect(stats.compilationCacheHits).toBe(1);
    });

    it('should clear compilation cache properly', () => {
      // Add routes to cache
      router.compileRoute('/route1');
      router.compileRoute('/route2');

      expect(router.routeCompilationCache.size).toBe(2);

      // Clear cache
      router.clearCompilationCache();

      expect(router.routeCompilationCache.size).toBe(0);
    });
  });
});
