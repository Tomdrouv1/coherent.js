/**
 * Coherent.js Testing Utilities TypeScript Definitions
 * @module @coherent.js/testing
 */

import type { CoherentNode, CoherentElement, CoherentComponent, ComponentProps } from '@coherent.js/core';

// ============================================================================
// Test Renderer Types
// ============================================================================

/**
 * Render options for test utilities
 */
export interface RenderOptions {
  /** Wrapper component */
  wrapper?: CoherentComponent;
  /** Context values to provide */
  context?: Record<string, unknown>;
  /** Props to pass to component */
  props?: Record<string, unknown>;
  /** Initial state */
  initialState?: Record<string, unknown>;
}

/**
 * Result from rendering a component
 */
export interface RenderResult {
  /** Rendered HTML string */
  html: string;
  /** The rendered element structure */
  element: CoherentElement;
  /** Container element (if DOM is available) */
  container: HTMLElement | null;
  /** Re-render with new props */
  rerender(props?: Record<string, unknown>): void;
  /** Unmount and cleanup */
  unmount(): void;
  /** Debug output */
  debug(): void;
  /** Query helpers */
  getByText(text: string | RegExp): Element | null;
  getByTestId(testId: string): Element | null;
  getAllByText(text: string | RegExp): Element[];
}

/**
 * Test renderer class
 */
export class TestRenderer {
  /** Render a component */
  render(component: CoherentNode, options?: RenderOptions): RenderResult;

  /** Render a component asynchronously */
  renderAsync(component: CoherentNode, options?: RenderOptions): Promise<RenderResult>;

  /** Shallow render (no children) */
  shallow(component: CoherentNode): RenderResult;

  /** Cleanup all renders */
  cleanup(): void;
}

/**
 * Render a component for testing
 */
export function renderComponent(
  component: CoherentComponent | CoherentNode,
  props?: Record<string, unknown>
): RenderResult;

/**
 * Render a component asynchronously
 */
export function renderComponentAsync(
  component: CoherentNode,
  options?: RenderOptions
): Promise<RenderResult>;

/**
 * Create a new test renderer instance
 */
export function createTestRenderer(): TestRenderer;

/**
 * Shallow render a component
 */
export function shallowRender(component: CoherentNode): RenderResult;

/**
 * Render a node to HTML string
 */
export function renderToString(node: CoherentNode): string;

// ============================================================================
// Custom Matchers for Coherent.js
// ============================================================================

/**
 * Coherent.js-specific test matchers
 */
export interface CoherentMatchers<R = unknown> {
  // Element structure matchers
  /** Assert element has specific tag name */
  toHaveTag(tagName: string): R;
  /** Assert element contains text */
  toHaveText(text: string): R;
  /** Assert element has attribute (optionally with value) */
  toHaveAttribute(name: string, value?: string): R;
  /** Assert element has CSS class */
  toHaveClassName(className: string): R;
  /** Assert element has children (optionally specific count) */
  toHaveChildren(count?: number): R;

  // Component matchers
  /** Assert component renders an element with tag */
  toRenderElement(tagName: string): R;
  /** Assert component renders text content */
  toRenderText(text: string): R;
  /** Assert component matches snapshot */
  toMatchComponentSnapshot(): R;

  // Hydration matchers
  /** Assert hydration completes without mismatch */
  toHydrateWithoutMismatch(): R;
  /** Assert hydrated component has specific state */
  toHaveState(state: Record<string, unknown>): R;

  // Accessibility matchers
  /** Assert element has accessible name */
  toHaveAccessibleName(name: string): R;
  /** Assert element has ARIA role */
  toHaveRole(role: string): R;
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Event simulation options
 */
export interface EventOptions {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
  [key: string]: unknown;
}

/**
 * Fire DOM events on elements
 */
export const fireEvent: {
  /** Fire any event */
  (element: Element, event: Event): boolean;
  /** Fire click event */
  click(element: Element, options?: EventOptions): boolean;
  /** Fire change event */
  change(element: Element, options?: EventOptions & { target?: { value?: unknown } }): boolean;
  /** Fire input event */
  input(element: Element, options?: EventOptions & { target?: { value?: unknown } }): boolean;
  /** Fire submit event */
  submit(element: Element, options?: EventOptions): boolean;
  /** Fire keydown event */
  keyDown(element: Element, options?: EventOptions & { key?: string; code?: string }): boolean;
  /** Fire keyup event */
  keyUp(element: Element, options?: EventOptions & { key?: string; code?: string }): boolean;
  /** Fire focus event */
  focus(element: Element, options?: EventOptions): boolean;
  /** Fire blur event */
  blur(element: Element, options?: EventOptions): boolean;
  /** Fire mouseenter event */
  mouseEnter(element: Element, options?: EventOptions): boolean;
  /** Fire mouseleave event */
  mouseLeave(element: Element, options?: EventOptions): boolean;
  [key: string]: unknown;
};

/**
 * Wait options
 */
export interface WaitOptions {
  /** Timeout in ms */
  timeout?: number;
  /** Check interval in ms */
  interval?: number;
}

/**
 * Wait for a condition to be true
 */
export function waitFor<T>(
  callback: () => T | Promise<T>,
  options?: WaitOptions
): Promise<T>;

/**
 * Wait for an element to appear
 */
export function waitForElement(selector: string, options?: WaitOptions): Promise<Element>;

/**
 * Wait for an element to be removed
 */
export function waitForElementToBeRemoved(
  selector: string | Element,
  options?: WaitOptions
): Promise<void>;

/**
 * Run a callback and flush pending state updates
 */
export function act<T>(callback: () => T | Promise<T>): Promise<T>;

// ============================================================================
// Mock Utilities
// ============================================================================

/**
 * Mock function interface
 */
export interface Mock<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: Parameters<T>[];
    results: Array<{ type: 'return' | 'throw'; value: unknown }>;
    instances: unknown[];
  };
  mockClear(): void;
  mockReset(): void;
  mockRestore(): void;
  mockImplementation(fn: T): this;
  mockReturnValue(value: ReturnType<T>): this;
  mockReturnValueOnce(value: ReturnType<T>): this;
  mockResolvedValue(value: ReturnType<T> extends Promise<infer U> ? U : never): this;
  mockRejectedValue(error: unknown): this;
}

