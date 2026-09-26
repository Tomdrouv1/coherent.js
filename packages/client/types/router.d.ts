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
  /** Route path pattern (the `addRoute()` argument is what counts) */
  path?: string;
  /** Component to render (can be async for code splitting) */
  component: CoherentComponent | (() => Promise<CoherentComponent>);
  /** Route metadata */
  meta?: Record<string, any>;
  /** Before enter guard; returning `false` cancels the navigation */
  beforeEnter?: (to: Route, from: Route | null) => boolean | void | Promise<boolean | void>;
  /** Before leave guard; returning `false` cancels the navigation */
  beforeLeave?: (to: Route, from: Route) => boolean | void | Promise<boolean | void>;
  /** Prefetch priority */
  priority?: number;
  /** Custom transition for this route */
  transition?: RouteTransition;
}

/** Current route state */
export interface Route {
  /** Path without query or hash, e.g. `/users/42` */
  path: string;
  /** Path as navigated to, e.g. `/users/42?tab=posts#top` */
  fullPath?: string;
  /** Values of the matched pattern's `:params` (and `pathMatch` for `*`) */
  params?: Record<string, string>;
  component?: CoherentComponent;
  meta?: Record<string, any>;
  /** `#hash`, including the `#`, or `''` */
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
  /** How URLs are written once `start()` is called; defaults to `'history'` */
  mode?: 'history' | 'hash';
  /** Path prefix of the app in history mode, e.g. `'/app'` */
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
  /**
   * Add a route. `path` may contain `:param` segments and end in `/*`;
   * exact paths win over patterns, patterns match in registration order.
   */
  addRoute(path: string, config: RouteConfig): void;
  /**
   * Navigate to a path (with optional `?query` and `#hash`), adding a history
   * entry. Resolves `false` when no route matches, a guard cancels, loading
   * fails, or a later navigation superseded this one.
   */
  push(path: string, options?: Partial<Route>): Promise<boolean>;
  /** Like `push()`, replacing the current history entry */
  replace(path: string, options?: Partial<Route>): Promise<boolean>;
  /** Go back in history (the browser's after `start()`, the router's before) */
  back(): void;
  /** Go forward in history */
  forward(): void;
  /**
   * Follow the browser: navigate to the current location, handle back/forward
   * (popstate, or hashchange in hash mode) and, unless `interceptLinks` is
   * `false`, clicks on same-origin links to registered routes.
   */
  start(options?: { interceptLinks?: boolean }): Promise<boolean>;
  /** Detach the listeners added by `start()` */
  stop(): void;
  /** Prefetch a single route */
  prefetchRoute(path: string, priority?: number): Promise<void>;
  /** Prefetch multiple routes */
  prefetchRoutes(paths: string[], priority?: number): void;
  /** Setup prefetch strategy for an element */
  setupPrefetchStrategy(element: HTMLElement, path: string): void;
  /** Get the route configuration registered for, or matching, a path */
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
