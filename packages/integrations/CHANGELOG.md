# @coherent.js/integrations

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

- 885471a: Fix the Express view engine, the typed default export and double responses.
  
  **Behavior change:** `setupCoherent()` no longer registers the Coherent.js view
  engine unless you pass `useEngine: true`, and even then it only becomes the
  app's `view engine` when none is set. The engine was registered — and took
  over `view engine` — by default, yet could never render: without a view file
  Express failed with "Failed to lookup view", and with one the component was
  rejected as "Invalid component structure" because Express merges `settings`,
  `_locals` and `cache` into the options it passes.
  
  The engine now works. Express's own keys are stripped, and a `.js`/`.mjs`/`.cjs`
  view module's default export is the component (a function receives the render
  locals). Any other view file is only a lookup marker and the locals are
  rendered as the component, as before.
  
  ```js
  // views/home.js
  export default ({ name }) => ({ h1: { text: `Hello ${name}` } });
  
  setupCoherent(app, { useEngine: true, engineName: 'js' });
  app.get('/', (req, res) => res.render('home', { name: 'Ada' }));
  ```
  
  **Migration:** apps that call `res.render()` with Coherent.js views must pass
  `useEngine: true` to `setupCoherent()`; apps that relied on `setupCoherent()`
  setting `view engine` should also `app.set('view engine', 'coherent')`.
  `expressEngine()` now returns this same engine.
  
  `@coherent.js/integrations/express` now has the default export its type
  declarations always promised; `import coherentExpress from ...` was a
  `SyntaxError` at runtime.
  
  `createCoherentHandler()` no longer sends a second response when the factory
  already answered (e.g. `res.redirect()`), which raised `ERR_HTTP_HEADERS_SENT`;
  a factory that responds itself may now return nothing.
- 3c34163: Route Fastify `reply.coherent()` render errors through Fastify, and type the
  plugin as a plugin.
  
  **Behavior change:** when rendering fails inside `reply.coherent()`, the error
  is now sent through Fastify's error pipeline — `onError` hooks, your
  `setErrorHandler`, the request logger — instead of the adapter answering
  `500 { error: 'Internal Server Error', message: <raw err.message> }` itself,
  which bypassed the app's handler and leaked internal messages. `reply.coherent()`
  also returns the reply now, so `return reply.coherent(page)` is the idiomatic
  form in async handlers.
  
  **Migration:** if a client parsed the old `{ error, message }` body, produce it
  from `setErrorHandler`; otherwise nothing to do.
  
  The `.d.ts` declared `setupCoherent(fastify, options)` as a directly callable
  function, but calling it threw `TypeError: done is not a function` — it is a
  Fastify plugin. `coherentFastify` and `setupCoherent` are now typed as
  `FastifyPluginCallback<CoherentFastifyOptions>`, so
  `await fastify.register(setupCoherent, options)` typechecks and a direct call
  does not; a direct call from JavaScript now throws an error that names the
  `register` form.
- a168d9a: Stop turning JSON responses into HTML in the Express, Fastify and Koa adapters.
  
  **Behavior change:** auto-rendering is now opt-in. The adapters used to treat
  *any* object with exactly one key as a Coherent.js component, so ordinary JSON
  was rendered as HTML: Express `res.send({ users })` answered `200 text/html`
  with `<users 0="[object Object]"></users>`, a Fastify handler returning
  `{ ok: true }` answered `<ok>true</ok>` even with a JSON response schema, and a
  `401 { error: 'Invalid credentials' }` became an HTML page. No tag-name check
  can fix that — `data`, `meta`, `title`, `label`, `summary` and `code` are both
  HTML tags and common JSON keys — so objects are now sent as JSON unless you
  render them explicitly:
  
  - Express: `res.coherent(component, { template? })`, added by
    `coherentMiddleware()` / `setupCoherent()`. Render errors go to the app's
    error middleware, as with `res.render()`.
  - Fastify: `reply.coherent(component, { template? })` (already existed).
  - Koa: `ctx.coherent(component, { template? })`, new, added by
    `coherentKoaMiddleware()` / `setupCoherent()`. Render errors are thrown into
    the middleware chain.
  - The handler factories (`createCoherentHandler`, `createHandler`) are
    unchanged.
  
  **Migration:** to keep the old automatic rendering, pass `autoRender: true` —
  `setupCoherent(app, { autoRender: true })` for Express and Koa,
  `fastify.register(setupCoherent, { autoRender: true })` for Fastify (the same
  option is accepted by `coherentMiddleware` and `coherentKoaMiddleware`). Or
  switch component routes to the explicit calls above, e.g.
  `res.send(HomePage())` → `res.coherent(HomePage())`, `return HomePage()` →
  `return reply.coherent(HomePage())`, `ctx.body = HomePage()` →
  `ctx.coherent(HomePage())`.
  
  Express `setupCoherent()` also now forwards `template` to the middleware; it
  was silently ignored before.
