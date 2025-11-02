/**
 * Coherent.js Test Renderer
 * 
 * Provides utilities for rendering and testing Coherent.js components
 * in a test environment.
 * 
 * @module testing/test-renderer
 */

import { render } from '@coherentjs/core';

/**
 * Test renderer result
 * Provides methods to query and interact with rendered components
 */
export class TestRendererResult {
  constructor(component, html, container = null) {
    this.component = component;
    this.html = html;
    this.container = container;
    this.queries = new Map();
  }

  /**
   * Get element by test ID
   * @param {string} testId - Test ID to search for
   * @returns {Object|null} Element or null
   */
  getByTestId(testId) {
    const regex = new RegExp(`data-testid="${testId}"[^>]*>([^<]*)<`, 'i');
    const match = this.html.match(regex);
    
    if (!match) {
      throw new Error(`Unable to find element with testId: ${testId}`);
    }
    
    return {
      text: match[1],
      html: match[0],
      testId,
      exists: true
    };
  }

  /**
   * Query element by test ID (returns null if not found)
   * @param {string} testId - Test ID to search for
   * @returns {Object|null} Element or null
   */
  queryByTestId(testId) {
    try {
      return this.getByTestId(testId);
    } catch {
      return null;
    }
  }

  /**
   * Get element by text content
   * @param {string|RegExp} text - Text to search for
   * @returns {Object} Element
   */
  getByText(text) {
    const regex = typeof text === 'string' 
      ? new RegExp(`>([^<]*${text}[^<]*)<`, 'i')
      : new RegExp(`>([^<]*)<`, 'i');
    
    const match = this.html.match(regex);
    
    if (!match || (typeof text === 'string' && !match[1].includes(text))) {
      throw new Error(`Unable to find element with text: ${text}`);
    }
    
    return {
      text: match[1],
      html: match[0],
      exists: true
    };
  }

  /**
   * Query element by text (returns null if not found)
   * @param {string|RegExp} text - Text to search for
   * @returns {Object|null} Element or null
   */
  queryByText(text) {
    try {
      return this.getByText(text);
    } catch {
      return null;
    }
  }

  /**
   * Get element by class name
   * @param {string} className - Class name to search for
   * @returns {Object} Element
   */
  getByClassName(className) {
    const regex = new RegExp(`class="[^"]*${className}[^"]*"[^>]*>([^<]*)<`, 'i');
    const match = this.html.match(regex);
    
    if (!match) {
      throw new Error(`Unable to find element with className: ${className}`);
    }
    
    return {
      text: match[1],
      html: match[0],
      className,
      exists: true
    };
  }

  /**
   * Query element by class name (returns null if not found)
   * @param {string} className - Class name to search for
   * @returns {Object|null} Element or null
   */
  queryByClassName(className) {
    try {
      return this.getByClassName(className);
    } catch {
      return null;
    }
  }

  /**
   * Get all elements by tag name
   * @param {string} tagName - Tag name to search for
   * @returns {Array<Object>} Array of elements
   */
  getAllByTagName(tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'gi');
    const matches = [...this.html.matchAll(regex)];
    
    return matches.map(match => ({
      text: match[1],
      html: match[0],
      tagName,
      exists: true
    }));
  }

  /**
   * Check if element exists
   * @param {string} selector - Selector (testId, text, className)
   * @param {string} type - Type of selector ('testId', 'text', 'className')
   * @returns {boolean} True if exists
   */
  exists(selector, type = 'testId') {
    switch (type) {
      case 'testId':
        return this.queryByTestId(selector) !== null;
      case 'text':
        return this.queryByText(selector) !== null;
      case 'className':
        return this.queryByClassName(selector) !== null;
      default:
        return false;
    }
  }

  /**
   * Get the rendered HTML
   * @returns {string} HTML string
   */
  getHTML() {
    return this.html;
  }

  /**
   * Get the component
   * @returns {Object} Component object
   */
  getComponent() {
    return this.component;
  }

  /**
   * Create a snapshot of the rendered output
   * @returns {string} Formatted HTML for snapshot testing
   */
  toSnapshot() {
    return this.html
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .trim();
  }

  /**
   * Debug: print the rendered HTML
   */
  debug() {
    console.log('=== Rendered HTML ===');
    console.log(this.html);
    console.log('=== Component ===');
    console.log(JSON.stringify(this.component, null, 2));
  }
}

