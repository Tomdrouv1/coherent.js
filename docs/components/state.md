# State Management in Coherent.js

Coherent.js provides powerful state management through the `withState` higher-order component, enabling reactive components that update when state changes. This guide covers everything from basic state usage to advanced patterns and reactive state.

**Package:** `@coherent.js/core`
**Module:** `/src/components/component-system.js`
**Since:** v1.0.0

## Quick Start

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

## Core Concepts

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

## State Updates

### Shallow Updates (setState)

Most common way to update state -- replaces specified properties:

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

## Practical Patterns

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
        [fieldName]: null
      }
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!state.fields.name.trim()) errors.name = 'Name is required';
    if (!state.fields.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(state.fields.email)) {
      errors.email = 'Email is invalid';
    }
    if (!state.fields.message.trim()) errors.message = 'Message is required';
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
                span: { className: 'error-message', text: state.errors.name }
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
          div: { className: 'success', text: 'Form submitted successfully!' }
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
  filter: 'all',
  newTask: '',
  editingId: null
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const addTask = () => {
    if (!state.newTask.trim()) return;
    setState({
      tasks: [...state.tasks, {
        id: Date.now(),
        text: state.newTask,
        completed: false,
        createdAt: new Date().toISOString()
      }],
      newTask: ''
    });
  };

  const toggleTask = (id) => {
    setState({
      tasks: state.tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    });
  };

  const deleteTask = (id) => {
    setState({ tasks: state.tasks.filter(task => task.id !== id) });
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
                  onkeypress: (e) => { if (e.key === 'Enter') addTask(); }
                }
              },
              { button: { text: 'Add', onclick: addTask } }
            ]
          }
        },
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
        {
          ul: {
            className: 'task-list',
            children: filteredTasks.map(task => ({
              li: {
                key: task.id,
                className: `task ${task.completed ? 'completed' : ''}`,
                children: [
                  { input: { type: 'checkbox', checked: task.completed, onchange: () => toggleTask(task.id) } },
                  { span: { text: task.text } },
                  { button: { text: 'x', className: 'delete', onclick: () => deleteTask(task.id) } }
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
    if (state.loading) return;
    if (!force && state.lastFetch && Date.now() - state.lastFetch < 5 * 60 * 1000) return;

    setState({ loading: true, error: null });

    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      setState({ data, loading: false, lastFetch: Date.now() });
    } catch (error) {
      setState({ error: error.message, loading: false });
    }
  };

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
                  onclick: () => fetchData(true),
                  disabled: state.loading
                }
              },
              state.lastFetch ? {
                span: { text: `Last updated: ${new Date(state.lastFetch).toLocaleTimeString()}` }
              } : null
            ].filter(Boolean)
          }
        },
        state.error ? {
          div: {
            className: 'error',
            children: [
              { p: { text: `Error: ${state.error}` } },
              { button: { text: 'Retry', onclick: () => fetchData(true) } }
            ]
          }
        } : state.loading ? {
          div: { className: 'loading', text: 'Loading data...' }
        } : state.data ? {
          div: {
            className: 'data',
            children: [
              { h3: { text: 'Data:' } },
              { pre: { text: JSON.stringify(state.data, null, 2) } }
            ]
          }
        } : {
          div: { className: 'no-data', text: 'No data available' }
        }
      ].filter(Boolean)
    }
  };
});
```

## Configuration Options

### withState Options

The `withState` HOC accepts extensive options for fine-grained control:

```javascript
const Component = withState(initialState, {
  // State options
  persistent: false,         // Persist state across unmounts
  storageKey: null,          // Key for persistent storage
  storage: localStorage,     // Storage mechanism
  
  // State transformation
  stateTransform: null,      // Transform state before injection
  propName: 'state',         // Prop name for state injection
  actionsName: 'actions',    // Prop name for action injection
  
  // Reducers and actions
  reducer: null,             // State reducer function
  actions: {},               // Action creators
  middleware: [],            // State middleware
  
  // Performance
  memoizeState: false,       // Memoize state transformations
  shallow: false,            // Shallow state comparison
  
  // Development
  devTools: false,           // Connect to dev tools
  debug: false,              // Debug logging
  displayName: null,         // Component name for debugging
  
  // Lifecycle hooks
  onStateChange: null,       // Called when state changes
  onMount: null,             // Called when component mounts
  onUnmount: null,           // Called when component unmounts
  
  // Validation
  validator: null,           // State validator function
  
  // Async state
  supportAsync: false        // Support async state updates
})(ComponentFunction);
```

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
    setState({ name: '', email: '', message: '' });
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

## State Persistence

### Local Storage Integration

```javascript
const PersistentState = withState({
  preferences: { theme: 'light', language: 'en' }
}, {
  serialize: (state) => JSON.stringify(state),
  deserialize: (data) => JSON.parse(data),
  storageKey: 'app-preferences'
})(({ state, stateUtils }) => {
  const { setState } = stateUtils;

  const updatePreference = (key, value) => {
    const newPreferences = { ...state.preferences, [key]: value };
    setState({ preferences: newPreferences });
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-preferences', JSON.stringify(newPreferences));
    }
  };

  if (typeof window !== 'undefined' && !state._loaded) {
    const saved = localStorage.getItem('app-preferences');
    if (saved) {
      try {
        setState({ preferences: JSON.parse(saved), _loaded: true });
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

## Advanced State Patterns

### withStateUtils Variants

The `withStateUtils` object provides specialized state management utilities beyond the basic `withState` HOC.

#### Local State (Simple)

```javascript
import { withStateUtils } from '@coherent.js/core';

const Component = withStateUtils.local({ count: 0 })(MyComponent);
```

#### Persistent State

Automatically saves state to localStorage:

```javascript
const Component = withStateUtils.persistent(
  { user: null, preferences: {} },
  'app-state'  // Storage key
)(MyComponent);
```

Features: automatic localStorage sync, survives page refreshes, JSON serialization.

```javascript
const UserPreferences = withStateUtils.persistent({
  theme: 'light',
  language: 'en',
  notifications: true
}, 'user-prefs')(({ state, setState }) => ({
  div: {
    children: [
      {
        select: {
          value: state.theme,
          onchange: (e) => setState({ theme: e.target.value }),
          children: [
            { option: { value: 'light', text: 'Light' } },
            { option: { value: 'dark', text: 'Dark' } }
          ]
        }
      }
    ]
  }
}));
```

#### Reducer Pattern

Redux-like state management:

```javascript
const initialState = { count: 0 };

const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT': return { ...state, count: state.count + 1 };
    case 'DECREMENT': return { ...state, count: state.count - 1 };
    case 'RESET': return { ...state, count: 0 };
    default: return state;
  }
};

const actions = {
  increment: (state, setState) => { setState({ type: 'INCREMENT' }); },
  decrement: (state, setState) => { setState({ type: 'DECREMENT' }); },
  reset: (state, setState) => { setState({ type: 'RESET' }); }
};

const Counter = withStateUtils.reducer(
  initialState, reducer, actions
)(({ state, actions }) => ({
  div: {
    children: [
      { p: { text: `Count: ${state.count}` } },
      { button: { text: '+', onclick: actions.increment } },
      { button: { text: '-', onclick: actions.decrement } },
      { button: { text: 'Reset', onclick: actions.reset } }
    ]
  }
}));
```

#### Async State Management

Handle async operations with built-in loading/error states:

```javascript
const DataFetcher = withStateUtils.async({
  data: null
}, {
  fetchData: async (state, setState) => {
    const response = await fetch('/api/data');
    const data = await response.json();
    setState({ data });
  }
})(({ state, actions }) => ({
  div: {
    children: [
      { button: { text: 'Fetch Data', onclick: actions.fetchData } },
      state.data && { pre: { text: JSON.stringify(state.data, null, 2) } }
    ]
  }
}));
```

#### Validated State

Enforce state validation rules:

```javascript
const validator = (state) => {
  if (state.age < 0 || state.age > 150) throw new Error('Age must be between 0 and 150');
  if (!state.email.includes('@')) throw new Error('Invalid email format');
  return true;
};

const UserForm = withStateUtils.validated({
  name: '', email: '', age: 0
}, validator)(FormComponent);
```

#### Shared State

Share state across multiple components:

```javascript
// Component A
const ComponentA = withStateUtils.shared({
  theme: 'light'
}, 'app-theme')(({ state, setState }) => ({
  div: {
    children: [
      { p: { text: `Theme: ${state.theme}` } },
      {
        button: {
          text: 'Toggle',
          onclick: () => setState({ theme: state.theme === 'light' ? 'dark' : 'light' })
        }
      }
    ]
  }
}));

// Component B (shares same state)
const ComponentB = withStateUtils.shared({
  theme: 'light'
}, 'app-theme')(({ state }) => ({
  div: {
    className: `theme-${state.theme}`,
    text: 'This component shares the theme state'
  }
}));
```

#### Form State

Specialized utilities for form handling:

```javascript
const ContactForm = withStateUtils.form({
  name: '', email: '', message: ''
})(({ state, actions }) => ({
  form: {
    'data-coherent-component': 'contact-form',
    onsubmit: (e) => {
      e.preventDefault();
      const isValid = actions.validateForm((state) => {
        const errors = {};
        if (!state.name) errors.name = 'Name is required';
        if (!state.email.includes('@')) errors.email = 'Invalid email';
        return errors;
      });
      if (isValid) console.log('Form submitted:', state);
    },
    children: [
      { input: { type: 'text', placeholder: 'Name', value: state.name, oninput: (e) => actions.updateField('name', e.target.value) } },
      { input: { type: 'email', placeholder: 'Email', value: state.email, oninput: (e) => actions.updateField('email', e.target.value) } },
      { textarea: { placeholder: 'Message', value: state.message, oninput: (e) => actions.updateField('message', e.target.value) } },
      { button: { type: 'submit', text: 'Send' } },
      { button: { type: 'button', text: 'Reset', onclick: actions.resetForm } }
    ]
  }
}));
```

Form actions: `updateField(field, value)`, `updateMultiple(updates)`, `resetForm()`, `validateForm(validator)`.

#### Loading and Error Handling

Built-in loading and error state management:

```javascript
const DataLoader = withStateUtils.withLoading({
  users: []
})(({ state, actions }) => ({
  div: {
    children: [
      {
        button: {
          text: state._loading ? 'Loading...' : 'Load Users',
          disabled: state._loading,
          onclick: () => actions.asyncAction(async () => {
            const response = await fetch('/api/users');
            const users = await response.json();
            return { users };
          })
        }
      },
      state._error && { div: { className: 'error', text: `Error: ${state._error.message}` } },
      !state._loading && state.users.length > 0 && {
        ul: { children: state.users.map(user => ({ li: { text: user.name } })) }
      }
    ]
  }
}));
```

Built-in state: `_loading` (Boolean), `_error` (Error|null). Actions: `setLoading(boolean)`, `setError(error)`, `clearError()`, `asyncAction(asyncFn)`.

#### Undo/Redo (History)

```javascript
const TextEditor = withStateUtils.withHistory({
  text: ''
}, 10)(({ state, actions }) => ({
  div: {
    children: [
      { textarea: { value: state.present.text, oninput: (e) => actions.updatePresent({ text: e.target.value }) } },
      {
        div: {
          children: [
            { button: { text: 'Undo', disabled: !actions.canUndo(state), onclick: actions.undo } },
            { button: { text: 'Redo', disabled: !actions.canRedo(state), onclick: actions.redo } }
          ]
        }
      }
    ]
  }
}));
```

State structure: `{ present: { /* current */ }, past: [ /* previous */ ], future: [ /* undone */ ] }`. Actions: `undo()`, `redo()`, `updatePresent(newState)`, `canUndo(state)`, `canRedo(state)`.

#### Computed Properties

```javascript
const ShoppingCart = withStateUtils.computed({
  items: [
    { id: 1, name: 'Item 1', price: 10, quantity: 2 },
    { id: 2, name: 'Item 2', price: 20, quantity: 1 }
  ]
}, {
  total: (state) => state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
  itemCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
  isEmpty: (state) => state.items.length === 0
})(({ state }) => ({
  div: {
    children: [
      { h2: { text: 'Shopping Cart' } },
      { ul: { children: state.items.map(item => ({ li: { text: `${item.name} x${item.quantity} - $${item.price * item.quantity}` } })) } },
      { p: { text: `Total Items: ${state.itemCount}` } },
      { p: { text: `Total Price: $${state.total}` } },
      state.isEmpty && { p: { text: 'Cart is empty' } }
    ]
  }
}));
```

## Reactive State

The `@coherent.js/state` package provides a comprehensive reactive state management solution with observables, computed properties, persistence, and validation -- ideal for client-side interactivity beyond what `withState` offers during SSR.

### Installation

```bash
pnpm add @coherent.js/state@beta
```

### Observables

Create reactive values that automatically track changes:

```javascript
import { observable, computed } from '@coherent.js/state';

const count = observable(0);
const doubled = computed(() => count.value * 2);

count.watch((newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
});

count.value = 5; // Triggers watcher and updates computed
console.log(doubled.value); // 10
```

### Reactive State Class

For more complex state management:

```javascript
import { createReactiveState } from '@coherent.js/state';

const appState = createReactiveState({
  user: { name: 'John', age: 30 },
  settings: { theme: 'dark' }
});

appState.watch('user.name', (newName, oldName) => {
  console.log(`User name changed to ${newName}`);
});

appState.set('user.name', 'Jane');
console.log(appState.get('user.name')); // 'Jane'
```

### Computed Properties (Reactive)

```javascript
import { observable, computed } from '@coherent.js/state';

const firstName = observable('John');
const lastName = observable('Doe');

const fullName = computed(() => `${firstName.value} ${lastName.value}`);

console.log(fullName.value); // 'John Doe'
firstName.value = 'Jane';
console.log(fullName.value); // 'Jane Doe' (automatically updated)
```

### SSR-Compatible State

#### Request-Scoped State

```javascript
import { createState } from '@coherent.js/state';

function handleRequest(req, res) {
  const requestState = createState({
    userId: req.user.id,
    requestId: req.id,
    startTime: Date.now()
  });

  requestState.set('theme', 'dark');
  const theme = requestState.get('theme');
}
```

#### Global State Manager

```javascript
import { globalStateManager } from '@coherent.js/state';

globalStateManager.set('appVersion', '1.0.0');
globalStateManager.set('config', { apiUrl: 'https://api.example.com' });

const version = globalStateManager.get('appVersion');
```

#### Context API

```javascript
import { provideContext, useContext } from '@coherent.js/state';

function renderApp() {
  provideContext('request', { userId: 123, theme: 'dark' });
  return renderComponents();
}

function UserProfile() {
  const requestState = useContext('request');
  return { div: { text: `User ID: ${requestState.userId}` } };
}
```

### Reactive Persistence

#### LocalStorage

```javascript
import { withLocalStorage } from '@coherent.js/state';

const userPrefs = withLocalStorage({ theme: 'dark', lang: 'en' }, 'user-prefs');
console.log(userPrefs.get('theme')); // Loaded from storage
userPrefs.set('theme', 'light');     // Saved automatically
```

#### SessionStorage

```javascript
import { withSessionStorage } from '@coherent.js/state';

const sessionData = withSessionStorage({ cart: [], checkoutStep: 1 }, 'session-data');
```

#### IndexedDB

```javascript
import { withIndexedDB } from '@coherent.js/state';

const largeDataset = await withIndexedDB(
  { data: [] },
  'app-data',
  { dbName: 'myApp', storeName: 'state' }
);
await largeDataset.set('data', hugeArray);
```

#### Custom Persistence

```javascript
import { createPersistentState } from '@coherent.js/state';

const customState = createPersistentState({ count: 0 }, {
  save: async (state) => {
    await fetch('/api/state', { method: 'POST', body: JSON.stringify(state) });
  },
  load: async () => {
    const response = await fetch('/api/state');
    return response.json();
  }
});
```

### Reactive State Validation

```javascript
import { createValidatedState, validators } from '@coherent.js/state';

const userForm = createValidatedState(
  { email: '', age: 0, username: '' },
  {
    validators: {
      email: validators.email('Invalid email format'),
      age: validators.range(18, 120, 'Age must be between 18 and 120'),
      username: validators.minLength(3, 'Username must be at least 3 characters')
    }
  }
);

userForm.set('email', 'user@example.com'); // Valid
try {
  userForm.set('email', 'invalid-email');  // Throws validation error
} catch (error) {
  console.error(error.message);
}
```

Available validators: `required`, `email`, `minLength`, `maxLength`, `pattern`, `range`, `min`, `max`, `custom`, `async`.

### Reactive State API Reference

```typescript
class Observable<T> {
  value: T;
  watch(callback: (newValue: T, oldValue: T) => void): () => void;
  unwatch(callback: Function): void;
  unwatchAll(): void;
}

class Computed<T> {
  readonly value: T;
  watch(callback: (newValue: T, oldValue: T) => void): () => void;
}

interface StateManager {
  get(key: string): any;
  set(key: string, value: any): this;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): this;
  toObject(): Record<string, any>;
}
```

### When to Use Which

Use `withState` from `@coherent.js/core` for:
- Simple component state during SSR
- Request-scoped state
- No need for reactivity or persistence

Use `@coherent.js/state` when you need:
- Reactive state with automatic UI updates (client-side)
- Persistence (LocalStorage, SessionStorage, IndexedDB)
- Built-in validators for data integrity
- Global shared state across components
- Computed properties, watchers, async state

## Testing State Components

### Unit Testing

```javascript
import { render } from '@coherent.js/core';

test('renders with initial state', () => {
  const html = render(Counter());
  expect(html).toContain('Count: 0');
});

test('increments count on button click', async () => {
  const { container, getByText } = renderComponent(Counter());
  const button = getByText('+');
  fireEvent.click(button);
  expect(getByText('Count: 1')).toBeInTheDocument();
});
```

### Integration Testing

```javascript
test('todo app workflow', async () => {
  const { container, getByPlaceholderText, getByText } = renderComponent(TodoApp());
  
  const input = getByPlaceholderText('Add a new task...');
  fireEvent.change(input, { target: { value: 'Test task' } });
  fireEvent.click(getByText('Add'));
  expect(getByText('Test task')).toBeInTheDocument();
  
  const checkbox = container.querySelector('input[type="checkbox"]');
  fireEvent.click(checkbox);
  expect(checkbox.checked).toBe(true);
});
```

## Best Practices

### 1. Keep State Minimal

```javascript
// Good - only necessary state
const Component = withState({ count: 0, isVisible: true })(/* ... */);

// Avoid - derived state
const Component = withState({ count: 0, isVisible: true, doubleCount: 0 })(/* ... */);
```

### 2. Use Immutable Updates

```javascript
// Good
setState({ items: [...state.items, newItem] });

// Avoid
state.items.push(newItem);
setState({ items: state.items });
```

### 3. Group Related State

```javascript
const FormComponent = withState({
  form: { name: '', email: '', message: '' },
  validation: { errors: {}, isValid: true }
})(/* ... */);
```

### 4. Handle Loading States

```javascript
const AsyncComponent = withState({
  data: null, loading: false, error: null
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

### 6. Choose the Right Utility

```javascript
withStateUtils.local({ count: 0 })                          // Simple local state
withStateUtils.persistent({ user: null }, 'user-data')       // Needs persistence
withStateUtils.reducer(initialState, reducer, actions)       // Complex state logic
withStateUtils.async({ data: null }, { fetchData: asyncFn }) // Async operations
```

## Debugging State

### Debug Logging

```javascript
const DebugComponent = withState(initialState, {
  debug: process.env.NODE_ENV === 'development'
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

## Migration from Simple State

**Before (v1.0.x):**
```javascript
const Counter = withState({ count: 0 })(Component);
```

**After (v1.1.0+):**
```javascript
// Still works! (backward compatible)
const Counter = withState({ count: 0 })(Component);

// Or use advanced features
const Counter = withState({ count: 0 }, {
  persistent: true,
  debug: true
})(Component);
```

---

For more advanced patterns and performance optimizations, see the [Performance Guide](../performance-optimizations.md) and [Advanced Components](./advanced-components.md).
