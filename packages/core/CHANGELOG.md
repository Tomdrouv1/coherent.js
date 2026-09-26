# @coherent.js/core

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

- 0b8c6e2: Stop swallowing component errors; make error boundaries per-request on the server.
  
  - **Behavior change:** a function component that throws no longer renders as nothing. The error now propagates out of `render()` (as a `RenderingError` with `renderPath` and the original error as `cause`), so frameworks answer 500 instead of serving a partial page with a 200. To keep rendering, pass `onError: (error, { path }) => replacement` — return `null` to omit the component as before, or a fallback element.
  - **Fixed:** error boundaries only caught errors thrown while calling the wrapped component itself; nested function components ran later in the renderer and escaped. Zero-argument function components inside a boundary are now evaluated within it.
  - **Fixed:** on the server, a boundary kept its error state across calls, so one failed request made every later request render the fallback, and it retained that request's props. Server-side calls now start from a clean state; the stateful behavior (`resetKeys`, `maxErrors`, `resetTimeout`) still applies in the browser.
  - **Fixed:** `createAsyncErrorBoundary` left its timeout timer running after the component resolved, keeping the process alive for `timeout` ms per call.
- e69a230: Stop leaking server-side event handlers into a global registry.
  
  - **Fixed (memory leak):** every function-valued `on*` prop was stored in `global.__coherentActionRegistry` under a `Date.now()` + `Math.random()` id and never removed — 50,000 renders kept 50,000 closures (and whatever request data they captured). Nothing read the registry: the id pointed at server memory the browser never sees, and `@coherent.js/client`'s `hydrate()` attaches handlers from the component tree.
  - **Fixed:** the random ids made two renders of the same component produce different HTML, which defeated ETags, HTML caching and hydration comparisons.
  - **Behavior change:** function-valued `on*` props now render no attribute (previously `data-action="__coherent_action_…" data-event="…"`). Inline string handlers (`onclick: 'history.back()'`) and hand-written `data-action` attributes for the event bus are unchanged.
- e250e32: Make the render cache opt-in and correct.
  
  - **Fixed:** rendering a string-shorthand element (`{ span: 'hello' }`, `{ title: 'My page' }`) poisoned the shared cache — `get`/`set` were called with swapped arguments — so every later `render()` in the process returned `undefined` (or a page lost its `<body>`).
  - **Fixed (security):** the cache key left out any prop whose name didn't look like a tag name (`data_id`, `x-on:click`, `@click`, `xlink:href`), so different elements shared an entry and one request could be served another request's HTML.
  - **Fixed:** the cache never evicted (it re-sorted the whole map on every insert past 1,000 entries) and counted statistics under an unbounded set of keys, so render time and memory grew with every distinct render — a 240-node page went from 13 ms to 530 ms after 150 renders.
  - **Behavior change:** `enableCache` now defaults to `false`. When enabled, one entry is stored per whole render, keyed on the complete component tree; trees containing functions, class instances or Dates are never cached. Pass `cache: createCacheManager({ maxCacheSize, ttlMs })` for a dedicated cache; `cacheSize` is deprecated and ignored (it always was).
  - `createCacheManager` evicts least-recently-used entries in O(1), accepts `maxSize` as an alias for `maxCacheSize`, supports a per-entry `ttlMs`, counts keys toward the memory budget, and `clear(type)` only releases that type's memory. Its type declarations now describe the real API.
  - `precompileComponent` no longer throws `ReferenceError: isStaticElement is not defined`.
