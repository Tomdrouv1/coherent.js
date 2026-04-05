/**
 * SvelteKit Adapter for Coherent.js
 *
 * Provides server-side rendering and preprocessor integration for SvelteKit projects.
 */

import { render } from '@coherent.js/core';

/**
 * Create a SvelteKit adapter for Coherent.js
 *
 * @param {Object} [options] - Adapter options
 * @returns {Object} SvelteKit adapter utilities
 *
 * @example
 * const adapter = createSvelteKitAdapter();
 * const html = adapter.renderComponent(MyComponent, { title: 'Hello' });
 */
export function createSvelteKitAdapter(options = {}) {
  return {
    name: '@coherent.js/sveltekit',

    /**
     * Render a Coherent.js component to HTML
     */
    renderComponent(component, props = {}) {
      const def = typeof component === 'function' ? component(props) : component;
      return render(def);
    },

    /**
     * Create a SvelteKit server load function
     */
    createLoad(component, getProps) {
      return async ({ params, url, fetch }) => {
        const props = getProps
          ? await getProps({ params, url, fetch })
          : { params };

        const def = typeof component === 'function' ? component(props) : component;
        const html = render(def);

        return { html, props };
      };
    },

    /**
     * Create a SvelteKit form action handler
     */
    createAction(handler) {
      return async ({ request, params }) => {
        const formData = await request.formData();
        const data = Object.fromEntries(formData);
        return handler({ data, params });
      };
    }
  };
}

/**
 * Create a Svelte preprocessor for Coherent.js templates
 *
 * Transforms inline Coherent.js object syntax within Svelte components.
 *
 * @param {Object} [options] - Preprocessor options
 * @param {string} [options.tag] - Custom tag to process (default: 'coherent')
 * @returns {Object} Svelte preprocessor
 */
export function createPreprocessor(options = {}) {
  const tag = options.tag || 'coherent';

  return {
    name: 'coherent-preprocessor',
    markup({ content, filename }) {
      // Find <coherent> blocks and render them to HTML
      const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'gs');
      let transformed = content;
      let match;

      while ((match = regex.exec(content)) !== null) {
        try {
          // The content inside <coherent> tags should be a JS object literal
          // This is a basic transform — production use should handle more cases
          const objectStr = match[1].trim();
          transformed = transformed.replace(match[0], `{@html coherentRender(${objectStr})}`);
        } catch {
          // Leave unchanged if parsing fails
        }
      }

      return {
        code: transformed,
        map: null
      };
    }
  };
}

/**
 * SvelteKit hooks integration
 *
 * @param {Object} [options] - Hook options
 * @returns {Object} SvelteKit handle function
 */
export function createHandle(options = {}) {
  return async ({ event, resolve }) => {
    // Add Coherent.js render function to locals
    event.locals.coherent = {
      render(component, props = {}) {
        const def = typeof component === 'function' ? component(props) : component;
        return render(def);
      }
    };

    return resolve(event);
  };
}
