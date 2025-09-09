/**
 * Astro Integration for Coherent.js
 */

import { renderToString } from '@coherentjs/core';

export function createAstroIntegration(_options = {}) {
  return {
    name: 'coherent',
    hooks: {
      'astro:config:setup': ({ addRenderer }) => {
        addRenderer({
          name: '@coherentjs/adapters/astro',
          serverEntrypoint: '@coherentjs/adapters/astro/server.js',
        });
      }
    }
  };
}

export async function renderComponent(Component, props) {
  return renderToString(Component, props);
}