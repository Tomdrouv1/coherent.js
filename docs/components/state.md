# State Management in Coherent.js

Coherent.js provides powerful state management through the `withState` higher-order component, enabling reactive components that update when state changes. This guide covers everything from basic state usage to advanced patterns.

## 🚀 Quick Start

### Basic Stateful Component

```javascript
import { withState } from '@coherent.js/core';

const CounterComponent = withState({ count: 0 })(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  return {
    div: {
      'data-coherent-component': 'counter',
      children: [
        { h2: { text: `Count: ${state.count}` } },
        {
          button: {
            text: '+',
            onclick: () => setState({ count: state.count + 1 })
          }
        }
      ]
    }
  };
});

export const Counter = CounterComponent;
```

## 🧩 Core Concepts

### State Object

The state object contains all the reactive data for your component:

```javascript
const initialState = {
  // Primitive values
  count: 0,
  name: 'John',
  isVisible: true,
  
  // Arrays
  items: ['apple', 'banana'],
  users: [{ id: 1, name: 'Alice' }],
  
  // Objects
  user: { id: 1, name: 'John', email: 'john@example.com' },
  config: { theme: 'dark', language: 'en' }
};
```

### StateUtils Object

The `stateUtils` object provides methods for updating state:

```javascript
const Component = withState(initialState)(({ state, stateUtils }) => {
  const { setState, updateState, resetState } = stateUtils;
  
  // setState: Replace state properties (shallow merge)
  const increment = () => setState({ count: state.count + 1 });
  
  // updateState: Deep merge with existing state  
  const updateUser = () => updateState({ 
    user: { ...state.user, name: 'Jane' }
  });
  
  // resetState: Reset to initial state
  const reset = () => resetState();
  
  return { /* component */ };
});
```

## 📝 State Updates

### Shallow Updates (setState)

Most common way to update state - replaces specified properties:

```javascript
const TodoApp = withState({
  todos: [],
  filter: 'all',
  newTodo: ''
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const addTodo = () => {
    const newTodo = {
      id: Date.now(),
      text: state.newTodo,
      completed: false
    };
    
    setState({
      todos: [...state.todos, newTodo],
      newTodo: '' // Clear input
    });
  };

  const toggleFilter = (filter) => {
    setState({ filter });
  };

  return {
    div: {
      'data-coherent-component': 'todo-app',
      children: [
        {
          input: {
            value: state.newTodo,
            oninput: (e) => setState({ newTodo: e.target.value })
          }
        },
        {
          button: {
            text: 'Add Todo',
            onclick: addTodo
          }
        }
        // ... rest of component
      ]
    }
  };
});
```

### Deep Updates (updateState)

For complex nested state updates:

```javascript
const UserProfile = withState({
  user: {
    profile: {
      name: 'John',
      email: 'john@example.com',
      preferences: {
        theme: 'light',
        notifications: true
      }
    },
    stats: {
      posts: 0,
      followers: 0
    }
  }
})(({ state, stateUtils }) => {
  const { updateState } = stateUtils;

  const updateTheme = (theme) => {
    updateState({
      user: {
        profile: {
          preferences: {
            theme
          }
        }
      }
    });
  };

  const incrementPosts = () => {
    updateState({
      user: {
        stats: {
          posts: state.user.stats.posts + 1
        }
      }
    });
  };

  return { /* component */ };
});
```

### Conditional Updates

```javascript
const ConditionalComponent = withState({
  isLoading: false,
  data: null,
  error: null
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const fetchData = async () => {
    setState({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      
      if (response.ok) {
        setState({ data, isLoading: false });
      } else {
        setState({ error: data.message, isLoading: false });
      }
    } catch (error) {
      setState({ error: error.message, isLoading: false });
    }
  };

  return {
    div: {
      children: [
        { button: { text: 'Fetch Data', onclick: fetchData } },
        
        state.isLoading ? 
          { div: { text: 'Loading...' } } :
        state.error ?
          { div: { text: `Error: ${state.error}` } } :
        state.data ?
          { div: { text: `Data: ${JSON.stringify(state.data)}` } } :
          { div: { text: 'No data yet' } }
      ].filter(Boolean)
    }
  };
});
```

