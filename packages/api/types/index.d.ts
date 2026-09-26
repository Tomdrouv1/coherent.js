/**
 * Coherent.js API Types
 * TypeScript definitions for the API framework
 *
 * @version 1.0.0-beta.1
 */

import { IncomingMessage, ServerResponse } from 'http';
import { CoherentNode, RenderOptions } from '@coherent.js/core';

// ============================================================================
// HTTP Types
// ============================================================================

/** HTTP methods */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/** HTTP status codes */
export type HttpStatusCode = number;

/** Request headers */
export interface RequestHeaders {
  [key: string]: string | string[] | undefined;
  'content-type'?: string;
  'authorization'?: string;
  'accept'?: string;
  'user-agent'?: string;
  'x-api-key'?: string;
}

/** Response headers */
export interface ResponseHeaders {
  [key: string]: string | number | string[] | undefined;
  'content-type'?: string;
  'cache-control'?: string;
  'access-control-allow-origin'?: string;
}

/** Query parameters */
export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

/** URL parameters */
export interface UrlParams {
  [key: string]: string | undefined;
}

/** Request body types */
export type RequestBody = any;

// ============================================================================
// API Request and Response
// ============================================================================

/** Enhanced API request object */
export interface ApiRequest extends IncomingMessage {
  method: HttpMethod;
  url: string;
  headers: RequestHeaders;
  query: QueryParams;
  params: UrlParams;
  body: RequestBody;
  originalUrl?: string;
  path?: string;
  protocol?: string;
  secure?: boolean;
  ip?: string;
  ips?: string[];
  hostname?: string;
  fresh?: boolean;
  stale?: boolean;
  xhr?: boolean;
  user?: any;
  session?: any;
  cookies?: Record<string, string>;
  signedCookies?: Record<string, string>;
}

/** Enhanced API response object */
export interface ApiResponse extends ServerResponse {
  json(obj: any): ApiResponse;
  send(body: any): ApiResponse;
  status(code: HttpStatusCode): ApiResponse;
  set(field: string, val: string | string[]): ApiResponse;
  set(field: ResponseHeaders): ApiResponse;
  get(field: string): string | undefined;
  header(field: string, val: string | string[]): ApiResponse;
  header(field: ResponseHeaders): ApiResponse;
  type(type: string): ApiResponse;
  format(obj: Record<string, Function>): ApiResponse;
  attachment(filename?: string): ApiResponse;
  sendFile(path: string, options?: any, fn?: Function): void;
  download(path: string, filename?: string, options?: any, fn?: Function): void;
  contentType(type: string): ApiResponse;
  sendStatus(code: HttpStatusCode): ApiResponse;
  links(links: Record<string, string>): ApiResponse;
  location(url: string): ApiResponse;
  redirect(status: number, url: string): void;
  redirect(url: string): void;
  vary(field: string): ApiResponse;
  render(view: string, locals?: any, callback?: Function): void;
  /** Render a CoherentNode component to HTML */
  renderCoherent(component: CoherentNode, options?: RenderOptions): void;
}

// ============================================================================
// Route Handler Types
// ============================================================================

/**
 * Route handler function.
 * Can return void, Promise<void>, JSON-serializable data, or a CoherentNode for rendering.
 */
export type RouteHandler = (
  req: ApiRequest,
  res: ApiResponse,
  next?: NextFunction
) => void | Promise<void> | CoherentNode | Promise<CoherentNode> | any;

/** Next function for middleware */
export interface NextFunction {
  (err?: any): void;
}

/** Middleware function */
export type Middleware = (
  req: ApiRequest,
  res: ApiResponse,
  next: NextFunction
) => void | Promise<void>;

/** Error handling middleware */
export type ErrorMiddleware = (
  err: any,
  req: ApiRequest,
  res: ApiResponse,
  next: NextFunction
) => void | Promise<void>;

// ============================================================================
// Object-Based Routing
// ============================================================================

/**
 * Configuration for one method of an object route. A bare handler function
 * is shorthand for `{ handler }`.
 */
export interface RouteMethodConfig {
  /** The handler; its returned object is sent as JSON (204 when it returns nothing). */
  handler?: RouteHandler;
  /** Several handlers run in order, like middleware; the first returned object is the response. */
  handlers?: RouteHandler[];
  /** Middleware run before validation and the handler. */
  middleware?: Middleware | Middleware[];
  /** Request body schema; an invalid body is answered with 400 and the field errors. */
  validation?: SchemaDefinition;
  /** Wrap each step with `withErrorHandling` (default `true`). */
  errorHandling?: boolean;
  /** Overrides the path derived from the object's nesting. */
  path?: string;
  /** Route name for `generateUrl()`. */
  name?: string;
}

