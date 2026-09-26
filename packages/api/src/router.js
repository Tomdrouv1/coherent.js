/**
 * Object-based Router for Coherent.js API framework
 * Pure object-oriented approach to backend API routing
 *
 * @fileoverview Transforms nested JavaScript objects into API routes with
 * middleware, validation, and _error handling support.
 *
 * @author Coherent.js Team
 * @version 1.0.0
 */

import { createHash, randomBytes } from 'node:crypto';

import { withValidation } from './validation.js';
import { withErrorHandling } from './errors.js';
import { createServer, STATUS_CODES } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { env } from 'node:process';

/**
 * HTTP methods supported by the object router
 * @private
 */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Error for a request body that could not be read.
 * @private
 */
function bodyError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

/**
 * Parse JSON request body with security limits
 *
 * Chunks are collected as Buffers and decoded once: decoding each chunk on
 * its own corrupted any multibyte UTF-8 character split across two TCP
 * chunks. The promise also settles when the client goes away mid-body
 * ('aborted', or 'close' before 'end'); it used to wait for an 'end' that
 * never came.
 *
 * @private
 * @param {Object} req - Request stream
 * @param {number} [maxSize=1048576] - Largest body accepted, in bytes
 * @returns {Promise<Object>} Parsed body; rejects with `statusCode` 413/400,
 *   or with `code: 'ECONNABORTED'` when the client aborted
 */
function parseBody(req, maxSize = 1024 * 1024) { // 1MB limit
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
      resolve({});
      return;
    }

    const declared = Number(req.headers?.['content-length']);
    if (Number.isFinite(declared) && declared > maxSize) {
      reject(bodyError('Request body too large', 413));
      return;
    }

    const chunks = [];
    let size = 0;
    let settled = false;

    const cleanup = () => {
      req.off?.('data', onData);
      req.off?.('end', onEnd);
      req.off?.('aborted', onAborted);
      req.off?.('close', onClose);
      req.off?.('error', onError);
    };
    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };

    function onData(chunk) {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      size += buffer.length;
      if (size > maxSize) {
        chunks.length = 0;
        settle(reject, bodyError('Request body too large', 413));
        return;
      }
      chunks.push(buffer);
    }

    function onEnd() {
      try {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          const body = Buffer.concat(chunks, size).toString('utf8');
          const parsed = body ? JSON.parse(body) : {};
          settle(resolve, stripUnsafeKeys(parsed));
        } else {
          settle(resolve, {});
        }
      } catch {
        settle(reject, bodyError('Invalid JSON body', 400));
      }
    }

    function onAborted() {
      settle(reject, bodyError('Request aborted', 400, 'ECONNABORTED'));
    }

    // 'close' after 'end' is normal; before it, the body will never arrive.
    function onClose() {
      onAborted();
    }

    function onError(error) {
      if (error?.code === 'ECONNRESET' || error?.code === 'ECONNABORTED') {
        onAborted();
      } else {
        settle(reject, error);
      }
    }

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('aborted', onAborted);
    req.on('close', onClose);
    req.on('error', onError);
  });
}
/**
 * Strip prototype-polluting keys from a parsed JSON body.
 *
 * Values are passed through untouched. Escaping is the renderer's job —
 * `@coherent.js/core` escapes on the way out — and rewriting request data
 * here corrupts legitimate input while stopping no real attack: a blocklist
 * of `<script>` / `javascript:` / `on*=` never matched `</script >`,
 * `data:` URLs or nested payloads like `<scr<script>ipt>` anyway.
 *
 * Structure is preserved: arrays stay arrays.
 *
 * @private
 * @param {*} value - Parsed JSON value
 * @returns {*} The value with unsafe keys removed
 */
function stripUnsafeKeys(value) {
  if (Array.isArray(value)) return value.map(stripUnsafeKeys);
  if (typeof value !== 'object' || value === null) return value;

  const cleaned = {};
  for (const [key, child] of Object.entries(value)) {
    // Assigning `__proto__` on an object literal reassigns its prototype;
    // `constructor` and `prototype` are dropped so that a downstream deep
    // merge cannot be walked into Object.prototype either.
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    cleaned[key] = stripUnsafeKeys(child);
  }
  return cleaned;
}

/**
 * Whether a response has already been started or finished.
 *
 * Middleware such as `withAuth` or `withRole` rejects a request by writing a
 * 401/403 itself and returning nothing, so "did it return something" cannot
 * tell the chain to stop. The response state can.
 *
 * @private
 * @param {Object} res - HTTP response object
 * @returns {boolean} True once headers are sent or the response has ended
 */
function responseStarted(res) {
  return Boolean(res && (res.headersSent || res.writableEnded));
}

/**
 * HTTP status for a thrown error: its `statusCode` when that is a 4xx/5xx
 * code, 500 otherwise.
 * @private
 */
