/**
 * Astro Integration for Coherent.js
 *
 * Provides server-side rendering of Coherent.js components within Astro projects.
 */

import { render } from '@coherent.js/core';

/**
 * Create an Astro integration for Coherent.js
 *
 * @param {Object} [options] - Integration options
 * @param {boolean} [options.hydrate] - Enable client-side hydration
 * @param {string} [options.hydrateScript] - Custom hydration script path
 * @returns {Object} Astro integration configuration
 *
 * @example
 * // astro.config.mjs
 * import { createAstroIntegration } from '@coherent.js/adapters/astro';
 * export default { integrations: [createAstroIntegration()] };
 */
export function createAstroIntegration(options = {}) {
  return {
    name: 'coherent',
    hooks: {
      'astro:config:setup': ({ addRenderer, updateConfig }) => {
        addRenderer({
          name: '@coherent.js/adapters/astro',
          serverEntrypoint: '@coherent.js/adapters/astro',
        });

        if (options.hydrate) {
          updateConfig({
            vite: {
              optimizeDeps: {
                include: ['@coherent.js/client']
              }
            }
          });
        }
      },
      'astro:build:done': ({ logger }) => {
        logger?.info('Coherent.js components built successfully');
      }
    }
  };
}

/**
 * Render a Coherent.js component to HTML string
 *
 * @param {Function|Object} Component - Coherent.js component
 * @param {Object} [props] - Component props
 * @param {Object} [renderOptions] - Rendering options
 * @returns {string} Rendered HTML
 */
export function renderComponent(Component, props = {}, renderOptions = {}) {
  const componentDef = typeof Component === 'function'
    ? Component(props)
    : Component;

  return render(componentDef, renderOptions);
}

/**
 * Create a server-side component renderer for Astro
 *
 * @param {Object} [options] - Renderer options
 * @returns {Object} Astro renderer configuration
 */
export function createRenderer(options = {}) {
  return {
    name: '@coherent.js/astro-renderer',
    check(Component) {
      // Check if this looks like a Coherent.js component (function or plain object with tag keys)
      return typeof Component === 'function' ||
        (typeof Component === 'object' && Component !== null && !Array.isArray(Component));
    },
    renderToStaticMarkup(Component, props) {
      const html = renderComponent(Component, props, options);
      return { html };
    }
  };
}