/**
 * Create a mock function
 */
export function createMock<T extends (...args: unknown[]) => unknown>(
  implementation?: T
): Mock<T>;

/**
 * Create a spy on an object method
 */
export function createSpy<T extends (...args: unknown[]) => unknown>(
  object: object,
  method: string
): Mock<T>;

/**
 * Mock a component
 */
export function mockComponent<P extends ComponentProps = ComponentProps>(
  name: string,
  render?: (props: P) => CoherentNode
): CoherentComponent<P>;

/**
 * Create test state with reset capability
 */
export function createTestState<T extends Record<string, unknown>>(
  initial: T
): {
  getState: () => T;
  setState: (updates: Partial<T>) => void;
  reset: () => void;
};

/**
 * Cleanup all mocks and rendered components
 */
export function cleanup(): void;

// ============================================================================
// Query Utilities
// ============================================================================

/**
 * Query helper interface
 */
export interface Within {
  getByText(text: string | RegExp): Element;
  getByRole(role: string, options?: { name?: string | RegExp }): Element;
  getByLabelText(text: string | RegExp): Element;
  getByPlaceholderText(text: string | RegExp): Element;
  getByTestId(testId: string): Element;
  queryByText(text: string | RegExp): Element | null;
  queryByRole(role: string, options?: { name?: string | RegExp }): Element | null;
  queryAllByText(text: string | RegExp): Element[];
  findByText(text: string | RegExp): Promise<Element>;
  findAllByText(text: string | RegExp): Promise<Element[]>;
}

/**
 * Create query helpers scoped to an element
 */
export function within(element: Element): Within;

/**
 * Global screen queries (document.body)
 */
export const screen: Within;

/**
 * User event simulation
 */
export const userEvent: {
  click(element: Element): Promise<void>;
  dblClick(element: Element): Promise<void>;
  type(element: Element, text: string, options?: { delay?: number }): Promise<void>;
  clear(element: Element): Promise<void>;
  selectOptions(element: Element, values: string | string[]): Promise<void>;
  tab(options?: { shift?: boolean }): Promise<void>;
  hover(element: Element): Promise<void>;
  unhover(element: Element): Promise<void>;
  upload(element: Element, files: File | File[]): Promise<void>;
  paste(element: Element, text: string): Promise<void>;
};

// ============================================================================
// Assertion Utilities
// ============================================================================

/**
 * Assert element structure matches expected
 */
export function assertElementStructure(
  element: CoherentElement,
  expected: Partial<CoherentElement>
): void;

/**
 * Standard assertions
 */
export const assertions: {
  assertElement(element: unknown): asserts element is Element;
  assertHTMLElement(element: unknown): asserts element is HTMLElement;
  assertInDocument(element: Element | null): asserts element is Element;
  assertVisible(element: Element): void;
  assertHasAttribute(element: Element, attr: string): void;
  assertHasClass(element: Element, className: string): void;
};

// ============================================================================
// DOM Matchers (for Vitest/Jest)
// ============================================================================

/**
 * Custom DOM matchers
 */
export interface CustomMatchers<R = void> {
  toHaveHTML(html: string): R;
  toContainHTML(html: string): R;
  toHaveTextContent(text: string | RegExp): R;
  toHaveAttribute(attr: string, value?: string): R;
  toHaveClass(className: string): R;
  toBeInTheDocument(): R;
  toBeVisible(): R;
  toBeDisabled(): R;
  toBeEnabled(): R;
  toHaveValue(value: unknown): R;
  toHaveStyle(style: Record<string, unknown>): R;
  toHaveFocus(): R;
  toBeChecked(): R;
  toBeValid(): R;
  toBeInvalid(): R;
}

/**
 * Custom matchers object
 */
export const customMatchers: CustomMatchers;

/**
 * Extend test framework expect
 */
export function extendExpect(matchers: Record<string, (...args: unknown[]) => unknown>): void;

// ============================================================================
// Vitest/Jest Module Extensions
// ============================================================================

// Extend Vitest matchers
declare module 'vitest' {
  interface Assertion<T = unknown> extends CoherentMatchers<T>, CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CoherentMatchers, CustomMatchers {}
}

// Extend Jest matchers (for users using Jest)
declare global {
  namespace Vi {
    interface Matchers<R = void> extends CustomMatchers<R>, CoherentMatchers<R> {}
    interface AsymmetricMatchers extends CustomMatchers, CoherentMatchers {}
  }
  namespace jest {
    interface Matchers<R = void> extends CustomMatchers<R>, CoherentMatchers<R> {}
    interface Expect extends CustomMatchers, CoherentMatchers {}
  }
}
