/**
 * Clean hydrate() API for Coherent.js
 *
 * Integrates event delegation, state serialization, and mismatch detection
 * into a simple function: hydrate(component, container, options)
 *
 * @module @coherent.js/client/hydrate
 */

import { eventDelegation, handlerRegistry } from './events/index.js';
import { extractState, serializeState } from './hydration/index.js';
import { detectMismatch, reportMismatches } from './hydration/index.js';

/**
 * Hydrate a server-rendered component
 *
 * @param {Function} component - Component function that returns virtual DOM
 * @param {HTMLElement} container - DOM element containing server-rendered HTML
 * @param {Object} [options] - Hydration options
 * @param {Object} [options.initialState] - Initial state to override extracted state
 * @param {boolean} [options.detectMismatch=true] - Enable mismatch detection (dev mode)
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

  // Initialize event delegation (idempotent)
  eventDelegation.initialize();

  // Extract options with defaults
  const {
    initialState: providedState,
    detectMismatch: shouldDetectMismatch = process.env.NODE_ENV !== 'production',
    strict = false,
    onMismatch,
    props: additionalProps = {},
  } = options;

  // Extract state from DOM data-state attribute, or use provided initial state
  let state = providedState ?? extractState(container) ?? {};

  // Store event listeners for cleanup
  const eventListeners = [];

  // Track registered handler IDs for cleanup
  const registeredHandlerIds = new Set();

  // Create component reference for handler registry
  const componentRef = {
    getState: () => state,
    setState: (newState) => {
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
  const componentProps = { ...additionalProps, ...state };
  let virtualDOM = component(componentProps);

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
  registerEventHandlers(container, virtualDOM, componentRef, registeredHandlerIds);

  /**
   * Re-render the component with current state
   */
  function doRerender() {
    const newProps = { ...additionalProps, ...state };
    virtualDOM = component(newProps);

    // Update DOM with new virtual DOM
    // For now, we do a simple patch - just update text content and attributes
    // Full reconciliation would be in a separate module
    patchDOM(container, virtualDOM);

    // Re-register event handlers after DOM update
    registerEventHandlers(container, virtualDOM, componentRef, registeredHandlerIds);
  }

  /**
   * Unmount the component and clean up
   */
  function unmount() {
    // Remove registered event handlers
    for (const handlerId of registeredHandlerIds) {
      handlerRegistry.unregister(handlerId);
    }
    registeredHandlerIds.clear();

    // Remove direct event listeners
    for (const { element, event, handler, options } of eventListeners) {
      element.removeEventListener(event, handler, options);
    }
    eventListeners.length = 0;

    // Clear container's hydration marker
    container.removeAttribute('data-coherent-hydrated');
  }

  /**
   * Force re-render with optional new props
   * @param {Object} [newProps] - New props to merge
   */
  function rerender(newProps) {
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

  // Mark container as hydrated
  container.setAttribute('data-coherent-hydrated', 'true');

  // Return control object
  return {
    unmount,
    rerender,
    getState,
    setState,
  };
}

/**
 * Walk virtual DOM tree and register event handlers
 * @private
 */
function registerEventHandlers(domElement, vNode, componentRef, handlerIds) {
  if (!vNode || typeof vNode !== 'object' || Array.isArray(vNode)) {
    return;
  }

  const tagName = Object.keys(vNode)[0];
  const props = vNode[tagName];

  if (!props || typeof props !== 'object') {
    return;
  }

  // Look for event handler props (on* functions)
  const eventProps = Object.keys(props).filter(
    (key) => key.startsWith('on') && typeof props[key] === 'function'
  );

  for (const eventProp of eventProps) {
    const eventType = eventProp.slice(2).toLowerCase(); // onClick -> click
    const handler = props[eventProp];

    // Generate unique handler ID
    const handlerId = `${tagName}-${eventType}-${Math.random().toString(36).slice(2, 9)}`;

    // Register handler
    handlerRegistry.register(handlerId, handler, componentRef);
    handlerIds.add(handlerId);

    // Set data attribute on DOM element for delegation
    const attrName = `data-coherent-${eventType}`;
    if (domElement.setAttribute) {
      domElement.setAttribute(attrName, handlerId);
    }
  }

  // Recursively process children
  const children = getVNodeChildren(props);
  const domChildren = getSignificantDOMChildren(domElement);

  children.forEach((child, index) => {
    if (child && typeof child === 'object' && !Array.isArray(child) && domChildren[index]) {
      registerEventHandlers(domChildren[index], child, componentRef, handlerIds);
    }
  });
}

/**
 * Simple DOM patching for re-renders
 * @private
 */
function patchDOM(domElement, vNode) {
  if (!vNode || !domElement) {
    return;
  }

  // Handle text/number
  if (typeof vNode === 'string' || typeof vNode === 'number') {
    if (domElement.textContent !== String(vNode)) {
      domElement.textContent = String(vNode);
    }
    return;
  }

  // Handle arrays
  if (Array.isArray(vNode)) {
    return; // Array patching would need reconciliation
  }

  if (typeof vNode !== 'object') {
    return;
  }

  const tagName = Object.keys(vNode)[0];
  const props = vNode[tagName] || {};

  // Update attributes
  const attributeMap = {
    className: 'class',
    htmlFor: 'for',
  };

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'text' || key.startsWith('on')) {
      continue;
    }

    const attrName = attributeMap[key] || key;

    if (value === true) {
      domElement.setAttribute(attrName, '');
    } else if (value === false || value === null || value === undefined) {
      domElement.removeAttribute(attrName);
    } else if (domElement.getAttribute(attrName) !== String(value)) {
      domElement.setAttribute(attrName, String(value));
    }
  }

  // Handle text content
  if (props.text !== undefined) {
    const textContent = String(props.text);
    if (domElement.textContent !== textContent) {
      domElement.textContent = textContent;
    }
    return;
  }

  // Recursively patch children
  const children = getVNodeChildren(props);
  const domChildren = getSignificantDOMChildren(domElement);

  children.forEach((child, index) => {
    if (domChildren[index]) {
      patchDOM(domChildren[index], child);
    }
  });
}

/**
 * Get children from virtual node props
 * @private
 */
function getVNodeChildren(props) {
  if (!props) return [];
  if (props.children) {
    return Array.isArray(props.children) ? props.children : [props.children];
  }
  return [];
}

/**
 * Get significant DOM children (elements and non-whitespace text)
 * @private
 */
function getSignificantDOMChildren(element) {
  if (!element || !element.childNodes) return [];

  return Array.from(element.childNodes).filter((node) => {
    if (node.nodeType === 1) return true; // Element
    if (node.nodeType === 3) {
      // Text node
      return node.textContent && node.textContent.trim().length > 0;
    }
    return false;
  });
}

export default hydrate;
