# @coherent.js/forms

## 2.0.0-rc.0

### Major Changes

- Coherent.js 2.0: the fixes from a full audit of the framework, several of which change behavior callers rely on.
  
  The most likely to need changes in an application:
  
  - Component errors propagate out of `render()` (pass `onError` to replace a failing component).
  - On Node, `provideContext()` throws outside `runWithContext()`: a value provided outside it leaked into the next request on the same connection.
  - Framework adapters no longer render every response as HTML: use `res.coherent()` / `reply.coherent()` / `ctx.coherent()`, or `autoRender: true`.
  - The api requires a JWT secret, and rate limiting keys on the socket address unless `trustProxy` is set.
  - `Model.create()` applies `fillable` / `guarded`.
  - The render cache is opt-in (`enableCache: true`).
  
  `docs/migration/upgrading-from-1.1.md` lists every behavior change with what to do about it; each package's CHANGELOG has the full list of fixes.

### Minor Changes

- 235034d: Add CSRF support.
  
  - New server-only subpath `@coherent.js/forms/csrf`: `createCsrfToken(secret,
    sessionId)` issues a stateless token signed with HMAC-SHA256 over its issue
    time, a random nonce and the session id; `verifyCsrfToken(token, secret,
    sessionId, { maxAge })` returns `false` (never throws) for a missing,
    malformed, forged, expired or other-session token, comparing in constant
    time. It uses `node:crypto`, so it is not re-exported from the package root,
    which stays browser-safe.
  - `buildForm({ csrfToken })` renders the token as a hidden `_csrf` input, first
    in the form (`csrfFieldName` renames it). `hydrateForm` submits it with the
    other values.
- 93bcd91: One `validators` registry and one calling convention across every entry point.
  
  `@coherent.js/forms` and `@coherent.js/forms/validators` exported two different
  `validators` objects and two different `createValidator` functions: the root's
  explicit export of the factory-style set (`validators.minLength(8)(value)`)
  silently shadowed the direct-style set (`validators.minLength(value, { min: 8
  })`) that the subpath exported. `validateForm` runs validators as `(value,
  formData)`, so a root built-in listed uncalled came back as the error —
  `validateForm({ name: 'Ada' }, { name: [validators.required] })` returned `{
  name: [Function] }` — and `hydrateForm` mixed both conventions.
  
  Now the root, `/validation` and `/validators` export the same `validators` and
  `createValidator`:
  
  - A **validator** is `(value, formData) => string | null`. Schemas,
    `validateField`, `validateForm`, `FormBuilder` fields and `hydrateForm` all
    run validators that way.
  - Each built-in is a **factory** returning a validator:
    `validators.required('Name please')`, `validators.minLength(8)`. A built-in
    listed uncalled (`[validators.required]`) runs with its defaults, and a
    string names a built-in or registered validator.
  - The direct form still works when an options object is passed:
    `validators.minLength('abc', { min: 5 })` returns the error.
  - `createValidator(schema)` returns a `FormValidator`; `createValidator(fn,
    message)` wraps a check function.
  - The root now also has the built-ins that only the subpath had: `number`,
    `integer`, `phone`, `date`, `alpha`, `alphanumeric`, `uppercase`, `match`,
    `fileType`, `fileSize`, `fileExtension`, plus `get`, `compose`, `debounce`,
    `cancellable`, `when` and `chain`.
  
  **Behavior change:**
  
  - On `@coherent.js/forms/validators`, a built-in called with one argument that
    could be a message (a non-empty string, `undefined` or `null`) now returns a
    validator instead of checking that value: `validators.email('a@b.c')` is a
    validator. Pass an options object to check directly —
    `validators.email('a@b.c', {})` — or call the validator:
    `validators.email()('a@b.c')`.
  - Default messages follow the root set (`'Invalid email address'`,
    `'Minimum length is 8'`, …) on every entry point; the subpath used different
    wording (`'Please enter a valid email address'`, `'Must be at least 8
    characters'`).
  - `validators.min()` / `max()` now pass an empty value (combine with
    `required`) and fail a non-numeric one: `min(5)('')` was an error and
    `min(5)('abc')` passed.
- 4bbaeb3: Let a shared `FormBuilder` render per-request state without leaking it.
  
  A builder keeps `values`, `errors` and `touched` on the instance, so one created
  once at module scope and filled per request rendered the previous user's
  submitted values and errors into the next user's form (a plain GET after
  someone else's failed POST showed their email address).
  
  - `form.fork()` returns a copy of the definition — fields, groups, options and
    handlers — with fresh state. Fork the shared definition per request.
  - `form.buildForm({ values, errors, touched })` renders that state for one
    render only; the builder's own state is neither read nor changed. Values are
    merged over the fields' default values, and fields with an error are shown
    as touched unless `touched` is given.
  
  Existing single-use builders behave as before. The type docs describe the
  per-request pattern.

