# @coherent.js/api

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

- 709bbe6: 5xx responses no longer echo internal error messages.
  
  A handler that threw `new Error('connect ECONNREFUSED 10.0.3.7:5432 (db-primary.internal)')` sent that string to the client. The router (addRoute and object routes) and `createErrorHandler()` now log the real error with `console.error` and answer 5xx with the generic status text (`{ "error": "Internal Server Error" }`, `"Service Unavailable"` for a 503...). 4xx `ApiError` messages and details are unchanged.
  
  New option `exposeErrors: true` (router options, `handle()` options, or `createErrorHandler({ exposeErrors })`) sends the real message; when it is unset, messages are exposed only with `NODE_ENV=development`. `createErrorHandler()` also implements the `includeStack`, `logger` and `transform` options its type already declared. `withErrorHandling()` keeps the original error as `cause` on the 500 `ApiError` it wraps it in.
  
  **Behavior change:** clients that parsed 5xx messages outside development only see the generic status text; set `exposeErrors: true` to restore the old output.
- 648f50c: The router's rate limiter can no longer be bypassed or used to exhaust memory.
  
  - Requests are counted per TCP peer address. The limiter used to key on the raw `X-Forwarded-For` header, so a client sending a different value on each request was never limited.
  - New `trustProxy` option (`createRouter(routes, { trustProxy: 1 })`, `new SimpleRouter({ trustProxy: 1 })`, or per `handle()` call): the number of reverse proxies that append to `X-Forwarded-For` (`true` means one). The client is then read that many hops from the right of the header, so spoofed leading entries are ignored. A one-time warning is logged when the header arrives without `trustProxy`.
  - Each router has its own store instead of one module-global `Map`, expired windows are swept, and the store is capped at 100,000 clients (it used to grow without bound: ~89 MB after 200k spoofed keys).
  - `rateLimit: false` turns the limiter off, `rateLimit.keyGenerator(req)` supplies your own key, and a 429 carries `Retry-After`.
  
  **Behavior change:** behind a reverse proxy without `trustProxy`, every client now shares the proxy's single budget (100 requests per minute by default). Set `trustProxy` to the number of proxies in front of the server, or turn the router limiter off with `rateLimit: false` if the proxy already limits.
- 27ff718: Require an explicit JWT secret.
  
  `generateJWT()`, `verifyToken()` and `withAuth()` used to fall back to the built-in secret `'your-secret-key'`. It is public, so anyone could sign a token (`{ role: 'admin' }` included) that a `withAuth()` without a configured secret accepted.
  
  **Behavior change:** there is no default secret any more.
  
  - `withAuth()` throws a `TypeError` when created without `secret` (or `verify`). Pass it explicitly: `withAuth({ secret: process.env.JWT_SECRET })`.
  - `generateJWT(payload, expiresIn, secret)` and `verifyToken(token, secret)` throw a `TypeError` when `secret` is missing or empty, instead of signing or verifying with the public default.
  
  New: `withAuth({ verify: (req) => user | null })` authenticates through a custom (optionally async) verifier instead of a JWT secret. The `AuthConfig` type now declares `secret` and drops `roles`, `permissions` and `strategy`, which were never implemented.
