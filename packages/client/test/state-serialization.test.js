import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  serializeState,
  deserializeState,
  extractState,
  serializeStateWithWarning
} from '../src/hydration/index.js';

describe('serializeState', () => {
  it('serializes simple object to base64', () => {
    const state = { count: 5, name: 'test' };
    const encoded = serializeState(state);
    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe('string');
  });

  it('returns null for null/undefined input', () => {
    expect(serializeState(null)).toBeNull();
    expect(serializeState(undefined)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(serializeState('string')).toBeNull();
    expect(serializeState(42)).toBeNull();
  });

  it('omits function values silently', () => {
    const state = { count: 5, onClick: () => {} };
    const encoded = serializeState(state);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual({ count: 5 });
    expect(decoded.onClick).toBeUndefined();
  });

  it('omits symbol values silently', () => {
    const state = { count: 5, [Symbol('test')]: 'value', sym: Symbol('other') };
    const encoded = serializeState(state);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual({ count: 5 });
  });

  it('omits undefined values silently', () => {
    const state = { count: 5, missing: undefined };
    const encoded = serializeState(state);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual({ count: 5 });
  });

  it('returns null if all values are non-serializable', () => {
    const state = { fn: () => {}, sym: Symbol('test') };
    expect(serializeState(state)).toBeNull();
  });

  it('handles nested objects', () => {
    const state = { user: { name: 'Alice', age: 30 }, items: [1, 2, 3] };
    const encoded = serializeState(state);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual(state);
  });

  it('handles unicode characters', () => {
    const state = { greeting: 'Hello, World!', emoji: 'Hi there' };
    const encoded = serializeState(state);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual(state);
  });

  it('handles special characters in strings', () => {
    const state = { html: '<div class="test">content</div>', quotes: '"\'`' };
    const encoded = serializeState(state);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual(state);
  });

  it('handles arrays with mixed content', () => {
    const state = {
      items: [
        { id: 1, text: 'First' },
        { id: 2, text: 'Second' }
      ]
    };
    const encoded = serializeState(state);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual(state);
  });

  it('handles empty object', () => {
    const state = {};
    expect(serializeState(state)).toBeNull();
  });

  it('handles boolean and null values', () => {
    const state = { active: true, disabled: false, data: null };
    const encoded = serializeState(state);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual(state);
  });
});

describe('deserializeState', () => {
  it('deserializes valid base64 encoded state', () => {
    const original = { count: 10, items: ['a', 'b'] };
    const encoded = serializeState(original);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual(original);
  });

  it('returns null for null/undefined input', () => {
    expect(deserializeState(null)).toBeNull();
    expect(deserializeState(undefined)).toBeNull();
  });

  it('returns null for invalid base64', () => {
    expect(deserializeState('not-valid-base64!!!')).toBeNull();
  });

  it('returns null for valid base64 but invalid JSON', () => {
    const notJson = btoa(encodeURIComponent('not json'));
    expect(deserializeState(notJson)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(deserializeState('')).toBeNull();
  });
});

describe('extractState', () => {
  it('extracts state from element with data-state attribute', () => {
    const state = { count: 5 };
    const encoded = serializeState(state);

    const mockElement = {
      getAttribute: vi.fn().mockReturnValue(encoded)
    };

    const extracted = extractState(mockElement);
    expect(mockElement.getAttribute).toHaveBeenCalledWith('data-state');
    expect(extracted).toEqual(state);
  });

  it('returns null for element without data-state', () => {
    const mockElement = {
      getAttribute: vi.fn().mockReturnValue(null)
    };

    expect(extractState(mockElement)).toBeNull();
  });

  it('returns null for null element', () => {
    expect(extractState(null)).toBeNull();
  });

  it('returns null for element without getAttribute', () => {
    expect(extractState({})).toBeNull();
  });
});

describe('serializeStateWithWarning', () => {
  it('warns when state exceeds 10KB', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Create large state (> 10KB when encoded)
    const largeState = { data: 'x'.repeat(15000) };
    serializeStateWithWarning(largeState, 'TestComponent');

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain('Large state detected');
    expect(consoleSpy.mock.calls[0][0]).toContain('TestComponent');

    consoleSpy.mockRestore();
  });

  it('does not warn for small state', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const smallState = { count: 5 };
    serializeStateWithWarning(smallState, 'TestComponent');

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('Round-trip serialization', () => {
  it('preserves complex nested state through round-trip', () => {
    const complexState = {
      user: {
        id: 123,
        name: 'Test User',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      },
      items: [
        { id: 1, completed: false, text: 'First item' },
        { id: 2, completed: true, text: 'Second item' }
      ],
      filter: 'all',
      count: 42
    };

    const encoded = serializeState(complexState);
    const decoded = deserializeState(encoded);
    expect(decoded).toEqual(complexState);
  });
});
