// Type definitions for Coherent.js Express.js Integration

import { Request, Response, NextFunction, Application } from 'express';
import type { CoherentNode } from '@coherent.js/core';

export interface CoherentMiddlewareOptions {
  /**
   * Enable performance monitoring for rendered components
   * @default false
   */
  enablePerformanceMonitoring?: boolean;
  
  /**
   * HTML template to wrap rendered components
   * @default '<!DOCTYPE html><html><body>{{content}}</body></html>'
   */
  template?: string;
  
  /**
   * Enable server-side rendering
   * @default true
   */
  enableSSR?: boolean;
}

export interface CoherentHandlerOptions {
  /**
   * Enable performance monitoring for rendered components
   * @default false
   */
  enablePerformanceMonitoring?: boolean;
  
  /**
   * HTML template to wrap rendered components
   * @default '<!DOCTYPE html><html><body>{{content}}</body></html>'
   */
  template?: string;
  
  /**
   * Enable streaming rendering for large components
   * @default false
   */
  enableStreaming?: boolean;
}

export interface SetupCoherentExpressOptions {
  /**
   * Use Coherent.js middleware for all routes
   * @default true
   */
  useMiddleware?: boolean;
  
  /**
   * Use Coherent.js view engine
   * @default true
   */
  useEngine?: boolean;
  
  /**
   * Name of the view engine
   * @default 'coherent'
   */
  engineName?: string;
  
  /**
   * Enable performance monitoring
   * @default false
   */
  enablePerformanceMonitoring?: boolean;
  
  /**
   * Static file directory for client-side assets
   * @default 'public'
   */
  staticDir?: string;
}

/**
 * Coherent.js Express middleware
 * Adds Coherent.js rendering capabilities to Express
 * @param options Configuration options
 * @returns Express middleware function
 */
export function coherentMiddleware(options?: CoherentMiddlewareOptions): (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

/**
 * Create an Express route handler for Coherent.js components
 * @param componentFactory Function that returns a Coherent component
 * @param options Configuration options
 * @returns Express route handler
 */
export function createCoherentHandler(
  componentFactory: (req: Request, res: Response, next: NextFunction) => CoherentNode | Promise<CoherentNode>,
  options?: CoherentHandlerOptions
): (req: Request, res: Response, next: NextFunction) => void;

/**
 * Enhanced Express engine for Coherent.js views
 * @param filePath Path to the view file
 * @param options Rendering options
 * @param callback Callback function
 */
export function enhancedExpressEngine(
  filePath: string,
  options: any,
  callback: (err: Error | null, html?: string) => void
): void;

/**
 * Setup Coherent.js with Express app
 * Configures middleware, view engine, and static files
 * @param app Express application instance
 * @param options Configuration options
 */
export function setupCoherent(
  app: Application,
  options?: SetupCoherentExpressOptions
): void;

/**
 * Verify Express is installed, then return a setup function that applies
 * {@link setupCoherent} to an app and returns it.
 *
 * Rejects when Express is not resolvable, and the returned function throws
 * when handed something that is not an Express app.
 *
 * @param options Configuration forwarded to setupCoherent
 */
export function createExpressIntegration(
  options?: SetupCoherentExpressOptions
): Promise<(app: Application) => Application>;

/**
 * A classic Express view engine that renders the component passed as the
 * `options` argument.
 *
 * Kept for consumers migrating from the standalone `@coherent.js/express`
 * package; new code should prefer {@link setupCoherent}.
 */
export function expressEngine(): (
  filePath: string,
  options: unknown,
  callback: (err: Error | null, html?: string) => void
) => void;

/**
 * Default export with all utilities
 */
declare const coherentExpress: {
  coherentMiddleware: typeof coherentMiddleware;
  createCoherentHandler: typeof createCoherentHandler;
  enhancedExpressEngine: typeof enhancedExpressEngine;
  setupCoherent: typeof setupCoherent;
  createExpressIntegration: typeof createExpressIntegration;
};

export default coherentExpress;
