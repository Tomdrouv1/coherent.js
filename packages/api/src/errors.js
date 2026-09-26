/**
 * API Error Handling for Coherent.js
 * @fileoverview Standardized _error classes and handling utilities
 */

import { STATUS_CODES } from 'node:http';
import { env } from 'node:process';

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
   * Create a validation _error
   * @param {Object} errors - Validation errors
   * @param {string} message - Error message
   */
  constructor(errors, message = 'Validation failed') {
    super(message, 400, { errors });
    this.errors = errors;
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
 * Wrap a handler so that anything it throws surfaces as an `ApiError`
 *
 * An `ApiError` is rethrown as is; anything else becomes a 500 `ApiError`
 * whose `cause` is the original error, so it can still be logged in full.
 *
 * @param {Function} handler - Route handler or middleware
 * @returns {Function} Wrapped function with the same (req, res, next) contract
 */
function withErrorHandling(handler) {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (_error) {
      // If it's already an API error, use it as-is
      if (_error instanceof ApiError) {
        throw _error;
      }

      // Otherwise, wrap it as a generic server error
      const wrapped = new ApiError(_error?.message || 'Internal server error', 500);
      wrapped.cause = _error;
      throw wrapped;
    }
  };
}

/**
 * Global error handler middleware (Express signature)
 *
 * 4xx errors are answered with their message and details. 5xx errors are
 * logged in full but answered with the generic status text, unless
 * `exposeErrors` is true or (when it is unset) NODE_ENV is 'development':
 * echoing the message sent internals such as database host names to clients.
 *
 * @param {Object} [options] - Handler options
 * @param {boolean} [options.exposeErrors] - Send 5xx messages to the client
 * @param {boolean} [options.includeStack] - Add `stack` to exposed errors (default: NODE_ENV === 'development')
 * @param {Function} [options.logger] - `(error, req) => void`, replaces console.error
 * @param {Function} [options.transform] - `(error) => body`, replaces the default JSON body
 * @returns {Function} Express error handler middleware
 */
function createErrorHandler(options = {}) {
  const { exposeErrors, includeStack, logger, transform } = options ?? {};

  return (_error, req, res, next) => {
    // Log error for debugging
    if (typeof logger === 'function') {
      logger(_error, req);
    } else {
      console.error('API Error:', _error?.cause ?? _error);
    }

    // If headers are already sent, delegate to default error handler
    if (res.headersSent) {
      return next(_error);
    }

    const rawStatus = _error?.statusCode;
    const statusCode = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
    const development = env.NODE_ENV === 'development';
    const expose = statusCode < 500 || (typeof exposeErrors === 'boolean' ? exposeErrors : development);

    let response;
    if (typeof transform === 'function') {
      response = transform(_error);
    } else if (expose) {
      // Format error response
      response = {
        error: _error?.name || 'Error',
        message: _error?.message || 'An error occurred',
        statusCode
      };

      // Add details if available
      if (_error?.details) {
        response.details = _error.details;
      }

      // Add stack trace in development
      if (includeStack ?? development) {
        response.stack = _error?.stack;
      }
    } else {
      response = {
        error: 'Error',
        message: STATUS_CODES[statusCode] || 'Internal Server Error',
        statusCode
      };
    }

    res.status(statusCode).json(response);
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
