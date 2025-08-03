/**
 * Comprehensive hydration demo for Coherent.js
 * 
 * This example demonstrates a complete client-server workflow with hydration.
 */

import { renderToString } from '../src/coherent.js';
import { hydrate, makeHydratable } from '../src/client/hydration.js';

// A counter component with state
function Counter({ initialCount = 0, id = 'counter' }) {
  return {
    div: {
      id: `counter-${id}`,
      className: 'counter-widget',
      'data-component': 'Counter',
      'data-props': JSON.stringify({ initialCount, id }),
      children: [
        {
          h3: {
            text: 'Interactive Counter'
          }
        },
        {
          div: {
            className: 'counter-display',
            children: [
              {
                span: {
                  text: `Count: ${initialCount}`,
                  id: `count-${id}`
                }
              }
            ]
          }
        },
        {
          div: {
            className: 'counter-controls',
            children: [
              {
                button: {
                  text: '+',
                  className: 'btn increment',
                  'data-action': 'increment',
                  'data-target': id
                }
              },
              {
                button: {
                  text: '-',
                  className: 'btn decrement',
                  'data-action': 'decrement',
                  'data-target': id
                }
              },
              {
                button: {
                  text: 'Reset',
                  className: 'btn reset',
                  'data-action': 'reset',
                  'data-target': id
                }
              }
            ]
          }
        }
      ]
    }
  };
}

// A todo list component
function TodoList({ todos = [], id = 'todo' }) {
  return {
  div: {
    id: `todo-${id}`,
    className: 'todo-widget',
    'data-component': 'TodoList',
    'data-props': JSON.stringify({ todos, id }),
    children: [
      {
        h3: {
          text: 'Todo List'
        }
      },
      {
        ul: {
          className: 'todo-list',
          children: todos.map((todo, index) => ({
            li: {
              className: `todo-item ${todo.completed ? 'completed' : ''}`,
              'data-todo-id': index,
              children: [
                {
                  input: {
                    type: 'checkbox',
                    checked: todo.completed,
                    className: 'todo-checkbox',
                    'data-action': 'toggle',
                    'data-todo-index': index
                  }
                },
                {
                  span: {
                    text: todo.text,
                    className: 'todo-text'
                  }
                }
              ]
            }
          }))
        }
      },
      {
        div: {
          className: 'todo-add',
          children: [
            {
              input: {
                type: 'text',
                placeholder: 'Add new todo...',
                className: 'todo-input',
                id: `new-todo-${id}`
              }
            },
            {
              button: {
                text: 'Add',
                className: 'btn add-todo',
                'data-action': 'add',
                'data-target': id
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
const HydratableTodoList = makeHydratable(TodoList);

// Server-side rendering
console.log('=== Server-Side Rendering ===');

const counterHtml = renderToString(HydratableCounter({ initialCount: 0, id: 'main' }));
const todoHtml = renderToString(HydratableTodoList({ 
  todos: [
    { text: 'Learn Coherent.js hydration', completed: true },
    { text: 'Build interactive components', completed: false },
    { text: 'Deploy to production', completed: false }
  ], 
  id: 'main' 
}));

const fullPageHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Coherent.js Hydration Demo</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .counter-widget, .todo-widget { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .counter-display { font-size: 24px; text-align: center; margin: 20px 0; }
    .counter-controls { text-align: center; }
    .btn { padding: 8px 16px; margin: 0 5px; cursor: pointer; }
    .todo-item { padding: 8px; margin: 4px 0; background: #f5f5f5; }
    .todo-item.completed { opacity: 0.6; }
    .todo-text { margin-left: 8px; }
    .todo-add { display: flex; margin-top: 16px; }
    .todo-input { flex: 1; padding: 8px; }
  </style>
</head>
<body>
  <h1>Coherent.js Hydration Demo</h1>
  <p>This page was server-rendered and can be hydrated with client-side interactivity.</p>
  
  ${counterHtml}
  ${todoHtml}
  
  <script type="module">
    // Client-side hydration would happen here
    // import { hydrate } from './src/client/hydration.js';
    // 
    // // Hydrate components
    // // hydrate(document.getElementById('counter-main'), HydratableCounter, { initialCount: 0, id: 'main' });
    // // hydrate(document.getElementById('todo-main'), HydratableTodoList, { 
    // //   todos: [
    // //     { text: 'Learn Coherent.js hydration', completed: true },
    // //     { text: 'Build interactive components', completed: false },
    // //     { text: 'Deploy to production', completed: false }
    // //   ], 
    // //   id: 'main' 
    // // });
    
    console.log('Client-side hydration ready!');
  </script>
</body>
</html>`;

console.log(fullPageHtml);

console.log('\n=== Hydration Demo Complete ===');
console.log('In a real browser environment, the client-side script would hydrate');
console.log('the server-rendered components with interactive behavior.');
