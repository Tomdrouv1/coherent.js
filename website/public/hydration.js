/**
 * Client-side hydration for Coherent.js website
 * Handles data-action attributes and makes interactive components work
 */

console.log('🌊 Coherent.js Hydration starting...');

// Initialize global registries for Coherent.js
window.__coherentEventRegistry = window.__coherentEventRegistry || {};
window.__coherentActionRegistry = window.__coherentActionRegistry || {};

/**
 * Map button IDs to their corresponding functions for the performance page
 */
function setupPerformancePageHandlers() {
  console.log('🎯 Setting up performance page handlers...');
  
  const buttonMappings = [
    { id: 'run-all-tests', handler: 'runPerformanceTests' },
    { id: 'run-render-test', handler: 'runRenderingTest' },
    { id: 'run-cache-test', handler: 'runCacheTest' },
    { id: 'clear-results', handler: 'clearResults' }
  ];

  buttonMappings.forEach(mapping => {
    const button = document.getElementById(mapping.id);
    console.log(`Looking for button ${mapping.id}:`, button ? 'found' : 'not found');
    console.log(`Looking for handler ${mapping.handler}:`, typeof window[mapping.handler]);
    
    if (button && window[mapping.handler]) {
      // Remove data-action attributes to prevent conflicts
      button.removeAttribute('data-action');
      button.removeAttribute('data-event');
      
      // Remove existing listeners to avoid duplicates
      const existingHandler = button.__coherentHandler;
      if (existingHandler) {
        button.removeEventListener('click', existingHandler);
        console.log(`🧹 Removed existing handler from ${mapping.id}`);
      }

      // Create new handler
      const handler = (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          console.log(`🎯 Button ${mapping.id} clicked - calling ${mapping.handler}()`);
          window[mapping.handler]();
        } catch (error) {
          console.error(`Error in ${mapping.handler}:`, error);
        }
      };

      // Attach the handler with capture to ensure it runs first
      button.addEventListener('click', handler, true);
      button.__coherentHandler = handler;
      
      console.log(`✅ Successfully connected button ${mapping.id} to ${mapping.handler}`);
    } else {
      if (!button) console.warn(`⚠️ Button not found: ${mapping.id}`);
      if (!window[mapping.handler]) console.warn(`⚠️ Handler not found: ${mapping.handler}`);
    }
  });
}

/**
 * Process data-action attributes and attach event listeners
 */
function hydratePage() {
  // First try the direct approach for performance page
  if (document.querySelector('[data-coherent-component="performance"]')) {
    console.log('🎯 Setting up performance page handlers directly...');
    setupPerformancePageHandlers();
  }
  
  // Also process any data-action attributes
  const actionElements = document.querySelectorAll('[data-action]');
  
  console.log(`🔍 Found ${actionElements.length} elements with data-action attributes`);
  console.log('Action registry keys:', Object.keys(window.__coherentActionRegistry));
  
  actionElements.forEach(element => {
    const actionId = element.getAttribute('data-action');
    const eventType = element.getAttribute('data-event') || 'click';
    
    if (actionId && window.__coherentActionRegistry[actionId]) {
      const handler = window.__coherentActionRegistry[actionId];
      
      if (typeof handler === 'function') {
        // Remove existing event listener to avoid duplicates
        const handlerKey = `__hydrated_${eventType}`;
        if (element[handlerKey]) {
          element.removeEventListener(eventType, element[handlerKey]);
        }
        
        // Create wrapper that provides proper context
        const wrappedHandler = (event) => {
          try {
            console.log(`🎯 Executing action ${actionId}`);
            
            // Call the original handler
            handler.call(element, event);
          } catch (error) {
            console.error('Error in action handler:', error);
          }
        };
        
        // Attach the event listener
        element.addEventListener(eventType, wrappedHandler);
        element[handlerKey] = wrappedHandler;
        
        console.log(`✅ Attached ${eventType} handler for action ${actionId}`);
      }
    } else {
      console.warn(`⚠️ No handler found for action ${actionId} in registry with keys:`, Object.keys(window.__coherentActionRegistry));
    }
  });
}

/**
 * Initialize hydration when DOM is ready
 */
function initHydration() {
  const performHydration = () => {
    console.log('🌊 Starting hydration...');
    console.log('Performance functions available:', {
      runPerformanceTests: typeof window.runPerformanceTests,
      runRenderingTest: typeof window.runRenderingTest,
      runCacheTest: typeof window.runCacheTest,
      clearResults: typeof window.clearResults
    });
    
    hydratePage();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait a bit more for deferred scripts to load
      setTimeout(performHydration, 100);
    });
  } else {
    // Wait a bit for deferred scripts if page is already loaded
    setTimeout(performHydration, 100);
  }
}

// Start hydration
initHydration();

console.log('🌊 Coherent.js Hydration script loaded');