# Package Reorganization Migration Guide

**Since:** v1.0.0-beta.2

This guide helps you migrate from v1.0.0-beta.1 to the reorganized package structure in v1.0.0-beta.2, where functionality has been moved to dedicated packages for better separation of concerns.

## Overview

In v1.0.0-beta.2, we've reorganized the Coherent.js ecosystem to provide better modularity and separation of concerns:

### New Packages

1. **@coherent.js/state** - Dedicated reactive state management package
2. **@coherent.js/forms** - Comprehensive forms handling with validation
3. **@coherent.js/devtools** - Developer tools and debugging utilities

### Moved Functionality

1. **Client-side router** - Moved from `@coherent.js/core` to `@coherent.js/client`
2. **Lifecycle hooks** - Exported from `@coherent.js/core` for better accessibility
3. **Object factory functions** - Exported from `@coherent.js/core` for better accessibility
4. **Component cache** - Exported from `@coherent.js/core` for better accessibility

## Migration Steps

### 1. Install New Packages

```bash
# Install new dedicated packages
pnpm add @coherent.js/state@beta
pnpm add @coherent.js/forms@beta
pnpm add @coherent.js/devtools@beta

# Client router is now in @coherent.js/client (already installed)
```

### 2. Update State Management Imports

**Before (v1.0.0-beta.1):**
```javascript
import { withState } from '@coherent.js/core';
```

**After (v1.0.0-beta.2):**
```javascript
// For reactive client-side state (new recommended approach)
import { observable, computed, createReactiveState } from '@coherent.js/state';

// For SSR-compatible component state (still available)
import { withState } from '@coherent.js/core';
```

### 3. Update Router Imports

**Before (v1.0.0-beta.1):**
```javascript
import { createRouter } from '@coherent.js/core/router';
```

**After (v1.0.0-beta.2):**
```javascript
import { createRouter } from '@coherent.js/client/router';
```

### 4. Update Lifecycle Hook Imports

**Before (v1.0.0-beta.1):**
```javascript
import { ComponentLifecycle, withLifecycle } from '@coherent.js/core/internal/lifecycle';
```

**After (v1.0.0-beta.2):**
```javascript
import { ComponentLifecycle, withLifecycle } from '@coherent.js/core';
```

### 5. Update Object Factory Imports

**Before (v1.0.0-beta.1):**
```javascript
import { h, createElement } from '@coherent.js/core/internal/factory';
```

**After (v1.0.0-beta.2):**
```javascript
import { h, createElement } from '@coherent.js/core';
```

### 6. Update Component Cache Imports

**Before (v1.0.0-beta.1):**
```javascript
import { ComponentCache } from '@coherent.js/core/internal/cache';
```

**After (v1.0.0-beta.2):**
```javascript
import { ComponentCache } from '@coherent.js/core';
```

## Code Examples

### Reactive State (New Recommended Approach)

**Before (v1.0.0-beta.1 - withState):**
```javascript
import { withState } from '@coherent.js/core';

const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    children: [
      { p: { text: `Count: ${state.count}` } },
      { 
        button: { 
          text: 'Increment', 
          onclick: () => setState({ count: state.count + 1 })
        }
      }
    ]
  }
}));
```

**After (v1.0.0-beta.2 - @coherent.js/state):**
```javascript
import { observable, computed } from '@coherent.js/state';

// Create reactive state
const count = observable(0);
const doubled = computed(() => count.value * 2);

function Counter() {
  const increment = () => {
    count.value = count.value + 1;
  };

  return {
    div: {
      'data-coherent-component': 'counter',
      children: [
        { p: { text: `Count: ${count.value}` } },
        { p: { text: `Doubled: ${doubled.value}` } },
        { 
          button: { 
            text: 'Increment', 
            onclick: increment
          }
        }
      ]
    }
  };
}
```

### Client-Side Router

**Before (v1.0.0-beta.1):**
```javascript
import { createRouter } from '@coherent.js/core/router';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/about': AboutPage
  }
});
```

