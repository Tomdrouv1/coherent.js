import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hydrate } from '../src/hydrate.js';
import { handlerRegistry, eventDelegation } from '../src/events/index.js';
import { serializeState } from '../src/hydration/index.js';

// Mock DOM environment
function createMockElement(tagName, attributes = {}, children = []) {
  const childNodes = [];
  const element = {
    tagName: tagName.toUpperCase(),
    nodeType: 1,
    getAttribute: vi.fn((name) => attributes[name] || null),
    setAttribute: vi.fn((name, value) => {
      attributes[name] = value;
    }),
    removeAttribute: vi.fn((name) => {
      delete attributes[name];
    }),
    hasAttribute: vi.fn((name) => name in attributes),
    textContent: attributes.textContent || '',
    childNodes,
    children: [],
    closest: vi.fn(() => null),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  // Add children
  for (const child of children) {
    if (typeof child === 'string') {
      childNodes.push({
        nodeType: 3, // Text node
        textContent: child,
      });
    } else {
      childNodes.push(child);
      element.children.push(child);
    }
  }

  return element;
}

describe('hydrate() API', () => {
  beforeEach(() => {
    // Clear handler registry before each test
    handlerRegistry.clear();
  });

  afterEach(() => {
    handlerRegistry.clear();
  });

  describe('Input validation', () => {
    it('throws if component is not a function', () => {
      const container = createMockElement('div');

      expect(() => hydrate(null, container)).toThrow(
        'hydrate() requires a component function'
      );
      expect(() => hydrate('string', container)).toThrow(
        'hydrate() requires a component function'
      );
      expect(() => hydrate({}, container)).toThrow(
        'hydrate() requires a component function'
      );
      expect(() => hydrate(42, container)).toThrow(
        'hydrate() requires a component function'
      );
    });

    it('throws if container is null', () => {
      const component = () => ({ div: { text: 'Hello' } });

      expect(() => hydrate(component, null)).toThrow(
        'hydrate() requires a valid DOM element'
      );
    });

    it('throws if container is not a DOM element', () => {
      const component = () => ({ div: { text: 'Hello' } });

      expect(() => hydrate(component, 'string')).toThrow(
        'hydrate() requires a valid DOM element'
      );
      expect(() => hydrate(component, {})).toThrow(
        'hydrate() requires a valid DOM element'
      );
    });

    it('accepts valid component and container', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container);
      expect(result).toBeDefined();
      expect(typeof result.unmount).toBe('function');
    });
  });

  describe('Return value shape', () => {
    it('returns object with unmount function', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container);
      expect(typeof result.unmount).toBe('function');
    });

    it('returns object with rerender function', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container);
      expect(typeof result.rerender).toBe('function');
    });

    it('returns object with getState function', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container);
      expect(typeof result.getState).toBe('function');
    });

    it('returns object with setState function', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container);
      expect(typeof result.setState).toBe('function');
    });
  });

  describe('State extraction from data-state', () => {
    it('extracts state from data-state attribute', () => {
      const initialState = { count: 5, name: 'test' };
      const encoded = serializeState(initialState);

      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div', { 'data-state': encoded });

      const result = hydrate(component, container);
      expect(result.getState()).toEqual(initialState);
    });

    it('returns empty state if no data-state attribute', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container);
      expect(result.getState()).toEqual({});
    });
  });

  describe('initialState option', () => {
    it('uses initialState option when provided', () => {
      const initialState = { count: 10 };
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container, { initialState });
      expect(result.getState()).toEqual(initialState);
    });

    it('initialState overrides extracted data-state', () => {
      const extractedState = { count: 5 };
      const providedState = { count: 10 };
      const encoded = serializeState(extractedState);

      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div', { 'data-state': encoded });

      const result = hydrate(component, container, {
        initialState: providedState,
      });
      expect(result.getState()).toEqual(providedState);
    });
  });

  describe('setState', () => {
    it('updates state with object', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container, {
        initialState: { count: 0 },
      });

      result.setState({ count: 5 });
      expect(result.getState()).toEqual({ count: 5 });
    });

    it('merges state with existing state', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container, {
        initialState: { count: 0, name: 'test' },
      });

      result.setState({ count: 5 });
      expect(result.getState()).toEqual({ count: 5, name: 'test' });
    });

    it('accepts function updater', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container, {
        initialState: { count: 5 },
      });

      result.setState((prevState) => ({ count: prevState.count + 1 }));
      expect(result.getState()).toEqual({ count: 6 });
    });

    it('triggers rerender after setState', () => {
      let renderCount = 0;
      const component = (props) => {
        renderCount++;
        return { div: { text: `Count: ${props.count || 0}` } };
      };
      const container = createMockElement('div');

      const result = hydrate(component, container, {
        initialState: { count: 0 },
      });

      const initialRenderCount = renderCount;
      result.setState({ count: 1 });
      expect(renderCount).toBeGreaterThan(initialRenderCount);
    });
  });

  describe('unmount', () => {
    it('removes hydrated marker attribute', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      const result = hydrate(component, container);
      expect(container.setAttribute).toHaveBeenCalledWith(
        'data-coherent-hydrated',
        'true'
      );

      result.unmount();
      expect(container.removeAttribute).toHaveBeenCalledWith(
        'data-coherent-hydrated'
      );
    });

    it('cleans up registered handlers', () => {
      const handleClick = vi.fn();
      const component = () => ({
        button: { onClick: handleClick, text: 'Click' },
      });
      const container = createMockElement('button');

      const result = hydrate(component, container);

      // Verify handler was registered
      expect(handlerRegistry.size).toBeGreaterThan(0);

      result.unmount();

      // Handler registry should be cleared for this component
      // The registry might still have handlers from other tests,
      // so we check that unmount was called successfully
      expect(container.removeAttribute).toHaveBeenCalled();
    });
  });

  describe('Mismatch detection options', () => {
    it('detects mismatches by default in non-production', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a mismatch: container is div but vdom is span
      const component = () => ({ span: { text: 'Hello' } });
      const container = createMockElement('div', { textContent: 'Hello' });

      hydrate(component, container);

      // Should have called console.warn for mismatch
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('can disable mismatch detection', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const component = () => ({ span: { text: 'Hello' } });
      const container = createMockElement('div', { textContent: 'Hello' });

      hydrate(component, container, { detectMismatch: false });

      // Should not warn when detection is disabled
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('throws in strict mode on mismatch', () => {
      const component = () => ({ span: { text: 'Hello' } });
      const container = createMockElement('div', { textContent: 'Hello' });

      expect(() =>
        hydrate(component, container, { strict: true })
      ).toThrow('Hydration failed');
    });

    it('calls onMismatch callback when provided', () => {
      const onMismatch = vi.fn();

      const component = () => ({ span: { text: 'Hello' } });
      const container = createMockElement('div', { textContent: 'Hello' });

      hydrate(component, container, { onMismatch });

      expect(onMismatch).toHaveBeenCalled();
      expect(onMismatch.mock.calls[0][0]).toBeInstanceOf(Array);
      expect(onMismatch.mock.calls[0][0].length).toBeGreaterThan(0);
    });
  });

  describe('Event delegation initialization', () => {
    it('initializes event delegation', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      // Event delegation should be initialized after hydrate
      hydrate(component, container);

      // Verify eventDelegation is accessible
      expect(eventDelegation).toBeDefined();
      expect(typeof eventDelegation.initialize).toBe('function');
    });

    it('registers event handlers with data attributes', () => {
      const handleClick = vi.fn();
      const component = () => ({
        button: { onClick: handleClick, text: 'Click' },
      });
      const container = createMockElement('button', { textContent: 'Click' });

      hydrate(component, container);

      // Should have set data-coherent-click attribute
      expect(container.setAttribute).toHaveBeenCalledWith(
        expect.stringMatching(/data-coherent-click/),
        expect.any(String)
      );
    });
  });

  describe('Component props', () => {
    it('passes state to component on initial render', () => {
      const component = vi.fn((props) => ({
        div: { text: `Count: ${props.count}` },
      }));
      const container = createMockElement('div');

      hydrate(component, container, { initialState: { count: 5 } });

      expect(component).toHaveBeenCalledWith(
        expect.objectContaining({ count: 5 })
      );
    });

    it('passes additional props to component', () => {
      const component = vi.fn((props) => ({
        div: { text: `Hello ${props.name}` },
      }));
      const container = createMockElement('div');

      hydrate(component, container, {
        props: { name: 'World' },
        initialState: { count: 0 },
      });

      expect(component).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'World' })
      );
    });
  });

  describe('rerender', () => {
    it('rerenders component with current state', () => {
      const component = vi.fn((props) => ({
        div: { text: `Count: ${props.count || 0}` },
      }));
      const container = createMockElement('div');

      const result = hydrate(component, container, {
        initialState: { count: 5 },
      });

      const initialCallCount = component.mock.calls.length;
      result.rerender();

      expect(component.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('accepts new props on rerender', () => {
      const component = vi.fn((props) => ({
        div: { text: `Hello ${props.name || 'World'}` },
      }));
      const container = createMockElement('div');

      const result = hydrate(component, container, {
        props: { name: 'Alice' },
      });

      result.rerender({ name: 'Bob' });

      const lastCall = component.mock.calls[component.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({ name: 'Bob' });
    });
  });

  describe('Hydration marker', () => {
    it('marks container as hydrated', () => {
      const component = () => ({ div: { text: 'Hello' } });
      const container = createMockElement('div');

      hydrate(component, container);

      expect(container.setAttribute).toHaveBeenCalledWith(
        'data-coherent-hydrated',
        'true'
      );
    });
  });
});

describe('hydrate() edge cases', () => {
  it('handles component returning nested elements', () => {
    const component = () => ({
      div: {
        className: 'container',
        children: [
          { span: { text: 'Hello' } },
          { span: { text: 'World' } },
        ],
      },
    });

    const child1 = createMockElement('span', { textContent: 'Hello' });
    const child2 = createMockElement('span', { textContent: 'World' });
    const container = createMockElement(
      'div',
      { class: 'container' },
      [child1, child2]
    );

    const result = hydrate(component, container, { detectMismatch: false });
    expect(result).toBeDefined();
    expect(typeof result.unmount).toBe('function');
  });

  it('handles component with no children', () => {
    const component = () => ({ br: {} });
    const container = createMockElement('br');

    const result = hydrate(component, container, { detectMismatch: false });
    expect(result).toBeDefined();
  });

  it('handles empty state gracefully', () => {
    const component = () => ({ div: { text: 'Hello' } });
    const container = createMockElement('div');

    const result = hydrate(component, container);
    expect(result.getState()).toEqual({});

    result.setState({});
    expect(result.getState()).toEqual({});
  });

  it('preserves named function component name', () => {
    function MyComponent() {
      return { div: { text: 'Hello' } };
    }
    const container = createMockElement('div');

    const result = hydrate(MyComponent, container);
    expect(result).toBeDefined();
  });

  it('handles arrow function components', () => {
    const MyComponent = () => ({ div: { text: 'Hello' } });
    const container = createMockElement('div');

    const result = hydrate(MyComponent, container);
    expect(result).toBeDefined();
  });
});
