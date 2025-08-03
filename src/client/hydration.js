/**
 * Client-side hydration utilities for Coherent.js
 * 
 * This module provides utilities for hydrating server-rendered HTML
 * with client-side interactivity.
 */

// Store for component instances
const componentInstances = new WeakMap();

/**
 * Extract initial state from DOM element data attributes
 * 
 * @param {HTMLElement} element - The DOM element
 * @param {Object} options - Hydration options
 * @returns {Object|null} The initial state or null
 */
function extractInitialState(element, options = {}) {
  try {
    // Look for data-coherent-state attribute
    const stateAttr = element.getAttribute('data-coherent-state');
    if (stateAttr) {
      return JSON.parse(stateAttr);
    }
    
    // Look for specific state attributes
    const state = {};
    let hasState = false;
    
    // Extract common state patterns
    const countAttr = element.getAttribute('data-count');
    if (countAttr !== null) {
      state.count = parseInt(countAttr, 10) || 0;
      hasState = true;
    }
    
    const todosAttr = element.getAttribute('data-todos');
    if (todosAttr) {
      state.todos = JSON.parse(todosAttr);
      hasState = true;
    }
    
    const valueAttr = element.getAttribute('data-value');
    if (valueAttr !== null) {
      state.value = valueAttr;
      hasState = true;
    }
    
    // Check for initial props in options
    if (options.initialState) {
      Object.assign(state, options.initialState);
      hasState = true;
    }
    
    return hasState ? state : null;
  } catch (error) {
    console.warn('Error extracting initial state:', error);
    return null;
  }
}

/**
 * Hydrate a DOM element with a Coherent component
 * 
 * @param {HTMLElement} element - The DOM element to hydrate
 * @param {Function} component - The Coherent component function
 * @param {Object} props - The props to pass to the component
 * @param {Object} options - Hydration options
 * @returns {Object} The hydrated component instance
 */
