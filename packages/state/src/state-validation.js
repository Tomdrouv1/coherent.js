/**
 * @fileoverview State Validation for Coherent.js
 * Provides JSON Schema validation and custom validators for state management
 * @module @coherent.js/core/state/state-validation
 */

/**
 * @typedef {Object} ValidationOptions
 * @property {Object} [schema] - JSON Schema for validation
 * @property {Object<string, Function>} [validators] - Custom validator functions
 * @property {boolean} [strict=false] - Strict mode (throw on validation errors)
 * @property {boolean} [coerce=false] - Coerce types to match schema
 * @property {Function} [onError] - Validation error callback
 * @property {boolean} [validateOnSet=true] - Validate on state updates
 * @property {boolean} [validateOnGet=false] - Validate on state reads
 * @property {Array<string>} [required] - Required fields
 * @property {boolean} [allowUnknown=true] - Allow unknown properties
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {Array<ValidationError>} errors - Array of validation errors
 * @property {*} value - Validated/coerced value
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} path - Property path that failed validation
 * @property {string} message - Error message
 * @property {string} type - Error type
 * @property {*} value - The invalid value
 * @property {*} expected - Expected value/type
 */

/**
 * Simple JSON Schema validator
 */
class SchemaValidator {
  constructor(schema, options = {}) {
    this.schema = schema;
    this.options = {
      coerce: false,
      allowUnknown: true,
      ...options
    };
  }

