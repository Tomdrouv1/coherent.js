# @coherent.js/client

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

- d867352: Make delegated events behave like DOM events.
  
  - **`preventDefault()` works.** Every delegated listener except `submit` was
    registered `passive: true`, so `preventDefault()` in an `onClick`,
    `onKeyDown` or `onChange` handler was silently ignored — an SPA link still
    navigated. Listeners are now non-passive, except for the scroll-blocking
    `touchstart`, `touchmove`, `wheel` and `scroll`.
  - **Every event type works.** Only nine types were listened for, so
    `onDoubleClick`, `onMouseEnter`, `onPointerDown` and the like received a
    `data-coherent-*` attribute but never fired. `hydrate()` now registers a
    document listener for each type a component uses (new
    `EventDelegation#listen(type)`); `onDoubleClick` maps to `dblclick`.
    Non-bubbling events such as `mouseenter` only run the handler on their own
    target.
  - **Handlers bubble.** Only the nearest element with a handler ran. Handlers
    now run from the target outwards through every ancestor that has one, until
    a handler calls `stopPropagation()`. The wrapped event also exposes `type`,
    `currentTarget`, `defaultPrevented` and `stopImmediatePropagation()`.
  
  **Behavior change:** a click inside nested elements that both have `onClick`
  now runs both handlers, innermost first; call `event.stopPropagation()` to keep
  the old nearest-only behaviour.
- 0b81f55: Make `setState()` / `rerender()` actually patch the DOM, without leaking handlers.
  
  The re-render patcher only walked the children that already existed and wrote
  every prop with `setAttribute(String(value))`. It now diffs the previous
  virtual tree against the next one:
  
  - children are added, removed and replaced, so a list that grows from one item
    to three, or empties, is rendered; when every sibling has a `key`, children
    are matched by key and their DOM nodes (and focus) are kept
  - attribute values follow core's renderer: `style` objects become
    `color: red; font-size: 12px`, function values are called, `true` is a bare
    attribute and `false`/`null`/`undefined` remove it; `key` and `html` are
    never attributes, and `html` updates the element's content
  - `value`, `checked` and `selected` are also written to the element's
    properties, so a field the user edited follows the state
  - `event.state`, `event.props` and `event.component` are populated for
    handlers bound by `hydrate()` (they were always `null`)
  
  Handlers no longer leak: each re-render releases the previous render's handler
  ids (1000 `setState()` calls left 1001 registry entries) and removes
  `data-coherent-*` attributes whose handler went away.
  
  **Behavior change:** `unmount()` is terminal — `setState()` and `rerender()`
  on an unmounted component do nothing. Hydrating a container that is already
  hydrated unmounts the previous hydration first, instead of binding a second
  set of handlers. `value`/`checked`/`selected` props are controlled: a
  re-render resets a field to the value its props give.
- f741e60: Connect the router to the browser.
  
  `createRouter()` accepted `mode` and `base` but never touched the URL: it made
  no `pushState` calls, listened to neither `popstate` nor link clicks, and only
  matched paths registered verbatim, so `/users/:id` never matched `/users/42`.
  
  - Routes may contain `:param` segments and end in `/*`; the current route
    carries `params`, `query`, `hash` and `fullPath`.
  - `push()` / `replace()` write browser history (`pushState` / `replaceState`),
    honouring `base` in history mode and using the hash in `mode: 'hash'`.
  - New `start()` navigates to the current location, follows back/forward
    (`popstate`, or `hashchange` in hash mode) and intercepts clicks on
    same-origin links to registered routes (`interceptLinks: false` opts out);
    `stop()` detaches. Nothing is attached before `start()`, so importing the
    router has no side effects.
  - `beforeEnter` / `beforeLeave` guards, declared in the types but never called,
    now run; returning `false` cancels the navigation.
  
  **Behavior change:** the last navigation wins — a slow `push('/slow')` that
  resolves after a later `push('/fast')` now resolves `false` instead of
  replacing it. `back()` goes back through history: calling it twice after
  `/a → /b → /c` ends on `/a` instead of bouncing between `/b` and `/c`;
  `forward()` works without a browser too. A saved scroll position is restored
  on back/forward only, not on every visit to a path.

