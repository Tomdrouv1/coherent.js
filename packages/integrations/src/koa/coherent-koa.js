/**
 * Koa.js integration for Coherent.js
 * Provides middleware and utilities for using Coherent.js with Koa
 */

import {
  importPeerDependency,
  renderWithTemplate,
  renderComponentFactory,
  isCoherentComponent
} from '@coherent.js/core';

/**
 * Coherent.js Koa middleware.
 *
 * Adds `ctx.coherent(component, renderOptions?)`, which renders a Coherent.js
 * component (wrapped in `template`) into `ctx.body` as `text/html`. Rendering
 * errors are thrown, so they reach the app's error-handling middleware.
 *
 * With `autoRender: true` it additionally renders any `ctx.body` that looks
 * like a component once downstream middleware has finished. That detection
 * is a heuristic -- every single-key object qualifies, so
 * `ctx.body = { ok: true }` would be rendered as `<ok>` instead of serialized
 * as JSON. It is off by default; only enable it for apps that never respond
 * with single-key JSON objects.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} [options.enablePerformanceMonitoring=false] - Enable performance monitoring
 * @param {string} [options.template] - HTML template with {{content}} placeholder
 * @param {boolean} [options.autoRender=false] - Render component-shaped `ctx.body` values
 * @returns {Function} Koa middleware function
 */
export function coherentKoaMiddleware(options = {}) {
  const {
    enablePerformanceMonitoring = false,
    template = '<!DOCTYPE html>\n{{content}}',
    autoRender = false
  } = options;

  return async (ctx, next) => {
    // Explicit rendering: ctx.coherent(component, { template?, enablePerformanceMonitoring? })
    ctx.coherent = (component, renderOptions = {}) => {
      const finalHtml = renderWithTemplate(component, {
        enablePerformanceMonitoring: renderOptions.enablePerformanceMonitoring ?? enablePerformanceMonitoring,
        template: renderOptions.template ?? template
      });
      ctx.type = 'html';
      ctx.body = finalHtml;
      return finalHtml;
    };

    await next();

    // Opt-in: if the response body looks like a Coherent.js object, render it
    if (autoRender && isCoherentComponent(ctx.body)) {
      try {
        // Use shared rendering utility
        const finalHtml = renderWithTemplate(ctx.body, { enablePerformanceMonitoring, template });

        // Set content type and body
        ctx.type = 'text/html';
        ctx.body = finalHtml;
      } catch (_error) {
        console.error('Coherent.js rendering error:', _error);
        throw _error;
      }
    }
  };
}

/**
 * Create a Koa route handler for Coherent.js components
 *
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @returns {Function} Koa route handler
 */
export function createHandler(componentFactory, options = {}) {
  return async (ctx, next) => {
    try {
      // Use shared rendering utility
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [ctx, next],
        options
      );

      // Set response
      ctx.type = 'text/html';
      ctx.body = finalHtml;
    } catch (_error) {
      console.error('Coherent.js handler error:', _error);
      throw _error;
    }
  };
}

/**
 * Setup Coherent.js with Koa app
 *
 * Installs {@link coherentKoaMiddleware}, so downstream middleware can call
 * `ctx.coherent(component)`. Every option except `useMiddleware` is forwarded
 * to the middleware, including `template` and `autoRender`.
 *
 * @param {Object} app - Koa app instance
 * @param {Object} options - Setup options
 * @param {boolean} [options.useMiddleware=true] - Install coherentKoaMiddleware
 */
export function setupCoherent(app, options = {}) {
  const { useMiddleware = true, ...middlewareOptions } = options;

  // Use middleware for automatic rendering. Forward everything except the
  // setup-only flag so callers can supply `template`, `enablePerformanceMonitoring`,
  // and any future middleware options.
  if (useMiddleware) {
    app.use(coherentKoaMiddleware(middlewareOptions));
  }
}

/**
 * Create Koa integration with dependency checking
 * This function ensures Koa is available before setting up the integration
 *
 * @param {Object} options - Setup options
 * @returns {Promise<Function>} - Function to setup Koa integration
 */
export async function createKoaIntegration(options = {}) {
  try {
    // Verify Koa is available
    await importPeerDependency('koa', 'Koa.js');

    return function(app) {
      if (!app || typeof app.use !== 'function') {
        throw new Error('Invalid Koa app instance provided');
      }

      setupCoherent(app, options);
      return app;
    };
  } catch (_error) {
    throw _error;
  }
}

// Export all utilities
export default {
  coherentKoaMiddleware,
  createHandler,
  setupCoherent,
  createKoaIntegration
};