- 5a3a6c2: Fix value rendering, CSS scoping, monitoring and a few leaks.
  
  - **Behavior change:** booleans in `children` render nothing, so `cond && { li: ... }` works (it printed `false`). `text: false` still prints `false`; `text: null` now renders empty instead of `null`.
  - `className` accepts arrays and objects (`['btn', cond && 'active']`, `{ active: cond }`) instead of printing `a,b` / `[object Object]`; `class` and `className` together are merged into one attribute; `aria-*`, `spellcheck`, `draggable` and `contenteditable` write `"false"` instead of dropping the attribute.
  - **Behavior change:** scoped CSS (`scoped` / `encapsulate`) derives its `coh-…` id from the component's CSS, so a component renders the same HTML every time (it was `coh-0`, `coh-1`… from a global counter). Rules inside `@media`, `@supports`, `@container` and `@layer` are scoped; `@keyframes`, `@font-face` and other at-rules are left intact (they were corrupted into `@media (max-width[coh-3]: 600px)`); `render(Fn, { scoped: true })` is now scoped.
  - **Fixed:** `render(c, { enableMonitoring: true })` and `renderWithTiming()` always threw `performanceMonitor.recordError is not a function`; the monitor now implements `recordRender` / `recordError`, and `endRender()` records into `renderTime`.
  - **Fixed (security):** `CSSManager.escapeHtml` was a no-op, so `generateCSSLinks` wrote hrefs unescaped (`"><script>` broke out); inline styles can no longer close their `<style>` element.
  - **Fixed:** `memoize()` / `ComponentCache` started an un-`unref`'d cleanup interval, so scripts, CLIs and static builds that used it never exited.
- 6829455: Rebuild and export `renderToStream`.
  
  - **New export:** `renderToStream(component, options)` (and `streamingUtils`) from `@coherent.js/core`. It was documented but not exported, and the implementation behind it disagreed with `render()` in every case tested.
  - The stream now shares its element serialization with `render()`, so the output is identical by construction. The old streamer HTML-escaped `<script>` bodies, dropped children next to `text`, emitted `key="…"`, rendered `{ td: 42 }` as empty, wrote `<br />`, and skipped tag-name validation (`{ 'img src=x onerror=alert(1)': {} }` became a live `<img>`).
  - It really streams: large elements are emitted child by child and the event loop gets a turn after every chunk (the old yield check never fired, so a 1.4 MB page blocked the loop for its whole render and time-to-first-byte equaled a buffered render). On a 10,000-row page over HTTP: first byte after ~20 ms instead of ~80–100 ms; total time is higher (~175 ms vs ~80 ms) because other work runs between chunks.
  - **Behavior change:** errors propagate out of the iteration instead of being written into an HTML comment (unescaped, with `-->` injectable) and ending as a truncated 200; `onError` works as in `render()`. `streamingUtils.streamToResponse` respects backpressure, aborts the response on error, and no longer sets `Transfer-Encoding` by hand.
  - **Behavior change:** `render()` renders every key of a multi-key object as siblings (`{ h1: …, p: … }`), as the streamer did; it used to drop every key after the first silently.
- 7abfb53: Close two XSS vectors in the renderer.
  
  - **Fixed (security):** attribute names were emitted unescaped, so `{ div: { 'onmouseover="alert(1)" x': 'y' } }` rendered a live event handler and a key containing `>` broke out of the tag — easy to hit when spreading request data into props. **Behavior change:** rendering an element whose attribute name contains whitespace, quotes, `<`, `>`, `/`, `=` or control characters now throws. Names like `data-*`, `aria-*`, `x-on:click`, `@click`, `:class` and `xlink:href` are unaffected. New export: `isValidAttributeName(name)`.
  - **Fixed (security):** `isTrustedContent()` recognized any object with `__trusted: true` and a string `__html`, so a JSON request body could smuggle raw HTML into `text` or `children`. Markers from `dangerouslySetInnerContent()` now carry a non-enumerable `Symbol.for('coherent.js.trustedContent')` brand and are frozen; plain objects, including JSON and spread copies, are never trusted. Code that builds `{ __html, __trusted: true }` objects by hand must call `dangerouslySetInnerContent()` instead.

### Patch Changes

- 85898bd: Render `lazy()` values and reject Promises explicitly.
  
  - **Fixed:** a `lazy()` value in a tree rendered as nothing unless `evaluateLazy()` ran first; the renderer now evaluates it.
  - **Behavior change:** an async component or a Promise in a tree rendered as an empty string without any signal; `render()` now throws `Cannot render a Promise at <path>: render() is synchronous`. Await async components and their data before rendering.
