# Package Reorganization Migration Guide

**Version:** v1.0.0-beta.2
**Date:** 2025-11-04

## Overview

In v1.0.0-beta.2, we've reorganized the Coherent.js packages for better separation of concerns and improved maintainability. This guide will help you migrate your code to use the new package structure.

## What Changed?

### New Package: @coherentjs/state

**Reactive state management** has been moved to a dedicated package.

**Before (v1.0.0-beta.1):**
```javascript
// ❌ These were internal, not exported
import { ReactiveState } from '@coherentjs/core/src/state/reactive-state.js';
import { createPersistentState } from '@coherentjs/core/src/state/state-persistence.js';
```

**After (v1.0.0-beta.2):**
```javascript
// ✅ Clean, documented API
import {
  createReactiveState,
  observable,
  computed,
  createPersistentState,
  withLocalStorage,
  validators
} from '@coherentjs/state';
```

**Installation:**
```bash
npm install @coherentjs/state@beta
```

### Client-Side Router Moved

**Client-side routing** has been moved to `@coherentjs/client`.

**Before:**
```javascript
// ❌ Was internal in core
import { createRouter } from '@coherentjs/core/src/routing/router.js';
```

**After:**
```javascript
// ✅ Properly exported
import { createRouter } from '@coherentjs/client/router';
```

**Note:** `@coherentjs/client` also includes hydration and HMR, so you likely already have it installed.

### Forms Consolidation

**Forms and validation** are now fully in `@coherentjs/forms`.

**Before:**
```javascript
// ❌ Split between packages
import { createForm } from '@coherentjs/forms';
import { formValidators } from '@coherentjs/core/src/forms/forms.js';
```

**After:**
```javascript
// ✅ Everything in one place
import {
  createForm,
  formValidators,
  validators,
  FormBuilder
} from '@coherentjs/forms';

// Advanced reactive validation
import {
  createReactiveForm,
  validationRules
} from '@coherentjs/forms/advanced-validation';
```

### DevTools Consolidation

**Development tools** are now complete in `@coherentjs/devtools`.

**Before:**
```javascript
// ❌ Partial in core
import { DevTools } from '@coherentjs/core/src/dev/dev-tools.js';
```

**After:**
```javascript
// ✅ Full devtools suite
import {
  DevTools,
  createDevTools,
  ComponentInspector,
  PerformanceProfiler
} from '@coherentjs/devtools';
```

### New Core Exports

**Utilities now exported** from `@coherentjs/core`.

**New exports:**
```javascript
import {
  // Lifecycle (now exported)
  ComponentLifecycle,
  LIFECYCLE_PHASES,
  withLifecycle,
  createLifecycleHooks,
  useHooks,
  lifecycleUtils,

  // Object factory (now exported)
  h,
  createElement,
  createTextNode,

  // Component cache (now exported)
  ComponentCache,
  createComponentCache,
  memoize
} from '@coherentjs/core';
```

## Migration Steps

### Step 1: Update Dependencies

Add the new state package if you need reactive state:

```bash
npm install @coherentjs/state@beta
```

Update other packages to the latest beta:

```bash
npm install @coherentjs/core@beta @coherentjs/client@beta @coherentjs/forms@beta @coherentjs/devtools@beta
```

### Step 2: Update Imports

#### For Reactive State

**Old:**
```javascript
// If you were using internal imports (not recommended)
import { ReactiveState } from '@coherentjs/core/src/state/reactive-state.js';
import { createPersistentState } from '@coherentjs/core/src/state/state-persistence.js';
```

**New:**
```javascript
import {
  ReactiveState,
  createReactiveState,
  observable,
  computed,
  createPersistentState,
  withLocalStorage,
  withSessionStorage,
  createValidatedState,
  validators
} from '@coherentjs/state';
```

#### For SSR State (No Changes Needed)

The `withState` HOC remains in `@coherentjs/core`:

```javascript
// ✅ Still works the same
import { withState, withStateUtils } from '@coherentjs/core';

const Counter = withState({ count: 0 })(({ state, stateUtils }) => {
  // Your component
});
```

#### For Client Router

**Old:**
```javascript
import { createRouter } from '@coherentjs/core/src/routing/router.js';
```

**New:**
```javascript
import { createRouter } from '@coherentjs/client/router';
```

#### For Forms

**Old:**
```javascript
import { createForm } from '@coherentjs/forms';
import { formValidators } from '@coherentjs/core/src/forms/forms.js';
```

**New:**
```javascript
// Basic forms
import { createForm, formValidators } from '@coherentjs/forms';

// Advanced reactive forms
import { createReactiveForm } from '@coherentjs/forms/advanced-validation';
```

#### For DevTools

**Old:**
```javascript
import { DevTools } from '@coherentjs/core/src/dev/dev-tools.js';
```

**New:**
```javascript
import { DevTools, createDevTools } from '@coherentjs/devtools';
```

### Step 3: Update Code

#### State Management Migration

If you were using component state with `withState`, **no changes needed**:

```javascript
// ✅ Still works
import { withState } from '@coherentjs/core';

const MyComponent = withState({ count: 0 })(({ state }) => {
  // ...
});
```

If you need **reactive state**, use the new package:

```javascript
import { createReactiveState, observable } from '@coherentjs/state';

// Reactive observable
const count = observable(0);
count.watch((newVal) => console.log(newVal));

// Reactive state object
const state = createReactiveState({ count: 0 });
state.watch('count', (newVal) => console.log(newVal));
```

