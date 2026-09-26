# Changelog

All notable changes to Coherent.js are documented in this file. Each package's own `CHANGELOG.md` lists its changes in more detail.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0-rc.0] - 2026-09-26

Release candidate for 2.0.0, published under the `rc` tag: `npm install @coherent.js/core@rc`. The [upgrade guide](/docs/migration/upgrading-from-1.1.md) lists every breaking change and what to do about it.

### Breaking changes

- **core:** A function component that throws makes `render()` throw a `RenderingError`; pass `onError` to render a fallback instead.
- **core:** A Promise or async component in the tree makes `render()` throw.
- **core:** The render cache is off by default (`enableCache: true` to opt in).
- **core:** Function components are always called with no arguments.
- **core:** Function-valued `on*` props render no attribute; `hydrate()` attaches them in the browser.
- **core:** Booleans in `children` render nothing, `className` arrays and objects are joined, and `class` and `className` are merged.
- **core:** Attribute names containing whitespace, quotes, `<`, `>`, `/`, `=` or control characters make `render()` throw.
- **core:** Only markers created by `dangerouslySetInnerContent()` are trusted.
- **core:** An object with several keys renders every key as a sibling element.
- **core:** Scoped CSS ids are content hashes (`coh-<hash>`).
- **client:** Mismatch detection is off unless in development or explicitly enabled.
- **client:** Delegated event handlers bubble from the innermost element.
- **client:** The router writes browser history and follows links; the last navigation wins.
- **client:** Type declarations for APIs that do not exist at runtime are removed.
- **state:** On Node, `provideContext()` throws outside `runWithContext()`; context is isolated per request.
- **state:** Reactive watchers run after the write completes, and dotted keys are paths.
- **state:** Persistence with `encrypt: true` requires `encryptionKey`.
- **api:** JWT helpers require an explicit secret.
- **api:** 5xx responses no longer include the error message (`exposeErrors: true` to restore).
- **api:** Rate limiting uses the socket address unless `trustProxy` is set.
- **api:** Handlers no longer run after middleware has responded.
- **api:** Validation enforces all documented keywords, and `withValidation()` replaces `req.body` with the validated data.
- **api:** WebSocket handshakes from other origins are refused unless allowed.
- **api:** JSON error bodies use `error` instead of `_error`.
- **integrations:** Express, Fastify and Koa no longer render responses automatically; use `res.coherent()`, `reply.coherent()` or `ctx.coherent()`, or set `autoRender: true`.
- **integrations:** Express registers the view engine only with `useEngine: true`.
- **integrations:** Remix `withCoherent()` renders markup inside a wrapper element.
- **database:** The query builder rejects invalid identifiers, operators, directions and limits, and UPDATE or DELETE without `where`.
- **database:** `Model` query methods require `Model.setDatabase(db)`, and `find()` returns `null` when nothing matches.
- **database:** `Model.create()` applies `fillable` and `guarded`.
- **forms:** One validator convention across all entry points; `data-validators` is JSON.
- **i18n:** Regional locales resolve to their language, and interpolation is literal and single-pass.
- **seo:** Sitemap fields are validated.
- **cli:** The dev server only serves files inside the project and answers only local hosts.
- **cli:** Scaffolded auth reads its secret from `.env`.
- **devtools:** DevTools no longer patches `render` or installs process handlers by default.
- **tooling:** `extendExpect()` no longer overrides Vitest's built-in matchers.

### Added

- **core:** `renderToStream()` and `streamingUtils` exported, with backpressure and client-disconnect handling.
- **core:** `onError` render option.
- **api:** `trustProxy`, `exposeErrors` and `wsAllowedOrigins` options.
- **forms:** CSRF support.
- **forms:** String validators with arguments, such as `'minLength:8'`.
- **i18n:** `Translator#forLocale()` for request-scoped translation, and an `escape` option.
- **cli:** `coherent dev --fs-allow <dirs>`.
- **database:** Transactions for the MongoDB and memory adapters.

### Changed

- **core:** Rendering is 2–5× faster, with identical output.
- **database:** Database drivers are optional peer dependencies.
- Peer dependencies are declared for every package that uses them.

### Fixed

- **core:** Render cache keys no longer collide between different trees, and `memo()` keeps one cache per component.
- **core:** `htmlFor` renders as `for`; null and false style values are dropped; custom property names keep their case.
- **core:** `renderToStream()` honours `minify` and `maxDepth`.
- **core:** The same object can appear more than once in a tree.
- **core:** `lazy()` values render.
- **core:** Error boundaries are per request on the server and catch nested errors.
- **client:** Hydration binds handlers to the elements that rendered them, and `setState()` patches the DOM.
- **client:** Hydration and patching read component trees the same way the server renders them.
- **client:** HMR reloads the page for modules without an `accept` handler, and `disconnect()` no longer reconnects.
- **state:** Context values no longer leak between requests on a keep-alive connection.
- **state:** `withIndexedDB` honours `dbName` and `storeName`.
- **api:** Router matching, request body decoding and rate-limiter memory use.
- **api:** Field maps with a field named `items`, `default` or `const` are validated.
- **database:** Migrations run; transactions and retries release pooled connections.
- **database:** PostgreSQL placeholders are converted without touching strings or comments.
- **database:** `withModel` answers 404 under the `@coherent.js/api` router.
- **integrations:** Astro, SvelteKit, Next.js and Fastify adapter fixes.
- **cli:** `coherent generate api` produces code that runs, and every `coherent create` combination boots.
- **cli:** `coherent dev` shuts down promptly with open connections.
- **tooling:** The VS Code extension activates and its language server starts.

