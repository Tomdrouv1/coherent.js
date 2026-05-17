/**
 * Coherent.js Performance
 *
 * Complete performance optimization utilities (cache, code-splitting,
 * lazy-loading) absorbed from the deleted `@coherent.js/performance` package,
 * plus the pre-existing `PerformanceDashboard` re-exported here so the
 * `@coherent.js/devtools/performance` subpath remains a single aggregator.
 *
 * @module performance
 */

export * from './code-splitting.js';
export * from './cache.js';
export * from './lazy-loading.js';

export { CodeSplitter, createCodeSplitter, lazy, splitComponent, createRouteSplitter } from './code-splitting.js';
export { LRUCache, MemoryCache, MemoCache, RenderCache, createCache, memoize } from './cache.js';
export { LazyLoader, ImageLazyLoader, ResourcePreloader, createLazyLoader, lazyImage, progressiveImage } from './lazy-loading.js';

// Re-export the pre-existing performance dashboard so existing consumers of
// `@coherent.js/devtools/performance` (e.g. createPerformanceDashboard) keep
// working after the absorption.
export {
  PerformanceDashboard,
  createPerformanceDashboard,
  showPerformanceDashboard
} from '../performance-dashboard.js';
