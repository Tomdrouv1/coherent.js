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
const html = renderToString(NestedContextApp);

// Verify the output contains the expected class names
const hasDarkButton = html.includes('btn-dark');
const hasLightButton = html.includes('btn-light');

console.log('Context test results:');
console.log('Has dark button:', hasDarkButton);
console.log('Has light button:', hasLightButton);

if (hasDarkButton && hasLightButton) {
  console.log('✅ Context test passed');
} else {
  console.log('❌ Context test failed');
}

clearAllContexts();
