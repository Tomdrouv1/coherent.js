# @coherent.js/state

## 2.0.0

### Major Changes

- 490a4e2: Coherent.js 2.0: the fixes from a full audit of the framework, several of which change behavior callers rely on.
  
  The most likely to need changes in an application:
  
  - Component errors propagate out of `render()` (pass `onError` to replace a failing component).
  - On Node, `provideContext()` throws outside `runWithContext()`: a value provided outside it leaked into the next request on the same connection.
  - Framework adapters no longer render every response as HTML: use `res.coherent()` / `reply.coherent()` / `ctx.coherent()`, or `autoRender: true`.
  - The api requires a JWT secret, and rate limiting keys on the socket address unless `trustProxy` is set.
  - `Model.create()` applies `fillable` / `guarded`.
  - The render cache is opt-in (`enableCache: true`).
  
  `docs/migration/upgrading-from-1.1.md` lists every behavior change with what to do about it; each package's CHANGELOG has the full list of fixes.

### Minor Changes

- 96a2713: Isolate the SSR context API per request and make context providers render.
  
  **Context no longer leaks between concurrent requests.** `provideContext()` and
  `useContext()` shared one module-level `Map`, so a request that provided a user
  and then awaited could read back another request's user. On Node, context now
  lives in `AsyncLocalStorage`: a value provided in one async execution is not
  visible to a concurrent one, including across `await`s. The new
  `runWithContext(fn, values?)` runs `fn` in a fresh scope that ends when it
  returns — use it per request, and always around a streaming render. Browsers,
  which have no `AsyncLocalStorage`, keep the synchronous behaviour.
  
  **`createContextProvider()` output is markup again.** Core's renderer handed the
  provider a render callback, got back an HTML string and escaped it, so
  `render({ div: { children: [createContextProvider('theme', 'dark', Button)] } })`
  produced `&lt;button ...`. The provider is now an ordinary zero-argument
  component that returns its children between context enter/leave markers, so the
  children are rendered once, by the renderer. Its render-callback form keeps the
  context for an async callback instead of restoring it before the callback
  resumes.
  
  **Behavior change:** `provideContext()` no longer writes into
  `globalStateManager`, and `clearAllContexts()` / `restoreContext()` only affect
  the current execution. `useContext()` still falls back to `globalStateManager`
  when no context was provided. The same element object can no longer appear
  twice inside a provider's children, since they are now rendered by core, which
  rejects a repeated object instance as a circular reference.
- 31df2c3: Stop SSR context values from leaking between requests.
  
  - **Fixed:** outside `runWithContext()`, `provideContext()` attached the value to the caller's async context with `AsyncLocalStorage#enterWith()`. Node handles every request of a keep-alive connection in the same async context, so a value provided for one user's request (say, the logged-in user) was read by the next request on that socket.
  - **Fixed:** `createContextProvider()` entered its value with one marker component and left it with another rendered after its children. A child that threw skipped the second marker, so the value stayed set for the rest of the request (or, outside `runWithContext()`, for the next request on the connection). The provider now evaluates its subtree's function components and function-valued props (never `on*` event handlers) with the value set and restores the outer value in all cases.
  - **Behavior change:** on Node, `provideContext()` throws outside `runWithContext()` (as do `restoreContext()` / `clearAllContexts()` when there is something to remove). Wrap each request in `runWithContext(() => ...)`, or use `createContextProvider()` / `runWithContext(fn, { key: value })`. Browsers are unaffected.
  - **Behavior change:** a context value read after a provider has been rendered (in an event handler, for instance) no longer sees the provider's value; read it while rendering and close over it.
