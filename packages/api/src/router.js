/**
 * Object-based Router for Coherent.js API framework
 * Pure object-oriented approach to backend API routing
 * 
 * @fileoverview Transforms nested JavaScript objects into API routes with
 * middleware, validation, and error handling support.
 * 
 * @author Coherent.js Team
 * @version 1.0.0
 */

import { createHash, randomBytes } from 'node:crypto';

import { withValidation } from './validation.js';
import { withErrorHandling } from './errors.js';
import { createServer } from 'node:http';
import { parse as parseUrl } from 'node:url';

/**
 * HTTP methods supported by the object router
 * @private
 */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Parse JSON request body with security limits
 * @private
 */
function parseBody(req, maxSize = 1024 * 1024) { // 1MB limit
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      resolve({});
      return;
    }
    
    let body = '';
    let size = 0;
    
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          const parsed = body ? JSON.parse(body) : {};
          // Basic input sanitization
          resolve(sanitizeInput(parsed));
        } else {
          resolve({});
        }
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    
    req.on('error', reject);
  });
}

/**
 * Basic input sanitization
 * @private
 */
function sanitizeInput(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Remove potentially dangerous keys
    if (key.startsWith('__') || key.includes('prototype')) continue;
    
    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value.replace(/<script[^>]*>.*?<\/script>/gi, '')
                           .replace(/javascript:/gi, '')
                           .replace(/on\w+=/gi, '');
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Rate limiting store
 * @private
 */
const rateLimitStore = new Map();

/**
 * Rate limiting middleware for API endpoints
 * @private
 * @param {string} ip - Client IP address
 * @param {number} [windowMs=60000] - Time window in milliseconds
 * @param {number} [maxRequests=100] - Maximum requests per window
 * @returns {boolean} True if request is allowed, false if rate limited
 */
function checkRateLimit(ip, windowMs = 60000, maxRequests = 100) {
  const now = Date.now();
  const key = ip;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const record = rateLimitStore.get(key);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Add comprehensive security headers to HTTP response
 * @private
 * @param {Object} res - HTTP response object
 * @param {string|null} [corsOrigin=null] - CORS origin, defaults to localhost:3000
 */
function addSecurityHeaders(res, corsOrigin = null) {
  // CORS headers - configurable origin
  const origin = corsOrigin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Extract parameters from URL path with constraint support
 * @private
 * @param {string} pattern - URL pattern with parameters (e.g., '/users/:id(\\d+)')
 * @param {string} path - Actual URL path to match
 * @returns {Object|null} Extracted parameters object or null if no match
 * @example
 * extractParams('/users/:id(\\d+)', '/users/123') // { id: '123' }
 * extractParams('/users/:id?', '/users') // {}
 */
function extractParams(pattern, path) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  const params = {};
  
  // Handle wildcard patterns that can match different lengths
  const hasMultiWildcard = patternParts.includes('**');
  const hasSingleWildcard = patternParts.includes('*');
  
  if (!hasMultiWildcard && !hasSingleWildcard && patternParts.length !== pathParts.length) {
    return null;
  }
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    
    if (patternPart.startsWith(':')) {
      // Parse parameter with optional constraint: :name(regex) or :name?
      const match = patternPart.match(/^:([^(]+)(\(([^)]+)\))?(\?)?$/);
      if (match) {
        const [, paramName, , constraint, optional] = match;
        
        // Check if parameter is optional and path part is missing
        if (optional && !pathPart) {
          continue;
        }
        
        // Apply constraint if present
        if (constraint) {
          const regex = new RegExp(`^${constraint}$`);
          if (!regex.test(pathPart)) {
            return null; // Constraint failed
          }
        }
        
        params[paramName] = pathPart;
      } else {
        // Fallback to simple parameter
        params[patternPart.slice(1)] = pathPart;
      }
    } else if (patternPart === '*') {
      // Single wildcard - matches one segment
      params.splat = pathPart;
    } else if (patternPart === '**') {
      // Multi-segment wildcard - matches remaining path
      params.splat = pathParts.slice(i).join('/');
      return params; // ** consumes rest of path
    } else if (patternPart !== pathPart) {
      return null;
    }
  }
  
  return params;
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

  // Apply error handling
  if (errorHandling) {
    chain.forEach((fn, i) => {
      chain[i] = withErrorHandling(fn);
    });
  }

  // Register route with name option
  router.addRoute(method, routePath, async (req, res) => {
    try {
      // Execute middleware and handler chain
      let result = null;
      for (const fn of chain) {
        result = await fn(req, res);
        if (result && typeof result === 'object') {
          break;
        }
      }
      
      if (result && typeof result === 'object') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } else {
        res.writeHead(204);
        res.end();
      }
    } catch (error) {
      const statusCode = error.statusCode || 500;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }, { name });
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
      compiled: this.enableCompilation ? this.compileRoute(fullPath) : null
    };
    
    this.wsRoutes.push(wsRoute);
    
    if (options.name) {
      this.namedRoutes.set(options.name, { method: 'WS', path: fullPath, version: wsRoute.version });
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

    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;
    
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
      // Call the route handler's close callback before cleanup
      if (matchedRoute.route.handler.onClose) {
        matchedRoute.route.handler.onClose(ws);
      }
      
      // Store connection info before deletion for potential use in handlers
      // const connectionInfo = { id: connectionId, path: ws.path };
      
      // Fire any custom close handlers set by the route handler
      if (ws.onclose) {
        try {
          ws.onclose();
        } catch (error) {
          console.error('WebSocket onclose handler error:', error);
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
    }
  }

  /**
   * Create WebSocket wrapper with message handling
   * @param {Object} socket - Raw socket
   * @param {Object} matchedRoute - Matched route info
   * @returns {Object} WebSocket wrapper
   * @private
   */
  createWebSocketWrapper(socket) {
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
        const payloadLength = payload.length;
        
        let frame;
        if (payloadLength < 126) {
          frame = Buffer.allocUnsafe(2 + payloadLength);
          frame[0] = 0x81; // FIN + text frame
          frame[1] = payloadLength;
          payload.copy(frame, 2);
        } else if (payloadLength < 65536) {
          frame = Buffer.allocUnsafe(4 + payloadLength);
          frame[0] = 0x81;
          frame[1] = 126;
          frame.writeUInt16BE(payloadLength, 2);
          payload.copy(frame, 4);
        } else {
          frame = Buffer.allocUnsafe(10 + payloadLength);
          frame[0] = 0x81;
          frame[1] = 127;
          frame.writeUInt32BE(0, 2);
          frame.writeUInt32BE(payloadLength, 6);
          payload.copy(frame, 10);
        }
        
        return frame;
      },
      
      createCloseFrame(code, reason) {
        const reasonBuffer = Buffer.from(reason, 'utf8');
        const frame = Buffer.allocUnsafe(4 + reasonBuffer.length);
        frame[0] = 0x88; // FIN + close frame
        frame[1] = 2 + reasonBuffer.length;
        frame.writeUInt16BE(code, 2);
        reasonBuffer.copy(frame, 4);
        return frame;
      },
      
      createPingFrame(data) {
        const frame = Buffer.allocUnsafe(2 + data.length);
        frame[0] = 0x89; // FIN + ping frame
        frame[1] = data.length;
        data.copy(frame, 2);
        return frame;
      }
    };
    
    ws.router = this;
    
    // Handle incoming messages
    socket.on('data', (buffer) => {
      try {
        const message = this.parseWebSocketFrame(buffer);
        if (message && ws.onmessage) {
          ws.onmessage({ data: message });
        }
      } catch {
      }
    });
    
    // Handle socket errors
    socket.on('error', (err) => {
      console.log('WebSocket socket error (connection likely closed):', err.code);
      // Don't re-throw the error, just log it
    });
    
    return ws;
  }

  /**
   * Parse WebSocket frame
   * @param {Buffer} buffer - Raw frame data
   * @returns {string|null} Parsed message
   * @private
   */
  parseWebSocketFrame(buffer) {
    if (buffer.length < 2) return null;
    
    const firstByte = buffer[0];
    const secondByte = buffer[1];
    
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    
    // Handle close frame (opcode 8)
    if (opcode === 8) {
      return null; // Close frame, don't process as message
    }
    
    // Only process text frames (opcode 1)
    if (opcode !== 1) {
      return null;
    }
    
    let offset = 2;
    
    if (payloadLength === 126) {
      if (buffer.length < offset + 2) return null;
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      if (buffer.length < offset + 8) return null;
      payloadLength = buffer.readUInt32BE(offset + 4); // Ignore high 32 bits
      offset += 8;
    }
    
    if (masked) {
      if (buffer.length < offset + 4 + payloadLength) return null;
      const maskKey = buffer.slice(offset, offset + 4);
      offset += 4;
      
      const payload = buffer.slice(offset, offset + payloadLength);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
      
      return payload.toString('utf8');
    }
    
    if (buffer.length < offset + payloadLength) return null;
    return buffer.slice(offset, offset + payloadLength).toString('utf8');
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
          console.log('Failed to send message to connection:', id);
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
    
    return async (req, res) => {
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
      
      if (shouldExecute) {
        return await middleware(req, res);
      }
      
      return null; // Skip middleware
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
    // Check compilation cache first
    if (this.routeCompilationCache.has(pattern)) {
      if (this.enableMetrics) this.metrics.compilationHits++;
      return this.routeCompilationCache.get(pattern);
    }

    const paramNames = [];
    let regexPattern = pattern;

    // Handle wildcards first
    if (pattern.includes('**')) {
      regexPattern = regexPattern.replace(/\/\*\*/g, '/(.*)');
      paramNames.push('splat');
    } else if (pattern.includes('*')) {
      regexPattern = regexPattern.replace(/\/\*/g, '/([^/]+)');
      paramNames.push('splat');
    }

    // Handle parameters with constraints and optional parameters
    regexPattern = regexPattern.replace(/:([^(/]+)(\([^)]+\))?(\?)?/g, (match, paramName, constraint, optional) => {
      paramNames.push(paramName);
      
      if (constraint) {
        // Use the constraint pattern directly
        const constraintPattern = constraint.slice(1, -1); // Remove parentheses
        return optional ? `(?:/(?:${constraintPattern}))?` : `/(${constraintPattern})`;
      } else {
        // Default parameter pattern
        return optional ? '(?:/([^/]+))?' : '/([^/]+)';
      }
    });

    // Escape special regex characters except those we want to keep
    regexPattern = regexPattern
      .replace(/[.+?^${}|[\]\\]/g, '\\$&')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\?/g, '?');

    // Ensure exact match
    regexPattern = `^${regexPattern}$`;

    const compiled = {
      regex: new RegExp(regexPattern),
      paramNames,
      pattern
    };

    // Cache the compiled route
    if (this.routeCompilationCache.size < 1000) {
      this.routeCompilationCache.set(pattern, compiled);
    }

    return compiled;
  }

  /**
   * Match path using compiled route
   * @param {Object} compiledRoute - Compiled route object
   * @param {string} path - Path to match
   * @returns {Object|null} Parameters object or null if no match
   * @private
   */
  matchCompiledRoute(compiledRoute, path) {
    const match = compiledRoute.regex.exec(path);
    if (!match) return null;

    const params = {};
    for (let i = 0; i < compiledRoute.paramNames.length; i++) {
      const paramName = compiledRoute.paramNames[i];
      const value = match[i + 1];
      if (value !== undefined) {
        params[paramName] = value;
      }
    }

    return params;
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

  async handle(req, res, options = {}) {
    const startTime = Date.now();
    
    // Metrics collection
    if (this.enableMetrics) {
      this.metrics.requests++;
    }
    
    const { corsOrigin, rateLimit = { windowMs: 60000, maxRequests: 100 } } = options;
    
    // Add security headers
    addSecurityHeaders(res, corsOrigin);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP, rateLimit.windowMs, rateLimit.maxRequests)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too Many Requests' }));
      return;
    }
    
    // Parse URL and query parameters
    const parsedUrl = parseUrl(req.url, true);
    const pathname = parsedUrl.pathname;
    req.query = parsedUrl.query || {};
    
    // Parse request body with size limits
    try {
      req.body = await parseBody(req, options.maxBodySize);
    } catch (error) {
      if (this.enableMetrics) this.metrics.errors++;
      const statusCode = error.message.includes('too large') ? 413 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
      return;
    }
    
    // Check route cache first
    const cacheKey = `${req.method}:${pathname}`;
    let matchedRoute = this.routeCache.get(cacheKey);
    
    if (matchedRoute && this.enableMetrics) {
      this.metrics.cacheHits++;
    }
    
    if (!matchedRoute) {
      // Get request version if versioning is enabled
      const requestVersion = this.enableVersioning ? this.getRequestVersion(req) : null;
      
      // Track version requests in metrics
      if (this.enableMetrics && requestVersion) {
        this.metrics.versionRequests.set(requestVersion, (this.metrics.versionRequests.get(requestVersion) || 0) + 1);
      }
      
      // Find matching route using compiled patterns or fallback to extractParams
      const routesToSearch = this.enableVersioning && this.versionedRoutes.has(requestVersion) 
        ? this.versionedRoutes.get(requestVersion) 
        : this.routes;
      
      for (const route of routesToSearch) {
        if (route.method === req.method) {
          // Skip route if versioning is enabled and versions don't match
          if (this.enableVersioning && route.version !== requestVersion) {
            continue;
          }
          
          let params = null;
          
          // Use compiled route if available
          if (this.enableCompilation && route.compiled) {
            params = this.matchCompiledRoute(route.compiled, pathname);
          } else {
            // Fallback to original parameter extraction
            params = extractParams(route.path, pathname);
          }
          
          if (params !== null) {
            matchedRoute = { route, params };
            
            // Cache the match if under size limit
            if (this.routeCache.size < this.maxCacheSize) {
              this.routeCache.set(cacheKey, matchedRoute);
            }
            break;
          }
        }
      }
    }
    
    if (matchedRoute) {
      req.params = matchedRoute.params;
      
      // Record route match metrics
      if (this.enableMetrics) {
        const routeKey = `${req.method}:${matchedRoute.route.path}`;
        this.metrics.routeMatches.set(routeKey, (this.metrics.routeMatches.get(routeKey) || 0) + 1);
      }
      
      // Log request
      console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);
      
      try {
        // Execute middleware chain
        if (matchedRoute.route.middleware && matchedRoute.route.middleware.length > 0) {
          for (const middleware of matchedRoute.route.middleware) {
            const result = await middleware(req, res);
            if (result) break; // Middleware handled response
          }
        }
        
        // Execute handler
        const { route } = matchedRoute;
        const result = await route.handler(req, res);
        
        // Only write response if handler returned data and response hasn't been sent
        if (result && typeof result === 'object' && !res.headersSent) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
        
        // Record response time
        if (this.enableMetrics) {
          const responseTime = Date.now() - startTime;
          this.metrics.responseTime.push(responseTime);
          // Keep only last 1000 response times to prevent memory growth
          if (this.metrics.responseTime.length > 1000) {
            this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
          }
        }
        return;
      } catch (error) {
        if (this.enableMetrics) this.metrics.errors++;
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
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
 * const router = createObjectRouter(routes, {
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

export function createObjectRouter(routeConfig, options = {}) {
  const router = new SimpleRouter(options);
  router.defaultOptions = options; // Store default options
  
  if (routeConfig) {
    router.addRoutes(routeConfig);
  }
  
  return router;
}

export { SimpleRouter };
export default createObjectRouter;