function hydrate(element, component, props = {}, options = {}) {
  if (typeof window === 'undefined') {
    console.warn('Hydration can only be performed in a browser environment');
    return null;
  }
  
  // Check if element is already hydrated
  if (componentInstances.has(element)) {
    console.warn('Element is already hydrated');
    return componentInstances.get(element);
  }
  
  // Extract initial state from data attributes if available
  const initialState = extractInitialState(element, options);
  
  // Create component instance with state management
  const instance = {
    element,
    component,
    props: {...props},
    state: initialState,
    isHydrated: true,
    eventListeners: [],
    options: {...options},
    previousVirtualElement: null,
    
    // Update method for re-rendering
    update(newProps) {
      this.props = { ...this.props, ...newProps };
      this.rerender();
    },
    
    // Re-render the component with current state
    rerender() {
      try {
        // Call the component function with current props and state
        const componentProps = { ...this.props, ...(this.state || {}) };
        const newVirtualElement = this.component(componentProps);
        
        // Store the previous virtual element for comparison
        if (!this.previousVirtualElement) {
          this.previousVirtualElement = this.virtualElementFromDOM(this.element);
        }
        
        // Perform intelligent DOM diffing and patching
        this.patchDOM(this.element, this.previousVirtualElement, newVirtualElement);
        
        // Store the new virtual element for next comparison
        this.previousVirtualElement = newVirtualElement;
        
        console.log('Component re-rendered successfully with DOM diffing');
      } catch (error) {
        console.error('Error during component re-render:', error);
      }
    },
    
    // Create virtual element representation from existing DOM
    virtualElementFromDOM(domElement) {
      if (domElement.nodeType === Node.TEXT_NODE) {
        return domElement.textContent;
      }
      
      if (domElement.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }
      
      const tagName = domElement.tagName.toLowerCase();
      const props = {};
      const children = [];
      
      // Extract attributes
      Array.from(domElement.attributes).forEach(attr => {
        const name = attr.name === 'class' ? 'className' : attr.name;
        props[name] = attr.value;
      });
      
      // Extract children
      Array.from(domElement.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent.trim();
          if (text) children.push(text);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          children.push(this.virtualElementFromDOM(child));
        }
      });
      
      if (children.length > 0) {
        props.children = children;
      }
      
      return { [tagName]: props };
    },
    
    // Intelligent DOM patching with minimal changes
    patchDOM(domElement, oldVNode, newVNode) {
      // Handle text nodes
      if (typeof newVNode === 'string' || typeof newVNode === 'number') {
        const newText = String(newVNode);
        if (domElement.nodeType === Node.TEXT_NODE) {
          if (domElement.textContent !== newText) {
            domElement.textContent = newText;
          }
        } else {
          // Replace element with text node
          const textNode = document.createTextNode(newText);
          domElement.parentNode?.replaceChild(textNode, domElement);
        }
        return;
      }
      
      // Handle null/undefined
      if (!newVNode) {
        domElement.remove();
        return;
      }
      
      // Handle arrays
      if (Array.isArray(newVNode)) {
        // This shouldn't happen at the root level, but handle gracefully
        console.warn('Array virtual node at root level');
        return;
      }
      
      // Handle element nodes
      const newTagName = Object.keys(newVNode)[0];
      const newProps = newVNode[newTagName] || {};
      
      // Check if tag name changed
      if (domElement.tagName.toLowerCase() !== newTagName.toLowerCase()) {
        // Need to replace the entire element
        const newElement = this.createDOMElement(newVNode);
        domElement.parentNode?.replaceChild(newElement, domElement);
        attachEventListeners(newElement, this);
        return;
      }
      
      // Update attributes
      this.patchAttributes(domElement, oldVNode, newVNode);
      
      // Update children
      this.patchChildren(domElement, oldVNode, newVNode);
      
      // Re-attach event listeners if needed
      attachEventListeners(domElement, this);
    },
    
    // Patch element attributes efficiently
    patchAttributes(domElement, oldVNode, newVNode) {
      const oldTagName = oldVNode ? Object.keys(oldVNode)[0] : null;
      const newTagName = Object.keys(newVNode)[0];
      const oldProps = oldVNode && oldTagName ? (oldVNode[oldTagName] || {}) : {};
      const newProps = newVNode[newTagName] || {};
      
      // Remove old attributes that are no longer present
      Object.keys(oldProps).forEach(key => {
        if (key === 'children' || key === 'text') return;
        if (!(key in newProps)) {
          const attrName = key === 'className' ? 'class' : key;
          domElement.removeAttribute(attrName);
        }
      });
      
      // Add or update new attributes
      Object.keys(newProps).forEach(key => {
        if (key === 'children' || key === 'text') return;
        const newValue = newProps[key];
        const oldValue = oldProps[key];
        
        if (newValue !== oldValue) {
          const attrName = key === 'className' ? 'class' : key;
          
          if (newValue === true) {
            domElement.setAttribute(attrName, '');
          } else if (newValue === false || newValue == null) {
            domElement.removeAttribute(attrName);
          } else {
            domElement.setAttribute(attrName, String(newValue));
          }
        }
      });
    },
    
    // Patch children with intelligent list diffing
    patchChildren(domElement, oldVNode, newVNode) {
      const oldTagName = oldVNode ? Object.keys(oldVNode)[0] : null;
      const newTagName = Object.keys(newVNode)[0];
      const oldProps = oldVNode && oldTagName ? (oldVNode[oldTagName] || {}) : {};
      const newProps = newVNode[newTagName] || {};
      
      // Extract children arrays
      let oldChildren = [];
      let newChildren = [];
      
      // Handle old children
      if (oldProps.children) {
        oldChildren = Array.isArray(oldProps.children) ? oldProps.children : [oldProps.children];
      } else if (oldProps.text) {
        oldChildren = [oldProps.text];
      }
      
      // Handle new children
      if (newProps.children) {
        newChildren = Array.isArray(newProps.children) ? newProps.children : [newProps.children];
      } else if (newProps.text) {
        newChildren = [newProps.text];
      }
      
      // Get current DOM children (excluding text nodes that are just whitespace)
      const domChildren = Array.from(domElement.childNodes).filter(node => {
        return node.nodeType === Node.ELEMENT_NODE || 
               (node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      });
      
      // Simple diffing algorithm - can be improved with key-based diffing
      const maxLength = Math.max(oldChildren.length, newChildren.length, domChildren.length);
      
      for (let i = 0; i < maxLength; i++) {
        const oldChild = oldChildren[i];
        const newChild = newChildren[i];
        const domChild = domChildren[i];
        
        if (newChild === undefined) {
          // Remove extra DOM children
          if (domChild) {
            domChild.remove();
          }
        } else if (domChild === undefined) {
          // Add new DOM children
          const newElement = this.createDOMElement(newChild);
          domElement.appendChild(newElement);
        } else {
          // Patch existing child
          this.patchDOM(domChild, oldChild, newChild);
        }
      }
    },
    
    // Create DOM element from virtual element
    createDOMElement(vNode) {
      if (typeof vNode === 'string' || typeof vNode === 'number') {
        return document.createTextNode(String(vNode));
      }
      
      if (!vNode || typeof vNode !== 'object') {
        return document.createTextNode('');
      }
      
      if (Array.isArray(vNode)) {
        const fragment = document.createDocumentFragment();
        vNode.forEach(child => {
          fragment.appendChild(this.createDOMElement(child));
        });
        return fragment;
      }
      
      const tagName = Object.keys(vNode)[0];
      const props = vNode[tagName] || {};
      const element = document.createElement(tagName);
      
      // Set attributes
      Object.keys(props).forEach(key => {
        if (key === 'children' || key === 'text') return;
        
        const value = props[key];
        const attrName = key === 'className' ? 'class' : key;
        
        if (value === true) {
          element.setAttribute(attrName, '');
        } else if (value !== false && value != null) {
          element.setAttribute(attrName, String(value));
        }
      });
      
      // Add children
      if (props.children) {
        const children = Array.isArray(props.children) ? props.children : [props.children];
        children.forEach(child => {
          element.appendChild(this.createDOMElement(child));
        });
      } else if (props.text) {
        element.appendChild(document.createTextNode(String(props.text)));
      }
      
      return element;
    },
    
    // Render virtual element to HTML string
    renderVirtualElement(element) {
      if (typeof element === 'string' || typeof element === 'number') {
        return String(element);
      }
      
      if (!element || typeof element !== 'object') {
        return '';
      }
      
      // Handle arrays of elements
      if (Array.isArray(element)) {
        return element.map(el => this.renderVirtualElement(el)).join('');
      }
      
      // Handle Coherent.js object syntax
      const tagName = Object.keys(element)[0];
      const props = element[tagName];
      
      if (!props || typeof props !== 'object') {
        return `<${tagName}></${tagName}>`;
      }
      
      // Build attributes
      let attributes = '';
      const children = [];
      
      Object.keys(props).forEach(key => {
        if (key === 'children') {
          if (Array.isArray(props.children)) {
            children.push(...props.children);
          } else {
            children.push(props.children);
          }
        } else if (key === 'text') {
          children.push(props.text);
        } else {
          const attrName = key === 'className' ? 'class' : key;
          const value = props[key];
          if (value === true) {
            attributes += ` ${attrName}`;
          } else if (value !== false && value !== null && value !== undefined) {
            attributes += ` ${attrName}="${String(value).replace(/"/g, '&quot;')}"`;
          }
        }
      });
      
      // Render children
      const childrenHTML = children.map(child => this.renderVirtualElement(child)).join('');
      
      // Check if it's a void element
      const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
      
      if (voidElements.has(tagName.toLowerCase())) {
        return `<${tagName}${attributes}>`;
      }
      
      return `<${tagName}${attributes}>${childrenHTML}</${tagName}>`;
    },
    
    // Destroy the component and clean up
    destroy() {
      // Remove event listeners
      this.eventListeners.forEach(({element, event, handler}) => {
        if (element.removeEventListener) {
          element.removeEventListener(event, handler);
        }
      });
      
      // Clean up state
      this.state = null;
      this.isHydrated = false;
      
      // Remove from instances map
      componentInstances.delete(this.element);
      
      console.log('Component destroyed');
    },
    
    // Set state (for components with state)
    setState(newState) {
      if (!this.state) {
        this.state = {};
      }
      
      const oldState = {...this.state};
      this.state = typeof newState === 'function' ? 
        {...this.state, ...newState(this.state)} : 
        {...this.state, ...newState};
      
      // Trigger re-render
      this.rerender();
      
      // Call state change callback if exists
      if (this.onStateChange) {
        this.onStateChange(this.state, oldState);
      }
    },
    
    // Add event listener that will be cleaned up on destroy
    addEventListener(targetElement, event, handler) {
      if (targetElement.addEventListener) {
        targetElement.addEventListener(event, handler);
        this.eventListeners.push({element: targetElement, event, handler});
      }
    }
  };
  
  // Store instance
  componentInstances.set(element, instance);
  
  // Attach event listeners from data attributes (only in browser)
  if (typeof window !== 'undefined' && element.querySelectorAll) {
    attachEventListeners(element, instance);
  }
  
  console.log('Component hydrated:', component.name || 'Anonymous');
  
  return instance;
}

