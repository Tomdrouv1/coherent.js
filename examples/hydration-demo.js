/**
 * Hydration Demo - Comprehensive Example
 * Demonstrates client-side hydration of server-rendered components with interactivity
 */

import { makeHydratable, autoHydrate } from '../src/client/hydration.js';
import { withState } from '../src/coherent.js';

// Interactive counter with hydration support
// Create a simple counter component that works with hydration
const CounterComponent = withState({ count: 0, step: 1 })(({ state, props = {} }) => {
  // Extract initial values from props with defaults
  const initialCount = props.initialCount !== undefined ? props.initialCount : 0;
  const initialStep = props.initialStep !== undefined ? props.initialStep : 1;
  
  // Initialize state with initial values if not already set
  if (state.count === undefined) {
    state.count = initialCount;
  }
  if (state.step === undefined) {
    state.step = initialStep;
  }
  
  return {
    div: {
      class: 'counter-widget',
      'data-coherent-component': 'counter', // Add data attribute to identify component
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
              { span: { text: `Count: ${state.count}`, class: 'count-value', 'data-ref': 'count' } },
              { span: { text: `Step: ${state.step}`, class: 'step-value', 'data-ref': 'step' } }
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
                  class: 'btn btn-secondary',
                  onclick: (event, state, setState) => setState({ count: state.count - state.step })
                }
              },
              {
                button: {
                  text: '+',
                  class: 'btn btn-primary',
                  onclick: (event, state, setState) => setState({ count: state.count + state.step })
                }
              },
              {
                button: {
                  text: 'Reset Test',
                  class: 'btn btn-outline',
                  onclick: (event, state, setState) => setState({ count: initialCount })
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
                  value: state.step,
                  min: 1,
                  max: 10,
                  class: 'step-input',
                  oninput: (event, state, setState) => setState({ step: parseInt(event.target.value) || 1 })
                }
              }
            ]
          }
        }
      ]
    }
  };
});

const HydratableCounter = makeHydratable(CounterComponent, { componentName: 'HydratableCounter' });

