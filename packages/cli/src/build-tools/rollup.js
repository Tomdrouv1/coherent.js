/**
 * Rollup Plugin for Coherent.js
 *
 * @experimental A pass-through: it claims no module ids and changes no
 * code, so Rollup resolves and loads `*.coherent.js` files like any other
 * module. (It used to return raw relative ids from `resolveId`, which broke
 * every build importing a `.coherent.js` file.)
 */

import { warnExperimental } from './experimental.js';

/**
 * @param {Object} [options]
 * @param {boolean} [options.silent] - Hide the experimental notice.
 */
export function createRollupPlugin(options = {}) {
  warnExperimental('createRollupPlugin', options);
  return {
    name: 'coherent'
  };
}
