/**
 * Enhanced Express.js integration for Coherent.js
 * Provides middleware and utilities for using Coherent.js with Express
 */

import { pathToFileURL } from 'node:url';
import {
  render,
  importPeerDependency,
  renderWithTemplate,
  isCoherentComponent
} from '@coherent.js/core';

const DEFAULT_TEMPLATE = '<!DOCTYPE html>\n{{content}}';

/**
 * Coherent.js Express middleware.
 *
 * Adds `res.coherent(component, renderOptions?)`, which renders a Coherent.js
 * component (wrapped in `template`) and sends it as `text/html`. Rendering
 * errors are forwarded to Express error handling, like `res.render` does.
 *
 * With `autoRender: true` it additionally overrides `res.send` so that any
 * object that looks like a component is rendered to HTML. That detection is
 * a heuristic -- every single-key object qualifies, so `res.send({ ok: true })`
 * or `res.json({ users })` routed through `res.send` would be rendered as
 * `<ok>` / `<users>` instead of serialized as JSON. It is off by default; only
 * enable it for apps that never send single-key JSON objects.
 *
 * @param {Object} options - Configuration options
 * @param {boolean} [options.enablePerformanceMonitoring=false] - Enable performance monitoring
 * @param {string} [options.template] - HTML template with {{content}} placeholder
 * @param {boolean} [options.autoRender=false] - Render component-shaped objects passed to `res.send`
 * @returns {Function} Express middleware function
 */
export function coherentMiddleware(options = {}) {
  const {
    enablePerformanceMonitoring = false,
    template = DEFAULT_TEMPLATE,
    autoRender = false
  } = options;

  return (req, res, next) => {
    // Store original send method
    const originalSend = res.send;

    // Explicit rendering: res.coherent(component, { template?, enablePerformanceMonitoring? })
    res.coherent = function coherent(component, renderOptions = {}) {
      let finalHtml;
      try {
        finalHtml = renderWithTemplate(component, {
          enablePerformanceMonitoring: renderOptions.enablePerformanceMonitoring ?? enablePerformanceMonitoring,
          template: renderOptions.template ?? template
        });
      } catch (_error) {
        // Same contract as res.render(): hand the error to the app's error
        // middleware. req.next is the router's current `next`, so this works
        // from sync, async (Express 4 and 5) and callback code alike.
        (req.next ?? next)(_error);
        return this;
      }

      this.set('Content-Type', 'text/html; charset=utf-8');
      return originalSend.call(this, finalHtml);
    };

    if (autoRender) {
      // Override send method to handle Coherent.js objects
      res.send = function(data) {
        // If data looks like a Coherent.js object (plain object with a single key), render it
        if (isCoherentComponent(data)) {
          try {
            // Use shared rendering utility
            const finalHtml = renderWithTemplate(data, { enablePerformanceMonitoring, template });

            // Set content type and send HTML
            res.set('Content-Type', 'text/html');
            return originalSend.call(this, finalHtml);
          } catch (_error) {
            console.error('Coherent.js rendering error:', _error);
            return next(_error);
          }
        }

        // For non-Coherent.js data, use original send method
        return originalSend.call(this, data);
      };
    }

    next();
  };
}

/**
 * Create an Express route handler for Coherent.js components
 *
 * The factory receives `(req, res, next)`. If it answers the request itself
 * (`res.redirect()`, `res.json()`, ...) nothing further is sent.
 *
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @returns {Function} Express route handler
 */
export function createCoherentHandler(componentFactory, options = {}) {
  return async (req, res, next) => {
    try {
      const component = await componentFactory(req, res, next);

      // The factory already responded: sending again would throw
      // ERR_HTTP_HEADERS_SENT.
      if (res.headersSent) return;

      if (!component) {
        throw new Error('Component factory returned null/undefined');
      }

      const finalHtml = renderWithTemplate(component, options);

      // Send HTML response
      res.set('Content-Type', 'text/html');
      res.send(finalHtml);
    } catch (_error) {
      console.error('Coherent.js handler error:', _error);
      next(_error);
    }
  };
}

/** Keys Express merges into the view-engine options besides the locals. */
const EXPRESS_VIEW_OPTION_KEYS = new Set(['settings', '_locals', 'cache']);