- 6a7fb32: Make Remix `withCoherent()` render markup instead of escaped text.
  
  **Behavior change:** the React component returned by `withCoherent()` returned
  the rendered HTML *string*, which React escapes, so pages showed
  `&lt;strong&gt;Bob&lt;/strong&gt;` as literal text. It now renders the
  Coherent.js output inside a wrapper element through `dangerouslySetInnerHTML`
  (the Coherent.js renderer already escapes text and attribute values). The
  wrapper is a `<div>` by default.
  
  **Migration:** none for most routes. If the extra `<div>` affects layout, pick
  the wrapper tag with `withCoherent(Component, { as: 'section' })` (or `'span'`
  for inline content). The `remix` subpath now imports `react`, which every
  Remix app already has.

### Patch Changes

- ef64df2: Fix `astro build` with the Astro integration. `createAstroIntegration()`
  registered `@coherent.js/integrations/astro` as the renderer's
  `serverEntrypoint`, but Astro imports the *default export* of that module as
  the SSR renderer and it had none, so every build failed with
  `[MISSING_EXPORT] "default" is not exported`. The renderer now lives at the new
  `@coherent.js/integrations/astro/server` subpath, whose default export is
  `createRenderer()`, and the integration points Astro there.
- 5a150b5: Declare the peer dependencies packages actually use.
  
  - `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
  - Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
- 905c8ca: Ship type declarations for the `koa`, `astro`, `astro/server`, `remix` and
  `sveltekit` subpaths. They had none, so importing them from TypeScript failed
  with TS7016 — including the `@coherent.js/integrations/koa` import in projects
  scaffolded with TypeScript + Koa. The Koa declarations also add `ctx.coherent()`
  to Koa's context type.
- 6bf0d21: Fix inputs that made parsing take seconds, a log format string built from the request, and a case-sensitive `<script>` match (found by CodeQL).
  
  - **Fixed (database):** a select column such as `'a'` followed by 50,000 spaces took about two seconds to validate (the `AS alias` pattern backtracked quadratically), so one request that passes column names through could hold the event loop. Parsing is now linear.
  - **Fixed (api):** the 5xx log line put the request URL inside `console.error`'s format string, so a `%s` or `%o` in the URL consumed the error argument. The URL is now an argument. The router's `prefix` is trimmed of trailing slashes in linear time.
  - **Fixed (client):** the router's `base` is trimmed of trailing slashes in linear time.
  - **Fixed (tooling):** `toHaveText` / `toContainText` strip tags in linear time (`'<'` repeated 50,000 times took about two seconds).
  - **Fixed (integrations):** the SvelteKit preprocessor now finds an instance script written `<SCRIPT>`; it used to add a second one.
- 7d0c21e: Next.js adapter fixes.
  
  - `createCoherentAppRouterHandler()` now passes the route handler's second
    argument through, so the factory receives `(request, { params })` — it was
    dropped, making dynamic segments unreachable. `params` is a Promise from
    Next.js 15 on; `await` it.
  - `createCoherentServerComponent()`, `createCoherentClientComponent()` and
    `createNextIntegration()` threw "requires React" whenever `react` was not
    resolvable from `@coherent.js/core`'s own directory — always the case under
    pnpm's isolated layout. They now import `react` (and `next`) from
    `@coherent.js/integrations`, which declares them as optional peers and so
    sees the app's copies, and accept an explicit `React` option
    (`createCoherentServerComponent(factory, { React })`).
- 16a6e7b: Revert an `error` → `_error` identifier rename that leaked into strings and object keys.
  
  - Error events are listened for again: `pool.on('error')` (pg), the API router's `req`/`socket` `'error'` handlers, the CLI dev server's child-process `'error'`, and devtools' `window` `'error'`. Before, an idle PostgreSQL client error or a WebSocket client reset was an uncaught exception.
  - `DatabaseManager` emits `'error'` only when a listener is attached; the failure still surfaces through the rejected `connect()` promise.
  - JSON error responses from `@coherent.js/api`, the framework adapters, and the scaffolded API/JSON-RPC code use `error` instead of `_error` (JSON-RPC requires `error`). **Behavior change:** clients that read `body._error` must read `body.error`.
  - Messages, CSS classes (`component-error`, `error-message`), log levels, event types and the generated `.gitignore` (`yarn-error.log*`) are spelled correctly again; the CLI's load-failure fallback no longer crashes on `console._error`.
  
  `withLoading`'s documented `_loading` / `_error` state keys are unchanged. An ESLint rule now rejects `_error` inside strings, template text and object keys in `packages/*/src` and `packages/*/bin`.
- a1feeab: Make the SvelteKit preprocessor's output compile and render. It rewrote
  `<coherent>{...}</coherent>` blocks to `{@html coherentRender(...)}` but never
  imported or defined `coherentRender`, so every component using it failed with
  `ReferenceError: coherentRender is not defined`. The preprocessor now imports
  `render` from `@coherent.js/core` into the component's instance script (adding
  one if needed, without shifting line numbers) and calls it under a private
  name. `$` sequences inside blocks are also no longer mangled.
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

## 1.0.0

### Patch Changes

- @coherent.js/core@1.0.0