  /**
   * Validate value against schema
   * @param {*} value - Value to validate
   * @param {Object} schema - Schema to validate against
   * @param {string} path - Current path in object
   * @returns {ValidationResult} Validation result
   */
  validate(value, schema = this.schema, path = '') {
    const errors = [];
    let coercedValue = value;

    // Type validation
    if (schema.type) {
      const typeResult = this.validateType(value, schema.type, path);
      if (!typeResult.valid) {
        errors.push(...typeResult.errors);
        if (!this.options.coerce) {
          return { valid: false, errors, value };
        }
      }
      coercedValue = typeResult.value;
    }

    // Enum validation
    if (schema.enum) {
      const enumResult = this.validateEnum(coercedValue, schema.enum, path);
      if (!enumResult.valid) {
        errors.push(...enumResult.errors);
      }
    }

    // String validations
    if (schema.type === 'string') {
      const stringResult = this.validateString(coercedValue, schema, path);
      if (!stringResult.valid) {
        errors.push(...stringResult.errors);
      }
    }

    // Number validations
    if (schema.type === 'number' || schema.type === 'integer') {
      const numberResult = this.validateNumber(coercedValue, schema, path);
      if (!numberResult.valid) {
        errors.push(...numberResult.errors);
      }
    }

    // Array validations
    if (schema.type === 'array') {
      const arrayResult = this.validateArray(coercedValue, schema, path);
      if (!arrayResult.valid) {
        errors.push(...arrayResult.errors);
      }
      coercedValue = arrayResult.value;
    }

    // Object validations
    if (schema.type === 'object') {
      const objectResult = this.validateObject(coercedValue, schema, path);
      if (!objectResult.valid) {
        errors.push(...objectResult.errors);
      }
      coercedValue = objectResult.value;
    }

    // Custom validation function
    if (schema.validate && typeof schema.validate === 'function') {
      const customResult = schema.validate(coercedValue);
      if (customResult !== true) {
        errors.push({
          path,
          message: typeof customResult === 'string' ? customResult : 'Custom validation failed',
          type: 'custom',
          value: coercedValue
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      value: coercedValue
    };
  }

  validateType(value, type, path) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const errors = [];
    let coercedValue = value;

    // Support array of types
    const types = Array.isArray(type) ? type : [type];

    const isValid = types.some(t => {
      if (t === 'array') return Array.isArray(value);
      if (t === 'null') return value === null;
      if (t === 'integer') return typeof value === 'number' && Number.isInteger(value);
      return typeof value === t;
    });

    if (!isValid) {
      if (this.options.coerce) {
        // Try to coerce
        const primaryType = types[0];
        try {
          if (primaryType === 'string') {
            coercedValue = String(value);
          } else if (primaryType === 'number') {
            coercedValue = Number(value);
            if (isNaN(coercedValue)) {
              errors.push({
                path,
                message: `Cannot coerce "${value}" to number`,
                type: 'type',
                value,
                expected: primaryType
              });
            }
          } else if (primaryType === 'boolean') {
            coercedValue = Boolean(value);
          } else if (primaryType === 'integer') {
            coercedValue = parseInt(value, 10);
            if (isNaN(coercedValue)) {
              errors.push({
                path,
                message: `Cannot coerce "${value}" to integer`,
                type: 'type',
                value,
                expected: primaryType
              });
            }
          }
        } catch {
          errors.push({
            path,
            message: `Cannot coerce value to ${primaryType}`,
            type: 'type',
            value,
            expected: primaryType
          });
        }
      } else {
        errors.push({
          path,
          message: `Expected type ${types.join(' or ')}, got ${actualType}`,
          type: 'type',
          value,
          expected: type
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      value: coercedValue
    };
  }

  validateEnum(value, enumValues, path) {
    const errors = [];
    if (!enumValues.includes(value)) {
      errors.push({
        path,
        message: `Value must be one of: ${enumValues.join(', ')}`,
        type: 'enum',
        value,
        expected: enumValues
      });
    }
    return { valid: errors.length === 0, errors };
  }

  validateString(value, schema, path) {
    const errors = [];

    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path,
        message: `String length must be >= ${schema.minLength}`,
        type: 'minLength',
        value
      });
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path,
        message: `String length must be <= ${schema.maxLength}`,
        type: 'maxLength',
        value
      });
    }

    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push({
          path,
          message: `String does not match pattern: ${schema.pattern}`,
          type: 'pattern',
          value
        });
      }
    }

    if (schema.format) {
      const formatResult = this.validateFormat(value, schema.format, path);
      if (!formatResult.valid) {
        errors.push(...formatResult.errors);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateFormat(value, format, path) {
    const errors = [];
    const formats = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\/.+/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      date: /^\d{4}-\d{2}-\d{2}$/,
      'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    };

    if (formats[format] && !formats[format].test(value)) {
      errors.push({
        path,
        message: `String does not match format: ${format}`,
        type: 'format',
        value,
        expected: format
      });
    }

    return { valid: errors.length === 0, errors };
  }

  validateNumber(value, schema, path) {
    const errors = [];

    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        path,
        message: `Number must be >= ${schema.minimum}`,
        type: 'minimum',
        value
      });
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        path,
        message: `Number must be <= ${schema.maximum}`,
        type: 'maximum',
        value
      });
    }

    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push({
        path,
        message: `Number must be > ${schema.exclusiveMinimum}`,
        type: 'exclusiveMinimum',
        value
      });
    }

    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push({
        path,
        message: `Number must be < ${schema.exclusiveMaximum}`,
        type: 'exclusiveMaximum',
        value
      });
    }

    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
      errors.push({
        path,
        message: `Number must be multiple of ${schema.multipleOf}`,
        type: 'multipleOf',
        value
      });
    }

    return { valid: errors.length === 0, errors };
  }

  validateArray(value, schema, path) {
    const errors = [];
    const coercedValue = [...value];

    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({
        path,
        message: `Array must have at least ${schema.minItems} items`,
        type: 'minItems',
        value
      });
    }

    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({
        path,
        message: `Array must have at most ${schema.maxItems} items`,
        type: 'maxItems',
        value
      });
    }

    if (schema.uniqueItems) {
      const seen = new Set();
      const duplicates = [];
      value.forEach((item, index) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          duplicates.push(index);
        }
        seen.add(key);
      });
      if (duplicates.length > 0) {
        errors.push({
          path,
          message: 'Array items must be unique',
          type: 'uniqueItems',
          value
        });
      }
    }

    // Validate items
    if (schema.items) {
      value.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        const itemResult = this.validate(item, schema.items, itemPath);
        if (!itemResult.valid) {
          errors.push(...itemResult.errors);
        }
        if (this.options.coerce) {
          coercedValue[index] = itemResult.value;
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      value: coercedValue
    };
  }

  validateObject(value, schema, path) {
    const errors = [];
    const coercedValue = { ...value };

    // Required properties
    if (schema.required) {
      schema.required.forEach(prop => {
        if (!(prop in value)) {
          errors.push({
            path: path ? `${path}.${prop}` : prop,
            message: `Required property "${prop}" is missing`,
            type: 'required',
            value: undefined
          });
        }
      });
    }

    // Validate properties
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([prop, propSchema]) => {
        if (prop in value) {
          const propPath = path ? `${path}.${prop}` : prop;
          const propResult = this.validate(value[prop], propSchema, propPath);
          if (!propResult.valid) {
            errors.push(...propResult.errors);
          }
          if (this.options.coerce) {
            coercedValue[prop] = propResult.value;
          }
        }
      });
    }

    // Additional properties
    if (schema.additionalProperties === false && !this.options.allowUnknown) {
      const allowedProps = new Set(Object.keys(schema.properties || {}));
      Object.keys(value).forEach(prop => {
        if (!allowedProps.has(prop)) {
          errors.push({
            path: path ? `${path}.${prop}` : prop,
            message: `Unknown property "${prop}"`,
            type: 'additionalProperties',
            value: value[prop]
          });
        }
      });
    }

    // Min/max properties
    const propCount = Object.keys(value).length;
    if (schema.minProperties !== undefined && propCount < schema.minProperties) {
      errors.push({
        path,
        message: `Object must have at least ${schema.minProperties} properties`,
        type: 'minProperties',
        value
      });
    }

    if (schema.maxProperties !== undefined && propCount > schema.maxProperties) {
      errors.push({
        path,
        message: `Object must have at most ${schema.maxProperties} properties`,
        type: 'maxProperties',
        value
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      value: coercedValue
    };
  }
}

