/**
 * Coherent.js Phase 2 Hydration - Browser Bundle
 *
 * This is a browser-compatible version of the Phase 2 hydration system.
 * It demonstrates: event delegation, state serialization, and mismatch detection.
 */

console.log('[Coherent.js] Loading Phase 2 hydration system...');

// ============================================================================
// Handler Registry (from packages/client/src/events/registry.js)
// ============================================================================

class HandlerRegistry {
  constructor() {
    this.handlers = new Map();
  }

  register(handlerId, handler, componentRef = null) {
    this.handlers.set(handlerId, { handler, componentRef });
  }

  unregister(handlerId) {
    this.handlers.delete(handlerId);
  }

  get(handlerId) {
    return this.handlers.get(handlerId);
  }

  clear() {
    this.handlers.clear();
  }

  getByComponent(componentRef) {
    const ids = [];
    this.handlers.forEach((entry, id) => {
      if (entry.componentRef === componentRef) {
        ids.push(id);
      }
    });
    return ids;
  }
}

const handlerRegistry = new HandlerRegistry();

// ============================================================================
// Event Wrapper (from packages/client/src/events/wrapper.js)
// ============================================================================

function wrapEvent(originalEvent, target, componentRef = null) {
  return {
    originalEvent,
    target,
    preventDefault() {
      originalEvent.preventDefault();
    },
    stopPropagation() {
      originalEvent.stopPropagation();
    },
    component: componentRef?.component,
    state: componentRef?.state,
    setState: componentRef?.setState,
    props: componentRef?.props
  };
}

// ============================================================================
// Event Delegation (from packages/client/src/events/delegation.js)
// ============================================================================

class EventDelegation {
  constructor(registry = handlerRegistry) {
    this.registry = registry;
    this.eventTypes = ['click', 'change', 'input', 'submit', 'focus', 'blur', 'keydown', 'keyup', 'keypress'];
    this.initialized = false;
    this.listeners = new Map();
    this.root = null;
  }

  initialize(root = document) {
    if (this.initialized) return;

    this.root = root;

    this.eventTypes.forEach(eventType => {
      const handler = (event) => this.handleEvent(event, eventType);

      // Use capture for focus/blur (they don't bubble)
      const useCapture = eventType === 'focus' || eventType === 'blur';
      const options = { capture: useCapture, passive: eventType !== 'submit' };

      root.addEventListener(eventType, handler, options);
      this.listeners.set(eventType, { handler, options });
    });

    this.initialized = true;
    console.log('[Coherent.js] Event delegation initialized');
  }

  handleEvent(event, eventType) {
    const attrName = `data-coherent-${eventType}`;
    const target = event.target.closest(`[${attrName}]`);

    if (!target) return;

    const handlerId = target.getAttribute(attrName);
    const entry = this.registry.get(handlerId);

    if (entry && typeof entry.handler === 'function') {
      const wrappedEvent = wrapEvent(event, target, entry.componentRef);
      try {
        entry.handler(wrappedEvent);
      } catch (error) {
        console.error('[Coherent.js] Handler error:', error);
      }
    }
  }

  destroy() {
    if (!this.initialized || !this.root) return;

    this.listeners.forEach(({ handler, options }, eventType) => {
      this.root.removeEventListener(eventType, handler, options);
    });

    this.listeners.clear();
    this.registry.clear();
    this.initialized = false;
    this.root = null;
  }
}

const eventDelegation = new EventDelegation();

// ============================================================================
// State Serialization (from packages/client/src/hydration/state-serializer.js)
// ============================================================================

function serializeState(state) {
  if (!state || typeof state !== 'object') return null;

  const serializable = {};
  let hasSerializable = false;

  for (const [key, value] of Object.entries(state)) {
    if (isSerializable(value)) {
      serializable[key] = value;
      hasSerializable = true;
    }
  }

  if (!hasSerializable) return null;

  try {
    const json = JSON.stringify(serializable);
    return btoa(encodeURIComponent(json));
  } catch (e) {
    console.warn('[Coherent.js] Failed to serialize state:', e);
    return null;
  }
}

function deserializeState(encoded) {
  if (!encoded || typeof encoded !== 'string') return null;

  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch (e) {
    console.warn('[Coherent.js] Failed to deserialize state:', e);
    return null;
  }
}

function extractState(element) {
  if (!element || typeof element.getAttribute !== 'function') {
    return null;
  }
  const encoded = element.getAttribute('data-state');
  return deserializeState(encoded);
}

function isSerializable(value) {
  if (value === undefined) return false;
  if (value === null) return true;
  if (typeof value === 'function') return false;
  if (typeof value === 'symbol') return false;
  if (typeof value === 'bigint') return false;
  if (Array.isArray(value)) return value.every(isSerializable);
  if (typeof value === 'object') return true;
  return true;
}

// ============================================================================
// Hydrate API (from packages/client/src/hydrate.js)
// ============================================================================

const hydratedInstances = new WeakMap();
let handlerCounter = 0;

