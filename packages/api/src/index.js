/**
 * Coherent.js API Module
 * @fileoverview Core utilities for building APIs with Coherent.js
 */

import { createRouter } from './router.js';
import { ApiError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, withErrorHandling, createErrorHandler } from './errors.js';
import { validateAgainstSchema, validateField, withValidation, withQueryValidation, withParamsValidation } from './validation.js';
import { serializeDate, deserializeDate, serializeMap, deserializeMap, serializeSet, deserializeSet, withSerialization, serializeForJSON } from './serialization.js';
import { withAuth, withRole, hashPassword, verifyPassword, generateToken, withInputValidation } from './security.js';

export {
  createRouter,
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
  serializeForJSON,
  withAuth,
  withRole,
  hashPassword,
  verifyPassword,
  generateToken,
  withInputValidation
};

export default {
  createRouter,
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
  serializeForJSON,
  withAuth,
  withRole,
  hashPassword,
  verifyPassword,
  generateToken,
  withInputValidation
};
