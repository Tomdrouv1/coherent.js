/**
 * Coherent.js Webpack Loader
 *
 * @experimental A pass-through: returns the source unchanged (with any
 * incoming source map), so it is safe in a loader chain but does nothing yet.
 */

import { warnExperimental } from './experimental.js';

export function coherentLoader(source, map) {
  warnExperimental('coherentLoader', typeof this?.getOptions === 'function' ? this.getOptions() : {});
  if (typeof this?.callback === 'function') {
    this.callback(null, source, map);
    return undefined;
  }
  return source;
}
