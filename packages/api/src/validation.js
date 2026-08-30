/**
 * API Validation for Coherent.js
 * @fileoverview Schema-based validation utilities
 */

/**
 * Email shape check: a local part, then a dotted domain.
 *
 * Domain labels use `[^\s@.]` rather than `[^\s@]` so that the literal dot
 * separators are the only thing that can match a dot. Allowing `[^\s@]+` on
 * both sides of `\.` makes the split ambiguous, and a non-matching subject
 * with many dots ("a@" + "a." * n + " ") then costs O(n²) backtracking —
 * CodeQL js/polynomial-redos.
 *
 * @private
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * Longest address RFC 5321 permits, used to bound work before matching.
 * @private
 */
const EMAIL_MAX_LENGTH = 254;

/**
 * Test whether a value has the shape of an email address.
 * @private
 * @param {unknown} value - Value to check
 * @returns {boolean} True if the value looks like an email address
 */
function isEmailShaped(value) {
  return (
    typeof value === 'string' &&
    value.length <= EMAIL_MAX_LENGTH &&
    EMAIL_PATTERN.test(value)
  );
}


import { ValidationError } from './errors.js';

/**
 * Validate data against a schema
 * @param {Object} schema - JSON Schema
 * @param {any} data - Data to validate
 * @returns {Object} Validation result
 */
function validateAgainstSchema(schema, data) {
  const errors = [];

  // Simple validation implementation
  // In a real implementation, this would use a proper JSON Schema validator

  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push({
        field: '',
        message: `Expected object, got ${typeof data}`
      });
      return { valid: false, errors };
    }

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push({
            field,
            message: `Required field '${field}' is missing`
          });
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in data) {
          const fieldValue = data[field];
          const fieldResult = validateField(fieldSchema, fieldValue, field);
          if (!fieldResult.valid) {
            errors.push(...fieldResult.errors);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a single field
 * @param {Object} schema - Field schema
 * @param {any} value - Field value
 * @param {string} fieldName - Field name
 * @returns {Object} Validation result with valid and errors properties
 */
function validateField(schema, value, fieldName) {
  const errors = [];

  // Handle null/undefined values
  if (value === null || value === undefined) {
    if (schema.type && schema.type !== 'null') {
      errors.push({
        field: fieldName,
        message: `Expected ${schema.type}, got ${value === null ? 'null' : 'undefined'}`
      });
    }
    return { valid: errors.length === 0, errors };
  }

  // Type validation
  if (schema.type) {
    if (schema.type === 'string' && typeof value !== 'string') {
      errors.push({
        field: fieldName,
        message: `Expected string, got ${typeof value}`
      });
    } else if (schema.type === 'number' && typeof value !== 'number') {
      errors.push({
        field: fieldName,
        message: `Expected number, got ${typeof value}`
      });
    } else if (schema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push({
        field: fieldName,
        message: `Expected boolean, got ${typeof value}`
      });
    } else if (schema.type === 'array' && !Array.isArray(value)) {
      errors.push({
        field: fieldName,
        message: `Expected array, got ${typeof value}`
      });
    }
  }

  // String-specific validations
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push({
        field: fieldName,
        message: `String must be at least ${schema.minLength} characters`
      });
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push({
        field: fieldName,
        message: `String must be at most ${schema.maxLength} characters`
      });
    }

    if (schema.format === 'email' && !isEmailShaped(value)) {
      errors.push({
        field: fieldName,
        message: 'Invalid email format'
      });
    }
  }

  // Number-specific validations
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        field: fieldName,
        message: `Number must be at least ${schema.minimum}`
      });
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        field: fieldName,
        message: `Number must be at most ${schema.maximum}`
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create validation middleware
 * @param {Object} schema - JSON Schema for validation
 * @returns {Function} Middleware function
 */
function withValidation(schema) {
  return (req, res, next) => {
    const data = req.body || {};
    const result = validateAgainstSchema(schema, data);

    if (!result.valid) {
      throw new ValidationError(result.errors);
    }

    next();
  };
}

/**
 * Validate query parameters
 * @param {Object} schema - JSON Schema for query parameters
 * @returns {Function} Middleware function
 */
function withQueryValidation(schema) {
  return (req, res, next) => {
    const data = req.query || {};
    const result = validateAgainstSchema(schema, data);

    if (!result.valid) {
      throw new ValidationError(result.errors);
    }

    next();
  };
}

/**
 * Validate path parameters
 * @param {Object} schema - JSON Schema for path parameters
 * @returns {Function} Middleware function
 */
function withParamsValidation(schema) {
  return (req, res, next) => {
    const data = req.params || {};
    const result = validateAgainstSchema(schema, data);

    if (!result.valid) {
      throw new ValidationError(result.errors);
    }

    next();
  };
}

// Export validation utilities
export {
  validateAgainstSchema,
  validateField,
  withValidation,
  withQueryValidation,
  withParamsValidation
};