- 7da1e24: Fix attribute and content values core rendered wrongly (and keep the client in step).
  
  - **Fixed:** `htmlFor` was written as `htmlFor="x"`, which browsers read as an unknown `htmlfor` attribute: labels, including those in forms generated by `coherent generate page`, were not associated with their controls. It is now written as `for`.
  - **Fixed:** style values that are `null`, `undefined` or `false` (`{ color: active && 'red' }`) rendered as `color: false`; they are now left out, and an empty style object no longer writes `style=""`.
  - **Fixed:** custom properties lost their case (`--mainColor` became `--main-color`, a different property).
  - **Fixed:** a `text` function returning `null`/`undefined`, and `html: null`, rendered the string `null`. They now render nothing (`html: null` falls back to `text`/`children`), and a `text` function returning `dangerouslySetInnerContent()` is emitted verbatim.
  - **Fixed:** with both `class` and `className`, a function value was joined into the class as its source code; it is now called first.
- ccff8e7: Render the children of elements whose prop names don't look like tag names.
  
  - **Fixed:** the renderer decided whether an element had children with `hasChildren()`, which first validates every prop name against the tag-name pattern. An element with a prop such as `@click`, `x-on:click`, `:class`, `xlink:href` or `data_id` therefore rendered with no children at all — `<button @click="save()"></button>` instead of `<button @click="save()"><span>Save</span></button>`.
- b21610a: Make scoped event buses and `withEventBus` work.
  
  - **Fixed:** `EventBus#createScope()` was declared in the types and called by `withEventBus({ scope })` and `emitEvent(name, { scope })`, but didn't exist, so any scoped usage threw `createScope is not a function`. It now returns a view whose event and action names are prefixed with `scope:`; `eventSystem.createScope` is available too.
  - **Fixed:** `withEventBus` attached `__eventBusCleanup` as an enumerable key, so the element failed component validation and never rendered. It is now non-enumerable.
  - **Fixed (memory leak):** on the server, every render of a `withEventBus` component added its listeners and actions to the global bus permanently (the bus then warned on every render once past 100). Listeners and actions are only registered in a browser now.
- 1b4a351: Call function components without arguments, whatever their arity.
  
  - **Behavior change:** a function child that declares a parameter used to receive a render callback returning an HTML string, which was then escaped (double-escaped context providers), and `({ name }) => …` children destructured their props from that callback. Every function component is now called with no arguments, on the server, inside error boundaries, and when `@coherent.js/client` pairs virtual nodes with the DOM.
  - The client recognizes trusted content by the same symbol brand as core.
  - Types: `className` / `class` accept arrays and `{ name: condition }` objects, and `onClick` / `onSubmit` handlers may take the event.
- cd2cb30: Give every `memo()` its own cache.
  
  - **Fixed (security):** `memo` from `@coherent.js/core` kept one module-level Map keyed only by props, so `UserCard({ id: 1 })` could return `AdminPanel({ id: 1 })`'s output. Each memoized function now owns a bounded LRU cache.
  - **Fixed:** props differing only in a callback (`onSelect`) no longer share a key; falsy results are cached; the `ttl` strategy checks expiry on read instead of starting a timer per entry (which kept the process alive); the `weak` strategy keys on the first argument's identity instead of throwing; arguments that can't be serialized (circular, BigInt) are passed through uncached.
  - `memo(fn, keyFn)` keeps working; `memo(fn, { keyFn, maxSize, strategy, ttl, stats, onHit, onMiss, onEvict })` — the signature the type declarations always described — now works too. The never-implemented `compareFn` / `shallow` options were removed from the types.
- 606bb86: Render `onError`'s replacement in place of an element whose content function throws.
  
  - **Fixed:** for `{ div: () => { throw ... } }`, the component returned by `render()`'s `onError` option was used as the `<div>`'s props, so the fallback came out as `<div p="[object Object]"></div>`. It now replaces the whole element, in `render()` and `renderToStream()` alike, as it already did for function components in `children`.
