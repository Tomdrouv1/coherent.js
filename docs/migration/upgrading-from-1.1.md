# Upgrading from 1.1

The release after 1.1.2 fixes a large number of bugs, several of them security issues. Most fixes need no changes on your side, but some change observable behavior. This page lists every such change, grouped by package, with the fix. The changesets in `.changeset/` and each package's CHANGELOG have the details.

Most apps are affected by a handful of items only. Check these first:

1. **Framework adapters no longer render JSON as HTML**: render components with `res.coherent()`, `reply.coherent()` or `ctx.coherent()` ([integrations](#coherentjsintegrations)).
2. **A throwing component makes `render()` throw** instead of rendering nothing ([core](#coherentjscore)).
3. **Function event handlers render nothing on the server**; `hydrate()` attaches them ([core](#coherentjscore)).
4. **`@coherent.js/api` has no default JWT secret**, hides 5xx messages and rate-limits per connecting address ([api](#coherentjsapi)).
5. **The database query builder validates** identifiers, operators and limits, and refuses UPDATE/DELETE without `where` ([database](#coherentjsdatabase)).

## @coherent.js/core

| Change | What to do |
| --- | --- |
| A function component that throws makes `render()` throw a `RenderingError` (with `renderPath` and the original error as `cause`) instead of rendering nothing. | Let your framework answer 500, or pass `render(tree, { onError: (error, { path }) => replacement })` (`null` omits the component, as before). |
| A Promise or `async` component in the tree makes `render()` throw `Cannot render a Promise at <path>`; it used to render an empty string. | Await data and async components before calling `render()`. |
| The render cache is off by default (`enableCache` defaults to `false`), one entry is stored per whole render, and `cacheSize` is ignored. | Opt in with `render(tree, { enableCache: true, cache: createCacheManager({ maxCacheSize }) })`, or use `memo()` per component. |
| Function-valued `on*` props render no attribute (they rendered `data-action="__coherent_action_…" data-event="…"`). | Attach handlers in the browser with `hydrate()` from `@coherent.js/client`; string handlers (`onclick: 'fn()'`) are unchanged. |
| Every function component is called with no arguments; a function child that declared a parameter used to receive a render callback. | Call components with their props yourself (`Card({ title })`); don't rely on an argument passed by the renderer. |
| Booleans in `children` render nothing (they printed `true` / `false`); `text: null` renders empty. `text: false` still prints `false`. | Use `String(value)` where you want the word printed; `cond && { ... }` now works as intended. |
| `className` arrays and objects are joined (`['a', 'b']` printed `a,b`); `class` and `className` together are merged; `aria-*`, `spellcheck`, `draggable` and `contenteditable` render `"false"` instead of being dropped. | Update snapshots; remove workarounds such as `.filter(Boolean).join(' ')`. |
| Scoped CSS (`scoped` / `encapsulate`) ids are a hash of the component's CSS (`coh-<hash>`, the same on every render) instead of a global counter (`coh-0`, `coh-1`...); `@keyframes` / `@font-face` are no longer rewritten; `render(Fn, { scoped: true })` is scoped. | Update snapshots or selectors that used `coh-0`-style ids. |
| An attribute name containing whitespace, quotes, `<`, `>`, `/`, `=` or control characters makes `render()` throw. | Don't spread untrusted objects into props; check keys with `isValidAttributeName()`. |
| Objects shaped like `{ __html, __trusted: true }` are no longer trusted; only markers from `dangerouslySetInnerContent()` are. | Build trusted markup with `dangerouslySetInnerContent(html)`. |
| An object with several keys (`{ h1: …, p: … }`) renders every key as a sibling; `render()` used to drop all keys after the first. | Put one element per object if you relied on the extra keys being ignored. |
| `renderToStream()` (now exported, an async generator) propagates render errors out of the iteration instead of writing them into an HTML comment. | Catch around the iteration or `streamingUtils.streamToResponse()`; `onError` works as in `render()`. |

## @coherent.js/client

| Change | What to do |
| --- | --- |
| Mismatch detection is off unless `process.env.NODE_ENV === 'development'`, `detectMismatch: true`, `strict` or `onMismatch` is set (it defaulted to on for anything but `'production'`, including tests). | Pass `detectMismatch: true` where you want the check, e.g. in tests. |
| Delegated handlers bubble: a click inside nested elements that both have `onClick` runs both, innermost first. | Call `event.stopPropagation()` to keep the old nearest-only behavior. |
| `unmount()` is terminal (later `setState()` / `rerender()` do nothing); hydrating an already hydrated container unmounts the previous hydration; `value` / `checked` / `selected` props are controlled. | Hydrate again instead of reusing an unmounted instance; keep form field values in state. |
| Router: the last navigation wins (a superseded `push()` resolves `false`); `back()` goes back through history; saved scroll positions are restored on back/forward only. The router now writes browser history and follows links, but only after `start()`. | Call `router.start()`; check `push()`'s result; don't rely on bouncing `back()`. |
| `@coherent.js/client/hmr` exports the HMR API instead of throwing a 1.0 migration error; importing it does not connect. | Call `hmrClient.initialize()`. |
| Type declarations for APIs that never existed at runtime (`autoHydrate`, `registerComponent`, `createStateManager`, `EventManager`...) are removed, so code that referenced them no longer compiles. | Remove those references; use `hydrate()` and the router described in the [client README](../../packages/client/README.md). |

## @coherent.js/state

| Change | What to do |
| --- | --- |
| SSR context lives in `AsyncLocalStorage` on Node: `provideContext()` no longer writes into `globalStateManager`, and `clearAllContexts()` / `restoreContext()` only affect the current execution. | Wrap each request in `runWithContext(() => ...)` and read values with `useContext()`. |
| `createContextProvider()` children are rendered by core, so the same element object can no longer appear twice inside them. | Create a new object for each occurrence. |
| Reactive state: watchers run after the write completes; assigning an identical primitive no longer notifies; a key containing a dot is a path; reading a computed whose getter throws rethrows; `_computedDependents`, `_invalidate` and `Observable._currentComputed` are gone. | Use `batch()` to group writes; rename flat keys that contain dots. |
| Persistence: `encrypt: true` without `encryptionKey` throws a `TypeError`; data stored with `encrypt` by an earlier version that contains non-ASCII characters cannot be read back; browser backends store nothing on the server; storage errors go to `onError`. | Pass an `encryptionKey` (it is obfuscation, not encryption); pass an `adapter` to persist on the server; await `store.ready`. |
| Schema validation: arrays no longer satisfy `type: 'object'`, `NaN` fails `type: 'number'`, and ambiguous coercions (`"false"` → `true`, `""` → `0`...) are type errors. | Use `type: 'array'`; convert input before validating. |

## @coherent.js/api

| Change | What to do |
| --- | --- |
| There is no default JWT secret: `withAuth()` throws a `TypeError` without `secret` (or `verify`), and `generateJWT()` / `verifyToken()` throw without a secret. | Pass it explicitly: `withAuth({ secret: process.env.JWT_SECRET })`, `generateJWT(payload, '1h', secret)`. |
| 5xx responses carry the generic status text (`{ "error": "Internal Server Error" }`); the real error is logged. | Set `exposeErrors: true` (router, `handle()` or `createErrorHandler()`) if clients need the message; it is also exposed with `NODE_ENV=development`. |
| Rate limiting keys on the TCP peer address, not `X-Forwarded-For`; behind a proxy every client shares one budget. | Set `trustProxy` to the number of proxies (`createRouter(routes, { trustProxy: 1 })`), or `rateLimit: false` if the proxy limits. |
| Router-level `rateLimit` and `maxBodySize` apply to direct `router.handle()` calls. | Pass per-call options to `handle()` to override them. |
| The handler no longer runs after middleware responded; middleware that returns an object or string sends it and skips the handler; a middleware declared with three parameters must call `next()` (or respond). | Return nothing from middleware that should continue, and call `next()` in `(req, res, next)` middleware. |
| `withAuth()` from `@coherent.js/api/middleware` throws a `TypeError` without a verifier function (it answered 401 to everything), and answers 401 when the verifier returns `null`/`false`. | Pass `(token) => user \| null`, e.g. `(token) => verifyToken(token, process.env.JWT_SECRET)`. |
| Validation enforces the keywords it used to ignore (`enum`, `pattern`, `minimum`, `items`, nested `properties`, `format`...), so such input gets a 400; `withValidation()` replaces `req.body` with the validated data (defaults applied); query/params validation converts numeric and boolean strings. | Fix clients sending invalid data; read defaults from `req.body`; expect numbers in `req.query` / `req.params` for numeric fields. |
| Route parameter names are identifiers: `/:from-:to` declares two parameters, and `:user-id` is the parameter `user` followed by `-id`. | Rename parameters to identifiers (`:userId`). |
| WebSocket handshakes from another origin are refused unless allowed. | List browser origins in `wsAllowedOrigins` (router) or `allowedOrigins` (route); `'*'` allows any. |
| JSON error bodies use `error` instead of `_error` (all packages and scaffolds). | Read `body.error`. |

## @coherent.js/integrations

| Change | What to do |
| --- | --- |
| Express, Fastify and Koa no longer auto-render single-key objects: they are sent as JSON. | Render explicitly with `res.coherent(component)`, `return reply.coherent(component)` or `ctx.coherent(component)`, or pass `autoRender: true` to `setupCoherent()` / `fastify.register(setupCoherent, …)`. |
| Express: `setupCoherent()` only registers the view engine with `useEngine: true`, and only sets `view engine` when none is set. | Pass `useEngine: true` for `res.render()`, and `app.set('view engine', 'coherent')` if you relied on it being set. |
| Fastify: render errors in `reply.coherent()` go through Fastify's error pipeline instead of a built-in `500 { error, message }`; `setupCoherent` is a plugin (a direct call throws). | Produce any custom error body in `setErrorHandler`; `await fastify.register(setupCoherent, options)`. |
| Remix: `withCoherent()` renders the markup inside a wrapper element (a `<div>` by default) instead of an escaped string. | Choose the wrapper with `withCoherent(Component, { as: 'section' })` if the `<div>` affects layout. |

## @coherent.js/database

| Change | What to do |
| --- | --- |
| The object query builder throws before querying on: invalid identifiers, aliases, joins or `orderBy` directions; a `limit` / `offset` that is not a non-negative integer (numeric strings included); unknown operators (`$ne`, `$gt`...) or options (`groupBy`); `undefined` values; arrays used as values; select-only options on writes; a missing table. | Use `{ '!=': x }`-style operators and `{ in: [...] }`, convert limits with `Number.parseInt()`, and remove keys whose value is `undefined`. |
| UPDATE and DELETE without `where` throw. | Add a `where`, or pass `allowFullTable: true` on purpose. |
| `Model` (`@coherent.js/database/model`) no longer invents data: query methods throw without `Model.setDatabase(db)`; `find()` returns `null`; `where()` / `updateWhere()` / `deleteWhere()` accept equality conditions only and require a condition for writes; a missing related model throws. | Call `setDatabase(db)` at startup, handle `null`, and use `executeQuery()` for operators. |
| Migrations: a migration file that fails to import makes `run()` / `rollback()` / `status()` throw; running without a `transaction()`-capable database warns; `rollback(steps)` requires a positive integer. | Fix broken migration files; pass `{ transactional: false }` to silence the warning deliberately. |
| `isolationLevel` must be `READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ` or `SERIALIZABLE`; `withTransaction` throws (after rolling back) when `next()` returns no promise and the response cannot report its end. | Use one of the four levels; use `withTransaction` with Express or the `@coherent.js/api` router. |
| PostgreSQL: `?` placeholders inside strings, identifiers and comments are left alone, so the JSONB key-exists operator `?` cannot be told apart from a placeholder. | Write it as `??`, or use `jsonb_exists(column, key)`. |
| The internal `createBackup()` / `restoreBackup()` helpers throw "not implemented". | Use your database's backup tools. |

## @coherent.js/forms

| Change | What to do |
| --- | --- |
| One validator convention everywhere: a validator is `(value, formData) => string \| null` and each built-in is a factory. On `@coherent.js/forms/validators`, a built-in called with one string argument returns a validator (`validators.email('a@b.c')` no longer checks `'a@b.c'`). | Call `validators.email()('a@b.c')`, or pass an options object to check directly: `validators.email('a@b.c', {})`. |
| Default messages follow the root set everywhere (`'Invalid email address'`, `'Minimum length is 8'`...). | Update tests that compared messages from the subpath. |
| `validators.min()` / `max()` pass an empty value and fail a non-numeric one. | Add `validators.required()` where empty values must fail. |
| The `data-validators` attribute is JSON (`[{"name":"minLength","args":[8]}]`); `hydrateForm` still reads the old comma-separated form. | Update code or tests that parse the attribute. |

## @coherent.js/i18n

| Change | What to do |
| --- | --- |
| After `setLocale('fr-FR')` with only `fr` loaded, `getLocale()` returns `'fr'` (it returned the fallback) and translations come from `fr`. | Load the regional locale if you need its messages; on the server use `forLocale()` per request. |
| Interpolation is a single pass (a param containing `{{b}}` is not expanded again), params are inserted literally, and inherited keys such as `constructor` are missing keys. | Don't rely on nested expansion; define such keys explicitly if you need them. |
| `DateFormatter#relative()` expresses past dates of a week or more in weeks, months or years (`"last week"` instead of `"7 days ago"`). | Update expectations. |

## @coherent.js/seo

| Change | What to do |
| --- | --- |
| Sitemaps validate their input: a `changefreq` outside the protocol values or a `priority` outside 0.0–1.0 throws a `RangeError`, a non-http(s) absolute URL a `TypeError`; paths such as `http-status` are relative; `options.loc` no longer overrides the URL; `null` omits `lastmod` / `changefreq` / `priority`. | Pass valid values and `hostname`; use `null` to leave an element out. |
| JSON-LD escapes `<`, `>`, `&`, U+2028 and U+2029 as `\uXXXX`. | Only code comparing the raw string needs updating; it parses to the same data. |
| `$&`, `$'`, `` $` `` and `$$` in a title are inserted into `titleTemplate` literally. | Nothing, unless you relied on the expansion. |

## @coherent.js/cli

| Change | What to do |
| --- | --- |
| The built-in dev server (`coherent dev --coherent`) answers 403 for files outside the project/workspace, dotfiles, and `Host` headers other than localhost, IPs or the bound host; HMR messages carry root-relative paths. | Pass extra host names with `--allowed-hosts a,b`. |
| `coherent create --auth jwt\|session` writes a random secret to `.env`, the generated auth code throws without it, and the generated scripts load `.env` (`node --env-file-if-exists=.env`). | Set `JWT_SECRET` / `SESSION_SECRET` in every deployed environment. |
| Generated Fastify apps render with `reply.coherent()`, Koa apps pass `autoRender: true`, and auth code sends JSON through a `sendJson()` helper; the JavaScript `dev` script is `node --watch`. | Nothing for new projects; compare with a fresh scaffold when updating an old one. |
| The Rollup, Vite and webpack plugins and the webpack loader are documented as pass-throughs and print a one-time notice. | Pass `{ silent: true }` to hide it. |
| `debug performance`, `debug hydration` and `debug bundle` measure real requests and files; an analysis with status `error` exits with code 1. | Point `--url` at a running app. |
| `bin/coherent.js` prints load and command errors with exit code 1 (no re-run from `../src`); `coherent dev -H` sets the host (`-h` is help); `coherent generate` refuses to overwrite files without `--force`; `coherent create` validates options and project names (`[a-z0-9][a-z0-9._-]*`) before creating anything. | Use `-H` / `--host`, add `--force` to overwrite, and use lowercase project names. |

## @coherent.js/devtools

| Change | What to do |
| --- | --- |
| DevTools no longer monkey-patches `render` / `createComponent`, installs no `unhandledRejection` or `SIGINT` handler by default, keeps at most `maxEntries` warnings/errors, only opens a hot-reload socket to an explicit `hotReloadUrl`, and `?dev=true` only enables it on localhost. | Render through `devtools.render()`; opt in with `trackUnhandledRejections: true`; call `devtools.printDevSummary()` and `devtools.destroy()` yourself. |
| Profilers record nothing until enabled; timings use `performance.now()` (timestamps relative to the time origin); `measure()` rejects with the thrown `Error` (carrying `duration`). | `createProfiler({ enabled: true })` or `profiler.enable()`; catch errors from `measure()`. |

## @coherent.js/tooling

| Change | What to do |
| --- | --- |
| `extendExpect(expect)` no longer overrides `toMatchSnapshot` and `toHaveBeenCalled*`; `toHaveClass` matches whole class tokens and `toHaveAttribute` / `toHaveTagName` look at the root element. | Snapshot with `expect(result.toSnapshot()).toMatchSnapshot()`; update assertions that relied on substring matches. |
| `@coherent.js/tooling/lsp` exports `startServer(connection?)` and does nothing on import; the module-level `connection` and `documents` exports are gone. | Call `startServer()` (it returns them); the `coherent-language-server` binary is unchanged. |