## 🎯 Advanced Patterns

### Form State Management

```javascript
const ContactForm = withState({
  fields: {
    name: '',
    email: '',
    message: ''
  },
  errors: {},
  isSubmitting: false,
  submitted: false
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const updateField = (fieldName) => (event) => {
    setState({
      fields: {
        ...state.fields,
        [fieldName]: event.target.value
      },
      errors: {
        ...state.errors,
        [fieldName]: null // Clear error when user types
      }
    });
  };

  const validateForm = () => {
    const errors = {};
    
    if (!state.fields.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!state.fields.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(state.fields.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!state.fields.message.trim()) {
      errors.message = 'Message is required';
    }

    setState({ errors });
    return Object.keys(errors).length === 0;
  };

  const submitForm = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    setState({ isSubmitting: true });
    
    try {
      await submitToAPI(state.fields);
      setState({ 
        submitted: true, 
        isSubmitting: false,
        fields: { name: '', email: '', message: '' }
      });
    } catch (error) {
      setState({ 
        errors: { submit: error.message },
        isSubmitting: false 
      });
    }
  };

  return {
    form: {
      'data-coherent-component': 'contact-form',
      onsubmit: submitForm,
      children: [
        {
          div: {
            className: 'field',
            children: [
              { label: { text: 'Name' } },
              {
                input: {
                  type: 'text',
                  value: state.fields.name,
                  oninput: updateField('name'),
                  className: state.errors.name ? 'error' : ''
                }
              },
              state.errors.name ? { 
                span: { 
                  className: 'error-message', 
                  text: state.errors.name 
                }
              } : null
            ].filter(Boolean)
          }
        },
        // ... other fields
        {
          button: {
            type: 'submit',
            text: state.isSubmitting ? 'Submitting...' : 'Submit',
            disabled: state.isSubmitting
          }
        },
        state.submitted ? {
          div: { 
            className: 'success', 
            text: 'Form submitted successfully!' 
          }
        } : null
      ].filter(Boolean)
    }
  };
});
```

### List Management

```javascript
const TaskManager = withState({
  tasks: [],
  filter: 'all', // all, completed, pending
  newTask: '',
  editingId: null
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const addTask = () => {
    if (!state.newTask.trim()) return;
    
    const newTask = {
      id: Date.now(),
      text: state.newTask,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    setState({
      tasks: [...state.tasks, newTask],
      newTask: ''
    });
  };

  const toggleTask = (id) => {
    setState({
      tasks: state.tasks.map(task =>
        task.id === id 
          ? { ...task, completed: !task.completed }
          : task
      )
    });
  };

  const deleteTask = (id) => {
    setState({
      tasks: state.tasks.filter(task => task.id !== id)
    });
  };

  const startEdit = (id) => {
    setState({ editingId: id });
  };

  const saveEdit = (id, newText) => {
    setState({
      tasks: state.tasks.map(task =>
        task.id === id
          ? { ...task, text: newText }
          : task
      ),
      editingId: null
    });
  };

  const filteredTasks = state.tasks.filter(task => {
    if (state.filter === 'completed') return task.completed;
    if (state.filter === 'pending') return !task.completed;
    return true;
  });

  return {
    div: {
      'data-coherent-component': 'task-manager',
      children: [
        // Add new task
        {
          div: {
            className: 'add-task',
            children: [
              {
                input: {
                  type: 'text',
                  value: state.newTask,
                  placeholder: 'Add a new task...',
                  oninput: (e) => setState({ newTask: e.target.value }),
                  onkeypress: (e) => {
                    if (e.key === 'Enter') addTask();
                  }
                }
              },
              {
                button: {
                  text: 'Add',
                  onclick: addTask
                }
              }
            ]
          }
        },

        // Filter buttons
        {
          div: {
            className: 'filters',
            children: ['all', 'pending', 'completed'].map(filter => ({
              button: {
                text: filter.charAt(0).toUpperCase() + filter.slice(1),
                className: state.filter === filter ? 'active' : '',
                onclick: () => setState({ filter })
              }
            }))
          }
        },

        // Task list
        {
          ul: {
            className: 'task-list',
            children: filteredTasks.map(task => ({
              li: {
                key: task.id,
                className: `task ${task.completed ? 'completed' : ''}`,
                children: [
                  {
                    input: {
                      type: 'checkbox',
                      checked: task.completed,
                      onchange: () => toggleTask(task.id)
                    }
                  },
                  state.editingId === task.id ? {
                    input: {
                      type: 'text',
                      defaultValue: task.text,
                      onblur: (e) => saveEdit(task.id, e.target.value),
                      onkeypress: (e) => {
                        if (e.key === 'Enter') saveEdit(task.id, e.target.value);
                      }
                    }
                  } : {
                    span: {
                      text: task.text,
                      ondblclick: () => startEdit(task.id)
                    }
                  },
                  {
                    button: {
                      text: '×',
                      className: 'delete',
                      onclick: () => deleteTask(task.id)
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
```

