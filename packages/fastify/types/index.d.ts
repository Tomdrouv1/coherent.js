/**
 * Coherent.js Fastify Integration Types
 * TypeScript definitions for Fastify framework integration
 * 
 * @version 1.1.1
 */

import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply, FastifyPluginCallback } from 'fastify';
import { CoherentNode } from '@coherent/core';

// ============================================================================
// Fastify Plugin Types
// ============================================================================

/** Coherent Fastify plugin options */
export interface CoherentFastifyOptions extends FastifyPluginOptions {
  enablePerformanceMonitoring?: boolean;
  template?: string;
  cache?: boolean;
  development?: boolean;
  renderOptions?: {
    pretty?: boolean;
    doctype?: string;
  };
  errorHandler?: (error: Error, request: FastifyRequest, reply: FastifyReply) => void | Promise<void>;
}

/** Enhanced Fastify reply with Coherent.js methods */
export interface CoherentFastifyReply extends FastifyReply {
  isCoherentObject(obj: any): boolean;
  coherent(component: CoherentNode, renderOptions?: RenderOptions): void;
  renderComponent<P = any>(component: (props: P) => CoherentNode, props?: P): string;
  sendComponent<P = any>(component: (props: P) => CoherentNode, props?: P): void;
  streamComponent<P = any>(component: (props: P) => CoherentNode, props?: P): void;
}

/** Enhanced Fastify request with Coherent.js utilities */
export interface CoherentFastifyRequest extends FastifyRequest {
  getComponent<P = any>(name: string, props?: P): CoherentNode | undefined;
  coherentState?: any;
  setCoherentState?(state: any): void;
  getCoherentState?(): any;
}

/** Render options for Coherent.js components */
export interface RenderOptions {
  enablePerformanceMonitoring?: boolean;
  template?: string;
  cache?: boolean;
  minify?: boolean;
  pretty?: boolean;
  doctype?: string;
}

/** Fastify instance with Coherent.js support */
export interface CoherentFastifyInstance extends FastifyInstance {
  coherent: {
    render(component: CoherentNode, options?: RenderOptions): string;
    renderToStream(component: CoherentNode, options?: RenderOptions): ReadableStream;
    registerComponent(name: string, component: CoherentNode | ((props: any) => CoherentNode)): void;
    getComponent(name: string): CoherentNode | ((props: any) => CoherentNode) | undefined;
  };
}

// ============================================================================
// Route Handler Types
// ============================================================================

/** Component factory for route handlers */
export type ComponentFactory<P = any> = (
  request: CoherentFastifyRequest,
  reply: CoherentFastifyReply
) => CoherentNode | Promise<CoherentNode>;

/** Handler options for component routes */
export interface CoherentHandlerOptions {
  enablePerformanceMonitoring?: boolean;
  template?: string;
  cache?: boolean;
  cacheKey?: (request: FastifyRequest) => string;
  cacheTTL?: number;
  layout?: (props: any) => CoherentNode;
  meta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

/** Route handler with Coherent.js component rendering */
export type CoherentRouteHandler = (
  request: CoherentFastifyRequest,
  reply: CoherentFastifyReply
) => void | Promise<void> | CoherentNode | Promise<CoherentNode>;

/** Component route configuration */
export interface ComponentRoute {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  component: ComponentFactory;
  schema?: any;
  preHandler?: any;
  handler?: CoherentRouteHandler;
  options?: CoherentHandlerOptions;
}

// ============================================================================
// Middleware and Hooks Types
// ============================================================================

/** Performance monitoring configuration */
export interface PerformanceConfig {
  enabled?: boolean;
  threshold?: number;
  logSlow?: boolean;
  metrics?: {
    renderTime?: boolean;
    componentCount?: boolean;
    htmlSize?: boolean;
  };
}

/** SSR configuration for Fastify */
export interface FastifySSRConfig {
  enabled?: boolean;
  cache?: boolean;
  cacheMaxAge?: number;
  bundlePath?: string;
  templatePath?: string;
  clientManifest?: any;
  serverBundle?: any;
  renderToStream?: boolean;
  preload?: string[];
}

/** SSR context for Fastify */
export interface FastifySSRContext {
  request: FastifyRequest;
  reply: FastifyReply;
  url: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
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
    preload: string[];
  };
}

// ============================================================================
// Plugin System Types
// ============================================================================

/** Coherent Fastify plugin */
export interface CoherentFastifyPlugin extends FastifyPluginCallback<CoherentFastifyOptions> {
  coherentFastify: symbol;
  options?: CoherentFastifyOptions;
}

/** Component registry for Fastify */
export interface ComponentRegistry {
  register(name: string, component: CoherentNode | ComponentFactory): void;
  unregister(name: string): boolean;
  get(name: string): (CoherentNode | ComponentFactory) | undefined;
  has(name: string): boolean;
  list(): string[];
  clear(): void;
}

// ============================================================================
// Decorators and Extensions
// ============================================================================

