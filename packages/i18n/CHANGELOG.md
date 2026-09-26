# @coherent.js/i18n

## 2.0.0

### Minor Changes

- bbcd3cc: Add an `escape` option that HTML-escapes interpolated params.
  
  A translation with user-supplied params rendered through core's `html:` was an
  XSS sink, and there was no way to escape just the params. `createTranslator({
  escape: true })` now escapes `&`, `<`, `>`, `"` and `'` in every interpolated
  value, and `t(key, params, { escape: true })` does it for one call (`{ escape:
  false }` opts a call back out). The translation template itself is never
  escaped, so markup in your own messages keeps working. The third argument of
  `t()` accepts `{ locale, escape }` as well as the locale string it took before.
  
  The default stays `false`, so existing output is unchanged. `text:` remains
  the safe sink: core escapes it already.
- e0b864a: Add `Translator#forLocale()` for request-scoped translation on the server.
  
  `currentLocale` lives on the translator instance, so concurrent SSR requests
  sharing one translator raced: a `setLocale()` in one request changed the
  language of another request's output. `i18n.forLocale(locale, { escape })`
  returns `{ locale, t, has, getLocale }` bound to that locale; it never reads or
  writes `currentLocale` and sees translations added to the shared instance
  later. The locale resolves like `setLocale()` (`fr-FR` → `fr`) and falls back
  to the fallback locale without a console warning. `setLocale()` is unchanged
  and remains the API for client-side use.

### Patch Changes

- 5a150b5: Declare the peer dependencies packages actually use.
  
  - `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
  - Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
- 3484aea: Interpolate translation params literally and ignore inherited keys.
  
  - A param containing `$'`, `$&`, `` $` `` or `$$` corrupted the output
    (`t('hi', { name: "$'" })` gave `"Hello !!"`), because each value was passed
    to `String#replace` as a replacement string. Values are now inserted as
    written.
  - A custom `interpolation.prefix` / `suffix` such as `%(` / `)s` was compiled as
    a raw regular expression and never matched (or threw). Delimiters and param
    names are now matched literally, and the `interpolation` option is merged
    with the defaults, so overriding only `prefix` keeps the `}}` suffix.
  - `t('constructor')` returned `"function Object() { [native code] }"` because
    lookups used `in`. Only own properties of the translation objects are
    resolved now, including through nested dot keys.
  
  **Behavior change:** interpolation is a single pass, so a param value that
  itself contains a placeholder (`{ a: '{{b}}', b: 'B' }`) is no longer expanded
  a second time; keys such as `constructor`, `toString` or `a.valueOf` now go
  through the missing-key path (returning the key, or calling
  `missingKeyHandler`) unless the translations define them.
- 42b9bf3: Resolve regional locales to their language and pluralize fallback text with
  the right rules.
  
  - `setLocale('fr-FR')` fell back to `en` even when `fr` was loaded. Locales
    now resolve to the closest loaded one, dropping trailing subtags
    (`zh-Hant-TW` → `zh-Hant` → `zh`), case-insensitively and with `_` accepted
    for `-`. `t()` with a locale override and `has()` resolve the same way, and a
    key missing from `fr-CA` is looked up in `fr` before the fallback locale.
  - When a message came from the fallback locale, its plural form was picked with
    the target locale's rules: in Russian, English fallback text for 21 items
    read `"21 item"`. The plural category now comes from the language the message
    is written in (keeping the regional rules, e.g. `pt-PT`, when the message is
    from the same language).
  - A locale tag that `Intl.PluralRules` rejects (such as `en_US`) no longer
    throws; the simple one/other rule is used.
  
  **Behavior change:** after `setLocale('fr-FR')` with only `fr` loaded,
  `getLocale()` returns `'fr'` (it returned the fallback, `'en'`, before) and
  translations come from `fr`.
- 7d69b77: Format future dates in `DateFormatter#relative()` with a sensible unit.
  
  Every unit check assumed a past date, so any future date fell through to
  seconds: tomorrow read `"in 86,400 seconds"`. `relative()` now picks the largest
  unit that fits in either direction — seconds, minutes, hours, days, weeks (from
  7 days), months (from 30 days) or years (from 365 days) — and rounds the
  difference to the second first, so the milliseconds since the caller built the
  date do not turn "tomorrow" into "in 23 hours".
  
  **Behavior change:** past dates of a week or more are now expressed in weeks,
  months or years (`"last week"`, `"3 weeks ago"`, `"last month"`) instead of
  days (`"7 days ago"`, `"21 days ago"`).

## 2.0.0-rc.0

### Minor Changes

