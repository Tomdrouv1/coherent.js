/**
 * Type Tests for Coherent.js Component System
 *
 * These tests validate component function types, defineComponent, createComponent,
 * withState HOC, memo, lazy, and component state management.
 *
 * Run with: pnpm --filter @coherent.js/core run typecheck
 */

import { expectTypeOf } from 'vitest';
import type {
  CoherentComponent,
  ComponentProps,
  ComponentState,
  ComponentDefinition,
  ComponentInstance,
  ComponentMetadata,
  StrictCoherentElement,
  CoherentNode,
  WithStateProps,
  MemoizedFunction,
  LazyWrapper,
  LazyOptions,
  MemoOptions,
  StateContainer,
  ComponentStateManager,
  StateListener,
} from '@coherent.js/core';
import {
  createComponent,
  defineComponent,
  withState,
  memo,
  memoComponent,
  lazy,
  isLazy,
  Component,
} from '@coherent.js/core';

// ============================================================================
// Component Function Types
// ============================================================================

// Basic component function type
interface MyProps extends ComponentProps {
  name: string;
  count?: number;
}

const MyComponent: CoherentComponent<MyProps> = (props) => ({
  div: { text: `${props?.name}: ${props?.count ?? 0}` },
});

// Props are correctly typed (including undefined for optional call)
expectTypeOf(MyComponent).parameter(0).toMatchTypeOf<MyProps | undefined>();

// Return type is CoherentNode
expectTypeOf(MyComponent).returns.toMatchTypeOf<CoherentNode>();

// Component with required children
interface LayoutProps extends ComponentProps {
  title: string;
  children: CoherentNode;
}

const Layout: CoherentComponent<LayoutProps> = (props) => ({
  div: {
    children: [{ h1: { text: props?.title ?? '' } }, props?.children],
  },
});

expectTypeOf(Layout).parameter(0).toMatchTypeOf<LayoutProps | undefined>();

// Component returning array
const ListItems: CoherentComponent<{ items: string[] }> = (props) =>
  (props?.items ?? []).map((item, i) => ({ li: { key: i, text: item } }));

expectTypeOf(ListItems).returns.toMatchTypeOf<CoherentNode>();

// Component returning null
const ConditionalComponent: CoherentComponent<{ show: boolean }> = (props) =>
  props?.show ? { div: { text: 'Visible' } } : null;

expectTypeOf(ConditionalComponent).returns.toMatchTypeOf<CoherentNode>();

// Component with displayName
const NamedComponent: CoherentComponent = () => ({ div: {} });
NamedComponent.displayName = 'NamedComponent';
expectTypeOf(NamedComponent.displayName).toBeString();

// ============================================================================
// defineComponent Types
// ============================================================================

// defineComponent returns CoherentComponent
expectTypeOf(defineComponent).returns.toMatchTypeOf<CoherentComponent>();

// Component definition structure with all lifecycle hooks
const fullDefinition: ComponentDefinition = {
  name: 'FullComponent',
  state: { count: 0, message: '' },
  render(props, state) {
    return { div: { text: `Count: ${state.count}` } };
  },
  beforeCreate() {
    // Called before component creation
  },
  created() {
    // Called after component creation
  },
  beforeMount() {
    // Called before mounting
  },
  mounted() {
    // Called after mounting
  },
  beforeUpdate() {
    // Called before update
  },
  updated() {
    // Called after update
  },
  beforeDestroy() {
    // Called before destroy
  },
  destroyed() {
    // Called after destroy
  },
  errorCaptured(error: Error) {
    console.error('Captured:', error.message);
  },
};

expectTypeOf(fullDefinition).toMatchTypeOf<ComponentDefinition>();

