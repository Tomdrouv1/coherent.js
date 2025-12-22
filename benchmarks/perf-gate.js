import { benchmarkLRUCache } from './benchmark-lru-cache.js';

const thresholds = {
  minCacheHitRate: 90,
  minSpeedup: 20
};

async function run() {
  const result = benchmarkLRUCache();

  const summary = {
    compilationTimeMs: result.compilationTime,
    cachedTimeMs: result.cachedTime,
    cacheHitRatePercent: result.cacheHitRate,
    speedupPercent: result.speedup,
    cacheHits: result.cacheHits,
    thresholds
  };

  console.log(JSON.stringify(summary));

  const failures = [];

  if (!(Number.isFinite(result.cacheHitRate) && result.cacheHitRate >= thresholds.minCacheHitRate)) {
    failures.push(`cacheHitRate ${result.cacheHitRate}% < ${thresholds.minCacheHitRate}%`);
  }

  if (!(Number.isFinite(result.speedup) && result.speedup >= thresholds.minSpeedup)) {
    failures.push(`speedup ${result.speedup}% < ${thresholds.minSpeedup}%`);
  }

  if (failures.length > 0) {
    console.error(`Perf gate failed: ${failures.join(', ')}`);
    process.exitCode = 1;
  }
}

await run();
