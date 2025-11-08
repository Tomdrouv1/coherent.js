/**
 * Coherent.js API Types
 * TypeScript definitions for the API framework
 *
 * @version 1.0.0-beta.1
 */

import { IncomingMessage, ServerResponse } from 'http';

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
}

// ============================================================================
// Route Handler Types
// ============================================================================

/** Route handler function */
export type RouteHandler = (
  req: ApiRequest,
  res: ApiResponse,
  next?: NextFunction
) => void | Promise<void> | any;

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
  validation?: ValidationSchema;
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
}

/** Object router interface */
export interface ObjectRouter {
  routes: RouteObject;
  config: RouterConfig;
  addRoute(path: string, definition: RouteDefinition): void;
  addRoutes(routes: RouteObject): void;
  use(middleware: Middleware): void;
  use(path: string, middleware: Middleware): void;
  handle(req: ApiRequest, res: ApiResponse, next?: NextFunction): void;
  getRoutes(): RouteObject;
  mount(app: any): void;
}

// ============================================================================
// Validation
// ============================================================================

/** Field validation rule */
export interface ValidationRule {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'date';
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  enum?: any[];
  custom?: (value: any, field: string, data: any) => boolean | string;
  message?: string;
  transform?: (value: any) => any;
}

/** Validation schema */
export interface ValidationSchema {
  [field: string]: ValidationRule | ValidationSchema;
}

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data: any;
}

/** Validation error */
export interface ValidationError {
  field: string;
  message: string;
  value: any;
  rule: string;
}

/** Validation options */
export interface ValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  skipMissing?: boolean;
  context?: any;
}

// ============================================================================
// Authentication and Authorization
// ============================================================================

/** Authentication configuration */
export interface AuthConfig {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
  strategy?: 'jwt' | 'session' | 'basic' | 'custom';
  verify?: (req: ApiRequest) => Promise<any> | any;
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

/** Base API error */
export class ApiError extends Error {
  constructor(message: string, statusCode?: number, code?: string);
  statusCode: number;
  code: string;
  details?: any;
  toJSON(): object;
}

/** Validation error class */
export class ValidationError extends ApiError {
  constructor(message: string, errors?: ValidationError[]);
  errors: ValidationError[];
}

/** Authentication error class */
export class AuthenticationError extends ApiError {
  constructor(message?: string);
}

/** Authorization error class */
export class AuthorizationError extends ApiError {
  constructor(message?: string);
}

/** Not found error class */
export class NotFoundError extends ApiError {
  constructor(message?: string);
}

/** Conflict error class */
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

/** Validate against schema */
export function validateAgainstSchema(
  schema: ValidationSchema,
  data: any,
  options?: ValidationOptions
): ValidationResult;

/** Validate a single field */
export function validateField(
  rule: ValidationRule,
  value: any,
  field: string,
  data?: any
): ValidationError | null;

/** Validation middleware */
export function withValidation(schema: ValidationSchema): Middleware;

/** Query validation middleware */
export function withQueryValidation(schema: ValidationSchema): Middleware;

/** Params validation middleware */
export function withParamsValidation(schema: ValidationSchema): Middleware;

/** Authentication middleware */
export function withAuth(config?: AuthConfig): Middleware;

/** Role-based authorization middleware */
export function withRole(roles: string | string[]): Middleware;

/** Input validation middleware */
export function withInputValidation(schema: ValidationSchema): Middleware;

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