- 73654ac: Make persistent state safe to use.
  
  - **The restore on creation no longer overwrites your first updates.** Stored
    state was restored asynchronously and merged over everything, so
    `setState({ qty: 5 })` right after creation ended as the stored `qty: 1` —
    and that was persisted. Keys set before the restore finishes now keep their
    new value, and the new `ready` promise resolves (to whether anything was
    restored) once it is done.
  - **Failed writes are reported.** A throwing `setItem` (e.g.
    `QuotaExceededError`) was logged and then `onSave` fired anyway. It now goes
    to `onError`, `onSave` does not fire, and `save()` / `persist()` resolve to
    `false`.
  - **`encrypt` is honest obfuscation.** It XORed the payload with the public
    default key `'default-key'` when none was given, and threw
    `InvalidCharacterError` for any character outside Latin-1 (`'日本'`). It now
    works on UTF-8 bytes, so any text round-trips, and is documented as
    obfuscation, not encryption.
  - **`crossTab` syncs only the same store.** Every store shared one
    `BroadcastChannel`, so a cart update was merged into the user store, and a
    store applied its own broadcasts. The channel is now named after the storage
    key, messages carry a sender id, and the new `destroy()` closes it (and
    flushes a pending debounced save).
  - **No shared storage on the server.** With Web Storage available in Node, a
    request restored the previous request's state. Browser backends are now
    inert when there is no `window`, and cross-tab sync is off; pass the new
    `adapter` option to persist on the server.
  
  **Behavior change:** `encrypt: true` without an `encryptionKey` throws a
  `TypeError`. Data stored with `encrypt` by an earlier version that contains
  non-ASCII characters cannot be read back and is reported through `onError`.
  On the server, `localStorage` / `sessionStorage` / `indexedDB` state is no
  longer persisted or restored. Storage errors are passed to `onError` when it
  is set, and only logged otherwise.
- 3ae0e1c: Rebuild the reactive core of `observable` / `computed` / `createReactiveState`.
  
  - **Watching an expression works.** `state.watch(() => state.get('a') * 2, cb)`
    fired once with `undefined` and never again, and a watched `computed()` only
    noticed a change when something read it. Watched computeds are now kept up
    to date and notify their watchers when their value changes.
  - **No leaks.** Every computed stayed registered on its sources forever
    (10 000 create-and-unwatch cycles left 10 000 entries). A computed now
    subscribes to its sources only while it is watched; an unwatched one
    validates its dependencies on read.
  - **`delete()` / `clear()` update computeds** that read the key, including when
    the key is set again later.
  - **`batch()` batches.** Watchers run once, after the outermost batch, with the
    final values; a key changed and changed back does not notify. A standalone
    `batch(fn)` is exported for plain observables.
  - **Update loops are bounded.** Watchers no longer run inside the setter, so a
    watcher that writes cannot overflow the stack; a loop that never settles is
    stopped after 100 rounds and reported as a `StateError` (`type:
    'update-depth'`) instead of being swallowed.
  - **Errors are isolated and reported.** A throwing watcher no longer stops the
    other watchers or leaves a computed stuck; errors go to the new `onError`
    option, or `globalErrorHandler`. A cycle between computed properties throws a
    `StateError` instead of silently producing `NaN`.
  - **Dot paths.** `set('user.name', 'John')` writes a copy of `user` and
    notifies watchers of `user` and of `user.name`; `get`, `has`, `watch` and
    `delete` accept paths, as `docs/components/state.md` already documented.
  - `toObject()` keeps a `"__proto__"` key as data; `Observable#peek()` reads
    without tracking; `ReactiveState#computed()` is typed to return the computed.
  
  **Behavior change:** watchers run after the write completes rather than
  synchronously inside it (still before `set()` / the assignment returns, unless
  inside a `batch()`). Assigning an identical primitive no longer notifies
  (`deep` now only means "re-assigning the same object notifies"). A key
  containing a dot is treated as a path, not a flat key. Reading a computed whose
  getter throws rethrows the error instead of returning the stale value. The
  internal `_computedDependents` / `_invalidate` / `Observable._currentComputed`
  members are gone.

### Patch Changes

