# Advanced State Management

**Package:** `@coherentjs/core`  
**Module:** `/src/components/component-system.js`  
**Since:** v1.1.0

## Overview

Coherent.js provides a powerful, feature-rich state management system through the `withState` HOC and `withStateUtils` utilities. This guide covers advanced state management patterns including persistent state, reducers, async operations, validation, and more.

## Table of Contents

1. [Basic State Management](#basic-state-management)
2. [Advanced withState Options](#advanced-withstate-options)
3. [withStateUtils Variants](#withstateutils-variants)
4. [Persistent State](#persistent-state)
5. [Reducer Pattern](#reducer-pattern)
6. [Async State Management](#async-state-management)
7. [State Validation](#state-validation)
8. [Shared State](#shared-state)
9. [Form State](#form-state)
10. [Loading & Error Handling](#loading--error-handling)
11. [Undo/Redo (History)](#undoredo-history)
12. [Computed Properties](#computed-properties)

---

## Basic State Management

### Simple State

```javascript
import { withState } from '@coherentjs/core';

const Counter = withState({ count: 0 })(({ state, stateUtils }) => {
  const { setState } = stateUtils;
  
  return {
    div: {
      'data-coherent-component': 'counter',
      children: [
        { p: { text: `Count: ${state.count}` } },
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
```

---

## Advanced withState Options

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

### Example with Options

```javascript
const TodoApp = withState({
  todos: [],
  filter: 'all'
}, {
  debug: true,
  persistent: true,
  storageKey: 'my-todos',
  validator: (state) => {
    if (!Array.isArray(state.todos)) {
      throw new Error('todos must be an array');
    }
    return true;
  },
  onStateChange: (newState, oldState) => {
    console.log('State changed:', oldState, '->', newState);
  }
})(TodoComponent);
```

---

## withStateUtils Variants

The `withStateUtils` object provides specialized state management utilities:

### 1. Local State (Simple)

```javascript
import { withStateUtils } from '@coherentjs/core';

const Component = withStateUtils.local({ count: 0 })(MyComponent);
```

### 2. Persistent State

Automatically saves state to localStorage:

```javascript
const Component = withStateUtils.persistent(
  { user: null, preferences: {} },
  'app-state'  // Storage key
)(MyComponent);
```

**Features:**
- Automatic localStorage sync
- Survives page refreshes
- JSON serialization

**Example:**
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

### 3. Reducer Pattern

Redux-like state management:

```javascript
const initialState = { count: 0 };

const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'RESET':
      return { ...state, count: 0 };
    default:
      return state;
  }
};

const actions = {
  increment: (state, setState) => {
    setState({ type: 'INCREMENT' });
  },
  decrement: (state, setState) => {
    setState({ type: 'DECREMENT' });
  },
  reset: (state, setState) => {
    setState({ type: 'RESET' });
  }
};

const Counter = withStateUtils.reducer(
  initialState,
  reducer,
  actions
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

### 4. Async State Management

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
      { 
        button: { 
          text: 'Fetch Data', 
          onclick: actions.fetchData 
        }
      },
      state.data && { pre: { text: JSON.stringify(state.data, null, 2) } }
    ]
  }
}));
```

### 5. Validated State

Enforce state validation rules:

```javascript
const validator = (state) => {
  if (state.age < 0 || state.age > 150) {
    throw new Error('Age must be between 0 and 150');
  }
  if (!state.email.includes('@')) {
    throw new Error('Invalid email format');
  }
  return true;
};

const UserForm = withStateUtils.validated({
  name: '',
  email: '',
  age: 0
}, validator)(FormComponent);
```

### 6. Shared State

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
          onclick: () => setState({ 
            theme: state.theme === 'light' ? 'dark' : 'light' 
          })
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

### 7. Form State

Specialized utilities for form handling:

```javascript
const ContactForm = withStateUtils.form({
  name: '',
  email: '',
  message: ''
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
      
      if (isValid) {
        console.log('Form submitted:', state);
      }
    },
    children: [
      {
        input: {
          type: 'text',
          placeholder: 'Name',
          value: state.name,
          oninput: (e) => actions.updateField('name', e.target.value)
        }
      },
      {
        input: {
          type: 'email',
          placeholder: 'Email',
          value: state.email,
          oninput: (e) => actions.updateField('email', e.target.value)
        }
      },
      {
        textarea: {
          placeholder: 'Message',
          value: state.message,
          oninput: (e) => actions.updateField('message', e.target.value)
        }
      },
      { button: { type: 'submit', text: 'Send' } },
      { button: { type: 'button', text: 'Reset', onclick: actions.resetForm } }
    ]
  }
}));
```

**Form Actions:**
- `updateField(field, value)` - Update single field
- `updateMultiple(updates)` - Update multiple fields
- `resetForm()` - Reset to initial state
- `validateForm(validator)` - Validate form state

### 8. Loading & Error Handling

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
      state._error && {
        div: {
          className: 'error',
          text: `Error: ${state._error.message}`
        }
      },
      !state._loading && state.users.length > 0 && {
        ul: {
          children: state.users.map(user => ({
            li: { text: user.name }
          }))
        }
      }
    ]
  }
}));
```

**Built-in State:**
- `_loading` (Boolean) - Loading indicator
- `_error` (Error|null) - Error object

**Actions:**
- `setLoading(boolean)` - Set loading state
- `setError(error)` - Set error state
- `clearError()` - Clear error
- `asyncAction(asyncFn)` - Execute async function with automatic loading/error handling

### 9. Undo/Redo (History)

Add undo/redo functionality:

```javascript
const TextEditor = withStateUtils.withHistory({
  text: ''
}, 10)(({ state, actions }) => ({
  div: {
    children: [
      {
        textarea: {
          value: state.present.text,
          oninput: (e) => actions.updatePresent({ text: e.target.value })
        }
      },
      {
        div: {
          children: [
            {
              button: {
                text: 'Undo',
                disabled: !actions.canUndo(state),
                onclick: actions.undo
              }
            },
            {
              button: {
                text: 'Redo',
                disabled: !actions.canRedo(state),
                onclick: actions.redo
              }
            }
          ]
        }
      }
    ]
  }
}));
```

**State Structure:**
```javascript
{
  present: { /* current state */ },
  past: [ /* previous states */ ],
  future: [ /* undone states */ ]
}
```

**Actions:**
- `undo()` - Undo last change
- `redo()` - Redo last undone change
- `updatePresent(newState)` - Update current state (adds to history)
- `canUndo(state)` - Check if undo is available
- `canRedo(state)` - Check if redo is available

### 10. Computed Properties

Add computed/derived state:

```javascript
const ShoppingCart = withStateUtils.computed({
  items: [
    { id: 1, name: 'Item 1', price: 10, quantity: 2 },
    { id: 2, name: 'Item 2', price: 20, quantity: 1 }
  ]
}, {
  // Computed properties
  total: (state) => state.items.reduce((sum, item) => 
    sum + (item.price * item.quantity), 0
  ),
  itemCount: (state) => state.items.reduce((sum, item) => 
    sum + item.quantity, 0
  ),
  isEmpty: (state) => state.items.length === 0
})(({ state }) => ({
  div: {
    children: [
      { h2: { text: 'Shopping Cart' } },
      {
        ul: {
          children: state.items.map(item => ({
            li: { text: `${item.name} x${item.quantity} - $${item.price * item.quantity}` }
          }))
        }
      },
      { p: { text: `Total Items: ${state.itemCount}` } },
      { p: { text: `Total Price: $${state.total}` } },
      state.isEmpty && { p: { text: 'Cart is empty' } }
    ]
  }
}));
```

---

## Best Practices

### 1. Choose the Right Utility

```javascript
// ✅ Simple local state
withStateUtils.local({ count: 0 })

// ✅ Needs persistence
withStateUtils.persistent({ user: null }, 'user-data')

// ✅ Complex state logic
withStateUtils.reducer(initialState, reducer, actions)

// ✅ Async operations
withStateUtils.async({ data: null }, { fetchData: asyncFn })
```

### 2. Immutable Updates

```javascript
// ✅ Good: Immutable
setState({ todos: [...state.todos, newTodo] });

// ❌ Bad: Mutation
state.todos.push(newTodo);
setState(state);
```

### 3. Validation

```javascript
// ✅ Good: Validate critical state
withStateUtils.validated(initialState, validator)

// ✅ Good: Inline validation
setState((prevState) => {
  if (newValue < 0) return prevState;
  return { ...prevState, value: newValue };
});
```

### 4. Debug Mode

```javascript
// Enable in development
const Component = withState(initialState, {
  debug: process.env.NODE_ENV === 'development'
})(MyComponent);
```

---

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

## See Also

- [Basic State Management](./state-management.md) - Getting started
- [API Reference](../api-reference.md) - Complete API
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - State management architecture

---

**Version:** 1.1.0+  
**Last Updated:** October 18, 2025
