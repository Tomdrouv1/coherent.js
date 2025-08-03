/**
 * OpenAPI/Swagger integration for Coherent.js API framework
 */

/**
 * Create OpenAPI documentation middleware
 * @param {Object} options - OpenAPI options
 * @param {string} options.summary - Endpoint summary
 * @param {string} options.description - Endpoint description
 * @param {Object} options.responses - Response schemas
 * @param {Object} options.requestBody - Request body schema
 * @param {Object} options.parameters - Path/query parameters
 * @returns {Function} Middleware function
 */
export function withOpenApi(options = {}) {
  return (req, res, next) => {
    // Add OpenAPI metadata to request for documentation generation
    if (!req.openapi) {
      req.openapi = {};
    }
    
    // Store endpoint metadata
    req.openapi[req.method + req.url] = {
      summary: options.summary || '',
      description: options.description || '',
      responses: options.responses || {},
      requestBody: options.requestBody,
      parameters: options.parameters || []
    };
    
    next();
  };
}

/**
 * Generate OpenAPI specification from registered routes
 * @param {Object} appInfo - Application information
 * @param {string} appInfo.title - Application title
 * @param {string} appInfo.version - Application version
 * @param {string} appInfo.description - Application description
 * @param {Array} routes - Registered routes
 * @returns {Object} OpenAPI specification
 */
export function generateOpenApiSpec(appInfo = {}, routes = []) {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: appInfo.title || 'Coherent.js API',
      version: appInfo.version || '1.0.0',
      description: appInfo.description || 'API documentation for Coherent.js application'
    },
    paths: {}
  };
  
  // Process each route
  routes.forEach(route => {
    const path = normalizePath(route.path);
    const method = route.method.toLowerCase();
    
    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }
    
    // Add operation
    spec.paths[path][method] = {
      summary: route.openapi?.summary || '',
      description: route.openapi?.description || '',
      parameters: route.openapi?.parameters || [],
      responses: route.openapi?.responses || {
        '200': {
          description: 'Successful response'
        }
      }
    };
    
    // Add request body if specified
    if (route.openapi?.requestBody) {
      spec.paths[path][method].requestBody = {
        content: {
          'application/json': {
            schema: route.openapi.requestBody
          }
        }
      };
    }
  });
  
  return spec;
}

/**
 * Normalize path for OpenAPI
 * @param {string} path - Route path
 * @returns {string} Normalized path
 */
function normalizePath(path) {
  // Convert Express-style params (:id) to OpenAPI style ({id})
  return path.replace(/:(\w+)/g, '{$1}');
}

/**
 * Create OpenAPI documentation endpoint
 * @param {Object} appInfo - Application information
 * @param {Array} routes - Registered routes
 * @returns {Function} Handler function
 */
export function createOpenApiHandler(appInfo = {}, routes = []) {
  return (req, res) => {
    const spec = generateOpenApiSpec(appInfo, routes);
    res.setHeader('Content-Type', 'application/json');
    return spec;
  };
}

/**
 * Create Swagger UI endpoint
 * @returns {Function} Handler function
 */
export function createSwaggerUIHandler() {
  return (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Coherent.js API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/json',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.presets.standalone
      ]
    });
  </script>
</body>
</html>
`;
    res.setHeader('Content-Type', 'text/html');
    return html;
  };
}

// Export OpenAPI utilities
export default {
  withOpenApi,
  generateOpenApiSpec,
  createOpenApiHandler,
  createSwaggerUIHandler
};