### Patch Changes

- 7fcba08: Fix the HMR client.
  
  - A changed module without an `accept` handler got neither an update nor a
    reload: the fallback imported `../hydration.js`, which no longer exists, and
    swallowed the failure. Such modules now trigger `location.reload()`.
  - `disconnect()` scheduled a reconnect from the closed socket's own `close`
    event. Events from a socket that was disconnected or replaced are ignored.
  - Every overlay `show()` added a keydown listener while `hide()` removed one,
    so Escape handlers piled up; there is now one per visible overlay.
  - The form-state capturer keyed radios by name and type only, so a whole group
    collapsed onto one entry and restoring it wiped the selection. Radios and
    checkboxes sharing a name are now told apart by value.
  - The tracked `fetch()` of a hot context replaced the caller's `AbortSignal`;
    the caller's signal and module disposal now both abort the request.
  - **Behavior change:** the `@coherent.js/client/hmr` entry point threw a 1.0
    migration error on import although `package.json` exports it with types. It
    now exports the HMR API (`hmrClient`, `createHotContext`, ...); importing it
    still does not connect — call `hmrClient.initialize()`.
  
  The stale `src/hydration.d.ts`, which described the removed legacy hydration
  API and was referenced by nothing, is deleted.
- 06e869b: Bind hydrated handlers to the element that rendered them.
  
  `hydrate()` paired a component's children with DOM nodes by raw array index,
  so anything the server does not render as an element — a `null` from a
  conditional, a string, a nested array, a `text` prop, raw HTML — shifted every
  following element. With `children: [null, deleteButton, saveButton]`, clicking
  Save ran the delete handler. Children are now reduced to what the server
  emitted (null, undefined and booleans dropped, arrays flattened, zero-argument
  function components called, adjacent strings merged, whitespace-only text
  ignored) and elements are paired with element nodes only; elements after raw
  HTML are paired from the end.
  
  The mismatch detector uses the same normalisation, so identical server and
  client output no longer reports `children_count` and `text` mismatches, and a
  `null` or `false` attribute value is expected to be absent rather than the
  string `"null"`.
- aa47255: Stop production hydration from walking the DOM for mismatches.
  
  The client build replaced `process.env.NODE_ENV` with the build machine's
  value — unset, so `'development'` — which baked `detectMismatch = true` into
  the published bundle: every production `hydrate()` compared the whole server
  DOM and logged warnings. `process.env.NODE_ENV` is now left in the bundle for
  the application's bundler to replace, and read at runtime (a page without
  `process` counts as production).
  
  **Behavior change:** mismatch detection defaults to off unless
  `process.env.NODE_ENV === 'development'`, `detectMismatch: true` is passed, or
  `strict` / `onMismatch` is given (both imply it). It used to default to on for
  anything but `'production'`, including test runs.
- 8c3e073: Don't fail hash navigations for want of a DOM.
  
  - **Fixed:** navigating to a path with a `#hash` scrolled with `document.querySelector(hash)` after the route was committed; without a DOM that threw, and `push()` returned `false` although the route had changed. Scrolling is skipped without a DOM, and hash targets are found with `getElementById`, which also works for ids that aren't valid selectors (`#123`).
- b28a3cb: Read component trees the way the server renders them.
  
  - **Fixed:** an object with several tag keys, such as `{ span: { text: 'label' }, button: { text: 'Go', onclick } }`, renders on the server as sibling elements, but `hydrate()` and the patcher read only its first key. Every following element shifted by one: clicking the button ran the next element's handler, and a re-render dropped the button. Each key is now its own element, in key order. Objects with a key that is not a tag name (`{ my_tag: ... }`) render nothing on the client either, and `lazy()` values render what they evaluate to, as on the server.
  - **Fixed:** re-renders wrote `className: ['btn', active && 'active']` as `class="btn,false"` and `className: { active: true }` as `class="[object Object]"`, ignored `class` when `className` was also given, and removed `aria-*` attributes and `spellcheck`, `draggable` and `contenteditable` set to `false`. They now produce what the server renders: `class="btn"`, `class="active"`, one merged class attribute, and `aria-hidden="false"` / `spellcheck="false"`.
  - **Fixed:** `text: null` rendered the string "null" on the client, both when creating elements and when patching (`text: 'Save'` → `text: null` wrote "null" into the button). It now renders no text, as on the server.
  - **Fixed:** mismatch detection (in development, with `strict` or with `onMismatch`) reported mismatches for these trees although the server and client output were identical, and `strict: true` threw for them.