- e4e2091: Type definitions describe what the runtime does, and the runtime delivers what the types promised.
  
  Types corrected to match the runtime:
  
  - `generateToken(length?)` returns random hex (`2 * length` characters). It was typed as a JWT generator taking `(payload, { secret })`, which threw `ERR_INVALID_ARG_TYPE` when called that way. JWTs come from `generateJWT()`.
  - `hashPassword()` / `verifyPassword()` are synchronous and return `string` / `boolean`, not promises.
  - `withErrorHandling(handler)` wraps a handler; it was typed as taking options and returning a wrapper factory.
  - `ApiError` is `(message, statusCode?, details?)` with `details` and a `toJSON()` of `{ error, message, statusCode, details }`; `ValidationError` is `(errors, message?)`.
  - `withInputValidation()` takes a map of `{ required, type, minLength, maxLength, pattern }` field rules, `withSerialization()` takes `{ enableDate, enableMap, enableSet, custom }`, and `serializeForJSON()` takes no options.
  - The default export no longer declares `BadRequestError`, which does not exist.
  - `ObjectRouter` drops `mount()`, `routes`, `config` and `use(path, middleware)`, which do not exist, types `getRoutes()` as the route list it returns, and declares the methods that do exist (`options`, `head`, `group`, `generateUrl`, `addVersionedRoute`, `testRoute`, `findRoutes`, `getMetrics`, `clearCache`, the WebSocket methods).
  - `RouterConfig` declares the real router options (`enableVersioning`, `enableWebSockets`, `enableMetrics`, `trustProxy`, `exposeErrors`, `rateLimit`, `maxBodySize`...) and drops `errorHandler`, `notFoundHandler`, `caseSensitive`, `mergeParams` and `strict`, which were never implemented. `RouteDefinition` describes method entries (`handler`, `handlers`, `middleware`, `validation`, `errorHandling`, `path`, `name`) and drops the path-level `middleware`/`validation`/`auth`/`rateLimit`/`cache`/`serialization` keys and `OPTIONS`/`HEAD`, which were never read. Unused config interfaces are marked `@deprecated`. `ResponseHeaders` and the default export type now compile without `skipLibCheck`.
  
  Runtime additions so documented usage works:
  
  - Object routes accept a bare function per method (`GET: (req) => ({...})`), as the `RouteDefinition` type and the `addRoutes()` example show; such routes used to be skipped silently.
  - The `prefix` and `middleware` router options, declared but ignored, are applied: a config-level auth middleware used to protect nothing.
  - `generateJWT` and `verifyToken` are exported from the package root; `ValidationError` has an `errors` property.
- 4e6663c: Validation enforces what its types advertise, and invalid requests say why.
  
  - Object routes with `validation:` answer a valid body with the handler's response; they answered every valid body with a 500 ("next is not a function").
  - A failed validation answers 400 with `{ error: 'Validation failed', details: { errors: [{ field, message, rule }] } }`; the field errors used to be dropped. `router.addRoute()` routes now answer an `ApiError` thrown by middleware or a handler with its own status (400, 404, 409...) instead of a 500.
  - `validateAgainstSchema()` / `validateField()` / `withValidation()` implement `integer`, `enum`, `const`, `pattern` (string or RegExp), `items`, nested `properties` at any depth, `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`, `minLength`/`maxLength`, `min`/`max`, `minItems`/`maxItems`, `additionalProperties`, `minProperties`/`maxProperties`, `nullable`, type arrays, the `email`/`url`/`uuid`/`phone`/`credit-card`/`date` types and formats, `custom`, `message`, `trim`, `transform` and `default`. They were silently ignored.
  - The field-map shape documented by the `ValidationSchema` type (`{ email: { type: 'email', required: true } }`) is validated; it used to accept every input.
  - `required: [...]` checks own properties only, so `required: ['constructor']` no longer passes on `{}`.
  - Results carry `data` (and `validateField()` a `value`) with defaults, trimming, transforms and coercion applied; each error has a `rule`. Options: `abortEarly`, `stripUnknown`, `allowUnknown`, `coerceTypes`, `context`.
  
  **Behavior change:** input that used to pass because a keyword was ignored is now rejected with a 400. `withValidation()` replaces `req.body` with the validated data, so `default` values appear in it. `withQueryValidation()` / `withParamsValidation()` convert numeric and boolean strings for `number`/`integer`/`boolean` fields and write the converted values back to `req.query` / `req.params`.
  
  Types: `ValidationRule` gains the JSON-Schema keywords, `SchemaDefinition` (rule or field map) is what the validators accept, `validateField()` is declared as returning `{ valid, errors, value }` as it always has, and `ValidationErrorInfo` has `rule` instead of the never-populated `value`.
- 4b47f48: WebSocket routes check the handshake Origin and read frames correctly.
  
  - The handshake accepted any `Origin`, so any web page could open a socket carrying the visitor's cookies (cross-site WebSocket hijacking). New `wsAllowedOrigins` router option and per-route `allowedOrigins` (`addWebSocketRoute(path, handler, { allowedOrigins })`); `'*'` allows any origin. A rejected handshake gets `403 Forbidden`.
  - Each TCP chunk was parsed as exactly one frame: a frame split across chunks, a second frame in the same chunk, and a frame sent together with the handshake were silently dropped. Incoming bytes are now buffered and split into frames; fragmented text messages are reassembled, pings are answered with pongs, and a close frame is answered and closes the socket.
  - Frames or messages above `wsMaxPayload` (1 MiB by default) close the connection with status 1009 instead of being buffered without limit.
  - A client that disconnects without a close frame no longer leaves the server side of the socket half-open.
  - A malformed `Host` header no longer throws inside the `'upgrade'` listener.
  
  **Behavior change:** with neither `wsAllowedOrigins` nor `allowedOrigins` configured, only same-origin browser handshakes (Origin host equal to the Host header) are accepted; cross-origin browser clients need their origin listed. Handshakes without an `Origin` header (non-browser clients) are accepted as before.

