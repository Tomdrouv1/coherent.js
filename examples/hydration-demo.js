/**
 * Hydration Demo - Comprehensive Example
 * Demonstrates client-side hydration of server-rendered components with interactivity
 */

import { makeHydratable, autoHydrate } from '../src/client/hydration.js';
import { withState } from '../src/coherent.js';

// Interactive counter with hydration support
// Create a simple counter component that works with hydration
function CounterComponent({ initialCount = 0, initialStep = 1 }) {
  // For server-side rendering, we just return the initial state
  // Client-side hydration will handle the actual state management
  return {
    div: {
      class: 'counter-widget',
      children: [
        {
          h4: {
            text: 'Interactive Counter',
            class: 'widget-title'
          }
        },
        {
          div: {
            class: 'counter-display',
            children: [
              { span: { text: `Count: ${initialCount}`, class: 'count-value' } },
              { span: { text: `Step: ${initialStep}`, class: 'step-value' } }
            ]
          }
        },
        {
          div: {
            class: 'counter-controls',
            children: [
              {
                button: {
                  text: '-',
                  class: 'btn btn-secondary'
                }
              },
              {
                button: {
                  text: '+',
                  class: 'btn btn-primary'
                }
              },
              {
                button: {
                  text: 'Reset',
                  class: 'btn btn-outline'
                }
              }
            ]
          }
        },
        {
          div: {
            class: 'step-controls',
            children: [
              { label: { text: 'Step size:', class: 'step-label' } },
              {
                input: {
                  type: 'number',
                  value: initialStep,
                  min: 1,
                  max: 10,
                  class: 'step-input'
                }
              }
            ]
          }
        }
      ]
    }
  };
}

const HydratableCounter = makeHydratable(CounterComponent);