- edbb55b: Make the client's TypeScript declarations and README describe the real API.
  
  - `wrapEvent` was declared as `(eventType, handler) => { handlerId }`; it takes
    a native event, the handler's element and a component reference, and returns
    the wrapped event, now typed as `CoherentEvent`.
  - Delegated handlers (`EventHandler`, `ClickHandler`, ..., `StateAwareHandler`)
    were typed as `(event, element, data)` / `(event, state, setState)`; they
    receive one `CoherentEvent` carrying `originalEvent`, `state`, `setState` and
    `props`.
  - `serializeState` / `serializeStateWithWarning` / `deserializeState` return
    `null` when there is nothing to (de)serialize; `HydrationMismatch.type` lists
    the values the detector reports (`tagName`, `children_count`,
    `missing_dom_child`, `extra_dom_child`, ...) and `domPath`.
  - `HydrationOptions` only lists options `hydrate()` reads; `timeout`,
    `onError`, `validators` and the rest type-checked but did nothing.
  - The HMR classes are declared as the classes they are, and some 400 lines of
    declarations for APIs that never existed at runtime (`autoHydrate`,
    `registerComponent`, `createStateManager`, `EventManager`, performance
    monitor, `hmrClient.onUpdate`, `cleanupTracker.trackTimer`, ...) are removed.
    **Behavior change:** code that referenced those phantom types no longer
    compiles.
  - The router types are re-exported from `@coherent.js/client/router` instead
    of a diverging copy.
  
  The README no longer documents `hydrateComponent`, `autoHydrate`,
  `registerEventHandler` or `createClientRouter`, none of which exist.
- 7da1e24: Fix attribute and content values core rendered wrongly (and keep the client in step).
  
  - **Fixed:** `htmlFor` was written as `htmlFor="x"`, which browsers read as an unknown `htmlfor` attribute: labels, including those in forms generated by `coherent generate page`, were not associated with their controls. It is now written as `for`.
  - **Fixed:** style values that are `null`, `undefined` or `false` (`{ color: active && 'red' }`) rendered as `color: false`; they are now left out, and an empty style object no longer writes `style=""`.
  - **Fixed:** custom properties lost their case (`--mainColor` became `--main-color`, a different property).
  - **Fixed:** a `text` function returning `null`/`undefined`, and `html: null`, rendered the string `null`. They now render nothing (`html: null` falls back to `text`/`children`), and a `text` function returning `dangerouslySetInnerContent()` is emitted verbatim.
  - **Fixed:** with both `class` and `className`, a function value was joined into the class as its source code; it is now called first.
- 1b4a351: Call function components without arguments, whatever their arity.
  
  - **Behavior change:** a function child that declares a parameter used to receive a render callback returning an HTML string, which was then escaped (double-escaped context providers), and `({ name }) => …` children destructured their props from that callback. Every function component is now called with no arguments, on the server, inside error boundaries, and when `@coherent.js/client` pairs virtual nodes with the DOM.
  - The client recognizes trusted content by the same symbol brand as core.
  - Types: `className` / `class` accept arrays and `{ name: condition }` objects, and `onClick` / `onSubmit` handlers may take the event.
