/**
 * Middleware system for Coherent.js API framework
 * @fileoverview Common middleware utilities for API routes
 */

/**
 * Creates a custom API middleware with error handling
 * @param {Function} handler - Middleware handler function
 * @returns {Function} Middleware function that catches errors
 */
export function createApiMiddleware(handler) {
  return (req, res, next) => {
    try {
      return handler(req, res, next);
    } catch (error) {
      // Pass errors to next middleware
      next(error);
    }
  };
}

/**
 * Authentication middleware
 * @param {Function} verifyToken - Function to verify authentication token
 * @returns {Function} Middleware function
 */
export function withAuth(verifyToken) {
  return createApiMiddleware((req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing authorization header' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const user = verifyToken(token);
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid token' 
      });
    }
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
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'User not authenticated' 
      });
    }
    
    try {
      const hasPermission = checkPermission(req.user, req);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'Insufficient permissions' 
        });
      }
      
      next();
    } catch {
      return res.status(403).json({ 
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
      return res.status(statusCode).json({
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
