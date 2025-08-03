import { withState } from '../src/coherent.js';

// Example 1: Basic counter component with state
export const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    className: 'counter',
    children: [
      { h3: { text: 'Counter Example' } },
      { p: { text: `Count: ${state.count}`, className: 'count-display' } },
      {
        div: {
          className: 'button-group',
          children: [
            { button: { 
              text: 'Increment', 
              className: 'btn btn--primary',
              onclick: typeof window !== 'undefined' ? () => setState({ count: state.count + 1 }) : null
            }},
            { button: { 
              text: 'Decrement', 
              className: 'btn btn--secondary',
              onclick: typeof window !== 'undefined' ? () => setState({ count: state.count - 1 }) : null
            }},
            { button: { 
              text: 'Reset', 
              className: 'btn btn--outline',
              onclick: typeof window !== 'undefined' ? () => setState({ count: 0 }) : null
            }}
          ]
        }
      }
    ]
  }
}));

// Example 2: Todo list with state
export const TodoList = withState({ 
  todos: [
    { id: 1, text: 'Learn Coherent.js', completed: false },
    { id: 2, text: 'Build an app', completed: false }
  ],
  newTodo: ''
})(({ state, setState }) => {
  const addTodo = () => {
    if (state.newTodo.trim() === '') return;
    
    const newTodo = {
      id: Date.now(),
      text: state.newTodo,
      completed: false
    };
    
    setState({
      todos: [...state.todos, newTodo],
      newTodo: ''
    });
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
  
  return {
    div: {
      className: 'todo-app',
      children: [
        { h3: { text: 'Todo List Example' } },
        {
          div: {
            className: 'todo-input',
            children: [
              { input: { 
                type: 'text', 
                value: state.newTodo,
                placeholder: 'Add a new todo...',
                className: 'todo-input-field',
                oninput: typeof window !== 'undefined' ? (e) => setState({ newTodo: e.target.value }) : null
              }},
              { button: { 
                text: 'Add', 
                className: 'btn btn--primary',
                onclick: typeof window !== 'undefined' ? addTodo : null
              }}
            ]
          }
        },
        {
          ul: {
            className: 'todo-list',
            children: state.todos.map(todo => ({
              li: {
                key: todo.id,
                className: `todo-item ${todo.completed ? 'completed' : ''}`,
                children: [
                  { input: {
                    type: 'checkbox',
                    checked: todo.completed,
                    onchange: typeof window !== 'undefined' ? () => toggleTodo(todo.id) : null
                  }},
                  { span: { 
                    text: todo.text,
                    className: 'todo-text'
                  }},
                  { button: { 
                    text: '×', 
                    className: 'btn btn--danger btn--small',
                    onclick: typeof window !== 'undefined' ? () => removeTodo(todo.id) : null
                  }}
                ]
              }
            }))
          }
        },
        { 
          div: {
            className: 'todo-stats',
            children: [
              { p: { text: `Total: ${state.todos.length} todos` } },
              { p: { text: `Completed: ${state.todos.filter(t => t.completed).length}` } }
            ]
          }
        }
      ]
    }
  };
});

// Example 3: Component with computed properties
export const UserProfile = withState({
  firstName: 'John',
  lastName: 'Doe',
  age: 30,
  email: 'john.doe@example.com'
}, {
  computed: {
    fullName: (state) => `${state.firstName} ${state.lastName}`,
    isAdult: (state) => state.age >= 18
  }
})(({ state, setState }) => ({
  div: {
    className: 'user-profile',
    children: [
      { h3: { text: 'User Profile with Computed Properties' } },
      {
        div: {
          className: 'profile-display',
          children: [
            { p: { text: `Name: ${state.fullName}` } },
            { p: { text: `Age: ${state.age}` } },
            { p: { text: `Email: ${state.email}` } },
            { p: { 
              text: `Status: ${state.isAdult ? 'Adult' : 'Minor'}`,
              className: `status ${state.isAdult ? 'adult' : 'minor'}`
            }}
          ]
        }
      },
      {
        div: {
          className: 'profile-form',
          children: [
            { input: {
              type: 'text',
              placeholder: 'First Name',
              value: state.firstName,
              oninput: typeof window !== 'undefined' ? (e) => setState({ firstName: e.target.value }) : null
            }},
            { input: {
              type: 'text',
              placeholder: 'Last Name',
              value: state.lastName,
              oninput: typeof window !== 'undefined' ? (e) => setState({ lastName: e.target.value }) : null
            }},
            { input: {
              type: 'number',
              placeholder: 'Age',
              value: state.age,
              oninput: typeof window !== 'undefined' ? (e) => setState({ age: parseInt(e.target.value) || 0 }) : null
            }}
          ]
        }
      }
    ]
  }
}));

// Complete demo page showcasing all state management patterns
export const stateManagementDemo = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'State Management Demo - Coherent.js' } },
            {
              style: {
                text: `
                body { 
                  font-family: Arial, sans-serif; 
                  max-width: 1000px; 
                  margin: 0 auto; 
                  padding: 20px; 
                  line-height: 1.6;
                  background: #f5f5f5;
                }
                .demo-section {
                  background: white;
                  padding: 20px;
                  margin: 20px 0;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .counter { text-align: center; }
                .count-display { 
                  font-size: 2em; 
                  font-weight: bold; 
                  color: #007bff; 
                  margin: 20px 0; 
                }
                .button-group { 
                  display: flex; 
                  gap: 10px; 
                  justify-content: center; 
                  flex-wrap: wrap; 
                }
                .btn { 
                  padding: 10px 20px; 
                  border: none; 
                  border-radius: 4px; 
                  cursor: pointer; 
                  font-size: 14px; 
                  transition: background-color 0.2s;
                }
                .btn--primary { background: #007bff; color: white; }
                .btn--primary:hover { background: #0056b3; }
                .btn--secondary { background: #6c757d; color: white; }
                .btn--secondary:hover { background: #545b62; }
                .btn--outline { background: transparent; color: #007bff; border: 1px solid #007bff; }
                .btn--outline:hover { background: #007bff; color: white; }
                .btn--danger { background: #dc3545; color: white; }
                .btn--danger:hover { background: #c82333; }
                .btn--small { padding: 5px 10px; font-size: 12px; }
                
                .todo-input { 
                  display: flex; 
                  gap: 10px; 
                  margin-bottom: 20px; 
                  align-items: center;
                }
                .todo-input-field { 
                  flex: 1; 
                  padding: 8px; 
                  border: 1px solid #ddd; 
                  border-radius: 4px; 
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
                  padding: 10px; 
                  border: 1px solid #eee; 
                  border-radius: 4px; 
                  margin-bottom: 5px; 
                  background: #fafafa;
                }
                .todo-item.completed { 
                  opacity: 0.6; 
                  background: #f0f0f0; 
                }
                .todo-item.completed .todo-text { 
                  text-decoration: line-through; 
                }
                .todo-text { 
                  flex: 1; 
                }
                .todo-stats { 
                  margin-top: 15px; 
                  padding-top: 15px; 
                  border-top: 1px solid #eee; 
                  display: flex; 
                  gap: 20px; 
                }
                .todo-stats p { 
                  margin: 0; 
                  font-weight: bold; 
                }
                
                .profile-display { 
                  background: #f8f9fa; 
                  padding: 15px; 
                  border-radius: 4px; 
                  margin-bottom: 20px; 
                }
                .profile-form { 
                  display: flex; 
                  gap: 10px; 
                  flex-wrap: wrap; 
                }
                .profile-form input { 
                  padding: 8px; 
                  border: 1px solid #ddd; 
                  border-radius: 4px; 
                  flex: 1; 
                  min-width: 150px; 
                }
                .status.adult { color: green; font-weight: bold; }
                .status.minor { color: orange; font-weight: bold; }
                
                h1 { 
                  text-align: center; 
                  color: #333; 
                  margin-bottom: 30px; 
                }
                h3 { 
                  color: #007bff; 
                  border-bottom: 2px solid #007bff; 
                  padding-bottom: 5px; 
                  margin-bottom: 20px; 
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
            { h1: { text: 'State Management Patterns in Coherent.js' } },
            
            {
              div: {
                className: 'demo-section',
                children: [Counter()]
              }
            },
            
            {
              div: {
                className: 'demo-section',
                children: [TodoList()]
              }
            },
            
            {
              div: {
                className: 'demo-section',
                children: [UserProfile()]
              }
            }
          ]
        }
      }
    ]
  }
};

// Export the demo page as default for live preview
export default stateManagementDemo;
