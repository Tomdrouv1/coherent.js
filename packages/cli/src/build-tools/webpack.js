/**
 * Webpack Plugin for Coherent.js
 *
 * @experimental A pass-through: `apply()` hooks nothing into the compiler.
 */

import { warnExperimental } from './experimental.js';

export class CoherentWebpackPlugin {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.silent] - Hide the experimental notice.
   */
  constructor(options = {}) {
    this.options = options;
    warnExperimental('CoherentWebpackPlugin', options);
  }

  apply(_compiler) {
    // Intentionally empty until the plugin does something.
  }
}

export function createWebpackPlugin(options = {}) {
  return new CoherentWebpackPlugin(options);
}