/** A method entry of an object route: a handler, or a full configuration. */
export type RouteMethodDefinition = RouteHandler | RouteMethodConfig;

/** WebSocket route handler (`{ chat: { ws: handler } }`); requires `enableWebSockets`. */
export type WebSocketHandler = ((ws: any, request: IncomingMessage) => void) & { onClose?: (ws: any) => void };

/**
 * Route definition for object-based routing: the methods served at one path.
 * Method keys are case-insensitive (`GET` or `get`); HEAD is answered by the
 * GET route.
 */
export interface RouteDefinition {
  GET?: RouteMethodDefinition;
  POST?: RouteMethodDefinition;
  PUT?: RouteMethodDefinition;
  DELETE?: RouteMethodDefinition;
  PATCH?: RouteMethodDefinition;
  get?: RouteMethodDefinition;
  post?: RouteMethodDefinition;
  put?: RouteMethodDefinition;
  delete?: RouteMethodDefinition;
  patch?: RouteMethodDefinition;
  ws?: WebSocketHandler;
}

/**
 * Nested route object: keys that are not HTTP methods are path segments.
 *
 * @example
 * ```typescript
 * const routes: RouteObject = {
 *   api: {
 *     users: {
 *       GET: () => ({ users: [] }),
 *       POST: { validation: userSchema, handler: (req) => ({ created: req.body }) },
 *       ':id': { DELETE: { middleware: [withAuth({ secret })], handler: removeUser } }
 *     }
 *   }
 * };
 * ```
 */
export interface RouteObject {
  [path: string]: RouteDefinition | RouteObject | RouteMethodDefinition | undefined;
}

/** Router configuration (`createRouter(routes, config)` / `new SimpleRouter(config)`) */
export interface RouterConfig {
  /** Path prefix added to every route registered on this router. */
  prefix?: string;
  /** Middleware run before every route, as if passed to `router.use()`. */
  middleware?: Middleware | Middleware[];
  /**
   * Origin, or allowlist of origins, permitted to make cross-origin requests.
   *
   * `Access-Control-Allow-Credentials: true` is sent only when this is set;
   * omit it and the router serves the development default
   * (`http://localhost:3000`) without credentials. A request whose `Origin`
   * is not on the list receives no CORS headers.
   *
   * `'*'` is served as-is but never with credentials, since browsers reject
   * that combination. A malformed value warns and falls back to the
   * development default rather than throwing.
   */
  corsOrigin?: string | string[];
  /**
   * Number of reverse proxies in front of the server that append to
   * `X-Forwarded-For` (`true` means one). Rate limiting keys on the TCP peer
   * address unless this is set; the header is client-controlled otherwise.
   */
  trustProxy?: boolean | number;
  /**
   * Send the real message of 5xx errors to clients. Defaults to
   * `NODE_ENV === 'development'`; otherwise a 5xx carries the generic status
   * text and the error is logged with `console.error`.
   */
  exposeErrors?: boolean;
  /** Default per-request options for `createServer()` / `handle()`. */
  rateLimit?: RouterRateLimitOptions | false;
  /** Largest accepted request body in bytes (default 1 MiB). */
  maxBodySize?: number;
  /** Security headers (X-Frame-Options, CSP...) on every response (default `true`). */
  enableSecurityHeaders?: boolean;
  /** CORS headers when security headers are off (default `true`). */
  enableCORS?: boolean;
  /** Route API versions (`addVersionedRoute`) by header, `/vN` prefix or `?version=`. */
  enableVersioning?: boolean;
  /** Version of routes registered without one (default `'v1'`). */
  defaultVersion?: string;
  /** Request header carrying the API version (default `'api-version'`). */
  versionHeader?: string;
  /** Allow `addWebSocketRoute()` / `ws` routes. */
  enableWebSockets?: boolean;
  /** Collect `getMetrics()` data. */
  enableMetrics?: boolean;
  /** Also count static vs dynamic route matches in the metrics. */
  enableRouteMetrics?: boolean;
  /** Pre-compile route patterns (default `true`); matching is identical either way. */
  enableCompilation?: boolean;
  /** Look static paths up in a Map before trying patterns (default `true`). */
  enableSmartRouting?: boolean;
  /** Content type used when the Accept header is absent (default `'application/json'`). */
  defaultContentType?: string;
  /** Largest number of cached route matches (default 1000). */
  maxCacheSize?: number;
  /** Largest number of cached compiled patterns (default 1000). */
  maxCompilationCacheSize?: number;
}

