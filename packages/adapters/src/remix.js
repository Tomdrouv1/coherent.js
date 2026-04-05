/**
 * Remix Adapter for Coherent.js
 *
 * Provides SSR integration and loader utilities for Remix projects.
 */

import { render } from '@coherent.js/core';

/**
 * Create a Remix adapter for Coherent.js
 *
 * @param {Object} [options] - Adapter options
 * @param {boolean} [options.hydrate] - Enable client-side hydration
 * @returns {Object} Remix adapter utilities
 *
 * @example
 * const adapter = createRemixAdapter();
 * const html = adapter.renderComponent(MyComponent, { title: 'Hello' });
 */
export function createRemixAdapter(options = {}) {
  return {
    /**
     * Render a Coherent.js component to HTML
     */
    renderComponent(component, props = {}) {
      const def = typeof component === 'function' ? component(props) : component;
      return render(def);
    },

    /**
     * Create a Remix loader that renders a Coherent.js component
     */
    createLoader(component, getProps) {
      return async ({ request, params, context }) => {
        const props = getProps
          ? await getProps({ request, params, context })
          : { request, params };

        const def = typeof component === 'function' ? component(props) : component;
        const html = render(def);

        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      };
    },

    /**
     * Create a Remix action handler that processes form data
     * and renders a Coherent.js component with the result
     */
    createAction(component, handler) {
      return async ({ request, params, context }) => {
        const formData = await request.formData();
        const data = Object.fromEntries(formData);
        const result = await handler({ data, request, params, context });

        if (result instanceof Response) return result;

        const def = typeof component === 'function' ? component(result) : component;
        const html = render(def);

        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      };
    }
  };
}

/**
 * HOC: Wrap a Coherent.js component for use in Remix routes
 *
 * @param {Function} Component - Coherent.js component function
 * @returns {Function} Remix-compatible component
 */
export function withCoherent(Component) {
  return function CoherentRemixComponent(props) {
    const def = typeof Component === 'function' ? Component(props) : Component;
    return render(def);
  };
}
