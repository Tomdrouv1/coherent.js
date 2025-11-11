/**
 * Coherent.js Testing Utilities TypeScript Definitions
 * @module @coherent.js/testing
 */

// ===== Test Renderer Types =====

export interface RenderOptions {
  wrapper?: any;
  context?: Record<string, any>;
  props?: Record<string, any>;
}

export interface TestRendererResult {
  html: string;
  component: any;
  container: HTMLElement | null;
  rerender(component: any): void;
  unmount(): void;
  debug(): void;
}

export class TestRenderer {
  render(component: any, options?: RenderOptions): TestRendererResult;
  renderAsync(component: any, options?: RenderOptions): Promise<TestRendererResult>;
  shallow(component: any): TestRendererResult;
  cleanup(): void;
}

export function renderComponent(component: any, options?: RenderOptions): TestRendererResult;
export function renderComponentAsync(component: any, options?: RenderOptions): Promise<TestRendererResult>;
export function createTestRenderer(): TestRenderer;
export function shallowRender(component: any): TestRendererResult;

// ===== Test Utilities Types =====

export interface EventOptions {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
  [key: string]: any;
}

export const fireEvent: {
  (element: Element, event: Event): boolean;
  click(element: Element, options?: EventOptions): boolean;
  change(element: Element, options?: EventOptions & { target?: { value?: any } }): boolean;
  input(element: Element, options?: EventOptions & { target?: { value?: any } }): boolean;
  submit(element: Element, options?: EventOptions): boolean;
  keyDown(element: Element, options?: EventOptions & { key?: string; code?: string }): boolean;
  keyUp(element: Element, options?: EventOptions & { key?: string; code?: string }): boolean;
  focus(element: Element, options?: EventOptions): boolean;
  blur(element: Element, options?: EventOptions): boolean;
  mouseEnter(element: Element, options?: EventOptions): boolean;
  mouseLeave(element: Element, options?: EventOptions): boolean;
  [key: string]: any;
};

export interface WaitOptions {
  timeout?: number;
  interval?: number;
}

export function waitFor<T>(callback: () => T | Promise<T>, options?: WaitOptions): Promise<T>;
export function waitForElement(selector: string, options?: WaitOptions): Promise<Element>;
export function waitForElementToBeRemoved(selector: string | Element, options?: WaitOptions): Promise<void>;

export function act<T>(callback: () => T | Promise<T>): Promise<T>;

export interface Mock<T extends (...args: any[]) => any = (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: Parameters<T>[];
    results: Array<{ type: 'return' | 'throw'; value: any }>;
    instances: any[];
  };
  mockClear(): void;
  mockReset(): void;
  mockRestore(): void;
  mockImplementation(fn: T): this;
  mockReturnValue(value: ReturnType<T>): this;
  mockReturnValueOnce(value: ReturnType<T>): this;
  mockResolvedValue(value: ReturnType<T> extends Promise<infer U> ? U : never): this;
  mockRejectedValue(error: any): this;
}

export function createMock<T extends (...args: any[]) => any>(implementation?: T): Mock<T>;
export function createSpy<T extends (...args: any[]) => any>(object: any, method: string): Mock<T>;

export function cleanup(): void;

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

export function within(element: Element): Within;
export const screen: Within;

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

// ===== Matchers Types =====

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
  toHaveValue(value: any): R;
  toHaveStyle(style: Record<string, any>): R;
  toHaveFocus(): R;
  toBeChecked(): R;
  toBeValid(): R;
  toBeInvalid(): R;
}

export const customMatchers: CustomMatchers;

export function extendExpect(matchers: Record<string, (...args: any[]) => any>): void;

export const assertions: {
  assertElement(element: any): asserts element is Element;
  assertHTMLElement(element: any): asserts element is HTMLElement;
  assertInDocument(element: Element | null): asserts element is Element;
  assertVisible(element: Element): void;
  assertHasAttribute(element: Element, attr: string): void;
  assertHasClass(element: Element, className: string): void;
};

// Extend Jest/Vitest expect
declare global {
  namespace Vi {
    interface Matchers<R = void> extends CustomMatchers<R> {}
    interface AsymmetricMatchers extends CustomMatchers {}
  }
  namespace jest {
    interface Matchers<R = void> extends CustomMatchers<R> {}
    interface Expect extends CustomMatchers {}
  }
}
