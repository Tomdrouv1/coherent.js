# @coherent.js/state

Reactive state management for Coherent.js applications with SSR support, persistence, and validation.

## Installation

```bash
npm install @coherent.js/state
# or
pnpm add @coherent.js/state
# or
yarn add @coherent.js/state
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

Computed values recompute lazily and only when something they read changed;
reading a computed from its own getter throws. Watchers run after each write,
or once after `batch(() => { ... })`, each in isolation: an error is passed to
the `onError` option (or `globalErrorHandler`) and the others still run.
Writing an identical primitive notifies nobody.

`createReactiveState()` keys accept dot paths:

```javascript
const app = createReactiveState({ user: { name: 'Ada', age: 36 } });
app.watch('user.name', (name, previous) => console.log(previous, '→', name));
app.set('user.name', 'John'); // writes a copy of `user`; notifies 'user' and 'user.name'
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
gives `fn` a fresh scope that ends when it returns; use it per request.
`provideContext()` throws outside it on Node: there the value would outlive the
request (a keep-alive connection carries it into the next one). A provider
evaluates its subtree's components with the value set, so it needs no
`runWithContext()` of its own. Browsers have no `AsyncLocalStorage`, so there context is only reliable for
synchronous rendering. `useContext(key)` falls back to `globalStateManager`
when no context was provided for `key`.

### State Persistence

```javascript
import { withLocalStorage, withSessionStorage } from '@coherent.js/state';

// Auto-persist to localStorage
const userPrefs = withLocalStorage({ theme: 'dark', lang: 'en' }, 'user-prefs');

// Auto-persist to sessionStorage
const sessionData = withSessionStorage({ cart: [] }, 'session-data');

// Stored state is restored asynchronously on creation
await userPrefs.ready;
```

Updates made before `ready` settles win over the stored values. Write failures
(for example `QuotaExceededError`) are reported through `onError`, never
`onSave`. `crossTab: true` syncs stores that share a key across tabs;
call `destroy()` when a store is no longer needed.

On the server (no `window`), browser storage backends read and write nothing —
Web Storage there would be shared by every request. Pass an `adapter` to
persist server-side.

`encrypt: true` requires an `encryptionKey` and is XOR **obfuscation**, not
encryption: the key ships to the browser. Never keep secrets in browser
storage.

### State Validation

```javascript
import { createValidatedState, validators } from '@coherent.js/state';

const userForm = createValidatedState(
  { email: 'ada@example.com', age: 36 },
  {
    validators: {
      email: validators.email,
      age: validators.range(18, 120)
    }
  }
);

userForm.setState({ email: 'invalid-email' }); // invalid: not applied
userForm.getErrors(); // [{ path: 'email', message: 'Invalid email format', ... }]
```

A validator is `(value) => true | message`; `validators.email`, `url` and `required` are used
as is, `range(min, max)`, `length(min, max)` and `pattern(regex)` are factories. Every update
validates the whole resulting state, so start from a valid one. With `strict: true` an invalid
`setState()` throws instead.

## API Reference

See the [full documentation](https://docs.coherentjs.dev/state) for detailed API reference.

## License

MIT