### Patch Changes

- c4a258b: JWT signatures and password hashes are compared in constant time.
  
  `verifyToken()` compared the received signature with `!==` and `verifyPassword()` compared hashes with `===`; both stop at the first differing character, which leaks through response timing how much of a forged value is correct. Both now use `crypto.timingSafeEqual` (a length mismatch is rejected up front). The stored `"<salt>:<hash>"` format and its parameters (PBKDF2-SHA512, 10,000 iterations) are unchanged, so existing hashes keep verifying; the docs now say that this iteration count is below current OWASP guidance and that both functions are synchronous.
- d9ff884: Router-level `rateLimit`, `maxBodySize` and `exposeErrors` apply when `router.handle()` is called directly (from Express middleware, a custom server or tests), not only to requests served by `router.createServer()`. Per-call `handle()` options still take precedence, and a per-call `exposeErrors` now reaches object routes as well as `addRoute()` routes.
  
  **Behavior change:** an application that configured `rateLimit` or `maxBodySize` in `createRouter(routes, options)` and calls `handle()` itself now gets those limits instead of the defaults.
- 79f43da: `withAuth(verifyToken)` from `@coherent.js/api/middleware` answers 401 when the verifier returns `null`, `undefined` or `false`.
  
  It only rejected a token when the verifier threw. The package's own `verifyToken()` returns `null` for an invalid or forged token, so the two together called `next()` with `req.user = null` and let every request through. Async verifiers are now awaited, and their rejections are a 401 too.
  
  `withAuth`, `withPermission` and `withRateLimit` also answer on a plain `node:http` response (the Coherent router), not only on an Express one, and `createApiMiddleware` passes rejections of an async handler to `next(err)`.
  
  **Behavior change:** `withAuth()` from `@coherent.js/api/middleware` throws a `TypeError` when called without a verifier function, instead of answering 401 to every request.
- 95ee830: Route handlers no longer run after middleware rejected the request.
  
  `withAuth`, `withRole` and `withInputValidation` answer 401/403/400 by writing the response and returning nothing. The router only looked at return values, so the handler ran anyway: `DELETE /users/42` without a token answered 401 and still deleted the user. The chain now stops as soon as a response has been sent, for `router.addRoute()` routes, object routes (`createRouter({...})`) and `toExpressRouter()`.
  
  Middleware also receives a `next()` callback. Express-style middleware (declared as `(req, res, next)`) is awaited until it calls `next()` or responds, even after an `await`; `next(err)` fails the request. `withValidation()` used as middleware or through an object route's `validation:` no longer throws "next is not a function".
  
  **Behavior change:** middleware that returns an object or a string now sends it as the response and skips the handler, as object routes already did. A middleware declared with three parameters must call `next()` (or respond) for the request to continue.
- 0f523d2: Request bodies are decoded correctly and body parsing always settles.
  
  - The router decoded each incoming chunk separately, so a multibyte UTF-8 character split across two TCP chunks (`ë`, `日`...) arrived as replacement characters. Chunks are now collected as Buffers and decoded once.
  - A request stream that closes or aborts before the body ends settles `handle()` instead of leaving it pending forever, and no response is attempted for a client that is gone.
  - A `Content-Length` above `maxBodySize` is answered with 413 before the body is read, and a 413 closes the connection instead of reading the rest of the upload.
