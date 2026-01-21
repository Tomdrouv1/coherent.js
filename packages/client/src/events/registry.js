/**
 * Handler Registry for Coherent.js Event Delegation
 *
 * Maps handler IDs to their corresponding functions and component context.
 * Handlers are identified by ID (from data-coherent-{event} attributes) rather
 * than by element reference, allowing them to survive DOM updates.
 */

/**
 * HandlerRegistry class
 * Stores handler functions with their associated component context
 */
export class HandlerRegistry {
  constructor() {
    /** @type {Map<string, {handler: Function, componentRef: object|null}>} */
    this.handlers = new Map();
  }

  /**
   * Register a handler with optional component context
   * @param {string} handlerId - Unique identifier for the handler
   * @param {Function} handler - The event handler function
   * @param {object|null} componentRef - Optional component reference with state/setState
   */
  register(handlerId, handler, componentRef = null) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler must be a function, received: ${typeof handler}`);
    }
    this.handlers.set(handlerId, { handler, componentRef });
  }

  /**
   * Unregister a handler by ID
   * @param {string} handlerId - The handler ID to remove
   * @returns {boolean} True if handler was removed, false if not found
   */
  unregister(handlerId) {
    return this.handlers.delete(handlerId);
  }

  /**
   * Get a handler entry by ID
   * @param {string} handlerId - The handler ID to look up
   * @returns {{handler: Function, componentRef: object|null}|undefined} Handler entry or undefined
   */
  get(handlerId) {
    return this.handlers.get(handlerId);
  }

  /**
   * Check if a handler is registered
   * @param {string} handlerId - The handler ID to check
   * @returns {boolean} True if handler exists
   */
  has(handlerId) {
    return this.handlers.has(handlerId);
  }

  /**
   * Clear all registered handlers
   */
  clear() {
    this.handlers.clear();
  }

  /**
   * Get all handler IDs registered for a specific component
   * @param {object} componentRef - The component reference to search for
   * @returns {string[]} Array of handler IDs belonging to this component
   */
  getByComponent(componentRef) {
    if (!componentRef) {
      return [];
    }

    const handlerIds = [];
    for (const [handlerId, entry] of this.handlers) {
      if (entry.componentRef === componentRef) {
        handlerIds.push(handlerId);
      }
    }
    return handlerIds;
  }

  /**
   * Get the number of registered handlers
   * @returns {number} Count of registered handlers
   */
  get size() {
    return this.handlers.size;
  }
}

/**
 * Singleton handler registry instance
 * Use this for global event delegation
 */
export const handlerRegistry = new HandlerRegistry();
