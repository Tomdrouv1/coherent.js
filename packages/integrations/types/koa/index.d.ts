// Type definitions for Coherent.js Koa integration.
//
// Aligned with the runtime exports of ../../src/koa/coherent-koa.js. Koa's
// own types come from @types/koa.

import type { Middleware, Next, ParameterizedContext } from 'koa';
import type { CoherentNode } from '@coherent.js/core';

export interface CoherentKoaRenderOptions {
  /**
   * Enable performance monitoring for rendered components
   * @default false
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * HTML template with a `{{content}}` placeholder
   * @default '<!DOCTYPE html>\n{{content}}'
   */
  template?: string;
}

export interface CoherentKoaMiddlewareOptions extends CoherentKoaRenderOptions {
  /**
   * Also render any component-shaped `ctx.body` once downstream middleware
   * has finished.
   *
   * Detection is a heuristic: every single-key object qualifies, so JSON
   * bodies such as `{ ok: true }` would be rendered as HTML. Use
   * `ctx.coherent(component)` instead unless the app never responds with
   * single-key JSON objects.
   * @default false
   */
  autoRender?: boolean;
}

export interface SetupCoherentKoaOptions extends CoherentKoaMiddlewareOptions {
  /**
   * Install {@link coherentKoaMiddleware}
   * @default true
   */
  useMiddleware?: boolean;
}

/** Anything with Koa's `use()`, i.e. a Koa application. */
export interface KoaAppLike {
  use(middleware: Middleware<any, any>): unknown;
}

/**
 * Koa middleware that adds `ctx.coherent(component, options?)` and, with
 * `autoRender`, renders component-shaped `ctx.body` values.
 */
export function coherentKoaMiddleware(options?: CoherentKoaMiddlewareOptions): Middleware;

/**
 * Create a Koa middleware that renders the component returned by the factory
 * into `ctx.body` as `text/html`.
 */
export function createHandler<Ctx extends ParameterizedContext = ParameterizedContext>(
  componentFactory: (ctx: Ctx, next: Next) => CoherentNode | Promise<CoherentNode>,
  options?: CoherentKoaRenderOptions
): (ctx: Ctx, next: Next) => Promise<void>;

/**
 * Install {@link coherentKoaMiddleware} on a Koa app. Every option except
 * `useMiddleware` is forwarded to the middleware.
 */
export function setupCoherent(app: KoaAppLike, options?: SetupCoherentKoaOptions): void;

/**
 * Verify Koa is installed, then return a function that applies
 * {@link setupCoherent} to an app and returns it.
 */
export function createKoaIntegration(
  options?: SetupCoherentKoaOptions
): Promise<<App extends KoaAppLike>(app: App) => App>;

declare module 'koa' {
  interface DefaultContext {
    /**
     * Render a Coherent.js component (wrapped in the middleware's template)
     * into `ctx.body` as `text/html` and return the HTML. Rendering errors
     * are thrown. Added by `coherentKoaMiddleware()` / `setupCoherent()`.
     */
    coherent(component: CoherentNode, options?: CoherentKoaRenderOptions): string;
  }
}

declare const coherentKoa: {
  coherentKoaMiddleware: typeof coherentKoaMiddleware;
  createHandler: typeof createHandler;
  setupCoherent: typeof setupCoherent;
  createKoaIntegration: typeof createKoaIntegration;
};

export default coherentKoa;
