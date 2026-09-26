/**
 * Type tests for Coherent.js Client Hydration APIs
 *
 * Tests type correctness for:
 * - hydrate() function (clean API)
 * - SerializableState type
 * - Delegated event handler types (CoherentEvent)
 * - State serialization and mismatch detection
 * - Integration with core types
 *
 * @module @coherent.js/client/type-tests/hydration
 */

import { expectTypeOf } from 'expect-type';
import type {
  // Core types from client (re-exported from core)
  CoherentNode,
  CoherentComponent,
  // Hydration types
  HydrateControl,
  HydrationOptions,
  HydrationMismatch,
  // State types
  SerializableState,
  // Event handler types
  CoherentEvent,
  EventHandler,
  ClickHandler,
  KeyHandler,
  FocusHandler,
  SubmitHandler,
  ChangeHandler,
  InputHandler,
  MouseHandler,
  DragHandler,
  TouchHandler,
  WheelHandler,
  StateAwareHandler,
} from '@coherent.js/client';

import {
  hydrate,
  serializeState,
  deserializeState,
  extractState,
  serializeStateWithWarning,
  detectMismatch,
  reportMismatches,
  formatPath,
  eventDelegation,
  handlerRegistry,
  wrapEvent,
} from '@coherent.js/client';

// ============================================================================
// Test: hydrate() function (clean API)
// ============================================================================

declare const MyComponent: CoherentComponent;
declare const container: HTMLElement;

const control = hydrate(MyComponent, container);
expectTypeOf(control).toMatchTypeOf<HydrateControl>();
expectTypeOf(control.getState()).toMatchTypeOf<SerializableState>();

control.setState({ count: 1 });
control.setState((prev) => ({ count: (prev.count as number) + 1 }));
control.rerender();
control.rerender({ title: 'New Title' });
control.unmount();

// Plain function components with props work too
const Counter = ({ count = 0 }: { count?: number }): CoherentNode => ({
  button: { text: String(count) },
});
expectTypeOf(hydrate(Counter, container)).toMatchTypeOf<HydrateControl>();

const controlWithOptions = hydrate(MyComponent, container, {
  initialState: { count: 0 },
  detectMismatch: true,
  strict: false,
  props: { title: 'Hello' },
  onMismatch: (mismatches) => {
    expectTypeOf(mismatches).toMatchTypeOf<HydrationMismatch[]>();
  },
});
expectTypeOf(controlWithOptions).toMatchTypeOf<HydrateControl>();

// Options that hydrate() never read are gone
// @ts-expect-error timeout is not a hydrate() option
const withTimeout: HydrationOptions = { timeout: 1000 };
// @ts-expect-error onError is not a hydrate() option
const withOnError: HydrationOptions = { onError: () => {} };

// ============================================================================
// Test: SerializableState type
// ============================================================================

const stateWithPrimitives: SerializableState = {
  count: 42,
  name: 'John',
  active: true,
  nothing: null,
  maybe: undefined,
};

const stateWithNested: SerializableState = {
  user: { name: 'John', address: { city: 'NYC' } },
  todos: [{ id: 1, done: false }],
  tags: ['a', 'b'],
};

expectTypeOf(stateWithPrimitives).toMatchTypeOf<SerializableState>();
expectTypeOf(stateWithNested).toMatchTypeOf<SerializableState>();

// ============================================================================
// Test: delegated handlers receive a CoherentEvent
// ============================================================================

