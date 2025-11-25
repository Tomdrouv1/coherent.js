/**
 * Tests for Coherent.js Testing Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fireEvent,
  fireEvent_click,
  fireEvent_change,
  fireEvent_input,
  fireEvent_keyDown,
  fireEvent_focus,
  waitFor,
  createMock,
  createSpy,
  cleanup,
  within,
  screen,
  userEvent
} from '../src/test-utils.js';

describe('Test Utils', () => {
  beforeEach(() => {
    // Reset screen state before each test
    screen._result = null;
    vi.clearAllTimers();
  });

  afterEach(() => {
    cleanup();
  });

  describe('fireEvent', () => {
    it('should throw error when element is null', () => {
      expect(() => {
        fireEvent(null, 'click');
      }).toThrow('Element is required for fireEvent');
    });

    it('should create event with correct properties', () => {
      const element = { id: 'test' };
      const event = fireEvent(element, 'click', { custom: 'data' });

      expect(event.type).toBe('click');
      expect(event.target).toBe(element);
      expect(event.currentTarget).toBe(element);
      expect(event.custom).toBe('data');
      expect(typeof event.preventDefault).toBe('function');
      expect(typeof event.stopPropagation).toBe('function');
    });

    it("should return the created event", () => {
      const element = { id: "test" };
      const event = fireEvent(element, "change");

      expect(event).toBeDefined();
      expect(event.type).toBe("change");
    });
  });

  describe('Event Helper Functions', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        onclick: vi.fn(),
        onchange: vi.fn(),
        oninput: vi.fn(),
        onsubmit: vi.fn(),
        onkeydown: vi.fn(),
        onkeyup: vi.fn(),
        onfocus: vi.fn(),
        onblur: vi.fn(),
        value: ''
      };
    });

    it('should fire click event with button parameter', () => {
      fireEvent_click(mockElement, { button: 0 });

      expect(mockElement.onclick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'click',
          button: 0
        })
      );
    });

    it('should fire change event with value', () => {
      fireEvent_change(mockElement, 'new value');

      expect(mockElement.onchange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change',
          target: { value: 'new value' }
        })
      );
    });

    it('should fire input event with value', () => {
      fireEvent_input(mockElement, 'input value');

      expect(mockElement.oninput).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          target: { value: 'input value' }
        })
      );
    });

    it('should fire keydown event with key', () => {
      fireEvent_keyDown(mockElement, 'Enter');

      expect(mockElement.onkeydown).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'keydown',
          key: 'Enter'
        })
      );
    });

    it('should fire focus event', () => {
      fireEvent_focus(mockElement);

      expect(mockElement.onfocus).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'focus'
        })
      );
    });
  });

  describe('waitFor', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve when condition becomes true', async () => {
      let conditionMet = false;
      const condition = () => conditionMet;

      setTimeout(() => {
        conditionMet = true;
      }, 100);

      const promise = waitFor(condition, { timeout: 1000, interval: 50 });

      vi.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject when timeout is reached', async () => {
      const condition = () => false;

      const promise = waitFor(condition, { timeout: 1000, interval: 50 });

      vi.advanceTimersByTime(1000);
      await expect(promise).rejects.toThrow('Timeout waiting for condition after 1000ms');
    });

    it('should check condition immediately', async () => {
      const condition = vi.fn(() => true);

      await waitFor(condition);

      expect(condition).toHaveBeenCalledTimes(1);
    });
  });

  describe('createMock', () => {
    it('should create mock function with default behavior', () => {
      const mockFn = createMock();

      expect(typeof mockFn).toBe('function');
      expect(mockFn.mock).toBeDefined();
      expect(mockFn.mock.calls).toEqual([]);
      expect(mockFn.mock.results).toEqual([]);
    });

    it('should record calls and results', () => {
      const mockFn = createMock((x, y) => x + y);

      const result1 = mockFn(1, 2);
      const result2 = mockFn(3, 4);

      expect(result1).toBe(3);
      expect(result2).toBe(7);
      expect(mockFn.mock.calls).toEqual([[1, 2], [3, 4]]);
      expect(mockFn.mock.results).toEqual([
        { type: 'return', value: 3 },
        { type: 'return', value: 7 }
      ]);
    });

    it('should support mockClear', () => {
      const mockFn = createMock(() => 'test');

      mockFn();
      expect(mockFn.mock.calls.length).toBe(1);

      mockFn.mockClear();
      expect(mockFn.mock.calls.length).toBe(0);
      expect(mockFn.mock.results.length).toBe(0);
    });

    it('should support mockReturnValue', () => {
      const mockFn = createMock();

      mockFn.mockReturnValue(42);

      expect(mockFn()).toBe(42);
      expect(mockFn('anything')).toBe(42);
    });

    it('should support mockResolvedValue', async () => {
      const mockFn = createMock();

      mockFn.mockResolvedValue('async result');

      const result = await mockFn();
      expect(result).toBe('async result');
    });
  });

  describe('createSpy', () => {
    it('should create spy on object method', () => {
      const obj = {
        method: vi.fn(() => 'original')
      };

      const spy = createSpy(obj, 'method');

      expect(typeof spy).toBe('function');
      expect(obj.method).toBe(spy);
    });

    it('should spy on method calls', () => {
      const obj = {
        method: vi.fn((x) => x * 2)
      };

      const spy = createSpy(obj, 'method');

      const result = obj.method(5);

      expect(result).toBe(10);
      expect(spy.mock.calls).toEqual([[5]]);
    });

    it('should support mockRestore', () => {
      const originalMethod = vi.fn(() => 'original');
      const obj = {
        method: originalMethod
      };

      const spy = createSpy(obj, 'method');
      spy.mockReturnValue('spied');

      expect(obj.method()).toBe('spied');

      spy.mockRestore();

      expect(obj.method).toBe(originalMethod);
      expect(obj.method()).toBe('original');
    });
  });

  describe('cleanup', () => {
    it('should be a function', () => {
      expect(typeof cleanup).toBe('function');

      expect(() => {
        cleanup();
      }).not.toThrow();
    });
  });

  describe('within', () => {
    it('should create scoped queries', () => {
      const container = {
        getByTestId: vi.fn(() => 'test-element'),
        queryByTestId: vi.fn(() => null),
        getByText: vi.fn(() => 'text-element'),
        queryByText: vi.fn(() => null),
        getByClassName: vi.fn(() => 'class-element'),
        queryByClassName: vi.fn(() => null)
      };

      const scoped = within(container);

      expect(typeof scoped.getByTestId).toBe('function');
      expect(typeof scoped.queryByTestId).toBe('function');
      expect(typeof scoped.getByText).toBe('function');
      expect(typeof scoped.queryByText).toBe('function');
      expect(typeof scoped.getByClassName).toBe('function');
      expect(typeof scoped.queryByClassName).toBe('function');
    });

    it('should delegate calls to container methods', () => {
      const container = {
        getByTestId: vi.fn(() => 'element'),
        queryByTestId: vi.fn(() => null),
        getByText: vi.fn(() => 'text'),
        queryByText: vi.fn(() => null),
        getByClassName: vi.fn(() => 'class'),
        queryByClassName: vi.fn(() => null)
      };

      const scoped = within(container);

      scoped.getByTestId('test');
      scoped.queryByTestId('test');
      scoped.getByText('text');
      scoped.queryByText('text');
      scoped.getByClassName('class');
      scoped.queryByClassName('class');

      expect(container.getByTestId).toHaveBeenCalledWith('test');
      expect(container.queryByTestId).toHaveBeenCalledWith('test');
      expect(container.getByText).toHaveBeenCalledWith('text');
      expect(container.queryByText).toHaveBeenCalledWith('text');
      expect(container.getByClassName).toHaveBeenCalledWith('class');
      expect(container.queryByClassName).toHaveBeenCalledWith('class');
    });
  });

  describe('screen', () => {
    beforeEach(() => {
      screen._result = null;
    });

    it('should throw error when no component rendered for get methods', () => {
      expect(() => {
        screen.getByTestId('test');
      }).toThrow('No component rendered');

      expect(() => {
        screen.getByText('text');
      }).toThrow('No component rendered');

      expect(() => {
        screen.getByClassName('class');
      }).toThrow('No component rendered');
    });

    it('should return null for query methods when no component rendered', () => {
      expect(screen.queryByTestId('test')).toBeNull();
      expect(screen.queryByText('text')).toBeNull();
      expect(screen.queryByClassName('class')).toBeNull();
    });

    it('should support setResult method', () => {
      const result = { id: 'test' };

      screen.setResult(result);
      expect(screen._result).toBe(result);
    });
  });

  describe('userEvent', () => {
    it('should have type function', () => {
      expect(typeof userEvent.type).toBe('function');
    });

    it('should have click function', () => {
      expect(typeof userEvent.click).toBe('function');
    });

    it('should have dblClick function', () => {
      expect(typeof userEvent.dblClick).toBe('function');
    });

    it('should have clear function', () => {
      expect(typeof userEvent.clear).toBe('function');
    });

    it('should have selectOptions function', () => {
      expect(typeof userEvent.selectOptions).toBe('function');
    });

    it('should have tab function', () => {
      expect(typeof userEvent.tab).toBe('function');
    });
  });
});
