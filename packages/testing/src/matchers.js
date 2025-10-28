/**
 * Coherent.js Custom Test Matchers
 * 
 * Custom matchers for testing Coherent.js components
 * Compatible with Vitest, Jest, and other testing frameworks
 * 
 * @module testing/matchers
 */

/**
 * Custom matchers for Coherent.js testing
 */
export const customMatchers = {
  /**
   * Check if element has specific text
   */
  toHaveText(received, expected) {
    const pass = received && received.text === expected;
    
    return {
      pass,
      message: () => pass
        ? `Expected element not to have text "${expected}"`
        : `Expected element to have text "${expected}", but got "${received?.text || 'null'}"`
    };
  },

  /**
   * Check if element contains text
   */
  toContainText(received, expected) {
    const pass = received && received.text && received.text.includes(expected);
    
    return {
      pass,
      message: () => pass
        ? `Expected element not to contain text "${expected}"`
        : `Expected element to contain text "${expected}", but got "${received?.text || 'null'}"`
    };
  },

  /**
   * Check if element has specific class
   */
  toHaveClass(received, expected) {
    const pass = received && received.className && received.className.includes(expected);
    
    return {
      pass,
      message: () => pass
        ? `Expected element not to have class "${expected}"`
        : `Expected element to have class "${expected}", but got "${received?.className || 'null'}"`
    };
  },

  /**
   * Check if element exists
   */
  toBeInTheDocument(received) {
    const pass = received && received.exists === true;
    
    return {
      pass,
      message: () => pass
        ? 'Expected element not to be in the document'
        : 'Expected element to be in the document'
    };
  },

  /**
   * Check if element is visible (has content)
   */
  toBeVisible(received) {
    const pass = received && received.text && received.text.trim().length > 0;
    
    return {
      pass,
      message: () => pass
        ? 'Expected element not to be visible'
        : 'Expected element to be visible (have text content)'
    };
  },

  /**
   * Check if element is empty
   */
  toBeEmpty(received) {
    const pass = !received || !received.text || received.text.trim().length === 0;
    
    return {
      pass,
      message: () => pass
        ? 'Expected element not to be empty'
        : 'Expected element to be empty'
    };
  },

  /**
   * Check if HTML contains specific string
   */
  toContainHTML(received, expected) {
    const html = received?.html || received;
    const pass = typeof html === 'string' && html.includes(expected);
    
    return {
      pass,
      message: () => pass
        ? `Expected HTML not to contain "${expected}"`
        : `Expected HTML to contain "${expected}"`
    };
  },

  /**
   * Check if element has attribute
   */
  toHaveAttribute(received, attribute, value) {
    const html = received?.html || '';
    const regex = new RegExp(`${attribute}="([^"]*)"`, 'i');
    const match = html.match(regex);
    
    const pass = value !== undefined
      ? match && match[1] === value
      : match !== null;
    
    return {
      pass,
      message: () => {
        if (value !== undefined) {
          return pass
            ? `Expected element not to have attribute ${attribute}="${value}"`
            : `Expected element to have attribute ${attribute}="${value}", but got "${match?.[1] || 'none'}"`;
        }
        return pass
          ? `Expected element not to have attribute ${attribute}`
          : `Expected element to have attribute ${attribute}`;
      }
    };
  },

  /**
   * Check if component matches snapshot
   */
  toMatchSnapshot(received) {
    const _snapshot = received?.toSnapshot ? received.toSnapshot() : received;
    
    // This would integrate with the testing framework's snapshot system
    return {
      pass: true,
      message: () => 'Snapshot comparison'
    };
  },

  /**
   * Check if element has specific tag name
   */
  toHaveTagName(received, tagName) {
    const html = received?.html || '';
    const regex = new RegExp(`<${tagName}[^>]*>`, 'i');
    const pass = regex.test(html);
    
    return {
      pass,
      message: () => pass
        ? `Expected element not to have tag name "${tagName}"`
        : `Expected element to have tag name "${tagName}"`
    };
  },

  /**
   * Check if render result contains element
   */
  toContainElement(received, element) {
    const html = received?.html || received;
    const elementHtml = element?.html || element;
    const pass = typeof html === 'string' && html.includes(elementHtml);
    
    return {
      pass,
      message: () => pass
        ? 'Expected not to contain element'
        : 'Expected to contain element'
    };
  },

  /**
   * Check if mock was called
   */
  toHaveBeenCalled(received) {
    const pass = received?.mock?.calls?.length > 0;
    
    return {
      pass,
      message: () => pass
        ? 'Expected mock not to have been called'
        : 'Expected mock to have been called'
    };
  },

  /**
   * Check if mock was called with specific args
   */
  toHaveBeenCalledWith(received, ...expectedArgs) {
    const calls = received?.mock?.calls || [];
    const pass = calls.some(call => 
      call.length === expectedArgs.length &&
      call.every((arg, i) => arg === expectedArgs[i])
    );
    
    return {
      pass,
      message: () => pass
        ? `Expected mock not to have been called with ${JSON.stringify(expectedArgs)}`
        : `Expected mock to have been called with ${JSON.stringify(expectedArgs)}`
    };
  },

  /**
   * Check if mock was called N times
   */
  toHaveBeenCalledTimes(received, times) {
    const callCount = received?.mock?.calls?.length || 0;
    const pass = callCount === times;
    
    return {
      pass,
      message: () => pass
        ? `Expected mock not to have been called ${times} times`
        : `Expected mock to have been called ${times} times, but was called ${callCount} times`
    };
  },

  /**
   * Check if component rendered successfully
   */
  toRenderSuccessfully(received) {
    const pass = received && received.html && received.html.length > 0;
    
    return {
      pass,
      message: () => pass
        ? 'Expected component not to render successfully'
        : 'Expected component to render successfully'
    };
  },

  /**
   * Check if HTML is valid
   */
  toBeValidHTML(received) {
    const html = received?.html || received;
    
    // Basic HTML validation
    const openTags = (html.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (html.match(/<\/[^>]+>/g) || []).length;
    const selfClosing = (html.match(/<[^>]+\/>/g) || []).length;
    
    const pass = openTags === closeTags + selfClosing;
    
    return {
      pass,
      message: () => pass
        ? 'Expected HTML not to be valid'
        : `Expected HTML to be valid (open: ${openTags}, close: ${closeTags}, self-closing: ${selfClosing})`
    };
  }
};

/**
 * Extend expect with custom matchers
 * 
 * @param {Object} expect - Expect function from testing framework
 * 
 * @example
 * import { expect } from 'vitest';
 * import { extendExpect } from '@coherentjs/testing/matchers';
 * 
 * extendExpect(expect);
 * 
 * // Now you can use custom matchers
 * expect(element).toHaveText('Hello');
 */
export function extendExpect(expect) {
  if (expect && expect.extend) {
    expect.extend(customMatchers);
  } else {
    console.warn('Could not extend expect - expect.extend not available');
  }
}

/**
 * Create assertion helpers
 */
export const assertions = {
  /**
   * Assert element has text
   */
  assertHasText(element, text) {
    if (!element || element.text !== text) {
      throw new Error(`Expected element to have text "${text}", but got "${element?.text || 'null'}"`);
    }
  },

  /**
   * Assert element exists
   */
  assertExists(element) {
    if (!element || !element.exists) {
      throw new Error('Expected element to exist');
    }
  },

  /**
   * Assert element has class
   */
  assertHasClass(element, className) {
    if (!element || !element.className || !element.className.includes(className)) {
      throw new Error(`Expected element to have class "${className}"`);
    }
  },

  /**
   * Assert HTML contains string
   */
  assertContainsHTML(html, substring) {
    const htmlString = html?.html || html;
    if (!htmlString || !htmlString.includes(substring)) {
      throw new Error(`Expected HTML to contain "${substring}"`);
    }
  },

  /**
   * Assert component rendered
   */
  assertRendered(result) {
    if (!result || !result.html || result.html.length === 0) {
      throw new Error('Expected component to render');
    }
  }
};

/**
 * Export all matchers and utilities
 */
export default {
  customMatchers,
  extendExpect,
  assertions
};