const genericHandler: EventHandler = (event) => {
  expectTypeOf(event).toMatchTypeOf<CoherentEvent>();
  expectTypeOf(event.originalEvent).toMatchTypeOf<Event>();
  expectTypeOf(event.target).toMatchTypeOf<Element>();
  expectTypeOf(event.defaultPrevented).toBeBoolean();
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const myClickHandler: ClickHandler = (event) => {
  expectTypeOf(event.originalEvent).toMatchTypeOf<MouseEvent>();
  event.originalEvent.clientX;
};

const myKeyHandler: KeyHandler = (event) => {
  expectTypeOf(event.originalEvent).toMatchTypeOf<KeyboardEvent>();
  event.originalEvent.key;
};

const myFocusHandler: FocusHandler = (event) => {
  event.originalEvent.relatedTarget;
};
const mySubmitHandler: SubmitHandler = (event) => {
  event.originalEvent.submitter;
};
const myChangeHandler: ChangeHandler = (event) => {
  event.originalEvent.type;
};
const myInputHandler: InputHandler = (event) => {
  event.originalEvent.inputType;
};
const myMouseHandler: MouseHandler = (event) => {
  event.originalEvent.button;
};
const myDragHandler: DragHandler = (event) => {
  event.originalEvent.dataTransfer;
};
const myTouchHandler: TouchHandler = (event) => {
  event.originalEvent.touches;
};
const myWheelHandler: WheelHandler = (event) => {
  event.originalEvent.deltaY;
};

const asyncHandler: EventHandler = async () => {
  await Promise.resolve();
};
expectTypeOf(asyncHandler).returns.toMatchTypeOf<void | Promise<void>>();

// StateAwareHandler: state and setState come on the event
const counterHandler: StateAwareHandler<{ count: number }, MouseEvent> = (event) => {
  expectTypeOf(event.state).toEqualTypeOf<{ count: number } | null>();
  expectTypeOf(event.props).toMatchTypeOf<Record<string, any> | null>();
  event.setState?.({ count: (event.state?.count ?? 0) + 1 });
  event.setState?.((prev) => ({ count: prev.count + 1 }));
};

// The handler receives one argument, not (event, state, setState)
// @ts-expect-error a delegated handler takes a single event argument
const threeArgs: StateAwareHandler = (_event, _state, _setState) => {};

// ============================================================================
// Test: State serialization functions
// ============================================================================

const encoded = serializeState({ count: 42, name: 'Test' });
expectTypeOf(encoded).toEqualTypeOf<string | null>();

const decoded = deserializeState(encoded);
expectTypeOf(decoded).toEqualTypeOf<SerializableState | null>();

const extracted = extractState(container);
expectTypeOf(extracted).toEqualTypeOf<SerializableState | null>();

expectTypeOf(serializeStateWithWarning({ count: 42 }, 'Counter')).toEqualTypeOf<string | null>();

// ============================================================================
// Test: Mismatch detection functions
// ============================================================================

declare const vNode: CoherentNode;
const mismatches = detectMismatch(container, vNode);
expectTypeOf(mismatches).toMatchTypeOf<HydrationMismatch[]>();

declare const mismatch: HydrationMismatch;
expectTypeOf(mismatch.path).toBeString();
expectTypeOf(mismatch.domPath).toBeString();
expectTypeOf(mismatch.type).toEqualTypeOf<
  'text' | 'tagName' | 'attribute' | 'children_count' | 'missing_dom_child' | 'extra_dom_child'
>();

reportMismatches(mismatches);
reportMismatches(mismatches, { componentName: 'Counter', strict: true });

expectTypeOf(formatPath(['div', 0, 'span'])).toBeString();

// ============================================================================
// Test: Event delegation exports
// ============================================================================

expectTypeOf(eventDelegation.listen).toBeFunction();
expectTypeOf(eventDelegation.isInitialized()).toBeBoolean();
expectTypeOf(handlerRegistry.has('my-handler')).toBeBoolean();
handlerRegistry.register('my-handler', counterHandler, null);

// wrapEvent wraps a native event for a handler
declare const nativeClick: MouseEvent;
declare const button: HTMLButtonElement;
const wrapped = wrapEvent<{ count: number }, MouseEvent>(nativeClick, button, {
  state: { count: 1 },
  setState: () => {},
});
expectTypeOf(wrapped).toEqualTypeOf<CoherentEvent<{ count: number }, MouseEvent>>();
expectTypeOf(wrapped.originalEvent).toEqualTypeOf<MouseEvent>();

// ============================================================================
// Test: Integration with core types
// ============================================================================

const componentFunction: CoherentComponent = () => ({
  div: {
    className: 'container',
    children: [{ span: { text: 'Hello' } }],
  },
});
expectTypeOf(hydrate(componentFunction, container)).toMatchTypeOf<HydrateControl>();

export {
  withTimeout,
  withOnError,
  genericHandler,
  myClickHandler,
  myKeyHandler,
  myFocusHandler,
  mySubmitHandler,
  myChangeHandler,
  myInputHandler,
  myMouseHandler,
  myDragHandler,
  myTouchHandler,
  myWheelHandler,
  threeArgs,
};
