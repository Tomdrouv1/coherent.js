/**
 * Next.js integration for Coherent.js
 * Provides utilities for using Coherent.js with Next.js
 */

import {
  render,
  performanceMonitor,
  renderComponentFactory
} from '@coherent.js/core';

function missingPeer(packageName, integrationName, cause) {
  const error = new Error(
    `${integrationName} requires the '${packageName}' package to be installed.\n` +
    `Please install it with: npm install ${packageName} (or pnpm add / yarn add)`
  );
  error.cause = cause;
  return error;
}

/**
 * The React module to build elements with.
 *
 * An injected `options.React` wins. Otherwise React is imported from *this*
 * package: it declares `react` as an optional peer, so package managers link
 * the app's copy next to it. (core's `importPeerDependency` imports relative
 * to @coherent.js/core instead, which cannot see the app's `react` under
 * pnpm's isolated layout.) The literal specifier keeps it bundler-friendly.
 *
 * @param {Object} [injected] - A React module or namespace supplied by the app
 * @param {string} integrationName - Used in the error message
 * @returns {Promise<Object>} Object exposing createElement / useState / useEffect
 */
async function loadReact(injected, integrationName) {
  let mod = injected;
  if (!mod) {
    try {
      mod = await import('react');
    } catch (_error) {
      throw missingPeer('react', integrationName, _error);
    }
  }
  // Namespace imports of CommonJS React carry the API on `default`.
  return typeof mod.createElement === 'function' ? mod : mod.default;
}

/**
 * Create a Next.js API route handler for Coherent.js components
 *
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @param {boolean} options.enablePerformanceMonitoring - Enable performance monitoring
 * @param {string} options.template - HTML template with {{content}} placeholder
 * @returns {Function} Next.js API route handler
 */
export function createCoherentNextHandler(componentFactory, options = {}) {
  return async (req, res) => {
    try {
      // Use shared rendering utility
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [req, res],
        options
      );

      // Send HTML response
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(finalHtml);
    } catch (_error) {
      console.error('Coherent.js Next.js handler error:', _error);
      res.status(500).json({ error: _error.message });
    }
  };
}

/**
 * Create a Next.js App Router route handler for Coherent.js components
 *
 * The factory receives the same `(request, context)` pair Next.js passes to
 * route handlers, so dynamic segments are available as `context.params`
 * (a Promise since Next.js 15).
 *
 * @param {Function} componentFactory - `(request, context) => component`
 * @param {Object} options - Handler options
 * @returns {Function} Next.js App Router route handler
 */
export function createCoherentAppRouterHandler(componentFactory, options = {}) {
  return async function handler(request, context) {
    try {
      // Use shared rendering utility
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [request, context],
        options
      );

      // Send HTML response
      return new Response(finalHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } catch (_error) {
      console.error('Coherent.js Next.js App Router handler error:', _error);
      return new Response(
        JSON.stringify({ error: _error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

/**
 * Create a Next.js Server Component for Coherent.js
 *
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Component options
 * @param {boolean} [options.enablePerformanceMonitoring=false] - Enable performance monitoring
 * @param {Object} [options.React] - React module to use instead of importing `react`
 * @returns {Promise<Function>} Next.js Server Component
 */
export async function createCoherentServerComponent(componentFactory, options = {}) {
  const {
    enablePerformanceMonitoring = false
  } = options;

  const React = await loadReact(options.React, 'Next.js Server Component integration');

  return async function CoherentServerComponent(props) {
    try {
      // Create component with props
      const component = await Promise.resolve(
        componentFactory(props)
      );

      if (!component) {
        return React.createElement('div', null, 'Error: Component factory returned null/undefined');
      }

      // Render component
      let html;
      if (enablePerformanceMonitoring) {
        const renderId = performanceMonitor.startRender();
        html = render(component);
        performanceMonitor.endRender(renderId);
      } else {
        html = render(component);
      }

      // Return dangerouslySetInnerHTML to render HTML
      return React.createElement('div', {
        dangerouslySetInnerHTML: { __html: html }
      });
    } catch (_error) {
      console.error('Coherent.js Next.js Server Component error:', _error);
      return React.createElement('div', null, `Error: ${_error.message}`);
    }
  };
}

/**
 * Create a Next.js Client Component for Coherent.js with hydration support
 *
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Component options
 * @param {boolean} [options.enablePerformanceMonitoring=false] - Enable performance monitoring
 * @param {Object} [options.React] - React module to use instead of importing `react`
 * @returns {Promise<Function>} Next.js Client Component
 */
export async function createCoherentClientComponent(componentFactory, options = {}) {
  const {
    enablePerformanceMonitoring = false
  } = options;

  const React = await loadReact(options.React, 'Next.js Client Component integration');

  return function CoherentClientComponent(props) {
    const [html, setHtml] = React.useState('');

    React.useEffect(() => {
      async function renderComponent() {
        try {
          // Create component with props
          const component = await Promise.resolve(
            componentFactory(props)
          );

          if (!component) {
            setHtml('Error: Component factory returned null/undefined');
            return;
          }

          // Render component
          let renderedHtml;
          if (enablePerformanceMonitoring) {
            const renderId = performanceMonitor.startRender();
            renderedHtml = render(component);
            performanceMonitor.endRender(renderId);
          } else {
            renderedHtml = render(component);
          }

          setHtml(renderedHtml);
        } catch (_error) {
          console.error('Coherent.js Next.js Client Component error:', _error);
          setHtml(`Error: ${_error.message}`);
        }
      }

      renderComponent();
    }, [props]);

    return React.createElement('div', {
      dangerouslySetInnerHTML: { __html: html }
    });
  };
}

/**
 * Create Next.js integration with dependency checking
 * This function ensures Next.js and React are available before setting up the integration
 *
 * @param {Object} options - Setup options
 * @returns {Promise<Object>} - Object with Next.js integration utilities
 */
export async function createNextIntegration(options = {}) {
  try {
    // Verify Next.js and React are available, resolved from this package
    // (see loadReact for why not core's importPeerDependency)
    try {
      await import('next');
    } catch (_error) {
      throw missingPeer('next', 'Next.js integration', _error);
    }
    await loadReact(options.React, 'Next.js integration');

    return {
      createCoherentNextHandler: (componentFactory, handlerOptions = {}) =>
        createCoherentNextHandler(componentFactory, { ...options, ...handlerOptions }),
      createCoherentAppRouterHandler: (componentFactory, handlerOptions = {}) =>
        createCoherentAppRouterHandler(componentFactory, { ...options, ...handlerOptions }),
      createCoherentServerComponent: (componentFactory, componentOptions = {}) =>
        createCoherentServerComponent(componentFactory, { ...options, ...componentOptions }),
      createCoherentClientComponent: (componentFactory, componentOptions = {}) =>
        createCoherentClientComponent(componentFactory, { ...options, ...componentOptions })
    };
  } catch (_error) {
    throw _error;
  }
}

// Export all utilities
export default {
  createCoherentNextHandler,
  createCoherentAppRouterHandler,
  createCoherentServerComponent,
  createCoherentClientComponent,
  createNextIntegration
};
