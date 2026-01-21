/**
 * Event Delegation for Coherent.js
 *
 * Document-level event delegation that routes events to handlers via
 * data-coherent-{eventType} attributes. This ensures event handlers
 * survive DOM updates since they're registered by ID, not by element.
 */

import { handlerRegistry as defaultRegistry } from './registry.js';
import { wrapEvent } from './wrapper.js';

/**
 * EventDelegation class
 * Manages document-level event listeners and routes to registered handlers
 */
export class EventDelegation {
  /**
   * @param {import('./registry.js').HandlerRegistry} [registry] - Handler registry instance
   */
  constructor(registry = defaultRegistry) {
    this.registry = registry;
    this.initialized = false;
    this.root = null;
    this.boundHandlers = new Map();

    /**
     * Event types to delegate
     * Focus/blur use capture phase because they don't bubble
     */
    this.eventTypes = [
      'click',
      'change',
      'input',
      'submit',
      'focus',
      'blur',
      'keydown',
      'keyup',
      'keypress',
    ];
  }

  /**
   * Initialize event delegation by attaching listeners to the root element
   * @param {Document|Element} [root=document] - Root element for event delegation
   */
  initialize(root = typeof document !== 'undefined' ? document : null) {
    if (this.initialized) {
      return;
    }

    if (!root) {
      // No DOM available (SSR context)
      return;
    }

    this.root = root;

    for (const eventType of this.eventTypes) {
      const handler = (event) => this.handleEvent(event, eventType);

      // Focus and blur don't bubble - must use capture phase
      const useCapture = eventType === 'focus' || eventType === 'blur';

      // Submit needs preventDefault capability, others can be passive
      const options = {
        capture: useCapture,
        passive: eventType !== 'submit',
      };

      root.addEventListener(eventType, handler, options);
      this.boundHandlers.set(eventType, { handler, options });
    }

    this.initialized = true;
  }

  /**
   * Handle a delegated event
   * @param {Event} event - The DOM event
   * @param {string} eventType - The type of event (click, change, etc.)
   */
  handleEvent(event, eventType) {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') {
      return;
    }

    // Find the nearest element with the appropriate data attribute
    const attrName = `data-coherent-${eventType}`;
    const delegateTarget = target.closest(`[${attrName}]`);

    if (!delegateTarget) {
      return;
    }

    // Get the handler ID from the attribute
    const handlerId = delegateTarget.getAttribute(attrName);
    if (!handlerId) {
      return;
    }

    // Look up the handler in the registry
    const entry = this.registry.get(handlerId);
    if (!entry) {
      return;
    }

    // Wrap the event with component context and call the handler
    const wrappedEvent = wrapEvent(event, delegateTarget, entry.componentRef);
    entry.handler(wrappedEvent);
  }

  /**
   * Destroy the event delegation system
   * Removes all listeners and clears the registry
   */
  destroy() {
    if (!this.initialized || !this.root) {
      return;
    }

    // Remove all event listeners
    for (const [eventType, { handler, options }] of this.boundHandlers) {
      this.root.removeEventListener(eventType, handler, options);
    }

    this.boundHandlers.clear();
    this.registry.clear();
    this.initialized = false;
    this.root = null;
  }

  /**
   * Check if the delegation system is initialized
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.initialized;
  }
}

/**
 * Singleton event delegation instance
 * Use this for global event delegation
 */
export const eventDelegation = new EventDelegation();
