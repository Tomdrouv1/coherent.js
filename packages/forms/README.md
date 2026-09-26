# @coherent.js/forms

Server-rendered forms for Coherent.js: build a form on the server, validate
submissions with the same rules on both sides, and progressively enhance it in
the browser with `hydrateForm`.

- ESM-only, Node 22.12+
- The package root is isomorphic; `@coherent.js/forms/csrf` is server-only.

## Installation

```bash
pnpm add @coherent.js/forms
```

## Exports

| Import path | Exports |
| --- | --- |
| `@coherent.js/forms` | `FormBuilder`, `createFormBuilder`, `buildForm`, `DEFAULT_CLASS_NAMES`, `hydrateForm`, `validators`, `FormValidator`, `createValidator`, `validate`, `validateField`, `validateForm`, `registerValidator`, `composeValidators` |
| `@coherent.js/forms/form-builder` | `FormBuilder`, `createFormBuilder`, `buildForm`, `DEFAULT_CLASS_NAMES` |
| `@coherent.js/forms/hydration` | `hydrateForm` |
| `@coherent.js/forms/validation` | `validators`, `FormValidator`, `createValidator`, `validate` |
| `@coherent.js/forms/validators` | `validators`, `validateField`, `validateForm`, `createValidator`, `registerValidator`, `composeValidators` |
| `@coherent.js/forms/csrf` (server only) | `createCsrfToken`, `verifyCsrfToken`, `CSRF_FIELD_NAME` |

## Quick start

```javascript
import { render } from '@coherent.js/core';
import { createFormBuilder, validators } from '@coherent.js/forms';

// The form definition, shared by every request.
const signup = createFormBuilder({
  action: '/signup',
  method: 'post',
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'password', type: 'password', label: 'Password', required: true,
      validators: [validators.minLength(8)] }
  ]
});

// GET /signup
const html = render(signup.buildForm());

// POST /signup — fork() gives this request its own state
const form = signup.fork().setValues(request.body);
const errors = form.validate();
if (Object.keys(errors).length > 0) {
  for (const name of Object.keys(errors)) form.touch(name);
  return render(form.buildForm()); // re-render with values and errors
}
```

In the browser, `hydrateForm('form[name="form"]')` reads the validation rules
the server rendered and validates on blur and submit.

## Validators

A **validator** is a function `(value, formData) => string | null`: an error
message, or `null` when the value passes. Every runner — `FormValidator`
schemas, `validateField`, `validateForm`, `FormBuilder` fields and
`hydrateForm` — calls validators that way.

Each built-in is a **factory** that returns a validator. The last argument is
always an optional custom message:

```javascript
import { validators, validateForm } from '@coherent.js/forms';

validateForm(
  { name: '', email: 'nope', age: '15' },
  {
    name: [validators.required('Please enter your name')],
    email: [validators.required, validators.email()],
    age: [validators.min(18, 'You must be 18 or older')]
  }
);
// → { name: 'Please enter your name', email: 'Invalid email address', age: 'You must be 18 or older' }
```

- A built-in may be listed without calling it (`validators.required`); it runs
  with its defaults. A string names a built-in or registered validator (see
  below).
- Apart from `required` and `matches`, built-ins pass empty values, so combine
  them with `required`.
- For direct checks, pass the value and an options object:
  `validators.minLength('abc', { min: 5 })` returns `'Minimum length is 5'`.
  A lone string argument is always a message, so `validators.email('a@b.c')`
  returns a validator rather than checking `'a@b.c'`.

Built-ins: `required`, `email`, `url`, `minLength(min)`, `maxLength(max)`,
`min(min)`, `max(max)`, `pattern(regex)`, `matches(field)`, `match(field)`,
`oneOf(values)`, `custom(fn)`, `number`, `integer`, `phone`, `date`, `alpha`,
`alphanumeric`, `uppercase`, `fileType(accept)`, `fileSize(maxSize)`,
`fileExtension(extensions)`. Helpers: `compose`, `when`, `chain`, `debounce`,
`cancellable`, `get`.

### Accepted validator entries

A validator list — a `FormBuilder` field's `validators`, a `FormValidator`
schema, `validateField` / `validateForm` — accepts, in any mix:

