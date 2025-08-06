// Type definitions for coherent-framework
// Project: Coherent.js - Pure object-based rendering framework

export interface CoherentElement {
  [tagName: string]: {
    text?: string;
    html?: string;
    children?: CoherentNode[];
    className?: string | (() => string);
    [key: string]: any;
  };
}

export type CoherentNode = CoherentElement | string | number | boolean | null | undefined;

export interface ComponentFunction {
  (props?: Record<string, any>): CoherentNode;
}

export interface RenderOptions {
  minify?: boolean;
  stream?: boolean;
  enableCache?: boolean;
  enableMonitoring?: boolean;
  enableDevTools?: boolean;
  cacheSize?: number;
  cacheTTL?: number;
  maxDepth?: number;
  [key: string]: any;
}

// Core rendering functions
export function renderToString(node: CoherentNode, options?: RenderOptions): string;
export function renderToStream(node: CoherentNode, options?: RenderOptions): ReadableStream;
export function renderBatch(nodes: CoherentNode[], options?: RenderOptions): string[];

// Component creation helpers
export function createComponent(definition: Record<string, any> | Function): ComponentFunction;
export function withState<T>(initialState: T): (component: ComponentFunction) => ComponentFunction;
export function withProps(props: Record<string, any>): (component: ComponentFunction) => ComponentFunction;
export function memo(component: ComponentFunction, areEqual?: (prevProps: any, nextProps: any) => boolean): ComponentFunction;
export function lazy(loader: () => Promise<ComponentFunction>): ComponentFunction;

// Context API
export function provideContext<T>(key: string, value: T): void;
export function restoreContext<T>(key: string): T | undefined;
export function clearAllContexts(): void;
export function createContextProvider<T>(key: string, value: T, children: CoherentNode): ComponentFunction;
export function useContext<T>(key: string): T | undefined;

// State Management
export interface StateContainer<T> {
  get(key: keyof T): any;
  set(key: keyof T, value: any): StateContainer<T>;
  has(key: keyof T): boolean;
  delete(key: keyof T): boolean;
  clear(): StateContainer<T>;
  toObject(): T;
}

export interface StateManager {
  createState<T>(initialState: T): StateContainer<T>;
  globalState: Map<string, any>;
  set(key: string, value: any): void;
  get(key: string): any;
  has(key: string): boolean;
  clear(): void;
  createRequestState<T>(): StateContainer<T>;
}

export const stateManager: StateManager;

// Performance Monitoring
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  totalRenders: number;
  cacheSize: number;
}

export interface PerformanceRecommendations {
  type: string;
  component: string;
  potentialSavings: string;
  recommendation: string;
}

export function startPerformanceMonitor(): void;
export function getPerformanceMetrics(): PerformanceMetrics;
export function resetPerformanceMetrics(): void;
export function getPerformanceRecommendations(): PerformanceRecommendations[];

// Development tools
export function enableDevMode(): void;
export function disableDevMode(): void;
export function benchmark(component: ComponentFunction, iterations?: number): PerformanceMetrics;

// Cache management
export function clearCache(): void;
export function getCacheStats(): { hits: number; misses: number; size: number };
export function optimizeCache(): void;

// Precompilation
export function precompileComponent(component: ComponentFunction, options?: RenderOptions): ComponentFunction;

// Validation helpers
export function validateComponent(component: CoherentNode): boolean;
export function isCoherentObject(obj: any): boolean;

// Utility methods
export function deepClone<T>(obj: T): T;
export function mergeProps(obj1: Record<string, any>, obj2: Record<string, any>): Record<string, any>;
export function escapeHtml(text: string): string;
export function isVoidElement(tagName: string): boolean;

// Main Coherent class
export class Coherent {
  constructor(options?: RenderOptions);
  