function errorStatus(error) {
  const status = error?.statusCode;
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

/**
 * Whether 5xx responses may carry the real error message.
 *
 * An explicit `exposeErrors` option wins; otherwise only when NODE_ENV is
 * 'development'.
 *
 * @private
 * @param {boolean|undefined} exposeErrors - Router/handle option
 */
function shouldExposeErrors(exposeErrors) {
  if (typeof exposeErrors === 'boolean') return exposeErrors;
  return env.NODE_ENV === 'development';
}

/**
 * Answer a request whose middleware or handler threw.
 *
 * Client errors (an `ApiError` with a 4xx `statusCode`, such as the
 * `ValidationError` thrown by `withValidation`) keep their message and
 * `details`, so a 400 says which field failed.
 *
 * Server errors are logged in full and answered with the generic status
 * text: echoing the message sent strings such as `connect ECONNREFUSED
 * 10.0.3.7:5432 (db-primary.internal)` to any client. `exposeErrors: true`
 * (or NODE_ENV=development) sends the real message.
 *
 * @private
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Error} error - What was thrown
 * @param {boolean} [exposeErrors] - Send 5xx messages to the client
 */
function sendError(req, res, error, exposeErrors) {
  const status = errorStatus(error);

  if (status >= 500) {
    console.error(
      `[coherent.js/api] ${req?.method ?? ''} ${req?.url ?? ''} failed with ${status}:`,
      error?.cause ?? error
    );
  }

  if (responseStarted(res)) return;

  let message;
  if (status >= 500 && !shouldExposeErrors(exposeErrors)) {
    message = STATUS_CODES[status] || 'Internal Server Error';
  } else {
    message = error?.message || STATUS_CODES[status] || 'Internal Server Error';
  }

  const body = { error: message };
  const details = error?.details;
  if (status < 500 && details && typeof details === 'object' && Object.keys(details).length > 0) {
    body.details = details;
  }
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Whether the connection behind a response is gone.
 * @private
 */
function responseClosed(res) {
  return Boolean(res && (res.closed || res.destroyed || res.writableFinished));
}

/**
 * Resolve once `nextSignal` settles or the response finishes or closes.
 * @private
 */
function waitForNextOrResponse(res, nextSignal) {
  if (responseClosed(res) || typeof res?.once !== 'function') return nextSignal;
  return new Promise((resolve) => {
    const done = () => {
      res.off?.('finish', done);
      res.off?.('close', done);
      resolve();
    };
    res.once('finish', done);
    res.once('close', done);
    nextSignal.then(done);
  });
}

/**
 * Run one middleware under either calling convention.
 *
 * - Coherent style, `(req, res) => value`: the request continues when it
 *   returns.
 * - Express/Connect style, `(req, res, next)`: the request continues when
 *   `next()` is called, even if that happens after the function returned
 *   (an async token lookup, say). `next(err)` fails the request.
 *
 * Either way, a middleware that has sent a response has ended the request.
 * A connection that closes before an Express-style middleware calls `next()`
 * ends it too: continuing would run the handler without the middleware's
 * approval.
 *
 * @private
 * @param {Function} fn - Middleware
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {boolean} [expectsNext] - Wait for next(); defaults to `fn.length >= 3`
 * @returns {Promise<{ result: *, proceed: boolean }>}
 */
async function runMiddleware(fn, req, res, expectsNext = fn.length >= 3) {
  let nextCalled = false;
  let nextError;
  let wake;
  const nextSignal = new Promise((resolve) => {
    wake = resolve;
  });
  const next = (err) => {
    if (nextCalled) return;
    nextCalled = true;
    nextError = err;
    wake();
  };

  const result = await fn(req, res, next);

  if (expectsNext && !nextCalled && result === undefined && !responseStarted(res)) {
    await waitForNextOrResponse(res, nextSignal);
    if (!nextCalled) return { result: undefined, proceed: false };
  }

  if (nextError) {
    throw nextError instanceof Error ? nextError : new Error(String(nextError));
  }

  return { result, proceed: !responseStarted(res) };
}

/**
 * Most clients a rate limiter tracks at once. Expired windows are swept
 * first; past this, the oldest window is dropped to bound memory.
 * @private
 */
const RATE_LIMIT_MAX_KEYS = 100_000;

/**
 * Fixed-window request counter. Each router owns one, so two routers in one
 * process no longer share (or exhaust) each other's counts.
 *
 * Expired windows are swept at most once per window, and the store is capped
 * at RATE_LIMIT_MAX_KEYS. It used to be a module-global Map that was never
 * pruned: 200k spoofed client keys held ~89 MB for the life of the process.
 *
 * @private
 */
class RateLimiter {
  constructor(maxKeys = RATE_LIMIT_MAX_KEYS) {
    this.records = new Map();
    this.maxKeys = maxKeys;
    this.nextSweep = 0;
  }

  /**
   * Count one request for `key`.
   * @param {string} key - Client key
   * @param {number} [windowMs=60000] - Time window in milliseconds
   * @param {number} [maxRequests=100] - Maximum requests per window
   * @param {number} [now=Date.now()] - Current time
   * @returns {{ allowed: boolean, resetTime: number }}
   */
  hit(key, windowMs = 60000, maxRequests = 100, now = Date.now()) {
    this.sweep(now, windowMs);

    const record = this.records.get(key);
    if (!record || now >= record.resetTime) {
      if (record) {
        this.records.delete(key); // Re-insert: Map order tracks window start
      } else if (this.records.size >= this.maxKeys) {
        this.records.delete(this.records.keys().next().value);
      }
      const fresh = { count: 1, resetTime: now + windowMs };
      this.records.set(key, fresh);
      return { allowed: true, resetTime: fresh.resetTime };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, resetTime: record.resetTime };
    }

    record.count++;
    return { allowed: true, resetTime: record.resetTime };
  }

  /** Drop every expired window, at most once per `windowMs`. */
  sweep(now, windowMs) {
    if (now < this.nextSweep) return;
    for (const [key, record] of this.records) {
      if (now >= record.resetTime) this.records.delete(key);
    }
    this.nextSweep = now + Math.max(1000, Math.min(windowMs, 60_000));
  }

  /** Number of clients currently tracked. */
  get size() {
    return this.records.size;
  }
}

/**
 * The address a request is rate limited under.
 *
 * By default this is the TCP peer address. `X-Forwarded-For` is only read
 * when `trustProxy` says how many reverse proxies in front of the server
 * append to it: the client is then the entry that many hops from the right.
 * Reading the raw header let any client pick a fresh key per request and
 * bypass the limit.
 *
 * @private
 * @param {Object} req - Request
 * @param {boolean|number} [trustProxy] - `true` = one proxy, or a hop count
 * @returns {string} Client key
 */
function clientAddress(req, trustProxy) {
  const socketAddress = req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? 'unknown';
  const hops = trustProxy === true ? 1 : Number.isInteger(trustProxy) && trustProxy > 0 ? trustProxy : 0;
  const header = req.headers?.['x-forwarded-for'];

  if (hops === 0) {
    if (header) {
      warnOnce(
        'X-Forwarded-For is set but trustProxy is not, so rate limiting keys on the connecting address. ' +
          'Behind a reverse proxy that means every client shares one limit: set trustProxy to the number of proxies.'
      );
    }
    return socketAddress;
  }

  const forwarded = (Array.isArray(header) ? header.join(',') : header || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const chain = [...forwarded, socketAddress];
  // Skip the trusted proxies from the right; if the chain is shorter than
  // that, the leftmost entry is the best information there is.
  return chain[Math.max(0, chain.length - 1 - hops)];
}

/**
 * Origin used when the caller has not configured `corsOrigin`.
 * @private
 */
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000';

/** Warnings already emitted, so a per-request policy cannot spam the log. */
const warnedMessages = new Set();

/**
 * Warn about a misconfiguration once per distinct message.
 * @private
 * @param {string} message - Warning text
 */
function warnOnce(message) {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(`[coherent.js/api] ${message}`);
}

/**
 * Normalise a `corsOrigin` option into a CORS policy.
 *
 * Credentials are only ever offered to an origin the caller named
 * explicitly. Without that, `Access-Control-Allow-Credentials: true`
 * alongside an origin we picked ourselves would invite any site that can
 * influence the configured value to read authenticated responses.
 *
 * A misconfigured value warns and degrades rather than throwing, so
 * upgrading cannot take a running server down. `'*'` still serves
 * `Access-Control-Allow-Origin: *`, just without credentials — a
 * combination browsers reject anyway, so nothing that worked is lost.
 *
 * @private
 * @param {string|string[]|null|undefined} corsOrigin - Configured origin(s)
 * @returns {{origins: string[], allowCredentials: boolean, explicit: boolean}}
 */
function resolveCorsPolicy(corsOrigin) {
  const fallback = { origins: [DEFAULT_CORS_ORIGIN], allowCredentials: false, explicit: false };
  if (corsOrigin === undefined || corsOrigin === null) return fallback;

  const origins = Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin];

  if (origins.length === 0 || origins.some(origin => typeof origin !== 'string' || origin === '')) {
    warnOnce(
      'corsOrigin must be a non-empty string or an array of them. ' +
        `Ignoring ${JSON.stringify(corsOrigin)} and serving ${DEFAULT_CORS_ORIGIN} without credentials.`
    );
    return fallback;
  }

  if (origins.includes('*')) {
    if (origins.length > 1) {
      warnOnce("corsOrigin '*' allows every origin; the others listed alongside it have no effect.");
    }
    warnOnce(
      "corsOrigin '*' cannot carry credentials, so Access-Control-Allow-Credentials is not sent. " +
        'List the origins you trust to enable credentialed requests.'
    );
    // explicit:false routes this through the unconditional branch below, so
    // '*' is sent as-is with no Origin matching and no Vary.
    return { origins: ['*'], allowCredentials: false, explicit: false };
  }

  return { origins, allowCredentials: true, explicit: true };
}

/**
 * Append a field to the Vary header without clobbering existing entries.
 * @private
 */
function addVary(res, field) {
  const current = res.getHeader?.('Vary');
  if (!current) {
    res.setHeader('Vary', field);
    return;
  }
  const fields = String(current)
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (!fields.some(existing => existing.toLowerCase() === field.toLowerCase())) {
    res.setHeader('Vary', [...fields, field].join(', '));
  }
}

/**
 * Apply CORS headers for a single request according to `policy`.
 *
 * With an explicit policy the request Origin is matched against the
 * allowlist: a match is echoed back, anything else gets no CORS headers at
 * all, so the browser refuses the response.
 *
 * @private
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {{origins: string[], allowCredentials: boolean, explicit: boolean}} policy
 */
function applyCorsHeaders(req, res, policy) {
  const { origins, allowCredentials, explicit } = policy;

  let allowedOrigin;
  if (!explicit) {
    // No configured origin: keep the historical development default, but
    // never attach credentials to it.
    allowedOrigin = origins[0];
  } else {
    addVary(res, 'Origin');
    const requestOrigin = req.headers?.origin;
    if (!requestOrigin) {
      // Not a CORS request; advertise the primary configured origin.
      allowedOrigin = origins[0];
    } else if (origins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    } else {
      return; // Untrusted origin: send nothing.
    }
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (allowCredentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

/**
 * Add comprehensive security headers to HTTP response
 * @private
 * @param {Object} res - HTTP response object
 */
function addSecurityHeaders(res) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Route pattern tokens: a parameter (`:name`, `:name(constraint)`,
 * `:name?`), a multi-segment wildcard (`**`) or a single-segment one (`*`).
 *
 * Parameter names are identifiers, so `/:from-:to` and `/:file.:ext` hold
 * two parameters each. The constraint may not contain parentheses; the
 * `(?:[^()\\]|\\.)*` form is linear, so a pattern of many `:a(` cannot
 * backtrack (CodeQL js/polynomial-redos).
 *
 * @private
 */
const ROUTE_TOKEN = /:([A-Za-z_$][\w$]*)(?:\(((?:[^()\\]|\\.)*)\))?(\?)?|\*\*|\*/g;

/** @private */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Decode one captured parameter. A malformed escape is kept as sent rather
 * than failing the request.
 * @private
 */
function decodeParam(value) {
  if (!value.includes('%')) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Compile a route pattern into an anchored regex and its parameter names.
 *
 * Literal text is escaped piece by piece as it is read, so `.` in
 * `/files/report.pdf` only matches a dot. The previous implementation
 * substituted the parameter groups first and then tried to escape the whole
 * string with a character class that was missing its `]`, so nothing was
 * escaped: `/files/reportXpdf` matched `/files/report.pdf`. It also pushed
 * the wildcard's name before any parameter's, so `/users/:id/*` answered
 * `{ splat: '42', id: 'avatar' }`, and it read `:id?` as a parameter named
 * `id?`, so optional parameters never matched their absence.
 *
 * @private
 * @param {string} pattern - Route pattern
 * @returns {{ regex: RegExp, paramNames: string[], pattern: string }}
 */
function compilePattern(pattern) {
  const paramNames = [];
  let source = '';
  let last = 0;

  for (const match of pattern.matchAll(ROUTE_TOKEN)) {
    const [token, name, constraint, optional] = match;
    let literal = pattern.slice(last, match.index);
    let group;

    if (token === '**') {
      paramNames.push('splat');
      group = '(.*)';
    } else if (token === '*') {
      paramNames.push('splat');
      group = '([^/]+)';
    } else {
      paramNames.push(name);
      const body = constraint === undefined || constraint === '' ? '[^/]+' : constraint;
      if (optional && literal.endsWith('/')) {
        // `/opt/:id?` matches `/opt` as well as `/opt/5`.
        literal = literal.slice(0, -1);
        group = `(?:/(${body}))?`;
      } else if (optional) {
        group = `(${body})?`;
      } else {
        group = `(${body})`;
      }
    }

    source += escapeRegex(literal) + group;
    last = match.index + token.length;
  }
  source += escapeRegex(pattern.slice(last));

  return { regex: new RegExp(`^${source}$`), paramNames, pattern };
}

/**
 * Match `path` against a compiled pattern.
 *
 * Parameters are URL-decoded (`/users/John%20Doe` gives `'John Doe'`), and
 * every call returns a new object, so a handler changing `req.params` cannot
 * leak into another request.
 *
 * @private
 * @returns {Object|null} Parameters, or null when the path does not match
 */
function matchCompiled(compiled, path) {
  const match = compiled.regex.exec(path);
  if (!match) return null;

  const params = {};
  for (let i = 0; i < compiled.paramNames.length; i++) {
    const value = match[i + 1];
    if (value !== undefined) {
      params[compiled.paramNames[i]] = decodeParam(value);
    }
  }
  return params;
}

/** Patterns compiled for extractParams() when router compilation is off. @private */
const extractCache = new Map();

/**
 * Extract parameters from URL path with constraint support
 *
 * Used when `enableCompilation: false`; it shares compilePattern() so both
 * modes match exactly the same paths.
 *
 * @private
 * @param {string} pattern - URL pattern with parameters (e.g., '/users/:id(\\d+)')
 * @param {string} path - Actual URL path to match
 * @returns {Object|null} Extracted parameters object or null if no match
 * @example
 * extractParams('/users/:id(\\d+)', '/users/123') // { id: '123' }
 * extractParams('/users/:id?', '/users') // {}
 */
function extractParams(pattern, path) {
  let compiled = extractCache.get(pattern);
  if (!compiled) {
    compiled = compilePattern(pattern);
    if (extractCache.size >= 1000) extractCache.delete(extractCache.keys().next().value);
    extractCache.set(pattern, compiled);
  }
  return matchCompiled(compiled, path);
}


/**
 * Transforms nested route objects into registered API routes
 *
 * @param {Object} routeObj - Route definition object
 * @param {Object} router - Router instance
 * @param {string} basePath - Current path prefix
 */
function processRoutes(routeObj, router, basePath = '') {
  if (!routeObj || typeof routeObj !== 'object') return;

  Object.entries(routeObj).forEach(([key, config]) => {
    // `GET: (req) => ({...})` is shorthand for `GET: { handler }`. It used to
    // be skipped silently, so the route was never registered.
    if (typeof config === 'function' && HTTP_METHODS.includes(key.toUpperCase())) {
      registerRoute(key.toUpperCase(), { handler: config }, router, basePath);
      return;
    }

    if (!config || typeof config !== 'object') return;

    // Check if this is a WebSocket route configuration
    if (config.ws && typeof config.ws === 'function') {
      // WebSocket route - register directly
      const cleanKey = key.startsWith('/') ? key.slice(1) : key;
      const wsPath = basePath ? `${basePath}/${cleanKey}` : `/${cleanKey}`;
      router.addWebSocketRoute(wsPath, config.ws);
      return;
    }

    if (HTTP_METHODS.includes(key.toUpperCase())) {
      // HTTP method route
      registerRoute(key.toUpperCase(), config, router, basePath);
    } else {
      // Nested path - handle leading slash correctly
      const cleanKey = key.startsWith('/') ? key.slice(1) : key;
      const path = basePath ? `${basePath}/${cleanKey}` : `/${cleanKey}`;
      processRoutes(config, router, path);
    }
  });
}

/**
 * Registers a single route with middleware chain
 *
 * @param {string} method - HTTP method
 * @param {Object} config - Route configuration
 * @param {Object} router - Router instance
 * @param {string} path - Route path
 */
function registerRoute(method, config, router, path) {
  const {
    handler,
    handlers,
    validation,
    middleware,
    errorHandling = true,
    path: customPath,
    name
  } = config;

  const routePath = customPath || path || '/';
  const chain = [];

  // Add middleware
  if (middleware) {
    chain.push(...(Array.isArray(middleware) ? middleware : [middleware]));
  }

  // Add validation
  if (validation) {
    chain.push(withValidation(validation));
  }

  // Add handlers
  if (handlers) {
    chain.push(...handlers);
  } else if (handler) {
    chain.push(handler);
  } else {
    console.warn(`No handler for ${method} ${routePath}`);
    return;
  }

  // Whether each step waits for next() is decided on the function the user
  // wrote: withErrorHandling's wrapper always declares three parameters. The
  // final handler never waits; it answers by returning or by writing.
  const steps = chain.map((fn, i) => ({
    fn: errorHandling ? withErrorHandling(fn) : fn,
    expectsNext: i < chain.length - 1 && fn.length >= 3
  }));

  // Register route with name option
  router.addRoute(method, routePath, async (req, res) => {
    try {
      // Execute middleware and handler chain
      let result = null;
      for (const { fn, expectsNext } of steps) {
        const outcome = await runMiddleware(fn, req, res, expectsNext);
        result = outcome.result;
        // A middleware that wrote its own response (401, 403, 400...) has
        // rejected the request: nothing after it may run.
        if (!outcome.proceed) return;
        if (result && typeof result === 'object') {
          break;
        }
      }

      if (responseStarted(res)) return;

      if (result && typeof result === 'object') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } else {
        res.writeHead(204);
        res.end();
      }
    } catch (_error) {
      const expose = requestErrorExposure.has(req) ? requestErrorExposure.get(req) : router.exposeErrors;
      sendError(req, res, _error, expose);
    }
  }, { name });
}

/**
 * The `exposeErrors` setting in force for each request handle() is serving,
 * so object routes honour a per-call override as addRoute routes do.
 * @private
 */
const requestErrorExposure = new WeakMap();

/**
 * Largest WebSocket frame or reassembled message accepted by default.
 * @private
 */
const WS_DEFAULT_MAX_PAYLOAD = 1024 * 1024;

/**
 * Encode one unmasked (server-to-client) WebSocket frame with FIN set.
 * @private
 * @param {number} opcode - Frame opcode
 * @param {Buffer} payload - Frame payload
 * @returns {Buffer} Frame bytes
 */
function encodeFrame(opcode, payload) {
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.from([0x80 | opcode, length]);
  } else if (length < 65536) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeUInt32BE(Math.floor(length / 2 ** 32), 2);
    header.writeUInt32BE(length >>> 0, 6);
  }
  return Buffer.concat([header, payload]);
}

/**
 * Decode the first WebSocket frame in `buffer`.
 *
 * @private
 * @param {Buffer} buffer - Bytes received so far
 * @param {number} maxPayload - Largest payload accepted
 * @returns {{ fin: boolean, opcode: number, payload: Buffer, size: number }|{ error: number }|null}
 *   The frame and how many bytes it used; `{ error: 1009 }` when it is too
 *   large; null when the frame is not complete yet
 */
function readFrame(buffer, maxPayload) {
  if (buffer.length < 2) return null;

  const fin = (buffer[0] & 0x80) !== 0;
  const opcode = buffer[0] & 0x0f;
  const masked = (buffer[1] & 0x80) !== 0;
  let length = buffer[1] & 0x7f;
  let offset = 2;

  if (length === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    if (buffer.length < 10) return null;
    if (buffer.readUInt32BE(2) !== 0) return { error: 1009 };
    length = buffer.readUInt32BE(6);
    offset = 10;
  }

  if (length > maxPayload) return { error: 1009 };

  const maskOffset = offset;
  if (masked) offset += 4;
  if (buffer.length < offset + length) return null;

  const payload = Buffer.from(buffer.subarray(offset, offset + length));
  if (masked) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= buffer[maskOffset + (i & 3)];
    }
  }

  return { fin, opcode, payload, size: offset + length };
}

