import { render } from '@coherent.js/core';
import { createContextProvider, useContext, clearAllContexts } from '../src/state-manager.js';
import { describe, it, expect } from 'vitest';

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