/**
 * Attach event listeners from data attributes
 * 
 * @param {HTMLElement} element - The root element
 * @param {Object} instance - The component instance
 */
function attachEventListeners(element, instance) {
  try {
    // Clear existing event listeners to avoid duplicates
    instance.eventListeners.forEach(({element: el, event, handler}) => {
      if (el && el.removeEventListener) {
        el.removeEventListener(event, handler);
      }
    });
    instance.eventListeners = [];
    
    // Find all elements with data-action attributes
    const actionElements = element.querySelectorAll('[data-action]');
    
    actionElements.forEach(actionElement => {
      // Check if element has required methods
      if (!actionElement.getAttribute) return;
      
      const action = actionElement.getAttribute('data-action');
      const target = actionElement.getAttribute('data-target') || 'default';
      const event = actionElement.getAttribute('data-event') || 'click';
      
      if (action) {
        const handler = (e) => {
          e.preventDefault(); // Prevent default behavior for better control
          handleComponentAction(e, action, target, instance);
        };
        
        // Add event listener
        if (actionElement.addEventListener) {
          actionElement.addEventListener(event, handler);
          
          // Store for cleanup
          instance.eventListeners.push({
            element: actionElement,
            event,
            handler
          });
        }
      }
    });
    
    // Also look for onclick attributes and convert them to event listeners
    const clickableElements = element.querySelectorAll('[onclick]');
    clickableElements.forEach(clickElement => {
      const onclickAttr = clickElement.getAttribute('onclick');
      if (onclickAttr && !clickElement.hasAttribute('data-hydrated-click')) {
        // Mark as processed to avoid duplicate handling
        clickElement.setAttribute('data-hydrated-click', 'true');
        
        const handler = (e) => {
          try {
            // Create a safe execution context
            const func = new Function('event', 'element', 'instance', onclickAttr);
            func.call(clickElement, e, clickElement, instance);
          } catch (error) {
            console.warn('Error executing onclick handler:', error);
          }
        };
        
        clickElement.addEventListener('click', handler);
        instance.eventListeners.push({
          element: clickElement,
          event: 'click',
          handler
        });
      }
    });
    
  } catch (error) {
    console.warn('Error attaching event listeners:', error);
  }
}

