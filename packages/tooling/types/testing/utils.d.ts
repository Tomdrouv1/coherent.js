// The slice of the shared testing declarations this subpath exports at runtime.
export {
  act,
  cleanup,
  createMock,
  createSpy,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  waitForElement,
  waitForElementToBeRemoved,
  within
} from './index.js';

export type { EventOptions, WaitOptions } from './index.js';

// Per-event shorthands. They live on this module only -- ./testing does not
// re-export them -- so they are declared here rather than in index.d.ts.

/** {@link fireEvent} with `'click'`. */
export function fireEvent_click(element: unknown, eventData?: EventOptions): unknown;
/** {@link fireEvent} with `'change'`, setting `target.value`. */
export function fireEvent_change(element: unknown, value?: unknown): unknown;
/** {@link fireEvent} with `'input'`, setting `target.value`. */
export function fireEvent_input(element: unknown, value?: unknown): unknown;
/** {@link fireEvent} with `'submit'`. */
export function fireEvent_submit(element: unknown, eventData?: EventOptions): unknown;
/** {@link fireEvent} with `'keydown'`, setting `key`. */
export function fireEvent_keyDown(element: unknown, key?: string): unknown;
/** {@link fireEvent} with `'keyup'`, setting `key`. */
export function fireEvent_keyUp(element: unknown, key?: string): unknown;
/** {@link fireEvent} with `'focus'`. */
export function fireEvent_focus(element: unknown): unknown;
/** {@link fireEvent} with `'blur'`. */
export function fireEvent_blur(element: unknown): unknown;