// Interactive todo list with hydration support
// Interactive user profile form with hydration support
const HydratableUserProfile = makeHydratable(
  withState({
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
    email: 'john.doe@example.com',
    bio: 'Software developer passionate about web technologies.',
    newsletter: true
  })(({ state }) => {
    return {
      div: {
        class: 'profile-widget',
        'data-coherent-component': 'user-profile',
        children: [
          {
            h4: {
              text: 'Interactive User Profile',
              class: 'widget-title'
            }
          },
          {
            div: {
              class: 'profile-display',
              children: [
                { p: { text: `Name: ${state.firstName} ${state.lastName}`, class: 'profile-info' } },
                { p: { text: `Age: ${state.age}`, class: 'profile-info' } },
                { p: { text: `Email: ${state.email}`, class: 'profile-info' } },
                { p: { 
                  text: `Status: ${state.age >= 18 ? 'Adult' : 'Minor'}`,
                  class: `profile-status ${state.age >= 18 ? 'adult' : 'minor'}`
                }},
                { p: { text: `Newsletter: ${state.newsletter ? 'Subscribed' : 'Not subscribed'}`, class: 'profile-info' } }
              ]
            }
          },
          {
            div: {
              class: 'profile-form',
              children: [
                {
                  div: {
                    class: 'form-row',
                    children: [
                      {
                        input: {
                          type: 'text',
                          placeholder: 'First Name',
                          value: state.firstName,
                          class: 'form-input',
                          oninput: (event, state, setState) => setState({ firstName: event.target.value })
                        }
                      },
                      {
                        input: {
                          type: 'text',
                          placeholder: 'Last Name',
                          value: state.lastName,
                          class: 'form-input',
                          oninput: (event, state, setState) => setState({ lastName: event.target.value })
                        }
                      }
                    ]
                  }
                },
                {
                  div: {
                    class: 'form-row',
                    children: [
                      {
                        input: {
                          type: 'number',
                          placeholder: 'Age',
                          value: state.age,
                          min: 1,
                          max: 120,
                          class: 'form-input',
                          oninput: (event, state, setState) => setState({ age: parseInt(event.target.value) || 0 })
                        }
                      },
                      {
                        input: {
                          type: 'email',
                          placeholder: 'Email',
                          value: state.email,
                          class: 'form-input',
                          oninput: (event, state, setState) => setState({ email: event.target.value })
                        }
                      }
                    ]
                  }
                },
                {
                  div: {
                    class: 'form-row full-width',
                    children: [
                      {
                        textarea: {
                          placeholder: 'Bio',
                          value: state.bio,
                          class: 'form-textarea',
                          rows: 3,
                          oninput: (event, state, setState) => setState({ bio: event.target.value })
                        }
                      }
                    ]
                  }
                },
                {
                  div: {
                    class: 'form-row checkbox-row',
                    children: [
                      {
                        label: {
                          class: 'checkbox-label',
                          children: [
                            {
                              input: {
                                type: 'checkbox',
                                checked: state.newsletter,
                                class: 'form-checkbox',
                                onchange: (event, state, setState) => setState({ newsletter: event.target.checked })
                              }
                            },
                            { span: { text: 'Subscribe to newsletter', class: 'checkbox-text' } }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  div: {
                    class: 'form-actions',
                    children: [
                      {
                        button: {
                          text: 'Reset Profile',
                          class: 'btn btn-outline',
                          onclick: (event, state, setState) => setState({
                            firstName: 'John',
                            lastName: 'Doe',
                            age: 30,
                            email: 'john.doe@example.com',
                            bio: 'Software developer passionate about web technologies.',
                            newsletter: true
                          })
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
  }), { componentName: 'HydratableUserProfile' }
);

const HydratableTodoList = makeHydratable(
  withState({ todos: [], newTodo: '', filter: 'all' })(({ state }) => {
    // Define functions that accept setState as parameter for hydration compatibility
    const addTodo = (event, state, setState) => {
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

    const toggleTodo = (id) => (event, state, setState) => {
      setState({
        todos: state.todos.map(todo => 
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      });
    };

    const removeTodo = (id) => (event, state, setState) => {
      setState({
        todos: state.todos.filter(todo => todo.id !== id)
      });
    };

    const setFilter = (filter) => (event, state, setState) => setState({ filter });

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
        'data-coherent-component': 'todo-list', // Add data attribute to identify component
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
                { span: { text: `Total: ${stats.total}`, class: 'stat-item' } },
                { span: { text: `Active: ${stats.active}`, class: 'stat-item' } },
                { span: { text: `Completed: ${stats.completed}`, class: 'stat-item' } }
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
                    oninput: (e, state, setState) => setState({ newTodo: e.target.value }),
                    onkeypress: (e, state, setState) => {
                      if (e.key === 'Enter') addTodo(e, state, setState);
                    }
                  }
                },
                {
                  button: {
                    text: 'Add',
                    class: 'btn btn-primary',
                    onclick: addTodo
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
                    onclick: setFilter('all')
                  }
                },
                {
                  button: {
                    text: 'Active',
                    class: `filter-btn ${state.filter === 'active' ? 'active' : ''}`,
                    onclick: setFilter('active')
                  }
                },
                {
                  button: {
                    text: 'Completed',
                    class: `filter-btn ${state.filter === 'completed' ? 'active' : ''}`,
                    onclick: setFilter('completed')
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
                        onchange: toggleTodo(todo.id)
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
                        onclick: removeTodo(todo.id)
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
  }), { componentName: 'HydratableTodoList' }
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
                .counter-widget, .todo-widget, .profile-widget {
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
                .stat-item {
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
                .profile-display { 
                  background: #f7fafc; 
                  padding: 20px; 
                  border-radius: 6px; 
                  margin-bottom: 25px; 
                }
                .profile-info {
                  margin: 8px 0;
                  color: #4a5568;
                  font-weight: 500;
                }
                .profile-status.adult { 
                  color: #38a169; 
                  font-weight: 600; 
                }
                .profile-status.minor { 
                  color: #ed8936; 
                  font-weight: 600; 
                }
                .profile-form { 
                  display: flex; 
                  flex-direction: column;
                  gap: 15px; 
                }
                .form-row {
                  display: flex;
                  gap: 15px;
                  align-items: center;
                }
                .form-row.full-width {
                  flex-direction: column;
                  align-items: stretch;
                }
                .form-row.checkbox-row {
                  justify-content: flex-start;
                }
                .form-input { 
                  padding: 10px 12px; 
                  border: 1px solid #e2e8f0; 
                  border-radius: 6px; 
                  flex: 1; 
                  min-width: 0;
                  font-size: 14px;
                  transition: border-color 0.2s ease;
                }
                .form-input:focus {
                  outline: none;
                  border-color: #4299e1;
                  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
                }
                .form-textarea {
                  padding: 10px 12px; 
                  border: 1px solid #e2e8f0; 
                  border-radius: 6px; 
                  width: 100%;
                  font-size: 14px;
                  font-family: inherit;
                  resize: vertical;
                  transition: border-color 0.2s ease;
                }
                .form-textarea:focus {
                  outline: none;
                  border-color: #4299e1;
                  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
                }
                .checkbox-label {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  cursor: pointer;
                }
                .form-checkbox {
                  width: 16px;
                  height: 16px;
                  cursor: pointer;
                }
                .checkbox-text {
                  color: #4a5568;
                  font-size: 14px;
                }
                .form-actions {
                  display: flex;
                  justify-content: flex-end;
                  margin-top: 10px;
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
                              { h2: { text: 'Interactive User Profile', class: 'section-title' } },
                              { p: { 
                                text: 'A form component with various input types, computed properties, and real-time validation.',
                                class: 'section-description'
                              }},
                              HydratableUserProfile.renderWithHydration()
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

// Export component registry for dev server (only in browser environment)
if (typeof window !== 'undefined') {
  // Initialize component registry
  window.componentRegistry = {
    HydratableCounter,
    HydratableUserProfile,
    HydratableTodoList
  };
  
  // Auto-hydrate all components with explicit registry
  autoHydrate(window.componentRegistry);
}


// Export the demo page as default for live preview
export default HydrationDemoPage;
