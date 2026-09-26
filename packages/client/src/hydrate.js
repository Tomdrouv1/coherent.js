/**
 * Clean hydrate() API for Coherent.js
 *
 * Integrates event delegation, state serialization, and mismatch detection
 * into a simple function: hydrate(component, container, options)
 *
 * @module @coherent.js/client/hydrate
 */

import { eventDelegation, handlerRegistry } from './events/index.js';
import { extractState, detectMismatch, reportMismatches } from './hydration/index.js';
import { isElementVNode, readElement, pairElementChildren } from './hydration/vnode.js';
import { patchRoot } from './hydration/patch.js';

/**
 * Live hydrations by container, so hydrating a container again replaces the
 * previous hydration instead of stacking a second set of handlers on it.
 * @type {WeakMap<Element, {unmount: Function}>}
 */
const hydratedContainers = new WeakMap();

/**
 * Hydrate a server-rendered component
 *
 * Hydrating a container that is already hydrated unmounts the previous
 * hydration first.
 *
 * @param {Function} component - Component function that returns virtual DOM
 * @param {HTMLElement} container - DOM element containing server-rendered HTML
 * @param {Object} [options] - Hydration options
 * @param {Object} [options.initialState] - Initial state to override extracted state
 * @param {boolean} [options.detectMismatch] - Compare the server DOM with the
 *   component's output. Defaults to on when `strict` or `onMismatch` is given
 *   or `process.env.NODE_ENV` is `'development'`, off otherwise
 * @param {boolean} [options.strict=false] - Throw on mismatch instead of warning
 * @param {Function} [options.onMismatch] - Custom mismatch handler
 * @param {Object} [options.props] - Additional props to pass to component
 * @returns {Object} Control object with unmount(), rerender(), getState(), setState()
 */
