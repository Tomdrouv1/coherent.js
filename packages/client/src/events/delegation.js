/**
 * Event Delegation for Coherent.js
 *
 * Document-level event delegation that routes events to handlers via
 * data-coherent-{eventType} attributes. This ensures event handlers
 * survive DOM updates since they're registered by ID, not by element.
 */

import { handlerRegistry as defaultRegistry } from './registry.js';
import { wrapEvent } from './wrapper.js';

/** Event types listened for from initialize(); others are added on demand. */
const DEFAULT_EVENT_TYPES = [
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

/**
 * Events that do not bubble. They are caught in the capture phase and only
 * reach a handler on the event's own target.
 */
const NON_BUBBLING_EVENTS = new Set([
  'mouseenter', 'mouseleave', 'pointerenter', 'pointerleave',
  'load', 'error', 'abort', 'scroll', 'toggle', 'invalid', 'cancel', 'close',
  'play', 'pause', 'ended', 'playing', 'waiting', 'seeked', 'seeking',
  'canplay', 'canplaythrough', 'durationchange', 'emptied', 'loadeddata',
  'loadedmetadata', 'loadstart', 'progress', 'ratechange', 'stalled',
  'suspend', 'timeupdate', 'volumechange',
]);

/**
 * Focus events do not bubble either, but a handler on a container is expected
 * to hear its fields' focus (like focusin), so they are captured and then
 * walked up the tree like bubbling events.
 */
const CAPTURED_BUBBLING_EVENTS = new Set(['focus', 'blur']);

/**
 * Scroll-blocking events are registered passive, as browsers do by default at
 * document level, so delegation never delays scrolling. preventDefault() is
 * ignored for them; every other type is registered non-passive.
 */
const PASSIVE_EVENTS = new Set(['touchstart', 'touchmove', 'wheel', 'mousewheel', 'scroll']);

/**
 * Listener options for a delegated event type.
 * @param {string} eventType
 * @returns {{capture: boolean, passive: boolean}}
 */
export function getListenerOptions(eventType) {
  return {
    capture: CAPTURED_BUBBLING_EVENTS.has(eventType) || NON_BUBBLING_EVENTS.has(eventType),
    passive: PASSIVE_EVENTS.has(eventType),
  };
}

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
     * Event types listened for by initialize(). Any other type is added the
     * first time listen() is called for it.
     */
    this.eventTypes = [...DEFAULT_EVENT_TYPES];
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
    this.initialized = true;

    for (const eventType of this.eventTypes) {
      this.attach(eventType);
    }
  }

  /**
   * Make sure events of `eventType` are delegated. Called by hydrate() for
   * every event type a component handles, so types beyond the defaults
   * (dblclick, mouseenter, pointerdown, ...) work too.
   * @param {string} eventType - DOM event type, e.g. 'dblclick'
   */
  listen(eventType) {
    if (!this.eventTypes.includes(eventType)) {
      this.eventTypes.push(eventType);
    }
    if (this.initialized) {
      this.attach(eventType);
    }
  }

  /** @private */
  attach(eventType) {
    if (this.boundHandlers.has(eventType)) {
      return;
    }

    const handler = (event) => this.handleEvent(event, eventType);
    const options = getListenerOptions(eventType);

    this.root.addEventListener(eventType, handler, options);
    this.boundHandlers.set(eventType, { handler, options });
  }

  /**
   * Handle a delegated event
   *
   * Runs the handler of the nearest element carrying
   * `data-coherent-{eventType}`, then those of its ancestors, like native
   * bubbling, until a handler stops propagation. Non-bubbling events only run
   * a handler on the target itself.
   *
   * @param {Event} event - The DOM event
   * @param {string} eventType - The type of event (click, change, etc.)
   */
  handleEvent(event, eventType) {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') {
      return;
    }

    const attrName = `data-coherent-${eventType}`;
    const selector = `[${attrName}]`;
    const bubbles = !NON_BUBBLING_EVENTS.has(eventType);

    let current = target.closest(selector);
    if (!bubbles && current !== target) {
      return;
    }

    while (current) {
      const handlerId = current.getAttribute(attrName);
      const entry = handlerId ? this.registry.get(handlerId) : undefined;

      if (entry) {
        // Wrap the event with component context and call the handler
        const wrappedEvent = wrapEvent(event, current, entry.componentRef);
        entry.handler(wrappedEvent);

        if (wrappedEvent.propagationStopped || event.cancelBubble === true) {
          return;
        }
      }

      if (!bubbles) {
        return;
      }

      const parent = current.parentElement;
      if (!parent || typeof parent.closest !== 'function' || !this.isWithinRoot(parent)) {
        return;
      }
      current = parent.closest(selector);
    }
  }

  /** @private */
  isWithinRoot(element) {
    const root = this.root;
    if (!root || root.nodeType === 9 || typeof root.contains !== 'function') {
      return true;
    }
    return root.contains(element);
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
    this.eventTypes = [...DEFAULT_EVENT_TYPES];
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
