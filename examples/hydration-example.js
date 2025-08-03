/**
 * Example demonstrating client-side hydration with Coherent.js
 * 
 * This example shows how to use the hydration utilities to add
 * client-side interactivity to server-rendered components.
 */

import { renderToString } from '../src/rendering/html-renderer.js';
import { hydrate, hydrateAll, makeHydratable } from '../src/client/hydration.js';

// Simple counter component with state
function Counter(props = {}) {
  return {
    div: {
      className: 'counter',
      'data-coherent-component': 'Counter',
      children: [
        {
          h3: {
            text: 'Counter Component'
          }
        },
        {
          span: {
            text: `Count: ${props.count || 0}`
          }
        },
        {
          button: {
            'data-action': 'increment',
            text: 'Increment'
          }
        },
        {
          button: {
            'data-action': 'decrement',
            text: 'Decrement'
          }
        },
        {
          button: {
            'data-action': 'reset',
            text: 'Reset'
          }
        }
      ]
    }
  };
}

// Todo item component with interactivity
function TodoItem(props = {}) {
  return {
    li: {
      className: props.completed ? 'completed' : '',
      'data-coherent-component': 'TodoItem',
      children: [
        {
          input: {
            type: 'checkbox',
            checked: props.completed || false,
            'data-action': 'toggle',
            'data-todo-index': props.index || 0
          }
        },
        {
          span: {
            text: props.text || ''
          }
        }
      ]
    }
  };
}

// Todo list component
function TodoList(props = {}) {
  const todos = props.todos || [];
  return {
    div: {
      className: 'todo-list',
      'data-coherent-component': 'TodoList',
      children: [
        {
          h3: {
            text: 'Todo List'
          }
        },
        {
          ul: {
            children: todos.map((todo, index) => 
              TodoItem({ ...todo, index })
            )
          }
        },
        {
          div: {
            children: [
              {
                input: {
                  id: 'new-todo-input',
                  type: 'text',
                  placeholder: 'Add new todo...'
                }
              },
              {
                button: {
                  'data-action': 'add',
                  'data-target': 'todo',
                  text: 'Add Todo'
                }
              }
            ]
          }
        }
      ]
    }
  };
}

// Make components hydratable
const HydratableCounter = makeHydratable(Counter);
const HydratableTodoItem = makeHydratable(TodoItem);
const HydratableTodoList = makeHydratable(TodoList);

// Server-side rendering example
function renderServerSide() {
  const counterHTML = renderToString(HydratableCounter, { count: 5 });
  const todos = [
    { text: 'Learn Coherent.js', completed: false },
    { text: 'Build awesome apps', completed: true }
  ];
  const todoListHTML = renderToString(HydratableTodoList, { todos });
  
  return {
    counterHTML,
    todoListHTML
  };
}

// Client-side hydration example
function hydrateClientSide() {
  // Mock DOM elements for demonstration (enhanced to work with new hydration)
  const mockCounterElement = {
    tagName: 'DIV',
    className: 'counter',
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  
  const mockTodoListElement = {
    tagName: 'DIV',
    className: 'todo-list',
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  
  // Basic hydration
  const counterInstance = hydrate(mockCounterElement, HydratableCounter, { count: 5 });
  
  // Hydrate multiple elements
  const instances = hydrateAll(
    [mockCounterElement, mockTodoListElement],
    [HydratableCounter, HydratableTodoList],
    [
      { count: 5 },
      { 
        todos: [
          { text: 'Learn Coherent.js', completed: false },
          { text: 'Build awesome apps', completed: true }
        ] 
      }
    ]
  );
  
  // Demonstrate instance methods
  if (counterInstance) {
    // Update the component
    counterInstance.update({ count: 10 });
    
    // Set state (new feature)
    if (counterInstance.setState) {
      counterInstance.setState({ count: 15 });
    }
  }
  
  // Hydrate by selector (would work in a real browser environment)
  // hydrateBySelector('.counter', HydratableCounter, { count: 0 });
  
  return {
    counterInstance,
    instances
  };
}

// Example usage
console.log('=== Server-side Rendering ===');
const serverRendered = renderServerSide();
console.log('Counter HTML:', serverRendered.counterHTML);
console.log('Todo List HTML:', serverRendered.todoListHTML);

console.log('\n=== Client-side Hydration ===');
const hydrated = hydrateClientSide();
console.log('Hydrated instances:', hydrated.instances.length);

// Demonstrate component destruction
if (hydrated.counterInstance) {
  hydrated.counterInstance.destroy();
  console.log('Counter component destroyed');
}

export { renderServerSide, hydrateClientSide };
