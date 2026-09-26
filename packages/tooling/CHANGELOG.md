# @coherent.js/tooling

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

- 424bd0f: `@coherent.js/tooling/lsp` can be imported as a library.
  
  The module created a connection and started listening at import time, so
  importing it anywhere but a language-server process threw "Connection input
  stream is not set" — while the package declares `sideEffects: false`.
  
  **Behavior change:** `@coherent.js/tooling/lsp` now exports
  `startServer(connection?)`, which registers the handlers on the given
  connection (default: the transport named on the command line) and starts
  listening; importing the module does nothing else. The module-level
  `connection` and `documents` exports are gone — `startServer()` returns them.
  The `coherent-language-server` binary is now `dist/lsp/bin.js` and behaves as
  before (`--stdio`, `--node-ipc`, `--socket=<port>`).
- cf9940c: `extendExpect(expect)` no longer replaces Vitest/Jest built-in matchers, and the
  custom matchers work on `renderComponent()` output.
  
  **Behavior change:**
  
  - `toMatchSnapshot`, `toHaveBeenCalled`, `toHaveBeenCalledWith` and
    `toHaveBeenCalledTimes` are no longer registered. The overrides replaced the
    built-ins for the whole test run: `toMatchSnapshot` always passed and never
    wrote a snapshot (snapshot testing was silently off), and
    `toHaveBeenCalledWith` compared arguments with `===`. Snapshot with
    `expect(result.toSnapshot()).toMatchSnapshot()`. `createMock()` / `createSpy()`
    mocks now carry the `_isMockFunction` marker, so the built-in
    `toHaveBeenCalled*` matchers (with deep equality) accept them.
  - `toHaveText` / `toContainText` / `toBeVisible` / `toBeEmpty` read the text
    content of a `renderComponent()` result (they used to see `null`), with HTML
    entities decoded.
  - `toHaveClass` matches whole class tokens (`'btn'` no longer matches
    `btn-primary`) and reads the element's `class` attribute; `getByClassName`
    and `assertions.assertHasClass` match whole tokens too.
  - `toHaveAttribute` and `toHaveTagName` look at the element itself (the first
    element of the HTML) instead of any substring match anywhere in the markup:
    `toHaveAttribute('id')` no longer matches `data-id`, `toHaveTagName('b')` no
    longer matches `<br>`, and boolean attributes such as `disabled` are found.
  - `toBeValidHTML` checks tag nesting with a stack and accepts void elements
    (`<input>`, `<br>`, `<img>`, …), comments, doctypes and raw-text content.
  - `getByTestId`/`getByClassName` matches carry the element's whole opening tag
    in `html`, and query strings are escaped before being used in a RegExp.
  - The matcher type declarations now describe the matchers that exist
    (`toHaveTag`, `toBeDisabled`, `toHaveState`, … were declared but never
    implemented), and `renderComponent()` is typed as returning
    `TestRendererResult`.

### Patch Changes

- 6bf0d21: Fix inputs that made parsing take seconds, a log format string built from the request, and a case-sensitive `<script>` match (found by CodeQL).
  
  - **Fixed (database):** a select column such as `'a'` followed by 50,000 spaces took about two seconds to validate (the `AS alias` pattern backtracked quadratically), so one request that passes column names through could hold the event loop. Parsing is now linear.
  - **Fixed (api):** the 5xx log line put the request URL inside `console.error`'s format string, so a `%s` or `%o` in the URL consumed the error argument. The URL is now an argument. The router's `prefix` is trimmed of trailing slashes in linear time.
  - **Fixed (client):** the router's `base` is trimmed of trailing slashes in linear time.
  - **Fixed (tooling):** `toHaveText` / `toContainText` strip tags in linear time (`'<'` repeated 50,000 times took about two seconds).
  - **Fixed (integrations):** the SvelteKit preprocessor now finds an instance script written `<SCRIPT>`; it used to add a second one.
- 1314832: Make the VS Code extension start, and its language server load.
  
  - `activationEvents` was empty and the extension contributes no languages or
    commands, so VS Code never activated it. It now activates on JavaScript,
    TypeScript, JSX and TSX files.
  - `server/` was a plain copy of `@coherent.js/tooling`'s build, but the
    `.vsix` ships without `node_modules`, so the server died with
    `ERR_MODULE_NOT_FOUND 'vscode-languageserver'`. The build now bundles the
    server from tooling's source into one self-contained `server/server.js`
    (dependencies and the extracted element data inlined). It no longer depends
    on tooling being built first, which also removes the race where the element
    data JSON could be missing. `server/` is build output and no longer
    committed.
  - `coherent.trace.server` now takes effect (the client id did not match the
    setting's prefix).
  - `scripts/check-vsix.mjs` now also checks the activation events and spawns the
    packaged server alone with `--stdio`, requiring an answer to `initialize`.
  - tooling: the element data loader lives in its own module
    (`lsp/data/generated-data`) so bundlers can inline it, and
    `scripts/extract-attributes.ts` accepts `--out <file>`.
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