export function hydrate(component, container, options = {}) {
  // Validate inputs
  if (typeof component !== 'function') {
    throw new Error(
      `hydrate() requires a component function, received: ${typeof component}`
    );
  }

  if (!container || typeof container.getAttribute !== 'function') {
    throw new Error(
      `hydrate() requires a valid DOM element as container, received: ${
        container === null ? 'null' : typeof container
      }`
    );
  }

  // One hydration per container: drop the previous one's handlers
  hydratedContainers.get(container)?.unmount();

  // Initialize event delegation (idempotent)
  eventDelegation.initialize();

  // Extract options with defaults
  const {
    initialState: providedState,
    strict = false,
    onMismatch,
    props: additionalProps = {},
  } = options;

  // Mismatch detection walks the whole DOM: only when asked for, implied by
  // `strict` or `onMismatch`, or in development
  const shouldDetectMismatch = options.detectMismatch ??
    (strict || typeof onMismatch === 'function' || isDevelopment());

  // Extract state from DOM data-state attribute, or use provided initial state
  let state = providedState ?? extractState(container) ?? {};
  let mounted = true;
  let root = container;

  // Handler ids and the attributes pointing at them, from the latest render
  let registeredHandlerIds = new Set();
  let boundAttributes = [];

  const currentProps = () => ({ ...additionalProps, ...state });

  // Component reference handed to event handlers (event.state, event.setState, ...)
  const componentRef = {
    component,
    get state() {
      return state;
    },
    get props() {
      return currentProps();
    },
    getState: () => state,
    setState: (newState) => {
      if (!mounted) {
        return;
      }
      if (typeof newState === 'function') {
        state = { ...state, ...newState(state) };
      } else {
        state = { ...state, ...newState };
      }
      // Re-render on state change
      doRerender();
    },
  };

  // Generate virtual DOM from component
  let virtualDOM = renderComponent(component, currentProps());

  // Detect mismatches if enabled
  if (shouldDetectMismatch) {
    const mismatches = detectMismatch(container, virtualDOM);

    if (mismatches.length > 0) {
      if (onMismatch) {
        onMismatch(mismatches);
      } else {
        reportMismatches(mismatches, {
          componentName: component.name || 'Anonymous',
          strict,
        });
      }
    }
  }

  // Walk virtual DOM and register event handlers
  registerEventHandlers(root, virtualDOM, componentRef, registeredHandlerIds, boundAttributes);

  /**
   * Re-render the component with current state
   */
  function doRerender() {
    if (!mounted) {
      return;
    }

    const previousVirtualDOM = virtualDOM;
    virtualDOM = renderComponent(component, currentProps());

    // Update the DOM to match the new virtual DOM
    const previousRoot = root;
    root = patchRoot(root, previousVirtualDOM, virtualDOM);
    if (root !== previousRoot) {
      hydratedContainers.delete(previousRoot);
      hydratedContainers.set(root, controller);
      root.setAttribute('data-coherent-hydrated', 'true');
    }

    // Swap handlers: register the new render's, then drop the previous ones
    const previousIds = registeredHandlerIds;
    const previousAttributes = boundAttributes;
    registeredHandlerIds = new Set();
    boundAttributes = [];
    registerEventHandlers(root, virtualDOM, componentRef, registeredHandlerIds, boundAttributes);
    releaseHandlers(previousIds, previousAttributes);
  }

  /**
   * Unmount the component and clean up. Terminal: later setState() and
   * rerender() calls do nothing.
   */
  function unmount() {
    if (!mounted) {
      return;
    }
    mounted = false;

    releaseHandlers(registeredHandlerIds, boundAttributes);
    registeredHandlerIds = new Set();
    boundAttributes = [];

    if (hydratedContainers.get(root) === controller) {
      hydratedContainers.delete(root);
    }

    // Clear container's hydration marker
    root.removeAttribute('data-coherent-hydrated');
  }

  /**
   * Force re-render with optional new props
   * @param {Object} [newProps] - New props to merge
   */
  function rerender(newProps) {
    if (!mounted) {
      return;
    }
    if (newProps) {
      Object.assign(additionalProps, newProps);
    }
    doRerender();
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  function getState() {
    return { ...state };
  }

  /**
   * Set state and trigger re-render
   * @param {Object|Function} newState - New state or updater function
   */
  function setState(newState) {
    componentRef.setState(newState);
  }

  // Return control object
  const controller = {
    unmount,
    rerender,
    getState,
    setState,
  };

  // Mark container as hydrated
  container.setAttribute('data-coherent-hydrated', 'true');
  hydratedContainers.set(container, controller);

  return controller;
}

/**
 * Whether the app runs in development. `process.env.NODE_ENV` is read at
 * runtime — this package's build leaves it for the app's bundler to replace —
 * and counts as production when there is no `process` at all.
 * @private
 */
function isDevelopment() {
  try {
    // eslint-disable-next-line no-restricted-globals -- replaced by the app's bundler; guarded for browsers without one
    return process.env.NODE_ENV === 'development';
  } catch {
    return false;
  }
}

/**
 * Call a component and resolve returned function components, as core does
 * @private
 */
function renderComponent(component, props) {
  let vNode = component(props);
  for (let guard = 0; typeof vNode === 'function' && vNode.length === 0 && guard < 100; guard++) {
    vNode = vNode();
  }
  return vNode;
}

/**
 * Unregister handler ids and remove the data-coherent-* attributes that still
 * point at them
 * @private
 */
function releaseHandlers(handlerIds, attributes) {
  for (const handlerId of handlerIds) {
    handlerRegistry.unregister(handlerId);
  }
  for (const { element, name, handlerId } of attributes) {
    if (element.getAttribute(name) === handlerId) {
      element.removeAttribute(name);
    }
  }
}

/** Prop names whose lower-cased suffix is not the DOM event type. */
const EVENT_TYPE_ALIASES = {
  doubleclick: 'dblclick',
};

/**
 * DOM event type for an `on*` prop: onClick -> click, onDoubleClick -> dblclick
 * @private
 */
function toEventType(propName) {
  const type = propName.slice(2).toLowerCase();
  return EVENT_TYPE_ALIASES[type] ?? type;
}

/**
 * Walk virtual DOM tree and register event handlers
 * @private
 */
function registerEventHandlers(domElement, vNode, componentRef, handlerIds, boundAttributes) {
  if (!domElement || !isElementVNode(vNode)) {
    return;
  }

  const { tagName, props } = readElement(vNode);

  // Look for event handler props (on* functions)
  const eventProps = Object.keys(props).filter(
    (key) => key.startsWith('on') && typeof props[key] === 'function'
  );

  for (const eventProp of eventProps) {
    const eventType = toEventType(eventProp); // onClick -> click
    const handler = props[eventProp];

    // Delegate this event type even if it is not one of the defaults
    eventDelegation.listen(eventType);

    // Generate unique handler ID
    const handlerId = `${tagName}-${eventType}-${Math.random().toString(36).slice(2, 9)}`;

    // Register handler
    handlerRegistry.register(handlerId, handler, componentRef);
    handlerIds.add(handlerId);

    // Set data attribute on DOM element for delegation
    const attrName = `data-coherent-${eventType}`;
    if (domElement.setAttribute) {
      domElement.setAttribute(attrName, handlerId);
      boundAttributes.push({ element: domElement, name: attrName, handlerId });
    }
  }

  // Pair element children the way the server rendered them: null, booleans,
  // nested arrays and text never shift which element a child binds to.
  for (const [childVNode, childElement] of pairElementChildren(tagName, props, domElement)) {
    registerEventHandlers(childElement, childVNode, componentRef, handlerIds, boundAttributes);
  }
}

export default hydrate;
