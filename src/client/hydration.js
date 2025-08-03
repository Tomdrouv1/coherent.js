/**
 * Client-side hydration utilities for Coherent.js
 * 
 * This module provides utilities for hydrating server-rendered HTML
 * with client-side interactivity.
 */

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
  // In a real implementation, this would:
  // 1. Match the DOM structure with the component structure
  // 2. Attach event listeners
  // 3. Set up state management
  // 4. Enable client-side updates
  
  if (typeof window === 'undefined') {
    console.warn('Hydration can only be performed in a browser environment');
    return null;
  }
  
  // For now, we'll just log that hydration would occur
  console.log('Hydrating element:', element, 'with component:', component.name);
  
  // Create a simple component instance
  const instance = {
    element,
    component,
    props,
    isHydrated: true,
    
    // Simple update method
    update(newProps) {
      this.props = { ...this.props, ...newProps };
      console.log('Component updated with new props:', this.props);
    },
    
    // Simple destroy method
    destroy() {
      this.isHydrated = false;
      console.log('Component destroyed');
    }
  };
  
  return instance;
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
  if (typeof window === 'undefined') {
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
  if (typeof window === 'undefined') {
    return;
  }
  
  // In a real implementation, this would:
  // 1. Find elements with data-coherent-event attributes
  // 2. Attach appropriate event listeners
  // 3. Bind event handlers to component methods
  
  console.log('Enabling client-side events on:', rootElement);
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
      componentName: component.name,
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