- 5a150b5: Declare the peer dependencies packages actually use.
  
  - `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
  - Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
- 6bf0d21: Fix inputs that made parsing take seconds, a log format string built from the request, and a case-sensitive `<script>` match (found by CodeQL).
  
  - **Fixed (database):** a select column such as `'a'` followed by 50,000 spaces took about two seconds to validate (the `AS alias` pattern backtracked quadratically), so one request that passes column names through could hold the event loop. Parsing is now linear.
  - **Fixed (api):** the 5xx log line put the request URL inside `console.error`'s format string, so a `%s` or `%o` in the URL consumed the error argument. The URL is now an argument. The router's `prefix` is trimmed of trailing slashes in linear time.
  - **Fixed (client):** the router's `base` is trimmed of trailing slashes in linear time.
  - **Fixed (tooling):** `toHaveText` / `toContainText` strip tags in linear time (`'<'` repeated 50,000 times took about two seconds).
  - **Fixed (integrations):** the SvelteKit preprocessor now finds an instance script written `<SCRIPT>`; it used to add a second one.
- 16a6e7b: Revert an `error` → `_error` identifier rename that leaked into strings and object keys.
  
  - Error events are listened for again: `pool.on('error')` (pg), the API router's `req`/`socket` `'error'` handlers, the CLI dev server's child-process `'error'`, and devtools' `window` `'error'`. Before, an idle PostgreSQL client error or a WebSocket client reset was an uncaught exception.
  - `DatabaseManager` emits `'error'` only when a listener is attached; the failure still surfaces through the rejected `connect()` promise.
  - JSON error responses from `@coherent.js/api`, the framework adapters, and the scaffolded API/JSON-RPC code use `error` instead of `_error` (JSON-RPC requires `error`). **Behavior change:** clients that read `body._error` must read `body.error`.
  - Messages, CSS classes (`component-error`, `error-message`), log levels, event types and the generated `.gitignore` (`yarn-error.log*`) are spelled correctly again; the CLI's load-failure fallback no longer crashes on `console._error`.
  
  `withLoading`'s documented `_loading` / `_error` state keys are unchanged. An ESLint rule now rejects `_error` inside strings, template text and object keys in `packages/*/src` and `packages/*/bin`.

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

- d867352: Make delegated events behave like DOM events.
  
  - **`preventDefault()` works.** Every delegated listener except `submit` was
    registered `passive: true`, so `preventDefault()` in an `onClick`,
    `onKeyDown` or `onChange` handler was silently ignored — an SPA link still
    navigated. Listeners are now non-passive, except for the scroll-blocking
    `touchstart`, `touchmove`, `wheel` and `scroll`.
  - **Every event type works.** Only nine types were listened for, so
    `onDoubleClick`, `onMouseEnter`, `onPointerDown` and the like received a
    `data-coherent-*` attribute but never fired. `hydrate()` now registers a
    document listener for each type a component uses (new
    `EventDelegation#listen(type)`); `onDoubleClick` maps to `dblclick`.
    Non-bubbling events such as `mouseenter` only run the handler on their own
    target.
  - **Handlers bubble.** Only the nearest element with a handler ran. Handlers
    now run from the target outwards through every ancestor that has one, until
    a handler calls `stopPropagation()`. The wrapped event also exposes `type`,
    `currentTarget`, `defaultPrevented` and `stopImmediatePropagation()`.
  
  **Behavior change:** a click inside nested elements that both have `onClick`
  now runs both handlers, innermost first; call `event.stopPropagation()` to keep
  the old nearest-only behaviour.
- 0b81f55: Make `setState()` / `rerender()` actually patch the DOM, without leaking handlers.
  
  The re-render patcher only walked the children that already existed and wrote
  every prop with `setAttribute(String(value))`. It now diffs the previous
  virtual tree against the next one:
  
  - children are added, removed and replaced, so a list that grows from one item
    to three, or empties, is rendered; when every sibling has a `key`, children
    are matched by key and their DOM nodes (and focus) are kept
  - attribute values follow core's renderer: `style` objects become
    `color: red; font-size: 12px`, function values are called, `true` is a bare
    attribute and `false`/`null`/`undefined` remove it; `key` and `html` are
    never attributes, and `html` updates the element's content
  - `value`, `checked` and `selected` are also written to the element's
    properties, so a field the user edited follows the state
  - `event.state`, `event.props` and `event.component` are populated for
    handlers bound by `hydrate()` (they were always `null`)
  
  Handlers no longer leak: each re-render releases the previous render's handler
  ids (1000 `setState()` calls left 1001 registry entries) and removes
  `data-coherent-*` attributes whose handler went away.
  
  **Behavior change:** `unmount()` is terminal — `setState()` and `rerender()`
  on an unmounted component do nothing. Hydrating a container that is already
  hydrated unmounts the previous hydration first, instead of binding a second
  set of handlers. `value`/`checked`/`selected` props are controlled: a
  re-render resets a field to the value its props give.
