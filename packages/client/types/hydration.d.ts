/**
 * Coherent.js Client Hydration Types
 *
 * Re-exports hydration-specific types from the main index.d.ts.
 * This module provides types for server-to-client hydration APIs.
 *
 * @module @coherent.js/client/hydration
 */

export type {
  // Hydration options and results
  HydrationOptions,
  HydrationMismatch,
  HydrationResult,
  BatchHydrationResult,
  HydrateControl,
  HydratedInstance,
  MakeHydratableOptions,
  // State types
  SerializableState,
  SerializablePrimitive,
  StateTransforms,
  StateValidators,
  // Event handlers
  EventHandler,
  ClickHandler,
  KeyHandler,
  FocusHandler,
  SubmitHandler,
  ChangeHandler,
  InputHandler,
  MouseHandler,
  StateAwareHandler,
  // Client component
  ClientComponent,
  ComponentFactory,
  ComponentRegistryEntry,
  // Event delegation
  EventDelegation,
  HandlerRegistry,
} from './index';

export {
  // Main hydration functions
  hydrate,
  legacyHydrate,
  hydrateAll,
  hydrateBySelector,
  autoHydrate,
  enableClientEvents,
  makeHydratable,
  registerEventHandler,
  // State serialization
  serializeState,
  deserializeState,
  extractState,
  serializeStateWithWarning,
  // Mismatch detection
  detectMismatch,
  reportMismatches,
  formatPath,
  // Event delegation
  eventDelegation,
  handlerRegistry,
  wrapEvent,
} from './index';
