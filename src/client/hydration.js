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
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return options.initialState || null;
  }
  
  // Check if element has getAttribute method
  if (!element || typeof element.getAttribute !== 'function') {
    return options.initialState || null;
  }
  
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
    
    const stepAttr = element.getAttribute('data-step');
    if (stepAttr !== null) {
      state.step = parseInt(stepAttr, 10) || 1;
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
      return { ...options.initialState, ...state };
    }
    
    return hasState ? state : null;
  } catch (error) {
    console.warn('Error extracting initial state:', error);
    return options.initialState || null;
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
  // Hydration process initiated
  
  if (typeof window === 'undefined') {
    console.warn('Hydration can only be performed in a browser environment');
    return null;
  }
  
  // Check if element is already hydrated
  if (componentInstances.has(element)) {
    const existingInstance = componentInstances.get(element);
    return existingInstance;
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
      return this; // Return instance for chaining
    },
    
    // Re-render the component with current state
    rerender() {
      try {
        // Always use the fallback patching method to preserve hydration
        this.fallbackRerender();
      } catch (error) {
        console.error('Error during component re-render:', error);
      }
    },
    
    // Fallback re-render method using existing patching
    fallbackRerender() {
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
        
        // Re-attach event listeners for input elements only
        attachFunctionEventListeners(this.element, newVirtualElement, this, { inputsOnly: true });
        
        // Store the new virtual element for next comparison
        this.previousVirtualElement = newVirtualElement;
        
        // Component re-rendered successfully with fallback
      } catch (error) {
        console.error('Error during component re-render (fallback):', error);
      }
    },
    
    // Create virtual element representation from existing DOM
    virtualElementFromDOM(domElement) {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof Node === 'undefined') {
        return null;
      }
      
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
      if (domElement.attributes) {
        Array.from(domElement.attributes).forEach(attr => {
          const name = attr.name === 'class' ? 'className' : attr.name;
          props[name] = attr.value;
        });
      }
      
      // Extract children
      if (domElement.childNodes) {
        Array.from(domElement.childNodes).forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent.trim();
            if (text) children.push(text);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childVNode = this.virtualElementFromDOM(child);
            if (childVNode) children.push(childVNode);
          }
        });
      }
      
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
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof Node === 'undefined' || typeof document === 'undefined') {
          return;
        }
        
        if (domElement.nodeType === Node.TEXT_NODE) {
          if (domElement.textContent !== newText) {
            domElement.textContent = newText;
          }
        } else {
          // Replace element with text node
          const textNode = document.createTextNode(newText);
          if (domElement.parentNode) {
            domElement.parentNode.replaceChild(textNode, domElement);
          }
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
      
      // Check if tag name changed
      if (domElement.tagName.toLowerCase() !== newTagName.toLowerCase()) {
        // Need to replace the entire element
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          return;
        }
        
        const newElement = this.createDOMElement(newVNode);
        if (domElement.parentNode) {
          domElement.parentNode.replaceChild(newElement, domElement);
        }
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
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
      }
      
      // Check if domElement has required methods
      if (!domElement || typeof domElement.setAttribute !== 'function' || typeof domElement.removeAttribute !== 'function') {
        return;
      }
      
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
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof Node === 'undefined' || typeof document === 'undefined') {
        return;
      }
      
      // Check if domElement has required methods
      if (!domElement || typeof domElement.childNodes === 'undefined' || typeof domElement.appendChild !== 'function') {
        return;
      }
      
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
      // Check if Array.from is available and domElement.childNodes is iterable
      let domChildren = [];
      if (typeof Array.from === 'function' && domElement.childNodes) {
        try {
          domChildren = Array.from(domElement.childNodes).filter(node => {
            return node.nodeType === Node.ELEMENT_NODE || 
                   (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim());
          });
        } catch (error) {
          // Fallback to empty array if Array.from fails
          console.warn('Failed to convert childNodes to array:', error);
          domChildren = [];
        }
      }
      
      // Simple diffing algorithm - can be improved with key-based diffing
      const maxLength = Math.max(oldChildren.length, newChildren.length, domChildren.length);
      
      for (let i = 0; i < maxLength; i++) {
        const oldChild = oldChildren[i];
        const newChild = newChildren[i];
        const domChild = domChildren[i];
        
        if (newChild === undefined) {
          // Remove extra DOM children
          if (domChild && typeof domChild.remove === 'function') {
            domChild.remove();
          }
        } else if (domChild === undefined) {
          // Add new DOM children
          const newElement = this.createDOMElement(newChild);
          if (newElement) {
            domElement.appendChild(newElement);
          }
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
      
      // Component destroyed
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
  
  // Store the instance on the root element for event handler access
  if (element && typeof element.setAttribute === 'function') {
    element.__coherentInstance = instance;
    // Also add a data attribute to identify this as a coherent component
    if (!element.hasAttribute('data-coherent-component')) {
      element.setAttribute('data-coherent-component', 'true');
    }
  }
  
  // Re-execute component to get fresh virtual DOM with function handlers
  // For withState components, we need to ensure the state management is properly initialized
  const componentProps = { ...instance.props };
  
  // If this is a withState component, initialize its state properly
  if (instance.component.__stateContainer) {
    // Initialize state container with hydrated state if available
    if (instance.state) {
      instance.component.__stateContainer.setState(instance.state);
    }
    
    // Override the instance setState to use the state container
    instance.setState = (newState) => {
      // Update the state container
      instance.component.__stateContainer.setState(newState);
      
      // Update the instance state for consistency
      const updatedState = instance.component.__stateContainer.getState();
      instance.state = updatedState;
      
      // Trigger re-render
      instance.rerender();
    };
  }
  
  // Execute component function to get fresh virtual DOM
  const freshVirtualElement = instance.component(componentProps);
  
  // Try to inspect the structure more carefully
  if (freshVirtualElement && typeof freshVirtualElement === 'object') {
    const tagName = Object.keys(freshVirtualElement)[0];
    // Process root element and children
    if (freshVirtualElement[tagName]) {
    }
  }
  
  // Attach function-based event listeners from the fresh virtual DOM
  attachFunctionEventListeners(element, freshVirtualElement, instance);
  
  // Skip legacy event listeners to avoid conflicts with function handlers
  // Skip legacy event attachment to prevent conflicts
  
  // Component hydrated
  
  return instance;
}

// Global registry for event handlers
const eventRegistry = {};

/**
 * Register an event handler for later use
 * @param {string} id - Unique identifier for the event handler
 * @param {Function} handler - The event handler function
 */
export function registerEventHandler(id, handler) {
  eventRegistry[id] = handler;
}

/**
 * Global event handler that can be called from inline event attributes
 * @param {string} eventId - The event handler ID
 * @param {Element} element - The DOM element
 * @param {Event} event - The event object
 */
if (typeof window !== 'undefined') {
  // Initialize event registries if they don't exist
  window.__coherentEventRegistry = window.__coherentEventRegistry || {};
  window.__coherentActionRegistry = window.__coherentActionRegistry || {};
  
  window.__coherentEventHandler = function(eventId, element, event) {
    // Event handler called
    
    // Try to get the function from the event registry first
    let handlerFunc = window.__coherentEventRegistry[eventId];
    
    // If not found in event registry, try action registry
    if (!handlerFunc && window.__coherentActionRegistry[eventId]) {
      handlerFunc = window.__coherentActionRegistry[eventId];
    }
    
    if (handlerFunc) {
      // Try to find the component instance associated with this element
      let componentElement = element;
      while (componentElement && !componentElement.hasAttribute('data-coherent-component')) {
        componentElement = componentElement.parentElement;
      }
      
      if (componentElement && componentElement.__coherentInstance) {
        // We found the component instance
        const instance = componentElement.__coherentInstance;
        const state = instance.state || {};
        const setState = instance.setState ? instance.setState.bind(instance) : (() => {});
        
        try {
          // Call the handler function with the element as context and pass event, state, setState
          handlerFunc.call(element, event, state, setState);
        } catch (error) {
          console.warn(`Error executing coherent event handler:`, error);
        }
      } else {
        // Fallback: call the handler without component context
        try {
          handlerFunc.call(element, event);
        } catch (error) {
          console.warn(`Error executing coherent event handler (no component context):`, error);
        }
      }
    } else {
      console.warn(`Event handler not found for ID: ${eventId}`);
    }
  };
}

/**
 * Updates DOM elements to reflect state changes using direct DOM manipulation.
 * This function serves as the main entry point for synchronizing component state
 * with the visual representation in the DOM.
 * 
 * @param {HTMLElement} rootElement - The root component element containing the UI to update
 * @param {Object} state - The new state object containing updated component data
 * @since 0.1.2
 */
function updateDOMWithState(rootElement, state) {
  if (!rootElement || !state) return;
  
  // Use direct DOM updates to avoid breaking event handlers
  updateDOMElementsDirectly(rootElement, state);
  
  // Also update any dynamic content that needs to be re-rendered
  updateDynamicContent(rootElement, state);
}

/**
 * Simple virtual DOM to DOM rendering fallback
 * 
 * @param {Object} vdom - Virtual DOM object
 * @param {HTMLElement} container - Container element
 */
// eslint-disable-next-line no-unused-vars -- kept for future SSR fallback rendering
function renderVirtualDOMToElement(vdom, container) {
  if (!vdom || !container) return;
  
  // Handle different virtual DOM structures
  if (typeof vdom === 'string') {
    container.textContent = vdom;
    return;
  }
  
  if (typeof vdom === 'object') {
    // Get the tag name (first key)
    const tagName = Object.keys(vdom)[0];
    if (!tagName) return;
    
    const element = document.createElement(tagName);
    const props = vdom[tagName] || {};
    
    // Set attributes and properties
    Object.keys(props).forEach(key => {
      if (key === 'children') {
        // Handle children
        const children = props.children;
        if (Array.isArray(children)) {
          children.forEach(child => {
            renderVirtualDOMToElement(child, element);
          });
        } else if (children) {
          renderVirtualDOMToElement(children, element);
        }
      } else if (key === 'text') {
        element.textContent = props[key];
      } else if (key.startsWith('on')) {
        // Skip event handlers for now - they'll be attached separately
      } else {
        // Set attribute
        element.setAttribute(key, props[key]);
      }
    });
    
    container.appendChild(element);
  }
}

/**
 * Performs direct DOM updates by finding elements with data-ref attributes
 * and updating their content to match the current state. This approach ensures
 * that UI elements stay synchronized with component state without full re-rendering.
 * 
 * @param {HTMLElement} rootElement - The root component element to search within
 * @param {Object} state - The current state object containing updated values
 * @since 0.1.2
 */
function updateDOMElementsDirectly(rootElement, state) {
  // Update elements with data-ref attributes that correspond to state values
  const refElements = rootElement.querySelectorAll('[data-ref]');
  refElements.forEach(element => {
    const ref = element.getAttribute('data-ref');
    if (ref && state.hasOwnProperty(ref)) {
      // Update text content based on the reference
      if (ref === 'count') {
        element.textContent = `Count: ${state.count}`;
      } else if (ref === 'step') {
        element.textContent = `Step: ${state.step}`;
      } else {
        element.textContent = state[ref];
      }
    }
  });
  
  // Update input values that correspond to state
  const inputs = rootElement.querySelectorAll('input');
  inputs.forEach(input => {
    if (input.type === 'number' && state.step !== undefined) {
      input.value = state.step;
    } else if (input.type === 'text' && state.newTodo !== undefined) {
      // DON'T override input value if user is actively typing
      // Only update if the input is not focused (user not typing)
      if (document.activeElement !== input) {
        input.value = state.newTodo;
      }
    }
  });
}

/**
 * Updates dynamic content sections such as lists, statistics, and interactive elements.
 * This function handles complex UI updates that require more than simple text replacement,
 * including filtering, sorting, and structural changes to the DOM.
 * 
 * @param {HTMLElement} rootElement - The root component element containing dynamic content
 * @param {Object} state - The current state object with updated data
 * @since 0.1.2
 */
function updateDynamicContent(rootElement, state) {
  // Update todo list if present
  if (state.todos !== undefined) {
    updateTodoList(rootElement, state);
  }
  
  // Update todo stats if present
  if (state.todos !== undefined) {
    updateTodoStats(rootElement, state);
  }
  
  // Update filter buttons if present
  if (state.filter !== undefined) {
    updateFilterButtons(rootElement, state);
  }
}

/**
 * Updates the todo list display by rebuilding the list items based on current state.
 * Handles filtering (all/active/completed) and creates new DOM elements for each todo.
 * After updating the DOM, re-attaches event handlers to ensure interactivity.
 * 
 * @param {HTMLElement} rootElement - The root component element containing the todo list
 * @param {Object} state - The current state object containing todos array and filter settings
 * @since 0.1.2
 */
function updateTodoList(rootElement, state) {
  const todoList = rootElement.querySelector('.todo-list');
  if (!todoList) return;
  
  // Filter todos based on current filter
  const filteredTodos = state.todos.filter(todo => {
    if (state.filter === 'active') return !todo.completed;
    if (state.filter === 'completed') return todo.completed;
    return true;
  });
  
  // Clear current list
  todoList.innerHTML = '';
  
  // Add filtered todos
  filteredTodos.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    
    li.innerHTML = `
      <input type="checkbox" ${todo.completed ? 'checked' : ''} class="todo-checkbox" data-todo-id="${todo.id}">
      <span class="todo-text">${todo.text}</span>
      <button class="btn btn-danger btn-small" data-todo-id="${todo.id}" data-action="remove">×</button>
    `;
    
    todoList.appendChild(li);
  });
  
  // Re-attach function-based event handlers to newly created DOM elements
  // This is necessary because manually created DOM elements don't automatically get
  // the function-based handlers from the virtual DOM
  reattachTodoEventHandlers(rootElement, state);
}