/**
 * Handle component actions
 * 
 * @param {Event} event - The DOM event
 * @param {string} action - The action name
 * @param {string} target - The target identifier
 * @param {Object} instance - The component instance
 */
function handleComponentAction(event, action, target, instance) {
  console.log(`Action triggered: ${action} on target: ${target}`);
  
  // Handle common actions
  switch (action) {
    case 'increment':
      if (instance.state && instance.state.count !== undefined) {
        instance.setState({count: instance.state.count + 1});
      }
      break;
    case 'decrement':
      if (instance.state && instance.state.count !== undefined) {
        instance.setState({count: instance.state.count - 1});
      }
      break;
    case 'reset':
      if (instance.state) {
        const initialCount = instance.props.initialCount || 0;
        instance.setState({count: initialCount});
      }
      break;
    case 'toggle':
      const todoIndex = event.target && event.target.getAttribute ? 
        parseInt(event.target.getAttribute('data-todo-index')) : -1;
      if (todoIndex >= 0 && instance.state && instance.state.todos && instance.state.todos[todoIndex]) {
        const newTodos = [...instance.state.todos];
        newTodos[todoIndex].completed = !newTodos[todoIndex].completed;
        instance.setState({todos: newTodos});
      }
      break;
    case 'add':
      if (typeof document !== 'undefined' && document.getElementById) {
        const input = document.getElementById(`new-todo-${target}`);
        if (input && input.value && input.value.trim()) {
          if (instance.state && instance.state.todos) {
            const newTodos = [
              ...instance.state.todos,
              { text: input.value.trim(), completed: false }
            ];
            instance.setState({todos: newTodos});
            input.value = '';
          }
        }
      }
      break;
    default:
      // Custom action handling would go here
      console.log(`Custom action: ${action}`);
  }
}

