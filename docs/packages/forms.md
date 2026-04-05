# Forms

`@coherent.js/forms` provides a complete form system for building, validating, and hydrating forms in Coherent.js applications. It supports both SSR-first workflows and SPA patterns.

## Installation

```bash
pnpm add @coherent.js/forms
```

## Basic Usage

### Server-Side Form Building

Use `FormBuilder` to define forms on the server with validation metadata that can be hydrated on the client.

```javascript
import { createFormBuilder, validators } from '@coherent.js/forms';

const form = createFormBuilder({ name: 'signup' })
  .field('email', {
    type: 'email',
    label: 'Email Address',
    required: true,
    validators: [validators.email()]
  })
  .field('password', {
    type: 'password',
    label: 'Password',
    required: true,
    validators: [validators.minLength(8)]
  });

// Render the entire form as a Coherent.js object
const formComponent = form.buildForm({ submitText: 'Sign Up' });
```

### Client-Side Hydration

Hydrate server-rendered forms with client-side validation and event handling.

```javascript
import { hydrateForm } from '@coherent.js/forms';

const controller = hydrateForm('form[name="signup"]', {
  validateOnBlur: true,
  validateOnChange: false,
  onSubmit: async (data) => {
    await fetch('/api/signup', { method: 'POST', body: JSON.stringify(data) });
  },
  onError: (errors) => console.log('Validation errors:', errors)
});
```

### Quick Form Helper

Build a form with a single function call.

```javascript
import { buildForm } from '@coherent.js/forms';

const form = buildForm({
  name: { type: 'text', label: 'Full Name', required: true },
  email: { type: 'email', label: 'Email', required: true }
});
```

## API Reference

### FormBuilder

| Method | Description |
|---|---|
| `field(name, config)` | Add a field. Config: `type`, `label`, `required`, `validators`, `defaultValue`, `showWhen` |
| `addGroup(name, config)` | Add a field group with nested fields |
| `setValue(name, value)` | Set a field value (triggers validation if configured) |
| `validate()` | Validate all fields, returns error map |
| `isValid()` | Returns `true` if all fields pass validation |
| `isDirty()` | Returns `true` if any value differs from initial |
| `submit()` | Validate and call the submit handler |
| `onSubmit(handler)` | Register async submit handler |
| `buildForm(options)` | Generate a Coherent.js form component |
| `buildField(name)` | Generate a single field component (label + input + error) |
| `buildInput(name)` | Generate an input component with `data-validators` metadata |
| `reset()` | Reset form to initial values |
| `toHTML()` | Render form as an HTML string |

### validators (from `validation.js`)

Factory functions that return validator functions. Each accepts an optional custom error message.

| Validator | Usage |
|---|---|
| `validators.required(msg?)` | Non-empty value |
| `validators.minLength(n, msg?)` | Minimum string length |
| `validators.maxLength(n, msg?)` | Maximum string length |
| `validators.min(n, msg?)` | Minimum numeric value |
| `validators.max(n, msg?)` | Maximum numeric value |
| `validators.email(msg?)` | Valid email format |
| `validators.url(msg?)` | Valid URL |
| `validators.pattern(regex, msg?)` | Matches regex |
| `validators.matches(fieldName, msg?)` | Matches another field's value |
| `validators.oneOf(options, msg?)` | Value in allowed list |
| `validators.custom(fn, msg?)` | Custom validation function |

### validators (from `validators.js`)

Direct validator functions with the signature `(value, options?, translator?, allValues?) => errorMessage | null`.

Includes: `required`, `email`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `url`, `number`, `integer`, `phone`, `date`, `match`, `alpha`, `alphanumeric`, `uppercase`, `fileType`, `fileSize`, `fileExtension`.

Utility functions:

| Function | Description |
|---|---|
| `validators.compose(list)` | Compose multiple validators into one |
| `validators.debounce(validator, delay)` | Debounce an async validator |
| `validators.cancellable(validator)` | Wrap async validator with AbortController |
| `validators.when(condition, validator)` | Conditional validation |
| `validators.chain(options)` | Fluent builder: `.required().email().minLength({min: 3}).validate(value)` |

### FormValidator

Schema-based validation manager.

```javascript
import { createValidator, validate } from '@coherent.js/forms';

const validator = createValidator({
  email: [validators.required(), validators.email()],
  age: [validators.required(), validators.min(18)]
});

const { isValid, errors } = validator.validate({ email: '', age: 15 });
```

### hydrateForm(selector, options)

Client-side only. Discovers fields from the DOM, parses `data-validators` attributes, and attaches event listeners.

Returns a controller with: `validateField`, `validateForm`, `setFieldValue`, `getValues`, `getErrors`, `reset`, `destroy`, `isValid`, `getState`.

## Known Limitations

- `hydrateForm` only runs in the browser (returns `null` on the server).
- The `validators.js` and `validation.js` modules export overlapping names; use the module-level import to disambiguate.
- The deprecated `createForm` / `formValidators` / `enhancedForm` exports from `forms.js` use a different validator shape (object with `.validate` method) and should not be mixed with the newer validator functions.