**After (v1.0.0-beta.2):**
```javascript
import { createRouter } from '@coherent.js/client/router';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/about': AboutPage
  }
});
```

### Forms Handling

**Before (v1.0.0-beta.1):**
```javascript
// Manual validation in component
function ContactForm() {
  const [formData, setFormData] = withState({ 
    email: '', 
    message: '' 
  });

  const validate = () => {
    const errors = {};
    if (!formData.email.includes('@')) {
      errors.email = 'Invalid email';
    }
    return errors;
  };

  return {
    form: {
      children: [
        // Form fields with manual validation
      ]
    }
  };
}
```

**After (v1.0.0-beta.2 - @coherent.js/forms):**
```javascript
import { createForm } from '@coherent.js/forms';
import { validators } from '@coherent.js/state';

const contactForm = createForm({
  fields: {
    email: {
      value: '',
      validators: [validators.email('Invalid email')]
    },
    message: {
      value: '',
      validators: [validators.minLength(10, 'Message too short')]
    }
  }
});

function ContactForm() {
  const submitForm = async () => {
    if (contactForm.validate()) {
      await submitToAPI(contactForm.values);
    }
  };

  return {
    form: {
      'data-coherent-component': 'contact-form',
      onsubmit: (e) => {
        e.preventDefault();
        submitForm();
      },
      children: [
        {
          input: {
            type: 'email',
            value: contactForm.fields.email.value,
            oninput: (e) => contactForm.setField('email', e.target.value),
            className: contactForm.fields.email.error ? 'error' : ''
          }
        },
        { 
          span: { 
            text: contactForm.fields.email.error || '' 
          } 
        }
      ]
    }
  };
}
```

## Migration Checklist

### Core Package Changes
- [ ] Update router imports from `@coherent.js/core/router` to `@coherent.js/client/router`
- [ ] Update lifecycle hook imports to use top-level exports
- [ ] Update object factory imports to use top-level exports
- [ ] Update component cache imports to use top-level exports

### State Management
- [ ] Install `@coherent.js/state` package
- [ ] Replace `withState` with reactive state for client-side components (optional but recommended)
- [ ] Keep using `withState` from `@coherent.js/core` for SSR-compatible state

### Forms
- [ ] Install `@coherent.js/forms` package
- [ ] Replace manual form validation with `@coherent.js/forms`
- [ ] Update form components to use new form utilities

### Development Tools
- [ ] Install `@coherent.js/devtools` package
- [ ] Update devtools integration if used

### Testing
- [ ] Run tests to ensure all imports work correctly
- [ ] Verify router functionality
- [ ] Check state management behavior
- [ ] Test form validation and submission

## Breaking Changes

### Removed Internal Imports
- `@coherent.js/core/internal/*` paths are no longer accessible
- All functionality is now exported from top-level package entry points

### Router Move
- Client-side router moved from `@coherent.js/core` to `@coherent.js/client`
- No API changes, only import path changes

### State Management Evolution
- `withState` still available in `@coherent.js/core` for SSR compatibility
- New reactive state system in `@coherent.js/state` for client-side applications

## Benefits of the Reorganization

### Better Separation of Concerns
- Dedicated packages for specific functionality
- Reduced complexity in core package
- Clearer module boundaries

### Improved Performance
- Only import what you need
- Smaller bundle sizes with code splitting
- Better tree-shaking support

### Enhanced Developer Experience
- More focused documentation
- Better TypeScript support per package
- Clearer dependency relationships

### Easier Maintenance
- Independent release cycles
- Targeted bug fixes
- Feature-specific versioning

## Support and Questions

If you encounter issues during migration:

1. Check the [API Reference](/docs/api-reference.md) for updated import paths
2. Review the [Reactive State Guide](/docs/components/reactive-state.md) for new state management patterns
3. Consult the [Client Router Guide](/docs/client-side/client-router.md) for router updates
4. File issues on GitHub with migration-related problems

The reorganization is designed to make Coherent.js more modular and maintainable while providing better tools for building modern web applications.
