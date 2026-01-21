/**
 * Event Delegation Tests for Coherent.js Client
 *
 * Tests the event delegation system that routes events via data attributes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EventDelegation,
  HandlerRegistry,
  wrapEvent,
} from '../src/events/index.js';

// DOM shims for Node environment
beforeEach(() => {
  global.document = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
});

afterEach(() => {
  delete global.document;
});

describe('HandlerRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new HandlerRegistry();
  });

  it('register() stores handler with component ref', () => {
    const handler = vi.fn();
    const componentRef = { state: { count: 0 } };

    registry.register('btn-click', handler, componentRef);

    expect(registry.size).toBe(1);
    expect(registry.has('btn-click')).toBe(true);
  });

  it('get() returns handler entry', () => {
    const handler = vi.fn();
    const componentRef = { state: { count: 0 } };

    registry.register('btn-click', handler, componentRef);
    const entry = registry.get('btn-click');

    expect(entry).toBeDefined();
    expect(entry.handler).toBe(handler);
    expect(entry.componentRef).toBe(componentRef);
  });

  it('get() returns undefined for unknown ID', () => {
    const entry = registry.get('non-existent');
    expect(entry).toBeUndefined();
  });

  it('unregister() removes handler', () => {
    const handler = vi.fn();
    registry.register('btn-click', handler);

    expect(registry.has('btn-click')).toBe(true);

    const result = registry.unregister('btn-click');

    expect(result).toBe(true);
    expect(registry.has('btn-click')).toBe(false);
    expect(registry.size).toBe(0);
  });

  it('unregister() returns false for unknown ID', () => {
    const result = registry.unregister('non-existent');
    expect(result).toBe(false);
  });

  it('clear() removes all handlers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    registry.register('btn-click-1', handler1);
    registry.register('btn-click-2', handler2);

    expect(registry.size).toBe(2);

    registry.clear();

    expect(registry.size).toBe(0);
    expect(registry.has('btn-click-1')).toBe(false);
    expect(registry.has('btn-click-2')).toBe(false);
  });

  it('getByComponent() returns handler IDs for specific component', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();
    const componentA = { name: 'ComponentA' };
    const componentB = { name: 'ComponentB' };

    registry.register('a-click', handler1, componentA);
    registry.register('a-submit', handler2, componentA);
    registry.register('b-click', handler3, componentB);

    const idsForA = registry.getByComponent(componentA);
    const idsForB = registry.getByComponent(componentB);

    expect(idsForA).toHaveLength(2);
    expect(idsForA).toContain('a-click');
    expect(idsForA).toContain('a-submit');
    expect(idsForB).toHaveLength(1);
    expect(idsForB).toContain('b-click');
  });

  it('getByComponent() returns empty array for null componentRef', () => {
    const handler = vi.fn();
    registry.register('btn-click', handler, null);

    const ids = registry.getByComponent(null);
    expect(ids).toEqual([]);
  });

  it('register() throws for non-function handler', () => {
    expect(() => {
      registry.register('btn-click', 'not a function');
    }).toThrow('Handler must be a function');
  });
});

describe('wrapEvent', () => {
  it('returns object with originalEvent and target', () => {
    const originalEvent = { type: 'click' };
    const target = { tagName: 'BUTTON' };

    const wrapped = wrapEvent(originalEvent, target);

    expect(wrapped.originalEvent).toBe(originalEvent);
    expect(wrapped.target).toBe(target);
  });

  it('preventDefault() calls originalEvent.preventDefault()', () => {
    const originalEvent = {
      type: 'click',
      preventDefault: vi.fn(),
    };
    const target = { tagName: 'BUTTON' };

    const wrapped = wrapEvent(originalEvent, target);
    wrapped.preventDefault();

    expect(originalEvent.preventDefault).toHaveBeenCalledOnce();
  });

  it('stopPropagation() calls originalEvent.stopPropagation()', () => {
    const originalEvent = {
      type: 'click',
      stopPropagation: vi.fn(),
    };
    const target = { tagName: 'BUTTON' };

    const wrapped = wrapEvent(originalEvent, target);
    wrapped.stopPropagation();

    expect(originalEvent.stopPropagation).toHaveBeenCalledOnce();
  });

  it('includes component context when componentRef provided', () => {
    const originalEvent = { type: 'click' };
    const target = { tagName: 'BUTTON' };
    const componentRef = {
      component: function MyComponent() {},
      state: { count: 5 },
      setState: vi.fn(),
      props: { title: 'Test' },
    };

    const wrapped = wrapEvent(originalEvent, target, componentRef);

    expect(wrapped.component).toBe(componentRef.component);
    expect(wrapped.state).toBe(componentRef.state);
    expect(wrapped.setState).toBe(componentRef.setState);
    expect(wrapped.props).toBe(componentRef.props);
  });

  it('handles missing componentRef gracefully', () => {
    const originalEvent = { type: 'click' };
    const target = { tagName: 'BUTTON' };

    const wrapped = wrapEvent(originalEvent, target);

    expect(wrapped.component).toBeNull();
    expect(wrapped.state).toBeNull();
    expect(wrapped.setState).toBeNull();
    expect(wrapped.props).toBeNull();
  });

  it('handles partial componentRef gracefully', () => {
    const originalEvent = { type: 'click' };
    const target = { tagName: 'BUTTON' };
    const componentRef = {
      state: { count: 5 },
      // Missing component, setState, props
    };

    const wrapped = wrapEvent(originalEvent, target, componentRef);

    expect(wrapped.component).toBeNull();
    expect(wrapped.state).toEqual({ count: 5 });
    expect(wrapped.setState).toBeNull();
    expect(wrapped.props).toBeNull();
  });
});

describe('EventDelegation', () => {
  let delegation;
  let registry;
  let mockRoot;

  beforeEach(() => {
    registry = new HandlerRegistry();
    delegation = new EventDelegation(registry);

    mockRoot = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    if (delegation.isInitialized()) {
      delegation.destroy();
    }
  });

  it('initialize() attaches listeners for all event types', () => {
    delegation.initialize(mockRoot);

    expect(mockRoot.addEventListener).toHaveBeenCalledTimes(9);

    const eventTypes = [
      'click',
      'change',
      'input',
      'submit',
      'focus',
      'blur',
      'keydown',
      'keyup',
      'keypress',
    ];
    eventTypes.forEach((eventType) => {
      expect(mockRoot.addEventListener).toHaveBeenCalledWith(
        eventType,
        expect.any(Function),
        expect.any(Object)
      );
    });
  });

  it('initialize() uses capture phase for focus/blur', () => {
    delegation.initialize(mockRoot);

    const calls = mockRoot.addEventListener.mock.calls;

    const focusCall = calls.find((call) => call[0] === 'focus');
    const blurCall = calls.find((call) => call[0] === 'blur');
    const clickCall = calls.find((call) => call[0] === 'click');

    expect(focusCall[2].capture).toBe(true);
    expect(blurCall[2].capture).toBe(true);
    expect(clickCall[2].capture).toBe(false);
  });

  it('initialize() uses passive: false only for submit', () => {
    delegation.initialize(mockRoot);

    const calls = mockRoot.addEventListener.mock.calls;

    const submitCall = calls.find((call) => call[0] === 'submit');
    const clickCall = calls.find((call) => call[0] === 'click');

    expect(submitCall[2].passive).toBe(false);
    expect(clickCall[2].passive).toBe(true);
  });

  it('initialize() can only be called once (idempotent)', () => {
    delegation.initialize(mockRoot);
    delegation.initialize(mockRoot);
    delegation.initialize(mockRoot);

    // Should only attach listeners once
    expect(mockRoot.addEventListener).toHaveBeenCalledTimes(9);
  });

  it('handleEvent() finds element with data attribute and calls handler', () => {
    const handler = vi.fn();
    const componentRef = { state: { count: 0 } };
    registry.register('btn-1', handler, componentRef);

    const targetElement = {
      closest: vi.fn().mockReturnValue({
        getAttribute: vi.fn().mockReturnValue('btn-1'),
      }),
    };

    const mockEvent = {
      type: 'click',
      target: targetElement,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    delegation.handleEvent(mockEvent, 'click');

    expect(targetElement.closest).toHaveBeenCalledWith('[data-coherent-click]');
    expect(handler).toHaveBeenCalledOnce();

    // Verify wrapped event was passed
    const wrappedEvent = handler.mock.calls[0][0];
    expect(wrappedEvent.originalEvent).toBe(mockEvent);
    expect(wrappedEvent.state).toBe(componentRef.state);
  });

  it('handleEvent() does nothing if no matching element', () => {
    const handler = vi.fn();
    registry.register('btn-1', handler);

    const targetElement = {
      closest: vi.fn().mockReturnValue(null), // No match
    };

    const mockEvent = {
      type: 'click',
      target: targetElement,
    };

    delegation.handleEvent(mockEvent, 'click');

    expect(handler).not.toHaveBeenCalled();
  });

  it('handleEvent() does nothing if handler not registered', () => {
    const targetElement = {
      closest: vi.fn().mockReturnValue({
        getAttribute: vi.fn().mockReturnValue('unknown-handler'),
      }),
    };

    const mockEvent = {
      type: 'click',
      target: targetElement,
    };

    // Should not throw, just do nothing
    expect(() => {
      delegation.handleEvent(mockEvent, 'click');
    }).not.toThrow();
  });

  it('handleEvent() handles target without closest method', () => {
    const mockEvent = {
      type: 'click',
      target: {}, // No closest method
    };

    // Should not throw
    expect(() => {
      delegation.handleEvent(mockEvent, 'click');
    }).not.toThrow();
  });

  it('destroy() removes all listeners and clears registry', () => {
    const handler = vi.fn();
    registry.register('btn-1', handler);

    delegation.initialize(mockRoot);
    delegation.destroy();

    expect(mockRoot.removeEventListener).toHaveBeenCalledTimes(9);
    expect(registry.size).toBe(0);
    expect(delegation.isInitialized()).toBe(false);
  });

  it('destroy() is safe to call when not initialized', () => {
    expect(() => {
      delegation.destroy();
    }).not.toThrow();
  });

  it('isInitialized() returns correct state', () => {
    expect(delegation.isInitialized()).toBe(false);

    delegation.initialize(mockRoot);
    expect(delegation.isInitialized()).toBe(true);

    delegation.destroy();
    expect(delegation.isInitialized()).toBe(false);
  });
});

describe('EventDelegation - Integration', () => {
  let delegation;
  let registry;
  let eventListeners;

  beforeEach(() => {
    registry = new HandlerRegistry();
    delegation = new EventDelegation(registry);
    eventListeners = new Map();

    // Create a more realistic mock DOM
    global.document = {
      addEventListener: vi.fn((type, handler, options) => {
        eventListeners.set(type, { handler, options });
      }),
      removeEventListener: vi.fn((type) => {
        eventListeners.delete(type);
      }),
    };
  });

  afterEach(() => {
    if (delegation.isInitialized()) {
      delegation.destroy();
    }
    delete global.document;
  });

  it('full integration: register handler, simulate event, verify call', () => {
    // Setup
    const mockSetState = vi.fn();
    const handler = vi.fn((event) => {
      event.setState({ count: event.state.count + 1 });
    });
    const componentRef = {
      component: function Counter() {},
      state: { count: 0 },
      setState: mockSetState,
      props: { initial: 0 },
    };

    registry.register('counter-increment', handler, componentRef);
    delegation.initialize();

    // Create mock event with element containing data attribute
    const buttonElement = {
      getAttribute: vi.fn().mockReturnValue('counter-increment'),
    };

    const targetElement = {
      closest: vi.fn().mockReturnValue(buttonElement),
    };

    const clickEvent = {
      type: 'click',
      target: targetElement,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    };

    // Simulate the click by calling the registered handler
    const clickListener = eventListeners.get('click');
    expect(clickListener).toBeDefined();

    // Call handleEvent directly (simulating what the listener does)
    delegation.handleEvent(clickEvent, 'click');

    // Verify
    expect(handler).toHaveBeenCalledOnce();
    expect(mockSetState).toHaveBeenCalledWith({ count: 1 });

    const wrappedEvent = handler.mock.calls[0][0];
    expect(wrappedEvent.component.name).toBe('Counter');
    expect(wrappedEvent.state.count).toBe(0);
    expect(wrappedEvent.props.initial).toBe(0);
  });
});

describe('EventDelegation - DOM survival', () => {
  let delegation;
  let registry;

  beforeEach(() => {
    registry = new HandlerRegistry();
    delegation = new EventDelegation(registry);
  });

  afterEach(() => {
    if (delegation.isInitialized()) {
      delegation.destroy();
    }
  });

  it('handler survives when target element is replaced', () => {
    // This test demonstrates that because handlers are stored by ID (not by element),
    // they work even when the DOM element is completely replaced

    const handler = vi.fn();
    registry.register('persistent-btn', handler);

    // Simulate original element
    const originalElement = {
      getAttribute: vi.fn().mockReturnValue('persistent-btn'),
    };

    const event1 = {
      type: 'click',
      target: {
        closest: vi.fn().mockReturnValue(originalElement),
      },
    };

    delegation.handleEvent(event1, 'click');
    expect(handler).toHaveBeenCalledTimes(1);

    // Simulate NEW element (after DOM replacement) with same data attribute
    const newElement = {
      getAttribute: vi.fn().mockReturnValue('persistent-btn'),
    };

    const event2 = {
      type: 'click',
      target: {
        closest: vi.fn().mockReturnValue(newElement),
      },
    };

    delegation.handleEvent(event2, 'click');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('handler survives when parent element innerHTML is changed', () => {
    // The key insight: handler is registered by ID, not by element reference
    // So even if container.innerHTML replaces all children, the handler still fires

    const handler = vi.fn();
    registry.register('list-item-click', handler);

    // First version of the element
    const firstVersionElement = {
      getAttribute: vi.fn().mockReturnValue('list-item-click'),
    };

    delegation.handleEvent(
      {
        type: 'click',
        target: { closest: vi.fn().mockReturnValue(firstVersionElement) },
      },
      'click'
    );

    expect(handler).toHaveBeenCalledTimes(1);

    // After innerHTML replacement - completely new element object
    const secondVersionElement = {
      getAttribute: vi.fn().mockReturnValue('list-item-click'),
    };

    delegation.handleEvent(
      {
        type: 'click',
        target: { closest: vi.fn().mockReturnValue(secondVersionElement) },
      },
      'click'
    );

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('handler survives DOM reconciliation (element moved)', () => {
    const handler = vi.fn();
    registry.register('movable-item', handler);

    // Original position
    const element = {
      getAttribute: vi.fn().mockReturnValue('movable-item'),
    };

    delegation.handleEvent(
      {
        type: 'click',
        target: { closest: vi.fn().mockReturnValue(element) },
      },
      'click'
    );

    expect(handler).toHaveBeenCalledTimes(1);

    // After list reorder - same logical element, different position
    delegation.handleEvent(
      {
        type: 'click',
        target: { closest: vi.fn().mockReturnValue(element) },
      },
      'click'
    );

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('multiple elements with same handler ID share handler', () => {
    const handler = vi.fn();
    registry.register('shared-action', handler);

    // First element with this handler ID
    const element1 = {
      getAttribute: vi.fn().mockReturnValue('shared-action'),
    };

    // Second element with same handler ID
    const element2 = {
      getAttribute: vi.fn().mockReturnValue('shared-action'),
    };

    delegation.handleEvent(
      {
        type: 'click',
        target: { closest: vi.fn().mockReturnValue(element1) },
      },
      'click'
    );

    delegation.handleEvent(
      {
        type: 'click',
        target: { closest: vi.fn().mockReturnValue(element2) },
      },
      'click'
    );

    expect(handler).toHaveBeenCalledTimes(2);

    // Both calls use the same handler function
    expect(handler.mock.calls[0][0].target).toBe(element1);
    expect(handler.mock.calls[1][0].target).toBe(element2);
  });

  it('different handler IDs call different handlers', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    registry.register('action-1', handler1);
    registry.register('action-2', handler2);

    const element1 = {
      getAttribute: vi.fn().mockReturnValue('action-1'),
    };

    const element2 = {
      getAttribute: vi.fn().mockReturnValue('action-2'),
    };

    delegation.handleEvent(
      {
        type: 'click',
        target: { closest: vi.fn().mockReturnValue(element1) },
      },
      'click'
    );

    delegation.handleEvent(
      {
        type: 'click',
        target: { closest: vi.fn().mockReturnValue(element2) },
      },
      'click'
    );

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
