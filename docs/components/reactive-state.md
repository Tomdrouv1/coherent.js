# Reactive State Management

**Package:** `@coherentjs/state`
**Since:** v1.0.0-beta.2

## Overview

The `@coherentjs/state` package provides a comprehensive reactive state management solution for Coherent.js applications. It includes reactive observables, computed properties, state persistence, validation, and SSR-compatible state management.

## Installation

```bash
npm install @coherentjs/state@beta
# or
pnpm add @coherentjs/state@beta
# or
yarn add @coherentjs/state@beta
```

## Table of Contents

1. [Reactive State (Client-Side)](#reactive-state-client-side)
2. [SSR-Compatible State](#ssr-compatible-state)
3. [State Persistence](#state-persistence)
4. [State Validation](#state-validation)
5. [Context API](#context-api)

---

## Reactive State (Client-Side)

### Observables

Create reactive values that automatically track changes:

```javascript
import { observable, computed } from '@coherentjs/state';

// Create observable
const count = observable(0);
const doubled = computed(() => count.value * 2);

// Watch for changes
count.watch((newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
});

// Update value
count.value = 5; // Triggers watcher and updates computed
console.log(doubled.value); // 10
```

### Reactive State Class

For more complex state management:

```javascript
import { createReactiveState } from '@coherentjs/state';

const appState = createReactiveState({
  user: { name: 'John', age: 30 },
  settings: { theme: 'dark' }
});

// Watch specific paths
appState.watch('user.name', (newName, oldName) => {
  console.log(`User name changed to ${newName}`);
});

// Update state
appState.set('user.name', 'Jane');
appState.set('settings.theme', 'light');

// Get values
console.log(appState.get('user.name')); // 'Jane'
```

### Computed Properties

Create derived values that automatically update:

```javascript
import { observable, computed } from '@coherentjs/state';

const firstName = observable('John');
const lastName = observable('Doe');

const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`;
});

console.log(fullName.value); // 'John Doe'

firstName.value = 'Jane';
console.log(fullName.value); // 'Jane Doe' (automatically updated)
```

---

## SSR-Compatible State

### Request-Scoped State

For server-side rendering, use non-reactive state that's scoped to a request:

```javascript
import { createState } from '@coherentjs/state';

// In your request handler
function handleRequest(req, res) {
  const requestState = createState({
    userId: req.user.id,
    requestId: req.id,
    startTime: Date.now()
  });

  // Use state during rendering
  requestState.set('theme', 'dark');
  const theme = requestState.get('theme');

  // State is automatically cleaned up after request
}
```

### Global State Manager

Share state across the application during SSR:

```javascript
import { globalStateManager } from '@coherentjs/state';

// Set global state
globalStateManager.set('appVersion', '1.0.0');
globalStateManager.set('config', { apiUrl: 'https://api.example.com' });

// Get global state
const version = globalStateManager.get('appVersion');
const config = globalStateManager.get('config');

// Clear when needed
globalStateManager.clear('appVersion');
```

### Context API

Share state across components during SSR:

```javascript
import { provideContext, useContext } from '@coherentjs/state';

// Provide context during rendering
function renderApp() {
  const requestState = { userId: 123, theme: 'dark' };

  provideContext('request', requestState);

  // Render your components
  return renderComponents();
}

// Use context in components
function UserProfile() {
  const requestState = useContext('request');
  const userId = requestState.userId;

  return {
    div: {
      text: `User ID: ${userId}`
    }
  };
}
```

---

## State Persistence

### LocalStorage Persistence

Automatically persist state to localStorage:

```javascript
import { withLocalStorage } from '@coherentjs/state';

const userPrefs = withLocalStorage(
  { theme: 'dark', lang: 'en' },
  'user-prefs'
);

// State is automatically loaded from localStorage
console.log(userPrefs.get('theme')); // 'dark' (loaded from storage)

// Updates are automatically persisted
userPrefs.set('theme', 'light'); // Saved to localStorage
```

### SessionStorage Persistence

For session-scoped state:

```javascript
import { withSessionStorage } from '@coherentjs/state';

const sessionData = withSessionStorage(
  { cart: [], checkoutStep: 1 },
  'session-data'
);

sessionData.set('cart', [{ id: 1, name: 'Product' }]);
// Persisted to sessionStorage
```

### IndexedDB Persistence

For larger datasets:

```javascript
import { withIndexedDB } from '@coherentjs/state';

const largeDataset = await withIndexedDB(
  { data: [] },
  'app-data',
  { dbName: 'myApp', storeName: 'state' }
);

// Works asynchronously with IndexedDB
await largeDataset.set('data', hugeArray);
```

### Custom Persistence

Create your own persistence strategy:

```javascript
import { createPersistentState } from '@coherentjs/state';

const customState = createPersistentState(
  { count: 0 },
  {
    save: async (state) => {
      // Save to your backend
      await fetch('/api/state', {
        method: 'POST',
        body: JSON.stringify(state)
      });
    },
    load: async () => {
      // Load from your backend
      const response = await fetch('/api/state');
      return response.json();
    }
  }
);
```

---

## State Validation

### Built-in Validators

Validate state changes automatically:

```javascript
import { createValidatedState, validators } from '@coherentjs/state';

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

// Valid update
userForm.set('email', 'user@example.com'); // ✓

// Invalid update
try {
  userForm.set('email', 'invalid-email'); // ✗ Throws validation error
} catch (error) {
  console.error(error.message); // 'Invalid email format'
}
```

### Available Validators

```javascript
import { validators } from '@coherentjs/state';

// String validators
validators.required('Field is required');
validators.email('Invalid email');
validators.minLength(5, 'Too short');
validators.maxLength(100, 'Too long');
validators.pattern(/^[a-z]+$/, 'Only lowercase letters');

// Number validators
validators.range(0, 100, 'Must be 0-100');
validators.min(0, 'Must be positive');
validators.max(100, 'Too large');

// Custom validators
validators.custom((value) => {
  if (value !== 'expected') {
    return 'Value must be "expected"';
  }
  return null; // null means valid
});

// Async validators
validators.async(async (value) => {
  const exists = await checkUsernameExists(value);
  return exists ? 'Username already taken' : null;
});
```

### Custom Validation

```javascript
const state = createValidatedState(
  { password: '', confirmPassword: '' },
  {
    validators: {
      password: (value) => {
        if (value.length < 8) return 'Password too short';
        if (!/[A-Z]/.test(value)) return 'Must contain uppercase';
        if (!/[0-9]/.test(value)) return 'Must contain number';
        return null;
      }
    },
    // Validate entire state object
    validate: (state) => {
      if (state.password !== state.confirmPassword) {
        throw new Error('Passwords do not match');
      }
    }
  }
);
```

---

## Complete Example

Combining all features:

```javascript
import {
  createReactiveState,
  withLocalStorage,
  createValidatedState,
  validators,
  provideContext
} from '@coherentjs/state';

// 1. Create validated, persistent reactive state
const appState = createValidatedState(
  { user: null, theme: 'dark', notifications: [] },
  {
    validators: {
      theme: validators.custom((value) => {
        return ['dark', 'light'].includes(value) ? null : 'Invalid theme';
      })
    }
  }
);

// 2. Persist to localStorage
const persistentState = withLocalStorage(appState, 'app-state');

// 3. Provide via context for SSR
provideContext('appState', persistentState);

// 4. Watch for changes
persistentState.watch('theme', (newTheme) => {
  document.body.setAttribute('data-theme', newTheme);
});

// 5. Update state
persistentState.set('theme', 'light'); // Validated, persisted, and reactive
```

---

## API Reference

### Observable

```typescript
class Observable<T> {
  value: T;
  watch(callback: (newValue: T, oldValue: T) => void): () => void;
  unwatch(callback: Function): void;
  unwatchAll(): void;
}
```

### Computed

```typescript
class Computed<T> {
  readonly value: T;
  watch(callback: (newValue: T, oldValue: T) => void): () => void;
}
```

### State Manager

```typescript
interface StateManager {
  get(key: string): any;
  set(key: string, value: any): this;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): this;
  toObject(): Record<string, any>;
}
```

---

## Comparison with Core State

The `@coherentjs/core` package includes `withState` for component-level state management during SSR. Use `@coherentjs/state` when you need:

- **Reactive state**: Automatic UI updates on state changes (client-side)
- **Persistence**: LocalStorage, SessionStorage, or IndexedDB
- **Validation**: Built-in validators for data integrity
- **Global state**: Shared state across multiple components
- **Advanced features**: Computed properties, watchers, async state

Use `withState` from `@coherentjs/core` for:
- Simple component state during SSR
- Request-scoped state
- No need for reactivity or persistence

---

## See Also

- [Advanced State Management](/docs/components/advanced-state-management.md) - Using withState from @coherentjs/core
- [State Management](/docs/components/state-management.md) - Basic state patterns
- [Forms Package](/docs/components/forms.md) - Form state with validation
