/**
 * Base adapter class for Coherent.js API framework
 */

/**
 * Base API adapter class
 */
export class BaseAdapter {
  /**
   * Create a new adapter
   * @param {Object} options - Adapter options
   */
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Initialize the adapter
   * @param {Object} app - The application instance
   * @returns {Promise<void>}
   */
  async initialize(app) {
    // Override in subclasses
  }

  /**
   * Register routes with the application
   * @param {Object} app - The application instance
   * @param {string} basePath - Base path for routes
   * @returns {void}
   */
  registerRoutes(app, basePath = '') {
    // Override in subclasses
  }

  /**
   * Handle a request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<any>}
   */
  async handleRequest(req, res) {
    // Override in subclasses
  }

  /**
   * Format a response
   * @param {any} data - Response data
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {any} Formatted response
   */
  formatResponse(data, req, res) {
    return data;
  }

  /**
   * Handle an error
   * @param {Error} error - Error object
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {any} Error response
   */
  handleError(error, req, res) {
    return { error: error.message };
  }
}

export default BaseAdapter;
