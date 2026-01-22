/**
 * Type tests for Coherent.js Client Hydration APIs
 *
 * Tests type correctness for:
 * - hydrate() function (clean API)
 * - hydrateAll() function
 * - hydrateBySelector() function
 * - autoHydrate() function
 * - enableClientEvents() function
 * - makeHydratable() function
 * - registerEventHandler() function
 * - SerializableState type
 * - EventHandler types
 * - ClientComponent interface
 * - Integration with core types
 *
 * @module @coherent.js/client/type-tests/hydration
 */

import { expectTypeOf } from 'expect-type';
import type {
  // Core types from client (re-exported from core)
  CoherentNode,
  CoherentElement,
  StrictCoherentElement,
  CoherentComponent,
  ComponentProps,
  // Hydration types
  HydrateControl,
  HydratedInstance,
  HydrationOptions,
  HydrationMismatch,
  HydrationResult,
  BatchHydrationResult,
  MakeHydratableOptions,
  // State types
  SerializableState,
  SerializablePrimitive,
  // Event handler types
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
  // Client component types
  ClientComponent,
  ComponentFactory,
  ComponentRegistryEntry,
  // Event delegation types
  EventDelegation,
  HandlerRegistry,
} from '@coherent.js/client';

import {
  hydrate,
  legacyHydrate,
  hydrateAll,
  hydrateBySelector,
  autoHydrate,
  enableClientEvents,
  makeHydratable,
  registerEventHandler,
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

// hydrate() should accept a CoherentComponent and return HydrateControl
declare const MyComponent: CoherentComponent;
declare const container: HTMLElement;

const control = hydrate(MyComponent, container);
expectTypeOf(control).toMatchTypeOf<HydrateControl>();

// HydrateControl should have unmount, rerender, getState, setState
expectTypeOf(control.unmount).toBeFunction();
expectTypeOf(control.rerender).toBeFunction();
expectTypeOf(control.getState).toBeFunction();
expectTypeOf(control.setState).toBeFunction();

// getState should return SerializableState
expectTypeOf(control.getState()).toMatchTypeOf<SerializableState>();

// setState should accept partial state or updater function
control.setState({ count: 1 });
control.setState((prev) => ({ count: (prev.count as number) + 1 }));

// rerender should accept optional new props
control.rerender();
control.rerender({ title: 'New Title' });

// unmount should have no parameters
control.unmount();

// hydrate() should accept options
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

// ============================================================================
// Test: legacyHydrate() function
// ============================================================================

const legacyInstance = legacyHydrate(container, MyComponent);
expectTypeOf(legacyInstance).toMatchTypeOf<HydratedInstance | null>();

if (legacyInstance) {
  // HydratedInstance should have element, component, props, state, isHydrated
  expectTypeOf(legacyInstance.element).toMatchTypeOf<HTMLElement>();
  expectTypeOf(legacyInstance.component).toMatchTypeOf<CoherentComponent>();
  expectTypeOf(legacyInstance.props).toMatchTypeOf<Record<string, any>>();
  expectTypeOf(legacyInstance.state).toMatchTypeOf<SerializableState>();
  expectTypeOf(legacyInstance.isHydrated).toBeBoolean();

  // HydratedInstance should have update, rerender, destroy, setState methods
  expectTypeOf(legacyInstance.update).toBeFunction();
  expectTypeOf(legacyInstance.rerender).toBeFunction();
  expectTypeOf(legacyInstance.destroy).toBeFunction();
  expectTypeOf(legacyInstance.setState).toBeFunction();

  // update should return HydratedInstance for chaining
  expectTypeOf(legacyInstance.update({ title: 'New' })).toMatchTypeOf<HydratedInstance>();

  // setState should accept partial state or updater
  legacyInstance.setState({ count: 1 });
  legacyInstance.setState((prev) => ({ count: (prev.count as number) + 1 }));
}

// ============================================================================
// Test: hydrateAll() function
// ============================================================================

declare const elements: HTMLElement[];
declare const components: CoherentComponent[];

const instances = hydrateAll(elements, components);
expectTypeOf(instances).toMatchTypeOf<Array<HydratedInstance | null>>();

// hydrateAll should accept props array
const instancesWithProps = hydrateAll(elements, components, [{ a: 1 }, { b: 2 }]);
expectTypeOf(instancesWithProps).toMatchTypeOf<Array<HydratedInstance | null>>();

// ============================================================================
// Test: hydrateBySelector() function
// ============================================================================

const selectorInstances = hydrateBySelector('.my-component', MyComponent);
expectTypeOf(selectorInstances).toMatchTypeOf<Array<HydratedInstance | null>>();

// hydrateBySelector should accept props
const selectorInstancesWithProps = hydrateBySelector('.my-component', MyComponent, { title: 'Hello' });
expectTypeOf(selectorInstancesWithProps).toMatchTypeOf<Array<HydratedInstance | null>>();

// ============================================================================
// Test: autoHydrate() function
// ============================================================================

// autoHydrate should accept optional component registry
autoHydrate();
autoHydrate({ Counter: MyComponent, TodoList: MyComponent });

expectTypeOf(autoHydrate).toBeFunction();
expectTypeOf(autoHydrate).returns.toBeVoid();

// ============================================================================
// Test: enableClientEvents() function
// ============================================================================

// enableClientEvents should accept optional root element
enableClientEvents();
enableClientEvents(document);
enableClientEvents(container);

expectTypeOf(enableClientEvents).toBeFunction();
expectTypeOf(enableClientEvents).returns.toBeVoid();

// ============================================================================
// Test: makeHydratable() function
// ============================================================================

const HydratableComponent = makeHydratable(MyComponent);

// Should preserve the component function signature
expectTypeOf(HydratableComponent).toMatchTypeOf<CoherentComponent>();

// Should add isHydratable flag
expectTypeOf(HydratableComponent.isHydratable).toEqualTypeOf<true>();

// Should add hydrationOptions
expectTypeOf(HydratableComponent.hydrationOptions).toMatchTypeOf<MakeHydratableOptions>();

// Should add autoHydrate method
expectTypeOf(HydratableComponent.autoHydrate).toBeFunction();

// Should add getHydrationData method
const hydrationData = HydratableComponent.getHydrationData({ title: 'Hello' }, { count: 0 });
expectTypeOf(hydrationData.componentName).toBeString();
expectTypeOf(hydrationData.props).toMatchTypeOf<Record<string, any>>();
expectTypeOf(hydrationData.hydrationAttributes).toMatchTypeOf<Record<string, string | null>>();

// Should add renderWithHydration method
expectTypeOf(HydratableComponent.renderWithHydration).toBeFunction();
expectTypeOf(HydratableComponent.renderWithHydration()).toMatchTypeOf<CoherentNode>();

// makeHydratable should accept options
const HydratableWithOptions = makeHydratable(MyComponent, {
  componentName: 'MyCounter',
  initialState: { count: 0 },
});
expectTypeOf(HydratableWithOptions.isHydratable).toEqualTypeOf<true>();

// ============================================================================
// Test: registerEventHandler() function
// ============================================================================

// registerEventHandler should accept id and StateAwareHandler
const clickHandler: StateAwareHandler<{ count: number }, MouseEvent> = (event, state, setState) => {
  expectTypeOf(event).toMatchTypeOf<MouseEvent>();
  expectTypeOf(state).toMatchTypeOf<{ count: number }>();
  expectTypeOf(setState).toBeFunction();
  setState({ count: state.count + 1 });
};

registerEventHandler('my-click-handler', clickHandler);

expectTypeOf(registerEventHandler).toBeFunction();
expectTypeOf(registerEventHandler).returns.toBeVoid();

// ============================================================================
// Test: SerializableState type
// ============================================================================

// SerializableState should allow primitives
const stateWithPrimitives: SerializableState = {
  count: 42,
  name: 'John',
  active: true,
  nothing: null,
  maybe: undefined,
};

// SerializableState should allow arrays of primitives
const stateWithArrays: SerializableState = {
  numbers: [1, 2, 3],
  names: ['a', 'b', 'c'],
  flags: [true, false],
};

// SerializableState should allow nested objects
const stateWithNested: SerializableState = {
  user: {
    name: 'John',
    age: 30,
    address: {
      city: 'NYC',
      zip: '10001',
    },
  },
};

// SerializableState should allow arrays of objects
const stateWithObjectArrays: SerializableState = {
  todos: [
    { id: 1, text: 'Task 1', completed: false },
    { id: 2, text: 'Task 2', completed: true },
  ],
};

// Type checking - these should all be assignable to SerializableState
expectTypeOf(stateWithPrimitives).toMatchTypeOf<SerializableState>();
expectTypeOf(stateWithArrays).toMatchTypeOf<SerializableState>();
expectTypeOf(stateWithNested).toMatchTypeOf<SerializableState>();
expectTypeOf(stateWithObjectArrays).toMatchTypeOf<SerializableState>();

// ============================================================================
// Test: EventHandler types
// ============================================================================

// Generic EventHandler should accept Event, element, and optional data
const genericHandler: EventHandler = (event, element, data) => {
  expectTypeOf(event).toMatchTypeOf<Event>();
  expectTypeOf(element).toMatchTypeOf<HTMLElement>();
  expectTypeOf(data).toBeAny();
};

// ClickHandler should receive MouseEvent
const myClickHandler: ClickHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<MouseEvent>();
  expectTypeOf(element).toMatchTypeOf<HTMLElement>();
  // MouseEvent-specific properties should be available
  event.clientX;
  event.clientY;
  event.button;
};