- f741e60: Connect the router to the browser.
  
  `createRouter()` accepted `mode` and `base` but never touched the URL: it made
  no `pushState` calls, listened to neither `popstate` nor link clicks, and only
  matched paths registered verbatim, so `/users/:id` never matched `/users/42`.
  
  - Routes may contain `:param` segments and end in `/*`; the current route
    carries `params`, `query`, `hash` and `fullPath`.
  - `push()` / `replace()` write browser history (`pushState` / `replaceState`),
    honouring `base` in history mode and using the hash in `mode: 'hash'`.
  - New `start()` navigates to the current location, follows back/forward
    (`popstate`, or `hashchange` in hash mode) and intercepts clicks on
    same-origin links to registered routes (`interceptLinks: false` opts out);
    `stop()` detaches. Nothing is attached before `start()`, so importing the
    router has no side effects.
  - `beforeEnter` / `beforeLeave` guards, declared in the types but never called,
    now run; returning `false` cancels the navigation.
  
  **Behavior change:** the last navigation wins — a slow `push('/slow')` that
  resolves after a later `push('/fast')` now resolves `false` instead of
  replacing it. `back()` goes back through history: calling it twice after
  `/a → /b → /c` ends on `/a` instead of bouncing between `/b` and `/c`;
  `forward()` works without a browser too. A saved scroll position is restored
  on back/forward only, not on every visit to a path.

### Patch Changes

- 7fcba08: Fix the HMR client.
  
  - A changed module without an `accept` handler got neither an update nor a
    reload: the fallback imported `../hydration.js`, which no longer exists, and
    swallowed the failure. Such modules now trigger `location.reload()`.
  - `disconnect()` scheduled a reconnect from the closed socket's own `close`
    event. Events from a socket that was disconnected or replaced are ignored.
  - Every overlay `show()` added a keydown listener while `hide()` removed one,
    so Escape handlers piled up; there is now one per visible overlay.
  - The form-state capturer keyed radios by name and type only, so a whole group
    collapsed onto one entry and restoring it wiped the selection. Radios and
    checkboxes sharing a name are now told apart by value.
  - The tracked `fetch()` of a hot context replaced the caller's `AbortSignal`;
    the caller's signal and module disposal now both abort the request.
  - **Behavior change:** the `@coherent.js/client/hmr` entry point threw a 1.0
    migration error on import although `package.json` exports it with types. It
    now exports the HMR API (`hmrClient`, `createHotContext`, ...); importing it
    still does not connect — call `hmrClient.initialize()`.
  
  The stale `src/hydration.d.ts`, which described the removed legacy hydration
  API and was referenced by nothing, is deleted.
- 06e869b: Bind hydrated handlers to the element that rendered them.
  
  `hydrate()` paired a component's children with DOM nodes by raw array index,
  so anything the server does not render as an element — a `null` from a
  conditional, a string, a nested array, a `text` prop, raw HTML — shifted every
  following element. With `children: [null, deleteButton, saveButton]`, clicking
  Save ran the delete handler. Children are now reduced to what the server
  emitted (null, undefined and booleans dropped, arrays flattened, zero-argument
  function components called, adjacent strings merged, whitespace-only text
  ignored) and elements are paired with element nodes only; elements after raw
  HTML are paired from the end.
  
  The mismatch detector uses the same normalisation, so identical server and
  client output no longer reports `children_count` and `text` mismatches, and a
  `null` or `false` attribute value is expected to be absent rather than the
  string `"null"`.
