/**
 * Coherent.js Client Router Types
 * TypeScript definitions for the client-side routing system
 *
 * @version 1.0.0-beta.1
 */

import type { CoherentComponent } from '@coherent.js/core';

// ============================================================================
// Route Types
// ============================================================================

/** Route transition configuration */
export interface RouteTransition {
  enter: string;
  leave: string;
  duration: number;
}

/** Route configuration */
export interface RouteConfig {
  /** Route path pattern */
  path: string;
  /** Component to render (can be async for code splitting) */
  component: CoherentComponent | (() => Promise<CoherentComponent>);
  /** Route metadata */
  meta?: Record<string, any>;
  /** Before enter guard */
  beforeEnter?: (to: Route, from: Route | null) => boolean | Promise<boolean>;
  /** Before leave guard */
  beforeLeave?: (to: Route, from: Route) => boolean | Promise<boolean>;
  /** Prefetch priority */
  priority?: number;
  /** Custom transition for this route */
  transition?: RouteTransition;
}

/** Current route state */
export interface Route {
  path: string;
  component?: CoherentComponent;
  meta?: Record<string, any>;
  hash?: string;
  query?: Record<string, string>;
}

// ============================================================================
// Router Configuration
// ============================================================================

/** Scroll behavior configuration */
export interface ScrollBehaviorConfig {
  enabled?: boolean;
  behavior?: ScrollBehavior;
  position?: 'top' | 'saved';
  delay?: number;
  savePosition?: boolean;
  custom?: (
    to: Route,
    from: Route | null,
    savedPosition: { x: number; y: number } | null
  ) => { x: number; y: number } | { el: Element };
}

/** Router configuration options */
export interface RouterConfig {
  mode?: 'history' | 'hash';
  base?: string;
  prefetch?: {
    enabled?: boolean;
    strategy?: 'hover' | 'visible' | 'idle';
    delay?: number;
    maxConcurrent?: number;
    priority?: {
      critical?: number;
      high?: number;
      normal?: number;
      low?: number;
    };
  };
  transitions?: {
    enabled?: boolean;
    default?: RouteTransition;
    routes?: Record<string, RouteTransition>;
    onStart?: (from: string | null, to: string) => void;
    onComplete?: (from: string | null, to: string) => void;
  };
  codeSplitting?: {
    enabled?: boolean;
    strategy?: 'route';
    chunkNaming?: string;
    preload?: string[];
    onLoad?: (path: string, component: any, loadTime: number) => void;
  };
  scrollBehavior?: ScrollBehaviorConfig;
}

// ============================================================================
// Router Statistics
// ============================================================================

/** Router statistics */
export interface RouterStats {
  navigations: number;
  prefetches: number;
  transitionsCompleted: number;
  chunksLoaded: number;
  scrollRestores: number;
  routesRegistered: number;
  prefetchQueueSize: number;
  activePrefetches: number;
  loadedChunks: number;
  savedPositions: number;
  historyLength: number;
}

// ============================================================================
// Router Interface
// ============================================================================

/** Router instance */
export interface Router {
  /** Add a route to the router */
  addRoute(path: string, config: RouteConfig): void;
  /** Navigate to a path */
  push(path: string, options?: Partial<Route>): Promise<boolean>;
  /** Replace current route */
  replace(path: string, options?: Partial<Route>): Promise<boolean>;
  /** Go back in history */
  back(): void;
  /** Go forward in history */
  forward(): void;
  /** Prefetch a single route */
  prefetchRoute(path: string, priority?: number): Promise<void>;
  /** Prefetch multiple routes */
  prefetchRoutes(paths: string[], priority?: number): void;
  /** Setup prefetch strategy for an element */
  setupPrefetchStrategy(element: HTMLElement, path: string): void;
  /** Get route configuration by path */
  getRoute(path: string): RouteConfig | undefined;
  /** Get all registered routes */
  getRoutes(): RouteConfig[];
  /** Get current route */
  getCurrentRoute(): Route | null;
  /** Get router statistics */
  getStats(): RouterStats;
  /** Clear all caches */
  clearCaches(): void;
  /** Internal state (for testing) */
  _state?: any;
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Create an enhanced router with advanced features
 *
 * @param options - Router configuration options
 * @returns Router instance
 */
export declare function createRouter(options?: RouterConfig): Router;

/** Default router instance */
export declare const router: Router;