// Definition with methods and computed
const definitionWithMethods: ComponentDefinition = {
  name: 'WithMethods',
  state: { items: [] as string[] },
  methods: {
    addItem(item: string) {
      // Add item logic
    },
    removeItem(index: number) {
      // Remove item logic
    },
  },
  computed: {
    itemCount() {
      return this.state.get().items.length;
    },
  },
  render(props, state) {
    return { div: { text: `Items: ${state.items.length}` } };
  },
};

expectTypeOf(definitionWithMethods).toMatchTypeOf<ComponentDefinition>();

// Definition with watchers
const definitionWithWatchers: ComponentDefinition = {
  name: 'WithWatchers',
  state: { value: '' },
  watch: {
    value(newValue, oldValue) {
      console.log(`Changed from ${oldValue} to ${newValue}`);
    },
  },
  render(props, state) {
    return { input: { type: 'text', value: state.value } };
  },
};

expectTypeOf(definitionWithWatchers).toMatchTypeOf<ComponentDefinition>();

// defineComponent call
const DefinedComponent = defineComponent({
  name: 'Defined',
  render(props) {
    return { div: { text: 'Defined component' } };
  },
});

expectTypeOf(DefinedComponent).toMatchTypeOf<CoherentComponent>();

// ============================================================================
// createComponent Types
// ============================================================================

// createComponent returns Component instance
expectTypeOf(createComponent).returns.toMatchTypeOf<Component>();

// Component instance has expected methods
const instance = createComponent({
  name: 'TestComponent',
  render() {
    return { div: { text: 'Test' } };
  },
});

expectTypeOf(instance.render).toBeFunction();
expectTypeOf(instance.mount).returns.toMatchTypeOf<ComponentInstance>();
expectTypeOf(instance.update).returns.toMatchTypeOf<ComponentInstance>();
expectTypeOf(instance.destroy).returns.toMatchTypeOf<ComponentInstance>();
expectTypeOf(instance.clone).returns.toMatchTypeOf<ComponentInstance>();
expectTypeOf(instance.getMetadata).returns.toMatchTypeOf<ComponentMetadata>();
expectTypeOf(instance.callHook).toBeFunction();
expectTypeOf(instance.handleError).toBeFunction();

// Component instance has expected properties
expectTypeOf(instance.name).toBeString();
expectTypeOf(instance.isMounted).toBeBoolean();
expectTypeOf(instance.isDestroyed).toBeBoolean();
expectTypeOf(instance.props).toMatchTypeOf<ComponentProps>();
expectTypeOf(instance.state).toMatchTypeOf<ComponentStateManager>();
expectTypeOf(instance.children).toMatchTypeOf<ComponentInstance[]>();
expectTypeOf(instance.parent).toMatchTypeOf<ComponentInstance | null>();
expectTypeOf(instance.rendered).toMatchTypeOf<CoherentNode | null>();
expectTypeOf(instance.definition).toMatchTypeOf<ComponentDefinition>();
expectTypeOf(instance.methods).toMatchTypeOf<Record<string, Function>>();
expectTypeOf(instance.computedCache).toMatchTypeOf<Map<string, unknown>>();

// ComponentMetadata structure
const metadata = instance.getMetadata();
expectTypeOf(metadata.createdAt).toBeNumber();
expectTypeOf(metadata.updateCount).toBeNumber();
expectTypeOf(metadata.renderCount).toBeNumber();

// ComponentStateManager methods
expectTypeOf(instance.state.get).toBeFunction();
expectTypeOf(instance.state.set).toBeFunction();
expectTypeOf(instance.state.subscribe).toBeFunction();
expectTypeOf(instance.state.notifyListeners).toBeFunction();

// ============================================================================
// withState HOC Types
// ============================================================================

// withState adds state props
interface CounterProps extends ComponentProps {
  label: string;
}

interface CounterState {
  count: number;
}

// Component expecting WithStateProps
const CounterBase: CoherentComponent<WithStateProps<CounterProps, CounterState>> = (props) => ({
  div: {
    children: [
      { span: { text: `${props?.label}: ${props?.state.count}` } },
      {
        button: {
          text: '+',
          onClick: () => props?.setState({ count: (props?.state.count ?? 0) + 1 }),
        },
      },
    ],
  },
});

