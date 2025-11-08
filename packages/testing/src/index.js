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

// Re-import for default export
import {
  renderComponent as _renderComponent,
  renderComponentAsync as _renderComponentAsync,
  createTestRenderer as _createTestRenderer,
  shallowRender as _shallowRender
} from './test-renderer.js';

import {
  fireEvent as _fireEvent,
  waitFor as _waitFor,
  waitForElement as _waitForElement,
  waitForElementToBeRemoved as _waitForElementToBeRemoved,
  act as _act,
  createMock as _createMock,
  createSpy as _createSpy,
  cleanup as _cleanup,
  within as _within,
  screen as _screen,
  userEvent as _userEvent
} from './test-utils.js';

import {
  customMatchers as _customMatchers,
  extendExpect as _extendExpect,
  assertions as _assertions
} from './matchers.js';

// Default export with all utilities
export default {
  // Renderer
  renderComponent: _renderComponent,
  renderComponentAsync: _renderComponentAsync,
  createTestRenderer: _createTestRenderer,
  shallowRender: _shallowRender,

  // Utilities
  fireEvent: _fireEvent,
  waitFor: _waitFor,
  waitForElement: _waitForElement,
  waitForElementToBeRemoved: _waitForElementToBeRemoved,
  act: _act,
  createMock: _createMock,
  createSpy: _createSpy,
  cleanup: _cleanup,
  within: _within,
  screen: _screen,
  userEvent: _userEvent,

  // Matchers
  customMatchers: _customMatchers,
  extendExpect: _extendExpect,
  assertions: _assertions
};
