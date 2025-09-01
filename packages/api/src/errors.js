/**
 * API Error Handling for Coherent.js
 * @fileoverview Standardized _error classes and handling utilities
 */

/**
 * Base API Error class
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Create an API _error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} details - Additional _error details
   */
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    
    // Ensure proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
  
  /**
   * Convert _error to JSON-serializable object
   * @returns {Object} Error object
   */
  toJSON() {
    return {
      _error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

/**
 * Validation Error class
 * @extends ApiError
 */
class ValidationError extends ApiError {
  /**
   * Create a validation _error
   * @param {Object} errors - Validation errors
   * @param {string} message - Error message
   */
  constructor(errors, message = 'Validation failed') {
    super(message, 400, { errors });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error class
 * @extends ApiError
 */
class AuthenticationError extends ApiError {
  /**
   * Create an authentication _error
   * @param {string} message - Error message
   */
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error class
 * @extends ApiError
 */
class AuthorizationError extends ApiError {
  /**
   * Create an authorization _error
   * @param {string} message - Error message
   */
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error class
 * @extends ApiError
 */
class NotFoundError extends ApiError {
  /**
   * Create a not found _error
   * @param {string} message - Error message
   */
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error class
 * @extends ApiError
 */
class ConflictError extends ApiError {
  /**
   * Create a conflict _error
   * @param {string} message - Error message
   */
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Create _error handling middleware
 * @param {Function} handler - Error handler function
 * @returns {Function} Middleware function
 */
function withErrorHandling(handler) {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (_error) {
      // If it's already an API _error, use it as-is
      if (_error instanceof ApiError) {
        throw _error;
      }
      
      // Otherwise, wrap it as a generic server _error
      throw new ApiError(_error.message || 'Internal server _error', 500);
    }
  };
}

/**
 * Global _error handler middleware
 * @returns {Function} Express _error handler middleware
 */
function createErrorHandler() {
  return (_error, req, res, next) => {
    // Log _error for debugging
    console.error('API Error:', _error);
    
    // If headers are already sent, delegate to default _error handler
    if (res.headersSent) {
      return next(_error);
    }
    
    // Format _error response
    const response = {
      _error: _error.name || 'Error',
      message: _error.message || 'An _error occurred',
      statusCode: _error.statusCode || 500
    };
    
    // Add details if available
    if (_error.details) {
      response.details = _error.details;
    }
    
    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = _error.stack;
    }
    
    res.status(response.statusCode).json(response);
  };
}

// Export all _error classes and utilities
export {
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  withErrorHandling,
  createErrorHandler
};
