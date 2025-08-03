/**
 * Client-side hydration utilities for Coherent.js
 * 
 * This module provides utilities for hydrating server-rendered HTML
 * with client-side interactivity.
 */

// Store for component instances
const componentInstances = new WeakMap();

/**
 * Hydrate a DOM element with a Coherent component
 * 
 * @param {HTMLElement} element - The DOM element to hydrate
 * @param {Function} component - The Coherent component function
 * @param {Object} props - The props to pass to the component
 * @param {Object} options - Hydration options
 * @returns {Object} The hydrated component instance
 */
export function hydrate(element, component, props = {}, options = {}) {
  if (typeof window === 'undefined') {
    console.warn('Hydration can only be performed in a browser environment');
    return null;
  }
  
  // Check if element is already hydrated
  if (componentInstances.has(element)) {
    console.warn('Element is already hydrated');
    return componentInstances.get(element);
  }
  
  // Create component instance with state management
  const instance = {
    element,
    component,
    props: {...props},
    state: null,
    isHydrated: true,
    eventListeners: [],
    
    // Update method for re-rendering
    update(newProps) {
      this.props = { ...this.props, ...newProps };
      this.rerender();
    },
    
    // Re-render the component with current state
    rerender() {
      try {
        // Call the component function with current props
        const newElement = this.component(this.props);
        
        // In a full implementation, we would diff and update only changed parts
        // For now, we'll just log what would be updated
        console.log('Component would re-render with:', newElement);
      } catch (error) {
        console.error('Error during component re-render:', error);
      }
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
    // Find all elements with data-action attributes
    const actionElements = element.querySelectorAll('[data-action]');
    
    actionElements.forEach(actionElement => {
      // Check if element has required methods
      if (!actionElement.getAttribute) return;
      
      const action = actionElement.getAttribute('data-action');
      const target = actionElement.getAttribute('data-target');
      
      // Map common events
      const eventMap = {
        'click': 'onclick',
        'change': 'onchange',
        'input': 'oninput',
        'submit': 'onsubmit',
        'focus': 'onfocus',
        'blur': 'onblur'
      };
      
      // Get the actual event type
      let eventType = 'click'; // default
      for (const [event, attr] of Object.entries(eventMap)) {
        if (actionElement.hasAttribute && actionElement.hasAttribute(attr)) {
          eventType = event;
          break;
        }
      }
      
      // Attach event listener
      instance.addEventListener(actionElement, eventType, (e) => {
        handleComponentAction(e, action, target, instance);
      });
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
export function hydrateAll(elements, components, propsArray = []) {
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
export function hydrateBySelector(selector, component, props = {}) {
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
export function enableClientEvents(rootElement = document) {
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
 * @returns {Function} A component that can be hydrated
 */
export function makeHydratable(component) {
  // Add hydration metadata to the component
  component.isHydratable = true;
  
  // Add a method to get hydration data
  component.getHydrationData = function() {
    return {
      componentName: component.name || 'AnonymousComponent',
      // In a real implementation, this would return serializable data
      // needed for client-side hydration
    };
  };
  
  return component;
}

// Export a default object with all utilities
export default {
  hydrate,
  hydrateAll,
  hydrateBySelector,
  enableClientEvents,
  makeHydratable
};