| Entry | Example | Same as |
| --- | --- | --- |
| A validator function | `value => value ? null : 'Required'` | — |
| A built-in, called | `validators.minLength(8, 'Too short')` | — |
| A built-in, uncalled | `validators.required` | `validators.required()` |
| A name | `'required'`, `'email'`, `'noShouting'` (registered) | `validators.required()` |
| A built-in name with arguments | `'minLength:8'` | `validators.minLength(8)` |

A string with arguments is `'name:arguments'`, read by the built-in's
parameter:

- a number (`minLength`, `maxLength`, `min`, `max`, `fileSize`): the number,
  then optionally a comma and a message — `'min:18'`,
  `'minLength:8,Use at least 8 characters'`;
- a field name (`matches`, `match`): `'matches:password'`, optionally
  followed by `,message`;
- a list (`oneOf`, `fileType`, `fileExtension`): every comma-separated value —
  `'oneOf:small,medium,large'`, `'fileType:image/*,.pdf'`;
- a regular expression (`pattern`): everything after the colon, commas
  included — `'pattern:^[a-z]{2,8}$'` (no flags; use `validators.pattern()`
  for flags or a message);
- no parameter (`required`, `email`, …): a message — `'required:Name please'`.

Registered validators take no arguments: name them alone. An unknown name,
or arguments that do not fit (`'minLength:abc'`), is skipped.

```javascript
createFormBuilder({
  fields: [
    { name: 'password', type: 'password', validators: ['required', 'minLength:8'] },
    { name: 'size', validators: ['oneOf:s,m,l'] }
  ]
});
```

String entries are enforced on the server and rendered into `data-validators`
exactly like the equivalent factory call, so `hydrateForm` enforces them too.

Your own validators follow the same shape:

```javascript
import { registerValidator, validators, createValidator } from '@coherent.js/forms';

const noShouting = value =>
  value && value === value.toUpperCase() ? 'Please stop shouting' : null;

registerValidator('noShouting', noShouting);   // now validators.noShouting
const noSpaces = createValidator(value => /\s/.test(value), 'No spaces allowed');
```

`createValidator(schema)` returns a `FormValidator`; `createValidator(fn,
message)` wraps a check function as above.

### Client-side validation

For each field, the builder renders its validators into `data-validators` as
JSON (`[{"name":"minLength","args":[8]}]`), and `hydrateForm` rebuilds the
same rules, so the browser and the server give the same verdict and message.
Built-ins and registered validators (register the same name in the browser)
are described; anonymous functions run on the server only.

## Forms on a server: one state per request

A `FormBuilder` holds the values, errors and touched state of one submission.
Keep the definition at module scope, and never fill that shared instance with
request data — the next user would see it. Either fork it per request:

```javascript
const form = signup.fork();
form.setValues(request.body);
```

or render per-request state without touching the builder:

```javascript
render(signup.buildForm({ values: request.body, errors }));
```

## CSRF protection

`@coherent.js/forms/csrf` (server only) issues stateless tokens bound to a
session and signed with HMAC-SHA256:

```javascript
import { createCsrfToken, verifyCsrfToken } from '@coherent.js/forms/csrf';

// GET: render the token as a hidden _csrf input
const csrfToken = createCsrfToken(process.env.CSRF_SECRET, session.id);
render(signup.buildForm({ csrfToken }));

// POST: reject the request unless the token matches this session
if (!verifyCsrfToken(request.body._csrf, process.env.CSRF_SECRET, session.id, { maxAge: 60 * 60 * 1000 })) {
  return response.status(403).end();
}
```

## Hydration

```javascript
import { hydrateForm } from '@coherent.js/forms/hydration';

const controller = hydrateForm('#signup', {
  onSubmit: async (values) => {
    await fetch('/api/signup', { method: 'POST', body: JSON.stringify(values) });
  }
});
```

Pass the same `classNames` you gave `buildForm` if you customised them. The
controller exposes `validateField`, `validateForm`, `getValues`, `getErrors`,
`setFieldValue`, `reset` and `destroy`.

## TypeScript

Type definitions ship with the package (`types/index.d.ts`, `types/csrf.d.ts`).

## License

MIT
