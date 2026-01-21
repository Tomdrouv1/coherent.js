/**
 * Event Delegation Module for Coherent.js Client
 *
 * Provides document-level event delegation that survives DOM updates.
 *
 * @module @coherent.js/client/events
 */

export { EventDelegation, eventDelegation } from './delegation.js';
export { HandlerRegistry, handlerRegistry } from './registry.js';
export { wrapEvent } from './wrapper.js';
