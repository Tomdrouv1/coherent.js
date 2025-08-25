import { renderToString } from '../src/coherent.js';
import { createContextProvider, useContext, clearAllContexts } from '../src/state/state-manager.js';

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

// Run the test
clearAllContexts();
const html = renderToString(NestedContextApp, {
    enableCache: true,
    enableMonitoring: false
});

// Verify the output contains the expected class names in correct quantities
const darkButtonCount = (html.match(/btn-dark/g) || []).length;
const lightButtonCount = (html.match(/btn-light/g) || []).length;

const expectedDarkCount = 2; // outer context + back to outer context
const expectedLightCount = 1; // inner context only

console.log('Context test results:');
console.log('Dark button count:', darkButtonCount, '(expected:', expectedDarkCount, ')');
console.log('Light button count:', lightButtonCount, '(expected:', expectedLightCount, ')');

if (darkButtonCount === expectedDarkCount && lightButtonCount === expectedLightCount) {
  console.log('✅ Context test passed');
} else {
  console.log('❌ Context test failed');
  console.log('Rendered HTML:', html);
}

clearAllContexts();