  // Rendering methods
  render(component: CoherentNode, options?: RenderOptions): string;
  renderToString(component: CoherentNode, options?: RenderOptions): string;
  renderBatch(components: CoherentNode[], options?: RenderOptions): string[];
  stream(component: CoherentNode, options?: RenderOptions): ReadableStream;
  
  // Component helpers
  createComponent(definition: Record<string, any>): ComponentFunction;
  withState<T>(initialState: T): (component: ComponentFunction) => ComponentFunction;
  withProps(props: Record<string, any>): (component: ComponentFunction) => ComponentFunction;
  memo(component: ComponentFunction, areEqual?: (prevProps: any, nextProps: any) => boolean): ComponentFunction;
  lazy(loader: () => Promise<ComponentFunction>): ComponentFunction;
  
  // Performance and monitoring
  getPerformanceStats(): PerformanceMetrics;
  getPerformanceRecommendations(): PerformanceRecommendations[];
  enableDevMode(): void;
  disableDevMode(): void;
  benchmark(component: ComponentFunction, iterations?: number): PerformanceMetrics;
  
  // Cache management
  clearCache(): void;
  getCacheStats(): { hits: number; misses: number; size: number };
  optimizeCache(): void;
  
  // Precompilation
  precompile(component: ComponentFunction, options?: RenderOptions): ComponentFunction;
  
  // Validation helpers
  validate(component: CoherentNode): boolean;
  isCoherent(obj: any): boolean;
  
  // Utility methods
  clone<T>(obj: T): T;
  merge(obj1: Record<string, any>, obj2: Record<string, any>): Record<string, any>;
  extract(element: CoherentElement): Record<string, any>;
  normalize(children: CoherentNode | CoherentNode[]): CoherentNode[];
  escape(text: string): string;
  
  // Framework information
  getVersion(): string;
  getInfo(): {
    name: string;
    version: string;
    description: string;
    features: string[];
    stats: PerformanceMetrics;
  };
}

// Default instance
export const coherent: Coherent;
export default Coherent;

// Named exports for specific functionality
export const server: {
  render: typeof renderToString;
  renderBatch: typeof renderBatch;
  stream: typeof renderToStream;
  createStreamingRenderer: Function;
  CacheManager: Function;
  performanceMonitor: {
    start: typeof startPerformanceMonitor;
    getStats: typeof getPerformanceMetrics;
    reset: typeof resetPerformanceMetrics;
    getRecommendations: typeof getPerformanceRecommendations;
  };
};

export const client: {
  hydrate: typeof import('./client/hydration').hydrate;
  hydrateAll: typeof import('./client/hydration').hydrateAll;
  hydrateBySelector: typeof import('./client/hydration').hydrateBySelector;
  enableClientEvents: typeof import('./client/hydration').enableClientEvents;
  makeHydratable: typeof import('./client/hydration').makeHydratable;
};

export const components: {
  createComponent: typeof createComponent;
  withState: typeof withState;
  withProps: typeof withProps;
  memo: typeof memo;
  lazy: typeof lazy;
  validateComponent: typeof validateComponent;
  isCoherentObject: typeof isCoherentObject;
};

export const utils: {
  deepClone: typeof deepClone;
  mergeProps: typeof mergeProps;
  escapeHtml: typeof escapeHtml;
  isVoidElement: typeof isVoidElement;
  extractProps: Function;
  hasChildren: Function;
  normalizeChildren: Function;
  formatAttributes: Function;
  minifyHtml: Function;
  merge: typeof mergeProps;
  getNestedValue: Function;
  setNestedValue: Function;
};

export const performance: {
  performanceMonitor: {
    start: typeof startPerformanceMonitor;
    getStats: typeof getPerformanceMetrics;
    reset: typeof resetPerformanceMetrics;
    getRecommendations: typeof getPerformanceRecommendations;
  };
  CacheManager: Function;
  getCache: Function;
  resetCache: typeof clearCache;
  getRenderingStats: Function;
};

// Development tools
export const DevTools: Function;