- aa47255: Stop production hydration from walking the DOM for mismatches.
  
  The client build replaced `process.env.NODE_ENV` with the build machine's
  value — unset, so `'development'` — which baked `detectMismatch = true` into
  the published bundle: every production `hydrate()` compared the whole server
  DOM and logged warnings. `process.env.NODE_ENV` is now left in the bundle for
  the application's bundler to replace, and read at runtime (a page without
  `process` counts as production).
  
  **Behavior change:** mismatch detection defaults to off unless
  `process.env.NODE_ENV === 'development'`, `detectMismatch: true` is passed, or
  `strict` / `onMismatch` is given (both imply it). It used to default to on for
  anything but `'production'`, including test runs.
- 8c3e073: Don't fail hash navigations for want of a DOM.
  
  - **Fixed:** navigating to a path with a `#hash` scrolled with `document.querySelector(hash)` after the route was committed; without a DOM that threw, and `push()` returned `false` although the route had changed. Scrolling is skipped without a DOM, and hash targets are found with `getElementById`, which also works for ids that aren't valid selectors (`#123`).
- b28a3cb: Read component trees the way the server renders them.
  
  - **Fixed:** an object with several tag keys, such as `{ span: { text: 'label' }, button: { text: 'Go', onclick } }`, renders on the server as sibling elements, but `hydrate()` and the patcher read only its first key. Every following element shifted by one: clicking the button ran the next element's handler, and a re-render dropped the button. Each key is now its own element, in key order. Objects with a key that is not a tag name (`{ my_tag: ... }`) render nothing on the client either, and `lazy()` values render what they evaluate to, as on the server.
  - **Fixed:** re-renders wrote `className: ['btn', active && 'active']` as `class="btn,false"` and `className: { active: true }` as `class="[object Object]"`, ignored `class` when `className` was also given, and removed `aria-*` attributes and `spellcheck`, `draggable` and `contenteditable` set to `false`. They now produce what the server renders: `class="btn"`, `class="active"`, one merged class attribute, and `aria-hidden="false"` / `spellcheck="false"`.
  - **Fixed:** `text: null` rendered the string "null" on the client, both when creating elements and when patching (`text: 'Save'` → `text: null` wrote "null" into the button). It now renders no text, as on the server.
  - **Fixed:** mismatch detection (in development, with `strict` or with `onMismatch`) reported mismatches for these trees although the server and client output were identical, and `strict: true` threw for them.
- edbb55b: Make the client's TypeScript declarations and README describe the real API.
  
  - `wrapEvent` was declared as `(eventType, handler) => { handlerId }`; it takes
    a native event, the handler's element and a component reference, and returns
    the wrapped event, now typed as `CoherentEvent`.
  - Delegated handlers (`EventHandler`, `ClickHandler`, ..., `StateAwareHandler`)
    were typed as `(event, element, data)` / `(event, state, setState)`; they
    receive one `CoherentEvent` carrying `originalEvent`, `state`, `setState` and
    `props`.
  - `serializeState` / `serializeStateWithWarning` / `deserializeState` return
    `null` when there is nothing to (de)serialize; `HydrationMismatch.type` lists
    the values the detector reports (`tagName`, `children_count`,
    `missing_dom_child`, `extra_dom_child`, ...) and `domPath`.
  - `HydrationOptions` only lists options `hydrate()` reads; `timeout`,
    `onError`, `validators` and the rest type-checked but did nothing.
  - The HMR classes are declared as the classes they are, and some 400 lines of
    declarations for APIs that never existed at runtime (`autoHydrate`,
    `registerComponent`, `createStateManager`, `EventManager`, performance
    monitor, `hmrClient.onUpdate`, `cleanupTracker.trackTimer`, ...) are removed.
    **Behavior change:** code that referenced those phantom types no longer
    compiles.
  - The router types are re-exported from `@coherent.js/client/router` instead
    of a diverging copy.
  
  The README no longer documents `hydrateComponent`, `autoHydrate`,
  `registerEventHandler` or `createClientRouter`, none of which exist.