### Async State Management

```javascript
const AsyncDataComponent = withState({
  data: null,
  loading: false,
  error: null,
  lastFetch: null
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const fetchData = async (force = false) => {
    // Prevent duplicate requests
    if (state.loading) return;
    
    // Cache for 5 minutes unless forced
    if (!force && state.lastFetch && 
        Date.now() - state.lastFetch < 5 * 60 * 1000) {
      return;
    }

    setState({ loading: true, error: null });

    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setState({ 
        data, 
        loading: false, 
        lastFetch: Date.now() 
      });
    } catch (error) {
      setState({ 
        error: error.message, 
        loading: false 
      });
    }
  };

  const refreshData = () => fetchData(true);

  // Auto-fetch on mount (in browser)
  if (typeof window !== 'undefined' && !state.data && !state.loading) {
    fetchData();
  }

  return {
    div: {
      'data-coherent-component': 'async-data',
      children: [
        {
          div: {
            className: 'controls',
            children: [
              {
                button: {
                  text: state.loading ? 'Loading...' : 'Refresh',
                  onclick: refreshData,
                  disabled: state.loading
                }
              },
              state.lastFetch ? {
                span: {
                  text: `Last updated: ${new Date(state.lastFetch).toLocaleTimeString()}`
                }
              } : null
            ].filter(Boolean)
          }
        },

        state.error ? {
          div: {
            className: 'error',
            children: [
              { p: { text: `Error: ${state.error}` } },
              {
                button: {
                  text: 'Retry',
                  onclick: refreshData
                }
              }
            ]
          }
        } : state.loading ? {
          div: {
            className: 'loading',
            text: 'Loading data...'
          }
        } : state.data ? {
          div: {
            className: 'data',
            children: [
              { h3: { text: 'Data:' } },
              { pre: { text: JSON.stringify(state.data, null, 2) } }
            ]
          }
        } : {
          div: {
            className: 'no-data',
            text: 'No data available'
          }
        }
      ].filter(Boolean)
    }
  };
});
```

## 🛠️ Configuration Options

### Debug Mode

Enable debug mode to log all state changes:

```javascript
const DebugComponent = withState(initialState, {
  debug: true // Logs all state changes to console
})(({ state, stateUtils }) => {
  // Component implementation
});
```

### Custom State Utilities

Add custom methods to stateUtils:

```javascript
const customStateUtils = {
  incrementCounter: (setState, state) => () => {
    setState({ count: state.count + 1 });
  },
  
  resetForm: (setState) => () => {
    setState({
      name: '',
      email: '',
      message: ''
    });
  }
};

const ComponentWithCustomUtils = withState(initialState, {
  customUtils: customStateUtils
})(({ state, stateUtils }) => {
  const { incrementCounter, resetForm } = stateUtils;
  
  return {
    div: {
      children: [
        { button: { text: '+', onclick: incrementCounter() } },
        { button: { text: 'Reset', onclick: resetForm() } }
      ]
    }
  };
});
```

## 🔄 State Persistence

### Local Storage Integration

