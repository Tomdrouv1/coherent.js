/**
 * Coherent.js Test Utilities
 * 
 * Helper functions for testing Coherent.js components
 * 
 * @module testing/test-utils
 */

/**
 * Simulate an event on an element
 * 
 * @param {Object} element - Element to fire event on
 * @param {string} eventType - Type of event (click, change, etc.)
 * @param {Object} [eventData] - Additional event data
 */
export function fireEvent(element, eventType, eventData = {}) {
  if (!element) {
    throw new Error('Element is required for fireEvent');
  }
  
  // In a test environment, we simulate the event
  const event = {
    type: eventType,
    target: element,
    currentTarget: element,
    preventDefault: () => {},
    stopPropagation: () => {},
    ...eventData
  };
  
  // If element has an event handler, call it
  const handlerName = `on${eventType}`;
  if (element[handlerName] && typeof element[handlerName] === 'function') {
    element[handlerName](event);
  }
  
  return event;
}

/**
 * Common event helpers
 */
export const fireEvent_click = (element, eventData) => 
  fireEvent(element, 'click', eventData);

export const fireEvent_change = (element, value) => 
  fireEvent(element, 'change', { target: { value } });

export const fireEvent_input = (element, value) => 
  fireEvent(element, 'input', { target: { value } });

export const fireEvent_submit = (element, eventData) => 
  fireEvent(element, 'submit', eventData);

export const fireEvent_keyDown = (element, key) => 
  fireEvent(element, 'keydown', { key });

export const fireEvent_keyUp = (element, key) => 
  fireEvent(element, 'keyup', { key });

export const fireEvent_focus = (element) => 
  fireEvent(element, 'focus');

export const fireEvent_blur = (element) => 
  fireEvent(element, 'blur');

/**
 * Wait for a condition to be true
 * 
 * @param {Function} condition - Condition function
 * @param {Object} [options] - Wait options
 * @param {number} [options.timeout=1000] - Timeout in ms
 * @param {number} [options.interval=50] - Check interval in ms
 * @returns {Promise<void>}
 * 
 * @example
 * await waitFor(() => getByText('Loaded').exists, { timeout: 2000 });
 */
export function waitFor(condition, options = {}) {
  const { timeout = 1000, interval = 50 } = options;
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      try {
        if (condition()) {
          resolve();
          return;
        }
      } catch (error) {
        // Condition threw an error, keep waiting
      }
      
      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
        return;
      }
      
      setTimeout(check, interval);
    };
    
    check();
  });
}

/**
 * Wait for element to appear
 * 
 * @param {Function} queryFn - Query function that returns element
 * @param {Object} [options] - Wait options
 * @returns {Promise<Object>} Element
 */
export async function waitForElement(queryFn, options = {}) {
  let element = null;
  
  await waitFor(() => {
    element = queryFn();
    return element !== null;
  }, options);
  
  return element;
}

/**
 * Wait for element to disappear
 * 
 * @param {Function} queryFn - Query function that returns element
 * @param {Object} [options] - Wait options
 * @returns {Promise<void>}
 */
export async function waitForElementToBeRemoved(queryFn, options = {}) {
  await waitFor(() => {
    const element = queryFn();
    return element === null;
  }, options);
}

/**
 * Act utility for batching updates
 * Useful for testing state changes
 * 
 * @param {Function} callback - Callback to execute
 * @returns {Promise<void>}
 */
