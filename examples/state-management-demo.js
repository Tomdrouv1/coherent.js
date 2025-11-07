/**
 * State Management Demo - @coherentjs/state Package
 *
 * This example demonstrates the new @coherentjs/state package features:
 * - Reactive observables and computed properties
 * - State persistence with localStorage
 * - State validation
 * - SSR-compatible state management
 *
 * @since v1.0.0-beta.2
 */

import { render } from '@coherentjs/core';
import {
  observable,
  computed,
  createReactiveState,
  withLocalStorage,
  createValidatedState,
  validators,
  provideContext,
  useContext
} from '@coherentjs/state';

// =============================================================================
// Example 1: Basic Observables
// =============================================================================

console.log('\n📦 Example 1: Basic Observables');

const count = observable(0);
const doubled = computed(() => count.value * 2);

// Watch for changes
count.watch((newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
  console.log(`Doubled is now: ${doubled.value}`);
});

count.value = 5;  // Logs: "Count changed from 0 to 5", "Doubled is now: 10"
count.value = 10; // Logs: "Count changed from 5 to 10", "Doubled is now: 20"

// =============================================================================
// Example 2: Reactive State Object
// =============================================================================

console.log('\n📦 Example 2: Reactive State Object');

const appState = createReactiveState({
  user: { name: 'Guest', isLoggedIn: false },
  theme: 'dark',
  notifications: []
});

// Watch specific paths
appState.watch('user.name', (newName, oldName) => {
  console.log(`User name changed from "${oldName}" to "${newName}"`);
});

appState.watch('theme', (newTheme) => {
  console.log(`Theme changed to: ${newTheme}`);
});

// Update state
appState.set('user.name', 'John Doe');
appState.set('user.isLoggedIn', true);
appState.set('theme', 'light');

// Get values
console.log('Current user:', appState.get('user'));
console.log('Current theme:', appState.get('theme'));

// =============================================================================
// Example 3: State Persistence with LocalStorage
// =============================================================================

console.log('\n📦 Example 3: State Persistence');

// Note: This example is for browser environments
// In Node.js, this will use a mock localStorage

const userPrefs = withLocalStorage(
  { theme: 'dark', language: 'en', fontSize: 14 },
  'user-preferences'
);

console.log('Loaded preferences:', userPrefs.toObject());

// Updates are automatically persisted
userPrefs.set('theme', 'light');
userPrefs.set('fontSize', 16);

console.log('Updated preferences:', userPrefs.toObject());
// These changes are now saved to localStorage!

// =============================================================================
// Example 4: State Validation
// =============================================================================

console.log('\n📦 Example 4: State Validation');

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

// Valid updates
try {
  userForm.set('email', 'user@example.com');
  userForm.set('age', 25);
  userForm.set('username', 'johndoe');
  console.log('✓ All validations passed!');
  console.log('Form data:', userForm.toObject());
} catch (error) {
  console.error('✗ Validation error:', error.message);
}

// Invalid update
try {
  userForm.set('email', 'invalid-email');
} catch (error) {
  console.error('✗ Validation error:', error.message);
}

// =============================================================================
// Example 5: SSR-Compatible State (Context API)
// =============================================================================

console.log('\n📦 Example 5: SSR Context API');

// Simulate a request handler
function handleRequest(userId) {
  const requestState = {
    userId,
    timestamp: new Date().toISOString(),
    theme: 'dark'
  };

  // Provide context for this request
  provideContext('request', requestState);

  // Render components that use the context
  const html = render(UserDashboard());

  console.log('Rendered HTML:', html);

  return html;
}

function UserDashboard() {
  const requestState = useContext('request');

  return {
    div: {
      className: `dashboard theme-${requestState.theme}`,
      children: [
        {
          h1: { text: 'User Dashboard' }
        },
        {
          p: { text: `User ID: ${requestState.userId}` }
        },
        {
          p: { text: `Request time: ${requestState.timestamp}` }
        }
      ]
    }
  };
}

// Simulate requests
handleRequest(123);
handleRequest(456);

// =============================================================================
// Example 6: Complete Application State
// =============================================================================

console.log('\n📦 Example 6: Complete Application State');

// Combining features: reactive + persistent + validated
const appConfig = createValidatedState(
  {
    user: { id: null, name: '', email: '' },
    settings: { theme: 'dark', notifications: true },
    cart: []
  },
  {
    validators: {
      'user.email': validators.email(),
      'settings.theme': validators.custom((value) => {
        return ['dark', 'light', 'auto'].includes(value)
          ? null
          : 'Invalid theme';
      })
    }
  }
);

// Make it persistent
const persistentConfig = withLocalStorage(appConfig, 'app-config');

// Watch for changes
persistentConfig.watch('user', (newUser) => {
  console.log('User updated:', newUser);
});

persistentConfig.watch('settings.theme', (newTheme) => {
  console.log('Theme changed to:', newTheme);
});

// Update state (validated and persisted)
try {
  persistentConfig.set('user', {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com'
  });

  persistentConfig.set('settings.theme', 'light');

  persistentConfig.set('cart', [
    { id: 1, name: 'Product A', price: 29.99 },
    { id: 2, name: 'Product B', price: 39.99 }
  ]);

  console.log('\n✓ All state updated successfully!');
  console.log('Final state:', JSON.stringify(persistentConfig.toObject(), null, 2));
} catch (error) {
  console.error('✗ Error:', error.message);
}

// =============================================================================
// Example 7: Reactive UI Component
// =============================================================================

console.log('\n📦 Example 7: Reactive UI Component');

// Create reactive counter
const counter = observable(0);

function CounterComponent() {
  // This would normally re-render automatically on changes
  return {
    div: {
      className: 'counter',
      children: [
        {
          h2: { text: 'Counter Example' }
        },
        {
          p: { text: `Count: ${counter.value}` }
        },
        {
          button: {
            text: 'Increment',
            onclick: () => {
              counter.value++;
              console.log(`Counter incremented to: ${counter.value}`);
            }
          }
        }
      ]
    }
  };
}

// Render initial state
console.log('Initial render:', render(CounterComponent()));

// Simulate clicks
counter.value++;
counter.value++;
counter.value++;

console.log('After increments:', render(CounterComponent()));

// =============================================================================
// Summary
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('📝 Summary of @coherentjs/state Features:');
console.log('='.repeat(80));
console.log('');
console.log('✓ Observable values with automatic dependency tracking');
console.log('✓ Computed properties that auto-update');
console.log('✓ Reactive state objects with path-based watching');
console.log('✓ LocalStorage/SessionStorage/IndexedDB persistence');
console.log('✓ Built-in validation with customizable validators');
console.log('✓ SSR-compatible context API');
console.log('✓ Type-safe with TypeScript definitions');
console.log('✓ Zero dependencies (except @coherentjs/core peer)');
console.log('');
console.log('🚀 Ready for production use in v1.0.0-beta.2!');
console.log('='.repeat(80));