/** View files that are loaded as ES modules rather than used as markers. */
const VIEW_MODULE_EXTENSION = /\.(?:js|mjs|cjs)$/;

/**
 * Resolve the component for a view.
 *
 * A JavaScript view module's default export is the component: a function is
 * called with the render locals, anything else is used as-is. Any other view
 * file (e.g. an empty `home.coherent`) only satisfies Express's lookup, and
 * the locals themselves are the component: `res.render('home', { div: ... })`.
 */
async function resolveViewComponent(filePath, locals) {
  if (!VIEW_MODULE_EXTENSION.test(filePath)) {
    return locals;
  }

  const viewModule = await import(pathToFileURL(filePath).href);
  if (!('default' in viewModule)) {
    throw new Error(`Coherent.js view "${filePath}" has no default export`);
  }

  const view = viewModule.default;
  return typeof view === 'function' ? view(locals) : view;
}

/**
 * Express view engine for Coherent.js views.
 *
 * Register it with `setupCoherent(app, { useEngine: true })`, or directly with
 * `app.engine('js', enhancedExpressEngine)` to render view modules
 * (`views/home.js` exporting a component or `(locals) => component` as
 * default). Express's own `settings`, `_locals` and `cache` keys are removed
 * before the locals reach the component.
 *
 * @param {string} filePath - Absolute path of the view file Express resolved
 * @param {Object} options - Render locals merged by Express
 * @param {Function} callback - Callback function
 */
export function enhancedExpressEngine(filePath, options, callback) {
  const locals = {};
  for (const [key, value] of Object.entries(options ?? {})) {
    if (!EXPRESS_VIEW_OPTION_KEYS.has(key)) locals[key] = value;
  }

  resolveViewComponent(filePath, locals).then(
    (component) => {
      let html;
      try {
        html = render(component);
      } catch (_error) {
        callback(_error);
        return;
      }
      callback(null, html);
    },
    (_error) => callback(_error)
  );
}

/**
 * Setup Coherent.js with Express app
 *
 * Installs {@link coherentMiddleware} (so routes can call `res.coherent()`)
 * and, when asked to, registers {@link enhancedExpressEngine} as a view
 * engine. The engine is opt-in so it does not take over an app's existing
 * `view engine`; it only becomes the default engine when none is set.
 *
 * @param {Object} app - Express app instance
 * @param {Object} options - Setup options
 * @param {boolean} [options.useMiddleware=true] - Install coherentMiddleware
 * @param {boolean} [options.useEngine=false] - Register the view engine
 * @param {string} [options.engineName='coherent'] - View engine name / file extension
 *   (use 'js' to render `views/*.js` modules)
 * @param {boolean} [options.enablePerformanceMonitoring=false] - Enable performance monitoring
 * @param {string} [options.template] - HTML template with {{content}} placeholder
 * @param {boolean} [options.autoRender=false] - Render component-shaped objects passed to `res.send`
 *   (see coherentMiddleware for why this is opt-in)
 */
export function setupCoherent(app, options = {}) {
  const {
    useMiddleware = true,
    useEngine = false,
    engineName = 'coherent',
    enablePerformanceMonitoring = false,
    template,
    autoRender = false
  } = options;

  // Register the view engine (opt-in); never override an existing default engine
  if (useEngine) {
    app.engine(engineName, enhancedExpressEngine);
    if (!app.get('view engine')) {
      app.set('view engine', engineName);
    }
  }

  // Install the middleware (res.coherent, plus res.send auto-rendering when opted in)
  if (useMiddleware) {
    app.use(coherentMiddleware({ enablePerformanceMonitoring, template, autoRender }));
  }
}

/**
 * Create Express integration with dependency checking
 * This function ensures Express is available before setting up the integration
 *
 * @param {Object} options - Setup options
 * @returns {Promise<Function>} - Function to setup Express integration
 */
export async function createExpressIntegration(options = {}) {
  try {
    // Verify Express is available
    await importPeerDependency('express', 'Express.js');

    return function(app) {
      if (!app || typeof app.use !== 'function') {
        throw new Error('Invalid Express app instance provided');
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
  coherentMiddleware,
  createCoherentHandler,
  enhancedExpressEngine,
  setupCoherent,
  createExpressIntegration
};
