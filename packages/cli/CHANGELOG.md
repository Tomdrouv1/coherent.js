# @coherent.js/cli

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

- 6f99265: Lock down the built-in dev server (`coherent dev --coherent`).
  
  It served `/.env` and `/.git/config`, followed a symlink inside the project to
  any file on disk, answered any `Host` header (so a DNS-rebinding page could
  read it), accepted HMR WebSocket connections from any `Origin`, and broadcast
  absolute file paths to them.
  
  **Behavior change:**
  
  - Files are served only when their real path (after symlinks) is inside the
    project root, the workspace root that contains it (pnpm-workspace.yaml,
    lerna.json or `workspaces`), the real directory of the `node_modules/<pkg>`
    entry the URL goes through (so `npm link`/`link:` dependencies still load),
    or a directory passed in the new `fsAllow` option. Anything else is `403`.
  - Dotfiles and dot-directories (`.env`, `.git`, `.npmrc`, …) are `403`, whether
    named in the URL or reached through a symlink. pnpm's `node_modules/.pnpm`
    layout is unaffected.
  - Requests whose `Host` is not `localhost`/`*.localhost`, an IP address, the
    bound `host`, or an entry of the new `allowedHosts` option (also
    `--allowed-hosts a,b`) get `403`. WebSocket upgrades are additionally refused
    when a browser `Origin` belongs to another host.
  - `hmr-update` messages carry root-relative paths: `filePath` is now the same
    root-relative value as `webPath`. Error messages no longer include absolute
    paths, and malformed URLs get `400` instead of `500`.
- 8946be2: CLI robustness fixes.
  
  **Behavior change:**
  
  - `bin/coherent.js` no longer catches every error and re-runs the whole CLI
    from `../src` (not shipped, so users saw a misleading "Failed to load"
    message — and a command that failed ran twice in a checkout). Load errors
    and command errors are printed as they are, with exit code 1.
  - `coherent dev -h` shows help: the host short flag is now `-H` (`--host` is
    unchanged).
  - `coherent dev --open` no longer fails on the undeclared `open` package: it
    prints how to install it and keeps the dev server running. If the command
    does fail after spawning the dev server, the server is stopped instead of
    being orphaned.
  - `coherent create` runs the dev server it offers to start attached to the
    terminal (it was `detached` + `unref()`, so Ctrl+C left it running) and exits
    with its status.
  - `coherent generate` refuses to overwrite existing files (and writes nothing)
    unless `--force` is passed.
  - `coherent create` validates every option before creating anything: an unknown
    `--runtime`/`--database`/`--auth`/`--language` is rejected, and a failed
    scaffold removes the directory it created. `scaffoldProject()` also rejects
    unknown values up front.
  - Project names must be a single lowercase npm-style name
    (`[a-z0-9][a-z0-9._-]*`): path separators (`foo/../../x` wrote outside the
    working directory), scoped names, capitals and `@` are rejected.

### Patch Changes

- a0c3f76: `@coherent.js/cli/build-tools`: stop breaking builds and stop pretending.
  
  - The Rollup plugin's `resolveId` returned the raw relative id for any
    `*.coherent.js` import, so every build importing one failed with "Could not
    load ./components/Button.coherent.js". The plugin no longer claims module
    ids, and no longer returns `map: null` from `transform` (which dropped the
    source map chain).
  - **Behavior change:** the Rollup, Vite (`createVitePlugin`, `createSSRPlugin`)
    and webpack plugins and the webpack loader are documented as experimental
    pass-throughs — they did nothing before either — and print a one-time notice
    saying so. Pass `{ silent: true }` to hide it. The loader forwards the
    incoming source map.
  - `generateManifest()` records the installed `@coherent.js/cli` version instead
    of a hard-coded `'1.1.1'`.
- d1fb159: `coherent debug performance`, `debug hydration` and `debug bundle` no longer
  print canned data.
  
  They reported the same made-up results for every project — a "UserList …
  virtualization" bottleneck, a "UserProfile" hydration mismatch, a 245KB bundle —
  and `debug hydration --url http://127.0.0.1:1` reported success.
  
  **Behavior change:**
  
  - `debug performance` times real requests to `--url` (default
    `http://localhost:3000`): min/median/mean/p95/max, status codes and response
    size. Profiling a single component (`debug performance <component>`) and
    `--memory` are not implemented and now say so.
  - `debug hydration` fetches `--url` and counts the hydration markers in the
    server HTML (`data-coherent-component`, `data-hydrate`, `data-state`, …),
    optionally per `--components`. It does not claim to detect mismatches —
    those surface in the browser console. `--compare` is not implemented and
    says so.
  - `debug bundle` sums the actual files in the build directory.
  - Any analysis whose status is `error` (unreachable URL, non-2xx page,
    unimplemented option) exits with code 1.
