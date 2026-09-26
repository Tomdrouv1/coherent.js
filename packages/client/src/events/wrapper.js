/**
 * Event Wrapper for Coherent.js
 *
 * Wraps native DOM events with component context, providing handlers
 * access to component state, setState, and props.
 */

/**
 * @typedef {object} CoherentEvent
 * @property {Event} originalEvent - The native DOM event
 * @property {string} type - The event type
 * @property {Element} target - The element with the data-coherent-* attribute
 * @property {Element} currentTarget - Same as `target`: the element whose handler runs
 * @property {boolean} defaultPrevented - Whether the default action was prevented
 * @property {boolean} propagationStopped - Whether a handler stopped delegated propagation
 * @property {function(): void} preventDefault - Delegates to originalEvent.preventDefault()
 * @property {function(): void} stopPropagation - Stops delegation to ancestor handlers and the native event
 * @property {function(): void} stopImmediatePropagation - Like stopPropagation, also for other native listeners
 * @property {function|null} component - The component function (if available)
 * @property {object|null} state - Current component state (if available)
 * @property {function|null} setState - State setter function (if available)
 * @property {object|null} props - Component props (if available)
 */

/**
 * Wrap a native DOM event with component context
 *
 * @param {Event} originalEvent - The native DOM event
 * @param {Element} target - The element that matched the data attribute selector
 * @param {object|null} componentRef - Optional component reference object
 * @param {function} [componentRef.component] - The component function
 * @param {object} [componentRef.state] - Current component state
 * @param {function} [componentRef.setState] - State setter function
 * @param {object} [componentRef.props] - Component props
 * @returns {CoherentEvent} Wrapped event with component context
 */
export function wrapEvent(originalEvent, target, componentRef = null) {
  const wrapped = {
    // Native event access
    originalEvent,
    type: originalEvent?.type,
    target,
    currentTarget: target,
    propagationStopped: false,

    get defaultPrevented() {
      return Boolean(originalEvent?.defaultPrevented);
    },

    // Delegate common methods
    preventDefault() {
      originalEvent.preventDefault();
    },

    stopPropagation() {
      wrapped.propagationStopped = true;
      originalEvent.stopPropagation();
    },

    stopImmediatePropagation() {
      wrapped.propagationStopped = true;
      if (typeof originalEvent.stopImmediatePropagation === 'function') {
        originalEvent.stopImmediatePropagation();
      } else {
        originalEvent.stopPropagation();
      }
    },

    // Component context (null if no componentRef provided)
    component: componentRef?.component ?? null,
    state: componentRef?.state ?? null,
    setState: componentRef?.setState ?? null,
    props: componentRef?.props ?? null,
  };
  return wrapped;
}