// KeyHandler should receive KeyboardEvent
const myKeyHandler: KeyHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<KeyboardEvent>();
  // KeyboardEvent-specific properties should be available
  event.key;
  event.code;
  event.ctrlKey;
};

// FocusHandler should receive FocusEvent
const myFocusHandler: FocusHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<FocusEvent>();
  event.relatedTarget;
};

// SubmitHandler should receive SubmitEvent
const mySubmitHandler: SubmitHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<SubmitEvent>();
  event.submitter;
};

// ChangeHandler should receive Event
const myChangeHandler: ChangeHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<Event>();
};

// InputHandler should receive InputEvent
const myInputHandler: InputHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<InputEvent>();
  event.data;
  event.inputType;
};

// MouseHandler should receive MouseEvent
const myMouseHandler: MouseHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<MouseEvent>();
};

// DragHandler should receive DragEvent
const myDragHandler: DragHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<DragEvent>();
  event.dataTransfer;
};

// TouchHandler should receive TouchEvent
const myTouchHandler: TouchHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<TouchEvent>();
  event.touches;
  event.changedTouches;
};

// WheelHandler should receive WheelEvent
const myWheelHandler: WheelHandler = (event, element) => {
  expectTypeOf(event).toMatchTypeOf<WheelEvent>();
  event.deltaX;
  event.deltaY;
};