/**
 * Create validated state manager
 * @param {Object} initialState - Initial state
 * @param {ValidationOptions} options - Validation options
 * @returns {Object} Validated state manager
 */
export function createValidatedState(initialState = {}, options = {}) {
  const opts = {
    schema: null,
    validators: {},
    strict: false,
    coerce: false,
    onError: null,
    validateOnSet: true,
    validateOnGet: false,
    required: [],
    allowUnknown: true,
    ...options
  };

  const schemaValidator = opts.schema ? new SchemaValidator(opts.schema, {
    coerce: opts.coerce,
    allowUnknown: opts.allowUnknown
  }) : null;

  let state = { ...initialState };
  const listeners = new Set();
  const validationErrors = new Map();

  /**
   * Validate state
   * @param {Object} value - State to validate
   * @param {string} key - State key (for partial validation)
   * @returns {ValidationResult} Validation result
   */
  function validateState(value, key = null) {
    const errors = [];
    let validatedValue = value;

    // JSON Schema validation
    if (schemaValidator) {
      const schema = key && opts.schema.properties
        ? opts.schema.properties[key]
        : opts.schema;

      const result = schemaValidator.validate(value, schema, key || '');
      if (!result.valid) {
        errors.push(...result.errors);
      }
      validatedValue = result.value;
    }

    // Custom validators
    if (key && opts.validators[key]) {
      const validator = opts.validators[key];
      const result = validator(value);
      if (result !== true) {
        errors.push({
          path: key,
          message: typeof result === 'string' ? result : 'Validation failed',
          type: 'custom',
          value
        });
      }
    } else if (!key) {
      // Run custom validators for all fields when validating full state
      Object.entries(opts.validators).forEach(([fieldKey, validator]) => {
        if (fieldKey in value) {
          const result = validator(value[fieldKey]);
          if (result !== true) {
            errors.push({
              path: fieldKey,
              message: typeof result === 'string' ? result : 'Validation failed',
              type: 'custom',
              value: value[fieldKey]
            });
          }
        }
      });
    }

    // Required fields
    if (opts.required.length > 0 && !key) {
      opts.required.forEach(field => {
        if (!(field in value)) {
          errors.push({
            path: field,
            message: `Required field "${field}" is missing`,
            type: 'required',
            value: undefined
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      value: validatedValue
    };
  }

  /**
   * Get state
   * @param {string} key - State key
   * @returns {*} State value
   */
  function getState(key) {
    const value = key ? state[key] : { ...state };

    if (opts.validateOnGet) {
      const result = validateState(value, key);
      if (!result.valid) {
        validationErrors.set(key || '__root__', result.errors);
        if (opts.onError) {
          opts.onError(result.errors);
        }
      }
    }

    return value;
  }

  /**
   * Set state
   * @param {Object|Function} updates - State updates
   * @throws {Error} If validation fails in strict mode
   */
  function setState(updates) {
    const oldState = { ...state };

    if (typeof updates === 'function') {
      updates = updates(oldState);
    }

    // Create the new full state for validation
    const newState = { ...state, ...updates };

    // Validate before setting
    if (opts.validateOnSet) {
      const result = validateState(newState);

      if (!result.valid) {
        validationErrors.set('__root__', result.errors);

        if (opts.onError) {
          opts.onError(result.errors);
        }

        if (opts.strict) {
          const error = new Error('Validation failed');
          error.validationErrors = result.errors;
          throw error;
        }

        // Don't update state if validation fails in non-strict mode
        return;
      }

      // Use coerced value if coercion is enabled
      if (opts.coerce) {
        const updatedKeys = Object.keys(updates);
        const newUpdates = {};
        updatedKeys.forEach(key => {
          if (result.value[key] !== state[key]) {
            newUpdates[key] = result.value[key];
          }
        });
        updates = newUpdates;
      }

      // Clear errors on successful validation
      validationErrors.clear();
    }

    state = { ...state, ...updates };

    // Notify listeners
    listeners.forEach(listener => {
      try {
        listener(state, oldState);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Change listener
   * @returns {Function} Unsubscribe function
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Get validation errors
   * @param {string} key - State key
   * @returns {Array<ValidationError>} Validation errors
   */
  function getErrors(key = '__root__') {
    return validationErrors.get(key) || [];
  }

  /**
   * Check if state is valid
   * @returns {boolean} Whether state is valid
   */
  function isValid() {
    const result = validateState(state);
    if (!result.valid) {
      validationErrors.set('__root__', result.errors);
    }
    return result.valid;
  }

  /**
   * Validate specific field
   * @param {string} key - Field key
   * @param {*} value - Field value
   * @returns {ValidationResult} Validation result
   */
  function validateField(key, value) {
    return validateState(value, key);
  }

  return {
    getState,
    setState,
    subscribe,
    getErrors,
    isValid,
    validateField,
    validate: () => validateState(state)
  };
}

/**
 * Common validators
 */
export const validators = {
  /**
   * Email validator
   * @param {string} value - Email to validate
   * @returns {boolean|string} True if valid, error message otherwise
   */
  email: (value) => {
    if (typeof value !== 'string') return 'Email must be a string';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
    return true;
  },

  /**
   * URL validator
   * @param {string} value - URL to validate
   * @returns {boolean|string} True if valid, error message otherwise
   */
  url: (value) => {
    if (typeof value !== 'string') return 'URL must be a string';
    try {
      new URL(value);
      return true;
    } catch {
      return 'Invalid URL format';
    }
  },

  /**
   * Range validator
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {Function} Validator function
   */
  range: (min, max) => (value) => {
    if (typeof value !== 'number') return 'Value must be a number';
    if (value < min || value > max) return `Value must be between ${min} and ${max}`;
    return true;
  },

  /**
   * Length validator
   * @param {number} min - Minimum length
   * @param {number} max - Maximum length
   * @returns {Function} Validator function
   */
  length: (min, max) => (value) => {
    if (typeof value !== 'string') return 'Value must be a string';
    if (value.length < min || value.length > max) {
      return `Length must be between ${min} and ${max}`;
    }
    return true;
  },

  /**
   * Pattern validator
   * @param {RegExp|string} pattern - Pattern to match
   * @returns {Function} Validator function
   */
  pattern: (pattern) => (value) => {
    if (typeof value !== 'string') return 'Value must be a string';
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    if (!regex.test(value)) return `Value does not match pattern: ${pattern}`;
    return true;
  },

  /**
   * Required validator
   * @param {*} value - Value to validate
   * @returns {boolean|string} True if valid, error message otherwise
   */
  required: (value) => {
    if (value === undefined || value === null || value === '') {
      return 'Value is required';
    }
    return true;
  }
};

export default {
  createValidatedState,
  validators,
  SchemaValidator
};
