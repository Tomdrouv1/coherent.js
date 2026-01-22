/**
 * Coherent.js Performance TypeScript Definitions
 * @module @coherent.js/performance
 */

import type { CoherentNode, CoherentComponent, ComponentProps } from '@coherent.js/core';

// ============================================================================
// Performance Metrics
// ============================================================================

/**
 * Comprehensive performance metrics
 */
export interface PerformanceMetrics {
  /** Total render time (ms) */
  renderTime: number;
  /** Number of components rendered */
  componentCount: number;
  /** Total number of renders */
  totalRenders: number;
  /** Average render time */
  avgRenderTime: number;
  /** Slowest render information */
  slowestRender: {
    component: string;
    time: number;
  };
  /** Memory usage (if available) */
  memoryUsage?: number;
  /** Cache hit rate */
  cacheHitRate?: number;
  /** Bundle size information */
  bundleSize?: {
    total: number;
    gzipped: number;
  };
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /** Enable performance tracking */
  enabled?: boolean;
  /** Sample rate (0-1) for measurement */
  sampleRate?: number;
  /** Threshold for slow render warning (ms) */
  slowThreshold?: number;
  /** Callback for slow renders */
  onSlowRender?: (component: string, time: number) => void;
  /** Enable detailed tracing */
  tracing?: boolean;
}

/**
 * Profiler result for a single render
 */
export interface ProfilerResult {
  /** Component name */
  componentName: string;
  /** Total duration (ms) */
  duration: number;
  /** Render phase */
  phase: 'mount' | 'update';
  /** Actual render duration */
  actualDuration: number;
  /** Base duration (without memoization) */
  baseDuration: number;
  /** Start time (relative to page load) */
  startTime: number;
  /** Commit time */
  commitTime: number;
}

/**
 * Create a performance profiler
 */
export function createProfiler(config?: PerformanceConfig): {
  /** Start a measurement */
  start(label: string): void;
  /** End a measurement and return duration */
  end(label: string): number;
  /** Measure a synchronous function */
  measure<T>(label: string, fn: () => T): T;
  /** Measure an async function */
  measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
  /** Get current metrics */
  getMetrics(): PerformanceMetrics;
  /** Reset all measurements */
  reset(): void;
  /** Subscribe to render events */
  onRender(callback: (result: ProfilerResult) => void): () => void;
};

/**
 * HOC to add profiling to a component
 */
export function withProfiling<P extends ComponentProps>(
  component: CoherentComponent<P>,
  name?: string
): CoherentComponent<P>;

/**
 * Memoize with metrics tracking
 */
export function memoWithMetrics<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: {
    name?: string;
    maxSize?: number;
  }
): T & {
  hits: number;
  misses: number;
  hitRate: () => number;
};

// ============================================================================
// Code Splitting
// ============================================================================

/**
 * Split options for lazy loading
 */
export interface SplitOptions {
  /** Loading component */
  loading?: CoherentNode;
  /** Error component */
  error?: CoherentNode;
  /** Delay before showing loading (ms) */
  delay?: number;
  /** Timeout for loading (ms) */
  timeout?: number;
}

/**
 * Lazy component loader type
 */
export type LazyComponent = () => Promise<{ default: CoherentComponent }>;

/**
 * Code splitter class
 */
export class CodeSplitter {
  constructor();

  /** Create a lazy-loaded component */
  lazy(loader: LazyComponent, options?: SplitOptions): CoherentComponent;

  /** Split a component into a separate chunk */
  split(component: CoherentComponent, chunkName?: string): LazyComponent;

  /** Preload a lazy component */
  preload(loader: LazyComponent): Promise<CoherentComponent>;

  /** Prefetch a lazy component (lower priority) */
  prefetch(loader: LazyComponent): void;
}

/**
 * Create a code splitter instance
 */
export function createCodeSplitter(): CodeSplitter;

/**
 * Create a lazy-loaded component
 */
export function lazy(loader: LazyComponent, options?: SplitOptions): CoherentComponent;

/**
 * Split a component into a separate chunk
 */
export function splitComponent(component: CoherentComponent, chunkName?: string): LazyComponent;

/**
 * Route-based code splitting configuration
 */