/**
 * Router rate limiting: a fixed window per client, 100 requests per minute
 * by default. Pass `false` instead to turn it off.
 */
export interface RouterRateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  /** Derive the client key yourself instead of from the connection. */
  keyGenerator?: (req: IncomingMessage) => string;
}

/** Options accepted when registering a route */
export interface RouteRegistrationOptions {
  middleware?: Middleware[];
  name?: string;
  version?: string;
}

/** Per-request options for `handle()` and `createServer()`. */
export interface HandleOptions {
  /** Overrides the router's configured CORS origin allowlist. */
  corsOrigin?: string | string[];
  rateLimit?: RouterRateLimitOptions | false;
  /** Overrides the router's `trustProxy`. */
  trustProxy?: boolean | number;
  /** Overrides the router's `exposeErrors`. */
  exposeErrors?: boolean;
  maxBodySize?: number;
}

/** Middleware applied only when `condition` holds (`router.use({ condition, middleware })`). */
export interface ConditionalMiddleware {
  /** A predicate, or an object matched against method/path/header/query/body/user. */
  condition: ((req: ApiRequest, res: ApiResponse) => boolean | Promise<boolean>) | Record<string, any> | boolean;
  middleware: Middleware;
  name?: string;
}

/** A route as returned by `getRoutes()`. */
export interface RouteInfo {
  method: string;
  path: string;
  name: string | null;
  hasMiddleware: boolean;
  middlewareCount: number;
  compiled: boolean;
  compiledPattern: string | null;
  paramNames: string[] | null;
}

