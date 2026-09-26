/**
 * Vite Plugin for Coherent.js
 *
 * @experimental Pass-throughs: they register under a name but change
 * nothing about resolution, loading, transformation or bundle output.
 */

import { warnExperimental } from './experimental.js';

/**
 * @param {Object} [options]
 * @param {boolean} [options.silent] - Hide the experimental notice.
 */
export function createVitePlugin(options = {}) {
  warnExperimental('createVitePlugin', options);
  return {
    name: 'coherent'
  };
}

/**
 * @param {Object} [options]
 * @param {boolean} [options.silent] - Hide the experimental notice.
 */
export function createSSRPlugin(options = {}) {
  warnExperimental('createSSRPlugin', options);
  return {
    name: 'coherent-ssr'
  };
}