export interface RouteConfig {
  /** Route path */
  path: string;
  /** Lazy component loader */
  component: LazyComponent;
  /** Preload on route definition */
  preload?: boolean;
  /** Prefetch on idle */
  prefetch?: boolean;
}

/**
 * Create a route-based code splitter
 */
export function createRouteSplitter(routes: RouteConfig[]): {
  /** Get route configuration */
  getRoute(path: string): RouteConfig | undefined;
  /** Preload a route's component */
  preloadRoute(path: string): Promise<void>;
  /** Prefetch a route's component */
  prefetchRoute(path: string): void;
};

// ============================================================================
// Caching
// ============================================================================

/**
 * Cache entry structure
 */
export interface CacheEntry<T = unknown> {
  /** Cached value */
  value: T;
  /** Creation timestamp */
  timestamp: number;
  /** Hit count */
  hits: number;
  /** Size in bytes (estimated) */
  size?: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
  /** Maximum cache size */
  maxSize?: number;
  /** Maximum age in ms */
  maxAge?: number;
  /** Callback when entry is evicted */
  onEvict?: (key: string, value: unknown) => void;
}

/**
 * LRU Cache class
 */
export class LRUCache<K = string, V = unknown> {
  constructor(options?: CacheOptions);

  /** Get a cached value */
  get(key: K): V | undefined;

  /** Set a cached value */
  set(key: K, value: V): void;

  /** Check if key exists */
  has(key: K): boolean;

  /** Delete a key */
  delete(key: K): boolean;

  /** Clear all entries */
  clear(): void;

  /** Get cache size */
  size(): number;

  /** Get all keys */
  keys(): K[];

  /** Get all values */
  values(): V[];

  /** Get all entries */
  entries(): Array<[K, V]>;
}

/**
 * Memory cache with TTL support
 */
export class MemoryCache<K = string, V = unknown> {
  constructor(options?: CacheOptions);

  /** Get a cached value */
  get(key: K): V | undefined;

  /** Set a cached value with optional TTL */
  set(key: K, value: V, ttl?: number): void;

  /** Check if key exists */
  has(key: K): boolean;

  /** Delete a key */
  delete(key: K): boolean;

  /** Clear all entries */
  clear(): void;

  /** Get cache size */
  size(): number;

  /** Clean up expired entries */
  cleanup(): void;
}

/**
 * Memoization options
 */
export interface MemoOptions {
  /** Maximum cache size */
  maxSize?: number;
  /** Custom key generator */
  keyGenerator?: (...args: unknown[]) => string;
  /** TTL in ms */
  ttl?: number;
}

/**
 * Memoization cache class
 */
export class MemoCache {
  constructor(options?: MemoOptions);

  /** Memoize a function */
  memoize<T extends (...args: unknown[]) => unknown>(fn: T): T;

  /** Clear cache for a function */
  clear(fn?: (...args: unknown[]) => unknown): void;

  /** Check if result is cached */
  has(fn: (...args: unknown[]) => unknown, args: unknown[]): boolean;

  /** Delete cached result */
  delete(fn: (...args: unknown[]) => unknown, args?: unknown[]): boolean;
}

/**
 * Render cache options
 */
export interface RenderCacheOptions extends CacheOptions {
  /** Custom key generator */
  keyGenerator?: (component: CoherentComponent, props: unknown) => string;
}

/**
 * Render cache for component output
 */
export class RenderCache {
  constructor(options?: RenderCacheOptions);

  /** Get cached render */
  get(component: CoherentComponent, props: unknown): string | undefined;

  /** Set cached render */
  set(component: CoherentComponent, props: unknown, html: string): void;

  /** Clear cache for a component */
  clear(component?: CoherentComponent): void;

  /** Get cache size */
  size(): number;
}

/**
 * Create a cache of specified type
 */
export function createCache<K = string, V = unknown>(
  type: 'lru' | 'memory' | 'memo' | 'render',
  options?: CacheOptions
): LRUCache<K, V> | MemoryCache<K, V> | MemoCache | RenderCache;

/**
 * Memoize a function
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: MemoOptions
): T;

// ============================================================================
// Lazy Loading
// ============================================================================

/**
 * Lazy load options
 */
