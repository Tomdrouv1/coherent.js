/**
 * RPC adapter for Coherent.js API framework
 */

import { BaseAdapter } from './base.js';

/**
 * RPC API adapter
 */
export class RpcAdapter extends BaseAdapter {
  /**
   * Create a new RPC adapter
   * @param {Object} options - Adapter options
   * @param {Object} options.methods - Map of method names to functions
   * @param {Object} options.permissions - Permission functions
   */
  constructor(options = {}) {
    super(options);
    
    const { methods, permissions } = options;
    
    if (!methods) {
      throw new Error('Methods are required');
    }
    
    this.methods = methods;
    this.permissions = permissions || {};
  }

  /**
   * Register RPC routes with the application
   * @param {Object} app - The application instance
   * @param {string} basePath - Base path for routes
   * @returns {void}
   */
  registerRoutes(app, basePath = '') {
    const path = basePath ? `${basePath}/rpc` : '/rpc';
    
    // POST /rpc - Handle all RPC calls
    app.post(path, 
      this.createMiddleware(),
      this.handleRpc.bind(this)
    );
  }

  /**
   * Create middleware for RPC requests
   * @returns {Function} Middleware function
   */
  createMiddleware() {
    return async (req, res, next) => {
      try {
        // Validate request format
        if (!req.body || !req.body.method) {
          return res.status(400).json({ 
            error: 'Bad Request', 
            message: 'Method name is required' 
          });
        }
        
        // Check if method exists
        if (!this.methods[req.body.method]) {
          return res.status(404).json({ 
            error: 'Not Found', 
            message: `Method '${req.body.method}' not found` 
          });
        }
        
        // Check permissions if provided
        if (this.permissions[req.body.method]) {
          const hasPermission = await this.permissions[req.body.method](req.user, req);
          if (!hasPermission) {
            return res.status(403).json({ 
              error: 'Forbidden', 
              message: 'Insufficient permissions' 
            });
          }
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Handle RPC request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handleRpc(req, res) {
    try {
      const { method, params = {} } = req.body;
      
      // Execute the method
      const result = await this.methods[method](params, req, res);
      
      return this.formatResponse({ result }, req, res);
    } catch (error) {
      return this.handleError(error, req, res);
    }
  }
}

export default RpcAdapter;
