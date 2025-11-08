/**
 * Astro Integration for Coherent.js
 */

import { render } from '@coherent.js/core';

export function createAstroIntegration(_options = {}) {
  return {
    name: 'coherent',
    hooks: {
      'astro:config:setup': ({ addRenderer }) => {
        addRenderer({
          name: '@coherent.js/adapters/astro',
          serverEntrypoint: '@coherent.js/adapters/astro/server.js',
        });
      }
    }
  };
}

export async function renderComponent(Component, props) {
  return render(Component, props);
}
