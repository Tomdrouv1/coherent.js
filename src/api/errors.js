/**
 * API Error Handling for Coherent.js
 * Standardized error classes and handling utilities
 */

/**
 * Base API Error class
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Create an API error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} details - Additional error details
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
   * Convert error to JSON-serializable object
   * @returns {Object} Error object
   */
  toJSON() {
    return {
      error: this.name,
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
   * Create a validation error
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
   * Create an authentication error
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
   * Create an authorization error
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
   * Create a not found error
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
   * Create a conflict error
   * @param {string} message - Error message
   */
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Create error handling middleware
 * @param {Function} handler - Error handler function
 * @returns {Function} Middleware function
 */
function withErrorHandling(handler) {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      // If it's already an API error, use it as-is
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Otherwise, wrap it as a generic server error
      throw new ApiError(error.message || 'Internal server error', 500);
    }
  };
}

/**
 * Global error handler middleware
 * @returns {Function} Express error handler middleware
 */
function createErrorHandler() {
  return (error, req, res, next) => {
    // Log error for debugging
    console.error('API Error:', error);
    
    // If headers are already sent, delegate to default error handler
    if (res.headersSent) {
      return next(error);
    }
    
    // Format error response
    const response = {
      error: error.name || 'Error',
      message: error.message || 'An error occurred',
      statusCode: error.statusCode || 500
    };
    
    // Add details if available
    if (error.details) {
      response.details = error.details;
    }
    
    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }
    
    res.status(response.statusCode).json(response);
  };
}

// Export all error classes and utilities
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