- fae075b: Add `coherent dev --fs-allow <dirs>`.
  
  The built-in dev server accepts an `fsAllow` list of extra directories it may
  serve files from (`startDevServer({ fsAllow })` / `createStaticHandler({ fsAllow
  })`), but `coherent dev` offered no way to set it: `--fs-allow` was an unknown
  option, so a directory linked into the project from outside it and its
  workspace was always answered with `403`. `--fs-allow` takes comma-separated
  directories, absolute or relative to the project root, and can be repeated
  (`--fs-allow ../shared,../assets --fs-allow /opt/fonts`). Dotfiles stay refused.
- c8bd4e7: Stop `coherent dev` shutdown hanging on open connections.
  
  - **Fixed:** the dev server's `close()` (run on Ctrl-C) closed WebSocket clients with a closing handshake that waits up to 30 seconds for the browser, and then waited for every open HTTP connection, so a tab that did not answer, a keep-alive socket in use or a request still in flight kept the process alive. Clients are now terminated and connections closed at once.
- f8a36bc: `coherent generate api users` works: API names no longer have to be
  PascalCase.
  
  Every `generate` type was validated with the component rule, so the README's
  own `coherent generate api users` exited 1 with "Name should start with a
  capital letter (PascalCase)". API names (`api`, `route`, `r`) may now use any
  case (`users`, `user-profile`, `UserProfile`); components and pages keep the
  PascalCase rule.
- 0c1df6c: `coherent generate api` emits code that runs against `@coherent.js/api`.
  
  The generated module imported `createApiRouter` (the package exports
  `createRouter`), passed `withValidation(schema)` as a second positional
  argument to `.post()` (the shortcuts take `(path, handler, options)`), and
  answered with Express-style `res.status(201).json(...)` on the plain
  `node:http` response the router hands to handlers. A kebab-case name such as
  `user-profile` also produced `const user-profileSchema`, a syntax error, and
  the generated test file never parsed. Importing the module failed, so no route
  ever ran.
  
  **Behavior change:** the generated file is now an object-route definition
  passed to `createRouter()`:
  
  - REST (`--template rest`, `crud`, `graphql`): `GET/POST /<name>` and
    `GET/PUT/DELETE /<name>/:id` plus `GET /<name>/health`. Bodies are checked
    by the routes' `validation:` schemas (400 with the invalid fields), list
    query parameters are validated and coerced, a missing item throws
    `NotFoundError` (404), and creation answers 201 through `res.writeHead()`.
  - JSON-RPC (`--template rpc`): a single `POST /rpc/<name>` endpoint
    dispatching `<name>.list|get|create|update|delete` from the request's
    `method`, with `result`/`error` envelopes and the JSON-RPC 2.0 codes
    (-32600 invalid request, -32601 method not found, -32602 invalid params,
    -32603 internal error), batches and notifications. It used to expose one
    path per method.
  - The module exports the router (default) and its route object
    (`<name>Routes`), to serve it with `router.createServer()` or merge it into
    another router with `router.addRoutes()`. The generated test file serves the
    router on a free port and sends real requests.
- 3ec2472: Scaffolded auth no longer signs tokens with a public secret.
  
  Generated JWT and session auth read `process.env.JWT_SECRET || 'your-secret-key-change-this'`
  (and the session equivalent), the scaffold wrote a known placeholder into `.env`,
  and nothing ever loaded `.env` — so every generated app signed tokens and session
  cookies with a value published in this CLI's source.
  
  **Behavior change:** `coherent create --auth jwt|session` now writes a freshly
  generated random secret (`crypto.randomBytes(32)`, hex) into the git-ignored
  `.env`, and an empty `JWT_SECRET=` / `SESSION_SECRET=` placeholder into
  `.env.example` (appended, so the database settings are kept). The generated auth
  module has no fallback: the app throws at startup when the secret is missing.
  The generated `start` and `dev` scripts load `.env` with
  `node --env-file-if-exists=.env` (`tsx watch --env-file-if-exists=.env` for
  TypeScript), and the generated `package.json` declares `engines.node >=22.12.0`
  accordingly. Deployments that relied on the old default must set the secret in
  their environment.
- 1c630ef: Scaffolded apps no longer rely on implicit auto-rendering by the framework
  adapters.
  
  **Behavior change:** the generated Fastify home route renders explicitly with
  `reply.coherent(HomePage({}))`, and the generated Koa app passes
  `autoRender: true` to `setupCoherent()` (its `ctx.body = HomePage({})` route
  keeps working whether the adapter auto-renders by default or only on request).
  Express already rendered explicitly with `render()`.
