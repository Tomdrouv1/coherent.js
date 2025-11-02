/**
 * SvelteKit Adapter for Coherent.js
 */

import { render } from '@coherentjs/core';

export function createSvelteKitAdapter(_options = {}) {
  return {
    name: '@coherentjs/sveltekit',
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
