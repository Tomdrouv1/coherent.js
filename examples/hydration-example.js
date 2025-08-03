/**
 * Example demonstrating client-side hydration with Coherent.js
 * 
 * This example shows how to use the hydration utilities to add
 * client-side interactivity to server-rendered components.
 */

import { renderToString } from '../src/coherent.js';
import { hydrate, hydrateBySelector, makeHydratable } from '../src/client/hydration.js';

// A simple counter component
function Counter({ initialCount = 0 }) {
  return {
    div: {
      className: 'counter',
      'data-coherent-component': 'Counter', // Marker for hydration
      children: [
        {
          span: {
            text: `Count: ${initialCount}`,
            className: 'counter-value'
          }
        },
        {
          button: {
            text: 'Increment',
            className: 'increment-btn',
            // In SSR, we can't attach real event handlers
            // In hydration, these will be replaced with real handlers
            onclick: typeof window !== 'undefined' ? 
              () => console.log('Increment clicked') : 
              null
          }
        },
        {
          button: {
            text: 'Decrement',
            className: 'decrement-btn',
            onclick: typeof window !== 'undefined' ? 
              () => console.log('Decrement clicked') : 
              null
          }
        }
      ]
    }
  };
}

// Make the component hydratable
const HydratableCounter = makeHydratable(Counter);

// Server-side rendering
const serverHtml = renderToString(HydratableCounter({ initialCount: 5 }));

console.log('=== Server-Side Rendered HTML ===');
console.log(serverHtml);

// Client-side hydration (this would run in the browser)
if (typeof window !== 'undefined') {
  console.log('\n=== Client-Side Hydration ===');
  
  // In a real browser environment, we would:
  // 1. Find the server-rendered element
  // 2. Hydrate it with the component
  
  // Simulate finding the element
  const mockElement = {
    tagName: 'DIV',
    className: 'counter',
    querySelector: (selector) => ({
      textContent: 'Count: 5',
      addEventListener: (event, handler) => {
        console.log(`Added ${event} listener`);
      }
    }),
    querySelectorAll: (selector) => []
  };
  
  // Hydrate the component
  const hydratedInstance = hydrate(mockElement, HydratableCounter, { initialCount: 5 });
  
  if (hydratedInstance) {
    console.log('Component successfully hydrated!');
    
    // Simulate updating the component
    hydratedInstance.update({ initialCount: 10 });
    
    // Simulate destroying the component
    // hydratedInstance.destroy();
  }
  
  // Alternative: Hydrate by selector
  console.log('\n--- Hydrating by selector ---');
  const instances = hydrateBySelector('.counter', HydratableCounter, { initialCount: 5 });
  console.log(`Hydrated ${instances.length} components`);
  
  // Enable client events
  console.log('\n--- Enabling client events ---');
  // enableClientEvents(); // This would be called in a real browser environment
}

// Example of hydrating multiple components
function TodoItem({ text, completed = false }) {
  return {
    div: {
      className: `todo-item ${completed ? 'completed' : ''}`,
      'data-coherent-component': 'TodoItem',
      children: [
        {
          input: {
            type: 'checkbox',
            checked: completed,
            className: 'todo-checkbox'
          }
        },
        {
          span: {
            text: text,
            className: 'todo-text'
          }
        }
      ]
    }
  };
}

const HydratableTodoItem = makeHydratable(TodoItem);

// Server-side rendering of multiple components
const todoItems = [
  TodoItem({ text: 'Learn Coherent.js', completed: true }),
  TodoItem({ text: 'Implement hydration', completed: false }),
  TodoItem({ text: 'Build awesome apps', completed: false })
];

const todoListHtml = renderToString({
  div: {
    className: 'todo-list',
    children: todoItems
  }
});

console.log('\n=== Todo List HTML ===');
console.log(todoListHtml);

console.log('\n=== Hydration Example Complete ===');
console.log('In a real browser environment, the server-rendered HTML would be hydrated');
console.log('with client-side interactivity, enabling event handlers and state updates.');
