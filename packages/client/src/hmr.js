/**
 * Coherent.js HMR — `@coherent.js/client/hmr` entry point
 *
 * The HMR client API without the rest of the client package. Importing it has
 * no side effects: call `hmrClient.initialize()` (or `connect()`) yourself.
 * The beta build connected on import; that behaviour was removed in 1.0.
 *
 * @module @coherent.js/client/hmr
 */

export * from './hmr/index.js';