- 5a150b5: Declare the peer dependencies packages actually use.
  
  - `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
  - Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
- 16a6e7b: Revert an `error` → `_error` identifier rename that leaked into strings and object keys.
  
  - Error events are listened for again: `pool.on('error')` (pg), the API router's `req`/`socket` `'error'` handlers, the CLI dev server's child-process `'error'`, and devtools' `window` `'error'`. Before, an idle PostgreSQL client error or a WebSocket client reset was an uncaught exception.
  - `DatabaseManager` emits `'error'` only when a listener is attached; the failure still surfaces through the rejected `connect()` promise.
  - JSON error responses from `@coherent.js/api`, the framework adapters, and the scaffolded API/JSON-RPC code use `error` instead of `_error` (JSON-RPC requires `error`). **Behavior change:** clients that read `body._error` must read `body.error`.
  - Messages, CSS classes (`component-error`, `error-message`), log levels, event types and the generated `.gitignore` (`yarn-error.log*`) are spelled correctly again; the CLI's load-failure fallback no longer crashes on `console._error`.
  
  `withLoading`'s documented `_loading` / `_error` state keys are unchanged. An ESLint rule now rejects `_error` inside strings, template text and object keys in `packages/*/src` and `packages/*/bin`.
- aa4cca3: Honour `dbName` and `storeName` in `withIndexedDB` and
  `createPersistentState({ storage: 'indexedDB' })`.
  
  The IndexedDB adapter takes a database and an object store name, but it was
  always built without them, so `withIndexedDB(state, key, { dbName: 'shop',
  storeName: 'carts' })` wrote to the `state` store of `coherent-db` like every
  other store. Both options now reach the adapter (defaults unchanged:
  `'coherent-db'` and `'state'`) and are part of the typed options.
  
  A `storeName` that does not exist yet in an existing database (created by
  another store sharing its `dbName`) is added in a version upgrade instead of
  failing with `NotFoundError`; open connections give way to the upgrade and
  reopen on their next access. The database is now opened at its current version
  rather than always at version 1.
- 94433bd: Fix schema validation edge cases and a stuck `ModalState` promise.
  
  - A `null` value for a property typed `object` passed the type check
    (`typeof null === 'object'`) and then threw a `TypeError` inside the
    validator; with `coerce: true` the same happened for any type that cannot be
    coerced. Both are now ordinary `type` validation errors.
  - `additionalProperties: false` was ignored unless `allowUnknown: false` was
    also passed. It is now enforced on its own, and `allowUnknown: false` rejects
    keys missing from any object schema's `properties`.
  - Coercion turned `"false"` into `true` (`Boolean("false")`), `""` into `0` and
    objects into `"[object Object]"`. Only unambiguous conversions remain:
    numeric strings to numbers, `"true"`/`"false"`/`"1"`/`"0"` to booleans,
    numbers and booleans to strings.
  - `NaN` is no longer accepted as a `number`.
  - Opening a `ModalState` while it was open left the first `open()` promise
    pending forever; it now resolves with `null`.
  - The `demoEnhancedPatterns` example no longer ships in the package source.
  
  **Behavior change:** arrays no longer satisfy `type: 'object'`, `NaN` fails
  `type: 'number'`, and coercions listed above as removed are now type errors.

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

- 96a2713: Isolate the SSR context API per request and make context providers render.
  
  **Context no longer leaks between concurrent requests.** `provideContext()` and
  `useContext()` shared one module-level `Map`, so a request that provided a user
  and then awaited could read back another request's user. On Node, context now
  lives in `AsyncLocalStorage`: a value provided in one async execution is not
  visible to a concurrent one, including across `await`s. The new
  `runWithContext(fn, values?)` runs `fn` in a fresh scope that ends when it
  returns — use it per request, and always around a streaming render. Browsers,
  which have no `AsyncLocalStorage`, keep the synchronous behaviour.
  
  **`createContextProvider()` output is markup again.** Core's renderer handed the
  provider a render callback, got back an HTML string and escaped it, so
  `render({ div: { children: [createContextProvider('theme', 'dark', Button)] } })`
  produced `&lt;button ...`. The provider is now an ordinary zero-argument
  component that returns its children between context enter/leave markers, so the
  children are rendered once, by the renderer. Its render-callback form keeps the
  context for an async callback instead of restoring it before the callback
  resumes.
  
  **Behavior change:** `provideContext()` no longer writes into
  `globalStateManager`, and `clearAllContexts()` / `restoreContext()` only affect
  the current execution. `useContext()` still falls back to `globalStateManager`
  when no context was provided. The same element object can no longer appear
  twice inside a provider's children, since they are now rendered by core, which
  rejects a repeated object instance as a circular reference.
- 31df2c3: Stop SSR context values from leaking between requests.
  
  - **Fixed:** outside `runWithContext()`, `provideContext()` attached the value to the caller's async context with `AsyncLocalStorage#enterWith()`. Node handles every request of a keep-alive connection in the same async context, so a value provided for one user's request (say, the logged-in user) was read by the next request on that socket.
  - **Fixed:** `createContextProvider()` entered its value with one marker component and left it with another rendered after its children. A child that threw skipped the second marker, so the value stayed set for the rest of the request (or, outside `runWithContext()`, for the next request on the connection). The provider now evaluates its subtree's function components and function-valued props (never `on*` event handlers) with the value set and restores the outer value in all cases.
  - **Behavior change:** on Node, `provideContext()` throws outside `runWithContext()` (as do `restoreContext()` / `clearAllContexts()` when there is something to remove). Wrap each request in `runWithContext(() => ...)`, or use `createContextProvider()` / `runWithContext(fn, { key: value })`. Browsers are unaffected.
  - **Behavior change:** a context value read after a provider has been rendered (in an event handler, for instance) no longer sees the provider's value; read it while rendering and close over it.
