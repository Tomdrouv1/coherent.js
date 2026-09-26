// src/express/index.js
//
// Public entry point for @coherent.js/integrations/express. Re-exports the
// full runtime surface from coherent-express.js so the runtime matches the
// TypeScript declarations in ../../types/express/index.d.ts.
//
// `expressEngine` is preserved as a thin factory wrapper for backwards
// compatibility with consumers that imported it from the legacy
// @coherent.js/express package.

import { enhancedExpressEngine } from './coherent-express.js';

export {
  coherentMiddleware,
  createCoherentHandler,
  enhancedExpressEngine,
  setupCoherent,
  createExpressIntegration
} from './coherent-express.js';

export { default } from './coherent-express.js';

/**
 * Factory returning a classic Express view engine for Coherent.js views
 * (see `enhancedExpressEngine`): `app.engine('js', expressEngine())`.
 *
 * @returns {(filePath: string, options: unknown, callback: (err: Error | null, html?: string) => void) => void}
 */
export function expressEngine() {
  return enhancedExpressEngine;
}
