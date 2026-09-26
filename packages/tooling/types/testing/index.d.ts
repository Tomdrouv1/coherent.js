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
  component: CoherentNode,
  options?: Record<string, unknown>
): TestRendererResult;

/**
 * Render a component (or a possibly-async component function called with
 * `props`) for testing
 */
export function renderComponentAsync(
  component: CoherentComponent | CoherentNode,
  props?: Record<string, unknown>,
  options?: Record<string, unknown>
): Promise<TestRendererResult>;

/**
 * Create a new test renderer instance
 */
export function createTestRenderer(component: CoherentNode, options?: RenderOptions): TestRenderer;

/**
 * Shallow render a component: children are replaced by `{ _shallow: true }` placeholders
 */
export function shallowRender(component: CoherentNode): CoherentNode;

// ============================================================================
// Custom Matchers for Coherent.js
// ============================================================================

/**
 * Matchers registered by `extendExpect(expect)`. Each accepts a
 * `renderComponent()` result, a query match (`getByTestId()` …) or an HTML
 * string. Element matchers look at the first element in that HTML.
 *
 * None of them shadows a Vitest/Jest built-in: snapshot with
 * `expect(result.toSnapshot()).toMatchSnapshot()`, and use the built-in
 * `toHaveBeenCalled*` matchers for `vi.fn()` or `createMock()` mocks.
 */
export interface CoherentMatchers<R = unknown> {
  /** Text content (entities decoded) equals `text` */
  toHaveText(text: string): R;
  /** Text content (entities decoded) contains `text` */
  toContainText(text: string): R;
  /** The element has every given class, as whole tokens ('btn' ≠ 'btn-primary') */
  toHaveClass(className: string): R;
  /** A query match that found its element */
  toBeInTheDocument(): R;
  /** Has non-whitespace text content */
  toBeVisible(): R;
  /** Has no text content */
  toBeEmpty(): R;
  /** The HTML contains `html` verbatim */
  toContainHTML(html: string): R;
  /** The element has attribute `name` (with exactly `value`, when given) */
  toHaveAttribute(name: string, value?: string): R;
  /** The element's tag name is `tagName` */
  toHaveTagName(tagName: string): R;
  /** The HTML contains the given element's HTML */
  toContainElement(element: string | { html?: string }): R;
  /** Rendering produced non-empty HTML */
  toRenderSuccessfully(): R;
  /** Every non-void tag is closed, in order */
  toBeValidHTML(): R;
}

/** Result a matcher implementation returns to `expect.extend()` */
export interface MatcherResult {
  pass: boolean;
  message: () => string;
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

/**
 * The matcher implementations, keyed by name, for `expect.extend()`
 */
export const customMatchers: {
  [K in keyof CoherentMatchers]: (received: unknown, ...args: any[]) => MatcherResult;
};

/**
 * Register {@link customMatchers} on a framework's `expect` (Vitest, Jest)
 */
export function extendExpect(expect: { extend(matchers: Record<string, unknown>): void }): void;

// ============================================================================
// Vitest/Jest Module Extensions
// ============================================================================

// Extend Vitest matchers
declare module 'vitest' {
  interface Assertion<T = unknown> extends CoherentMatchers<T> {}
  interface AsymmetricMatchersContaining extends CoherentMatchers {}
}

// Extend Jest matchers (for users using Jest)
declare global {
  namespace Vi {
    interface Matchers<R = void> extends CoherentMatchers<R> {}
    interface AsymmetricMatchers extends CoherentMatchers {}
  }
  namespace jest {
    interface Matchers<R = void> extends CoherentMatchers<R> {}
    interface Expect extends CoherentMatchers {}
  }
}