/** Fastify decorators added by Coherent.js */
export interface CoherentDecorators {
  request: {
    coherentState: any;
    getComponent: <P = any>(name: string, props?: P) => CoherentNode | undefined;
  };
  reply: {
    isCoherentObject: (obj: any) => boolean;
    coherent: (component: CoherentNode, options?: RenderOptions) => void;
    renderComponent: <P = any>(component: (props: P) => CoherentNode, props?: P) => string;
  };
  instance: {
    coherent: {
      render: (component: CoherentNode, options?: RenderOptions) => string;
      renderToStream: (component: CoherentNode, options?: RenderOptions) => ReadableStream;
      registry: ComponentRegistry;
    };
  };
}

// ============================================================================
// Error Handling Types
// ============================================================================

/** Coherent error handler for Fastify */
export type CoherentErrorHandler = (
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) => void | Promise<void>;

/** Error page component props */
export interface ErrorPageProps {
  error: Error;
  statusCode: number;
  message: string;
  stack?: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  };
}

// ============================================================================
// Development Features
// ============================================================================

/** Development mode options */
export interface DevModeOptions {
  enabled?: boolean;
  errorOverlay?: boolean;
  hmr?: boolean;
  logging?: {
    renderTime?: boolean;
    componentTree?: boolean;
    stateChanges?: boolean;
  };
}

/** HMR configuration for Fastify */
export interface FastifyHMRConfig {
  enabled?: boolean;
  port?: number;
  path?: string;
  websocket?: boolean;
  clientEntry?: string;
}

// ============================================================================
// Main Functions
// ============================================================================

/** Coherent.js Fastify plugin */
export const coherentFastify: CoherentFastifyPlugin;

/** Setup Coherent.js with Fastify instance */
export function setupCoherent(
  fastify: FastifyInstance,
  options?: CoherentFastifyOptions
): void;

/** Create a Fastify route handler for Coherent.js components */
export function createHandler(
  componentFactory: ComponentFactory,
  options?: CoherentHandlerOptions
): CoherentRouteHandler;

/** Register component routes */
export function registerComponentRoutes(
  fastify: FastifyInstance,
  routes: ComponentRoute[]
): void;

/** Create SSR middleware for Fastify */
export function ssrMiddleware(config?: FastifySSRConfig): FastifyPluginCallback;

/** Create error handler for Coherent.js */
export function createErrorHandler(options?: {
  showStack?: boolean;
  logErrors?: boolean;
  errorComponent?: (props: ErrorPageProps) => CoherentNode;
}): CoherentErrorHandler;

/** Create component registry */
export function createComponentRegistry(): ComponentRegistry;

/** Performance monitoring plugin */
export function performancePlugin(config?: PerformanceConfig): FastifyPluginCallback;

/** Development mode plugin */
export function devModePlugin(options?: DevModeOptions): FastifyPluginCallback;

/** HMR plugin for development */
export function hmrPlugin(config?: FastifyHMRConfig): FastifyPluginCallback;

// ============================================================================
// Utility Functions
// ============================================================================

/** Create enhanced Fastify app with Coherent.js */
export function createCoherentApp(options?: CoherentFastifyOptions): CoherentFastifyInstance;

/** Check if object is a Coherent component */
export function isCoherentObject(obj: any): boolean;

/** Render component to HTML string */
export function renderComponent(component: CoherentNode, options?: RenderOptions): string;

/** Render component to stream */
export function renderToStream(component: CoherentNode, options?: RenderOptions): ReadableStream;

/** Cache utilities */
export const cache: {
  get(key: string): string | undefined;
  set(key: string, value: string, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
};

// ============================================================================
// Type Guards
// ============================================================================

/** Check if reply has Coherent.js decorators */
export function isCoherentReply(reply: FastifyReply): reply is CoherentFastifyReply;

/** Check if request has Coherent.js decorators */
export function isCoherentRequest(request: FastifyRequest): request is CoherentFastifyRequest;

/** Check if instance has Coherent.js support */
export function isCoherentInstance(fastify: FastifyInstance): fastify is CoherentFastifyInstance;

// ============================================================================
// Default Export
// ============================================================================

declare const coherentFastifyPlugin: {
  coherentFastify: typeof coherentFastify;
  setupCoherent: typeof setupCoherent;
  createHandler: typeof createHandler;
  registerComponentRoutes: typeof registerComponentRoutes;
  ssrMiddleware: typeof ssrMiddleware;
  createErrorHandler: typeof createErrorHandler;
  createComponentRegistry: typeof createComponentRegistry;
  performancePlugin: typeof performancePlugin;
  devModePlugin: typeof devModePlugin;
  hmrPlugin: typeof hmrPlugin;
  createCoherentApp: typeof createCoherentApp;
  isCoherentObject: typeof isCoherentObject;
  renderComponent: typeof renderComponent;
  renderToStream: typeof renderToStream;
  cache: typeof cache;
  isCoherentReply: typeof isCoherentReply;
  isCoherentRequest: typeof isCoherentRequest;
  isCoherentInstance: typeof isCoherentInstance;
};

export default coherentFastifyPlugin;
