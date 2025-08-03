/**
 * Coherent.js API Module
 * Core utilities for building APIs with Coherent.js
 */

// Import all API components
import createApiRouter from './router.js';
import { ApiError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, withErrorHandling, createErrorHandler } from './errors.js';
import { validateAgainstSchema, validateField, withValidation, withQueryValidation, withParamsValidation } from './validation.js';
import { serializeDate, deserializeDate, serializeMap, deserializeMap, serializeSet, deserializeSet, withSerialization, serializeForJSON } from './serialization.js';

// Export all components
export {
  // Router
  createApiRouter,
  
  // Errors
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  withErrorHandling,
  createErrorHandler,
  
  // Validation
  validateAgainstSchema,
  validateField,
  withValidation,
  withQueryValidation,
  withParamsValidation,
  
  // Serialization
  serializeDate,
  deserializeDate,
  serializeMap,
  deserializeMap,
  serializeSet,
  deserializeSet,
  withSerialization,
  serializeForJSON
};

// Default export
const api = {
  createApiRouter,
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  withErrorHandling,
  createErrorHandler,
  validateAgainstSchema,
  validateField,
  withValidation,
  withQueryValidation,
  withParamsValidation,
  serializeDate,
  deserializeDate,
  serializeMap,
  deserializeMap,
  serializeSet,
  deserializeSet,
  withSerialization,
  serializeForJSON
};

export default api;
