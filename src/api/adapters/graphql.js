/**
 * GraphQL adapter for Coherent.js API framework
 */

import { BaseAdapter } from './base.js';

/**
 * GraphQL API adapter
 */
export class GraphqlAdapter extends BaseAdapter {
  /**
   * Create a new GraphQL adapter
   * @param {Object} options - Adapter options
   * @param {Object} options.schema - GraphQL schema
   * @param {Object} options.resolvers - GraphQL resolvers
   * @param {Object} options.permissions - Permission functions
   */
  constructor(options = {}) {
    super(options);
    
    const { schema, resolvers, permissions } = options;
    
    if (!schema) {
      throw new Error('GraphQL schema is required');
    }
    
    if (!resolvers) {
      throw new Error('GraphQL resolvers are required');
    }
    
    this.schema = schema;
    this.resolvers = resolvers;
    this.permissions = permissions || {};
  }

  /**
   * Register GraphQL routes with the application
   * @param {Object} app - The application instance
   * @param {string} basePath - Base path for routes
   * @returns {void}
   */
  registerRoutes(app, basePath = '') {
    const path = basePath ? `${basePath}/graphql` : '/graphql';
    
    // POST /graphql - Handle GraphQL queries and mutations
    app.post(path, 
      this.createMiddleware(),
      this.handleGraphql.bind(this)
    );
    
    // GET /graphql - Serve GraphQL playground (in development)
    app.get(path, 
      this.createMiddleware(),
      this.handleGraphqlPlayground.bind(this)
    );
  }

  /**
   * Create middleware for GraphQL requests
   * @returns {Function} Middleware function
   */
  createMiddleware() {
    return async (req, res, next) => {
      try {
        // In a real implementation, we would check permissions based on the query
        // For now, we'll just pass through
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Handle GraphQL request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handleGraphql(req, res) {
    try {
      // In a real implementation, we would use a GraphQL execution engine
      // This is a simplified version for demonstration
      
      const { query, variables, operationName } = req.body;
      
      // Validate query
      if (!query) {
        return res.status(400).json({ 
          error: 'Bad Request', 
          message: 'GraphQL query is required' 
        });
      }
      
      // Execute query (simplified)
      const result = await this.executeGraphql(query, variables, operationName, req, res);
      
      return this.formatResponse(result, req, res);
    } catch (error) {
      return this.handleError(error, req, res);
    }
  }

  /**
   * Handle GraphQL playground request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handleGraphqlPlayground(req, res) {
    try {
      // Serve GraphQL playground HTML
      const html = this.getGraphqlPlaygroundHtml();
      res.setHeader('Content-Type', 'text/html');
      return html;
    } catch (error) {
      return this.handleError(error, req, res);
    }
  }

  /**
   * Execute a GraphQL query
   * @param {string} query - GraphQL query
   * @param {Object} variables - Query variables
   * @param {string} operationName - Operation name
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<Object>} Query result
   */
  async executeGraphql(query, variables, operationName, req, res) {
    // In a real implementation, we would use a GraphQL execution engine like graphql-js
    // This is a simplified version for demonstration
    
    // Parse the query to determine the operation type
    const isMutation = query.includes('mutation');
    
    // Return a mock result
    return {
      data: {
        message: `Executed ${isMutation ? 'mutation' : 'query'} successfully`
      }
    };
  }

  /**
   * Get GraphQL playground HTML
   * @returns {string} HTML content
   */
  getGraphqlPlaygroundHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Coherent.js GraphQL Playground</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #333; }
    .query-editor { width: 100%; height: 200px; }
    .result-viewer { width: 100%; height: 200px; }
    button { background: #007bff; color: white; border: none; padding: 10px 20px; cursor: pointer; }
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Coherent.js GraphQL Playground</h1>
    <textarea id="query" class="query-editor" placeholder="Enter your GraphQL query here...">
query {
  hello
}
    </textarea>
    <br><br>
    <button onclick="executeQuery()">Execute Query</button>
    <br><br>
    <textarea id="result" class="result-viewer" placeholder="Query results will appear here..."></textarea>
  </div>
  
  <script>
    async function executeQuery() {
      const query = document.getElementById('query').value;
      const resultElement = document.getElementById('result');
      
      try {
        const response = await fetch('/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query })
        });
        
        const result = await response.json();
        resultElement.value = JSON.stringify(result, null, 2);
      } catch (error) {
        resultElement.value = 'Error: ' + error.message;
      }
    }
  </script>
</body>
</html>
`;
  }
}

export default GraphqlAdapter;
