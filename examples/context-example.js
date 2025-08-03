import { renderToString } from '../src/coherent.js';
import { createContextProvider, useContext, clearAllContexts } from '../src/state/state-manager.js';

// Simple component that uses context
const ThemedButton = {
  button: {
    className: () => {
      const theme = useContext('theme') || 'light';
      return `btn btn-${theme}`;
    },
    text: 'Click me'
  }
};

// Component that provides context
const AppWithTheme = {
  div: {
    children: [
      // Provide dark theme context
      createContextProvider('theme', 'dark', {
        h1: { text: 'Dark Theme App' }
      }),
      // Button will use dark theme
      ThemedButton,
      // Provide light theme context
      createContextProvider('theme', 'light', {
        h1: { text: 'Light Theme App' }
      }),
      // Button will use light theme
      ThemedButton
    ]
  }
};

// Render the app
console.log('Rendering app with context:');
const html = renderToString(AppWithTheme);
console.log(html);

// Clean up context after rendering
clearAllContexts();
