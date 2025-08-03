/**
 * API Router for Coherent.js
 * A lightweight routing system for API endpoints
 */

/**
 * Create an API router instance
 * @param {Object} options - Router options
 * @returns {Object} Router instance
 */
export function createApiRouter(options = {}) {
  const routes = {
    GET: [],
    POST: [],
    PUT: [],
    DELETE: [],
    PATCH: []
  };
  
  const middlewares = [];
  
  /**
   * Register a middleware function
   * @param {Function} middleware - Middleware function
   * @returns {Object} Router instance
   */
  function use(middleware) {
    middlewares.push(middleware);
    return router;
  }
  
  /**
   * Register a GET route
   * @param {string} path - Route path
   * @param {...Function} handlers - Route handlers
   * @returns {Object} Router instance
   */
  function get(path, ...handlers) {
    routes.GET.push({ path, handlers });
    return router;
  }
  
  /**
   * Register a POST route
   * @param {string} path - Route path
   * @param {...Function} handlers - Route handlers
   * @returns {Object} Router instance
   */
  function post(path, ...handlers) {
    routes.POST.push({ path, handlers });
    return router;
  }
  
  /**
   * Register a PUT route
   * @param {string} path - Route path
   * @param {...Function} handlers - Route handlers
   * @returns {Object} Router instance
   */
  function put(path, ...handlers) {
    routes.PUT.push({ path, handlers });
    return router;
  }
  
  /**
   * Register a DELETE route
   * @param {string} path - Route path
   * @param {...Function} handlers - Route handlers
   * @returns {Object} Router instance
   */
  function deleteRoute(path, ...handlers) {
    routes.DELETE.push({ path, handlers });
    return router;
  }
  
  /**
   * Register a PATCH route
   * @param {string} path - Route path
   * @param {...Function} handlers - Route handlers
   * @returns {Object} Router instance
   */
  function patch(path, ...handlers) {
    routes.PATCH.push({ path, handlers });
    return router;
  }
  
  /**
   * Match a route against a path
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @returns {Object|null} Matched route or null
   */
  function matchRoute(method, path) {
    const methodRoutes = routes[method] || [];
    
    for (const route of methodRoutes) {
      const pattern = route.path.replace(/:([^/]+)/g, '([^/]+)');
      const regex = new RegExp(`^${pattern}$`);
      const match = path.match(regex);
      
      if (match) {
        const paramNames = (route.path.match(/:([^/]+)/g) || []).map(p => p.slice(1));
        const params = {};
        
        paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        
        return { route, params };
      }
    }
    
    return null;
  }
  
  /**
   * Handle an incoming request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>} Handler result
   */
  async function handleRequest(req, res) {
    const method = req.method || 'GET';
    const path = req.url || '/';
    
    // Apply middlewares
    for (const middleware of middlewares) {
      await middleware(req, res, () => {});
    }
    
    // Match route
    const match = matchRoute(method, path);
    
    if (!match) {
      throw new Error(`Route not found: ${method} ${path}`);
    }
    
    const { route, params } = match;
    req.params = params;
    
    // Execute handlers
    let result = null;
    
    for (const handler of route.handlers) {
      result = await handler(req, res);
      
      // If handler returns a response, stop processing
      if (res.headersSent) {
        break;
      }
    }
    
    return result;
  }
  
  /**
   * Convert router to Express middleware
   * @returns {Function} Express middleware
   */
  function toExpress() {
    return async (req, res, next) => {
      try {
        const result = await handleRequest(req, res);
        
        // If no response was sent and we have a result, send it as JSON
        if (!res.headersSent && result !== undefined) {
          res.json(result);
        }
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Convert router to Fastify plugin
   * @returns {Function} Fastify plugin
   */
  function toFastify() {
    return async (fastify, options, done) => {
      // Register routes with Fastify
      Object.entries(routes).forEach(([method, methodRoutes]) => {
        methodRoutes.forEach(route => {
          // Convert Coherent.js path parameters to Fastify format
          const fastifyPath = route.path.replace(/:([^/]+)/g, '{$1}');
          
          fastify.route({
            method,
            url: fastifyPath,
            handler: async (request, reply) => {
              // Create Coherent.js style request object
              const req = {
                method,
                url: request.url,
                params: request.params,
                query: request.query,
                body: request.body,
                headers: request.headers
              };
              
              try {
                const result = await handleRequest(req, reply);
                
                // If no response was sent and we have a result, send it
                if (!reply.sent && result !== undefined) {
                  reply.send(result);
                }
              } catch (error) {
                reply.status(500).send({ error: error.message });
              }
            }
          });
        });
      });
      
      done();
    };
  }
  
  // Public API
  const router = {
    use,
    get,
    post,
    put,
    delete: deleteRoute,
    patch,
    handleRequest,
    toExpress,
    toFastify
  };
  
  return router;
}

export default createApiRouter;
