/**
 * Next.js integration for Coherent.js
 * Provides utilities for using Coherent.js with Next.js
 */

import { renderToString } from '../../core/src/index.js';
import { performanceMonitor } from '../../core/src/performance/monitor.js';
import { importPeerDependency } from '../../core/src/utils/dependency-utils.js';

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
  const {
    enablePerformanceMonitoring = false,
    template = '<!DOCTYPE html>\n{{content}}'
  } = options;
  
  return async (req, res) => {
    try {
      // Create component with request data
      const component = await Promise.resolve(
        componentFactory(req, res)
      );
      
      if (!component) {
        res.status(500).json({ error: 'Component factory returned null/undefined' });
        return;
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
      
      // Apply template
      const finalHtml = template.replace('{{content}}', html);
      
      // Send HTML response
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(finalHtml);
    } catch (error) {
      console.error('Coherent.js Next.js handler error:', error);
      res.status(500).json({ error: error.message });
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
  const {
    enablePerformanceMonitoring = false,
    template = '<!DOCTYPE html>\n{{content}}'
  } = options;
  
  return async function handler(request) {
    try {
      // Create component with request data
      const component = await Promise.resolve(
        componentFactory(request)
      );
      
      if (!component) {
        return new Response(
          JSON.stringify({ error: 'Component factory returned null/undefined' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
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
      
      // Apply template
      const finalHtml = template.replace('{{content}}', html);
      
      // Send HTML response
      return new Response(finalHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } catch (error) {
      console.error('Coherent.js Next.js App Router handler error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
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
  } catch (error) {
    throw new Error(
      `Next.js Server Component integration requires React. ${  error.message}`
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
    } catch (error) {
      console.error('Coherent.js Next.js Server Component error:', error);
      return React.default.createElement('div', null, `Error: ${error.message}`);
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
  } catch (error) {
    throw new Error(
      `Next.js Client Component integration requires React. ${  error.message}`
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
        } catch (error) {
          console.error('Coherent.js Next.js Client Component error:', error);
          setHtml(`Error: ${error.message}`);
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
  } catch (error) {
    throw error;
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