- f155e64: Router matching fixes.
  
  - Literal route text is escaped: `/files/report.pdf` no longer matches `/files/reportXpdf` (the escape step never escaped anything).
  - `/users/:id/*` gives `{ id: '42', splat: 'avatar' }`; the names were swapped.
  - Optional parameters work: `/opt/:id?` matches `/opt`.
  - Parameters are URL-decoded (`/users/John%20Doe` gives `'John Doe'`); a malformed escape is passed through as sent.
  - Each request gets its own `req.params`: a handler mutating it no longer changes it for later requests to the same path.
  - With `enableVersioning`, the route cache is keyed by API version, so a v2 request is no longer served by a cached v1 handler.
  - `router.options(path, handler)` routes run; other OPTIONS requests still get the automatic 204 preflight answer.
  - `HEAD` falls back to the matching `GET` route (without a body) instead of answering 404.
  - `enableCompilation: false` matches exactly the same paths as the compiled mode.
  
  **Behavior change:** parameter names are identifiers (`[A-Za-z_$][A-Za-z0-9_$]*`), so `/:from-:to` and `/:file.:ext` declare two parameters each; a name such as `:user-id` is now the parameter `user` followed by the literal `-id`.
- a6cc038: `withSanitization()` (from `@coherent.js/api/middleware`) no longer lets a `__proto__` key become the prototype and no longer double-encodes.
  
  - A body such as `{"__proto__":{"isAdmin":true}}` made `req.body.isAdmin === true`. `__proto__`, `constructor` and `prototype` keys are now dropped at every depth.
  - Escaping is idempotent: an `&` that already starts an entity (`&amp;`, `&lt;`, `&#39;`, `&copy;`...) is left alone, so running the middleware twice, or on data that was stored escaped, no longer produces `Tom &amp;amp; Jerry`. A bare `&` is still escaped.
  - Dates, Buffers and other non-plain objects are passed through instead of being turned into `{}`.
- 8cbb4b4: Validate field maps that contain a field named `items`, `default`, `const` or `additionalProperties`.
  
  - **Fixed:** such a schema (`{ customerId: {...}, total: {...}, items: { type: 'array', required: true } }`) was mistaken for a single rule because those names are also keywords, so none of its fields was checked and every request body passed validation. A keyword now only makes an object a rule when it has a scalar value (`type: 'string'`) or when no other key holds a schema.
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

- 709bbe6: 5xx responses no longer echo internal error messages.
  
  A handler that threw `new Error('connect ECONNREFUSED 10.0.3.7:5432 (db-primary.internal)')` sent that string to the client. The router (addRoute and object routes) and `createErrorHandler()` now log the real error with `console.error` and answer 5xx with the generic status text (`{ "error": "Internal Server Error" }`, `"Service Unavailable"` for a 503...). 4xx `ApiError` messages and details are unchanged.
  
  New option `exposeErrors: true` (router options, `handle()` options, or `createErrorHandler({ exposeErrors })`) sends the real message; when it is unset, messages are exposed only with `NODE_ENV=development`. `createErrorHandler()` also implements the `includeStack`, `logger` and `transform` options its type already declared. `withErrorHandling()` keeps the original error as `cause` on the 500 `ApiError` it wraps it in.
  
  **Behavior change:** clients that parsed 5xx messages outside development only see the generic status text; set `exposeErrors: true` to restore the old output.
- 648f50c: The router's rate limiter can no longer be bypassed or used to exhaust memory.
  
  - Requests are counted per TCP peer address. The limiter used to key on the raw `X-Forwarded-For` header, so a client sending a different value on each request was never limited.
  - New `trustProxy` option (`createRouter(routes, { trustProxy: 1 })`, `new SimpleRouter({ trustProxy: 1 })`, or per `handle()` call): the number of reverse proxies that append to `X-Forwarded-For` (`true` means one). The client is then read that many hops from the right of the header, so spoofed leading entries are ignored. A one-time warning is logged when the header arrives without `trustProxy`.
  - Each router has its own store instead of one module-global `Map`, expired windows are swept, and the store is capped at 100,000 clients (it used to grow without bound: ~89 MB after 200k spoofed keys).
  - `rateLimit: false` turns the limiter off, `rateLimit.keyGenerator(req)` supplies your own key, and a 429 carries `Retry-After`.
  
  **Behavior change:** behind a reverse proxy without `trustProxy`, every client now shares the proxy's single budget (100 requests per minute by default). Set `trustProxy` to the number of proxies in front of the server, or turn the router limiter off with `rateLimit: false` if the proxy already limits.