// EventHandler can return void or Promise<void>
const asyncHandler: EventHandler = async (event, element) => {
  await Promise.resolve();
};
expectTypeOf(asyncHandler).returns.toMatchTypeOf<void | Promise<void>>();

// ============================================================================
// Test: StateAwareHandler type
// ============================================================================

// StateAwareHandler should receive event, state, and setState
const counterHandler: StateAwareHandler<{ count: number }> = (event, state, setState) => {
  expectTypeOf(event).toMatchTypeOf<Event>();
  expectTypeOf(state).toMatchTypeOf<{ count: number }>();
  expectTypeOf(setState).toBeFunction();

  // setState should accept partial state
  setState({ count: state.count + 1 });

  // setState should accept updater function
  setState((prev) => ({ count: prev.count + 1 }));
};

// StateAwareHandler can be typed with specific event type
const typedHandler: StateAwareHandler<{ value: string }, KeyboardEvent> = (event, state, setState) => {
  expectTypeOf(event).toMatchTypeOf<KeyboardEvent>();
  expectTypeOf(state).toMatchTypeOf<{ value: string }>();

  if (event.key === 'Enter') {
    setState({ value: '' });
  }
};

// ============================================================================
// Test: ClientComponent interface
// ============================================================================

declare const clientComponent: ClientComponent;

// Should have readonly properties
expectTypeOf(clientComponent.element).toMatchTypeOf<HTMLElement>();
expectTypeOf(clientComponent.state).toMatchTypeOf<SerializableState>();
expectTypeOf(clientComponent.isHydrated).toBeBoolean();
expectTypeOf(clientComponent.id).toBeString();

// Should have state management methods
expectTypeOf(clientComponent.setState).toBeFunction();
expectTypeOf(clientComponent.updateState).toBeFunction();
expectTypeOf(clientComponent.getState).toBeFunction();
expectTypeOf(clientComponent.resetState).toBeFunction();

// getState should return SerializableState
expectTypeOf(clientComponent.getState()).toMatchTypeOf<SerializableState>();

// Should have lifecycle methods
expectTypeOf(clientComponent.render).toBeFunction();
expectTypeOf(clientComponent.destroy).toBeFunction();
expectTypeOf(clientComponent.refresh).toBeFunction();

// Should have event methods
expectTypeOf(clientComponent.addEventListener).toBeFunction();
expectTypeOf(clientComponent.removeEventListener).toBeFunction();
expectTypeOf(clientComponent.trigger).toBeFunction();

// Should have serialization methods
expectTypeOf(clientComponent.serialize).toBeFunction();
expectTypeOf(clientComponent.toJSON).toBeFunction();
expectTypeOf(clientComponent.serialize()).toBeString();
expectTypeOf(clientComponent.toJSON()).toMatchTypeOf<SerializableState>();

// ============================================================================
// Test: State serialization functions
// ============================================================================

// serializeState should accept SerializableState and return string
const encoded = serializeState({ count: 42, name: 'Test' });
expectTypeOf(encoded).toBeString();

// deserializeState should accept string and return SerializableState
const decoded = deserializeState(encoded);
expectTypeOf(decoded).toMatchTypeOf<SerializableState>();

// extractState should accept element and return SerializableState or null
const extracted = extractState(container);
expectTypeOf(extracted).toMatchTypeOf<SerializableState | null>();

