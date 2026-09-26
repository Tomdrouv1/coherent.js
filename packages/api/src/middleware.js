/**
 * Middleware system for Coherent.js API framework
 * @fileoverview Common middleware utilities for API routes
 */

/**
 * Send a JSON response on either an Express response (`status().json()`) or
 * a bare node:http one, so these middleware also work on the Coherent router.
 * @private
 */
function sendJson(res, statusCode, body) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(body);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
  return undefined;
}

/**
 * Creates a custom API middleware with error handling
 *
 * Errors thrown synchronously, and rejections of an async handler, are passed
 * to `next(err)`.
 *
 * @param {Function} handler - Middleware handler function
 * @returns {Function} Middleware function that catches errors
 */
export function createApiMiddleware(handler) {
  return (req, res, next) => {
    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        return result.catch((_error) => next(_error));
      }
      return result;
    } catch (_error) {
      // Pass errors to next middleware
      next(_error);
    }
  };
}

/**
 * Authentication middleware
 *
 * `verifyToken(token)` returns the user for a valid token. A falsy return
 * value (the package's own `verifyToken` answers `null`), a throw, or a
 * rejected promise all mean the token is invalid, and the request gets a 401.
 *
 * @param {Function} verifyToken - `(token) => user | null`, may be async
 * @returns {Function} Middleware function
 * @throws {TypeError} If verifyToken is not a function
 */
export function withAuth(verifyToken) {
  if (typeof verifyToken !== 'function') {
    throw new TypeError(
      '[coherent.js/api] middleware withAuth(verifyToken) expects a function (token) => user | null, ' +
        'e.g. (token) => verifyToken(token, process.env.JWT_SECRET).'
    );
  }

  return createApiMiddleware(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      return sendJson(res, 401, {
        error: 'Unauthorized',
        message: 'Missing authorization header'
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');

    let user = null;
    try {
      user = await verifyToken(token);
    } catch {
      user = null;
    }

    // A verifier that answers null/undefined/false has rejected the token.
    // Calling next() with req.user = null let the request through.
    if (!user) {
      return sendJson(res, 401, {
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }

    req.user = user;
    next();
  });
}

/**
 * Authorization middleware
 * @param {Function} checkPermission - Function to check user permissions
 * @returns {Function} Middleware function
 */
export function withPermission(checkPermission) {
  return createApiMiddleware((req, res, next) => {
    if (!req.user) {
      return sendJson(res, 401, {
        error: 'Unauthorized', 
        message: 'User not authenticated' 
      });
    }
    
    try {
      const hasPermission = checkPermission(req.user, req);
      
      if (!hasPermission) {
        return sendJson(res, 403, {
          error: 'Forbidden', 
          message: 'Insufficient permissions' 
        });
      }
      
      next();
    } catch {
      return sendJson(res, 403, {
        error: 'Forbidden', 
        message: 'Permission check failed' 
      });
    }
  });
}

/**
 * Logging middleware
 * @param {Object} options - Logging options
 * @returns {Function} Middleware function
 */
export function withLogging(options = {}) {
  const { logger = console, level = 'info' } = options;
  
  return createApiMiddleware((req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    logger[level](`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Capture response finish to log completion
    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - startTime;
      logger[level](`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
      return originalSend.call(this, body);
    };
    
    next();
  });
}

/**
 * CORS middleware
 * @param {Object} options - CORS options
 * @returns {Function} Middleware function
 */
export function withCors(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400
  } = options;
  
  return createApiMiddleware((req, res, next) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', origin);
    
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    if (req.method === 'OPTIONS') {
      // Preflight request
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', maxAge.toString());
      res.status(204).send('');
      return;
    }
    
    next();
  });
}

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @returns {Function} Middleware function
 */
export function withRateLimit(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later',
    statusCode = 429
  } = options;
  
  // Store request counts per IP
  const requestCounts = new Map();
  
  // Cleanup old entries periodically (do not keep event loop alive)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
      if (now - record.resetTime > windowMs) {
        requestCounts.delete(ip);
      }
    }
  }, windowMs);
  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }
  
  return createApiMiddleware((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, {
        count: 0,
        resetTime: now + windowMs
      });
    }
    
    const record = requestCounts.get(ip);
    
    // Reset count if window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    
    // Increment count
    record.count++;
    
    // Check if limit exceeded
    if (record.count > max) {
      return sendJson(res, statusCode, {
        error: 'Rate limit exceeded',
        message
      });
    }
    
    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
    
    next();
  });
}

/**
 * Input sanitization middleware
 * @param {Object} options - Sanitization options
 * @returns {Function} Middleware function
 */
export function withSanitization(options = {}) {
  const { 
    sanitizeBody = true, 
    sanitizeQuery = true, 
    sanitizeParams = true 
  } = options;
  
  return createApiMiddleware((req, res, next) => {
    if (sanitizeBody && req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (sanitizeQuery && req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (sanitizeParams && req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  });
}

/**
 * Sanitize an object by escaping HTML entities
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitize a string by escaping HTML entities
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Export middleware utilities
export default {
  createApiMiddleware,
  withAuth,
  withPermission,
  withLogging,
  withCors,
  withRateLimit,
  withSanitization
};