// WithStateProps includes state, setState, and stateUtils
type CounterWithState = WithStateProps<CounterProps, CounterState>;
expectTypeOf<CounterWithState>().toHaveProperty('state');
expectTypeOf<CounterWithState>().toHaveProperty('setState');
expectTypeOf<CounterWithState>().toHaveProperty('stateUtils');
expectTypeOf<CounterWithState>().toHaveProperty('label');

// withState function signature
expectTypeOf(withState).toBeFunction();

// ============================================================================
// memo Types
// ============================================================================

// memo wraps a function
const expensiveFn = (x: number): number => x * 2;
const memoized = memo(expensiveFn);

// Return type is original function plus cache methods
expectTypeOf(memoized).toBeCallableWith(5);
expectTypeOf(memoized).returns.toBeNumber();
expectTypeOf(memoized.cache).toMatchTypeOf<Map<string, unknown>>();
expectTypeOf(memoized.clear).toBeFunction();
expectTypeOf(memoized.has).toBeCallableWith('key');
expectTypeOf(memoized.size).returns.toBeNumber();
expectTypeOf(memoized.delete).toBeCallableWith('key');
expectTypeOf(memoized.refresh).toBeCallableWith(5);

// memo with options
const memoOptions: MemoOptions = {
  strategy: 'lru',
  maxSize: 100,
  ttl: 60000,
  keyFn: (...args) => JSON.stringify(args),
  shallow: true,
  stats: true,
  debug: false,
  onHit: (key, value, args) => console.log('Hit:', key),
  onMiss: (key, args) => console.log('Miss:', key),
  onEvict: (key, value) => console.log('Evict:', key),
};

const memoizedWithOptions = memo(expensiveFn, memoOptions);
expectTypeOf(memoizedWithOptions).toBeCallableWith(5);

// MemoizedFunction type properties
type MemoizedExpensive = MemoizedFunction<typeof expensiveFn>;
expectTypeOf<MemoizedExpensive>().toHaveProperty('cache');
expectTypeOf<MemoizedExpensive>().toHaveProperty('clear');
expectTypeOf<MemoizedExpensive>().toHaveProperty('delete');
expectTypeOf<MemoizedExpensive>().toHaveProperty('has');
expectTypeOf<MemoizedExpensive>().toHaveProperty('size');
expectTypeOf<MemoizedExpensive>().toHaveProperty('refresh');

// memoComponent wraps component
const MemoizedComponent = memoComponent(MyComponent);
expectTypeOf(MemoizedComponent).toMatchTypeOf<CoherentComponent<MyProps>>();

// memoComponent with options
const MemoizedWithCompare = memoComponent(MyComponent, {
  propsEqual: (a, b) => a.name === b.name && a.count === b.count,
  name: 'MemoizedMyComponent',
});
expectTypeOf(MemoizedWithCompare).toMatchTypeOf<CoherentComponent<MyProps>>();

// ============================================================================
// lazy Types
// ============================================================================

// lazy creates a LazyWrapper
const lazyValue = lazy(() => ({ data: 'loaded' }));
expectTypeOf(lazyValue).toMatchTypeOf<LazyWrapper<{ data: string }>>();
expectTypeOf(lazyValue.evaluate).returns.toMatchTypeOf<{ data: string }>();
expectTypeOf(lazyValue.isEvaluated).returns.toBeBoolean();
expectTypeOf(lazyValue.invalidate).returns.toMatchTypeOf<LazyWrapper<{ data: string }>>();
expectTypeOf(lazyValue.getCachedValue).returns.toMatchTypeOf<{ data: string } | null>();

// LazyWrapper methods
expectTypeOf(lazyValue.map).toBeFunction();
expectTypeOf(lazyValue.flatMap).toBeFunction();
expectTypeOf(lazyValue.toString).returns.toBeString();
expectTypeOf(lazyValue.toJSON).returns.toMatchTypeOf<{ data: string }>();