/**
 * Detect if a route pattern is static (exact match) or dynamic (contains parameters)
 * @private
 * @param {string} pattern - Route pattern to check
 * @returns {boolean} True if pattern is static (no parameters, wildcards, or regex)
 */
function isStaticRoute(pattern) {
  // Static routes don't contain:
  // - Route parameters (:param)
  // - Wildcards (* or **)
  // - Regex groups (parentheses)
  // - Optional parameters (?)
  return !pattern.includes(':') &&
         !pattern.includes('*') &&
         !pattern.includes('(') &&
         !pattern.includes('?');
}

/**
 * Simple router implementation for object-based routing with WebSocket support
 *
 * @class SimpleRouter
 * @description Provides HTTP and WebSocket routing with middleware support, caching,
 * versioning, content negotiation, and performance metrics.
 *
 * @param {Object} [options={}] - Router configuration options
 * @param {number} [options.maxCacheSize=1000] - Maximum cache size for route lookups
 * @param {boolean} [options.enableCompilation=true] - Enable route pattern compilation
 * @param {boolean} [options.enableVersioning=false] - Enable API versioning
 * @param {string} [options.defaultVersion='v1'] - Default API version
 * @param {string} [options.versionHeader='api-version'] - Header for version detection
 * @param {boolean} [options.enableContentNegotiation=true] - Enable content type negotiation
 * @param {string} [options.defaultContentType='application/json'] - Default response content type
 * @param {boolean} [options.enableWebSockets=false] - Enable WebSocket routing
 * @param {boolean} [options.enableMetrics=false] - Enable performance metrics collection
 *
 * @example
 * const router = new SimpleRouter({
 *   enableWebSockets: true,
 *   enableMetrics: true,
 *   maxCacheSize: 2000
 * });
 */
