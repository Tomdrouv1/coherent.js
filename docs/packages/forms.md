# Forms

`@coherent.js/forms` builds forms as Coherent.js components on the server, validates them with one validator convention on the server and in the browser, and hydrates them for client-side validation. See the [package README](../../packages/forms/README.md) for the complete reference.

## Installation

```bash
pnpm add @coherent.js/forms
```

## Basic Usage

### Server-Side Form Building

Define the form once, at module scope, and render it per request:

```javascript
import { render } from '@coherent.js/core';
import { createFormBuilder, validators } from '@coherent.js/forms';

const signup = createFormBuilder({ name: 'signup', action: '/signup', method: 'post' })
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

// GET /signup
const html = render(signup.buildForm({ submitText: 'Sign Up' }));
```

### Handling a Submission

A `FormBuilder` keeps values, errors and touched state on the instance, so never fill the shared definition with request data. Fork it per request, or pass the state to `buildForm()`:

```javascript
// POST /signup
const form = signup.fork().setValues(req.body);
const errors = form.validate();

if (Object.keys(errors).length > 0) {
  // re-render with the submitted values and errors (touched fields show their errors)
  return res.status(422).send(render(signup.buildForm({ values: req.body, errors })));
}
```

### Client-Side Hydration

```javascript
import { hydrateForm } from '@coherent.js/forms/hydration';

const controller = hydrateForm('form[name="signup"]', {
  validateOnBlur: true,
  validateOnChange: false,
  onSubmit: async (values) => {
    await fetch('/api/signup', { method: 'POST', body: JSON.stringify(values) });
  }
});
```

The builder renders each field's validators into a `data-validators` attribute as JSON (`[{"name":"minLength","args":[8]}]`), and `hydrateForm` rebuilds the same rules, so the browser and the server give the same verdict and message. Built-in and registered validators (register the same name in the browser) are described this way; anonymous functions run on the server only.

### Quick Form Helper

`buildForm(config)` builds a form component in one call; `fields` is an array of field objects or an object keyed by field name:

```javascript
import { buildForm } from '@coherent.js/forms';

const form = buildForm({
  action: '/contact',
  fields: {
    name: { type: 'text', label: 'Full Name', required: true },
    email: { type: 'email', label: 'Email', required: true }
  }
});

render(form);
```

## Validators

A **validator** is `(value, formData) => string | null` — an error message, or `null` when the value passes. Schemas, `validateField`, `validateForm`, `FormBuilder` fields and `hydrateForm` all run validators that way, and `@coherent.js/forms`, `/validation` and `/validators` export the same set of `validators` with the same behavior.

Each built-in is a **factory** returning a validator; the last argument is an optional message:

```javascript
import { validators, validateForm } from '@coherent.js/forms';

validateForm(
  { name: '', email: 'nope', age: '15' },
  {
    name: [validators.required('Please enter your name')],
    email: [validators.required, validators.email()],   // listed uncalled: default message
    age: [validators.min(18, 'You must be 18 or older')]
  }
);
// → { name: 'Please enter your name', email: 'Invalid email address', age: 'You must be 18 or older' }
```

- Built-ins other than `required` and `matches` pass empty values; combine them with `required`.
- To check a value directly, pass an options object: `validators.minLength('abc', { min: 5 })` returns `'Minimum length is 5'`. A lone string argument is always a message: `validators.email('a@b.c')` returns a validator.
- `min()` / `max()` fail a non-numeric value.

Built-ins: `required`, `email`, `url`, `minLength(min)`, `maxLength(max)`, `min(min)`, `max(max)`, `pattern(regex)`, `matches(field)`, `match(field)`, `oneOf(values)`, `custom(fn)`, `number`, `integer`, `phone`, `date`, `alpha`, `alphanumeric`, `uppercase`, `fileType(accept)`, `fileSize(maxSize)`, `fileExtension(extensions)`. Helpers: `compose`, `when`, `chain`, `debounce`, `cancellable`, `get`.

### Custom Validators and Schemas

```javascript
import { registerValidator, createValidator, validators } from '@coherent.js/forms';

registerValidator('noShouting', (value) =>
  value && value === value.toUpperCase() ? 'Please stop shouting' : null);

const noSpaces = createValidator((value) => /\s/.test(value), 'No spaces allowed');

// createValidator(schema) returns a FormValidator
const schema = createValidator({
  email: [validators.required(), validators.email()],
  age: [validators.required(), validators.min(18)]
});
```

## CSRF Protection

The server-only subpath `@coherent.js/forms/csrf` issues stateless tokens bound to a session:

```javascript
import { createCsrfToken, verifyCsrfToken } from '@coherent.js/forms/csrf';

// GET: rendered as a hidden _csrf input, first in the form
const csrfToken = createCsrfToken(process.env.CSRF_SECRET, req.session.id);
res.send(render(signup.buildForm({ csrfToken })));

// POST
if (!verifyCsrfToken(req.body._csrf, process.env.CSRF_SECRET, req.session.id, { maxAge: 3_600_000 })) {
  return res.status(403).end();
}
```

`hydrateForm` submits the token with the other values. It uses `node:crypto`, which is why it is not re-exported from the browser-safe package root.

## API Reference

### FormBuilder

| Method | Description |
|---|---|
| `field(name, config)` / `addField` | Add a field. Config: `type`, `label`, `required`, `validators`, `defaultValue`, `showWhen`... |
| `addGroup(name, config)` | Add a field group |
| `fork()` | A copy of the definition with fresh state — use one per request |
| `setValue(name, value)` / `setValues(values)` | Set values |
| `touch(name)` | Mark a field as touched (its error is shown) |
| `validate()` | Validate all fields; returns an error map |
| `validateField(name)` | Validate one field |
| `isValid()` / `hasErrors()` / `isDirty()` | State checks |
| `onSubmit(handler)` / `onError(handler)` | Register handlers |
| `buildForm(options)` | Generate the form component. Options include `submitText`, `classNames`, `csrfToken`, and per-render `values`, `errors`, `touched` |
| `buildField(name)` / `buildInput(name)` | Generate a single field (label + input + error) or input |
| `reset()` | Reset to initial values |
| `toHTML(options)` | Render the form to an HTML string |

### hydrateForm(selector, options)

Browser only (returns `null` without a DOM). Reads the fields and their `data-validators` from the DOM and validates on blur and submit. Options include `validateOnBlur`, `validateOnChange`, `validateOnSubmit`, `onSubmit` and `classNames` (pass the same `classNames` you gave `buildForm`). The controller exposes `validateField`, `validateForm`, `getValues`, `getErrors`, `setFieldValue`, `reset` and `destroy`.

## Notes

- The `createForm` / `formValidators` / `enhancedForm` exports were **removed in 1.0**. Use `createFormBuilder` + `hydrateForm` instead — see [`MIGRATION-1.0.md`](../../MIGRATION-1.0.md).
- Upgrading from 1.1: the validator convention and the `data-validators` format changed; see [Upgrading from 1.1](../migration/upgrading-from-1.1.md#coherentjsforms).
