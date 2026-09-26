/**
 * Reactive state: observables, computed properties, watchers, batching and
 * dot paths.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createReactiveState,
  observable,
  computed,
  batch,
  StateError,
  globalErrorHandler,
} from '../src/reactive-state.js';

let reported;
let originalHandle;

beforeEach(() => {
  reported = [];
  originalHandle = globalErrorHandler.handle;
  globalErrorHandler.handle = (error, context) => reported.push({ error, context });
});

afterEach(() => {
  globalErrorHandler.handle = originalHandle;
});

describe('watching a getter expression', () => {
  // It fired once with `undefined` and never again: the computed behind it
  // was never re-evaluated when what it read changed.
  it('fires with the current value, then on every change of what it reads', () => {
    const state = createReactiveState({ a: 1 });
    const seen = [];

    state.watch(() => state.get('a') * 2, (value, old) => seen.push([value, old]));
    state.set('a', 2);
    state.set('a', 3);

    expect(seen).toEqual([[2, undefined], [4, 2], [6, 4]]);
  });

  it('notifies a watched computed without anyone reading it', () => {
    const a = observable(1);
    const plusHundred = computed(() => a.value + 100);
    const seen = [];

    plusHundred.watch((value) => seen.push(value), { immediate: false });
    a.value = 10;

    expect(seen).toEqual([110]);
  });

  it('does not notify when the computed value did not change', () => {
    const n = observable(2);
    const isEven = computed(() => n.value % 2 === 0);
    const seen = vi.fn();

    isEven.watch(seen, { immediate: false });
    n.value = 4;
    n.value = 5;

    expect(seen.mock.calls).toEqual([[false, true, expect.any(Function)]]);
  });
});

describe('dependency cleanup', () => {
  it('releases a computed from its sources once it is unwatched', () => {
    const source = observable(1);

    for (let i = 0; i < 10000; i++) {
      const derived = computed(() => source.value);
      const unwatch = derived.watch(() => {});
      unwatch();
    }

    expect(source._subscribers.size).toBe(0);
  });

  it('never subscribes a computed that is only read', () => {
    const source = observable(1);
    const derived = computed(() => source.value * 3);

    for (let i = 0; i < 1000; i++) {
      expect(computed(() => source.value).value).toBe(source.value);
    }
    source.value = 2;

    expect(derived.value).toBe(6);
    expect(source._subscribers.size).toBe(0);
  });

  it('follows conditional dependencies', () => {
    const useA = observable(true);
    const a = observable('a1');
    const b = observable('b1');
    const pick = computed(() => (useA.value ? a.value : b.value));
    const seen = [];
    pick.watch((value) => seen.push(value), { immediate: false });

    useA.value = false;
    a.value = 'a2'; // no longer a dependency
    b.value = 'b2';

    expect(seen).toEqual(['b1', 'b2']);
    expect(a._subscribers.size).toBe(0);
  });
});

describe('delete() and clear()', () => {
  it('update computed properties that read the key', () => {
    const state = createReactiveState({ price: 10 });
    const total = state.computed('total', () => (state.get('price') ?? 0) * 2);
    expect(total.value).toBe(20);

    state.delete('price');
    expect(total.value).toBe(0);

    state.set('price', 50);
    expect(total.value).toBe(100);
  });

  it('notify watchers of a computed that reads a cleared key', () => {
    const state = createReactiveState({ items: [1, 2] });
    const seen = [];
    state.watch(() => (state.get('items') ?? []).length, (count) => seen.push(count));

    state.clear();
    state.set('items', [1, 2, 3]);

    expect(seen).toEqual([2, 0, 3]);
    expect(state.toObject()).toEqual({ items: [1, 2, 3] });
    expect(state.has('items')).toBe(true);
  });
});

describe('batching', () => {
  it('runs each watcher once, after every update, with the final values', () => {
    const state = createReactiveState({ a: 0, b: 0 });
    const snapshots = [];
    state.subscribe(['a', 'b'], ({ key, state: snapshot }) => snapshots.push([key, snapshot]), {
      immediate: false,
    });

    state.batch({ a: 1, b: 1 });

    expect(snapshots).toEqual([
      ['a', { a: 1, b: 1 }],
      ['b', { a: 1, b: 1 }],
    ]);
  });

  it('coalesces several writes to one key into one notification', () => {
    const count = observable(0);
    const seen = [];
    count.watch((value, old) => seen.push([value, old]), { immediate: false });

    batch(() => {
      count.value = 1;
      batch(() => {
        count.value = 2;
      });
      count.value = 3;
      expect(seen).toEqual([]);
    });

    expect(seen).toEqual([[3, 0]]);
  });

  it('skips a key that was changed and changed back', () => {
    const flag = observable(false);
    const watcher = vi.fn();
    flag.watch(watcher, { immediate: false });

    batch(() => {
      flag.value = true;
      flag.value = false;
    });

    expect(watcher).not.toHaveBeenCalled();
  });

  it("reports a computed's previous value even if it was read inside the batch", () => {
    const n = observable(1);
    const double = computed(() => n.value * 2);
    const seen = [];
    double.watch((value, old) => seen.push([value, old]), { immediate: false });

    batch(() => {
      n.value = 5;
      expect(double.value).toBe(10);
    });

    expect(seen).toEqual([[10, 2]]);
  });
});

describe('equality and update loops', () => {
  it('does not notify for an identical primitive', () => {
    const value = observable(5);
    const watcher = vi.fn();
    value.watch(watcher, { immediate: false });

    value.value = 5;
    value.value = 5;

    expect(watcher).not.toHaveBeenCalled();
  });

  it('notifies for a re-assigned object only with `deep`', () => {
    const list = [1];
    const deep = observable(list);
    const shallow = observable(list, { deep: false });
    const deepWatcher = vi.fn();
    const shallowWatcher = vi.fn();
    deep.watch(deepWatcher, { immediate: false });
    shallow.watch(shallowWatcher, { immediate: false });

    list.push(2);
    deep.value = list;
    shallow.value = list;

    expect(deepWatcher).toHaveBeenCalledTimes(1);
    expect(shallowWatcher).not.toHaveBeenCalled();
  });

  it('lets a watcher normalise its own value without recursing', () => {
    const name = observable('ada');
    const calls = vi.fn((value) => {
      name.value = value.toUpperCase();
    });
    name.watch(calls, { immediate: false });

    name.value = 'grace';

    expect(name.value).toBe('GRACE');
    expect(calls.mock.calls.map(([value]) => value)).toEqual(['grace', 'GRACE']);
    expect(reported).toEqual([]);
  });

  it('stops and reports a watcher loop that never settles', () => {
    const onError = vi.fn();
    const counter = observable(0, { onError });
    const watcher = vi.fn((value) => {
      counter.value = value + 1;
    });
    counter.watch(watcher, { immediate: false });

    counter.value = 1;

    expect(watcher.mock.calls.length).toBeLessThanOrEqual(101);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'StateError', type: 'update-depth' }),
      expect.objectContaining({ type: 'update-depth' })
    );
  });
});

describe('errors', () => {
  it('throws on a cycle between computed properties', () => {
    const refs = {};
    const first = computed(() => (refs.second ? refs.second.value : 0) + 1);
    refs.second = computed(() => first.value + 1);

    expect(() => first.value).toThrow(StateError);
    expect(() => first.value).toThrow(/Circular dependency/);
  });

  it('isolates a throwing watcher from the others and keeps the computed live', () => {
    const n = observable(1);
    const double = computed(() => n.value * 2);
    const seen = [];
    double.watch(() => {
      throw new Error('boom');
    }, { immediate: false });
    double.watch((value) => seen.push(value), { immediate: false });

    n.value = 2;
    n.value = 3;

    expect(seen).toEqual([4, 6]);
    expect(reported.map(({ error, context }) => [error.message, context.type])).toEqual([
      ['boom', 'watcher-error'],
      ['boom', 'watcher-error'],
    ]);
  });

  it('routes watcher errors to the onError option', () => {
    const onError = vi.fn();
    const state = createReactiveState({ a: 1 }, { onError });
    state.watch('a', () => {
      throw new Error('bad watcher');
    }, { immediate: false });

    state.set('a', 2);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'bad watcher' }),
      expect.objectContaining({ type: 'watcher-error', newValue: 2, oldValue: 1 })
    );
    expect(reported).toEqual([]);
  });

  it('rethrows a getter error on read and recomputes once it is fixed', () => {
    const input = observable(null);
    const length = computed(() => input.value.length);

    expect(() => length.value).toThrow(TypeError);
    input.value = 'abc';

    expect(length.value).toBe(3);
  });
});

describe('dot paths', () => {
  it('sets a nested value immutably and notifies the path and its parent key', () => {
    const state = createReactiveState({ user: { name: 'Ada', age: 36 } });
    const before = state.get('user');
    const seen = [];
    state.watch('user.name', (value, old) => seen.push(['user.name', value, old]), { immediate: false });
    state.watch('user', (value) => seen.push(['user', value]), { immediate: false });

    state.set('user.name', 'John');

    expect(state.get('user.name')).toBe('John');
    expect(state.get('user')).toEqual({ name: 'John', age: 36 });
    expect(before).toEqual({ name: 'Ada', age: 36 });
    expect(seen).toEqual([
      ['user', { name: 'John', age: 36 }],
      ['user.name', 'John', 'Ada'],
    ]);
    expect(state.toObject()).toEqual({ user: { name: 'John', age: 36 } });
  });

  it('does not notify a path watcher when a sibling changes', () => {
    const state = createReactiveState({ user: { name: 'Ada', age: 36 } });
    const watcher = vi.fn();
    state.watch('user.name', watcher, { immediate: false });

    state.set('user.age', 37);

    expect(watcher).not.toHaveBeenCalled();
  });

  it('creates missing objects along the path, and supports has() and delete()', () => {
    const state = createReactiveState({});

    state.set('settings.theme.color', 'teal');
    expect(state.get('settings')).toEqual({ theme: { color: 'teal' } });
    expect(state.has('settings.theme.color')).toBe(true);

    expect(state.delete('settings.theme.color')).toBe(true);
    expect(state.get('settings')).toEqual({ theme: {} });
    expect(state.has('settings.theme.color')).toBe(false);
  });

  it('undoes a path write', () => {
    const state = createReactiveState({ user: { name: 'Ada' } });

    state.set('user.name', 'John');
    state.undo();

    expect(state.get('user')).toEqual({ name: 'Ada' });
  });
});

describe('toObject()', () => {
  it('keeps a "__proto__" key as data instead of swapping the prototype', () => {
    const state = createReactiveState({});
    state.set('__proto__', { isAdmin: true });

    const snapshot = state.toObject();

    expect(Object.keys(snapshot)).toEqual(['__proto__']);
    expect(snapshot.isAdmin).toBeUndefined();
    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
  });
});
