# @coherent.js/seo

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

### Patch Changes

- d68b5cf: Make JSON-LD safe to embed in a `<script>` element.
  
  Core only rewrites `</script` inside script text, so a structured-data value
  containing `<!--<script>` put the HTML parser into the script-data-double-escaped
  state and the rest of the page was swallowed into the JSON-LD block.
  `StructuredDataBuilder#build()`, `generateStructuredData()` and `toJSON()` now
  write `<`, `>`, `&`, U+2028 and U+2029 as `<`, `>`, `&`,
  ` ` and ` `.
  
  **Behavior change:** the serialized JSON text differs wherever a value contains
  one of those characters (for example `"a & b"` becomes `"a & b"`). It
  still parses to exactly the same data, so JSON-LD consumers are unaffected;
  only code that compares the raw string needs updating.
- 144259a: Escape and validate every sitemap field.
  
  `lastmod`, `changefreq` and `priority` were written into the XML verbatim, so a
  value such as `</lastmod></url><url><loc>https://evil.example/</loc>` added a
  URL of the attacker's choosing to the sitemap. Every text node (and the `xmlns`
  attribute) is now XML-escaped, and `loc` is serialized with `new URL(...).href`,
  so spaces and non-ASCII characters are percent-encoded.
  
  **Behavior change:** `add()` / `addMultiple()` / `generateSitemap()` now throw a
  `RangeError` for a `changefreq` outside `always | hourly | daily | weekly |
  monthly | yearly | never` or a `priority` that is not a number from 0.0 to 1.0,
  and a `TypeError` for an absolute URL that is not `http:` or `https:` (for
  example `javascript:` or `ftp:`). A path that merely starts with `http` (such
  as `http-status`) is now treated as relative instead of absolute, and an
  `options.loc` no longer overrides the normalized URL. Pass `null` for
  `lastmod`, `changefreq` or `priority` to omit that element (a `null` priority
  used to print `<priority>null</priority>`).
- c1a7cb9: Insert titles into a title template literally.
  
  `title(title, { template })` and `generateMeta({ titleTemplate })` used
  `String#replace` with the title as the replacement string, so `$&`, `$'`,
  `` $` `` and `$$` in a title were expanded as replacement patterns
  (`"Win $&"` in `"Save %s now | Shop"` became `"Save Win %s now | Shop"`).
  
  **Behavior change:** those sequences now appear in the title exactly as
  written.
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

- Added comprehensive TypeScript type definitions
- Updated internal dependencies to use workspace protocol

## 1.0.0-beta.1

### Features

- Initial beta release
- SEO utilities (meta tags, sitemaps, structured data)
- TypeScript type definitions included
- Full documentation and examples

### Notes

This is the first beta release of Coherent.js. The API is stable but may receive minor adjustments based on feedback before the 1.0.0 stable release.