- e011f27: Make rendering 2–5× faster without changing its output.
  
  Render paths are linked lists formatted only when an error or warning needs them (copying an array per node and formatting a string per child made rendering quadratic in depth); HTML nesting is checked against the forbidden-children table before any path is formatted; `escapeHtml` does one pass and returns untouched strings without allocating; `isVoidElement` no longer allocates a Set per call; `performance.now()` is only called when monitoring is on; element props are no longer copied to strip `children`/`text`/`key`/`html`; already-flat children arrays aren't re-allocated.
  
  Measured with the new `pnpm perf:render` benchmark (Node 22, median of 3 rounds): a ~300-node page 0.52 → 0.22 ms, a 1,000×5 table 12.4 → 4.9 ms, a 90-level tree 0.34 → 0.06 ms. `formatAttributes(props, skip)` accepts an optional set of prop names to leave out.
- 14af368: Allow the same object to appear more than once in a component tree.
  
  - **Fixed:** cycle detection added every rendered object to a set and never removed it, so reusing an element, a props object or a children array — or rendering the same `memo()` result twice on a page — threw "Circular reference detected". Only the current ancestor path is tracked now; real cycles, including an array that contains itself, are still reported.
- 11c154f: Make `withStateUtils.shared()` usable.
  
  - **Fixed:** it threw `middleware is not iterable` as soon as it was called, because the state container it created received no middleware list.
  - Note that a shared container is process-wide by design: on a server it is shared by every request, so keep per-request data in props.
- b89b3c6: Stop `streamingUtils.streamToResponse()` hanging when the client disconnects.
  
  - **Fixed:** when the socket was full, it waited for `'drain'` only. A client that disconnected (closed tab, timeout, network drop) never drains, so the returned promise never settled and the suspended render kept the whole page tree in memory for good. It now also listens for `'close'` / `'error'`, closes the chunk generator and resolves with the bytes written so far.
- b3666cd: Make `renderToStream()` honour `minify` and `maxDepth` like `render()`.
  
  - **Fixed:** `renderToStream(tree, { minify: true })` ignored `minify`, so the stream differed from `render()`. Streamed output is now minified incrementally and matches `render(tree, { minify: true })` exactly, whatever the `chunkSize`.
  - **Fixed:** very deeply nested arrays overflowed the call stack (`RangeError`) instead of reporting `Maximum render depth exceeded`: the input check recursed through nested arrays without a bound (in `render()` too), and streaming did not check the depth of arrays and function results.
- 35376a7: `renderWithTemplate` no longer corrupts pages containing `$` sequences. It
  inserted the rendered HTML with `String.prototype.replace(placeholder, html)`,
  which expands replacement patterns, so user text such as `Pay $$10` lost a
  dollar sign and `` $` `` / `$'` spliced the template's own markup into the
  page. This affected every Express, Fastify, Koa and Next.js response rendered
  through a template.
- 16a6e7b: Revert an `error` → `_error` identifier rename that leaked into strings and object keys.
  
  - Error events are listened for again: `pool.on('error')` (pg), the API router's `req`/`socket` `'error'` handlers, the CLI dev server's child-process `'error'`, and devtools' `window` `'error'`. Before, an idle PostgreSQL client error or a WebSocket client reset was an uncaught exception.
  - `DatabaseManager` emits `'error'` only when a listener is attached; the failure still surfaces through the rejected `connect()` promise.
  - JSON error responses from `@coherent.js/api`, the framework adapters, and the scaffolded API/JSON-RPC code use `error` instead of `_error` (JSON-RPC requires `error`). **Behavior change:** clients that read `body._error` must read `body.error`.
  - Messages, CSS classes (`component-error`, `error-message`), log levels, event types and the generated `.gitignore` (`yarn-error.log*`) are spelled correctly again; the CLI's load-failure fallback no longer crashes on `console._error`.
  
  `withLoading`'s documented `_loading` / `_error` state keys are unchanged. An ESLint rule now rejects `_error` inside strings, template text and object keys in `packages/*/src` and `packages/*/bin`.

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

- Moved state management utilities to @coherent.js/state package
- Moved form utilities to @coherent.js/forms package
- Added comprehensive TypeScript type definitions

## 1.0.0-beta.1

### Features

- Initial beta release
- Core rendering engine, component system, and SSR utilities
- TypeScript type definitions included
- Full documentation and examples

### Notes

This is the first beta release of Coherent.js. The API is stable but may receive minor adjustments based on feedback before the 1.0.0 stable release.
