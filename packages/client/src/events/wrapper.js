/**
 * Event Wrapper for Coherent.js
 *
 * Wraps native DOM events with component context, providing handlers
 * access to component state, setState, and props.
 */

/**
 * @typedef {object} CoherentEvent
 * @property {Event} originalEvent - The native DOM event
 * @property {Element} target - The element with the data-coherent-* attribute
 * @property {function(): void} preventDefault - Delegates to originalEvent.preventDefault()
 * @property {function(): void} stopPropagation - Delegates to originalEvent.stopPropagation()
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
  return {
    // Native event access
    originalEvent,
    target,

    // Delegate common methods
    preventDefault() {
      originalEvent.preventDefault();
    },

    stopPropagation() {
      originalEvent.stopPropagation();
    },

    // Component context (null if no componentRef provided)
    component: componentRef?.component ?? null,
    state: componentRef?.state ?? null,
    setState: componentRef?.setState ?? null,
    props: componentRef?.props ?? null,
  };
}