// LazyWrapper properties
expectTypeOf(lazyValue.__isLazy).toMatchTypeOf<true>();
expectTypeOf(lazyValue.__factory).toBeFunction();
expectTypeOf(lazyValue.__options).toMatchTypeOf<LazyOptions>();

// lazy with options
const lazyOptions: LazyOptions = {
  cache: true,
  timeout: 5000,
  fallback: { data: 'fallback' },
  onError: (error) => console.error(error),
  dependencies: [],
};

const lazyWithOptions = lazy(() => ({ data: 'loaded' }), lazyOptions);
expectTypeOf(lazyWithOptions).toMatchTypeOf<LazyWrapper<{ data: string }>>();

// isLazy type guard
expectTypeOf(isLazy).toBeCallableWith(lazyValue);
expectTypeOf(isLazy).returns.toBeBoolean();

// isLazy as type guard (narrowing)
const possiblyLazy: unknown = lazyValue;
if (isLazy<{ data: string }>(possiblyLazy)) {
  expectTypeOf(possiblyLazy.evaluate).toBeFunction();
}

// ============================================================================
// ComponentState and StateContainer
// ============================================================================

// ComponentState allows any keys
const state: ComponentState = {
  count: 0,
  name: 'test',
  nested: { value: true },
  items: [1, 2, 3],
};
expectTypeOf(state).toMatchTypeOf<ComponentState>();

// StateContainer methods
declare const stateContainer: StateContainer;
expectTypeOf(stateContainer.get).toBeFunction();
expectTypeOf(stateContainer.set).toBeFunction();
expectTypeOf(stateContainer.has).toBeFunction();
expectTypeOf(stateContainer.delete).toBeFunction();
expectTypeOf(stateContainer.clear).returns.toMatchTypeOf<StateContainer>();
expectTypeOf(stateContainer.toObject).returns.toMatchTypeOf<Record<string, unknown>>();
expectTypeOf(stateContainer._internal).toMatchTypeOf<Map<string, unknown>>();

// StateListener type
const listener: StateListener = (newState, oldState) => {
  console.log('State changed:', oldState, '->', newState);
};
expectTypeOf(listener).toMatchTypeOf<StateListener>();

// ============================================================================
// Component Class
// ============================================================================

// Component class constructor
const componentFromClass = new Component({
  name: 'ClassComponent',
  render() {
    return { div: { text: 'Class' } };
  },
});

expectTypeOf(componentFromClass).toMatchTypeOf<Component>();
expectTypeOf(componentFromClass).toMatchTypeOf<ComponentInstance>();

// ============================================================================
// Invalid Component Patterns (Must Error)
// ============================================================================

// ComponentState requires object type
// @ts-expect-error - string is not assignable to ComponentState
const invalidState: ComponentState = 'not an object';

// LazyOptions timeout must be number
const invalidLazyOptions: LazyOptions = {
  // @ts-expect-error - string is not assignable to number
  timeout: 'not a number',
};

// MemoOptions strategy must be valid
const invalidMemoOptions: MemoOptions = {
  // @ts-expect-error - 'invalid' is not assignable to strategy type
  strategy: 'invalid',
};

// Suppress unused variable warnings
void MyComponent;
void Layout;
void ListItems;
void ConditionalComponent;
void NamedComponent;
void fullDefinition;
void definitionWithMethods;
void definitionWithWatchers;
void DefinedComponent;
void instance;
void metadata;
void CounterBase;
void memoized;
void memoizedWithOptions;
void MemoizedComponent;
void MemoizedWithCompare;
void lazyValue;
void lazyWithOptions;
void possiblyLazy;
void state;
void listener;
void componentFromClass;
void invalidState;
void invalidLazyOptions;
void invalidMemoOptions;