- 27ff718: Require an explicit JWT secret.
  
  `generateJWT()`, `verifyToken()` and `withAuth()` used to fall back to the built-in secret `'your-secret-key'`. It is public, so anyone could sign a token (`{ role: 'admin' }` included) that a `withAuth()` without a configured secret accepted.
  
  **Behavior change:** there is no default secret any more.
  
  - `withAuth()` throws a `TypeError` when created without `secret` (or `verify`). Pass it explicitly: `withAuth({ secret: process.env.JWT_SECRET })`.
  - `generateJWT(payload, expiresIn, secret)` and `verifyToken(token, secret)` throw a `TypeError` when `secret` is missing or empty, instead of signing or verifying with the public default.
  
  New: `withAuth({ verify: (req) => user | null })` authenticates through a custom (optionally async) verifier instead of a JWT secret. The `AuthConfig` type now declares `secret` and drops `roles`, `permissions` and `strategy`, which were never implemented.
- e4e2091: Type definitions describe what the runtime does, and the runtime delivers what the types promised.
  
  Types corrected to match the runtime:
  
  - `generateToken(length?)` returns random hex (`2 * length` characters). It was typed as a JWT generator taking `(payload, { secret })`, which threw `ERR_INVALID_ARG_TYPE` when called that way. JWTs come from `generateJWT()`.
  - `hashPassword()` / `verifyPassword()` are synchronous and return `string` / `boolean`, not promises.
  - `withErrorHandling(handler)` wraps a handler; it was typed as taking options and returning a wrapper factory.
  - `ApiError` is `(message, statusCode?, details?)` with `details` and a `toJSON()` of `{ error, message, statusCode, details }`; `ValidationError` is `(errors, message?)`.
  - `withInputValidation()` takes a map of `{ required, type, minLength, maxLength, pattern }` field rules, `withSerialization()` takes `{ enableDate, enableMap, enableSet, custom }`, and `serializeForJSON()` takes no options.
  - The default export no longer declares `BadRequestError`, which does not exist.
  - `ObjectRouter` drops `mount()`, `routes`, `config` and `use(path, middleware)`, which do not exist, types `getRoutes()` as the route list it returns, and declares the methods that do exist (`options`, `head`, `group`, `generateUrl`, `addVersionedRoute`, `testRoute`, `findRoutes`, `getMetrics`, `clearCache`, the WebSocket methods).
  - `RouterConfig` declares the real router options (`enableVersioning`, `enableWebSockets`, `enableMetrics`, `trustProxy`, `exposeErrors`, `rateLimit`, `maxBodySize`...) and drops `errorHandler`, `notFoundHandler`, `caseSensitive`, `mergeParams` and `strict`, which were never implemented. `RouteDefinition` describes method entries (`handler`, `handlers`, `middleware`, `validation`, `errorHandling`, `path`, `name`) and drops the path-level `middleware`/`validation`/`auth`/`rateLimit`/`cache`/`serialization` keys and `OPTIONS`/`HEAD`, which were never read. Unused config interfaces are marked `@deprecated`. `ResponseHeaders` and the default export type now compile without `skipLibCheck`.
  
  Runtime additions so documented usage works:
  
  - Object routes accept a bare function per method (`GET: (req) => ({...})`), as the `RouteDefinition` type and the `addRoutes()` example show; such routes used to be skipped silently.
  - The `prefix` and `middleware` router options, declared but ignored, are applied: a config-level auth middleware used to protect nothing.
  - `generateJWT` and `verifyToken` are exported from the package root; `ValidationError` has an `errors` property.