function hydrate(component, container, options = {}) {
  // Validate inputs
  if (typeof component !== 'function') {
    console.error('[Coherent.js] hydrate(): component must be a function');
    return null;
  }

  if (!container || typeof container.getAttribute !== 'function') {
    console.error('[Coherent.js] hydrate(): container must be a DOM element');
    return null;
  }

  // Check if already hydrated
  if (hydratedInstances.has(container)) {
    console.warn('[Coherent.js] hydrate(): container already hydrated');
    return hydratedInstances.get(container);
  }

  const config = {
    props: {},
    initialState: null,
    ...options
  };

  // Initialize event delegation
  eventDelegation.initialize();

  // Extract state from container
  const extractedState = extractState(container);
  const state = config.initialState || extractedState || {};

  // Create instance
  const instance = createInstance(container, component, config.props, state);

  // Generate virtual DOM and register handlers
  const props = { ...config.props, ...state, setState: instance.setState.bind(instance) };
  let virtualDOM;
  try {
    virtualDOM = component(props);
    registerEventHandlers(container, virtualDOM, instance);
  } catch (err) {
    console.error('[Coherent.js] hydrate(): component render error', err);
    return null;
  }

  // Store instance
  hydratedInstances.set(container, instance.control);
  container.__coherentInstance = instance;

  console.log('[Coherent.js] Component hydrated:', component.name || 'Anonymous');

  return instance.control;
}

function createInstance(container, component, props, initialState) {
  const handlerIds = new Set();
  let currentState = { ...initialState };
  let currentProps = { ...props };

  const instance = {
    container,
    component,
    handlerIds,

    get state() {
      return currentState;
    },

    get props() {
      return currentProps;
    },

    setState(newState) {
      const prevState = currentState;
      currentState = typeof newState === 'function'
        ? { ...currentState, ...newState(currentState) }
        : { ...currentState, ...newState };

      // Update data-state attribute
      const encoded = serializeState(currentState);
      if (encoded) {
        container.setAttribute('data-state', encoded);
      }

      // Trigger re-render
      this.rerender();
    },

    rerender() {
      try {
        const mergedProps = { ...currentProps, ...currentState, setState: this.setState.bind(this) };
        const newVirtualDOM = component(mergedProps);

        // Re-register event handlers
        registerEventHandlers(container, newVirtualDOM, this);

      } catch (err) {
        console.error('[Coherent.js] rerender error:', err);
      }
    },

    control: {
      unmount() {
        handlerIds.forEach(id => handlerRegistry.unregister(id));
        handlerIds.clear();
        hydratedInstances.delete(container);
        delete container.__coherentInstance;
      },

      rerender() {
        instance.rerender();
      },

      getState() {
        return currentState;
      },

      setState(newState) {
        instance.setState(newState);
      }
    }
  };

  return instance;
}

function registerEventHandlers(element, virtualNode, instance, path = '') {
  if (!virtualNode || typeof virtualNode !== 'object') return;

  if (Array.isArray(virtualNode)) {
    virtualNode.forEach((child, i) => {
      const childElement = element.children[i];
      if (childElement) {
        registerEventHandlers(childElement, child, instance, `${path}[${i}]`);
      }
    });
    return;
  }

  const tagName = Object.keys(virtualNode)[0];
  const props = virtualNode[tagName] || {};

  // Find event handlers
  const eventProps = Object.keys(props).filter(key =>
    key.startsWith('on') && typeof props[key] === 'function'
  );

  eventProps.forEach(eventProp => {
    const eventType = eventProp.substring(2).toLowerCase();
    const handler = props[eventProp];

    const handlerId = `${instance.component.name || 'c'}_${eventType}_${++handlerCounter}`;

    element.setAttribute(`data-coherent-${eventType}`, handlerId);

    handlerRegistry.register(handlerId, handler, {
      component: instance.component,
      state: instance.state,
      setState: instance.setState.bind(instance),
      props: instance.props
    });

    instance.handlerIds.add(handlerId);
  });

  // Process children
  if (props.children) {
    const children = Array.isArray(props.children) ? props.children : [props.children];
    children.forEach((child, i) => {
      const childElement = element.children[i];
      if (childElement && typeof child === 'object') {
        registerEventHandlers(childElement, child, instance, `${path}.children[${i}]`);
      }
    });
  }
}

// ============================================================================
// Export to window for browser usage
// ============================================================================

window.CoherentHydration = {
  hydrate,
  eventDelegation,
  handlerRegistry,
  serializeState,
  deserializeState,
  extractState,
  HandlerRegistry,
  EventDelegation
};

console.log('[Coherent.js] Phase 2 hydration system loaded. Use window.CoherentHydration.hydrate()');

// ============================================================================
// Auto-hydrate components marked with data-coherent-hydrate
// ============================================================================

function autoHydrateComponents() {
  const hydrateTargets = document.querySelectorAll('[data-coherent-hydrate]');

  hydrateTargets.forEach(container => {
    const componentName = container.getAttribute('data-coherent-hydrate');
    const component = window[componentName];

    if (typeof component === 'function') {
      hydrate(component, container);
    } else {
      console.warn(`[Coherent.js] Component "${componentName}" not found for auto-hydration`);
    }
  });
}

// Auto-hydrate on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoHydrateComponents);
} else {
  autoHydrateComponents();
}
