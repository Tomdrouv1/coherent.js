---
"@coherent.js/cli": patch
---

`coherent generate api` emits code that runs against `@coherent.js/api`.

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
