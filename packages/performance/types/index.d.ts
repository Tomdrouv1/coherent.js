/**
 * Coherent.js Performance TypeScript Definitions
 * @module @coherent.js/performance
 */

// ===== Code Splitting Types =====

export interface SplitOptions {
  loading?: any;
  error?: any;
  delay?: number;
  timeout?: number;
}

export type LazyComponent = () => Promise<any>;

export class CodeSplitter {
  constructor();
  lazy(loader: LazyComponent, options?: SplitOptions): LazyComponent;
  split(component: any, chunkName?: string): LazyComponent;
  preload(loader: LazyComponent): Promise<any>;
  prefetch(loader: LazyComponent): void;
}

export function createCodeSplitter(): CodeSplitter;
export function lazy(loader: LazyComponent, options?: SplitOptions): LazyComponent;
export function splitComponent(component: any, chunkName?: string): LazyComponent;

export interface RouteConfig {
  path: string;
  component: LazyComponent;
  preload?: boolean;
  prefetch?: boolean;
}

export function createRouteSplitter(routes: RouteConfig[]): {
  getRoute(path: string): RouteConfig | undefined;
  preloadRoute(path: string): Promise<void>;
  prefetchRoute(path: string): void;
};

// ===== Cache Types =====

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  hits: number;
  size?: number;
}

export interface CacheOptions {
  maxSize?: number;
  maxAge?: number;
  onEvict?: (key: string, value: any) => void;
}

export class LRUCache<K = string, V = any> {
  constructor(options?: CacheOptions);
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
  keys(): K[];
  values(): V[];
  entries(): Array<[K, V]>;
}

export class MemoryCache<K = string, V = any> {
  constructor(options?: CacheOptions);
  get(key: K): V | undefined;
  set(key: K, value: V, ttl?: number): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
  cleanup(): void;
}

export interface MemoOptions {
  maxSize?: number;
  keyGenerator?: (...args: any[]) => string;
  ttl?: number;
}

export class MemoCache {
  constructor(options?: MemoOptions);
  memoize<T extends (...args: any[]) => any>(fn: T): T;
  clear(fn?: Function): void;
  has(fn: Function, args: any[]): boolean;
  delete(fn: Function, args?: any[]): boolean;
}

export interface RenderCacheOptions extends CacheOptions {
  keyGenerator?: (component: any, props: any) => string;
}

export class RenderCache {
  constructor(options?: RenderCacheOptions);
  get(component: any, props: any): string | undefined;
  set(component: any, props: any, html: string): void;
  clear(component?: any): void;
  size(): number;
}

export function createCache<K = string, V = any>(type: 'lru' | 'memory' | 'memo' | 'render', options?: CacheOptions): LRUCache<K, V> | MemoryCache<K, V> | MemoCache | RenderCache;
export function memoize<T extends (...args: any[]) => any>(fn: T, options?: MemoOptions): T;

// ===== Lazy Loading Types =====

export interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export class LazyLoader {
  constructor(options?: LazyLoadOptions);
  observe(element: Element, loader: () => Promise<any>): void;
  unobserve(element: Element): void;
  disconnect(): void;
  loadAll(): Promise<void[]>;
}

export interface ImageLazyLoadOptions extends LazyLoadOptions {
  placeholder?: string;
  blurDataURL?: string;
  fadeIn?: boolean;
  fadeInDuration?: number;
}

export class ImageLazyLoader extends LazyLoader {
  constructor(options?: ImageLazyLoadOptions);
  lazyImage(element: HTMLImageElement, src: string, options?: ImageLazyLoadOptions): void;
}

export interface PreloadOptions {
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch';
  crossOrigin?: 'anonymous' | 'use-credentials';
  type?: string;
  media?: string;
}

export class ResourcePreloader {
  constructor();
  preload(url: string, options?: PreloadOptions): void;
  prefetch(url: string): void;
  preconnect(url: string, crossOrigin?: boolean): void;
  dnsPrefetch(url: string): void;
  hasPreloaded(url: string): boolean;
}

export function createLazyLoader(options?: LazyLoadOptions): LazyLoader;
export function lazyImage(element: HTMLImageElement | string, src: string, options?: ImageLazyLoadOptions): void;

export interface ProgressiveImageOptions {
  lowQualitySrc: string;
  highQualitySrc: string;
  placeholder?: string;
  fadeInDuration?: number;
}

export function progressiveImage(element: HTMLImageElement | string, options: ProgressiveImageOptions): Promise<void>;