```javascript
const PersistentState = withState({
  preferences: {
    theme: 'light',
    language: 'en'
  }
}, {
  // Custom serialization/deserialization
  serialize: (state) => JSON.stringify(state),
  deserialize: (data) => JSON.parse(data),
  
  // Storage key
  storageKey: 'app-preferences'
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  // Save to localStorage on state changes
  const updatePreference = (key, value) => {
    const newPreferences = { ...state.preferences, [key]: value };
    setState({ preferences: newPreferences });
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-preferences', JSON.stringify(newPreferences));
    }
  };

  // Load from localStorage on mount
  if (typeof window !== 'undefined' && !state._loaded) {
    const saved = localStorage.getItem('app-preferences');
    if (saved) {
      try {
        const preferences = JSON.parse(saved);
        setState({ preferences, _loaded: true });
      } catch (e) {
        console.warn('Failed to load preferences:', e);
        setState({ _loaded: true });
      }
    } else {
      setState({ _loaded: true });
    }
  }

  return { /* component */ };
});
```

## 🧪 Testing State Components

### Unit Testing

```javascript
import { render } from '@coherent.js/core';

// Test initial render
test('renders with initial state', () => {
  const html = render(Counter());
  expect(html).toContain('Count: 0');
});

// Test state changes (requires client-side testing)
test('increments count on button click', async () => {
  const { container, getByText } = renderComponent(Counter());
  
  const button = getByText('+');
  fireEvent.click(button);
  
  expect(getByText('Count: 1')).toBeInTheDocument();
});
```

### Integration Testing

```javascript
// Test full user workflow
test('todo app workflow', async () => {
  const { container, getByPlaceholderText, getByText } = renderComponent(TodoApp());
  
  // Add a todo
  const input = getByPlaceholderText('Add a new task...');
  fireEvent.change(input, { target: { value: 'Test task' } });
  fireEvent.click(getByText('Add'));
  
  expect(getByText('Test task')).toBeInTheDocument();
  
  // Mark as completed
  const checkbox = container.querySelector('input[type="checkbox"]');
  fireEvent.click(checkbox);
  
  expect(checkbox.checked).toBe(true);
});
```

## 📚 Best Practices

### 1. Keep State Minimal

```javascript
// ✅ Good - only necessary state
const Component = withState({
  count: 0,
  isVisible: true
})(/* ... */);

// ❌ Avoid - derived state
const Component = withState({
  count: 0,
  isVisible: true,
  doubleCount: 0 // This can be computed
})(/* ... */);
```

### 2. Use Immutable Updates

```javascript
// ✅ Good - immutable updates
setState({
  items: [...state.items, newItem]
});

// ❌ Avoid - mutation
state.items.push(newItem);
setState({ items: state.items });
```

### 3. Group Related State

```javascript
// ✅ Good - grouped state
const FormComponent = withState({
  form: {
    name: '',
    email: '',
    message: ''
  },
  validation: {
    errors: {},
    isValid: true
  }
})(/* ... */);
```

### 4. Handle Loading States

```javascript
// ✅ Good - proper loading states
const AsyncComponent = withState({
  data: null,
  loading: false,
  error: null
})(/* ... */);
```

### 5. Validate State Updates

```javascript
const ValidatedComponent = withState(initialState)(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const updateCount = (newCount) => {
    if (typeof newCount !== 'number' || newCount < 0) {
      console.warn('Invalid count value:', newCount);
      return;
    }
    setState({ count: newCount });
  };

  return { /* component */ };
});
```

## 🔍 Debugging State

### Debug Logging

```javascript
const DebugComponent = withState(initialState, {
  debug: true
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const debugUpdate = (updates) => {
    console.log('State before update:', state);
    console.log('Updates:', updates);
    setState(updates);
  };

  return { /* component */ };
});
```

### State Inspector

```javascript
const StateInspector = ({ children, state }) => ({
  div: {
    children: [
      children,
      process.env.NODE_ENV === 'development' ? {
        details: {
          children: [
            { summary: { text: 'State Inspector' } },
            { pre: { text: JSON.stringify(state, null, 2) } }
          ]
        }
      } : null
    ].filter(Boolean)
  }
});
```

---

This comprehensive guide covers all aspects of state management in Coherent.js. For more advanced patterns and performance optimizations, see the [Performance Guide](../performance-optimizations.md) and [Advanced Components](./advanced-components.md).