class SimpleRouter {
  constructor(options = {}) {
    this.routes = [];
    this.routeCache = new Map();
    this.namedRoutes = new Map();
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.routeGroups = [];
    this.globalMiddleware = [];

    // Route compilation options
    this.enableCompilation = options.enableCompilation !== false; // Default true
    this.compiledRoutes = new Map(); // Compiled regex patterns
    this.routeCompilationCache = new Map(); // Cache compiled patterns
    this.maxCompilationCacheSize = options.maxCompilationCacheSize || 1000;

    // Route versioning options
    this.enableVersioning = options.enableVersioning || false;
    this.defaultVersion = options.defaultVersion || 'v1';
    this.versionHeader = options.versionHeader || 'api-version';
    this.versionedRoutes = new Map(); // version -> routes mapping

    // Content negotiation options
    this.enableContentNegotiation = options.enableContentNegotiation !== false; // Default true
    this.defaultContentType = options.defaultContentType || 'application/json';

    // WebSocket routing options
    this.enableWebSockets = options.enableWebSockets || false;
    this.wsRoutes = [];
    this.wsConnections = new Map(); // Track active WebSocket connections
    // Browser origins allowed to open WebSockets (per-route allowedOrigins
    // overrides it). Unset: same-origin handshakes only.
    this.wsAllowedOrigins = options.wsAllowedOrigins;
    this.wsMaxPayload = options.wsMaxPayload || WS_DEFAULT_MAX_PAYLOAD;

    // Performance metrics
    this.enableMetrics = options.enableMetrics || false;
    if (this.enableMetrics) {
      this.metrics = {
        requests: 0,
        cacheHits: 0,
        compilationHits: 0,
        routeMatches: new Map(),
        responseTime: [],
        errors: 0,
        versionRequests: new Map(), // Track requests per version
        contentTypeRequests: new Map(), // Track requests per content type
        wsConnections: 0, // Track WebSocket connections
        wsMessages: 0 // Track WebSocket messages
      };
    }

    // Security header optimization options
    this.enableSecurityHeaders = options.enableSecurityHeaders !== false; // Default true for backward compatibility
    this.enableCORS = options.enableCORS !== false; // Default true for backward compatibility

    // CORS policy. Resolved here so an invalid corsOrigin throws at
    // construction rather than on the first request.
    this.corsOriginRaw = options.corsOrigin;
    this.corsPolicy = resolveCorsPolicy(options.corsOrigin);

    // Smart route matching optimization
    this.enableSmartRouting = options.enableSmartRouting !== false; // Default true
    this.staticRoutes = new Map(); // O(1) lookup for exact routes
    this.enableRouteMetrics = options.enableRouteMetrics || false; // Track route type performance

    // Rate limiting: one store per router. X-Forwarded-For is only trusted
    // when trustProxy says how many proxies append to it.
    this.rateLimiter = new RateLimiter();
    this.trustProxy = options.trustProxy ?? false;

    // 5xx responses carry a generic message unless this is true (or, when
    // it is unset, NODE_ENV is 'development'). The real error is logged.
    this.exposeErrors = options.exposeErrors;

    // Default per-request options for handle() and createServer().
    this.defaultOptions = options;

    // `prefix` and `middleware` apply to every route registered afterwards,
    // like an outermost group() and router.use(). Both were declared in the
    // router's types but ignored, so a config-level auth middleware silently
    // protected nothing.
    if (typeof options.prefix === 'string' && options.prefix !== '' && options.prefix !== '/') {
      const prefix = options.prefix.startsWith('/') ? options.prefix : `/${options.prefix}`;
      this.routeGroups.push({ prefix: prefix.replace(/\/+$/, ''), middleware: [] });
    }
    if (options.middleware) {
      const configured = Array.isArray(options.middleware) ? options.middleware : [options.middleware];
      configured.forEach((middleware) => this.use(middleware));
    }
  }

  /**
   * Add an HTTP route to the router
   *
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
   * @param {string} path - Route path pattern (supports :param and wildcards)
   * @param {Function} handler - Route handler function
   * @param {Object} [options={}] - Route options
   * @param {Array} [options.middleware] - Route-specific middleware
   * @param {string} [options.name] - Named route for URL generation
   * @param {string} [options.version] - API version for this route
   *
   * @example
   * router.addRoute('GET', '/users/:id', (req, res) => {
   *   return { user: { id: req.params.id } };
   * }, { name: 'getUser', version: 'v2' });
   */
  addRoute(method, path, handler, options = {}) {
    // Apply group prefix
    const prefix = this.getCurrentPrefix();
    const fullPath = prefix + (path.startsWith('/') ? path : `/${path}`);

    // Combine group middleware with route middleware
    const groupMiddleware = this.getCurrentGroupMiddleware();
    const routeMiddleware = options.middleware || [];
    const allMiddleware = [...this.globalMiddleware, ...groupMiddleware, ...routeMiddleware];

    const route = {
      method: method.toUpperCase(),
      path: fullPath,
      handler,
      middleware: allMiddleware,
      name: options.name,
      version: options.version || this.defaultVersion
    };

    // Compile route pattern if compilation is enabled
    if (this.enableCompilation) {
      route.compiled = this.compileRoute(fullPath);
    }

    // Smart routing: store static routes in separate Map for O(1) lookup
    if (this.enableSmartRouting && isStaticRoute(fullPath)) {
      const staticKey = `${route.method}:${fullPath}`;
      this.staticRoutes.set(staticKey, route);

      // Mark route as static (this is a route characteristic, not a metric)
      route.isStatic = true;
    }

    this.routes.push(route);

    // Store versioned route if versioning is enabled
    if (this.enableVersioning) {
      if (!this.versionedRoutes.has(route.version)) {
        this.versionedRoutes.set(route.version, []);
      }
      this.versionedRoutes.get(route.version).push(route);
    }

    // Store named route for URL generation
    if (options.name) {
      this.namedRoutes.set(options.name, { method: route.method, path: fullPath, version: route.version });
    }
  }

  /**
   * Add a versioned route
   * @param {string} version - API version (e.g., 'v1', 'v2')
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   * @param {Object} options - Route options
   */
  addVersionedRoute(version, method, path, handler, options = {}) {
    this.addRoute(method, path, handler, { ...options, version });
  }

  /**
   * Add route with content negotiation support
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @param {Object} handlers - Content type handlers { 'application/json': handler, 'text/xml': handler }
   * @param {Object} options - Route options
   */
  addContentNegotiatedRoute(method, path, handlers, options = {}) {
    const negotiationHandler = async (req, res) => {
      const acceptedType = this.negotiateContentType(req, Object.keys(handlers));

      if (this.enableMetrics) {
        this.metrics.contentTypeRequests.set(acceptedType, (this.metrics.contentTypeRequests.get(acceptedType) || 0) + 1);
      }

      const handler = handlers[acceptedType];
      if (!handler) {
        res.writeHead(406, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Not Acceptable',
          supportedTypes: Object.keys(handlers)
        }));
        return;
      }

      const result = await handler(req, res);

