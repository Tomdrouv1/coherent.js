/**
 * Coherent.js Client Package
 *
 * Public API for client-side hydration, event delegation, and state management.
 *
 * @module @coherent.js/client
 */

// New clean hydrate API (Phase 2)
export { hydrate } from './hydrate.js';

// Event delegation system (Plan 02-01)
export {
  EventDelegation,
  eventDelegation,
  HandlerRegistry,
  handlerRegistry,
  wrapEvent,
} from './events/index.js';

// State serialization (Plan 02-02)
export {
  serializeState,
  deserializeState,
  extractState,
  serializeStateWithWarning,
} from './hydration/index.js';

// Mismatch detection (Plan 02-03)
export {
  detectMismatch,
  reportMismatches,
  formatPath,
} from './hydration/index.js';

// Legacy exports for backward compatibility
export {
  hydrate as legacyHydrate,
  hydrateAll,
  hydrateBySelector,
  enableClientEvents,
  makeHydratable,
  autoHydrate,
  registerEventHandler,
} from './hydration.js';

// HMR client (Phase 4)
export {
  HMRClient,
  hmrClient,
  ModuleTracker,
  moduleTracker,
  createHotContext,
  CleanupTracker,
  cleanupTracker,
  StateCapturer,
  stateCapturer,
  ErrorOverlay,
  errorOverlay,
  ConnectionIndicator,
  connectionIndicator,
} from './hmr/index.js';