export interface LazyLoadOptions {
  /** Intersection threshold (0-1) */
  threshold?: number;
  /** Root margin for intersection */
  rootMargin?: string;
  /** Root element for intersection */
  root?: Element | null;
  /** Callback when loaded */
  onLoad?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Lazy loader class
 */
export class LazyLoader {
  constructor(options?: LazyLoadOptions);

  /** Start observing an element */
  observe(element: Element, loader: () => Promise<unknown>): void;

  /** Stop observing an element */
  unobserve(element: Element): void;

  /** Disconnect all observers */
  disconnect(): void;

  /** Load all observed elements */
  loadAll(): Promise<void[]>;
}

/**
 * Image lazy load options
 */
export interface ImageLazyLoadOptions extends LazyLoadOptions {
  /** Placeholder image URL */
  placeholder?: string;
  /** Blur data URL for preview */
  blurDataURL?: string;
  /** Enable fade-in animation */
  fadeIn?: boolean;
  /** Fade-in duration (ms) */
  fadeInDuration?: number;
}

/**
 * Image lazy loader class
 */
export class ImageLazyLoader extends LazyLoader {
  constructor(options?: ImageLazyLoadOptions);

  /** Lazy load an image */
  lazyImage(element: HTMLImageElement, src: string, options?: ImageLazyLoadOptions): void;
}

/**
 * Preload options
 */
export interface PreloadOptions {
  /** Resource type */
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch';
  /** Cross-origin setting */
  crossOrigin?: 'anonymous' | 'use-credentials';
  /** MIME type */
  type?: string;
  /** Media query */
  media?: string;
}

/**
 * Resource preloader class
 */
export class ResourcePreloader {
  constructor();

  /** Preload a resource (high priority) */
  preload(url: string, options?: PreloadOptions): void;

  /** Prefetch a resource (low priority) */
  prefetch(url: string): void;

  /** Preconnect to a domain */
  preconnect(url: string, crossOrigin?: boolean): void;

  /** DNS prefetch for a domain */
  dnsPrefetch(url: string): void;

  /** Check if resource is preloaded */
  hasPreloaded(url: string): boolean;
}

/**
 * Create a lazy loader
 */
export function createLazyLoader(options?: LazyLoadOptions): LazyLoader;

/**
 * Lazy load an image
 */
export function lazyImage(
  element: HTMLImageElement | string,
  src: string,
  options?: ImageLazyLoadOptions
): void;

/**
 * Progressive image loading options
 */
export interface ProgressiveImageOptions {
  /** Low quality image source */
  lowQualitySrc: string;
  /** High quality image source */
  highQualitySrc: string;
  /** Placeholder while loading */
  placeholder?: string;
  /** Fade-in duration (ms) */
  fadeInDuration?: number;
}

/**
 * Load an image progressively (low quality first)
 */
export function progressiveImage(
  element: HTMLImageElement | string,
  options: ProgressiveImageOptions
): Promise<void>;

// ============================================================================
// Bundle Optimization
// ============================================================================

/**
 * Bundle analysis result
 */
export interface BundleAnalysis {
  /** Total size in bytes */
  totalSize: number;
  /** Gzipped size */
  gzippedSize: number;
  /** Modules in bundle */
  modules: Array<{
    name: string;
    size: number;
    gzippedSize: number;
  }>;
  /** Duplicate modules */
  duplicates: Array<{
    name: string;
    count: number;
    totalSize: number;
  }>;
}

/**
 * Tree shaking result
 */
export interface TreeShakeResult {
  /** Original size */
  originalSize: number;
  /** Size after tree shaking */
  shakenSize: number;
  /** Removed exports */
  removed: string[];
  /** Kept exports */
  kept: string[];
}

/**
 * Bundle optimizer class
 */
export class BundleOptimizer {
  /** Analyze a bundle */
  analyze(bundle: unknown): BundleAnalysis;

  /** Optimize a bundle */
  optimize(bundle: unknown): unknown;

  /** Split bundle into chunks */
  splitChunks(bundle: unknown): unknown[];

  /** Tree shake a bundle */
  treeshake(bundle: unknown): TreeShakeResult;
}

/**
 * Global bundle optimizer instance
 */
export const bundleOptimizer: BundleOptimizer;