// serializeStateWithWarning should accept state and optional component name
const encodedWithWarning = serializeStateWithWarning({ count: 42 });
expectTypeOf(encodedWithWarning).toBeString();
const encodedWithComponentName = serializeStateWithWarning({ count: 42 }, 'Counter');
expectTypeOf(encodedWithComponentName).toBeString();

// ============================================================================
// Test: Mismatch detection functions
// ============================================================================

// detectMismatch should accept element and vNode, return mismatches
declare const vNode: CoherentNode;
const mismatches = detectMismatch(container, vNode);
expectTypeOf(mismatches).toMatchTypeOf<HydrationMismatch[]>();

// HydrationMismatch should have path, type, expected, actual
if (mismatches.length > 0) {
  const mismatch = mismatches[0];
  expectTypeOf(mismatch.path).toBeString();
  expectTypeOf(mismatch.type).toMatchTypeOf<'text' | 'attribute' | 'tag' | 'children' | 'missing' | 'extra'>();
  expectTypeOf(mismatch.expected).toBeAny();
  expectTypeOf(mismatch.actual).toBeAny();
}

// reportMismatches should accept mismatches and options
reportMismatches(mismatches);
reportMismatches(mismatches, { componentName: 'Counter', strict: true });

// formatPath should accept path array and return string
const formattedPath = formatPath(['div', 0, 'span']);
expectTypeOf(formattedPath).toBeString();

// ============================================================================
// Test: Event delegation exports
// ============================================================================

// eventDelegation should be an EventDelegation instance
expectTypeOf(eventDelegation.initialize).toBeFunction();
expectTypeOf(eventDelegation.destroy).toBeFunction();
expectTypeOf(eventDelegation.isInitialized).toBeFunction();
expectTypeOf(eventDelegation.isInitialized()).toBeBoolean();

// handlerRegistry should be a HandlerRegistry instance
expectTypeOf(handlerRegistry.register).toBeFunction();
expectTypeOf(handlerRegistry.unregister).toBeFunction();
expectTypeOf(handlerRegistry.get).toBeFunction();
expectTypeOf(handlerRegistry.has).toBeFunction();
expectTypeOf(handlerRegistry.clear).toBeFunction();
expectTypeOf(handlerRegistry.has('my-handler')).toBeBoolean();
expectTypeOf(handlerRegistry.unregister('my-handler')).toBeBoolean();

// wrapEvent should return handlerId and dataAttribute
const wrapped = wrapEvent('click', clickHandler);
expectTypeOf(wrapped.handlerId).toBeString();
expectTypeOf(wrapped.dataAttribute).toBeString();

// wrapEvent should accept optional handlerId
const wrappedWithId = wrapEvent('click', clickHandler, 'custom-id');
expectTypeOf(wrappedWithId.handlerId).toBeString();

// ============================================================================
// Test: Integration with core types
// ============================================================================

// CoherentComponent from client should be compatible with core
const componentFunction: CoherentComponent = (props) => {
  return {
    div: {
      className: 'container',
      children: [
        { h1: { text: props?.title || 'Hello' } },
        { p: { text: 'Content' } },
      ],
    },
  };
};

// Should be able to hydrate with this component
const coreIntegrationControl = hydrate(componentFunction, container);
expectTypeOf(coreIntegrationControl).toMatchTypeOf<HydrateControl>();

// CoherentNode should be accepted by detectMismatch
const strictElement: StrictCoherentElement = {
  div: {
    className: 'test',
    children: [{ span: { text: 'Hello' } }],
  },
};
const strictMismatches = detectMismatch(container, strictElement);
expectTypeOf(strictMismatches).toMatchTypeOf<HydrationMismatch[]>();

// CoherentElement should also work
const permissiveElement: CoherentElement = {
  div: {
    className: 'test',
    customAttr: 'value', // Permissive allows any attribute
  },
};
const permissiveMismatches = detectMismatch(container, permissiveElement);
expectTypeOf(permissiveMismatches).toMatchTypeOf<HydrationMismatch[]>();

// ============================================================================
// Test: Type guards and narrowing
// ============================================================================

// Verify null checks work properly
const maybeInstance = legacyHydrate(container, componentFunction);
if (maybeInstance !== null) {
  // TypeScript should narrow to HydratedInstance
  maybeInstance.rerender();
  maybeInstance.setState({ count: 1 });
}

// Verify state extraction null check
const maybeState = extractState(container);
if (maybeState !== null) {
  // TypeScript should narrow to SerializableState
  const count = maybeState.count;
  expectTypeOf(count).toMatchTypeOf<SerializablePrimitive | SerializablePrimitive[] | SerializableState | SerializableState[] | undefined>();
}
