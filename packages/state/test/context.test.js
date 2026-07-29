import { render } from '@coherent.js/core';
import {
  createContextProvider,
  useContext,
  clearAllContexts,
  provideContext,
  restoreContext,
  globalStateManager
} from '../src/state-manager.js';
import { describe, it, expect, beforeEach } from 'vitest';

// Test component that uses context
const ThemedButton = {
  button: {
    className: () => {
      const theme = useContext('theme') || 'default';
      return `btn-${theme}`;
    },
    text: 'Click me'
  }
};

// Test nested context providers
const NestedContextApp = {
  div: {
    children: [
      // Outer context
      createContextProvider('theme', 'dark', {
        section: {
          children: [
            {
              h1: { text: 'Outer Context' }
            },
            ThemedButton,
            // Inner context
            createContextProvider('theme', 'light', {
              div: {
                children: [
                  {
                    h2: { text: 'Inner Context' }
                  },
                  ThemedButton
                ]
              }
            }),
            // Back to outer context
            ThemedButton
          ]
        }
      })
    ]
  }
};

describe('Context Provider', () => {
  it('should handle nested context providers correctly', () => {
    // Run the test
    clearAllContexts();
    const html = render(NestedContextApp);

    // Verify the output contains the expected class names in correct quantities
    const darkButtonCount = (html.match(/btn-dark/g) || []).length;
    const lightButtonCount = (html.match(/btn-light/g) || []).length;

    const expectedDarkCount = 2; // outer context + back to outer context
    const expectedLightCount = 1; // inner context only

    expect(darkButtonCount).toBe(expectedDarkCount);
    expect(lightButtonCount).toBe(expectedLightCount);

    clearAllContexts();
  });
});

/**
 * Regression: clearAllContexts() cleared only the undo stacks, never the
 * values. useContext() reads globalState — module-level, so shared by every
 * render in the process — which meant a context provided while rendering one
 * request stayed readable while rendering the next.
 */
describe('clearAllContexts', () => {
  beforeEach(() => {
    clearAllContexts();
    globalStateManager.clear();
  });

  it('removes provided contexts', () => {
    provideContext('currentUser', { id: 42 });
    expect(useContext('currentUser')).toEqual({ id: 42 });

    clearAllContexts();

    expect(useContext('currentUser')).toBeUndefined();
  });

  it('does not leak a context into the next render', () => {
    // Render one: an authenticated request.
    provideContext('currentUser', { id: 42, email: 'alice@example.com' });
    clearAllContexts();

    // Render two: a different, anonymous visitor.
    expect(useContext('currentUser')).toBeUndefined();
  });

  it('clears every provided key, not just the most recent', () => {
    provideContext('theme', 'dark');
    provideContext('locale', 'fr');
    provideContext('currentUser', { id: 7 });

    clearAllContexts();

    expect(useContext('theme')).toBeUndefined();
    expect(useContext('locale')).toBeUndefined();
    expect(useContext('currentUser')).toBeUndefined();
  });

  it('clears nested providers of the same key', () => {
    provideContext('theme', 'dark');
    provideContext('theme', 'light');

    clearAllContexts();

    expect(useContext('theme')).toBeUndefined();
  });

  // What the previous implementation was trying to protect by clearing
  // nothing: globalState holds more than contexts.
  it('leaves unrelated global state alone', () => {
    globalStateManager.set('requestId', 'abc-123');
    provideContext('theme', 'dark');

    clearAllContexts();

    expect(globalStateManager.get('requestId')).toBe('abc-123');
    expect(useContext('theme')).toBeUndefined();
  });

  it('restores a pre-existing value rather than deleting the key', () => {
    globalStateManager.set('theme', 'system');
    provideContext('theme', 'dark');
    expect(useContext('theme')).toBe('dark');

    clearAllContexts();

    expect(useContext('theme')).toBe('system');
  });

  it('leaves restoreContext harmless afterwards', () => {
    provideContext('theme', 'dark');
    clearAllContexts();

    // The stack is gone, so this is a no-op rather than resurrecting a value.
    restoreContext('theme');

    expect(useContext('theme')).toBeUndefined();
  });
});