#### Router Migration

**Old:**
```javascript
import { createRouter } from '@coherentjs/core/src/routing/router.js';

const router = createRouter({
  routes: {
    '/': HomePage
  }
});
```

**New (same API, different import):**
```javascript
import { createRouter } from '@coherentjs/client/router';

const router = createRouter({
  routes: {
    '/': HomePage
  }
});
```

#### Forms Migration

**Old:**
```javascript
import { createForm } from '@coherentjs/forms';

const form = createForm({
  fields: { email: { validators: ['required', 'email'] } }
});
```

**New (same API, more features):**
```javascript
import { createForm, validators } from '@coherentjs/forms';

// Option 1: Basic forms (same as before)
const form = createForm({
  fields: { email: { validators: ['required', 'email'] } }
});

// Option 2: Advanced reactive forms (new)
import { createReactiveForm } from '@coherentjs/forms/advanced-validation';

const form = createReactiveForm({
  email: '',
  password: ''
}, {
  validators: {
    email: validators.email(),
    password: validators.minLength(8)
  }
});
```

## Breaking Changes

### None for Public APIs

All publicly documented APIs remain unchanged. The reorganization only affects:

1. **Internal imports** - If you were importing from `/src/` paths (not recommended), you need to update
2. **New features** - New packages provide features that were previously internal or unavailable

### What Stays the Same

These imports and APIs are **unchanged**:

```javascript
// ✅ All still work
import { render, createComponent, withState, memo } from '@coherentjs/core';
import { hydrate } from '@coherentjs/client';
import { createForm } from '@coherentjs/forms';
import { connectDatabase } from '@coherentjs/database';
```

## Recommendations

### Use Dedicated Packages

For better tree-shaking and clarity, import from dedicated packages:

```javascript
// ✅ Good - clear intent
import { createReactiveState } from '@coherentjs/state';
import { createRouter } from '@coherentjs/client/router';
import { createForm } from '@coherentjs/forms';

// ❌ Avoid - less clear
import { withState } from '@coherentjs/core'; // for reactive state
```

### Reactive State vs. withState

**Use `@coherentjs/state`** when you need:
- Client-side reactivity (automatic UI updates)
- State persistence (localStorage, sessionStorage, IndexedDB)
- State validation
- Computed properties
- Watchers and observers

**Use `withState` from `@coherentjs/core`** when you need:
- Simple component state during SSR
- Request-scoped state
- No client-side reactivity

### Example Decision Tree

```
Need state management?
│
├─ SSR only, no client reactivity?
│  └─ Use: withState from @coherentjs/core
│
├─ Client-side with automatic updates?
│  └─ Use: @coherentjs/state
│
└─ Both SSR and client reactivity?
   └─ Use: @coherentjs/state + provideContext for SSR
```

## Complete Migration Example

### Before

```javascript
import { render, withState } from '@coherentjs/core';
import { createForm } from '@coherentjs/forms';

const App = withState({ user: null })(({ state }) => {
  return {
    div: { text: `User: ${state.user?.name || 'Guest'}` }
  };
});
```

### After (Minimal Changes)

```javascript
// ✅ Exactly the same - withState still in core
import { render, withState } from '@coherentjs/core';
import { createForm } from '@coherentjs/forms';

const App = withState({ user: null })(({ state }) => {
  return {
    div: { text: `User: ${state.user?.name || 'Guest'}` }
  };
});
```

### After (Using New Features)

```javascript
// ✅ Using new reactive state
import { render } from '@coherentjs/core';
import { createReactiveState } from '@coherentjs/state';
import { createForm } from '@coherentjs/forms';

const appState = createReactiveState({ user: null });

appState.watch('user', (newUser) => {
  console.log('User changed:', newUser);
  // Re-render automatically
});

const App = () => {
  return {
    div: { text: `User: ${appState.get('user')?.name || 'Guest'}` }
  };
};
```

## Testing Your Migration

1. **Install dependencies:**
   ```bash
   npm install @coherentjs/core@beta @coherentjs/state@beta @coherentjs/client@beta @coherentjs/forms@beta
   ```

2. **Update imports** as shown above

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Check linting:**
   ```bash
   npm run lint
   ```

5. **Test in development:**
   ```bash
   npm run dev
   ```

## Getting Help

- **Documentation:** [docs.coherentjs.dev](https://docs.coherentjs.dev)
- **Issues:** [GitHub Issues](https://github.com/Tomdrouv1/coherent.js/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Tomdrouv1/coherent.js/discussions)

## What's Next?

After migration, explore the new features:

- [Reactive State Guide](/docs/components/reactive-state.md)
- [Client Router Guide](/docs/client-side/client-router.md)
- [Advanced Forms](/docs/components/forms.md)
- [DevTools Guide](/docs/devtools/getting-started.md)

## Summary

- ✅ **No breaking changes** for documented public APIs
- ✅ **New `@coherentjs/state` package** for reactive state management
- ✅ **Router moved** to `@coherentjs/client/router`
- ✅ **Forms consolidated** in `@coherentjs/forms`
- ✅ **DevTools complete** in `@coherentjs/devtools`
- ✅ **New core exports** for lifecycle, object factory, and caching

Most users can upgrade with **zero code changes**. New features are opt-in!
