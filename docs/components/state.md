# State Management in Coherent.js

Coherent.js offers two layers of state management: the `withState` higher-order component from `@coherent.js/core`, which injects a state container into a component, and the reactive primitives of `@coherent.js/state` (observables, computed values, persistence, validation and the SSR context API). This guide covers both.

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

> **Server and browser.** On the server, function-valued handlers such as `onclick: () => setState(...)` render nothing, and the state container created by `withState(...)(Component)` is shared by every request that renders the component, so keep per-request data in props. In the browser, `hydrate()` from `@coherent.js/client` attaches the handlers; `stateUtils.setState()` updates the container but does not patch the DOM by itself (call the hydrated instance's `rerender()`). For interactive client state, `hydrate()`'s own state (`event.setState()` / `instance.setState()`, see [Hydration](../client/hydration.md)) is the simplest option.

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

### Actions

`actions` are bound to the component's state and injected as the `actions` prop. Each receives `(state, setState, { props, context, args })`:

```javascript
const Counter = withState({ count: 0 }, {
  actions: {
    increment: (state, setState) => setState({ count: state.count + 1 }),
    add: (state, setState, { args: [amount] }) => setState({ count: state.count + amount }),
    reset: (state, setState) => setState({ count: 0 })
  }
})(({ state, actions }) => ({
  div: {
    children: [
      { p: { text: `Count: ${state.count}` } },
      { button: { text: '+', onclick: actions.increment } },
      { button: { text: '+10', onclick: () => actions.add(10) } },
      { button: { text: 'Reset', onclick: actions.reset } }
    ]
  }
}));
```

## State Persistence

### Local Storage Integration

```javascript
const Preferences = withState({
  preferences: { theme: 'light', language: 'en' }
}, {
  persistent: true,
  storageKey: 'app-preferences'   // saved to localStorage in the browser
})(({ state, setState }) => ({
  select: {
    value: state.preferences.theme,
    onchange: (event) => setState({ preferences: { ...state.preferences, theme: event.target.value } }),
    children: [
      { option: { value: 'light', text: 'Light' } },
      { option: { value: 'dark', text: 'Dark' } }
    ]
  }
}));
```

Without `window.localStorage` (on the server) an in-memory store is used instead. For stores that restore asynchronously, report write failures and sync across tabs, use the persistence helpers of `@coherent.js/state` ([Reactive Persistence](#reactive-persistence)).

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

To share state between components, keep it in one store from `@coherent.js/state` and read it where you need it:

```javascript
import { createReactiveState } from '@coherent.js/state';

export const appTheme = createReactiveState({ theme: 'light' });

const ThemeLabel = () => ({ p: { text: `Theme: ${appTheme.get('theme')}` } });
const ThemedPanel = () => ({ div: { className: `theme-${appTheme.get('theme')}`, text: 'Shares the theme' } });

appTheme.set('theme', 'dark'); // both read the new value on their next render
```

In the browser, `appTheme.watch('theme', ...)` can trigger the re-render (for example the `rerender()` of a hydrated instance). On the server a module-level store is shared by every request; use the [Context API](#context-api) for per-request values.

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

`withStateUtils.withLoading()` is `async`: await it to get the higher-order component.

```javascript
const withUsersLoading = await withStateUtils.withLoading({ users: [] });

const DataLoader = withUsersLoading(({ state, actions }) => ({
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
pnpm add @coherent.js/state
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

`watch()` calls the callback once immediately with the current value, then after every change. Watchers run after the write completes, each in isolation: an error goes to the `onError` option (or `globalErrorHandler`) and the others still run. Assigning an identical primitive notifies nobody, and `batch(() => { ... })` runs watchers once, after the outermost batch, with the final values.

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

appState.set('user.name', 'Jane');   // writes a copy of `user`; notifies 'user' and 'user.name'
console.log(appState.get('user.name')); // 'Jane'
```

Keys containing a dot are paths: `get`, `set`, `has`, `watch` and `delete` all accept them.

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
import { render } from '@coherent.js/core';
import { runWithContext, provideContext, useContext, createContextProvider } from '@coherent.js/state';

function UserProfile() {
  const request = useContext('request');
  return { div: { text: `User ID: ${request.userId}` } };
}

app.get('/profile', (req, res) => runWithContext(async () => {
  provideContext('request', { userId: req.user.id, theme: 'dark' });
  const data = await loadProfile(req.user.id);  // the context survives the await
  res.send(render(ProfilePage(data)));           // UserProfile() inside reads it
}));

// Scope a value to part of the tree
render({ div: { children: [createContextProvider('theme', 'dark', ThemedButton)] } });
```

On Node, context lives in `AsyncLocalStorage`: a value provided in one request is never visible to a concurrent one. `runWithContext(fn, values?)` gives `fn` a fresh scope that ends when it returns — use it per request, and always around a streaming render. Browsers have no `AsyncLocalStorage`, so there the context is only reliable for synchronous rendering. `useContext(key)` falls back to `globalStateManager` when nothing was provided for `key`.

### Reactive Persistence

#### LocalStorage

```javascript
import { withLocalStorage } from '@coherent.js/state';

const userPrefs = withLocalStorage({ theme: 'dark', lang: 'en' }, 'user-prefs');
await userPrefs.ready;                   // stored state is restored asynchronously
console.log(userPrefs.getState().theme);
userPrefs.setState({ theme: 'light' });   // saved automatically (debounced)
```

Updates made before `ready` settles win over the stored values. A failed write (for example `QuotaExceededError`) goes to `onError`, and `save()` / `persist()` resolve to `false`. `crossTab: true` syncs stores sharing a key across tabs; call `destroy()` when a store is no longer needed.

#### SessionStorage and IndexedDB

```javascript
import { withSessionStorage, withIndexedDB } from '@coherent.js/state';

const sessionData = withSessionStorage({ cart: [], checkoutStep: 1 }, 'session-data');
const largeDataset = withIndexedDB({ data: [] }, 'app-data');
await largeDataset.ready;
largeDataset.setState({ data: hugeArray });
```

On the server (no `window`), these browser backends read and write nothing — Web Storage there would be shared by every request.

#### Custom Persistence

Pass an `adapter` with async `get`, `set`, `remove` and `clear` (this also works on the server):

```javascript
import { createPersistentState } from '@coherent.js/state';

const remoteState = createPersistentState({ count: 0 }, {
  key: 'counter',
  adapter: {
    async get(key) { return (await fetch(`/api/state/${key}`)).text(); },
    async set(key, value) { return (await fetch(`/api/state/${key}`, { method: 'PUT', body: value })).ok; },
    async remove(key) { await fetch(`/api/state/${key}`, { method: 'DELETE' }); },
    async clear() {}
  }
});
```

`encrypt: true` requires an `encryptionKey` and is XOR **obfuscation**, not encryption: the key ships to the browser. Never keep secrets in browser storage.

### Reactive State Validation

```javascript
import { createValidatedState, validators } from '@coherent.js/state';

const userForm = createValidatedState(
  { email: 'ada@example.com', age: 36, username: 'ada' },
  {
    validators: {
      email: validators.email,
      age: validators.range(18, 120),
      username: validators.length(3, 20)
    }
  }
);

userForm.setState({ email: 'user@example.com' }); // valid: applied
userForm.setState({ email: 'invalid-email' });    // invalid: ignored
userForm.getErrors();  // [{ path: 'email', message: 'Invalid email format', type: 'custom', value: 'invalid-email' }]
```

A validator is `(value) => true | message`. Built-ins: `validators.email`, `validators.url`, `validators.required`, `validators.range(min, max)`, `validators.length(min, max)` and `validators.pattern(regex)`. Every update validates the whole resulting state, so start from a valid initial state. With `strict: true`, an invalid `setState()` throws an `Error('Validation failed')` carrying `validationErrors`; `onError` receives the errors either way. A JSON-Schema-style `schema` option is supported too (`type`, `required`, `properties`, `additionalProperties`...).

### Reactive State API Reference

```typescript
class Observable<T> {
  value: T;
  watch(callback: (newValue: T, oldValue: T) => void): () => void; // returns an unwatch function
  unwatch(callback: Function): void;
  unwatchAll(): void;
  peek(): T;                                                        // read without tracking
}

// createReactiveState() / ReactiveState
interface ReactiveState {
  get(path: string): any;
  set(path: string, value: any): void;
  has(path: string): boolean;
  delete(path: string): boolean;
  watch(path: string, callback: (newValue: any, oldValue: any) => void): () => void;
  computed(name: string, getter: () => any): Observable<any>;
  batch(updates: ((state: ReactiveState) => void) | Record<string, any>): void;
  clear(): void;
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

Render the component and assert on the HTML:

```javascript
import { describe, it, expect } from 'vitest';
import { render } from '@coherent.js/core';
import { renderComponent } from '@coherent.js/tooling/testing';

describe('Counter', () => {
  it('renders with initial state', () => {
    expect(render(Counter())).toContain('Count: 0');
  });

  it('renders the increment button', () => {
    const result = renderComponent(Counter());
    expect(result.getByText('+')).toBeTruthy();
  });
});
```

Test state logic (reducers, actions, validators) as plain functions; test click behaviour where it runs, in the browser, with `hydrate()` (see [Hydration](../client/hydration.md)).

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
      process.env.NODE_ENV === 'development' && {
        details: {
          children: [
            { summary: { text: 'State Inspector' } },
            { pre: { text: JSON.stringify(state, null, 2) } }
          ]
        }
      }
    ]
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

For more advanced patterns and performance optimizations, see the [Performance Guide](../deployment/performance.md) and [Advanced Components](advanced.md).