- 4e6663c: Validation enforces what its types advertise, and invalid requests say why.
  
  - Object routes with `validation:` answer a valid body with the handler's response; they answered every valid body with a 500 ("next is not a function").
  - A failed validation answers 400 with `{ error: 'Validation failed', details: { errors: [{ field, message, rule }] } }`; the field errors used to be dropped. `router.addRoute()` routes now answer an `ApiError` thrown by middleware or a handler with its own status (400, 404, 409...) instead of a 500.
  - `validateAgainstSchema()` / `validateField()` / `withValidation()` implement `integer`, `enum`, `const`, `pattern` (string or RegExp), `items`, nested `properties` at any depth, `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`, `minLength`/`maxLength`, `min`/`max`, `minItems`/`maxItems`, `additionalProperties`, `minProperties`/`maxProperties`, `nullable`, type arrays, the `email`/`url`/`uuid`/`phone`/`credit-card`/`date` types and formats, `custom`, `message`, `trim`, `transform` and `default`. They were silently ignored.
  - The field-map shape documented by the `ValidationSchema` type (`{ email: { type: 'email', required: true } }`) is validated; it used to accept every input.
  - `required: [...]` checks own properties only, so `required: ['constructor']` no longer passes on `{}`.
  - Results carry `data` (and `validateField()` a `value`) with defaults, trimming, transforms and coercion applied; each error has a `rule`. Options: `abortEarly`, `stripUnknown`, `allowUnknown`, `coerceTypes`, `context`.
  
  **Behavior change:** input that used to pass because a keyword was ignored is now rejected with a 400. `withValidation()` replaces `req.body` with the validated data, so `default` values appear in it. `withQueryValidation()` / `withParamsValidation()` convert numeric and boolean strings for `number`/`integer`/`boolean` fields and write the converted values back to `req.query` / `req.params`.
  
  Types: `ValidationRule` gains the JSON-Schema keywords, `SchemaDefinition` (rule or field map) is what the validators accept, `validateField()` is declared as returning `{ valid, errors, value }` as it always has, and `ValidationErrorInfo` has `rule` instead of the never-populated `value`.
- 4b47f48: WebSocket routes check the handshake Origin and read frames correctly.
  
  - The handshake accepted any `Origin`, so any web page could open a socket carrying the visitor's cookies (cross-site WebSocket hijacking). New `wsAllowedOrigins` router option and per-route `allowedOrigins` (`addWebSocketRoute(path, handler, { allowedOrigins })`); `'*'` allows any origin. A rejected handshake gets `403 Forbidden`.
  - Each TCP chunk was parsed as exactly one frame: a frame split across chunks, a second frame in the same chunk, and a frame sent together with the handshake were silently dropped. Incoming bytes are now buffered and split into frames; fragmented text messages are reassembled, pings are answered with pongs, and a close frame is answered and closes the socket.
  - Frames or messages above `wsMaxPayload` (1 MiB by default) close the connection with status 1009 instead of being buffered without limit.
  - A client that disconnects without a close frame no longer leaves the server side of the socket half-open.
  - A malformed `Host` header no longer throws inside the `'upgrade'` listener.
  
  **Behavior change:** with neither `wsAllowedOrigins` nor `allowedOrigins` configured, only same-origin browser handshakes (Origin host equal to the Host header) are accepted; cross-origin browser clients need their origin listed. Handshakes without an `Origin` header (non-browser clients) are accepted as before.

### Patch Changes

- c4a258b: JWT signatures and password hashes are compared in constant time.
  
  `verifyToken()` compared the received signature with `!==` and `verifyPassword()` compared hashes with `===`; both stop at the first differing character, which leaks through response timing how much of a forged value is correct. Both now use `crypto.timingSafeEqual` (a length mismatch is rejected up front). The stored `"<salt>:<hash>"` format and its parameters (PBKDF2-SHA512, 10,000 iterations) are unchanged, so existing hashes keep verifying; the docs now say that this iteration count is below current OWASP guidance and that both functions are synchronous.
- d9ff884: Router-level `rateLimit`, `maxBodySize` and `exposeErrors` apply when `router.handle()` is called directly (from Express middleware, a custom server or tests), not only to requests served by `router.createServer()`. Per-call `handle()` options still take precedence, and a per-call `exposeErrors` now reaches object routes as well as `addRoute()` routes.
  
  **Behavior change:** an application that configured `rateLimit` or `maxBodySize` in `createRouter(routes, options)` and calls `handle()` itself now gets those limits instead of the defaults.
- 79f43da: `withAuth(verifyToken)` from `@coherent.js/api/middleware` answers 401 when the verifier returns `null`, `undefined` or `false`.
  
  It only rejected a token when the verifier threw. The package's own `verifyToken()` returns `null` for an invalid or forged token, so the two together called `next()` with `req.user = null` and let every request through. Async verifiers are now awaited, and their rejections are a 401 too.
  
  `withAuth`, `withPermission` and `withRateLimit` also answer on a plain `node:http` response (the Coherent router), not only on an Express one, and `createApiMiddleware` passes rejections of an async handler to `next(err)`.
  
  **Behavior change:** `withAuth()` from `@coherent.js/api/middleware` throws a `TypeError` when called without a verifier function, instead of answering 401 to every request.
