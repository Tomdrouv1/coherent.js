/**
 * Remix Adapter for Coherent.js
 */

import { render } from '@coherent.js/core';

export function createRemixAdapter(_options = {}) {
  return {
    renderComponent: (component, props) => render(component, props),
    createLoader: (component) => {
      return async ({ request, params }) => {
        return {
          component,
          props: { request, params }
        };
      };
    }
  };
}

export function withCoherent(Component) {
  return function CoherentRemixComponent(props) {
    return render(Component, props);
  };
}
