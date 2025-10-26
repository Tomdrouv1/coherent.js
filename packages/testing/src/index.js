/**
 * Coherent.js Testing Utilities
 * 
 * Complete testing solution for Coherent.js applications
 * 
 * @module testing
 */

// Export test renderer
export {
  renderComponent,
  renderComponentAsync,
  createTestRenderer,
  shallowRender,
  TestRenderer,
  TestRendererResult
} from './test-renderer.js';

// Export test utilities
export {
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
} from './test-utils.js';

// Export matchers
export {
  customMatchers,
  extendExpect,
  assertions
} from './matchers.js';

// Default export with all utilities
export default {
  // Renderer
  renderComponent,
  renderComponentAsync,
  createTestRenderer,
  shallowRender,
  
  // Utilities
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
  userEvent,
  
  // Matchers
  customMatchers,
  extendExpect,
  assertions
};
