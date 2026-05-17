/**
 * Coherent.js HMR — legacy module entrypoint
 *
 * REMOVED in 1.0. This file existed in beta to auto-initialize HMR on import.
 * Direct imports of this path now throw immediately so callers see the
 * migration instruction instead of silent failures further down the call stack.
 *
 * @module @coherent.js/client/hmr
 */

throw new Error(
  "Coherent.js 1.0: importing '@coherent.js/client/src/hmr.js' was removed. " +
  "Import { hmrClient } from '@coherent.js/client' and call hmrClient.connect() instead. " +
  "See https://coherentjs.dev/docs/migration/1.0#removed-client-hmr-shim"
);