### Patch Changes

- 5a150b5: Declare the peer dependencies packages actually use.
  
  - `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
  - Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
- 868ef03: Support string validators with arguments, such as `'minLength:8'`.
  
  A string entry in a validator list was looked up as a whole registry name, so
  `validators: ['required', 'minLength:8']` in a `FormBuilder` field silently
  dropped `'minLength:8'`: the server accepted a 3-character password, and the
  rule never reached `data-validators`, so `hydrateForm` did not enforce it
  either. The same entry was ignored by `FormValidator` schemas, `validateField`
  and `validateForm`.
  
  A built-in's name can now carry its arguments after a colon, mapped onto its
  factory: `'minLength:8'` is `validators.minLength(8)`, `'min:18'`,
  `'matches:password'`, `'oneOf:s,m,l'` (every value goes into the list),
  `'pattern:^[a-z]{2,8}$'` (the whole remainder is the regular expression), and
  an optional message after the parameter (`'minLength:8,Too short'`) or alone
  for rules without one (`'required:Name please'`). These entries are enforced on
  the server and rendered into `data-validators` exactly like the factory call,
  so `hydrateForm` gives the same verdict and message. Unknown names and
  arguments that do not fit the rule (`'minLength:abc'`) are still skipped;
  registered validators are named without arguments.
- db5428c: Make `hydrateForm` enforce the validators the server rendered.
  
  The builder wrote `data-validators` as each function's name, and
  factory-built validators such as `validators.minLength(8)` are anonymous, so
  they were all emitted as `custom` — which the client treated as always valid.
  The client accepted a 3-character password that the server then rejected.
  
  `data-validators` is now a JSON array of `{ name, args }`
  (`[{"name":"minLength","args":[8]}]`, regular expressions included), and
  `hydrateForm` rebuilds each rule through the same factory, so both sides give
  the same verdict and message. Built-ins listed uncalled and validators added
  with `registerValidator` are described by name (register the same name in the
  browser to enforce one there). Anonymous functions are no longer emitted as
  `custom`; they are enforced on the server only. `hydrateForm` still reads the
  older comma-separated attribute (`required,minLength:8`), which also works
  again: a parametrised entry used to call the direct-style validator as a
  factory and was dropped.
  
  **Behavior change:** the `data-validators` attribute value changed format.
- Updated dependencies [85898bd]
- Updated dependencies [7da1e24]
- Updated dependencies [ccff8e7]
- Updated dependencies [0b8c6e2]
- Updated dependencies [b21610a]
- Updated dependencies [1b4a351]
- Updated dependencies [cd2cb30]
- Updated dependencies [e69a230]
- Updated dependencies [606bb86]
- Updated dependencies [e250e32]
- Updated dependencies [e011f27]
- Updated dependencies [5a3a6c2]
- Updated dependencies [14af368]
- Updated dependencies [11c154f]
- Updated dependencies [b89b3c6]
- Updated dependencies [b3666cd]
- Updated dependencies [6829455]
- Updated dependencies [7abfb53]
- Updated dependencies
- Updated dependencies [35376a7]
- Updated dependencies [16a6e7b]
  - @coherent.js/core@2.0.0-rc.0

## 1.1.2

### Patch Changes

- Release the 1.1.1 content as 1.1.2.

  **This is the 1.1.1 content**, which reached npm only as `@coherent.js/cli` and `@coherent.js/client` before the run stopped: `@coherent.js/core@1.1.1` had been published and unpublished long before, and npm never allows a version number to be reused. 1.1.2 is clean for all twelve packages and realigns them.

  That content is unchanged from the 1.1.1 entry: request bodies are no longer rewritten during parsing, CORS credentials go only to an origin you named, email validation and eight other regexes are linear rather than quadratic, void elements are built rather than patched, HMR overlay line numbers are narrowed to integers, and profiler ids come from `crypto.getRandomValues`.

## 1.1.1

### Patch Changes

- Close out the CodeQL backlog: 28 alerts, plus the defects found underneath them.

  **Request bodies are no longer rewritten.** `@coherent.js/api` ran a blocklist
  of regexes over every string in a parsed JSON body and rebuilt every container
  as a plain object. Arrays arrived at handlers as objects — `{"tags":["a","b"]}`
  became `{"tags":{"0":"a","1":"b"}}`, so `req.body.tags.map()` threw — and
  ordinary prose was mangled, with `"I love javascript: the language"` reaching
  handlers as `"I love  the language"`. The regexes bought nothing: they never
  matched `</script >`, `data:` URLs or `<scr<script>ipt>`. Bodies now pass
  through untouched apart from `__proto__`, `constructor` and `prototype`, and
  keys like `__typename` survive where the old filter dropped every `__` prefix.

  **CORS credentials go only to an origin you named.** `corsOrigin` accepts a
  string or an array and is matched against the request `Origin`, echoed back with
  `Vary: Origin`; an unlisted origin gets no CORS headers.
  `Access-Control-Allow-Credentials` is sent only when `corsOrigin` is set, so the
  development default no longer offers credentials to an origin the router picked
  itself. `'*'` is served as-is but never with credentials, a pairing browsers
  reject anyway; a malformed value warns and falls back rather than throwing.

  **Email validation is linear.** The pattern shared by `forms`, `state` and `api`
  split a dotted domain at every dot, so a non-matching address cost O(n²): 50,000
  dots took 2.9 seconds to reject, and now take under a millisecond. Consecutive
  dots (`a@b..c`) are now rejected everywhere, and `api` no longer accepts
  addresses containing spaces, tabs or newlines.

  **Six more regexes made linear**, each measured: route compilation in `api`
  (4.7s → 2ms), comment stripping in `core` (307ms → 1ms), HMR stack parsing in
  `client` (4.7s → 0ms), the complexity heuristic in `devtools`, and the three
  tag counters behind `toBeValidHTML` in `tooling`. `minifyHtml` also stops
  leaving an unterminated comment in its output.

  **Smaller hardening.** `core` builds self-closing void elements directly instead
  of rewriting the first `>` in the tag. The `client` HMR overlay narrows error
  line and column to integers before they reach markup, one of them inside a
  quoted attribute. `devtools` seeds profiler session ids from
  `crypto.getRandomValues` rather than `Math.random`.

## 1.1.0

### Minor Changes

- 7c1f5bd: Let the form builder express a production form.

  **Forms work without JavaScript again.** `buildForm()` emitted
  `onsubmit="handleSubmit(event)"` on every form — naming a global the package
  never defines, since `hydrateForm` binds its own listener — plus `novalidate`,
  which turns off the browser validation a no-JS submission depends on.
  `novalidate: false` was ignored. Both are now off by default: the form posts to
  its `action` and validates natively with JavaScript disabled. Opt back in with
  `enhance: true` (or a handler string) and `novalidate: true`. This also stops
  the builder emitting markup that a strict CSP blocks.

  **`attributes` is honoured.** It was declared on `FormField` and read by
  nothing, so `autocomplete`, `maxlength`, `tabindex` and `data-*` were silently
  dropped. Attributes are applied before the builder's own, so `name`, `id`,
  `type` and the `aria-*` pair cannot be overridden, and names that are not valid
  HTML attribute names are rejected — `formatAttributes` escapes attribute values
  but interpolates names raw. `disabled` and `readonly` are honoured too.

  **Class names are yours.** A `classNames` option covers the wrapper, label,
  control, invalid state, error message and submit button, defaulting to the
  previous values and exported as `DEFAULT_CLASS_NAMES`. Per-field `className`
  appends to the control class. `hydrateForm` now finds the field wrapper through
  the `data-field` attribute the builder already emitted rather than
  `.form-field`, and takes the same `classNames` so the classes it writes on
  failure match what the server rendered.

  Together these make a honeypot a plain field, with no dedicated API:

  ```js
  builder.field('website', {
    label: 'Website',
    className: 'contact-form__trap',
    attributes: { tabindex: '-1', autocomplete: 'off' },
  });
  ```

  **Hidden fields are no longer rendered or validated.** `buildForm()` ignored
  `visible: false` and `showWhen`, while `validate()` skipped only `showWhen` —
  so a conditionally hidden field rendered but was never validated, and a
  `visible: false` field could block submission with an error for a control that
  was never on the page. Both now use one predicate, and `visible: false` is
  final rather than something a truthy `showWhen` can override.

  Attributes named `on*` are refused: they are syntactically valid names whose
  string values render as inline handlers, which would reintroduce per field the
  script this release stopped emitting on the form.

  Controls also no longer carry an empty `class=""` or `placeholder=""`.

  Peer ranges on workspace packages move from `workspace:*` to `workspace:^`.
  `workspace:*` publishes as an exact pin — `@coherent.js/forms@1.0.1` required
  `@coherent.js/core` at exactly `1.0.1` — so upgrading any one package
  conflicted with every other, and every release had to move all twelve in
  lockstep. `^` lets a consumer take a core minor without republishing the rest.

## 1.0.1

### Patch Changes

- 2063331: Make published type declarations match the runtime.

  `@coherent.js/forms` 1.0.0 could not build a usable form: `buildForm()`
  returned the builder where its declaration promised a `CoherentNode`, the
  `<form>` element dropped `action`, `method` and `name`, `toHTML()` emitted a
  near-empty form with unescaped labels, and `setAction`, `setMethod`, `build`
  and `render` were declared but absent. Fields typed `textarea` and `select`
  also rendered as `<input type="textarea">` and `<input type="select">`, which
  are not valid controls — they are now `<textarea>` and `<select>` elements.

  The same drift ran through nine packages. `seo.MetaBuilder` declared
  `setTitle`/`setDescription`/`setCanonical` against an implementation of
  `title`/`description`/`canonical`; `state.Observable` declared
  `get`/`set`/`subscribe` against `value`/`watch`/`unwatch`; `i18n.Translator`
  declared `translate`/`addMessages` against `t`/`addTranslations`; and
  `devtools.DevTools` declared `enable`/`disable`/`getReport`, which exist
  nowhere. Each of those packages was unusable from TypeScript in the same way
  `forms` was. The declarations now follow the implementations.

  The reverse gap is closed too: 69 real exports no TypeScript user could see,
  including core's event bus, lifecycle, error boundaries and object factory,
  cli's commands, and client's event-delegation classes.

  Also fixed:

  - `forms.registerValidator()` was a no-op. Two modules export a const named
    `validators` and the star export shadowed one of them, so registrations
    never reached the object consumers get.
  - `@coherent.js/state` now exports `FormState`, `ListState`, `ModalState`,
    `RouterState`, `StateError` and `globalErrorHandler`, all of which were
    declared but unreachable.
  - `integrations/express` declares `createExpressIntegration` and
    `expressEngine`.

  A CI gate now compares each package's declarations against its runtime exports
  at every published entry point, so this class of defect cannot ship again.

- Updated dependencies [2063331]
  - @coherent.js/core@1.0.1
  - @coherent.js/state@1.0.1

## 1.0.0

### Patch Changes

- @coherent.js/core@1.0.0
- @coherent.js/state@1.0.0

## 1.0.0

### Patch Changes

- @coherent.js/core@1.0.0
- @coherent.js/state@1.0.0

## 1.0.0-beta.3

### Patch Changes

- CLI generators were producing projects with outdated dependency versions (`1.0.0-beta.1`) instead of the current framework version (`1.0.0-beta.2`), causing installation conflicts and inconsistent package management.

  Updated all hardcoded Coherent.js package versions from `1.0.0-beta.1` to `^1.0.0-beta.2` across all generator files:

  **Files Modified:**
  - `packages/cli/src/generators/runtime-scaffold.js`
  - `packages/cli/src/generators/database-scaffold.js`
  - `packages/cli/src/generators/package-scaffold.js`
  - `packages/cli/src/generators/project-scaffold.js`

  **Packages Updated:**
  - `@coherent.js/core`: `^1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/cli`: `^1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/express`: `1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/fastify`: `1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/koa`: `1.0.0-beta.1` → `^1.0.0-beta.2`
  - `@coherent.js/database`: `^1.0.1` → `^1.0.0-beta.2`
  - `@coherent.js/api`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/client`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/i18n`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/forms`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/devtools`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/seo`: `^1.0.0` → `^1.0.0-beta.2`
  - `@coherent.js/testing`: `^1.0.0` → `^1.0.0-beta.2`
  - ✅ All 51 CLI tests pass
  - ✅ Generated projects install dependencies correctly
  - ✅ No empty files are generated
  - ✅ TypeScript configuration works properly
  - ✅ All generator types function (components, pages, APIs, models, middleware)
  - **Users now get projects with correct, up-to-date dependency versions**
  - **Eliminates package conflicts during installation**
  - **Ensures consistent framework behavior across generated projects**
  - **Maintains compatibility with latest Coherent.js features**

  Verified with multiple configurations:
  - Basic projects with all runtime options (built-in, Express, Fastify, Koa)
  - Full-stack projects with database integration (PostgreSQL, MySQL, SQLite, MongoDB)
  - Authentication scaffolding (JWT and session-based)
  - All optional packages enabled
  - Both JavaScript and TypeScript projects
  - Component, page, API, model, and middleware generation

  **No breaking changes** - this is a pure bug fix release that ensures version consistency.

- Updated dependencies
  - @coherent.js/core@1.0.0-beta.3
  - @coherent.js/state@1.0.0-beta.3

## 1.0.0-beta.2

### Patch Changes

- Added form utilities moved from @coherent.js/core
- Added comprehensive TypeScript type definitions
- Includes form builder, validation, and hydration utilities

## 1.0.0-beta.1

### Features

- Initial beta release
- Form building, validation, and hydration utilities
- TypeScript type definitions included
- Full documentation and examples

### Notes

This is the first beta release of Coherent.js. The API is stable but may receive minor adjustments based on feedback before the 1.0.0 stable release.
