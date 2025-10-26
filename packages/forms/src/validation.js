/**
 * Coherent.js Form Validation
 * 
 * Comprehensive validation utilities for forms
 * 
 * @module forms/validation
 */

/**
 * Built-in validators
 */
export const validators = {
  required: (message = 'This field is required') => (value) => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    return null;
  },

  minLength: (min, message = `Minimum length is ${min}`) => (value) => {
    if (value && value.length < min) {
      return message;
    }
    return null;
  },

  maxLength: (max, message = `Maximum length is ${max}`) => (value) => {
    if (value && value.length > max) {
      return message;
    }
    return null;
  },

  min: (min, message = `Minimum value is ${min}`) => (value) => {
    if (value !== null && value !== undefined && Number(value) < min) {
      return message;
    }
    return null;
  },

  max: (max, message = `Maximum value is ${max}`) => (value) => {
    if (value !== null && value !== undefined && Number(value) > max) {
      return message;
    }
    return null;
  },

  email: (message = 'Invalid email address') => (value) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return message;
    }
    return null;
  },

  url: (message = 'Invalid URL') => (value) => {
    if (value) {
      try {
        new URL(value);
      } catch {
        return message;
      }
    }
    return null;
  },

  pattern: (regex, message = 'Invalid format') => (value) => {
    if (value && !regex.test(value)) {
      return message;
    }
    return null;
  },

  matches: (fieldName, message = 'Fields do not match') => (value, formData) => {
    if (value !== formData[fieldName]) {
      return message;
    }
    return null;
  },

  oneOf: (options, message = 'Invalid option') => (value) => {
    if (value && !options.includes(value)) {
      return message;
    }
    return null;
  },

  custom: (fn, message = 'Validation failed') => (value, formData) => {
    if (!fn(value, formData)) {
      return message;
    }
    return null;
  }
};

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

    for (const validator of validatorArray) {
      const error = validator(value, formData);
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
 * Create a form validator
 */
export function createValidator(schema) {
  return new FormValidator(schema);
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