- 73654ac: Make persistent state safe to use.
  
  - **The restore on creation no longer overwrites your first updates.** Stored
    state was restored asynchronously and merged over everything, so
    `setState({ qty: 5 })` right after creation ended as the stored `qty: 1` —
    and that was persisted. Keys set before the restore finishes now keep their
    new value, and the new `ready` promise resolves (to whether anything was
    restored) once it is done.
  - **Failed writes are reported.** A throwing `setItem` (e.g.
    `QuotaExceededError`) was logged and then `onSave` fired anyway. It now goes
    to `onError`, `onSave` does not fire, and `save()` / `persist()` resolve to
    `false`.
  - **`encrypt` is honest obfuscation.** It XORed the payload with the public
    default key `'default-key'` when none was given, and threw
    `InvalidCharacterError` for any character outside Latin-1 (`'日本'`). It now
    works on UTF-8 bytes, so any text round-trips, and is documented as
    obfuscation, not encryption.
  - **`crossTab` syncs only the same store.** Every store shared one
    `BroadcastChannel`, so a cart update was merged into the user store, and a
    store applied its own broadcasts. The channel is now named after the storage
    key, messages carry a sender id, and the new `destroy()` closes it (and
    flushes a pending debounced save).
  - **No shared storage on the server.** With Web Storage available in Node, a
    request restored the previous request's state. Browser backends are now
    inert when there is no `window`, and cross-tab sync is off; pass the new
    `adapter` option to persist on the server.
  
  **Behavior change:** `encrypt: true` without an `encryptionKey` throws a
  `TypeError`. Data stored with `encrypt` by an earlier version that contains
  non-ASCII characters cannot be read back and is reported through `onError`.
  On the server, `localStorage` / `sessionStorage` / `indexedDB` state is no
  longer persisted or restored. Storage errors are passed to `onError` when it
  is set, and only logged otherwise.
- 3ae0e1c: Rebuild the reactive core of `observable` / `computed` / `createReactiveState`.
  
  - **Watching an expression works.** `state.watch(() => state.get('a') * 2, cb)`
    fired once with `undefined` and never again, and a watched `computed()` only
    noticed a change when something read it. Watched computeds are now kept up
    to date and notify their watchers when their value changes.
  - **No leaks.** Every computed stayed registered on its sources forever
    (10 000 create-and-unwatch cycles left 10 000 entries). A computed now
    subscribes to its sources only while it is watched; an unwatched one
    validates its dependencies on read.
  - **`delete()` / `clear()` update computeds** that read the key, including when
    the key is set again later.
  - **`batch()` batches.** Watchers run once, after the outermost batch, with the
    final values; a key changed and changed back does not notify. A standalone
    `batch(fn)` is exported for plain observables.
  - **Update loops are bounded.** Watchers no longer run inside the setter, so a
    watcher that writes cannot overflow the stack; a loop that never settles is
    stopped after 100 rounds and reported as a `StateError` (`type:
    'update-depth'`) instead of being swallowed.
  - **Errors are isolated and reported.** A throwing watcher no longer stops the
    other watchers or leaves a computed stuck; errors go to the new `onError`
    option, or `globalErrorHandler`. A cycle between computed properties throws a
    `StateError` instead of silently producing `NaN`.
  - **Dot paths.** `set('user.name', 'John')` writes a copy of `user` and
    notifies watchers of `user` and of `user.name`; `get`, `has`, `watch` and
    `delete` accept paths, as `docs/components/state.md` already documented.
  - `toObject()` keeps a `"__proto__"` key as data; `Observable#peek()` reads
    without tracking; `ReactiveState#computed()` is typed to return the computed.
  
  **Behavior change:** watchers run after the write completes rather than
  synchronously inside it (still before `set()` / the assignment returns, unless
  inside a `batch()`). Assigning an identical primitive no longer notifies
  (`deep` now only means "re-assigning the same object notifies"). A key
  containing a dot is treated as a path, not a flat key. Reading a computed whose
  getter throws rethrows the error instead of returning the stale value. The
  internal `_computedDependents` / `_invalidate` / `Observable._currentComputed`
  members are gone.