/**
 * Hydrate multiple elements with their corresponding components
 * 
 * @param {Array} elements - Array of DOM elements to hydrate
 * @param {Array} components - Array of Coherent component functions
 * @param {Array} propsArray - Array of props for each component
 * @returns {Array} Array of hydrated component instances
 */
function hydrateAll(elements, components, propsArray = []) {
  if (elements.length !== components.length) {
    throw new Error('Number of elements must match number of components');
  }
  
  return elements.map((element, index) => {
    const component = components[index];
    const props = propsArray[index] || {};
    return hydrate(element, component, props);
  });
}

/**
 * Find and hydrate elements by CSS selector
 * 
 * @param {string} selector - CSS selector to find elements
 * @param {Function} component - The Coherent component function
 * @param {Object} props - The props to pass to the component
 * @returns {Array} Array of hydrated component instances
 */
function hydrateBySelector(selector, component, props = {}) {
  if (typeof window === 'undefined' || !document.querySelectorAll) {
    return [];
  }
  
  const elements = document.querySelectorAll(selector);
  return Array.from(elements).map(element => hydrate(element, component, props));
}

/**
 * Enable client-side interactivity for event handlers
 * 
 * @param {HTMLElement} rootElement - The root element to enable events on
 */
function enableClientEvents(rootElement = document) {
  if (typeof window === 'undefined' || !rootElement.querySelectorAll) {
    return;
  }
  
  // This function is now handled automatically during hydration
  // but can be called to enable events on dynamically added elements
  console.log('Client events enabled on:', rootElement);
}

/**
 * Create a hydratable component
 * 
 * @param {Function} component - The Coherent component function
 * @param {Object} options - Hydration options
 * @returns {Function} A component that can be hydrated
 */