export async function act(callback) {
  await callback();
  // Allow any pending updates to flush
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Create a mock function
 * 
 * @param {Function} [implementation] - Optional implementation
 * @returns {Function} Mock function
 */
export function createMock(implementation) {
  const calls = [];
  const results = [];
  
  const mockFn = function(...args) {
    calls.push(args);
    
    let result;
    let error;
    
    try {
      result = implementation ? implementation(...args) : undefined;
      results.push({ type: 'return', value: result });
    } catch (err) {
      error = err;
      results.push({ type: 'throw', value: error });
      throw error;
    }
    
    return result;
  };
  
  // Add mock utilities
  mockFn.mock = {
    calls,
    results,
    instances: []
  };
  
  mockFn.mockClear = () => {
    calls.length = 0;
    results.length = 0;
  };
  
  mockFn.mockReset = () => {
    mockFn.mockClear();
    implementation = undefined;
  };
  
  mockFn.mockImplementation = (fn) => {
    implementation = fn;
    return mockFn;
  };
  
  mockFn.mockReturnValue = (value) => {
    implementation = () => value;
    return mockFn;
  };
  
  mockFn.mockResolvedValue = (value) => {
    implementation = () => Promise.resolve(value);
    return mockFn;
  };
  
  mockFn.mockRejectedValue = (error) => {
    implementation = () => Promise.reject(error);
    return mockFn;
  };
  
  return mockFn;
}

/**
 * Create a spy on an object method
 * 
 * @param {Object} object - Object to spy on
 * @param {string} method - Method name
 * @returns {Function} Spy function
 */
export function createSpy(object, method) {
  const original = object[method];
  const spy = createMock(original.bind(object));
  
  object[method] = spy;
  
  spy.mockRestore = () => {
    object[method] = original;
  };
  
  return spy;
}

/**
 * Cleanup utility
 * Cleans up after tests
 */
export function cleanup() {
  // Clear any timers
  // Reset any global state
  // This would be expanded based on framework needs
}

/**
 * Within utility - scopes queries to a container
 * 
 * @param {Object} container - Container result
 * @returns {Object} Scoped queries
 */
export function within(container) {
  return {
    getByTestId: (testId) => container.getByTestId(testId),
    queryByTestId: (testId) => container.queryByTestId(testId),
    getByText: (text) => container.getByText(text),
    queryByText: (text) => container.queryByText(text),
    getByClassName: (className) => container.getByClassName(className),
    queryByClassName: (className) => container.queryByClassName(className)
  };
}

/**
 * Screen utility - global queries
 * Useful for accessing rendered content without storing result
 */
export const screen = {
  _result: null,
  
  setResult(result) {
    this._result = result;
  },
  
  getByTestId(testId) {
    if (!this._result) throw new Error('No component rendered');
    return this._result.getByTestId(testId);
  },
  
  queryByTestId(testId) {
    if (!this._result) return null;
    return this._result.queryByTestId(testId);
  },
  
  getByText(text) {
    if (!this._result) throw new Error('No component rendered');
    return this._result.getByText(text);
  },
  
  queryByText(text) {
    if (!this._result) return null;
    return this._result.queryByText(text);
  },
  
  getByClassName(className) {
    if (!this._result) throw new Error('No component rendered');
    return this._result.getByClassName(className);
  },
  
  queryByClassName(className) {
    if (!this._result) return null;
    return this._result.queryByClassName(className);
  },
  
  debug() {
    if (this._result) {
      this._result.debug();
    }
  }
};

/**
 * User event simulation
 * More realistic event simulation than fireEvent
 */
export const userEvent = {
  /**
   * Simulate user typing
   */
  type: async (element, text, options = {}) => {
    const { delay = 0 } = options;
    
    for (const char of text) {
      fireEvent_keyDown(element, char);
      fireEvent_input(element, element.value + char);
      fireEvent_keyUp(element, char);
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },
  
  /**
   * Simulate user click
   */
  click: async (element) => {
    fireEvent_focus(element);
    fireEvent_click(element);
  },
  
  /**
   * Simulate user double click
   */
  dblClick: async (element) => {
    await userEvent.click(element);
    await userEvent.click(element);
  },
  
  /**
   * Simulate user clearing input
   */
  clear: async (element) => {
    fireEvent_input(element, '');
    fireEvent_change(element, '');
  },
  
  /**
   * Simulate user selecting option
   */
  selectOptions: async (element, values) => {
    const valueArray = Array.isArray(values) ? values : [values];
    fireEvent_change(element, valueArray[0]);
  },
  
  /**
   * Simulate user tab navigation
   */
  tab: async () => {
    // Simulate tab key
    const activeElement = document.activeElement;
    if (activeElement) {
      fireEvent_keyDown(activeElement, 'Tab');
      fireEvent_blur(activeElement);
    }
  }
};

/**
 * Export all utilities
 */
export default {
  fireEvent,
  waitFor,
  waitForElement,
  waitForElementToBeRemoved,
  act,
  createMock,
  createSpy,
  cleanup,
  within,
  screen,
  userEvent
};