/**
 * Render a component for testing
 * 
 * @param {Object} component - Component to render
 * @param {Object} [options] - Render options
 * @returns {TestRendererResult} Test renderer result
 * 
 * @example
 * const { getByTestId } = renderComponent({
 *   div: {
 *     'data-testid': 'my-div',
 *     text: 'Hello World'
 *   }
 * });
 * 
 * expect(getByTestId('my-div').text).toBe('Hello World');
 */
export function renderComponent(component, options = {}) {
  const html = render(component, options);
  return new TestRendererResult(component, html);
}

/**
 * Render a component asynchronously
 * 
 * @param {Object|Function} component - Component or component factory
 * @param {Object} [props] - Component props
 * @param {Object} [options] - Render options
 * @returns {Promise<TestRendererResult>} Test renderer result
 */
export async function renderComponentAsync(component, props = {}, options = {}) {
  // If component is a function, call it with props
  const resolvedComponent = typeof component === 'function' 
    ? await component(props)
    : component;
  
  const html = render(resolvedComponent, options);
  return new TestRendererResult(resolvedComponent, html);
}

/**
 * Create a test renderer instance
 * Useful for testing component updates
 */
export class TestRenderer {
  constructor(component, options = {}) {
    this.component = component;
    this.options = options;
    this.result = null;
    this.renderCount = 0;
  }

  /**
   * Render the component
   * @returns {TestRendererResult} Render result
   */
  render() {
    this.renderCount++;
    const html = render(this.component, this.options);
    this.result = new TestRendererResult(this.component, html);
    return this.result;
  }

  /**
   * Update the component and re-render
   * @param {Object} newComponent - Updated component
   * @returns {TestRendererResult} Render result
   */
  update(newComponent) {
    this.component = newComponent;
    return this.render();
  }

  /**
   * Get the current result
   * @returns {TestRendererResult|null} Current result
   */
  getResult() {
    return this.result;
  }

  /**
   * Get render count
   * @returns {number} Number of renders
   */
  getRenderCount() {
    return this.renderCount;
  }

  /**
   * Unmount the component
   */
  unmount() {
    this.component = null;
    this.result = null;
  }
}

/**
 * Create a test renderer
 * 
 * @param {Object} component - Component to render
 * @param {Object} [options] - Render options
 * @returns {TestRenderer} Test renderer instance
 * 
 * @example
 * const renderer = createTestRenderer(MyComponent);
 * const result = renderer.render();
 * expect(result.getByText('Hello')).toBeTruthy();
 * 
 * // Update and re-render
 * renderer.update(UpdatedComponent);
 * expect(renderer.getRenderCount()).toBe(2);
 */
export function createTestRenderer(component, options = {}) {
  return new TestRenderer(component, options);
}

/**
 * Shallow render a component (only render top level)
 * 
 * @param {Object} component - Component to render
 * @returns {Object} Shallow rendered component
 */
export function shallowRender(component) {
  // Clone component without rendering children
  const shallow = { ...component };
  
  Object.keys(shallow).forEach(key => {
    if (shallow[key] && typeof shallow[key] === 'object') {
      if (shallow[key].children) {
        shallow[key] = {
          ...shallow[key],
          children: Array.isArray(shallow[key].children)
            ? shallow[key].children.map(() => ({ _shallow: true }))
            : { _shallow: true }
        };
      }
    }
  });
  
  return shallow;
}

/**
 * Export all testing utilities
 */
export default {
  renderComponent,
  renderComponentAsync,
  createTestRenderer,
  shallowRender,
  TestRenderer,
  TestRendererResult
};
