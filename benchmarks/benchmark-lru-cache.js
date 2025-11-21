import { createRouter } from '../packages/api/src/index.js';

// Benchmark LRU cache performance for route compilation
function benchmarkLRUCache() {
  console.log('🚀 LRU Route Compilation Cache Benchmark');
  console.log('===========================================');

  // Test router with LRU cache
  const router = createRouter(null, {
    enableMetrics: true,
    maxCompilationCacheSize: 1000
  });

  // Common route patterns that benefit from caching
  const routePatterns = [
    '/users/:id',
    '/posts/:id',
    '/posts/:id/comments/:commentId',
    '/api/v1/users/:id/profile',
    '/api/v1/users/:id/posts/:postId',
    '/files/:category/**',
    '/search/:query',
    '/admin/users/:id/edit',
    '/admin/posts/:id/delete',
    '/health',
    '/status',
    '/api/status'
  ];

  const iterations = 10000;

  console.log(`\n📊 Benchmark Configuration:`);
  console.log(`- Route patterns: ${routePatterns.length}`);
  console.log(`- Iterations per pattern: ${iterations}`);
  console.log(`- Total compilations: ${routePatterns.length * iterations}`);
  console.log(`- Cache size: ${router.maxCompilationCacheSize}`);

  // First pass: Cache misses (compilation)
  console.log('\n🔄 Phase 1: Initial compilation (cache misses)...');
  const startTime1 = Date.now();

  for (let i = 0; i < iterations; i++) {
    routePatterns.forEach(pattern => {
      router.compileRoute(pattern);
    });
  }

  const time1 = Date.now() - startTime1;
  const hitsAfterPhase1 = router.metrics.compilationHits;

  // Second pass: Cache hits (should be much faster)
  console.log('🔄 Phase 2: Cached compilation (cache hits)...');
  const startTime2 = Date.now();

  for (let i = 0; i < iterations; i++) {
    routePatterns.forEach(pattern => {
      router.compileRoute(pattern);
    });
  }

  const time2 = Date.now() - startTime2;
  const hitsAfterPhase2 = router.metrics.compilationHits;

  const cacheHits = hitsAfterPhase2 - hitsAfterPhase1;
  const cacheHitRate = (cacheHits / (routePatterns.length * iterations) * 100).toFixed(2);
  const speedup = ((time1 - time2) / time1 * 100).toFixed(2);

  console.log('\n📈 Results:');
  console.log(`Phase 1 (compilation): ${time1}ms`);
  console.log(`Phase 2 (cached): ${time2}ms`);
  console.log(`Cache hits: ${cacheHits}`);
  console.log(`Cache hit rate: ${cacheHitRate}%`);
  console.log(`Performance improvement: ${speedup}%`);

  console.log('\n🎯 Cache Statistics:');
  const stats = router.getCompilationStats();
  console.log(`- Compilation cache size: ${stats.compilationCacheSize}`);
  console.log(`- Total compilation hits: ${stats.compilationCacheHits}`);

  console.log('\n✅ LRU Cache Benchmark Complete!');

  return {
    compilationTime: time1,
    cachedTime: time2,
    speedup: parseFloat(speedup),
    cacheHitRate: parseFloat(cacheHitRate),
    cacheHits
  };
}

// Run benchmark if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  benchmarkLRUCache();
}

export { benchmarkLRUCache };
