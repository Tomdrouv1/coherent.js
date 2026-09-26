/**
 * Coherent.js Form Validation
 * 
 * Comprehensive validation utilities for forms
 * 
 * @module forms/validation
 */

import { validators, resolveValidator, wrapValidator } from './rules.js';

/**
 * Built-in validators (the same registry `@coherent.js/forms/validators`
 * exports). Each is a factory returning a `(value, formData) => error | null`
 * validator: `validators.minLength(8)`. See rules.js for the full convention.
 */
export { validators };

/**
 * Form Validator
 * Manages form validation state
 */
export class FormValidator {
  constructor(schema = {}) {
    this.schema = schema;
    this.errors = {};
    this.touched = {};
  }

  /**
   * Validate a single field
   */
  validateField(name, value, formData = {}) {
    const fieldValidators = this.schema[name];
    
    if (!fieldValidators) {
      return null;
    }

    const validatorArray = Array.isArray(fieldValidators) ? fieldValidators : [fieldValidators];

    for (const entry of validatorArray) {
      // Accepts `validators.required` as well as `validators.required()`.
      const validator = resolveValidator(entry);
      const error = validator ? validator(value, formData) : null;
      if (error) {
        return error;
      }
    }

    return null;
  }

  /**
   * Validate entire form
   */
  validate(formData) {
    const errors = {};
    let isValid = true;

    for (const [name, value] of Object.entries(formData)) {
      const error = this.validateField(name, value, formData);
      if (error) {
        errors[name] = error;
        isValid = false;
      }
    }

    // Check for required fields not in formData
    for (const name of Object.keys(this.schema)) {
      if (!(name in formData)) {
        const error = this.validateField(name, undefined, formData);
        if (error) {
          errors[name] = error;
          isValid = false;
        }
      }
    }

    this.errors = errors;
    return { isValid, errors };
  }

  /**
   * Mark field as touched
   */
  touch(name) {
    this.touched[name] = true;
  }

  /**
   * Check if field is touched
   */
  isTouched(name) {
    return this.touched[name] || false;
  }

  /**
   * Get error for field
   */
  getError(name) {
    return this.errors[name] || null;
  }

  /**
   * Check if field has error
   */
  hasError(name) {
    return !!this.errors[name];
  }

  /**
   * Clear errors
   */
  clearErrors() {
    this.errors = {};
  }

  /**
   * Clear touched state
   */
  clearTouched() {
    this.touched = {};
  }

  /**
   * Reset validator
   */
  reset() {
    this.clearErrors();
    this.clearTouched();
  }
}

/**
 * Create a validator.
 *
 * - `createValidator(schema)` returns a {@link FormValidator} for a
 *   `{ field: validator | validator[] }` schema.
 * - `createValidator(fn, message?)` wraps a check function as a validator: a
 *   string result is the error, another truthy result becomes `message`, a
 *   falsy one passes.
 *
 * Both entry points (`@coherent.js/forms` and `@coherent.js/forms/validators`)
 * export this same function.
 */
export function createValidator(schemaOrFn, message) {
  if (typeof schemaOrFn === 'function') {
    return wrapValidator(schemaOrFn, message);
  }
  return new FormValidator(schemaOrFn);
}

/**
 * Validate form data against schema
 */
export function validate(formData, schema) {
  const validator = new FormValidator(schema);
  return validator.validate(formData);
}

export default {
  validators,
  FormValidator,
  createValidator,
  validate
};