### Security

- **core:** Invalid attribute names are rejected, and trusted-content markers cannot be forged from JSON.
- **core:** Server-side event handlers are no longer kept in a global registry.
- **api:** JWT signatures and password hashes are compared in constant time.
- **api:** `withSanitization()` blocks `__proto__`.
- **database:** `Model.create()` no longer allows mass assignment of unlisted columns.
- **database:** The query builder rejects SQL injection through identifiers and clauses.
- **seo:** JSON-LD and sitemap output is escaped.
- **cli:** Scaffolded auth uses a random secret; the dev server refuses dotfiles, symlinks out of the project and foreign `Host` headers.
- Parsing of select columns, routes, trailing slashes and tags is linear on crafted input.

## [1.1.2] - 2026-08-30

Supersedes 1.1.1, which was only partially published.

### Changed

- **api:** `corsOrigin` accepts a string or an array of origins.

### Fixed

- **api:** Request bodies are no longer rewritten during parsing; arrays stay arrays and text is left unchanged. Only `__proto__`, `constructor` and `prototype` keys are removed.
- **core:** Void elements are built as self-closing tags.
- **client:** The HMR error overlay escapes the line, column and editor values it displays.

### Security

- **api:** CORS credentials are only sent to an origin listed in `corsOrigin`; `'*'` is served without credentials.
- **forms, state, api:** Email validation runs in linear time and rejects addresses with consecutive dots or whitespace.
- Eight more regular expressions made linear (api route compilation, core comment stripping, client HMR, devtools, tooling).
- **devtools:** Profiler session ids use `crypto.getRandomValues`.

## [1.1.1] - 2026-08-30

Partial release: only `@coherent.js/cli` and `@coherent.js/client` were published. Superseded by 1.1.2.

## [1.1.0] - 2026-08-04

### Changed

- **forms:** Forms submit and validate natively by default; `enhance: true` and `novalidate: true` opt in to scripted handling.
- Peer dependency ranges use `^` instead of exact versions.

### Added

- **forms:** `classNames` option and `DEFAULT_CLASS_NAMES` export.

### Fixed

- **forms:** `FormField.attributes` (such as `autocomplete`, `maxlength`, `data-*`) are applied to the rendered control.
- **forms:** The builder no longer emits an inline `onsubmit` handler.

## [1.0.1] - 2026-07-30

### Added

- CI check that type declarations match runtime exports.

### Fixed

- **forms:** `buildForm()` returns a renderable node; the `<form>` element keeps `action`, `method` and `name`.
- **forms:** `textarea` and `select` fields render as real elements.
- **forms:** `registerValidator()` registers validators.
- Type declarations of `seo`, `state`, `i18n`, `devtools` and `forms` match their runtime APIs.

### Security

- All open dependency advisories resolved.

## [1.0.0] - 2026-07-29

First stable release.

### Fixed

- Eleven defects found building a production site on 1.0.0-rc.6.
- **state:** `clearAllContexts()` clears contexts between renders.
- TypeScript project references use file paths.

## [1.0.0-rc.6] - 2026-07-20

### Changed

- **Breaking:** All packages are ESM-only. Node 22.12+ can still load them with `require()`.
- **Breaking:** `engines.node` is `>=22.12.0`.

### Fixed

- **cli:** Scaffolded auth hashes passwords (scrypt) and verifies them on login.
- **cli:** TypeScript scaffolds with auth or a database typecheck; auth-only scaffolds boot.
- **cli:** Auth scaffolding requires a SQL database, and session auth is offered for Express only.
- **cli:** MySQL and MongoDB scaffold models work against the database layer.
- **database:** The MongoDB adapter exposes `collection()`, and `DatabaseManager.close()` works for every adapter.

## [1.0.0-rc.5] - 2026-07-19

### Changed

- Dependencies updated: commander 15, ora 9, fastify-plugin 6, vscode-languageserver 10.

### Fixed

- **core:** `VERSION` reports the installed version.
- **tooling:** `typescript` is a runtime dependency of the language server.
- **cli:** `ws` and optional bundler peers use version ranges.

### Security

- Remaining low and moderate transitive advisories resolved.

## [1.0.0-rc.4] - 2026-07-19

### Added

- CI check that fails when a type declaration names a value missing at runtime.
- End-to-end CI test that scaffolds, builds and boots generated projects.

### Fixed

- **core:** Void elements render without closing tags.
- Type declarations for 69 values that did not exist at runtime removed (api, cli, core, database, devtools, forms, state, tooling).
- **tooling:** Each testing subpath ships its own declarations.
- **api:** `ObjectRouter` types match the implementation.
- **cli:** Express TypeScript scaffolds typecheck.

