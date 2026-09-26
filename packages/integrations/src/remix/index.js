// src/remix/index.js
//
// Public entry point for @coherent.js/integrations/remix. Provides SSR
// integration and loader utilities for Remix projects.
//
// Remix (and therefore React) must be installed as a peer dependency to use
// this integration.
//
// Usage:
//   import { createRemixAdapter } from '@coherent.js/integrations/remix';

import { createElement } from 'react';
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
export function createRemixAdapter(_options = {}) {
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
 * Returns a React component that renders the Coherent.js markup inside a
 * wrapper element via `dangerouslySetInnerHTML`. Returning the HTML string
 * itself would make React escape it and show the tags as text. The
 * Coherent.js renderer escapes text and attribute values, so only markup the
 * component describes (or passes through its explicit `html` field) is raw.
 *
 * @param {Function|Object} Component - Coherent.js component function or object
 * @param {Object} [options] - Wrapper options
 * @param {string} [options.as='div'] - Tag name of the wrapper element
 * @returns {Function} Remix-compatible React component
 */
export function withCoherent(Component, options = {}) {
  const { as = 'div' } = options;

  return function CoherentRemixComponent(props) {
    const def = typeof Component === 'function' ? Component(props) : Component;
    return createElement(as, { dangerouslySetInnerHTML: { __html: render(def) } });
  };
}
