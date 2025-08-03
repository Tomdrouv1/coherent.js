/**
 * API Validation for Coherent.js
 * Schema-based validation utilities
 */

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
          const fieldErrors = validateField(fieldSchema, fieldValue, field);
          errors.push(...fieldErrors);
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
 * @returns {Array} Validation errors
 */
function validateField(schema, value, fieldName) {
  const errors = [];
  
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
  if (schema.type === 'string') {
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
    
    if (schema.format === 'email' && !/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
      errors.push({
        field: fieldName,
        message: 'Invalid email format'
      });
    }
  }
  
  // Number-specific validations
  if (schema.type === 'number') {
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
  
  return errors;
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
