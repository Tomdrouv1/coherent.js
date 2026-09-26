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
   * @default '<!DOCTYPE html>\n{{content}}'
   */
  template?: string;
  
  /**
   * Enable server-side rendering
   * @default true
   */
  enableSSR?: boolean;

  /**
   * Also render component-shaped objects passed to `res.send()`.
   *
   * Detection is a heuristic: every single-key object qualifies, so JSON
   * payloads such as `{ ok: true }` or `{ users: [...] }` would be rendered
   * as HTML. Use `res.coherent(component)` instead unless the app never
   * sends single-key JSON objects.
   * @default false
   */
  autoRender?: boolean;
}

/**
 * Per-call options for `res.coherent()`; each falls back to the middleware's.
 */
export interface CoherentRenderOptions {
  enablePerformanceMonitoring?: boolean;
  /** HTML template with a `{{content}}` placeholder. */
  template?: string;
}

export interface CoherentHandlerOptions {
  /**
   * Enable performance monitoring for rendered components
   * @default false
   */
  enablePerformanceMonitoring?: boolean;
  
  /**
   * HTML template to wrap rendered components
   * @default '<!DOCTYPE html>\n{{content}}'
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
   * Register {@link enhancedExpressEngine} as a view engine. It becomes the
   * app's default `view engine` only if none is set yet.
   * @default false
   */
  useEngine?: boolean;

  /**
   * Name of the view engine, i.e. the view file extension. Use `'js'` to
   * render `views/*.js` modules whose default export is the component.
   * @default 'coherent'
   */
  engineName?: string;
  
  /**
   * Enable performance monitoring
   * @default false
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * HTML template with a `{{content}}` placeholder, used by `res.coherent()`
   * @default '<!DOCTYPE html>\n{{content}}'
   */
  template?: string;

  /**
   * Also render component-shaped objects passed to `res.send()`.
   * See {@link CoherentMiddlewareOptions.autoRender} for why this is opt-in.
   * @default false
   */
  autoRender?: boolean;

  /**
   * Static file directory for client-side assets
   * @default 'public'
   */
  staticDir?: string;
}

declare global {
  namespace Express {
    interface Response {
      /**
       * Render a Coherent.js component (wrapped in the middleware's template)
       * and send it as `text/html`. Rendering errors are passed to the app's
       * error middleware, as `res.render()` does. Added by
       * `coherentMiddleware()` / `setupCoherent()`.
       */
      coherent(component: CoherentNode, options?: CoherentRenderOptions): this;
    }
  }
}

/**
 * Coherent.js Express middleware
 * Adds `res.coherent()` (and, with `autoRender`, `res.send` rendering)
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
 * @param componentFactory Function that returns a Coherent component. If it
 *   responds itself (e.g. `res.redirect()`), its return value is ignored.
 * @param options Configuration options
 * @returns Express route handler
 */
export function createCoherentHandler(
  componentFactory: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => CoherentNode | void | Promise<CoherentNode | void>,
  options?: CoherentHandlerOptions
): (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Express view engine for Coherent.js views.
 *
 * A `.js`/`.mjs`/`.cjs` view module's default export is the component (a
 * function is called with the render locals). For any other view file the
 * locals themselves are rendered as the component. Express's `settings`,
 * `_locals` and `cache` keys are stripped from the locals first.
 * @param filePath Path to the view file
 * @param options Render locals
 * @param callback Callback function
 */
export function enhancedExpressEngine(
  filePath: string,
  options: any,
  callback: (err: Error | null, html?: string) => void
): void;

/**
 * Setup Coherent.js with Express app
 * Installs {@link coherentMiddleware} and, with `useEngine`, the view engine
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
 * Returns {@link enhancedExpressEngine}, for `app.engine('js', expressEngine())`.
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