// Interactive todo list with hydration support
const HydratableTodoList = makeHydratable(
  withState({ todos: [], newTodo: '', filter: 'all' })(({ state, setState }) => {
    const addTodo = () => {
      if (state.newTodo.trim()) {
        setState({
          todos: [...state.todos, {
            id: Date.now(),
            text: state.newTodo.trim(),
            completed: false
          }],
          newTodo: ''
        });
      }
    };

    const toggleTodo = (id) => {
      setState({
        todos: state.todos.map(todo => 
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      });
    };

    const removeTodo = (id) => {
      setState({
        todos: state.todos.filter(todo => todo.id !== id)
      });
    };

    const setFilter = (filter) => setState({ filter });
    const setNewTodo = (value) => setState({ newTodo: value });

    const filteredTodos = state.todos.filter(todo => {
      if (state.filter === 'active') return !todo.completed;
      if (state.filter === 'completed') return todo.completed;
      return true;
    });

    const stats = {
      total: state.todos.length,
      completed: state.todos.filter(t => t.completed).length,
      active: state.todos.filter(t => !t.completed).length
    };

    return {
      div: {
        class: 'todo-widget',
        children: [
          {
            h4: {
              text: 'Interactive Todo List',
              class: 'widget-title'
            }
          },
          {
            div: {
              class: 'todo-stats',
              children: [
                { span: { text: `Total: ${stats.total}`, class: 'stat' } },
                { span: { text: `Active: ${stats.active}`, class: 'stat' } },
                { span: { text: `Completed: ${stats.completed}`, class: 'stat' } }
              ]
            }
          },
          {
            div: {
              class: 'todo-input',
              children: [
                {
                  input: {
                    type: 'text',
                    value: state.newTodo,
                    placeholder: 'Add new todo...',
                    class: 'todo-input-field',
                    oninput: typeof window !== 'undefined' ? (e) => setNewTodo(e.target.value) : null,
                    onkeypress: typeof window !== 'undefined' ? (e) => e.key === 'Enter' && addTodo() : null
                  }
                },
                {
                  button: {
                    text: 'Add',
                    class: 'btn btn-primary',
                    onclick: typeof window !== 'undefined' ? addTodo : null
                  }
                }
              ]
            }
          },
          {
            div: {
              class: 'todo-filters',
              children: [
                {
                  button: {
                    text: 'All',
                    class: `filter-btn ${state.filter === 'all' ? 'active' : ''}`,
                    onclick: typeof window !== 'undefined' ? () => setFilter('all') : null
                  }
                },
                {
                  button: {
                    text: 'Active',
                    class: `filter-btn ${state.filter === 'active' ? 'active' : ''}`,
                    onclick: typeof window !== 'undefined' ? () => setFilter('active') : null
                  }
                },
                {
                  button: {
                    text: 'Completed',
                    class: `filter-btn ${state.filter === 'completed' ? 'active' : ''}`,
                    onclick: typeof window !== 'undefined' ? () => setFilter('completed') : null
                  }
                }
              ]
            }
          },
          {
            ul: {
              class: 'todo-list',
              children: filteredTodos.map(todo => ({
                li: {
                  key: todo.id,
                  class: `todo-item ${todo.completed ? 'completed' : ''}`,
                  children: [
                    {
                      input: {
                        type: 'checkbox',
                        checked: todo.completed,
                        class: 'todo-checkbox',
                        onchange: typeof window !== 'undefined' ? () => toggleTodo(todo.id) : null
                      }
                    },
                    {
                      span: {
                        text: todo.text,
                        class: 'todo-text'
                      }
                    },
                    {
                      button: {
                        text: '×',
                        class: 'btn btn-danger btn-small',
                        onclick: typeof window !== 'undefined' ? () => removeTodo(todo.id) : null
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
  })
);

// Complete hydration demo page
export const hydrationDemo = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Hydration Demo - Coherent.js' } },
            {
              style: {
                text: `
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0;
                  padding: 20px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  color: #2d3748;
                }
                .demo-container {
                  max-width: 1200px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .demo-header {
                  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                  color: white;
                  padding: 30px;
                  text-align: center;
                }
                .demo-header h1 {
                  margin: 0 0 10px 0;
                  font-size: 2.5rem;
                  font-weight: 700;
                }
                .demo-header p {
                  margin: 0;
                  font-size: 1.1rem;
                  opacity: 0.9;
                }
                .demo-content {
                  padding: 40px;
                }
                .demo-section {
                  margin-bottom: 40px;
                  padding: 30px;
                  background: #f7fafc;
                  border-radius: 8px;
                  border-left: 4px solid #4299e1;
                }
                .section-title {
                  color: #2b6cb0;
                  margin: 0 0 15px 0;
                  font-size: 1.5rem;
                  font-weight: 600;
                }
                .section-description {
                  color: #4a5568;
                  margin-bottom: 25px;
                  line-height: 1.6;
                }
                .widget-title {
                  color: #2d3748;
                  margin: 0 0 20px 0;
                  font-size: 1.25rem;
                  font-weight: 600;
                }
                .counter-widget, .todo-widget {
                  background: white;
                  padding: 25px;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .counter-display {
                  text-align: center;
                  margin: 20px 0;
                  padding: 15px;
                  background: #f7fafc;
                  border-radius: 6px;
                  display: flex;
                  justify-content: center;
                  gap: 20px;
                }
                .count-value, .step-value {
                  font-size: 1.25rem;
                  font-weight: 600;
                  color: #2b6cb0;
                }
                .counter-controls, .step-controls {
                  display: flex;
                  justify-content: center;
                  gap: 10px;
                  margin: 15px 0;
                  flex-wrap: wrap;
                }
                .step-controls {
                  align-items: center;
                }
                .step-label {
                  margin-right: 10px;
                  font-weight: 500;
                }
                .step-input {
                  width: 60px;
                  padding: 5px 8px;
                  border: 1px solid #e2e8f0;
                  border-radius: 4px;
                  text-align: center;
                }
                .btn {
                  padding: 10px 20px;
                  border: none;
                  border-radius: 6px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  font-size: 14px;
                }
                .btn:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }
                .btn-primary {
                  background: #4299e1;
                  color: white;
                }
                .btn-primary:hover {
                  background: #3182ce;
                }
                .btn-secondary {
                  background: #718096;
                  color: white;
                }
                .btn-secondary:hover {
                  background: #4a5568;
                }
                .btn-outline {
                  background: transparent;
                  color: #4299e1;
                  border: 2px solid #4299e1;
                }
                .btn-outline:hover {
                  background: #4299e1;
                  color: white;
                }
                .btn-danger {
                  background: #e53e3e;
                  color: white;
                }
                .btn-danger:hover {
                  background: #c53030;
                }
                .btn-small {
                  padding: 5px 8px;
                  font-size: 12px;
                  min-width: 24px;
                }
                .todo-stats {
                  display: flex;
                  gap: 15px;
                  margin-bottom: 20px;
                  padding: 10px;
                  background: #f7fafc;
                  border-radius: 6px;
                }
                .stat {
                  font-weight: 500;
                  color: #4a5568;
                }
                .todo-input {
                  display: flex;
                  gap: 10px;
                  margin-bottom: 20px;
                }
                .todo-input-field {
                  flex: 1;
                  padding: 10px;
                  border: 1px solid #e2e8f0;
                  border-radius: 6px;
                  font-size: 14px;
                }
                .todo-input-field:focus {
                  outline: none;
                  border-color: #4299e1;
                  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
                }
                .todo-filters {
                  display: flex;
                  gap: 5px;
                  margin-bottom: 20px;
                }
                .filter-btn {
                  padding: 8px 16px;
                  border: 1px solid #e2e8f0;
                  background: white;
                  color: #4a5568;
                  border-radius: 4px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  font-size: 13px;
                }
                .filter-btn:hover {
                  border-color: #4299e1;
                  color: #4299e1;
                }
                .filter-btn.active {
                  background: #4299e1;
                  color: white;
                  border-color: #4299e1;
                }
                .todo-list {
                  list-style: none;
                  padding: 0;
                  margin: 0;
                }
                .todo-item {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  padding: 12px;
                  margin: 8px 0;
                  background: white;
                  border: 1px solid #e2e8f0;
                  border-radius: 6px;
                  transition: all 0.2s ease;
                }
                .todo-item:hover {
                  border-color: #cbd5e0;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .todo-item.completed {
                  opacity: 0.7;
                  background: #f7fafc;
                }
                .todo-item.completed .todo-text {
                  text-decoration: line-through;
                  color: #718096;
                }
                .todo-checkbox {
                  width: 16px;
                  height: 16px;
                  cursor: pointer;
                }
                .todo-text {
                  flex: 1;
                  color: #2d3748;
                }
                .hydration-info {
                  background: #e6fffa;
                  border: 1px solid #81e6d9;
                  border-radius: 8px;
                  padding: 20px;
                  margin-top: 30px;
                }
                .hydration-info h3 {
                  color: #234e52;
                  margin: 0 0 10px 0;
                }
                .hydration-info p {
                  color: #285e61;
                  margin: 0;
                  line-height: 1.6;
                }
                `
              }
            }
          ]
        }
      },
      {
        body: {
          children: [
            {
              div: {
                class: 'demo-container',
                children: [
                  {
                    div: {
                      class: 'demo-header',
                      children: [
                        { h1: { text: 'Hydration Demo' } },
                        { p: { text: 'Interactive components with server-side rendering and client-side hydration' } }
                      ]
                    }
                  },
                  {
                    div: {
                      class: 'demo-content',
                      children: [
                        {
                          div: {
                            class: 'demo-section',
                            children: [
                              { h2: { text: 'Interactive Counter', class: 'section-title' } },
                              { p: { 
                                text: 'A stateful counter with step control. State is preserved during hydration and updates are reactive.',
                                class: 'section-description'
                              }},
                              HydratableCounter.renderWithHydration({ initialCount: 5 })
                            ]
                          }
                        },
                        {
                          div: {
                            class: 'demo-section',
                            children: [
                              { h2: { text: 'Interactive Todo List', class: 'section-title' } },
                              { p: { 
                                text: 'A complex stateful component with filtering, statistics, and real-time interactions.',
                                class: 'section-description'
                              }},
                              HydratableTodoList.renderWithHydration()
                            ]
                          }
                        },
                        {
                          div: {
                            class: 'hydration-info',
                            children: [
                              { h3: { text: 'About Hydration' } },
                              { p: { text: 'This page demonstrates client-side hydration where server-rendered HTML becomes interactive on the client. Components maintain their state and event handlers are attached seamlessly.' } }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
};

// Make the demo page hydratable
const HydrationDemoPage = makeHydratable(() => hydrationDemo);

const componentRegistry = {
  HydratableCounter,
  HydratableTodoList
};

// Auto-hydrate all components
autoHydrate(componentRegistry);


// Export the demo page as default for live preview
export default HydrationDemoPage;
