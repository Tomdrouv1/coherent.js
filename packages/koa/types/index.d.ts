/**
 * Coherent.js Koa Integration Types
 * TypeScript definitions for Koa.js framework integration
 * 
 * @version 1.1.1
 */

import Koa, { Context, Middleware, Next } from 'koa';
import { CoherentNode } from '@coherent/core';

// ============================================================================
// Koa Integration Types
// ============================================================================

/** Coherent Koa options */
export interface CoherentKoaOptions {
  viewEngine?: string;
  viewsDirectory?: string;
  cache?: boolean;
  development?: boolean;
  renderOptions?: {
    pretty?: boolean;
    doctype?: string;
  };
  errorHandler?: (error: Error, ctx: Context, next: Next) => Promise<void>;
}

/** Enhanced Koa context with Coherent.js utilities */
export interface CoherentContext extends Context {
  renderComponent<P = any>(component: (props: P) => CoherentNode, props?: P): string;
  renderCoherent(component: CoherentNode, options?: any): void;
  sendComponent<P = any>(component: (props: P) => CoherentNode, props?: P): void;
  getComponent<P = any>(name: string, props?: P): CoherentNode | undefined;
  
  // State management
  coherentState: any;
  setCoherentState(state: any): void;
  getCoherentState(): any;
}

/** Koa application with Coherent.js support */
export interface CoherentKoaApplication extends Koa {
  context: CoherentContext;
  renderCoherent(component: CoherentNode, options?: any): void;
}

// ============================================================================
// Middleware Types
// ============================================================================

/** Component rendering middleware options */
export interface KoaComponentMiddlewareOptions {
  componentDirectory?: string;
  autoRegister?: boolean;
  cache?: boolean;
  development?: boolean;
}

/** Route configuration for component-based routing */
export interface KoaComponentRoute {
  path: string | RegExp;
  method?: string | string[];
  component: (props: any) => CoherentNode;
  middleware?: Middleware[];
  props?: (ctx: Context) => any | Promise<any>;
  layout?: (props: any) => CoherentNode;
  meta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

/** SSR configuration for Koa */
export interface KoaSSRConfig {
  enabled?: boolean;
  cache?: boolean;
  cacheMaxAge?: number;
  bundlePath?: string;
  templatePath?: string;
  clientManifest?: any;
  serverBundle?: any;
  renderToStream?: boolean;
}

/** SSR context for Koa */
export interface KoaSSRContext {
  ctx: Context;
  url: string;
  state: any;
  meta: {
    title?: string;
    description?: string;
    keywords?: string[];
    og?: Record<string, string>;
    twitter?: Record<string, string>;
  };
  assets: {
    css: string[];
    js: string[];
  };
}

// ============================================================================
// Main Functions
// ============================================================================

/** Setup Coherent.js with Koa application */
export function setupCoherent(
  app: Koa,
  options?: CoherentKoaOptions
): CoherentKoaApplication;

/** Create component-based route middleware */
export function createComponentRoute(config: KoaComponentRoute): Middleware;

/** Middleware for component rendering */
export function componentMiddleware(options?: KoaComponentMiddlewareOptions): Middleware;

/** SSR middleware for Koa */
export function ssrMiddleware(config?: KoaSSRConfig): Middleware;

/** Error handling middleware for Coherent.js */
export function errorMiddleware(options?: {
  showStack?: boolean;
  logErrors?: boolean;
}): Middleware;

// ============================================================================
// Utility Functions
// ============================================================================

/** Create enhanced Koa app with Coherent.js */
export function createCoherentApp(options?: CoherentKoaOptions): CoherentKoaApplication;

/** Register component routes */
export function registerRoutes(
  app: Koa,
  routes: KoaComponentRoute[]
): void;

// ============================================================================
// Default Export
// ============================================================================

declare const coherentKoa: {
  setupCoherent: typeof setupCoherent;
  createComponentRoute: typeof createComponentRoute;
  componentMiddleware: typeof componentMiddleware;
  ssrMiddleware: typeof ssrMiddleware;
  errorMiddleware: typeof errorMiddleware;
  createCoherentApp: typeof createCoherentApp;
  registerRoutes: typeof registerRoutes;
};

export default coherentKoa;