      if (result && typeof result === 'object') {
        res.writeHead(200, { 'Content-Type': acceptedType });

        if (acceptedType === 'application/json') {
          res.end(JSON.stringify(result));
        } else if (acceptedType === 'text/xml' || acceptedType === 'application/xml') {
          res.end(this.objectToXml(result));
        } else if (acceptedType === 'text/html') {
          res.end(typeof result === 'string' ? result : `<pre>${JSON.stringify(result, null, 2)}</pre>`);
        } else if (acceptedType === 'text/plain') {
          res.end(typeof result === 'string' ? result : JSON.stringify(result));
        } else {
          res.end(JSON.stringify(result));
        }
      }
    };

    this.addRoute(method, path, negotiationHandler, options);
  }

  /**
   * Negotiate content type based on Accept header
   * @param {Object} req - Request object
   * @param {Array} supportedTypes - Array of supported content types
   * @returns {string} Best matching content type
   * @private
   */
  negotiateContentType(req, supportedTypes) {
    const acceptHeader = req.headers.accept || this.defaultContentType;

    // Parse Accept header and find best match
    const acceptedTypes = acceptHeader
      .split(',')
      .map(type => {
        const [mediaType, ...params] = type.trim().split(';');
        const qValue = params.find(p => p.trim().startsWith('q='));
        const quality = qValue ? parseFloat(qValue.split('=')[1]) : 1.0;
        return { type: mediaType.trim(), quality };
      })
      .sort((a, b) => b.quality - a.quality);

    // Find first supported type
    for (const accepted of acceptedTypes) {
      if (accepted.type === '*/*') {
        return supportedTypes[0] || this.defaultContentType;
      }

      const [mainType, subType] = accepted.type.split('/');
      for (const supported of supportedTypes) {
        const [supportedMain, supportedSub] = supported.split('/');

        if (accepted.type === supported ||
            (mainType === supportedMain && subType === '*') ||
            (mainType === '*' && subType === supportedSub)) {
          return supported;
        }
      }
    }

    return supportedTypes[0] || this.defaultContentType;
  }

  /**
   * Convert object to XML string
   * @param {Object} obj - Object to convert
   * @param {string} rootName - Root element name
   * @returns {string} XML string
   * @private
   */
  objectToXml(obj, rootName = 'root') {
    const xmlEscape = (str) => String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const toXml = (obj, name) => {
      if (obj === null || obj === undefined) {
        return `<${name}/>`;
      }

      if (typeof obj !== 'object') {
        return `<${name}>${xmlEscape(obj)}</${name}>`;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => toXml(item, 'item')).join('');
      }

      const content = Object.entries(obj)
        .map(([key, value]) => toXml(value, key))
        .join('');

      return `<${name}>${content}</${name}>`;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>${toXml(obj, rootName)}`;
  }

  /**
   * Add WebSocket route
   * @param {string} path - WebSocket path
   * @param {Function} handler - WebSocket handler function
   * @param {Object} options - Route options
   * @param {string|string[]} [options.allowedOrigins] - Browser origins allowed to connect
   *   (`'*'` for any); overrides the router's `wsAllowedOrigins`
   */
  addWebSocketRoute(path, handler, options = {}) {
    if (!this.enableWebSockets) {
      throw new Error('WebSocket routing is disabled. Enable with { enableWebSockets: true }');
    }

    const prefix = this.getCurrentPrefix();
    const fullPath = prefix + (path.startsWith('/') ? path : `/${path}`);

    const wsRoute = {
      path: fullPath,
      handler,
      name: options.name,
      version: options.version || this.defaultVersion,
      allowedOrigins: options.allowedOrigins,
      compiled: this.enableCompilation ? this.compileRoute(fullPath) : null
    };

    this.wsRoutes.push(wsRoute);

    if (options.name) {
      this.namedRoutes.set(options.name, { method: 'WS', path: fullPath, version: wsRoute.version });
    }
  }

  /**
   * Whether a WebSocket handshake's Origin may connect to `route`.
   *
   * Browsers attach cookies to cross-site WebSocket handshakes and send an
   * Origin header; without a check, any page could open an authenticated
   * socket (cross-site WebSocket hijacking). With no allowlist configured,
   * only same-origin browser handshakes are accepted. Clients that send no
   * Origin (non-browser clients) are not affected.
   *
   * @private
   * @param {Object} request - Upgrade request
   * @param {Object} route - Matched WebSocket route
   * @returns {boolean}
   */
  isWebSocketOriginAllowed(request, route) {
    const origin = request.headers?.origin;
    if (!origin) return true;

    const configured = route.allowedOrigins ?? this.wsAllowedOrigins;
    if (configured !== undefined && configured !== null) {
      const allowed = Array.isArray(configured) ? configured : [configured];
      return allowed.includes('*') || allowed.includes(origin);
    }

    try {
      return new URL(origin).host === request.headers.host;
    } catch {
      return false;
    }
  }

  /**
   * Handle WebSocket upgrade request
   * @param {Object} request - HTTP request object
   * @param {Object} socket - Socket object
   * @param {Buffer} head - First packet of the upgraded stream
   */
  handleWebSocketUpgrade(request, socket, head) {
    if (!this.enableWebSockets) {
      socket.end('HTTP/1.1 501 Not Implemented\r\n\r\n');
      return;
    }

    // A fixed base: building it from the Host header threw on a malformed
    // value, inside an 'upgrade' listener, which crashed the process.
    let pathname;
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }

    // Find matching WebSocket route
    let matchedRoute = null;
    for (const wsRoute of this.wsRoutes) {
      let params = null;

      if (this.enableCompilation && wsRoute.compiled) {
        params = this.matchCompiledRoute(wsRoute.compiled, pathname);
      } else {
        params = extractParams(wsRoute.path, pathname);
      }

      if (params !== null) {
        matchedRoute = { route: wsRoute, params };
        break;
      }
    }

    if (!matchedRoute) {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
      return;
    }

    if (!this.isWebSocketOriginAllowed(request, matchedRoute.route)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }

    // Create WebSocket connection
    this.createWebSocketConnection(request, socket, head, matchedRoute);
  }

  /**
   * Create WebSocket connection
   * @param {Object} request - HTTP request object
   * @param {Object} socket - Socket object
   * @param {Buffer} head - First packet of the upgraded stream
   * @param {Object} matchedRoute - Matched WebSocket route
   * @private
   */
  createWebSocketConnection(request, socket, head, matchedRoute) {

    // WebSocket handshake
    const key = request.headers['sec-websocket-key'];
    if (!key) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }

    const acceptKey = createHash('sha1')
      .update(`${key  }258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');

    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '', ''
    ].join('\r\n');

    socket.write(responseHeaders);

    // Create WebSocket wrapper
    const ws = this.createWebSocketWrapper(socket, matchedRoute);

    // Track connection
    const connectionId = randomBytes(16).toString('hex');
    this.wsConnections.set(connectionId, ws);

    if (this.enableMetrics) {
      this.metrics.wsConnections++;
    }

    // Add connection metadata
    ws.id = connectionId;
    ws.params = matchedRoute.params;
    ws.path = matchedRoute.route.path;

    // Handle connection cleanup
    socket.on('close', () => {
      ws.readyState = 3; // CLOSED

      // Call the route handler's close callback before cleanup
      if (matchedRoute.route.handler.onClose) {
        matchedRoute.route.handler.onClose(ws);
      }

      // Fire any custom close handlers set by the route handler
      if (ws.onclose) {
        try {
          ws.onclose();
        } catch (_error) {
          console.error('WebSocket onclose handler error:', _error);
        }
      }

      this.wsConnections.delete(connectionId);
      if (this.enableMetrics) {
        this.metrics.wsConnections--;
      }
    });

    // Call route handler
    try {
      matchedRoute.route.handler(ws, request);
    } catch (err) {
      console.error('WebSocket upgrade error:', err);
      socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      return;
    }

    // Frames the client sent along with the handshake arrive in `head`;
    // they used to be dropped.
    if (head && head.length > 0) ws.receive(head);
  }

  /**
   * Create WebSocket wrapper with message handling
   *
   * Incoming bytes are buffered and split into frames, so a frame spread
   * over several TCP chunks, or several frames in one chunk, are all
   * delivered; each chunk used to be parsed as exactly one frame. Fragmented
   * text messages are reassembled, pings are answered, a close frame is
   * answered and closes the socket, and frames or messages larger than
   * `wsMaxPayload` (1 MiB by default) close the connection with 1009.
   *
   * @param {Object} socket - Raw socket
   * @param {Object} matchedRoute - Matched route info
   * @returns {Object} WebSocket wrapper
   * @private
   */
  createWebSocketWrapper(socket) {
    const router = this;
    const maxPayload = this.wsMaxPayload;
    let pending = Buffer.alloc(0);
    const state = { fragments: null }; // A fragmented message being assembled

    const ws = {
      socket,
      readyState: 1, // OPEN

      send(data) {
        if (this.readyState !== 1) return;

        const message = typeof data === 'string' ? data : JSON.stringify(data);
        const frame = this.createFrame(message);
        socket.write(frame);

        if (ws.router && ws.router.enableMetrics) {
          ws.router.metrics.wsMessages++;
        }
      },

      close(code = 1000, reason = '') {
        if (this.readyState !== 1) return;

        this.readyState = 3; // CLOSED
        const frame = this.createCloseFrame(code, reason);
        socket.write(frame);
        socket.destroy(); // Force close the socket to trigger 'close' event
      },

      ping(data = Buffer.alloc(0)) {
        if (this.readyState !== 1) return;

        const frame = this.createPingFrame(data);
        socket.write(frame);
      },

      createFrame(data) {
        const payload = Buffer.from(data, 'utf8');
        return encodeFrame(0x1, payload);
      },

      createCloseFrame(code, reason) {
        const reasonBuffer = Buffer.from(reason, 'utf8');
        const payload = Buffer.allocUnsafe(2 + reasonBuffer.length);
        payload.writeUInt16BE(code, 0);
        reasonBuffer.copy(payload, 2);
        return encodeFrame(0x8, payload);
      },

      createPingFrame(data) {
        return encodeFrame(0x9, data);
      },

      /**
       * Feed raw bytes from the socket.
       * @param {Buffer} chunk - Bytes as received
       */
      receive(chunk) {
        pending = pending.length > 0 ? Buffer.concat([pending, chunk]) : chunk;

        while (this.readyState === 1) {
          const frame = readFrame(pending, maxPayload);
          if (!frame) break;
          if (frame.error) {
            pending = Buffer.alloc(0);
            this.close(frame.error, 'Message too big');
            return;
          }
          pending = pending.subarray(frame.size);
          router.handleWebSocketFrame(ws, frame, state);
        }
      }
    };

    ws.router = this;

    // Handle incoming messages
    socket.on('data', (buffer) => {
      try {
        ws.receive(buffer);
      } catch (_error) {
        console.error('WebSocket message handling error:', _error);
      }
    });

    // The upgraded socket is half-open capable (node:http servers allow
    // half-open connections), so a client that goes away without a close
    // frame left it open forever; finish our side too.
    socket.on('end', () => {
      ws.readyState = 3; // CLOSED
      socket.end();
    });

    // Handle socket errors
    socket.on('error', (err) => {
      console.error('WebSocket socket error (connection likely closed):', err.code);
      // Don't re-throw the error, just log it
    });

    return ws;
  }

  /**
   * Act on one complete incoming frame.
   * @private
   * @param {Object} ws - Connection wrapper
   * @param {{ fin: boolean, opcode: number, payload: Buffer }} frame - Decoded frame
   * @param {{ fragments: Object|null }} state - Fragmented message being assembled
   */
  handleWebSocketFrame(ws, frame, state) {
    const { fin, opcode, payload } = frame;

    switch (opcode) {
      case 0x8: {
        // Close: answer with the same status code, then close the socket.
        const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1000;
        ws.close(code >= 1000 && code < 5000 ? code : 1000);
        return;
      }
      case 0x9:
        // Ping: answer with a pong carrying the same payload.
        if (ws.readyState === 1) ws.socket.write(encodeFrame(0xa, payload));
        return;
      case 0xa:
        return; // Pong
      case 0x0: {
        // Continuation of a fragmented message
        const pendingMessage = state.fragments;
        if (!pendingMessage) return;
        pendingMessage.size += payload.length;
        if (pendingMessage.size > this.wsMaxPayload) {
          state.fragments = null;
          ws.close(1009, 'Message too big');
          return;
        }
        pendingMessage.parts.push(payload);
        if (fin) {
          state.fragments = null;
          if (pendingMessage.opcode === 0x1) this.deliverWebSocketMessage(ws, Buffer.concat(pendingMessage.parts));
        }
        return;
      }
      case 0x1:
      case 0x2:
        if (!fin) {
          state.fragments = { opcode, parts: [payload], size: payload.length };
          return;
        }
        // Only text messages are delivered; binary frames are ignored.
        if (opcode === 0x1) this.deliverWebSocketMessage(ws, payload);
        return;
      default:
        return;
    }
  }

  /** @private */
  deliverWebSocketMessage(ws, payload) {
    if (typeof ws.onmessage !== 'function') return;
    try {
      ws.onmessage({ data: payload.toString('utf8') });
    } catch (_error) {
      console.error('WebSocket onmessage handler error:', _error);
    }
  }

  /**
   * Parse WebSocket frame
   * @param {Buffer} buffer - Raw frame data
   * @returns {string|null} The text of a single complete text frame, else null
   * @private
   */
  parseWebSocketFrame(buffer) {
    const frame = readFrame(buffer, this.wsMaxPayload);
    if (!frame || frame.error || frame.opcode !== 0x1) return null;
    return frame.payload.toString('utf8');
  }

  /**
   * Broadcast message to all WebSocket connections on a path
   * @param {string} path - WebSocket path pattern
   * @param {*} message - Message to broadcast
   * @param {string} [excludeId=null] - Connection ID to exclude from broadcast
   */
  broadcast(path, message, excludeId = null) {
    for (const [id, ws] of this.wsConnections) {
      if (id === excludeId) continue;
      if (ws.path === path || (path === '*' && ws.path)) {
        try {
          ws.send(message);
        } catch {
          console.error('Failed to send message to connection:', id);
        }
      }
    }
  }

  /**
   * Get active WebSocket connections
   * @returns {Array} Array of connection info
   */
  getWebSocketConnections() {
    return Array.from(this.wsConnections.entries()).map(([id, ws]) => ({
      id,
      path: ws.path,
      params: ws.params,
      readyState: ws.readyState
    }));
  }

  /**
   * Get version from request
   * @param {Object} req - Request object
   * @returns {string} API version
   * @private
   */
  getRequestVersion(req) {
    // Check header first
    if (req.headers[this.versionHeader]) {
      return req.headers[this.versionHeader];
    }

    // Check URL path for version prefix (e.g., /v1/users)
    const pathMatch = req.url.match(/^\/v(\d+)/);
    if (pathMatch) {
      return `v${pathMatch[1]}`;
    }

    // Check query parameter
    if (req.query && req.query.version) {
      return req.query.version;
    }

    return this.defaultVersion;
  }

  /**
   * Generate URL for named route with parameter substitution
   *
   * @param {string} name - Route name (set during route registration)
   * @param {Object} [params={}] - Parameters to substitute in the URL pattern
   * @returns {string} Generated URL with parameters substituted
   * @throws {Error} If named route is not found
   *
   * @example
   * // Route registered as: router.addRoute('GET', '/users/:id', handler, { name: 'getUser' })
   * const url = router.url('getUser', { id: 123 }); // '/users/123'
   *
   * // With constrained parameters
   * const url = router.url('getUserPosts', { userId: 123, postId: 456 }); // '/users/123/posts/456'
   */
  generateUrl(name, params = {}) {
    const route = this.namedRoutes.get(name);
    if (!route) {
      throw new Error(`Named route '${name}' not found`);
    }

    let url = route.path;

    // Replace parameters in the URL
    for (const [key, value] of Object.entries(params)) {
      // Handle both simple params (:key) and constrained params (:key(regex))
      const paramPattern = new RegExp(`:${key}(\\([^)]+\\))?`, 'g');
      url = url.replace(paramPattern, encodeURIComponent(value));
    }

    return url;
  }

  /**
   * Add routes from configuration object
   *
   * @param {Object} routeConfig - Route configuration object with nested structure
   * @description Processes nested route objects and registers HTTP and WebSocket routes.
   * Supports declarative route definition with automatic method detection.
   *
   * @example
   * router.addRoutes({
   *   'api': {
   *     'users': {
   *       GET: (req, res) => ({ users: [] }),
   *       POST: (req, res) => ({ created: true })
   *     }
   *   }
   * });
   */
  addRoutes(routeConfig) {
    processRoutes(routeConfig, this);
  }

  /**
   * Add global middleware to the router
   *
   * @param {Function|Object} middleware - Middleware function or conditional middleware object
   * @description Adds middleware that runs before all route handlers. Supports both
   * simple functions and conditional middleware objects.
   *
   * @example
   * // Simple middleware
   * router.use((req, res) => {
   *   console.log(`${req.method} ${req.url}`);
   * });
   *
   * // Conditional middleware
   * router.use({
   *   condition: (req) => req.url.startsWith('/api'),
   *   middleware: authMiddleware,
   *   name: 'apiAuth'
   * });
   */
  use(middleware) {
    if (typeof middleware === 'function') {
      this.globalMiddleware.push(middleware);
    } else if (middleware && typeof middleware === 'object') {
      // Conditional middleware: { condition, middleware, name }
      this.globalMiddleware.push(this.createConditionalMiddleware(middleware));
    }
  }

  /**
   * Create conditional middleware wrapper
   * @param {Object} config - Conditional middleware configuration
   * @returns {Function} Wrapped middleware function
   * @private
   */
  createConditionalMiddleware(config) {
    const { condition, middleware } = config;

    // Declared with `next` so the chain waits on it: the wrapped middleware
    // may itself be Express-style and continue asynchronously.
    return async (req, res, next) => {
      // Evaluate condition
      let shouldExecute = false;

      if (typeof condition === 'function') {
        shouldExecute = await condition(req, res);
      } else if (typeof condition === 'object') {
        // Object-based conditions
        shouldExecute = this.evaluateConditionObject(condition, req);
      } else {
        shouldExecute = !!condition;
      }

      if (!shouldExecute) {
        next(); // Skip middleware
        return undefined;
      }

      const { result, proceed } = await runMiddleware(middleware, req, res);
      if (proceed) next();
      return result;
    };
  }

  /**
   * Evaluate condition object
   * @param {Object} condition - Condition object
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {boolean} Whether condition is met
   * @private
   */
  evaluateConditionObject(condition, req) {
    const { method, path, header, query, body, user } = condition;

    // Method condition
    if (method && !this.matchCondition(req.method, method)) return false;

    // Path condition
    if (path && !this.matchCondition(req.url, path)) return false;

    // Header condition
    if (header) {
      for (const [key, value] of Object.entries(header)) {
        if (!this.matchCondition(req.headers[key.toLowerCase()], value)) return false;
      }
    }

    // Query condition
    if (query && req.query) {
      for (const [key, value] of Object.entries(query)) {
        if (!this.matchCondition(req.query[key], value)) return false;
      }
    }

    // Body condition
    if (body && req.body) {
      for (const [key, value] of Object.entries(body)) {
        if (!this.matchCondition(req.body[key], value)) return false;
      }
    }

    // User condition (for auth-based conditions)
    if (user && req.user) {
      for (const [key, value] of Object.entries(user)) {
        if (!this.matchCondition(req.user[key], value)) return false;
      }
    }

    return true;
  }

  /**
   * Match condition value
   * @param {*} actual - Actual value
   * @param {*} expected - Expected value or condition
   * @returns {boolean} Whether condition matches
   * @private
   */
  matchCondition(actual, expected) {
    if (expected instanceof RegExp) {
      return expected.test(String(actual || ''));
    }

    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }

    if (typeof expected === 'function') {
      return expected(actual);
    }

    return actual === expected;
  }

  /**
   * Create a route group with shared middleware and prefix
   * @param {string} prefix - Path prefix for the group
   * @param {Function|Array} middleware - Shared middleware
   * @param {Function} callback - Function to define routes in the group
   */
  group(prefix, middleware, callback) {
    const group = {
      prefix: prefix.startsWith('/') ? prefix : `/${prefix}`,
      middleware: Array.isArray(middleware) ? middleware : [middleware]
    };

    this.routeGroups.push(group);
    callback(this);
    this.routeGroups.pop();

    return this;
  }

  /**
   * Get current route prefix from active groups
   * @private
   */
  getCurrentPrefix() {
    return this.routeGroups.map(g => g.prefix).join('');
  }

  /**
   * Get current group middleware
   * @private
   */
  getCurrentGroupMiddleware() {
    return this.routeGroups.flatMap(g => g.middleware);
  }

  /**
   * Compile route pattern into optimized regex
   * @param {string} pattern - Route pattern to compile
   * @returns {Object} Compiled route object with regex and parameter names
   * @private
   */
  compileRoute(pattern) {
    // Check compilation cache first with LRU access
    if (this.routeCompilationCache.has(pattern)) {
      if (this.enableMetrics) this.metrics.compilationHits++;

      // LRU: Move to end (most recently used)
      const compiled = this.routeCompilationCache.get(pattern);
      this.routeCompilationCache.delete(pattern);
      this.routeCompilationCache.set(pattern, compiled);

      return compiled;
    }

    const compiled = compilePattern(pattern);

    // Cache the compiled route with LRU eviction
    if (this.routeCompilationCache.size >= this.maxCompilationCacheSize) {
      // LRU: Remove first (least recently used) item
      const firstKey = this.routeCompilationCache.keys().next().value;
      this.routeCompilationCache.delete(firstKey);
    }
    this.routeCompilationCache.set(pattern, compiled);

    return compiled;
  }

  /**
   * Match path using compiled route
   * @param {Object} compiledRoute - Compiled route object
   * @param {string} path - Path to match
   * @returns {Object|null} Parameters object (URL-decoded, new on every call) or null if no match
   * @private
   */
  matchCompiledRoute(compiledRoute, path) {
    return matchCompiled(compiledRoute, path);
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics object
   */
  getMetrics() {
    if (!this.enableMetrics) {
      throw new Error('Metrics collection is disabled. Enable with { enableMetrics: true }');
    }

    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      ...this.metrics,
      averageResponseTime: Math.round(avgResponseTime * 100) / 100,
      cacheHitRate: this.metrics.requests > 0 ? `${(this.metrics.cacheHits / this.metrics.requests * 100).toFixed(2)  }%` : '0%',
      compilationHitRate: this.metrics.requests > 0 ? `${(this.metrics.compilationHits / this.metrics.requests * 100).toFixed(2)  }%` : '0%'
    };
  }

  /**
   * Get compilation statistics
   * @returns {Object} Compilation statistics
   */
  getCompilationStats() {
    const totalRoutes = this.routes.length;
    const compiledRoutes = this.routes.filter(r => r.compiled).length;
    const compilationCacheSize = this.routeCompilationCache.size;

    return {
      totalRoutes,
      compiledRoutes,
      compilationEnabled: this.enableCompilation,
      compilationCacheSize,
      compilationCacheHits: this.enableMetrics ? this.metrics.compilationHits : 'N/A (metrics disabled)'
    };
  }

  /**
   * Clear route cache (useful for development)
   */
  clearCache() {
    this.routeCache.clear();
  }

  /**
   * Clear compilation cache
   */
  clearCompilationCache() {
    this.routeCompilationCache.clear();
  }

  /**
   * Get all registered routes with detailed information
   * @returns {Array} Array of route information objects
   */
  getRoutes() {
    return this.routes.map(route => ({
      method: route.method,
      path: route.path,
      name: route.name || null,
      hasMiddleware: route.middleware && route.middleware.length > 0,
      middlewareCount: route.middleware ? route.middleware.length : 0,
      compiled: !!route.compiled,
      compiledPattern: route.compiled ? route.compiled.regex.source : null,
      paramNames: route.compiled ? route.compiled.paramNames : null
    }));
  }

  /**
   * Find routes matching a pattern or method
   * @param {Object} criteria - Search criteria
   * @returns {Array} Matching routes
   */
  findRoutes(criteria = {}) {
    const { method, path, name, hasMiddleware } = criteria;

    return this.routes.filter(route => {
      if (method && route.method !== method.toUpperCase()) return false;
      if (path && !route.path.includes(path)) return false;
      if (name && route.name !== name) return false;
      if (hasMiddleware !== undefined && !!route.middleware?.length !== hasMiddleware) return false;
      return true;
    }).map(route => ({
      method: route.method,
      path: route.path,
      name: route.name || null,
      middlewareCount: route.middleware ? route.middleware.length : 0
    }));
  }

  /**
   * Test route matching without executing handlers
   * @param {string} method - HTTP method
   * @param {string} path - Path to test
   * @returns {Object} Match result with route info and extracted parameters
   */
  testRoute(method, path) {
    const upperMethod = method.toUpperCase();

    for (const route of this.routes) {
      if (route.method === upperMethod) {
        let params = null;

        // Use compiled route if available
        if (this.enableCompilation && route.compiled) {
          params = this.matchCompiledRoute(route.compiled, path);
        } else {
          params = extractParams(route.path, path);
        }

        if (params !== null) {
          return {
            matched: true,
            route: {
              method: route.method,
              path: route.path,
              name: route.name || null,
              middlewareCount: route.middleware ? route.middleware.length : 0
            },
            params,
            compiledUsed: this.enableCompilation && !!route.compiled
          };
        }
      }
    }

    return { matched: false, route: null, params: null };
  }

  /**
   * Get router debug information
   * @returns {Object} Comprehensive debug information
   */
  getDebugInfo() {
    const routesByMethod = {};
    const namedRoutes = {};

    // Group routes by method
    this.routes.forEach(route => {
      if (!routesByMethod[route.method]) {
        routesByMethod[route.method] = [];
      }
      routesByMethod[route.method].push({
        path: route.path,
        name: route.name,
        middlewareCount: route.middleware ? route.middleware.length : 0,
        compiled: !!route.compiled
      });
    });

    // Get named routes
    this.namedRoutes.forEach((routeInfo, name) => {
      namedRoutes[name] = routeInfo;
    });

    return {
      totalRoutes: this.routes.length,
      routesByMethod,
      namedRoutes,
      globalMiddleware: this.globalMiddleware.length,
      activeGroups: this.routeGroups.length,
      cacheSize: this.routeCache.size,
      maxCacheSize: this.maxCacheSize,
      compilationEnabled: this.enableCompilation,
      compilationCacheSize: this.routeCompilationCache.size,
      metricsEnabled: this.enableMetrics
    };
  }

  /**
   * Find the route for a method and path.
   *
   * Matches are cached per method, path and (with versioning) API version:
   * the cache used to ignore the version, so once a v1 request was cached a
   * v2 request for the same path got the v1 handler. The cached parameters
   * are copied for every request, since the cache used to hand out one
   * shared object and a handler mutating `req.params` changed it for every
   * later request.
   *
   * @private
   * @param {string} method - HTTP method
   * @param {string} pathname - Request path
   * @param {string|null} requestVersion - API version, when versioning is on
   * @returns {{ route: Object, params: Object }|null}
   */
  findRoute(method, pathname, requestVersion) {
    const cacheKey = this.enableVersioning
      ? `${method}:${requestVersion}:${pathname}`
      : `${method}:${pathname}`;

    const cached = this.routeCache.get(cacheKey);
    if (cached) {
      if (this.enableMetrics) this.metrics.cacheHits++;
      return { route: cached.route, params: { ...cached.params } };
    }

    // Smart routing: check static routes first for O(1) lookup
    if (this.enableSmartRouting) {
      const staticRoute = this.staticRoutes.get(`${method}:${pathname}`);

      // Skip route if versioning is enabled and versions don't match
      if (staticRoute && (!this.enableVersioning || staticRoute.version === requestVersion)) {
        // Track static route performance
        if (this.enableRouteMetrics && this.enableMetrics) {
          this.metrics.staticRouteMatches = (this.metrics.staticRouteMatches || 0) + 1;
        }
        return { route: staticRoute, params: {} }; // Static routes have no parameters
      }
    }

    // Fallback to dynamic route matching if no static match found
    const routesToSearch = this.enableVersioning && this.versionedRoutes.has(requestVersion)
      ? this.versionedRoutes.get(requestVersion)
      : this.routes;

    for (const route of routesToSearch) {
      if (route.method !== method) continue;
      // Skip route if versioning is enabled and versions don't match
      if (this.enableVersioning && route.version !== requestVersion) continue;

      const params = this.enableCompilation && route.compiled
        ? this.matchCompiledRoute(route.compiled, pathname)
        : extractParams(route.path, pathname);

      if (params !== null) {
        // Track dynamic route performance
        if (this.enableRouteMetrics && this.enableMetrics) {
          this.metrics.dynamicRouteMatches = (this.metrics.dynamicRouteMatches || 0) + 1;
        }

        // Cache the match if under size limit
        if (this.routeCache.size < this.maxCacheSize) {
          this.routeCache.set(cacheKey, { route, params: { ...params } });
        }
        return { route, params };
      }
    }

    return null;
  }

  /**
   * Resolve the CORS policy for a request, honouring a per-call override.
   *
   * @private
   * @param {string|string[]|undefined} corsOrigin - Override from handle() options
   * @returns {{origins: string[], allowCredentials: boolean, explicit: boolean}}
   */
  corsPolicyFor(corsOrigin) {
    if (corsOrigin === undefined || corsOrigin === null) return this.corsPolicy;
    if (corsOrigin === this.corsOriginRaw) return this.corsPolicy;
    return resolveCorsPolicy(corsOrigin);
  }

  async handle(req, res, options = {}) {
    const startTime = Date.now();

    // Router-level options (rateLimit, maxBodySize...) apply to direct
    // handle() calls too, not only to createServer(); per-call options win.
    options = { ...this.defaultOptions, ...options };

    // Metrics collection
    if (this.enableMetrics) {
      this.metrics.requests++;
    }

    const {
      corsOrigin,
      rateLimit = { windowMs: 60000, maxRequests: 100 },
      trustProxy = this.trustProxy
    } = options;

    // Add security headers conditionally for performance optimization
    if (this.enableSecurityHeaders) {
      addSecurityHeaders(res);
      applyCorsHeaders(req, res, this.corsPolicyFor(corsOrigin));
    } else if (this.enableCORS) {
      // Only add CORS headers if security headers are disabled but CORS is enabled
      applyCorsHeaders(req, res, this.corsPolicyFor(corsOrigin));
    }

    // Parse URL and query parameters
    const parsedUrl = parseUrl(req.url, true);
    const pathname = parsedUrl.pathname;
    if (!req.query) {
      req.query = parsedUrl.query || {};
    }

    // Get request version if versioning is enabled
    const requestVersion = this.enableVersioning ? this.getRequestVersion(req) : null;

    // Answer CORS preflights with 204, unless the application registered an
    // OPTIONS route for this path: router.options() handlers used to be
    // unreachable.
    if (req.method === 'OPTIONS' && !this.findRoute('OPTIONS', pathname, requestVersion)) {
      res.writeHead(204);
      res.end();
      return;
    }

    // Rate limiting (`rateLimit: false` turns it off)
    if (rateLimit) {
      const key = typeof rateLimit.keyGenerator === 'function'
        ? String(rateLimit.keyGenerator(req))
        : clientAddress(req, trustProxy);
      const { allowed, resetTime } = this.rateLimiter.hit(key, rateLimit.windowMs, rateLimit.maxRequests);
      if (!allowed) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)))
        });
        res.end(JSON.stringify({ error: 'Too Many Requests' }));
        return;
      }
    }

    // Parse request body with size limits
    try {
      req.body = await parseBody(req, options.maxBodySize);
    } catch (_error) {
      if (this.enableMetrics) this.metrics.errors++;
      // The client went away mid-body: there is nobody to answer.
      if (_error.code === 'ECONNABORTED' || responseStarted(res) || responseClosed(res)) return;
      const statusCode = _error.statusCode === 413 ? 413 : 400;
      const headers = { 'Content-Type': 'application/json' };
      // Do not keep reading an oversized upload on this connection.
      if (statusCode === 413) headers.Connection = 'close';
      res.writeHead(statusCode, headers);
      res.end(JSON.stringify({ error: _error.message }));
      return;
    }

    // Track version requests in metrics
    if (this.enableMetrics && requestVersion) {
      this.metrics.versionRequests.set(requestVersion, (this.metrics.versionRequests.get(requestVersion) || 0) + 1);
    }

    // HEAD falls back to the GET route; node:http drops the body of a HEAD
    // response, so the headers (status, Content-Type) are the GET ones.
    const matchedRoute = this.findRoute(req.method, pathname, requestVersion)
      ?? (req.method === 'HEAD' ? this.findRoute('GET', pathname, requestVersion) : null);

    if (matchedRoute) {
      req.params = matchedRoute.params;
      requestErrorExposure.set(req, options.exposeErrors ?? this.exposeErrors);

      // Record route match metrics
      if (this.enableMetrics) {
        const routeKey = `${req.method}:${matchedRoute.route.path}`;
        this.metrics.routeMatches.set(routeKey, (this.metrics.routeMatches.get(routeKey) || 0) + 1);
      }

      try {
        // Execute middleware chain. A middleware that has written a response
        // (withAuth's 401, withRole's 403, withInputValidation's 400) has
        // rejected the request, so the handler must not run after it.
        const { route } = matchedRoute;
        let result;
        let handled = false;
        if (route.middleware && route.middleware.length > 0) {
          for (const middleware of route.middleware) {
            const { result: outcome, proceed } = await runMiddleware(middleware, req, res);
            if (!proceed) {
              handled = true;
              break;
            }
            if (outcome && (typeof outcome === 'object' || typeof outcome === 'string')) {
              // Middleware returned the response body itself.
              result = outcome;
              handled = true;
              break;
            }
            if (outcome) break; // Skip the remaining middleware
          }
        }

        // Execute handler
        if (!handled) {
          result = await route.handler(req, res);
        }

        // Only write response if handler returned data and response hasn't been sent
        if (result && !res.headersSent) {
          if (typeof result === 'object') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } else if (typeof result === 'string') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(result);
          }
        }

        // Record response time (thread-safe)
        if (this.enableMetrics) {
          const responseTime = Date.now() - startTime;
          // Use atomic-like operations to avoid race conditions
          if (!this._metricsLock) {
            this._metricsLock = Promise.resolve();
          }

          this._metricsLock = this._metricsLock.then(() => {
            this.metrics.responseTime.push(responseTime);
            // Keep only last 1000 response times to prevent memory growth
            if (this.metrics.responseTime.length > 1000) {
              this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
            }
          });
        }
        return;
      } catch (_error) {
        if (this.enableMetrics) this.metrics.errors++;
        sendError(req, res, _error, options.exposeErrors ?? this.exposeErrors);
        return;
      }
    }

    // No route found
    if (this.enableMetrics) this.metrics.errors++;
    if (!res.headersSent) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  createServer(options = {}) {
    const mergedOptions = { ...this.defaultOptions, ...options };
    return createServer((req, res) => this.handle(req, res, mergedOptions));
  }

  // HTTP convenience methods
  get(path, handler, options = {}) {
    return this.addRoute('GET', path, handler, options);
  }

  post(path, handler, options = {}) {
    return this.addRoute('POST', path, handler, options);
  }

  put(path, handler, options = {}) {
    return this.addRoute('PUT', path, handler, options);
  }

  patch(path, handler, options = {}) {
    return this.addRoute('PATCH', path, handler, options);
  }

  delete(path, handler, options = {}) {
    return this.addRoute('DELETE', path, handler, options);
  }

  options(path, handler, options = {}) {
    return this.addRoute('OPTIONS', path, handler, options);
  }

  head(path, handler, options = {}) {
    return this.addRoute('HEAD', path, handler, options);
  }

  /**
   * Convert to Express Router middleware
   *
   * @param {Object} express - Express module (required)
   * @returns {Function} Express-compatible router middleware
   *
   * @example
   * import express from 'express';
   * const router = createRouter();
   * router.get('/users', handler);
   * app.use('/api', router.toExpressRouter(express));
   */
  toExpressRouter(express) {
    if (!express || typeof express.Router !== 'function') {
      throw new Error('Express is required for toExpressRouter(). Pass the express module as argument: router.toExpressRouter(express)');
    }

    const expressRouter = express.Router();

    // Register all routes on the Express router
    for (const route of this.routes) {
      const method = route.method.toLowerCase();
      const path = route.path;
      const handler = route.handler;
      const middleware = route.middleware || [];

      // Create Express-compatible handler that adapts the Coherent.js handler
      const expressHandler = async (req, res, next) => {
        try {
          // Apply Coherent.js middleware. Both `(req, res) => value` and
          // `(req, res, next)` styles are accepted; waiting on next() alone
          // hung forever on the former.
          let result;
          let handled = false;
          for (const mw of middleware) {
            const outcome = await runMiddleware(mw, req, res);
            if (!outcome.proceed) return;
            if (outcome.result && (typeof outcome.result === 'object' || typeof outcome.result === 'string')) {
              result = outcome.result;
              handled = true;
              break;
            }
          }

          // Call the handler
          if (!handled) {
            result = await handler(req, res);
          }

          // If result is returned and response not sent, send as JSON
          if (result !== undefined && !res.headersSent) {
            res.json(result);
          }
        } catch (error) {
          next(error);
        }
      };

      // Register route on Express router
      if (typeof expressRouter[method] === 'function') {
        expressRouter[method](path, expressHandler);
      }
    }

    return expressRouter;
  }
}

/**
 * Creates an object-based router from nested route definitions
 *
 * @param {Object} routes - Nested route definition object
 * @param {Object} options - Router options (corsOrigin, rateLimit, maxBodySize)
 * @returns {Object} Configured router instance
 *
 * @example
 * const routes = {
 *   api: {
 *     users: {
 *       get: { handler: () => ({ users: [] }) },
 *       post: {
 *         validation: userSchema,
 *         handler: (req) => ({ user: req.body })
 *       }
 *     }
 *   }
 * };
 *
 * const router = createRouter(routes, {
 *   corsOrigin: 'https://myapp.com',
 *   rateLimit: { windowMs: 60000, maxRequests: 50 }
 * });
 * const server = router.createServer();
 * server.listen(3000);
 */
/**
 * Factory function to create a SimpleRouter instance
 *
 * @param {Object} options - Router options
 * @returns {SimpleRouter} Router instance
 */
export function createSimpleRouter(options = {}) {
  return new SimpleRouter(options);
}

export function createRouter(routeConfig, options = {}) {
  const router = new SimpleRouter(options);
  router.defaultOptions = options; // Store default options

  if (routeConfig) {
    router.addRoutes(routeConfig);
  }

  return router;
}

export { SimpleRouter };
export default createRouter;
