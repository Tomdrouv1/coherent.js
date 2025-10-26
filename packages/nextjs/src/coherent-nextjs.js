/**
 * Next.js integration for Coherent.js
 * Provides utilities for using Coherent.js with Next.js
 */

import { renderToString } from '../../core/src/index.js';
import { importPeerDependency } from '../../core/src/utils/dependency-utils.js';
import { 
  renderWithTemplate, 
  renderComponentFactory
} from '../../core/src/utils/render-utils.js';

/**
 * Create a Next.js API route handler for Coherent.js components
 * 
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @param {boolean} options.enablePerformanceMonitoring - Enable performance monitoring
 * @param {string} options.template - HTML template with {{content}} placeholder
 * @returns {Function} Next.js API route handler
 */
export function createCoherentNextHandler(componentFactory, options = {}) {
  return async (req, res) => {
    try {
      // Use shared rendering utility
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [req, res],
        options
      );
      
      // Send HTML response
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(finalHtml);
    } catch (_error) {
      console.error('Coherent.js Next.js handler _error:', _error);
      res.status(500).json({ _error: _error.message });
    }
  };
}

/**
 * Create a Next.js App Router route handler for Coherent.js components
 * 
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Handler options
 * @returns {Function} Next.js App Router route handler
 */
export function createCoherentAppRouterHandler(componentFactory, options = {}) {
  return async function handler(request) {
    try {
      // Use shared rendering utility
      const finalHtml = await renderComponentFactory(
        componentFactory,
        [request],
        options
      );
      
      // Send HTML response
      return new Response(finalHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } catch (_error) {
      console.error('Coherent.js Next.js App Router handler _error:', _error);
      return new Response(
        JSON.stringify({ _error: _error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

/**
 * Create a Next.js Server Component for Coherent.js
 * 
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Component options
 * @returns {Function} Next.js Server Component
 */
export async function createCoherentServerComponent(componentFactory, options = {}) {
  const {
    enablePerformanceMonitoring = false
  } = options;
  
  // Import React using dependency utilities
  let React;
  try {
    React = await importPeerDependency('react', 'React');
  } catch (_error) {
    throw new Error(
      `Next.js Server Component integration requires React. ${  _error.message}`
    );
  }
  
  return async function CoherentServerComponent(props) {
    try {
      // Create component with props
      const component = await Promise.resolve(
        componentFactory(props)
      );
      
      if (!component) {
        return React.default.createElement('div', null, 'Error: Component factory returned null/undefined');
      }
      
      // Render component
      let html;
      if (enablePerformanceMonitoring) {
        const renderId = performanceMonitor.startRender();
        html = renderToString(component);
        performanceMonitor.endRender(renderId);
      } else {
        html = renderToString(component);
      }
      
      // Return dangerouslySetInnerHTML to render HTML
      return React.default.createElement('div', {
        dangerouslySetInnerHTML: { __html: html }
      });
    } catch (_error) {
      console.error('Coherent.js Next.js Server Component _error:', _error);
      return React.default.createElement('div', null, `Error: ${_error.message}`);
    }
  };
}

/**
 * Create a Next.js Client Component for Coherent.js with hydration support
 * 
 * @param {Function} componentFactory - Function that returns a Coherent.js component
 * @param {Object} options - Component options
 * @returns {Function} Next.js Client Component
 */
export async function createCoherentClientComponent(componentFactory, options = {}) {
  const {
    enablePerformanceMonitoring = false
  } = options;
  
  // Import React using dependency utilities
  let React;
  try {
    React = await importPeerDependency('react', 'React');
  } catch (_error) {
    throw new Error(
      `Next.js Client Component integration requires React. ${  _error.message}`
    );
  }
  
  return function CoherentClientComponent(props) {
    const [html, setHtml] = React.useState('');
    
    React.useEffect(() => {
      async function renderComponent() {
        try {
          // Create component with props
          const component = await Promise.resolve(
            componentFactory(props)
          );
          
          if (!component) {
            setHtml('Error: Component factory returned null/undefined');
            return;
          }
          
          // Render component
          let renderedHtml;
          if (enablePerformanceMonitoring) {
            const renderId = performanceMonitor.startRender();
            renderedHtml = renderToString(component);
            performanceMonitor.endRender(renderId);
          } else {
            renderedHtml = renderToString(component);
          }
          
          setHtml(renderedHtml);
        } catch (_error) {
          console.error('Coherent.js Next.js Client Component _error:', _error);
          setHtml(`Error: ${_error.message}`);
        }
      }
      
      renderComponent();
    }, [props]);
    
    return React.createElement('div', {
      dangerouslySetInnerHTML: { __html: html }
    });
  };
}

/**
 * Create Next.js integration with dependency checking
 * This function ensures Next.js and React are available before setting up the integration
 * 
 * @param {Object} options - Setup options
 * @returns {Promise<Object>} - Object with Next.js integration utilities
 */
export async function createNextIntegration(options = {}) {
  try {
    // Verify Next.js and React are available
    await importPeerDependency('next', 'Next.js');
    await importPeerDependency('react', 'React');
    
    return {
      createCoherentNextHandler: (componentFactory, handlerOptions = {}) => 
        createCoherentNextHandler(componentFactory, { ...options, ...handlerOptions }),
      createCoherentAppRouterHandler: (componentFactory, handlerOptions = {}) => 
        createCoherentAppRouterHandler(componentFactory, { ...options, ...handlerOptions }),
      createCoherentServerComponent: (componentFactory, componentOptions = {}) => 
        createCoherentServerComponent(componentFactory, { ...options, ...componentOptions }),
      createCoherentClientComponent: (componentFactory, componentOptions = {}) => 
        createCoherentClientComponent(componentFactory, { ...options, ...componentOptions })
    };
  } catch (_error) {
    throw _error;
  }
}

// Export all utilities
export default {
  createCoherentNextHandler,
  createCoherentAppRouterHandler,
  createCoherentServerComponent,
  createCoherentClientComponent,
  createNextIntegration
};
