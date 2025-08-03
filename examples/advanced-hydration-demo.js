/**
 * Advanced Hydration Demo
 * 
 * This example demonstrates the full capabilities of Coherent.js hydration:
 * - Server-side rendering
 * - Client-side hydration with state management
 * - Event handling
 * - Component updates
 */

import { renderToString } from '../src/rendering/html-renderer.js';
import { hydrate, makeHydratable } from '../src/client/hydration.js';
import { withState } from '../src/components/component-system.js';

// Create a stateful counter component
const Counter = withState({ count: 0 }, {
  actions: {
    increment: (state, setState) => setState({ count: state.count + 1 }),
    decrement: (state, setState) => setState({ count: state.count - 1 }),
    reset: (state, setState, { props }) => setState({ count: props.initialCount || 0 })
  }
})(function Counter({ initialCount = 0 }, state) {
  return {
    div: {
      className: 'counter-container',
      'data-coherent-component': 'Counter',
      children: [
        {
          h2: {
            text: 'Interactive Counter'
          }
        },
        {
          p: {
            text: `Count: ${state.count}`
          }
        },
        {
          button: {
            'data-action': 'decrement',
            text: '-'
          }
        },
        {
          button: {
            'data-action': 'increment',
            text: '+'
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
});

// Create a todo list component
const TodoList = withState({ todos: [
  { text: 'Learn Coherent.js', completed: false },
  { text: 'Build awesome apps', completed: false }
] }, {
  actions: {
    addTodo: (state, setState, { args: [text] }) => {
      if (text.trim()) {
        setState({
          todos: [
            ...state.todos,
            { text: text.trim(), completed: false }
          ]
        });
      }
    },
    toggleTodo: (state, setState, { args: [index] }) => {
      const newTodos = [...state.todos];
      newTodos[index].completed = !newTodos[index].completed;
      setState({ todos: newTodos });
    }
  }
})(function TodoList(props, state) {
  return {
    div: {
      className: 'todo-container',
      'data-coherent-component': 'TodoList',
      children: [
        {
          h2: {
            text: 'Todo List'
          }
        },
        {
          div: {
            children: [
              {
                input: {
                  id: 'new-todo-input',
                  type: 'text',
                  placeholder: 'Add a new todo...'
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
        },
        {
          ul: {
            children: state.todos.map((todo, index) => ({
              li: {
                className: todo.completed ? 'completed' : '',
                children: [
                  {
                    input: {
                      type: 'checkbox',
                      checked: todo.completed,
                      'data-action': 'toggle',
                      'data-todo-index': index
                    }
                  },
                  {
                    span: {
                      text: todo.text
                    }
                  }
                ]
              }
            }))
          }
        }
      ]
    }
  };
});

// Make components hydratable
const HydratableCounter = makeHydratable(Counter);
const HydratableTodoList = makeHydratable(TodoList);

// Server-side rendering function
function renderPage() {
  const counterHTML = renderToString(HydratableCounter, { initialCount: 5 });
  const todoListHTML = renderToString(HydratableTodoList);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Advanced Hydration Demo</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .counter-container, .todo-container { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    button { margin: 5px; padding: 8px 16px; cursor: pointer; }
    ul { list-style-type: none; padding: 0; }
    li { padding: 5px 0; }
    .completed span { text-decoration: line-through; color: #888; }
    input[type="text"] { padding: 8px; margin: 5px; }
  </style>
</head>
<body>
  <h1>Advanced Hydration Demo</h1>
  
  <div id="counter">${counterHTML}</div>
  <div id="todo-list">${todoListHTML}</div>
  
  <script type="module">
    import { hydrate } from './src/client/hydration.js';
    
    // Hydrate components
    const counterElement = document.getElementById('counter');
    const todoListElement = document.getElementById('todo-list');
    
    if (counterElement && todoListElement) {
      hydrate(counterElement, ${HydratableCounter.name}, { initialCount: 5 });
      hydrate(todoListElement, ${HydratableTodoList.name});
    }
  </script>
</body>
</html>`;
}

// Export for use in a server environment
export { renderPage, HydratableCounter, HydratableTodoList };

// Example usage in a Node.js server
/*
import { renderPage } from './examples/advanced-hydration-demo.js';
import http from 'http';

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderPage());
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
*/

export default { renderPage };
