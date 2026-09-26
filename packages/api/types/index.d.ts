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
  [key: string]: string | number | string[];
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

/** Route definition for object-based routing */
export interface RouteDefinition {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  DELETE?: RouteHandler;
  PATCH?: RouteHandler;
  OPTIONS?: RouteHandler;
  HEAD?: RouteHandler;
  middleware?: Middleware | Middleware[];
  validation?: SchemaDefinition;
  serialization?: SerializationConfig;
  auth?: AuthConfig;
  rateLimit?: RateLimitConfig;
  cache?: CacheConfig;
}

/** Nested route object */
export interface RouteObject {
  [path: string]: RouteDefinition | RouteObject;
}

/** Router configuration */
export interface RouterConfig {
  prefix?: string;
  middleware?: Middleware[];
  errorHandler?: ErrorMiddleware;
  notFoundHandler?: RouteHandler;
  caseSensitive?: boolean;
  mergeParams?: boolean;
  strict?: boolean;
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
}

/** Options accepted when registering a route */
export interface RouteRegistrationOptions {
  middleware?: Middleware[];
  name?: string;
  version?: string;
}

/** Object router interface */
export interface ObjectRouter {
  routes: RouteObject;
  config: RouterConfig;
  addRoute(method: string, path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  addRoutes(routes: RouteObject): void;
  get(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  post(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  put(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  patch(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  delete(path: string, handler: RouteHandler, options?: RouteRegistrationOptions): void;
  use(middleware: Middleware): void;
  use(path: string, middleware: Middleware): void;
  /**
   * Adapt the router to an Express router. Pass the express module itself;
   * the returned value is whatever `express.Router()` produces, so it plugs
   * straight into `app.use(path, router.toExpressRouter(express))`.
   */
  toExpressRouter<RouterType>(express: { Router: () => RouterType }): RouterType;
  /** Create a bare node:http server that delegates every request to handle(). */
  createServer(options?: Record<string, unknown>): import('http').Server;
  /**
   * Handle a raw Node request/response pair. The router parses query, params
   * and body itself, so a plain IncomingMessage is accepted.
   */
  handle(
    req: IncomingMessage,
    res: ServerResponse,
    options?: {
      /** Overrides the router's configured CORS origin allowlist. */
      corsOrigin?: string | string[];
      rateLimit?: { windowMs?: number; maxRequests?: number };
      maxBodySize?: number;
    }
  ): Promise<void>;
  getRoutes(): RouteObject;
  mount(app: any): void;
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

/** JWT options */
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

/** Rate limit configuration */
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

/** Cache configuration */
export interface CacheConfig {
  ttl?: number;
  key?: string | ((req: ApiRequest) => string);
  varies?: string[];
  condition?: (req: ApiRequest, res: ApiResponse) => boolean;
}

// ============================================================================
// Serialization
// ============================================================================

/** Serialization configuration */
export interface SerializationConfig {
  include?: string[];
  exclude?: string[];
  transform?: Record<string, (value: any) => any>;
  dateFormat?: string;
  nullValues?: boolean;
  undefinedValues?: boolean;
}

/** Serialization options */
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
 * Extends Error with HTTP status code and error code support.
 */
export class ApiError extends Error {
  constructor(message: string, statusCode?: number, code?: string);
  /** HTTP status code (default: 500) */
  statusCode: number;
  /** Machine-readable error code */
  code: string;
  /** Additional error details */
  details?: any;
  /** Convert error to JSON-serializable object */
  toJSON(): { message: string; statusCode: number; code: string; details?: any };
}

/**
 * Validation error class.
 * Thrown when request validation fails.
 */
export class ValidationError extends ApiError {
  constructor(message: string, errors?: ValidationErrorInfo[]);
  /** Array of field-level validation errors */
  errors: ValidationErrorInfo[];
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
  includeStack?: boolean;
  logger?: (error: Error, req: ApiRequest) => void;
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

/** Create an object-based router */
export function createRouter(routes: RouteObject, config?: RouterConfig): ObjectRouter;

/** Error handling HOC */
export function withErrorHandling(options?: ErrorHandlerOptions): (handler: RouteHandler) => RouteHandler;

/** Create error handler middleware */
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

/** Role-based authorization middleware */
export function withRole(roles: string | string[]): Middleware;

/** Input validation middleware (combines body, query, and params) */
export function withInputValidation(schema: {
  body?: ValidationSchema;
  query?: ValidationSchema;
  params?: ValidationSchema;
}): Middleware;

/** Hash password */
export function hashPassword(password: string, saltRounds?: number): Promise<string>;

/** Verify password */
export function verifyPassword(password: string, hash: string): Promise<boolean>;

/** Generate JWT token */
export function generateToken(payload: any, options?: JwtOptions): string;

/** Serialization middleware */
export function withSerialization(config: SerializationConfig): Middleware;

/** Serialize for JSON */
export function serializeForJSON(obj: any, options?: SerializationOptions): any;

/** Serialize date */
export function serializeDate(date: Date): string;

/** Deserialize date */
export function deserializeDate(dateString: string): Date;

/** Serialize Map */
export function serializeMap(map: Map<any, any>): any;

/** Deserialize Map */
export function deserializeMap(obj: any): Map<any, any>;

/** Serialize Set */
export function serializeSet(set: Set<any>): any;

/** Deserialize Set */
export function deserializeSet(arr: any[]): Set<any>;

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
  BadRequestError: typeof BadRequestError;
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
  withInputValidation: typeof withInputValidation;
};

export default coherentApi;