/**
 * Update todo statistics display
 * 
 * @param {HTMLElement} rootElement - The root component element
 * @param {Object} state - The new state
 */
function updateTodoStats(rootElement, state) {
  const statsElement = rootElement.querySelector('.todo-stats');
  if (!statsElement || !state.todos) return;
  
  const stats = {
    total: state.todos.length,
    completed: state.todos.filter(todo => todo.completed).length,
    active: state.todos.filter(todo => !todo.completed).length
  };
  
  statsElement.innerHTML = `
    <span class="stat-item">Total: ${stats.total}</span>
    <span class="stat-item">Active: ${stats.active}</span>
    <span class="stat-item">Completed: ${stats.completed}</span>
  `;
}

/**
 * Update filter button states
 * 
 * @param {HTMLElement} rootElement - The root component element
 * @param {Object} state - The new state
 */
function updateFilterButtons(rootElement, state) {
  const filterButtons = rootElement.querySelectorAll('.filter-btn');
  filterButtons.forEach(button => {
    const buttonText = button.textContent.toLowerCase();
    if (buttonText === state.filter || (buttonText === 'all' && state.filter === 'all')) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

/**
 * Re-attaches event handlers to dynamically created todo items after DOM updates.
 * This function is essential for maintaining interactivity when todo items are
 * recreated during state changes. Handles both delete buttons and toggle checkboxes.
 * 
 * @param {HTMLElement} rootElement - The root component element containing todo items
 * @param {Object} state - The current state object for context
 * @since 0.1.2
 */
function reattachTodoEventHandlers(rootElement) {
  // Find the component instance to get access to the component's handlers
  const componentInstance = rootElement.__coherentInstance;
  if (!componentInstance || !componentInstance.component) {
    console.warn('⚠️ No component instance found for re-attaching todo event handlers');
    return;
  }
  
  // Get the component's removeTodo and toggleTodo functions
  // These should be available in the component's scope
  const component = componentInstance.component;
  
  // Re-attach delete button handlers
  const deleteButtons = rootElement.querySelectorAll('button[data-action="remove"]');
  deleteButtons.forEach(button => {
    const todoId = parseInt(button.getAttribute('data-todo-id'));
    if (todoId) {
      // Remove any existing handler to prevent duplicates
      const handlerKey = `__coherent_click_handler`;
      if (button[handlerKey]) {
        button.removeEventListener('click', button[handlerKey]);
      }
      
      // Create new handler that calls the component's removeTodo function
      const clickHandler = (event) => {
        event.preventDefault();
        
        // Get current state and setState from component
        if (component.__stateContainer) {
          const currentState = component.__stateContainer.getState();
          const setState = component.__stateContainer.setState.bind(component.__stateContainer);
          
          // Remove the todo
          setState({
            todos: currentState.todos.filter(todo => todo.id !== todoId)
          });
          
          // Trigger DOM update to reflect the state change
          const updatedState = component.__stateContainer.getState();
          updateDOMWithState(rootElement, updatedState);
        }
      };
      
      // Attach the handler
      button.addEventListener('click', clickHandler);
      button[handlerKey] = clickHandler;
    }
  });
  
  // Re-attach checkbox handlers
  const checkboxes = rootElement.querySelectorAll('.todo-checkbox');
  checkboxes.forEach(checkbox => {
    const todoId = parseInt(checkbox.getAttribute('data-todo-id'));
    if (todoId) {
      // Remove any existing handler to prevent duplicates
      const handlerKey = `__coherent_change_handler`;
      if (checkbox[handlerKey]) {
        checkbox.removeEventListener('change', checkbox[handlerKey]);
      }
      
      // Create new handler that calls the component's toggleTodo function
      const changeHandler = () => {
        // Get current state and setState from component
        if (component.__stateContainer) {
          const currentState = component.__stateContainer.getState();
          const setState = component.__stateContainer.setState.bind(component.__stateContainer);
          
          // Toggle the todo
          setState({
            todos: currentState.todos.map(todo => 
              todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
            )
          });
          
          // Trigger DOM update to reflect the state change
          const updatedState = component.__stateContainer.getState();
          updateDOMWithState(rootElement, updatedState);
        }
      };
      
      // Attach the handler
      checkbox.addEventListener('change', changeHandler);
      checkbox[handlerKey] = changeHandler;
    }
  });
}

/**
 * Attaches function-based event listeners from virtual DOM definitions to real DOM elements.
 * This is the core mechanism that enables interactive components by bridging the gap
 * between virtual DOM event handlers and actual browser events. Prevents duplicate
 * handlers and ensures proper state management integration.
 * 
 * @param {HTMLElement} rootElement - The root DOM element to search for event targets
 * @param {Object} virtualElement - The virtual DOM element containing function handlers
 * @param {Object} instance - The component instance providing state and context
 * @since 0.1.2
 */
function attachFunctionEventListeners(rootElement, virtualElement, instance, options = {}) {
  if (!rootElement || !virtualElement || typeof window === 'undefined') {
    return;
  }
  
  // Helper function to traverse virtual DOM and find function handlers
  function traverseAndAttach(domElement, vElement, path = []) {
    if (!vElement || typeof vElement !== 'object') return;
    
    // Handle array of virtual elements
    if (Array.isArray(vElement)) {
      vElement.forEach((child, index) => {
        const childElement = domElement.children[index];
        if (childElement) {
          traverseAndAttach(childElement, child, [...path, index]);
        }
      });
      return;
    }
    
    // Handle single virtual element
    const tagName = Object.keys(vElement)[0];
    const elementProps = vElement[tagName];
    
    if (elementProps && typeof elementProps === 'object') {
      // Look for event handler functions
      const eventHandlers = ['onclick', 'onchange', 'oninput', 'onfocus', 'onblur', 'onsubmit', 'onkeypress', 'onkeydown', 'onkeyup', 'onmouseenter', 'onmouseleave'];
      
      eventHandlers.forEach(eventName => {
        const handler = elementProps[eventName];
        if (typeof handler === 'function') {
          const eventType = eventName.substring(2); // Remove 'on' prefix
          
          // If inputsOnly option is set, only attach input-related events and click events on dynamically generated elements
          if (options.inputsOnly) {
            const inputEvents = ['input', 'change', 'keypress'];
            const isDynamicElement = domElement.closest('.todo-item') || domElement.closest('[data-dynamic]');
            
            if (!inputEvents.includes(eventType) && !(eventType === 'click' && isDynamicElement)) {
              return; // Skip non-input events except clicks on dynamic elements
            }
          }
          
          // Special handling for input events
          
          // Check if handler is already attached to prevent duplicates
          const handlerKey = `__coherent_${eventType}_handler`;
          if (domElement[handlerKey]) {
            // Remove the old handler first
            domElement.removeEventListener(eventType, domElement[handlerKey]);
            delete domElement[handlerKey];
          }
          
          // Create a wrapper that provides component context
          const wrappedHandler = (event) => {
            try {
              // Only prevent default for non-input events and non-form events
              if (eventType !== 'input' && eventType !== 'change' && eventType !== 'keypress') {
                event.preventDefault();
              }
              
              // Execute the function handler with proper context
              
              // Extract state and setState from the component's current execution context
              let currentState = {};
              let currentSetState = () => {};
              
              // For withState components, use the state container
              if (instance.component && instance.component.__stateContainer) {
                currentState = instance.component.__stateContainer.getState();
                currentSetState = (newState) => {
                  // Call the component's setState method
                  instance.component.__stateContainer.setState(newState);
                  
                  // Update the instance state for consistency
                  if (instance.state && typeof newState === 'object') {
                    Object.assign(instance.state, newState);
                  }
                  
                  // Get the updated state after setState
                  instance.component.__stateContainer.getState();
                  
                  // Trigger component re-render to reflect the new state
                  const componentRoot = domElement.closest('[data-coherent-component]');
                  if (componentRoot && componentRoot.__coherentInstance) {
                    componentRoot.__coherentInstance.rerender();
                  }
                };
              } else if (instance.state) {
                // Fallback for non-withState components
                currentState = instance.state;
                currentSetState = (newState) => {
                  if (typeof newState === 'object') {
                    Object.assign(instance.state, newState);
                  }
                  
                  // Trigger component re-render to reflect the new state
                  const componentRoot = domElement.closest('[data-coherent-component]');
                  if (componentRoot && componentRoot.__coherentInstance) {
                    componentRoot.__coherentInstance.rerender();
                  }
                };
              }
              
              // Call the original handler with event, state, and setState
              const result = handler.call(domElement, event, currentState, currentSetState);
              
              return result;
            } catch (error) {
              console.error(`Error in ${eventName} handler:`, error);
            }
          };
          
          // Remove any existing onclick attributes that might interfere
          if (domElement.hasAttribute(eventName)) {
            domElement.removeAttribute(eventName);
          }
          
          // Store the handler reference to prevent duplicates
          domElement[handlerKey] = wrappedHandler;
          
          // Add the new event listener (use capture only for non-input events)
          const useCapture = eventType !== 'input' && eventType !== 'change';
          domElement.addEventListener(eventType, wrappedHandler, useCapture);
          
          // Input event handler attached successfully
          
          // Add to instance's event listeners for cleanup
          if (instance.eventListeners && Array.isArray(instance.eventListeners)) {
            instance.eventListeners.push({
              element: domElement,
              event: eventType,
              handler: wrappedHandler
            });
          }
        }
      });
      
      // Recursively handle children
      if (elementProps.children) {
        const children = Array.isArray(elementProps.children) ? elementProps.children : [elementProps.children];
        children.forEach((child, index) => {
          const childElement = domElement.children[index];
          if (childElement && child) {
            traverseAndAttach(childElement, child, [...path, 'children', index]);
          }
        });
      }
    }
  }
  
  // Start traversal from the root
  traverseAndAttach(rootElement, virtualElement);
}

/**
 * Attach event listeners from data attributes
 * 
 * @param {HTMLElement} element - The root element
 * @param {Object} instance - The component instance
 */
function attachEventListeners(element, instance) {
  // Check if we're in a browser environment
  try {
    // Clear any existing event listeners if this is a re-hydration
    if (instance && instance.eventListeners && Array.isArray(instance.eventListeners)) {
      instance.eventListeners.forEach(({ element, event, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
          element.removeEventListener(event, handler);
        }
      });
      instance.eventListeners = [];
    }
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // Check if element has required methods
    if (!element || typeof element.querySelectorAll !== 'function') {
      return;
    }
    
    // Find all elements with data-action attributes
    const actionElements = element.querySelectorAll('[data-action]');
    
    actionElements.forEach(actionElement => {
      // Check if element has required methods
      if (!actionElement || typeof actionElement.getAttribute !== 'function') return;
      
      const action = actionElement.getAttribute('data-action');
      const target = actionElement.getAttribute('data-target') || 'default';
      const event = actionElement.getAttribute('data-event') || 'click';
      
      if (action) {
        const handler = (e) => {
          if (e && typeof e.preventDefault === 'function') {
            e.preventDefault(); // Prevent default behavior for better control
          }
          handleComponentAction(e, action, target, instance);
        };
        
        // Add event listener
        if (typeof actionElement.addEventListener === 'function') {
          actionElement.addEventListener(event, handler);
          
          // Store for cleanup
          if (instance.eventListeners && Array.isArray(instance.eventListeners)) {
            instance.eventListeners.push({
              element: actionElement,
              event,
              handler
            });
          }
        }
      }
    });
    
    // Also look for common event attributes and convert them to event listeners
    const eventAttributes = ['onclick', 'onchange', 'oninput', 'onfocus', 'onblur', 'onsubmit'];
    
    eventAttributes.forEach(eventName => {
      const attributeSelector = `[${eventName}]`;
      const elements = element.querySelectorAll(attributeSelector);
      
      elements.forEach(elementWithEvent => {
        // Check if element has required methods
        if (!elementWithEvent || typeof elementWithEvent.getAttribute !== 'function') return;
        
        const eventAttr = elementWithEvent.getAttribute(eventName);
        const eventType = eventName.substring(2); // Remove 'on' prefix
        
        // Handle regular string event handlers
        if (eventAttr && typeof elementWithEvent.hasAttribute === 'function' && !elementWithEvent.hasAttribute(`data-hydrated-${eventType}`)) {
          // Mark as processed to avoid duplicate handling
          elementWithEvent.setAttribute(`data-hydrated-${eventType}`, 'true');
          
          const handler = (e) => {
            try {
              // Create a safe execution context with access to component state
              // We'll pass the component instance's state and setState function to the handler
              const state = instance.state || {};
              const setState = instance.setState || (() => {});
              
              // Create a function with access to the event, state, and setState
              const func = new Function('event', 'state', 'setState', 'element', eventAttr);
              func.call(elementWithEvent, e, state, setState, elementWithEvent);
            } catch (error) {
              console.warn(`Error executing ${eventName} handler:`, error);
            }
          };
          
          if (typeof elementWithEvent.addEventListener === 'function') {
            elementWithEvent.addEventListener(eventType, handler);
            if (instance.eventListeners && Array.isArray(instance.eventListeners)) {
              instance.eventListeners.push({
                element: elementWithEvent,
                event: eventType,
                handler
              });
            }
          }
        }
      });
    });
    
    // Also look for data-action attributes (new approach)
    const dataActionElements = element.querySelectorAll('[data-action]');
    
    dataActionElements.forEach(actionElement => {
      // Check if element has required methods
      if (!actionElement || typeof actionElement.getAttribute !== 'function') return;
      
      const actionId = actionElement.getAttribute('data-action');
      const eventType = actionElement.getAttribute('data-event') || 'click';
      
      if (actionId) {
        // Get the function from the action registry
        let handlerFunc = null;
        
        // Try to get from action registry (server-side stored)
        if (typeof window !== 'undefined' && window.__coherentActionRegistry && window.__coherentActionRegistry[actionId]) {
          handlerFunc = window.__coherentActionRegistry[actionId];
        } else {
          console.warn(`No handler found for action ${actionId}`, window.__coherentActionRegistry);
        }
        
        if (handlerFunc && typeof handlerFunc === 'function') {
          // Mark as processed to avoid duplicate handling
          if (typeof actionElement.hasAttribute === 'function' && !actionElement.hasAttribute(`data-hydrated-${eventType}`)) {
            actionElement.setAttribute(`data-hydrated-${eventType}`, 'true');
            
            const handler = (e) => {
              try {
                // Try to find the component instance associated with this element
                let componentElement = actionElement;
                while (componentElement && !componentElement.hasAttribute('data-coherent-component')) {
                  componentElement = componentElement.parentElement;
                }
                
                if (componentElement && componentElement.__coherentInstance) {
                  // We found the component instance
                  const instance = componentElement.__coherentInstance;
                  const state = instance.state || {};
                  const setState = instance.setState || (() => {});
                  
                  // Call the handler function with the element as context and pass event, state, setState
                  handlerFunc.call(actionElement, e, state, setState);
                } else {
                  // Fallback: call the handler without component context
                  handlerFunc.call(actionElement, e);
                }
              } catch (error) {
                console.warn(`Error executing action handler for ${actionId}:`, error);
              }
            };
            
            if (typeof actionElement.addEventListener === 'function') {
              actionElement.addEventListener(eventType, handler);
              if (instance && instance.eventListeners && Array.isArray(instance.eventListeners)) {
                instance.eventListeners.push({
                  element: actionElement,
                  event: eventType,
                  handler
                });
              }
            }
          }
        }
      }
    });
    
    // Also look for Coherent-specific event handlers (data-coherent-event)
    const coherentEventElements = element.querySelectorAll('[data-coherent-event]');
    
    coherentEventElements.forEach(elementWithCoherentEvent => {
      // Check if element has required methods
      if (!elementWithCoherentEvent || typeof elementWithCoherentEvent.getAttribute !== 'function') return;
      
      const eventId = elementWithCoherentEvent.getAttribute('data-coherent-event');
      const eventType = elementWithCoherentEvent.getAttribute('data-coherent-event-type');
      
      if (eventId && eventType) {
        // Get the function from the registry
        let handlerFunc = null;
        
        // Try to get from global registry (server-side stored)
        if (typeof window !== 'undefined' && window.__coherentEventRegistry && window.__coherentEventRegistry[eventId]) {
          handlerFunc = window.__coherentEventRegistry[eventId];
        }
        
        if (handlerFunc && typeof handlerFunc === 'function') {
          // Mark as processed to avoid duplicate handling
          if (typeof elementWithCoherentEvent.hasAttribute === 'function' && !elementWithCoherentEvent.hasAttribute(`data-hydrated-${eventType}`)) {
            elementWithCoherentEvent.setAttribute(`data-hydrated-${eventType}`, 'true');
            
            const handler = (e) => {
              try {
                // Call the original function with proper context
                // Pass the event, state, and setState as parameters
                const state = instance.state || {};
                const setState = instance.setState || (() => {});
                
                // Bind the function to the element and call it with the event
                handlerFunc.call(elementWithCoherentEvent, e, state, setState);
              } catch (error) {
                console.warn(`Error executing coherent event handler:`, error);
              }
            };
            
            if (typeof elementWithCoherentEvent.addEventListener === 'function') {
              elementWithCoherentEvent.addEventListener(eventType, handler);
              if (instance.eventListeners && Array.isArray(instance.eventListeners)) {
                instance.eventListeners.push({
                  element: elementWithCoherentEvent,
                  event: eventType,
                  handler
                });
              }
            }
          }
        }
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
  // Handle common actions
  switch (action) {
    case 'increment':
      if (instance.state && instance.state.count !== undefined) {
        const step = instance.state.step || 1;
        instance.setState({count: instance.state.count + step});
        
        // Update the DOM directly for immediate feedback
        const countElement = instance.element.querySelector('[data-ref="count"]');
        if (countElement) {
          countElement.textContent = `Count: ${instance.state.count + step}`;
        }
      }
      break;
    case 'decrement':
      if (instance.state && instance.state.count !== undefined) {
        const step = instance.state.step || 1;
        instance.setState({count: instance.state.count - step});
        
        // Update the DOM directly for immediate feedback
        const countElement = instance.element.querySelector('[data-ref="count"]');
        if (countElement) {
          countElement.textContent = `Count: ${instance.state.count - step}`;
        }
      }
      break;
    case 'reset':
      if (instance.state) {
        const initialCount = instance.props.initialCount || 0;
        instance.setState({count: initialCount});
        
        // Update the DOM directly for immediate feedback
        const countElement = instance.element.querySelector('[data-ref="count"]');
        if (countElement) {
          countElement.textContent = `Count: ${initialCount}`;
        }
      }
      break;
    case 'changeStep':
      // Get the input value
      const inputElement = event.target;
      if (inputElement && inputElement.value) {
        const stepValue = parseInt(inputElement.value, 10);
        if (!isNaN(stepValue) && stepValue >= 1 && stepValue <= 10) {
          instance.setState({step: stepValue});
          
          // Update the DOM directly for immediate feedback
          const stepElement = instance.element.querySelector('[data-ref="step"]');
          if (stepElement) {
            stepElement.textContent = `Step: ${stepValue}`;
          }
        }
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
      // Check if this is a custom method on the instance
      if (instance && typeof instance[action] === 'function') {
        try {
          // Call the custom method on the instance
          instance[action](event, target);
        } catch (error) {
          console.warn(`Error executing custom action ${action}:`, error);
        }
      } else {
        // Check if this is a function handler in the action registry
        if (typeof window !== 'undefined' && window.__coherentActionRegistry && window.__coherentActionRegistry[action]) {
          const handlerFunc = window.__coherentActionRegistry[action];
          
          // Get the component state and setState function if available
          const state = instance ? (instance.state || {}) : {};
          const setState = instance && instance.setState ? instance.setState.bind(instance) : (() => {});
          
          try {
            // Call the handler function with event, state, and setState
            handlerFunc(event, state, setState);
          } catch (error) {
            console.warn(`Error executing action handler ${action}:`, error);
          }
        } else {
          // Custom action handling would go here
          // Custom action executed
        }
      }
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
  // Client events enabled
}

/**
 * Create a hydratable component
 * 
 * @param {Function} component - The Coherent component function
 * @param {Object} options - Hydration options
 * @returns {Function} A component that can be hydrated
 */
function makeHydratable(component, options = {}) {
  // Extract component name from options or use function name
  const componentName = options.componentName || component.name || 'AnonymousComponent';
  
  // Create a new function that wraps the original component
  const hydratableComponent = function(props = {}) {
    return component(props);
  };
  
  // Set the component name on the hydratable component function
  Object.defineProperty(hydratableComponent, 'name', {
    value: componentName,
    writable: false
  });
  
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
      componentName: componentName,
      props,
      initialState: options.initialState,
      // Add data attributes for hydration
      hydrationAttributes: {
        'data-coherent-component': componentName,
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
        console.warn('Could not get component state:', e);
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
  
  // autoHydrate called
  
  // Check if registry is actually the window object (common mistake)
  if (componentRegistry === window) {
    console.warn('⚠️ Component registry is the window object! This suggests the registry was not properly initialized.');
    // Falling back to window.componentRegistry
    componentRegistry = window.componentRegistry || {};
  }
  
  // Initialize registries if they don't exist
  window.__coherentEventRegistry = window.__coherentEventRegistry || {};
  window.__coherentActionRegistry = window.__coherentActionRegistry || {};
  
  // Wait for DOM to be ready
  const hydrateComponents = () => {
    const hydrateableElements = document.querySelectorAll('[data-coherent-component]');
    
    hydrateableElements.forEach(element => {
      const componentName = element.getAttribute('data-coherent-component');
      
      // Look for the component in the registry
      let component = componentRegistry[componentName];
      
      // If not found by exact name, try to find it by checking if it's a hydratable component
      if (!component) {
        // Component not found by name, searching registry...
        for (const comp of Object.values(componentRegistry)) {
          if (comp && comp.isHydratable) {
            component = comp;
            break;
          }
        }
      }
      
      if (!component) {
        console.error(`❌ Component ${componentName} not found in registry`);
        return; // Skip this element
      }
      
      if (component) {
        try {
          // Extract props from data attributes
          const propsAttr = element.getAttribute('data-coherent-props');
          const props = propsAttr ? JSON.parse(propsAttr) : {};
          
          // Extract initial state
          const stateAttr = element.getAttribute('data-coherent-state');
          const initialState = stateAttr ? JSON.parse(stateAttr) : null;
          
          // Hydrate the component
          const instance = hydrate(element, component, props, { initialState });
          
          if (instance) {
            // Component auto-hydrated successfully
          } else {
            console.warn(`❌ Failed to hydrate component: ${componentName}`);
          }
        } catch (error) {
          console.error(`❌ Failed to auto-hydrate component ${componentName}:`, error);
        }
      }
    });
    
    // Also enable client events for any remaining elements
    enableClientEvents();
  };
  
  // Run hydration when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateComponents);
  } else {
    hydrateComponents();
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