- 7da1e24: Fix attribute and content values core rendered wrongly (and keep the client in step).
  
  - **Fixed:** `htmlFor` was written as `htmlFor="x"`, which browsers read as an unknown `htmlfor` attribute: labels, including those in forms generated by `coherent generate page`, were not associated with their controls. It is now written as `for`.
  - **Fixed:** style values that are `null`, `undefined` or `false` (`{ color: active && 'red' }`) rendered as `color: false`; they are now left out, and an empty style object no longer writes `style=""`.
  - **Fixed:** custom properties lost their case (`--mainColor` became `--main-color`, a different property).
  - **Fixed:** a `text` function returning `null`/`undefined`, and `html: null`, rendered the string `null`. They now render nothing (`html: null` falls back to `text`/`children`), and a `text` function returning `dangerouslySetInnerContent()` is emitted verbatim.
  - **Fixed:** with both `class` and `className`, a function value was joined into the class as its source code; it is now called first.
- 1b4a351: Call function components without arguments, whatever their arity.
  
  - **Behavior change:** a function child that declares a parameter used to receive a render callback returning an HTML string, which was then escaped (double-escaped context providers), and `({ name }) => …` children destructured their props from that callback. Every function component is now called with no arguments, on the server, inside error boundaries, and when `@coherent.js/client` pairs virtual nodes with the DOM.
  - The client recognizes trusted content by the same symbol brand as core.
  - Types: `className` / `class` accept arrays and `{ name: condition }` objects, and `onClick` / `onSubmit` handlers may take the event.
- 5a150b5: Declare the peer dependencies packages actually use.
  
  - `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
  - Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
- 6bf0d21: Fix inputs that made parsing take seconds, a log format string built from the request, and a case-sensitive `<script>` match (found by CodeQL).
  
  - **Fixed (database):** a select column such as `'a'` followed by 50,000 spaces took about two seconds to validate (the `AS alias` pattern backtracked quadratically), so one request that passes column names through could hold the event loop. Parsing is now linear.
  - **Fixed (api):** the 5xx log line put the request URL inside `console.error`'s format string, so a `%s` or `%o` in the URL consumed the error argument. The URL is now an argument. The router's `prefix` is trimmed of trailing slashes in linear time.
  - **Fixed (client):** the router's `base` is trimmed of trailing slashes in linear time.
  - **Fixed (tooling):** `toHaveText` / `toContainText` strip tags in linear time (`'<'` repeated 50,000 times took about two seconds).
  - **Fixed (integrations):** the SvelteKit preprocessor now finds an instance script written `<SCRIPT>`; it used to add a second one.
- 16a6e7b: Revert an `error` → `_error` identifier rename that leaked into strings and object keys.
  
  - Error events are listened for again: `pool.on('error')` (pg), the API router's `req`/`socket` `'error'` handlers, the CLI dev server's child-process `'error'`, and devtools' `window` `'error'`. Before, an idle PostgreSQL client error or a WebSocket client reset was an uncaught exception.
  - `DatabaseManager` emits `'error'` only when a listener is attached; the failure still surfaces through the rejected `connect()` promise.
  - JSON error responses from `@coherent.js/api`, the framework adapters, and the scaffolded API/JSON-RPC code use `error` instead of `_error` (JSON-RPC requires `error`). **Behavior change:** clients that read `body._error` must read `body.error`.
  - Messages, CSS classes (`component-error`, `error-message`), log levels, event types and the generated `.gitignore` (`yarn-error.log*`) are spelled correctly again; the CLI's load-failure fallback no longer crashes on `console._error`.
  
  `withLoading`'s documented `_loading` / `_error` state keys are unchanged. An ESLint rule now rejects `_error` inside strings, template text and object keys in `packages/*/src` and `packages/*/bin`.
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

## 1.0.0

## 1.0.0

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

## 1.0.0-beta.2

### Patch Changes

- Added comprehensive TypeScript type definitions
- Updated internal dependencies to use workspace protocol

## 1.0.0-beta.1

### Features

- Initial beta release
- Client-side hydration and progressive enhancement utilities
- TypeScript type definitions included
- Full documentation and examples

### Notes

This is the first beta release of Coherent.js. The API is stable but may receive minor adjustments based on feedback before the 1.0.0 stable release.
