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
import { render } from '@coherent.js/core';
import {
  createState,
  runWithContext,
  provideContext,
  useContext,
  createContextProvider
} from '@coherent.js/state';

// Run each request in its own context scope
app.get('/', (req, res) => runWithContext(async () => {
  // Create state container for this request
  const state = createState({ userId: req.user.id, theme: 'dark' });
  provideContext('request', state);

  const user = await loadUser(req);   // context survives the await
  res.send(render(Page(user)));
}));

// Access in components
function MyComponent() {
  const requestState = useContext('request');
  const userId = requestState.get('userId');
  // ... render component
}

// Scope a value to part of the tree
const Page = (user) => ({
  main: {
    children: [
      createContextProvider('theme', user.theme, { button: { className: () => `btn-${useContext('theme')}` } }),
      Footer()   // does not see 'theme'
    ]
  }
});
```

On Node, context lives in `AsyncLocalStorage`: a value provided by one request
is never visible to another, including across `await`s. `runWithContext(fn)`
gives `fn` a fresh scope that ends when it returns; use it per request, and
always around a streaming render, whose yields otherwise lose provider values.
Browsers have no `AsyncLocalStorage`, so there context is only reliable for
synchronous rendering. `useContext(key)` falls back to `globalStateManager`
when no context was provided for `key`.

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
