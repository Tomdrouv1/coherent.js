/**
 * Coherent.js Express Integration Types
 * TypeScript definitions for Express.js framework integration
 * 
 * @version 1.1.1
 */

import { Application, RequestHandler, Request, Response, NextFunction } from 'express';
import { CoherentNode } from '@coherent/core';

// ============================================================================
// Express Engine Types
// ============================================================================

/** Express view engine callback */
export type ExpressEngineCallback = (err: Error | null, html?: string) => void;

/** Express view engine options */
export interface ExpressEngineOptions {
  [key: string]: any;
  settings?: {
    'view cache'?: boolean;
    'view engine'?: string;
    views?: string | string[];
  };
  cache?: boolean;
  filename?: string;
  _locals?: any;
}

/** Express view engine function */
export type ExpressEngine = (
  filePath: string,
  options: ExpressEngineOptions,
  callback: ExpressEngineCallback
) => void;

// ============================================================================
// Coherent Express Integration
// ============================================================================

/** Coherent Express middleware options */
export interface CoherentExpressOptions {
  viewEngine?: string;
  viewsDirectory?: string;
  cache?: boolean;
  development?: boolean;
  renderOptions?: {
    pretty?: boolean;
    doctype?: string;
    compileDebug?: boolean;
  };
  errorHandler?: (error: Error, req: Request, res: Response, next: NextFunction) => void;
}

/** Express application with Coherent.js support */
export interface CoherentExpressApplication extends Application {
  renderCoherent(view: CoherentNode, options?: any): void;
}

/** Enhanced Express request with Coherent.js utilities */
export interface CoherentRequest extends Request {
  renderComponent<P = any>(component: (props: P) => CoherentNode, props?: P): string;
  getComponent<P = any>(name: string, props?: P): CoherentNode | undefined;
}

/** Enhanced Express response with Coherent.js utilities */
export interface CoherentResponse extends Response {
  renderCoherent(component: CoherentNode, options?: any): void;
  sendComponent<P = any>(component: (props: P) => CoherentNode, props?: P): void;
  streamComponent<P = any>(component: (props: P) => CoherentNode, props?: P): void;
}

// ============================================================================
// Middleware Types
// ============================================================================

/** Coherent middleware factory */
export type CoherentMiddleware = (options?: CoherentExpressOptions) => RequestHandler;

/** Component rendering middleware options */
export interface ComponentMiddlewareOptions {
  componentDirectory?: string;
  autoRegister?: boolean;
  cache?: boolean;
  development?: boolean;
}

/** Static asset serving options for Coherent.js */
export interface CoherentStaticOptions {
  clientScript?: boolean;
  hydrationScript?: boolean;
  cssFiles?: string[];
  jsFiles?: string[];
  publicPath?: string;
}

// ============================================================================
// Routing Enhancement Types
// ============================================================================

/** Route handler with Coherent.js component rendering */
export interface CoherentRouteHandler {
  (req: CoherentRequest, res: CoherentResponse, next: NextFunction): void | Promise<void>;
}

/** Route configuration for component-based routing */
export interface ComponentRoute {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  component: (props: any) => CoherentNode;
  middleware?: RequestHandler[];
  props?: (req: Request, res: Response) => any | Promise<any>;
  layout?: (props: any) => CoherentNode;
  meta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

// ============================================================================
// Server-Side Rendering Types
// ============================================================================

/** SSR configuration for Express */
export interface SSRConfig {
  enabled?: boolean;
  cache?: boolean;
  cacheMaxAge?: number;
  bundlePath?: string;
  templatePath?: string;
  clientManifest?: any;
  serverBundle?: any;
  renderToStream?: boolean;
}

/** SSR context passed to components */
export interface SSRContext {
  req: Request;
  res: Response;
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
// Development Features
// ============================================================================

/** Development server options */
export interface DevServerOptions {
  port?: number;
  host?: string;
  hot?: boolean;
  open?: boolean;
  proxy?: Record<string, string>;
  watchOptions?: {
    ignored?: string | RegExp | (string | RegExp)[];
    aggregateTimeout?: number;
    poll?: boolean | number;
  };
}

/** Hot module replacement configuration */
export interface HMRConfig {
  enabled?: boolean;
  port?: number;
  path?: string;
  clientEntry?: string;
}

// ============================================================================
// Main Functions
// ============================================================================

/** Create Express view engine for Coherent.js */
export function expressEngine(options?: Partial<CoherentExpressOptions>): ExpressEngine;

/** Setup Coherent.js with Express application */
export function setupCoherent(
  app: Application,
  options?: CoherentExpressOptions
): CoherentExpressApplication;

/** Create component-based route */
export function createComponentRoute(config: ComponentRoute): RequestHandler;

/** Middleware for serving Coherent.js client assets */
export function coherentStatic(options?: CoherentStaticOptions): RequestHandler;

/** Middleware for component rendering */
export function componentMiddleware(options?: ComponentMiddlewareOptions): RequestHandler;

/** SSR middleware */
export function ssrMiddleware(config?: SSRConfig): RequestHandler;

/** Development middleware with HMR */
export function devMiddleware(options?: DevServerOptions & HMRConfig): RequestHandler;

// ============================================================================
// Utility Functions
// ============================================================================

/** Create enhanced Express app with Coherent.js */
export function createCoherentApp(options?: CoherentExpressOptions): CoherentExpressApplication;

/** Register component routes */
export function registerRoutes(
  app: Application,
  routes: ComponentRoute[]
): void;

/** Create error handler for Coherent.js */
export function createErrorHandler(options?: {
  showStack?: boolean;
  logErrors?: boolean;
}): (error: Error, req: Request, res: Response, next: NextFunction) => void;

// ============================================================================
// Default Export
// ============================================================================

declare const coherentExpress: {
  expressEngine: typeof expressEngine;
  setupCoherent: typeof setupCoherent;
  createComponentRoute: typeof createComponentRoute;
  coherentStatic: typeof coherentStatic;
  componentMiddleware: typeof componentMiddleware;
  ssrMiddleware: typeof ssrMiddleware;
  devMiddleware: typeof devMiddleware;
  createCoherentApp: typeof createCoherentApp;
  registerRoutes: typeof registerRoutes;
  createErrorHandler: typeof createErrorHandler;
};

export default coherentExpress;