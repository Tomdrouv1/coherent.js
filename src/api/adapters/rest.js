/**
 * REST adapter for Coherent.js API framework
 */

import { BaseAdapter } from './base.js';

/**
 * REST API adapter
 */
export class RestAdapter extends BaseAdapter {
  /**
   * Create a new REST adapter
   * @param {Object} options - Adapter options
   * @param {string} options.resource - Resource name
   * @param {Object} options.model - Model with CRUD methods
   * @param {Object} options.schema - JSON schema for validation
   * @param {Object} options.permissions - Permission functions
   */
  constructor(options = {}) {
    super(options);
    
    const { resource, model, schema, permissions } = options;
    
    if (!resource) {
      throw new Error('Resource name is required');
    }
    
    if (!model) {
      throw new Error('Model is required');
    }
    
    this.resource = resource;
    this.model = model;
    this.schema = schema;
    this.permissions = permissions || {};
  }

  /**
   * Register REST routes with the application
   * @param {Object} app - The application instance
   * @param {string} basePath - Base path for routes
   * @returns {void}
   */
  registerRoutes(app, basePath = '') {
    const path = basePath ? `${basePath}/${this.resource}` : `/${this.resource}`;
    const idPath = `${path}/:id`;
    
    // GET /resource - List all resources
    app.get(path, 
      this.createMiddleware('list'),
      this.handleList.bind(this)
    );
    
    // POST /resource - Create a new resource
    app.post(path, 
      this.createMiddleware('create'),
      this.handleCreate.bind(this)
    );
    
    // GET /resource/:id - Get a specific resource
    app.get(idPath, 
      this.createMiddleware('read'),
      this.handleRead.bind(this)
    );
    
    // PUT /resource/:id - Update a specific resource
    app.put(idPath, 
      this.createMiddleware('update'),
      this.handleUpdate.bind(this)
    );
    
    // DELETE /resource/:id - Delete a specific resource
    app.delete(idPath, 
      this.createMiddleware('delete'),
      this.handleDelete.bind(this)
    );
    
    // PATCH /resource/:id - Partially update a specific resource
    app.patch(idPath, 
      this.createMiddleware('update'),
      this.handlePatch.bind(this)
    );
  }

  /**
   * Create middleware for a specific operation
   * @param {string} operation - Operation name
   * @returns {Function} Middleware function
   */
  createMiddleware(operation) {
    return async (req, res, next) => {
      try {
        // Check permissions if provided
        if (this.permissions[operation]) {
          const hasPermission = await this.permissions[operation](req.user, req);
          if (!hasPermission) {
            return res.status(403).json({ 
              error: 'Forbidden', 
              message: 'Insufficient permissions' 
            });
          }
        }
        
        // Validate request if schema is provided
        if (this.schema && (operation === 'create' || operation === 'update' || operation === 'patch')) {
          // In a real implementation, we would validate the request body against the schema
          // This is a simplified version
          if (!req.body) {
            return res.status(400).json({ 
              error: 'Bad Request', 
              message: 'Request body is required' 
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
   * Handle list request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handleList(req, res) {
    try {
      const items = await this.model.findAll(req.query);
      return this.formatResponse({ [this.resource]: items }, req, res);
    } catch (error) {
      return this.handleError(error, req, res);
    }
  }

  /**
   * Handle create request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handleCreate(req, res) {
    try {
      const item = await this.model.create(req.body);
      res.status(201);
      return this.formatResponse({ [this.resource.slice(0, -1)]: item }, req, res);
    } catch (error) {
      return this.handleError(error, req, res);
    }
  }

  /**
   * Handle read request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handleRead(req, res) {
    try {
      const id = req.params.id;
      const item = await this.model.findById(id);
      
      if (!item) {
        return res.status(404).json({ 
          error: 'Not Found', 
          message: `${this.resource.slice(0, -1)} not found` 
        });
      }
      
      return this.formatResponse({ [this.resource.slice(0, -1)]: item }, req, res);
    } catch (error) {
      return this.handleError(error, req, res);
    }
  }

  /**
   * Handle update request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handleUpdate(req, res) {
    try {
      const id = req.params.id;
      const item = await this.model.update(id, req.body);
      
      if (!item) {
        return res.status(404).json({ 
          error: 'Not Found', 
          message: `${this.resource.slice(0, -1)} not found` 
        });
      }
      
      return this.formatResponse({ [this.resource.slice(0, -1)]: item }, req, res);
    } catch (error) {
      return this.handleError(error, req, res);
    }
  }

  /**
   * Handle patch request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handlePatch(req, res) {
    try {
      const id = req.params.id;
      const item = await this.model.patch(id, req.body);
      
      if (!item) {
        return res.status(404).json({ 
          error: 'Not Found', 
          message: `${this.resource.slice(0, -1)} not found` 
        });
      }
      
      return this.formatResponse({ [this.resource.slice(0, -1)]: item }, req, res);
    } catch (error) {
      return this.handleError(error, req, res);
    }
  }

  /**
   * Handle delete request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handleDelete(req, res) {
    try {
      const id = req.params.id;
      const result = await this.model.delete(id);
      
      if (!result) {
        return res.status(404).json({ 
          error: 'Not Found', 
          message: `${this.resource.slice(0, -1)} not found` 
        });
      }
      
      res.status(204);
      return this.formatResponse(null, req, res);
    } catch (error) {
      return this.handleError(error, req, res);
    }
  }
}

export default RestAdapter;
