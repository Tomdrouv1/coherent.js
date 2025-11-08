/**
 * SvelteKit Adapter for Coherent.js
 */

import { render } from '@coherent.js/core';

export function createSvelteKitAdapter(_options = {}) {
  return {
    name: '@coherent.js/sveltekit',
    renderComponent: (component, props) => render(component, props)
  };
}

export function createPreprocessor(_options = {}) {
  return {
    name: 'coherent-preprocessor',
    markup({ content, _filename }) {
      // Basic preprocessor logic
      return {
        code: content
      };
    }
  };
}