### Security

- High-severity transitive advisories resolved (undici, astro, form-data, ws).

## [1.0.0-rc.3] - 2026-07-19

### Added

- Documentation for testing, i18n and SEO.

### Fixed

- Package `exports` maps point at published files for every package.
- **devtools:** The package can be imported when installed.
- **cli:** Scaffolded projects' `test` and `typecheck` scripts work, and generated code only uses existing APIs.
- **api:** `ObjectRouter.handle()` types match the implementation.
- Documentation and examples use the current APIs.

## [1.0.0-rc.2] - 2026-05-25

### Changed

- **Breaking:** `engines.node` is `>=22.0.0`.

### Added

- **integrations:** `fastify-plugin` dependency.

### Fixed

- **integrations:** The Fastify plugin applies to the root instance and sends rendered HTML; `setupCoherent` works as a plugin.
- **integrations:** Koa `setupCoherent` forwards the `template` option.
- **database:** The `sqlite3` peer accepts any version from 5.0.0.
- **cli:** SQLite, Fastify and full-stack scaffolds boot; auth routes are mounted and no longer protect every page; generated apps render a full HTML document.
- **cli:** New scaffolds depend on the current CLI version.

## [1.0.0-rc.1] - 2026-05-17

### Added

- **cli:** Built-in dev server with HMR (`coherent dev --coherent`), with `--no-hmr`.
- **integrations:** New package containing the Express, Fastify, Koa, Next.js, Astro, Remix and SvelteKit adapters as subpath exports.
- **tooling:** New package containing the testing utilities (`@coherent.js/tooling/testing`) and the language server.
- **cli:** Build tool plugins as `@coherent.js/cli/build-tools/*`.
- **devtools:** Performance utilities as `@coherent.js/devtools/performance/*`.

### Changed

- **forms:** `createFormBuilder({ fields })` registers the given fields.

### Removed

- **Breaking:** Packages merged into others: `@coherent.js/express`, `fastify`, `koa`, `nextjs` and `adapters` (use `@coherent.js/integrations/*`); `testing` and `language-server` (use `@coherent.js/tooling`); `build-tools` (use `@coherent.js/cli/build-tools`); `performance` (use `@coherent.js/devtools/performance`).
- **Breaking:** Packages removed: `@coherent.js/runtime`, `web-components`, `profiler` and `language-service`.
- **Breaking (client):** Legacy hydration APIs removed (`legacyHydrate`, `hydrateAll`, `hydrateBySelector`, `enableClientEvents`, `makeHydratable`, `autoHydrate`, `registerEventHandler`) along with the `./hydration` subpath; use `hydrate()`.
- **Breaking (forms):** `createForm`, `formValidators`, `enhancedForm` and the `./forms` and `./advanced-validation` subpaths removed; use `createFormBuilder` and `hydrateForm`.

## [1.0.0-beta.8] - 2026-04-06

### Added

- Documentation website rebuilt with Coherent.js, including search, dynamic docs and island hydration.

### Fixed

- **core:** CommonJS builds no longer warn about `import.meta.url`.
- **client:** `WebSocket.OPEN` is guarded for Node.js.

## [1.0.0-beta.7] - 2026-04-04

### Added

- **core:** `Island()` and `selectiveHydrate()` for selective hydration.
- **core:** `hoc`, `compose` and `fp` helpers.
- **core:** `key` props for reconciliation, and HTML nesting validation.
- **client:** HMR with state preservation and an error overlay.
- **client:** Hydration with event delegation, state serialization and mismatch detection.
- VS Code extension with a language server.
- Stricter HTML element types.

### Changed

- **core:** `renderToStream` supports the same components as `render`.
- **core:** Faster cache key generation.

## [1.0.0-beta.6] - 2025-12-15

### Added

- **cli:** Docker scaffolding.

## [1.0.0-beta.5] - 2025-12-05

### Added

- **api:** LRU cache for compiled routes, and security header presets.

### Fixed

- **api:** Validation function return type.

## [1.0.0-beta.4] - 2025-11-25

### Security

- Moderate and high-severity dependency advisories resolved.

## [1.0.0-beta.3] - 2025-11-17

### Fixed

- **api:** Route compilation no longer produces double slashes or broken patterns.
- Documentation reorganized; READMEs added for every package.

## [1.0.0-beta.2] - 2025-11-10

### Added

- **state:** New package for reactive state, persistence, validation and the context API.
- **core:** Lifecycle hooks, the `h` / `createElement` factory and component caching are exported.
- **client:** Router with prefetching, transitions and scroll restoration.

### Changed

- Forms validation consolidated into `@coherent.js/forms` and developer tools into `@coherent.js/devtools`.

## [1.0.0-beta.1] - 2025-11-03

First beta. All packages were reset to 1.0.0-beta.1 and earlier versions were removed from npm.

### Added

- Object-based components with server-side rendering, streaming and client-side hydration.
- Framework adapters for Express, Fastify, Koa and Next.js.
- Packages for the API layer, database adapters, forms, i18n, SEO, testing and developer tools.