/** Object router interface (the value `createRouter()` returns) */
export interface ObjectRouter {
  addRoute(method: string, path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  addVersionedRoute(version: string, method: string, path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  addRoutes(routes: RouteObject): void;
  get(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  post(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  put(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  patch(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  delete(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  options(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  head(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  /** Add middleware for routes registered after this call. */
  use(middleware: Middleware | ConditionalMiddleware): void;
  /** Register the routes defined in `callback` under a prefix, with shared middleware. */
  group(prefix: string, middleware: Middleware | Middleware[], callback: (router: ObjectRouter) => void): ObjectRouter;
  /** Build the URL of a named route. */
  generateUrl(name: string, params?: Record<string, string | number>): string;
  /**
   * Adapt the router to an Express router. Pass the express module itself;
   * the returned value is whatever `express.Router()` produces, so it plugs
   * straight into `app.use(path, router.toExpressRouter(express))`.
   */
  toExpressRouter<RouterType>(express: { Router: () => RouterType }): RouterType;
  /** Create a bare node:http server that delegates every request to handle(). */
  createServer(options?: HandleOptions): import('http').Server;
  /**
   * Handle a raw Node request/response pair. The router parses query, params
   * and body itself, so a plain IncomingMessage is accepted.
   */
  handle(req: IncomingMessage, res: ServerResponse, options?: HandleOptions): Promise<void>;
  /** Registered routes. */
  getRoutes(): RouteInfo[];
  /** Registered routes filtered by method, path substring, name or middleware presence. */
  findRoutes(criteria?: { method?: string; path?: string; name?: string; hasMiddleware?: boolean }): Array<{
    method: string;
    path: string;
    name: string | null;
    middlewareCount: number;
  }>;
  /** Match a method and path without running anything. */
  testRoute(method: string, path: string): {
    matched: boolean;
    route: { method: string; path: string; name: string | null; middlewareCount: number } | null;
    params: UrlParams | null;
    compiledUsed?: boolean;
  };
  /** Metrics collected with `enableMetrics`; throws when metrics are off. */
  getMetrics(): Record<string, any>;
  /** Forget cached route matches. */
  clearCache(): void;
  /** Register a WebSocket route; requires `enableWebSockets`. */
  addWebSocketRoute(path: string, handler: WebSocketHandler, options?: { name?: string; version?: string }): void;
  /** Pass a node:http `'upgrade'` event to the router. */
  handleWebSocketUpgrade(request: IncomingMessage, socket: import('stream').Duplex, head: Buffer): void;
  /** Send `message` to every open WebSocket on `path` (`'*'` for all). */
  broadcast(path: string, message: any, excludeId?: string | null): void;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Primitive validation types.
 */
export type ValidationPrimitiveType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'null';

/**
 * Compound validation types.
 */
export type ValidationCompoundType = 'array' | 'object';

/**
 * String format validation types. Usable as `type` or as `format`.
 */
export type ValidationFormatType = 'email' | 'url' | 'uuid' | 'phone' | 'credit-card';

/**
 * All supported validation types.
 */
export type ValidationType = ValidationPrimitiveType | ValidationCompoundType | ValidationFormatType;

/**
 * Validation rule for one value.
 *
 * Accepts both the field-map keywords (`required: true`, `min`, `max`,
 * `trim`...) and the JSON-Schema ones (`required: [...]` on an object,
 * `properties`, `minimum`, `format`...). A rule can describe a whole object,
 * so a JSON-Schema document is a `ValidationRule` too.
 *
 * @example
 * ```typescript
 * const emailRule: ValidationRule = {
 *   type: 'email',
 *   required: true,
 *   message: 'Please provide a valid email address'
 * };
 *
 * const ageRule: ValidationRule<number> = {
 *   type: 'integer',
 *   min: 0,
 *   max: 150,
 *   custom: (value) => value >= 18 || 'Must be 18 or older'
 * };
 *
 * const userSchema: ValidationRule = {
 *   type: 'object',
 *   required: ['name'],
 *   properties: { name: { type: 'string', minLength: 1 } }
 * };
 * ```
 */
export interface ValidationRule<T = any> {
  /** The expected type of the value; an array accepts any of them */
  type?: ValidationType | ValidationType[];
  /**
   * `true`: this field must be present (not undefined, null or '').
   * An array (on an object rule): the listed keys must be present.
   */
  required?: boolean | string[];
  /** Minimum value (for numbers) or minimum length (for strings/arrays) */
  min?: number;
  /** Maximum value (for numbers) or maximum length (for strings/arrays) */
  max?: number;
  /** Minimum string length */
  minLength?: number;
  /** Maximum string length */
  maxLength?: number;
  /** Minimum number (inclusive) */
  minimum?: number;
  /** Maximum number (inclusive) */
  maximum?: number;
  /** Number must be greater than this */
  exclusiveMinimum?: number;
  /** Number must be less than this */
  exclusiveMaximum?: number;
  /** Minimum array length */
  minItems?: number;
  /** Maximum array length */
  maxItems?: number;
  /** Minimum number of keys (objects) */
  minProperties?: number;
  /** Maximum number of keys (objects) */
  maxProperties?: number;
  /** Regex pattern for string validation (a string is compiled without anchors) */
  pattern?: RegExp | string;
  /** String format; unknown formats are ignored */
  format?: ValidationFormatType | 'uri' | 'date' | 'date-time' | (string & {});
  /** Array of allowed values */
  enum?: T[];
  /** The only allowed value */
  const?: T;
  /**
   * Custom validation function.
   * Return true for valid, false or string message for invalid.
   * `context` is `ValidationOptions.context`.
   */
  custom?: (value: T, field: string, data: any, context?: any) => boolean | string;
  /** Custom error message, used for every failure of this rule */
  message?: string;
  /** Transform function applied before validation */
  transform?: (value: any) => T;
  /** Default value if field is missing */
  default?: T | (() => T);
  /** Validation for array items (when type is 'array') */
  items?: ValidationRule | ValidationSchema;
  /** Validation for object properties (when type is 'object') */
  properties?: ValidationSchema;
  /** `false` rejects keys not listed in `properties`; a rule validates them */
  additionalProperties?: boolean | ValidationRule;
  /** Allow null values */
  nullable?: boolean;
  /** Trim whitespace from strings before validation */
  trim?: boolean;
}

/**
 * Validation schema defining rules for multiple fields (a field map).
 * Can be nested for complex object structures: an entry that is not a rule
 * is a nested field map.
 *
 * @example
 * ```typescript
 * const userSchema: ValidationSchema = {
 *   email: { type: 'email', required: true },
 *   password: { type: 'string', minLength: 8, required: true },
 *   profile: {
 *     name: { type: 'string', required: true },
 *     age: { type: 'number', min: 0 }
 *   }
 * };
 * ```
 */
export interface ValidationSchema {
  [field: string]: ValidationRule | ValidationSchema;
}

/** Anything the validators accept: a JSON-Schema-style rule or a field map. */
export type SchemaDefinition = ValidationRule | ValidationSchema;

/**
 * Result of validation operation.
 * Generic type T represents the validated data shape.
 */
export interface ValidationResult<T = any> {
  /** Whether validation passed */
  valid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: ValidationErrorInfo[];
  /** Validated data, with defaults, trimming, transforms and coercion applied */
  data: T;
}

/** Result of validating a single value with `validateField()`. */
export interface FieldValidationResult<T = any> {
  /** Whether validation passed */
  valid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: ValidationErrorInfo[];
  /** The value after trimming, transforms and coercion */
  value: T;
}

/**
 * Information about a single validation error.
 */
export interface ValidationErrorInfo {
  /** Path to the field (e.g., 'user.email', 'tags[0]'); '' for the root */
  field: string;
  /** Human-readable error message */
  message: string;
  /** The keyword that failed (e.g., 'required', 'min', 'pattern') */
  rule: string;
}

/** Validation options */
export interface ValidationOptions {
  /** Stop validation on first error */
  abortEarly?: boolean;
  /** Remove fields not in schema (on objects that list `properties`) */
  stripUnknown?: boolean;
  /** `false` rejects fields not in schema, like `additionalProperties: false` everywhere */
  allowUnknown?: boolean;
  /**
   * Convert strings to numbers/booleans where the rule expects them.
   * On by default for `withQueryValidation` and `withParamsValidation`.
   */
  coerceTypes?: boolean;
  /** Additional context passed to custom validators */
  context?: any;
}

// ============================================================================
// Authentication and Authorization
// ============================================================================

/**
 * Authentication configuration for `withAuth()`.
 *
 * Either `secret` or `verify` is required: there is no default secret, and
 * `withAuth()` throws a `TypeError` when neither is given.
 */
export interface AuthConfig {
  /**
   * HS256 secret the `Authorization: Bearer <jwt>` tokens were signed with,
   * typically `process.env.JWT_SECRET`.
   */
  secret?: string | Buffer;
  /**
   * Custom verifier used instead of JWT verification. Return the user, or a
   * falsy value to reject the request. May be async.
   */
  verify?: (req: ApiRequest) => Promise<any> | any;
  /** Answer 401 when no valid user is found (default `true`). */
  required?: boolean;
}

/**
 * JWT options.
 * @deprecated No runtime API takes this object; pass the secret to
 * `generateJWT()` / `verifyToken()` / `withAuth({ secret })`.
 */
export interface JwtOptions {
  secret: string;
  algorithm?: string;
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
}

/** User authentication info */
export interface AuthUser {
  id: string | number;
  username?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Rate limit configuration.
 * @deprecated Not read by any runtime API. The router takes
 * `RouterRateLimitOptions`; `withRateLimit()` from `@coherent.js/api/middleware`
 * takes `{ windowMs, max, message, statusCode }`.
 */
export interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: ApiRequest) => string;
  handler?: RouteHandler;
  skip?: (req: ApiRequest) => boolean;
  message?: string | any;
}

// ============================================================================
// Caching
// ============================================================================

/**
 * Cache configuration.
 * @deprecated Not read by any runtime API.
 */
export interface CacheConfig {
  ttl?: number;
  key?: string | ((req: ApiRequest) => string);
  varies?: string[];
  condition?: (req: ApiRequest, res: ApiResponse) => boolean;
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialization configuration.
 * @deprecated Not read by any runtime API; `withSerialization()` takes
 * `SerializationMiddlewareOptions`.
 */
export interface SerializationConfig {
  include?: string[];
  exclude?: string[];
  transform?: Record<string, (value: any) => any>;
  dateFormat?: string;
  nullValues?: boolean;
  undefinedValues?: boolean;
}

/**
 * Serialization options.
 * @deprecated Not read by any runtime API.
 */
export interface SerializationOptions {
  space?: number;
  replacer?: (key: string, value: any) => any;
  dateHandler?: (date: Date) => any;
  errorHandler?: (error: Error) => any;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Base API error class.
 * Extends Error with an HTTP status code and details.
 */
export class ApiError extends Error {
  constructor(message: string, statusCode?: number, details?: Record<string, any>);
  /** HTTP status code (default: 500) */
  statusCode: number;
  /** Additional error details (default: `{}`) */
  details: Record<string, any>;
  /** Convert error to JSON-serializable object */
  toJSON(): { error: string; message: string; statusCode: number; details: Record<string, any> };
}

/**
 * Validation error class.
 * Thrown when request validation fails (HTTP 400).
 */
export class ValidationError extends ApiError {
  constructor(errors: ValidationErrorInfo[], message?: string);
  /** Array of field-level validation errors */
  errors: ValidationErrorInfo[];
  /** `{ errors }`, sent to the client in the 400 response */
  details: { errors: ValidationErrorInfo[] };
}

/**
 * Authentication error class.
 * Thrown when authentication fails (HTTP 401).
 */
export class AuthenticationError extends ApiError {
  constructor(message?: string);
}

/**
 * Authorization error class.
 * Thrown when user lacks required permissions (HTTP 403).
 */
export class AuthorizationError extends ApiError {
  constructor(message?: string);
}

/**
 * Not found error class.
 * Thrown when requested resource doesn't exist (HTTP 404).
 */
export class NotFoundError extends ApiError {
  constructor(message?: string);
}

/**
 * Conflict error class.
 * Thrown when operation conflicts with current state (HTTP 409).
 */
export class ConflictError extends ApiError {
  constructor(message?: string);
}

/** Error handler options */
export interface ErrorHandlerOptions {
  /**
   * Send the real message of 5xx errors to the client. Defaults to
   * `NODE_ENV === 'development'`; otherwise 5xx bodies carry the generic
   * status text and the error is only logged.
   */
  exposeErrors?: boolean;
  /** Add `stack` to exposed errors (default: `NODE_ENV === 'development'`). */
  includeStack?: boolean;
  /** Replaces `console.error` for logging. */
  logger?: (error: Error, req: ApiRequest) => void;
  /** Builds the JSON body instead of the default `{ error, message, statusCode }`. */
  transform?: (error: Error) => any;
}

// ============================================================================
// Middleware Types
// ============================================================================

/** CORS configuration */
export interface CorsConfig {
  origin?: string | string[] | boolean | ((req: ApiRequest) => boolean);
  methods?: HttpMethod[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

/** Body parser options */
export interface BodyParserOptions {
  limit?: string;
  extended?: boolean;
  inflate?: boolean;
  strict?: boolean;
  type?: string | string[] | ((req: ApiRequest) => boolean);
  verify?: (req: ApiRequest, res: ApiResponse, buf: Buffer, encoding: string) => void;
}

/** Security headers configuration */
export interface SecurityConfig {
  contentSecurityPolicy?: string | boolean;
  crossOriginEmbedderPolicy?: boolean;
  crossOriginOpenerPolicy?: boolean;
  crossOriginResourcePolicy?: string | boolean;
  dnsPrefetchControl?: boolean;
  expectCt?: boolean;
  frameguard?: boolean | string;
  hidePoweredBy?: boolean;
  hsts?: boolean | object;
  ieNoOpen?: boolean;
  noSniff?: boolean;
  originAgentCluster?: boolean;
  permittedCrossDomainPolicies?: boolean | string;
  referrerPolicy?: boolean | string;
  xssFilter?: boolean;
}

// ============================================================================
// OpenAPI/Swagger Types
// ============================================================================

/** OpenAPI specification */
export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  paths: OpenAPIPaths;
  components?: OpenAPIComponents;
  security?: OpenAPISecurityRequirement[];
  tags?: OpenAPITag[];
  servers?: OpenAPIServer[];
}

/** OpenAPI info object */
export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  contact?: OpenAPIContact;
  license?: OpenAPILicense;
}

/** OpenAPI contact object */
export interface OpenAPIContact {
  name?: string;
  url?: string;
  email?: string;
}

/** OpenAPI license object */
export interface OpenAPILicense {
  name: string;
  url?: string;
}

/** OpenAPI paths object */
export interface OpenAPIPaths {
  [path: string]: OpenAPIPathItem;
}

/** OpenAPI path item */
export interface OpenAPIPathItem {
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
}

/** OpenAPI operation */
export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: OpenAPIResponses;
  security?: OpenAPISecurityRequirement[];
  deprecated?: boolean;
}

/** OpenAPI parameter */
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: OpenAPISchema;
}

/** OpenAPI request body */
export interface OpenAPIRequestBody {
  description?: string;
  content: OpenAPIMediaType;
  required?: boolean;
}

/** OpenAPI responses */
export interface OpenAPIResponses {
  [statusCode: string]: OpenAPIResponse;
}

/** OpenAPI response */
export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIHeader>;
  content?: OpenAPIMediaType;
}

/** OpenAPI header */
export interface OpenAPIHeader {
  description?: string;
  schema?: OpenAPISchema;
}

/** OpenAPI media type */
export interface OpenAPIMediaType {
  [mediaType: string]: {
    schema?: OpenAPISchema;
    example?: any;
    examples?: Record<string, OpenAPIExample>;
  };
}

/** OpenAPI example */
export interface OpenAPIExample {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

/** OpenAPI schema */
export interface OpenAPISchema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  example?: any;
  enum?: any[];
  const?: any;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  required?: string[];
  properties?: Record<string, OpenAPISchema>;
  additionalProperties?: boolean | OpenAPISchema;
  items?: OpenAPISchema;
  allOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  not?: OpenAPISchema;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
}

/** OpenAPI components */
export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>;
  responses?: Record<string, OpenAPIResponse>;
  parameters?: Record<string, OpenAPIParameter>;
  requestBodies?: Record<string, OpenAPIRequestBody>;
  headers?: Record<string, OpenAPIHeader>;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

/** OpenAPI security scheme */
export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
}

/** OpenAPI security requirement */
export interface OpenAPISecurityRequirement {
  [name: string]: string[];
}

/** OpenAPI tag */
export interface OpenAPITag {
  name: string;
  description?: string;
}

/** OpenAPI server */
export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

/** OpenAPI server variable */
export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

// ============================================================================
// Main Functions
// ============================================================================

/** Create an object-based router. `routes` may be omitted (or null) and added later. */
export function createRouter(routes?: RouteObject | null, config?: RouterConfig): ObjectRouter;

/**
 * Wrap a handler or middleware so that anything it throws becomes an
 * `ApiError`: an `ApiError` is rethrown as is, anything else becomes a 500
 * `ApiError` whose `cause` is the original error.
 */
export function withErrorHandling<H extends (req: any, res: any, next?: any) => any>(
  handler: H
): (req: Parameters<H>[0], res: Parameters<H>[1], next?: NextFunction) => Promise<Awaited<ReturnType<H>>>;

/** Create error handler middleware (Express `(err, req, res, next)` signature) */
export function createErrorHandler(options?: ErrorHandlerOptions): ErrorMiddleware;

/**
 * Validate data against a schema.
 * @param schema - A JSON-Schema-style rule or a field map
 * @param data - The data to validate
 * @param options - Validation options
 * @returns Validation result with valid flag, errors, and transformed data
 */
export function validateAgainstSchema<T = any>(
  schema: SchemaDefinition,
  data: any,
  options?: ValidationOptions
): ValidationResult<T>;

/**
 * Validate a single value against a rule.
 * @param rule - The validation rule
 * @param value - The value to validate
 * @param field - The field name (for error messages)
 * @param data - The full data object, passed to `custom` validators
 * @returns Result with `valid`, the `errors` and the (transformed) `value`
 */
export function validateField<T = any>(
  rule: ValidationRule<T>,
  value: any,
  field?: string,
  data?: any
): FieldValidationResult<T>;

/**
 * Validation middleware for the request body. Throws a `ValidationError`
 * (400, `details.errors`) for an invalid body; otherwise replaces `req.body`
 * with the validated data and calls `next()`.
 */
export function withValidation<T = any>(schema: SchemaDefinition, options?: ValidationOptions): Middleware;

/** Query validation middleware; converts numeric/boolean strings (`coerceTypes`). */
export function withQueryValidation<T = any>(schema: SchemaDefinition, options?: ValidationOptions): Middleware;

/** Params validation middleware; converts numeric/boolean strings (`coerceTypes`). */
export function withParamsValidation(schema: SchemaDefinition, options?: ValidationOptions): Middleware;

/**
 * Authentication middleware. Throws a `TypeError` when created without
 * `secret` or `verify`.
 */
export function withAuth(config: AuthConfig): Middleware;

/** Role-based authorization middleware: 401 without `req.user`, 403 when `req.user.role` is not listed. */
export function withRole(roles: string | string[]): Middleware;

/** Rule for one body field checked by `withInputValidation()`. */
export interface InputValidationRule {
  /** Reject undefined, null and '' */
  required?: boolean;
  /** Expected `typeof` of the value */
  type?: 'string' | 'number' | 'boolean' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

/**
 * Lightweight body validation: answers 400 `{ error: 'Validation failed',
 * details: string[] }` when a field breaks its rule. For nested schemas use
 * `withValidation()`.
 */
export function withInputValidation(rules: Record<string, InputValidationRule>): Middleware;

/**
 * Hash a password with PBKDF2-SHA512 and a random salt. Synchronous; returns
 * `"<salt>:<hash>"` in hex.
 */
export function hashPassword(password: string): string;

/** Check a password against a `hashPassword()` result. Synchronous. */
export function verifyPassword(password: string, hash: string): boolean;

/**
 * Random token for non-JWT uses (API keys, reset links...): `length` random
 * bytes, hex-encoded, so the string is `2 * length` characters (default 32
 * bytes). For JWTs use `generateJWT()`.
 */
export function generateToken(length?: number): string;

/**
 * Sign an HS256 JWT. `expiresIn` is `'<n>h'`, `'<n>m'` or `'<n>d'` (default
 * `'1h'`). Throws a `TypeError` without a secret: there is no default.
 */
export function generateJWT(payload: Record<string, any>, expiresIn: string | undefined, secret: string | Buffer): string;

/**
 * Verify an HS256 JWT (optionally prefixed with `Bearer `). Returns the
 * payload, or `null` when the token is malformed, forged or expired. Throws
 * a `TypeError` without a secret.
 */
export function verifyToken(token: string | undefined, secret: string | Buffer): Record<string, any> | null;

/** Options for `withSerialization()` */
export interface SerializationMiddlewareOptions {
  /** Add `res.serialize.date` / `req.deserialize.date` (default `true`). */
  enableDate?: boolean;
  /** Add `res.serialize.map` / `req.deserialize.map` (default `true`). */
  enableMap?: boolean;
  /** Add `res.serialize.set` / `req.deserialize.set` (default `true`). */
  enableSet?: boolean;
  /** Replacements for the built-in helpers. */
  custom?: {
    serializeDate?: (date: Date) => any;
    deserializeDate?: (value: any) => Date;
    serializeMap?: (map: Map<any, any>) => any;
    deserializeMap?: (value: any) => Map<any, any>;
    serializeSet?: (set: Set<any>) => any;
    deserializeSet?: (value: any) => Set<any>;
  };
}

/** Serialization middleware: attaches `res.serialize` and `req.deserialize` helpers. */
export function withSerialization(options?: SerializationMiddlewareOptions): Middleware;

/** Convert Dates, Maps and Sets (recursively) into JSON-safe values. */
export function serializeForJSON(data: any): any;

/** Serialize date */
export function serializeDate(date: Date): string;

/** Deserialize date */
export function deserializeDate(dateString: string): Date;

/** Serialize Map */
export function serializeMap(map: Map<any, any>): Record<string, any>;

/** Deserialize Map */
export function deserializeMap(obj: Record<string, any>): Map<string, any>;

/** Serialize Set */
export function serializeSet<T>(set: Set<T>): T[];

/** Deserialize Set */
export function deserializeSet<T>(arr: T[]): Set<T>;

// ============================================================================
// Default Export
// ============================================================================

declare const coherentApi: {
  createRouter: typeof createRouter;
  ApiError: typeof ApiError;
  ValidationError: typeof ValidationError;
  AuthenticationError: typeof AuthenticationError;
  AuthorizationError: typeof AuthorizationError;
  NotFoundError: typeof NotFoundError;
  ConflictError: typeof ConflictError;
  withErrorHandling: typeof withErrorHandling;
  createErrorHandler: typeof createErrorHandler;
  validateAgainstSchema: typeof validateAgainstSchema;
  validateField: typeof validateField;
  withValidation: typeof withValidation;
  withQueryValidation: typeof withQueryValidation;
  withParamsValidation: typeof withParamsValidation;
  serializeDate: typeof serializeDate;
  deserializeDate: typeof deserializeDate;
  serializeMap: typeof serializeMap;
  deserializeMap: typeof deserializeMap;
  serializeSet: typeof serializeSet;
  deserializeSet: typeof deserializeSet;
  withSerialization: typeof withSerialization;
  serializeForJSON: typeof serializeForJSON;
  withAuth: typeof withAuth;
  withRole: typeof withRole;
  hashPassword: typeof hashPassword;
  verifyPassword: typeof verifyPassword;
  generateToken: typeof generateToken;
  generateJWT: typeof generateJWT;
  verifyToken: typeof verifyToken;
  withInputValidation: typeof withInputValidation;
};

export default coherentApi;
