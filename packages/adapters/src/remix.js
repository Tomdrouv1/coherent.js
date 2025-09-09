/**
 * Remix Adapter for Coherent.js
 */

import { renderToString } from '@coherentjs/core';

export function createRemixAdapter(_options = {}) {
  return {
    renderComponent: (component, props) => renderToString(component, props),
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
    return renderToString(Component, props);
  };
}