- f7889ad: Scaffolded Koa and Express apps render pages explicitly.
  
  **Behavior change:**
  
  - The generated Koa app renders its home page with `ctx.coherent(HomePage({}))`
    and no longer passes `autoRender: true` to `setupCoherent()`. Auto-rendering
    turns every single-key object body (`{ error }`, `{ user }`, `{ ok: true }`)
    into HTML, so routes added to the app answered JSON as markup.
  - The generated Express app installs `setupCoherent(app, { template })` from
    `@coherent.js/integrations/express` (already a dependency of the scaffold)
    and renders with `res.coherent(HomePage({}))` instead of concatenating
    `render()` output into an inline HTML string.
  - The Fastify/Koa auth `sendJson()` helper hands the object to the framework
    instead of pre-serializing it, now that nothing renders object bodies.
- 11ed1dc: Make the `coherent create` combinations the CLI offers actually boot.
  
  - **Fastify + auth** crashed on start with `FST_ERR_HOOK_INVALID_HANDLER`: the
    generated `authPlugin` ran in an encapsulated context, so the auth routes
    could not see `fastify.authenticate`. The plugin now sets the
    `skip-override` flag (what `fastify-plugin` does, without adding the
    dependency).
  - **Koa + auth + api** answered every `/api/auth/*` with the object router's
    404, because the `/api` catch-all was mounted first. `/api/auth` and
    `/api/protected` are now left to the Koa router.
  - **Behavior change:** generated Fastify/Koa auth code sends JSON
    pre-serialized through a `sendJson()` helper. `setupCoherent()` renders any
    single-key object (`{ error }`, `{ user }`) as an HTML component, so
    `GET /api/auth/me` and every error reply used to come back as HTML.
  - The scaffold pinned `vitest: ^4.1.10`; it now uses the monorepo's major
    (`^5.0.0`).
  - **Behavior change:** the generated JavaScript `dev` script is
    `node --watch --env-file-if-exists=.env src/index.js`, so it reloads on
    change like the TypeScript one.
  - The generated client hydration loader called `hydrate(element, Component)`;
    `@coherent.js/client` expects `hydrate(component, container)`.
- 7fe129e: The scaffolded seo helper builds a sitemap of absolute URLs.
  
  `getSitemap()` in the generated `src/utils/seo.js` called `generateSitemap()`
  without a `hostname`, so every `<loc>` was a bare path (`/about`), which
  search engines reject. It now passes the site origin from `BASE_URL`
  (`https://example.com` is a placeholder fallback), exposed as `getBaseUrl()`
  and shared with `getPageMeta()`'s canonical and image URLs.
- 2ac52cb: Make the profiler measure accurately and stay bounded.
  
  **Behavior change:**
  
  - Profilers are disabled by default: `createProfiler()` / `new PerformanceProfiler()`
    record nothing until constructed with `{ enabled: true }` or `enable()` is
    called. `measure()` without a profiler and `profile()` without one use an
    enabled profiler of their own. (The `@coherent.js/cli` devtools scaffold now
    creates its profiler with `enabled: process.env.NODE_ENV !== 'production'`.)
  - Timings use `performance.now()` instead of `Date.now()`: sub-millisecond
    renders no longer all measure 0 or 1 ms. `startTime`/`endTime`/mark
    timestamps are therefore relative to the time origin, not epoch
    milliseconds. `memoryDelta` is the change in used heap bytes (it was `NaN`),
    or `null` where heap usage is unavailable.
  - `endRender()` honours `maxSamples` (it only applied to sessions), and a
    session's own measurement and mark lists are capped the same way.
  - The profiler clears the marks and measures it adds to the global
    `performance` timeline once measured, and `profiler.mark()` no longer adds
    global marks, so long-running processes stop accumulating timeline entries.
  - `profile(fn, profilerOrOptions?)` now records every call (sync or async,
    including throws) on `wrapped.profiler`; it used to return a wrapper that
    recorded nothing.
  - `measure()` rejects with the `Error` the function threw (non-`Error` values
    are wrapped, with the original as `cause`), carrying a `duration` property,
    instead of a plain `{ error, duration }` object.
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

- Added comprehensive TypeScript type definitions
- Updated internal dependencies to use workspace protocol

## 1.0.0-beta.1

### Features

- Initial beta release
- CLI tools for project scaffolding and development
- TypeScript type definitions included
- Full documentation and examples

### Notes

This is the first beta release of Coherent.js. The API is stable but may receive minor adjustments based on feedback before the 1.0.0 stable release.
