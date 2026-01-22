/**
 * Coherent.js HMR Client
 *
 * @deprecated Import from '@coherent.js/client' or '@coherent.js/client/src/hmr/index.js' instead.
 * This file is kept for backward compatibility and auto-initializes HMR on import.
 *
 * Migration:
 *   // Old (deprecated)
 *   import '@coherent.js/client/src/hmr.js';
 *
 *   // New
 *   import { hmrClient } from '@coherent.js/client';
 *   hmrClient.connect();
 *
 * @module @coherent.js/client/hmr
 */

// Re-export all HMR modules for backward compatibility
export * from './hmr/index.js';

// Import hmrClient for auto-initialization
import { hmrClient } from './hmr/index.js';

/**
 * Legacy auto-initialization IIFE
 * Maintains backward compatibility with existing code that imports this file
 * for its side effect of auto-connecting to the dev server.
 */
(function initHMR() {
  if (typeof window === 'undefined') return;
  if (window.__coherent_hmr_initialized) return;
  window.__coherent_hmr_initialized = true;
  hmrClient.connect();
})();
