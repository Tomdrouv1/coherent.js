# @coherent.js/forms

Comprehensive forms handling and validation utilities for Coherent.js applications.

## Installation

```bash
npm install @coherent.js/forms
# or
pnpm add @coherent.js/forms
# or
yarn add @coherent.js/forms
```

## Overview

The `@coherent.js/forms` package provides powerful form handling capabilities including:

- Form state management
- Validation with built-in validators
- Error handling and display
- Form serialization and submission
- Integration with Coherent.js components

## Quick Start

```javascript
import { createForm } from '@coherent.js/forms';
import { validators } from '@coherent.js/state';

const contactForm = createForm({
  fields: {
    email: {
      value: '',
      validators: [validators.email('Please enter a valid email')]
    },
    message: {
      value: '',
      validators: [validators.minLength(10, 'Message must be at least 10 characters')]
    }
  }
});

function ContactForm() {
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (contactForm.validate()) {
      // Form is valid, submit data
      await submitFormData(contactForm.values);
      contactForm.reset();
    }
  };

  return {
    form: {
      onsubmit: handleSubmit,
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
            text: contactForm.fields.email.error || '',
            className: 'error-message'
          }
        },
        {
          textarea: {
            value: contactForm.fields.message.value,
            oninput: (e) => contactForm.setField('message', e.target.value),
            className: contactForm.fields.message.error ? 'error' : ''
          }
        },
        {
          span: {
            text: contactForm.fields.message.error || '',
            className: 'error-message'
          }
        },
        {
          button: {
            type: 'submit',
            text: 'Send Message',
            disabled: contactForm.isSubmitting
          }
        }
      ]
    }
  };
}
```

## Features

### Form State Management

Automatically manage form state including values, errors, and submission status:

```javascript
const form = createForm({
  fields: {
    username: { value: '' },
    password: { value: '' }
  }
});

// Access form values
console.log(form.values); // { username: '', password: '' }

// Update field values
form.setField('username', 'john_doe');

// Check form validity
console.log(form.isValid); // true/false

// Check submission status
console.log(form.isSubmitting); // true/false
```

### Validation

Built-in validators with custom validation support:

```javascript
import { validators } from '@coherent.js/state';

const form = createForm({
  fields: {
    email: {
      value: '',
      validators: [
        validators.required('Email is required'),
        validators.email('Please enter a valid email')
      ]
    },
    age: {
      value: '',
      validators: [
        validators.required('Age is required'),
        validators.min(18, 'Must be at least 18 years old')
      ]
    }
  }
});

// Custom validator
const customValidator = (value) => {
  if (value && value.length < 5) {
    return 'Value must be at least 5 characters';
  }
  return null; // null means valid
};

const formWithCustomValidation = createForm({
  fields: {
    customField: {
      value: '',
      validators: [customValidator]
    }
  }
});
```

### Async Validation

Support for asynchronous validation (e.g., checking if username is available):

```javascript
const asyncValidator = async (value) => {
  if (!value) return null;
  
  const response = await fetch(`/api/check-username/${value}`);
  const exists = await response.json();
  
  return exists ? 'Username is already taken' : null;
};

const signupForm = createForm({
  fields: {
    username: {
      value: '',
      validators: [asyncValidator]
    }
  }
});
```

## API Reference

### createForm(options)

Create a new form instance.

**Parameters:**
- `options.fields` - Object defining form fields and their initial state
- `options.onSubmit` - Optional function to handle form submission

**Returns:** Form instance with methods and properties

### Form Instance Properties

- `values` - Current form values
- `fields` - Field state objects with value, error, touched, etc.
- `isValid` - Boolean indicating if form is valid
- `isSubmitting` - Boolean indicating if form is being submitted
- `errors` - Object containing field errors

### Form Instance Methods

- `setField(name, value)` - Update a field's value
- `validate()` - Validate all fields, returns boolean
- `reset()` - Reset form to initial state
- `submit()` - Trigger form submission

## Integration with @coherent.js/state

The forms package integrates seamlessly with the reactive state system:

```javascript
import { createForm } from '@coherent.js/forms';
import { observable } from '@coherent.js/state';

// Create reactive form
const form = createForm({
  fields: {
    search: { value: '' }
  }
});

// Create observable for search results
const searchResults = observable([]);

// Update search results when form changes
form.fields.search.watch((newValue) => {
  if (newValue.length > 2) {
    performSearch(newValue).then(results => {
      searchResults.value = results;
    });
  }
});
```

## Examples

### Login Form

```javascript
import { createForm } from '@coherent.js/forms';
import { validators } from '@coherent.js/state';

const loginForm = createForm({
  fields: {
    email: {
      value: '',
      validators: [
        validators.required('Email is required'),
        validators.email('Please enter a valid email')
      ]
    },
    password: {
      value: '',
      validators: [
        validators.required('Password is required'),
        validators.minLength(8, 'Password must be at least 8 characters')
      ]
    }
  },
  async onSubmit(values) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      if (response.ok) {
        // Handle successful login
        window.location.href = '/dashboard';
      } else {
        // Handle login error
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      loginForm.setError('login', error.message);
    }
  }
});
```

## Related Packages

- [@coherent.js/state](../state/README.md) - Reactive state management
- [@coherent.js/core](../core/README.md) - Core framework
- [@coherent.js/client](../client/README.md) - Client-side utilities

## License

MIT