function makeHydratable(component, options = {}) {
  // Create a new function that wraps the original component
  const hydratableComponent = function(props = {}) {
    return component(props);
  };
  
  // Copy all properties from the original component, including withState metadata
  Object.keys(component).forEach(key => {
    hydratableComponent[key] = component[key];
  });
  
  // Copy prototype if it exists
  if (component.prototype) {
    hydratableComponent.prototype = Object.create(component.prototype);
  }
  
  // Special handling for withState wrapped components
  if (component.__wrappedComponent && component.__stateContainer) {
    hydratableComponent.__wrappedComponent = component.__wrappedComponent;
    hydratableComponent.__stateContainer = component.__stateContainer;
  }
  
  // Add hydration metadata to the component
  hydratableComponent.isHydratable = true;
  hydratableComponent.hydrationOptions = options;
  
  // Add auto-hydration functionality
  hydratableComponent.autoHydrate = function(componentRegistry = {}) {
    // Register this component if not already registered
    if (!componentRegistry[hydratableComponent.name || 'AnonymousComponent']) {
      componentRegistry[hydratableComponent.name || 'AnonymousComponent'] = hydratableComponent;
    }
    
    // Call the global autoHydrate function
    autoHydrate(componentRegistry);
  };
  
  // Mark this component as hydratable
  hydratableComponent.isHydratable = true;
  
  // Add a method to manually set hydration data for cases where we need to override
  hydratableComponent.withHydrationData = function(customProps = {}, customState = null) {
    return {
      render: function(props = {}) {
        const mergedProps = { ...customProps, ...props };
        const result = hydratableComponent(mergedProps);
        const hydrationData = hydratableComponent.getHydrationData(mergedProps, customState);
        
        // Add hydration attributes to the root element
        if (result && typeof result === 'object' && !Array.isArray(result)) {
          const tagName = Object.keys(result)[0];
          const elementProps = result[tagName];
          
          if (elementProps && typeof elementProps === 'object') {
            // Add hydration attributes
            Object.keys(hydrationData.hydrationAttributes).forEach(attr => {
              const value = hydrationData.hydrationAttributes[attr];
              if (value !== null) {
                elementProps[attr] = value;
              }
            });
          }
        }
        
        return result;
      }
    };
  };

  // Add a method to get hydration data
  hydratableComponent.getHydrationData = function(props = {}, state = null) {
    return {
      componentName: hydratableComponent.name || 'AnonymousComponent',
      props,
      initialState: options.initialState,
      // Add data attributes for hydration
      hydrationAttributes: {
        'data-coherent-component': hydratableComponent.name || 'AnonymousComponent',
        'data-coherent-state': state ? JSON.stringify(state) : (options.initialState ? JSON.stringify(options.initialState) : null),
        'data-coherent-props': Object.keys(props).length > 0 ? JSON.stringify(props) : null
      }
    };
  };

  // Add a method to render with hydration data
  hydratableComponent.renderWithHydration = function(props = {}) {
    const result = hydratableComponent(props);
    
    // Try to extract state from the component if it's a withState wrapped component
    let state = null;
    if (hydratableComponent.__wrappedComponent && hydratableComponent.__stateContainer) {
      // This is a withState wrapped component, try to get its state
      try {
        state = hydratableComponent.__stateContainer.getState();
      } catch (e) {
        // If we can't get the state, that's OK
      }
    }
    
    const hydrationData = hydratableComponent.getHydrationData(props, state);
    
    // Add hydration attributes to the root element
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      const tagName = Object.keys(result)[0];
      const elementProps = result[tagName];
      
      if (elementProps && typeof elementProps === 'object') {
        // Add hydration attributes
        Object.keys(hydrationData.hydrationAttributes).forEach(attr => {
          const value = hydrationData.hydrationAttributes[attr];
          if (value !== null) {
            elementProps[attr] = value;
          }
        });
      }
    }
    
    return result;
  };
  
  return hydratableComponent;
}

/**
 * Auto-hydrate all components on page load
 * 
 * @param {Object} componentRegistry - Registry of component functions
 */
function autoHydrate(componentRegistry = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  
  // Wait for DOM to be ready
  const hydrate = () => {
    const hydrateableElements = document.querySelectorAll('[data-coherent-component]');
    
    hydrateableElements.forEach(element => {
      const componentName = element.getAttribute('data-coherent-component');
      const component = componentRegistry[componentName];
      
      if (component && component.isHydratable) {
        try {
          // Extract props from data attributes
          const propsAttr = element.getAttribute('data-coherent-props');
          const props = propsAttr ? JSON.parse(propsAttr) : {};
          
          // Extract initial state
          const stateAttr = element.getAttribute('data-coherent-state');
          const initialState = stateAttr ? JSON.parse(stateAttr) : null;
          
          // Hydrate the component
          const instance = hydrate(element, component, props, { initialState });
          
          console.log(`Auto-hydrated component: ${componentName}`);
        } catch (error) {
          console.error(`Failed to auto-hydrate component ${componentName}:`, error);
        }
      } else {
        console.warn(`Component ${componentName} not found in registry or not hydratable`);
      }
    });
  };
  
  // Run hydration when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }
}

// Also export individual functions for convenience
export {
  hydrate,
  hydrateAll,
  hydrateBySelector,
  enableClientEvents,
  makeHydratable,
  autoHydrate
};
