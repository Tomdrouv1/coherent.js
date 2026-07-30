/**
 * Coherent.js Testing Utilities TypeScript Definitions
 * @module @coherent.js/testing
 */

import type { CoherentNode, CoherentElement, CoherentComponent } from '@coherent.js/core';

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

/** String-level match returned by TestRendererResult query helpers */
export interface TestRendererMatch {
  text: string;
  html: string;
  exists: boolean;
  testId?: string;
  className?: string;
}

/**
 * Result of renderComponent()/renderComponentAsync() — the rendered HTML
 * plus string-level query helpers over it.
 */
export class TestRendererResult {
  constructor(component: CoherentNode, html: string, container?: unknown);
  component: CoherentNode;
  html: string;
  container: unknown;
  getByTestId(testId: string): TestRendererMatch;
  queryByTestId(testId: string): TestRendererMatch | null;
  getByText(text: string | RegExp): TestRendererMatch;
  queryByText(text: string | RegExp): TestRendererMatch | null;
  getByClassName(className: string): TestRendererMatch;
  queryByClassName(className: string): TestRendererMatch | null;
  getAllByTagName(tagName: string): TestRendererMatch[];
  exists(selector: string, type?: 'testId' | 'text' | 'className'): boolean;
  getHTML(): string;
  getComponent(): CoherentNode;
  toSnapshot(): string;
  debug(): void;
}

/**
 * Renders one component repeatedly, tracking how many times.
 *
 * The component and options are fixed at construction; `render()` and
 * `update()` return a queryable {@link TestRendererResult}.
 */
export class TestRenderer {
  constructor(component: CoherentNode, options?: RenderOptions);

  component: CoherentNode | null;
  options: RenderOptions;
  result: TestRendererResult | null;
  renderCount: number;

  /** Render the current component and record the result */
  render(): TestRendererResult;

  /** Swap in a new component and re-render */
  update(newComponent: CoherentNode): TestRendererResult;

  /** The most recent result, or `null` before the first render */
  getResult(): TestRendererResult | null;

  /** How many times `render()` has run */
  getRenderCount(): number;

  /** Drop the component and its result */
  unmount(): void;
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
 * Simulate an event on a test element.
 *
 * Calls the element's `on<eventType>` handler with a synthetic event built
 * from `eventData`. Throws when `element` is missing.
 */
export function fireEvent(
  element: unknown,
  eventType: string,
  eventData?: EventOptions
): unknown;


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
  /** Fire keydown/input/keyup per character, optionally spaced by `delay` ms */
  type(element: unknown, text: string, options?: { delay?: number }): Promise<void>;
  click(element: unknown): Promise<void>;
  dblClick(element: unknown): Promise<void>;
  /** Set the value to the empty string and fire `change` */
  clear(element: unknown): Promise<void>;
  selectOptions(element: unknown, values: string | string[]): Promise<void>;
  /** Move focus to the next focusable element */
  tab(): Promise<void>;
};

// ============================================================================
// Assertion Utilities
// ============================================================================

/**
 * Standard assertions
 */
export const assertions: {
  /** Throw unless the match's text equals `text` */
  assertHasText(element: TestRendererMatch | null, text: string): void;
  /** Throw unless the match exists */
  assertExists(element: TestRendererMatch | null): void;
  /** Throw unless the match's className contains `className` */
  assertHasClass(element: TestRendererMatch | null, className: string): void;
  /** Throw unless the HTML, or a result's HTML, contains `substring` */
  assertContainsHTML(html: string | { html?: string } | null, substring: string): void;
  /** Throw unless the render produced non-empty HTML */
  assertRendered(result: { html?: string } | null): void;
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
