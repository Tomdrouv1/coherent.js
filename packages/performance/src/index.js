/**
 * Coherent.js Performance
 * 
 * Complete performance optimization utilities
 * 
 * @module performance
 */

export * from './code-splitting.js';
export * from './cache.js';
export * from './lazy-loading.js';

export { CodeSplitter, createCodeSplitter, lazy, splitComponent, createRouteSplitter } from './code-splitting.js';
export { LRUCache, MemoryCache, MemoCache, RenderCache, createCache, memoize } from './cache.js';
export { LazyLoader, ImageLazyLoader, ResourcePreloader, createLazyLoader, lazyImage, progressiveImage } from './lazy-loading.js';