- bbcd3cc: Add an `escape` option that HTML-escapes interpolated params.
  
  A translation with user-supplied params rendered through core's `html:` was an
  XSS sink, and there was no way to escape just the params. `createTranslator({
  escape: true })` now escapes `&`, `<`, `>`, `"` and `'` in every interpolated
  value, and `t(key, params, { escape: true })` does it for one call (`{ escape:
  false }` opts a call back out). The translation template itself is never
  escaped, so markup in your own messages keeps working. The third argument of
  `t()` accepts `{ locale, escape }` as well as the locale string it took before.
  
  The default stays `false`, so existing output is unchanged. `text:` remains
  the safe sink: core escapes it already.
- e0b864a: Add `Translator#forLocale()` for request-scoped translation on the server.
  
  `currentLocale` lives on the translator instance, so concurrent SSR requests
  sharing one translator raced: a `setLocale()` in one request changed the
  language of another request's output. `i18n.forLocale(locale, { escape })`
  returns `{ locale, t, has, getLocale }` bound to that locale; it never reads or
  writes `currentLocale` and sees translations added to the shared instance
  later. The locale resolves like `setLocale()` (`fr-FR` → `fr`) and falls back
  to the fallback locale without a console warning. `setLocale()` is unchanged
  and remains the API for client-side use.

### Patch Changes

- 5a150b5: Declare the peer dependencies packages actually use.
  
  - `@coherent.js/client`'s type declarations import `@coherent.js/core`; it is now a peer dependency.
  - Drop peers nothing imports: `@coherent.js/core` from database, i18n and state, `@coherent.js/state` from forms, and `@remix-run/server-runtime` from integrations (the Remix adapter only needs React).
- 3484aea: Interpolate translation params literally and ignore inherited keys.
  
  - A param containing `$'`, `$&`, `` $` `` or `$$` corrupted the output
    (`t('hi', { name: "$'" })` gave `"Hello !!"`), because each value was passed
    to `String#replace` as a replacement string. Values are now inserted as
    written.
  - A custom `interpolation.prefix` / `suffix` such as `%(` / `)s` was compiled as
    a raw regular expression and never matched (or threw). Delimiters and param
    names are now matched literally, and the `interpolation` option is merged
    with the defaults, so overriding only `prefix` keeps the `}}` suffix.
  - `t('constructor')` returned `"function Object() { [native code] }"` because
    lookups used `in`. Only own properties of the translation objects are
    resolved now, including through nested dot keys.
  
  **Behavior change:** interpolation is a single pass, so a param value that
  itself contains a placeholder (`{ a: '{{b}}', b: 'B' }`) is no longer expanded
  a second time; keys such as `constructor`, `toString` or `a.valueOf` now go
  through the missing-key path (returning the key, or calling
  `missingKeyHandler`) unless the translations define them.
- 42b9bf3: Resolve regional locales to their language and pluralize fallback text with
  the right rules.
  
  - `setLocale('fr-FR')` fell back to `en` even when `fr` was loaded. Locales
    now resolve to the closest loaded one, dropping trailing subtags
    (`zh-Hant-TW` → `zh-Hant` → `zh`), case-insensitively and with `_` accepted
    for `-`. `t()` with a locale override and `has()` resolve the same way, and a
    key missing from `fr-CA` is looked up in `fr` before the fallback locale.
  - When a message came from the fallback locale, its plural form was picked with
    the target locale's rules: in Russian, English fallback text for 21 items
    read `"21 item"`. The plural category now comes from the language the message
    is written in (keeping the regional rules, e.g. `pt-PT`, when the message is
    from the same language).
  - A locale tag that `Intl.PluralRules` rejects (such as `en_US`) no longer
    throws; the simple one/other rule is used.
  
  **Behavior change:** after `setLocale('fr-FR')` with only `fr` loaded,
  `getLocale()` returns `'fr'` (it returned the fallback, `'en'`, before) and
  translations come from `fr`.
- 7d69b77: Format future dates in `DateFormatter#relative()` with a sensible unit.
  
  Every unit check assumed a past date, so any future date fell through to
  seconds: tomorrow read `"in 86,400 seconds"`. `relative()` now picks the largest
  unit that fits in either direction — seconds, minutes, hours, days, weeks (from
  7 days), months (from 30 days) or years (from 365 days) — and rounds the
  difference to the second first, so the milliseconds since the caller built the
  date do not turn "tomorrow" into "in 23 hours".
  
  **Behavior change:** past dates of a week or more are now expressed in weeks,
  months or years (`"last week"`, `"3 weeks ago"`, `"last month"`) instead of
  days (`"7 days ago"`, `"21 days ago"`).

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
- Internationalization and localization support
- TypeScript type definitions included
- Full documentation and examples

### Notes

This is the first beta release of Coherent.js. The API is stable but may receive minor adjustments based on feedback before the 1.0.0 stable release.