- 95ee830: Route handlers no longer run after middleware rejected the request.
  
  `withAuth`, `withRole` and `withInputValidation` answer 401/403/400 by writing the response and returning nothing. The router only looked at return values, so the handler ran anyway: `DELETE /users/42` without a token answered 401 and still deleted the user. The chain now stops as soon as a response has been sent, for `router.addRoute()` routes, object routes (`createRouter({...})`) and `toExpressRouter()`.
  
  Middleware also receives a `next()` callback. Express-style middleware (declared as `(req, res, next)`) is awaited until it calls `next()` or responds, even after an `await`; `next(err)` fails the request. `withValidation()` used as middleware or through an object route's `validation:` no longer throws "next is not a function".
  
  **Behavior change:** middleware that returns an object or a string now sends it as the response and skips the handler, as object routes already did. A middleware declared with three parameters must call `next()` (or respond) for the request to continue.
- 0f523d2: Request bodies are decoded correctly and body parsing always settles.
  
  - The router decoded each incoming chunk separately, so a multibyte UTF-8 character split across two TCP chunks (`ë`, `日`...) arrived as replacement characters. Chunks are now collected as Buffers and decoded once.
  - A request stream that closes or aborts before the body ends settles `handle()` instead of leaving it pending forever, and no response is attempted for a client that is gone.
  - A `Content-Length` above `maxBodySize` is answered with 413 before the body is read, and a 413 closes the connection instead of reading the rest of the upload.
- f155e64: Router matching fixes.
  
  - Literal route text is escaped: `/files/report.pdf` no longer matches `/files/reportXpdf` (the escape step never escaped anything).
  - `/users/:id/*` gives `{ id: '42', splat: 'avatar' }`; the names were swapped.
  - Optional parameters work: `/opt/:id?` matches `/opt`.
  - Parameters are URL-decoded (`/users/John%20Doe` gives `'John Doe'`); a malformed escape is passed through as sent.
  - Each request gets its own `req.params`: a handler mutating it no longer changes it for later requests to the same path.
  - With `enableVersioning`, the route cache is keyed by API version, so a v2 request is no longer served by a cached v1 handler.
  - `router.options(path, handler)` routes run; other OPTIONS requests still get the automatic 204 preflight answer.
  - `HEAD` falls back to the matching `GET` route (without a body) instead of answering 404.
  - `enableCompilation: false` matches exactly the same paths as the compiled mode.
  
  **Behavior change:** parameter names are identifiers (`[A-Za-z_$][A-Za-z0-9_$]*`), so `/:from-:to` and `/:file.:ext` declare two parameters each; a name such as `:user-id` is now the parameter `user` followed by the literal `-id`.
- a6cc038: `withSanitization()` (from `@coherent.js/api/middleware`) no longer lets a `__proto__` key become the prototype and no longer double-encodes.
  
  - A body such as `{"__proto__":{"isAdmin":true}}` made `req.body.isAdmin === true`. `__proto__`, `constructor` and `prototype` keys are now dropped at every depth.
  - Escaping is idempotent: an `&` that already starts an entity (`&amp;`, `&lt;`, `&#39;`, `&copy;`...) is left alone, so running the middleware twice, or on data that was stored escaped, no longer produces `Tom &amp;amp; Jerry`. A bare `&` is still escaped.
  - Dates, Buffers and other non-plain objects are passed through instead of being turned into `{}`.
- 8cbb4b4: Validate field maps that contain a field named `items`, `default`, `const` or `additionalProperties`.
  
  - **Fixed:** such a schema (`{ customerId: {...}, total: {...}, items: { type: 'array', required: true } }`) was mistaken for a single rule because those names are also keywords, so none of its fields was checked and every request body passed validation. A keyword now only makes an object a rule when it has a scalar value (`type: 'string'`) or when no other key holds a schema.
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
- API framework with validation, routing, and OpenAPI generation
- TypeScript type definitions included
- Full documentation and examples

### Notes

This is the first beta release of Coherent.js. The API is stable but may receive minor adjustments based on feedback before the 1.0.0 stable release.