### Patch Changes

- 5a150b5: Declare the peer dependencies packages actually use.
  
  - `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
  - Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
- 16a6e7b: Revert an `error` → `_error` identifier rename that leaked into strings and object keys.
  
  - Error events are listened for again: `pool.on('error')` (pg), the API router's `req`/`socket` `'error'` handlers, the CLI dev server's child-process `'error'`, and devtools' `window` `'error'`. Before, an idle PostgreSQL client error or a WebSocket client reset was an uncaught exception.
  - `DatabaseManager` emits `'error'` only when a listener is attached; the failure still surfaces through the rejected `connect()` promise.
  - JSON error responses from `@coherent.js/api`, the framework adapters, and the scaffolded API/JSON-RPC code use `error` instead of `_error` (JSON-RPC requires `error`). **Behavior change:** clients that read `body._error` must read `body.error`.
  - Messages, CSS classes (`component-error`, `error-message`), log levels, event types and the generated `.gitignore` (`yarn-error.log*`) are spelled correctly again; the CLI's load-failure fallback no longer crashes on `console._error`.
  
  `withLoading`'s documented `_loading` / `_error` state keys are unchanged. An ESLint rule now rejects `_error` inside strings, template text and object keys in `packages/*/src` and `packages/*/bin`.
- aa4cca3: Honour `dbName` and `storeName` in `withIndexedDB` and
  `createPersistentState({ storage: 'indexedDB' })`.
  
  The IndexedDB adapter takes a database and an object store name, but it was
  always built without them, so `withIndexedDB(state, key, { dbName: 'shop',
  storeName: 'carts' })` wrote to the `state` store of `coherent-db` like every
  other store. Both options now reach the adapter (defaults unchanged:
  `'coherent-db'` and `'state'`) and are part of the typed options.
  
  A `storeName` that does not exist yet in an existing database (created by
  another store sharing its `dbName`) is added in a version upgrade instead of
  failing with `NotFoundError`; open connections give way to the upgrade and
  reopen on their next access. The database is now opened at its current version
  rather than always at version 1.
- 94433bd: Fix schema validation edge cases and a stuck `ModalState` promise.
  
  - A `null` value for a property typed `object` passed the type check
    (`typeof null === 'object'`) and then threw a `TypeError` inside the
    validator; with `coerce: true` the same happened for any type that cannot be
    coerced. Both are now ordinary `type` validation errors.
  - `additionalProperties: false` was ignored unless `allowUnknown: false` was
    also passed. It is now enforced on its own, and `allowUnknown: false` rejects
    keys missing from any object schema's `properties`.
  - Coercion turned `"false"` into `true` (`Boolean("false")`), `""` into `0` and
    objects into `"[object Object]"`. Only unambiguous conversions remain:
    numeric strings to numbers, `"true"`/`"false"`/`"1"`/`"0"` to booleans,
    numbers and booleans to strings.
  - `NaN` is no longer accepted as a `number`.
  - Opening a `ModalState` while it was open left the first `open()` promise
    pending forever; it now resolves with `null`.
  - The `demoEnhancedPatterns` example no longer ships in the package source.
  
  **Behavior change:** arrays no longer satisfy `type: 'object'`, `NaN` fails
  `type: 'number'`, and coercions listed above as removed are now type errors.

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

## 1.0.0

### Patch Changes

- @coherent.js/core@1.0.0

## 1.0.0

### Patch Changes

- @coherent.js/core@1.0.0

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

## 1.0.0-beta.2

### Patch Changes

- Added state management utilities moved from @coherent.js/core
- Added comprehensive TypeScript type definitions
- Includes reactive state, observables, and SSR-compatible state management

## 1.0.0-beta.1

### Features

- Initial beta release
- State management utilities (reactive state, observables)
- TypeScript type definitions included
- Full documentation and examples

### Notes

This is the first beta release of Coherent.js. The API is stable but may receive minor adjustments based on feedback before the 1.0.0 stable release.
