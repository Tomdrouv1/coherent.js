---
"@coherent.js/api": minor
---

Type definitions describe what the runtime does, and the runtime delivers what the types promised.

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
