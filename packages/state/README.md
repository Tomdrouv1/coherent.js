# @coherent.js/state

Reactive state management for Coherent.js applications with SSR support, persistence, and validation.

## Installation

```bash
npm install @coherent.js/state@beta
# or
pnpm add @coherent.js/state@beta
# or
yarn add @coherent.js/state@beta
```

## Features

- **Reactive State**: Observable values with computed properties and watchers
- **SSR-Compatible State**: Server-side state management during rendering
- **State Persistence**: LocalStorage, SessionStorage, and IndexedDB support
- **State Validation**: Built-in validation with custom validators
- **Context API**: Share state across components during SSR
- **Zero Dependencies**: Uses only @coherent.js/core as peer dependency

## Usage

### Reactive State (Client-Side)

```javascript
import { createReactiveState, observable, computed } from '@coherent.js/state';

// Create observable values
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

### SSR-Compatible State

```javascript
import { createState, provideContext } from '@coherent.js/state';

// Create state container for a request
const state = createState({ userId: 123, theme: 'dark' });

// Provide context during SSR
provideContext('request', state);

// Access in components
import { useContext } from '@coherent.js/state';

function MyComponent() {
  const requestState = useContext('request');
  const userId = requestState.get('userId');
  // ... render component
}
```

### State Persistence

```javascript
import { withLocalStorage, withSessionStorage } from '@coherent.js/state';

// Auto-persist to localStorage
const userPrefs = withLocalStorage({ theme: 'dark', lang: 'en' }, 'user-prefs');

// Auto-persist to sessionStorage
const sessionData = withSessionStorage({ cart: [] }, 'session-data');
```

### State Validation

```javascript
import { createValidatedState, validators } from '@coherent.js/state';

const userForm = createValidatedState(
  { email: '', age: 0 },
  {
    validators: {
      email: validators.email(),
      age: validators.range(18, 120)
    }
  }
);

userForm.set('email', 'invalid-email'); // Throws validation error
```

## API Reference

See the [full documentation](https://docs.coherentjs.dev/state) for detailed API reference.

## License

MIT
