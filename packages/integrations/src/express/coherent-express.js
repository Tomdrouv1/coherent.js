/**
 * Enhanced Express.js integration for Coherent.js
 * Provides middleware and utilities for using Coherent.js with Express
 */

import {
  render,
  importPeerDependency,
  renderWithTemplate,
  renderComponentFactory,
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
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @returns {Function} Express route handler
 */
export function createCoherentHandler(componentFactory, options = {}) {
  return async (req, res, next) => {
    try {
      // Use shared rendering utility
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [req, res, next],
        options
      );

      // Send HTML response
      res.set('Content-Type', 'text/html');
      res.send(finalHtml);
    } catch (_error) {
      console.error('Coherent.js handler error:', _error);
      next(_error);
    }
  };
}

/**
 * Enhanced Express engine for Coherent.js views
 *
 * @param {string} filePath - Path to view file (not used in Coherent.js)
 * @param {Object} options - View options containing Coherent.js component
 * @param {Function} callback - Callback function
 */
export function enhancedExpressEngine(filePath, options, callback) {
  try {
    // Render Coherent.js component from options
    const html = render(options);
    callback(null, html);
  } catch (_error) {
    callback(_error);
  }
}

/**
 * Setup Coherent.js with Express app
 *
 * Installs {@link coherentMiddleware} (so routes can call `res.coherent()`)
 * and optionally registers the view engine.
 *
 * @param {Object} app - Express app instance
 * @param {Object} options - Setup options
 * @param {boolean} [options.useMiddleware=true] - Install coherentMiddleware
 * @param {boolean} [options.useEngine=true] - Register the view engine
 * @param {string} [options.engineName='coherent'] - View engine name / file extension
 * @param {boolean} [options.enablePerformanceMonitoring=false] - Enable performance monitoring
 * @param {string} [options.template] - HTML template with {{content}} placeholder
 * @param {boolean} [options.autoRender=false] - Render component-shaped objects passed to `res.send`
 *   (see coherentMiddleware for why this is opt-in)
 */
export function setupCoherent(app, options = {}) {
  const {
    useMiddleware = true,
    useEngine = true,
    engineName = 'coherent',
    enablePerformanceMonitoring = false,
    template,
    autoRender = false
  } = options;

  // Register enhanced engine
  if (useEngine) {
    app.engine(engineName, enhancedExpressEngine);
    app.set('view engine', engineName);
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
