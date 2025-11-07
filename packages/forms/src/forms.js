/**
 * Enhanced Form System
 *
 * Provides advanced form features:
 * - Async validation
 * - Custom validators
 * - Field transformations
 * - Form middleware
 */

/**
 * Create an enhanced form with advanced validation and middleware
 *
 * @param {Object} options - Configuration options
 * @param {Object} [options.fields] - Field configurations
 * @param {Object} [options.validation] - Validation options
 * @param {Array} [options.middleware] - Form middleware functions
 * @param {Object} [options.submission] - Submission options
 * @returns {Object} Enhanced form instance
 */
export function createForm(options = {}) {
  const opts = {
    fields: {},
    validation: {
      strategy: 'blur',
      debounce: 300,
      async: true,
      stopOnFirstError: false,
      revalidateOn: ['change', 'blur'],
      ...options.validation
    },
    errors: {
      format: 'detailed',
      display: 'inline',
      customFormatter: null,
      ...options.errors
    },
    submission: {
      preventDefault: true,
      validateBeforeSubmit: true,
      disableOnSubmit: true,
      resetOnSuccess: false,
      onSuccess: null,
      onError: null,
      ...options.submission
    },
    state: {
      trackDirty: true,
      trackTouched: true,
      trackVisited: true,
      initialValues: {},
      resetValues: null,
      ...options.state
    },
    middleware: options.middleware || [],
    ...options
  };

  // Form state
  const state = {
    values: { ...opts.state.initialValues },
    errors: {},
    touched: {},
    dirty: {},
    visited: {},
    isSubmitting: false,
    isValidating: false,
    submitCount: 0,
    asyncValidations: new Map()
  };

  // Field metadata
  const fields = new Map();

  // Statistics
  const stats = {
    validations: 0,
    asyncValidations: 0,
    submissions: 0,
    successfulSubmissions: 0,
    failedSubmissions: 0,
    middlewareExecutions: 0
  };

  /**
   * Register a field
   */
  function registerField(name, config) {
    fields.set(name, {
      name,
      type: config.type || 'text',
      validators: config.validators || [],
      transform: config.transform || {},
      validateWhen: config.validateWhen,
      required: config.required || false,
      defaultValue: config.defaultValue,
      ...config
    });

    // Initialize field state
    if (!(name in state.values)) {
      state.values[name] = config.defaultValue !== undefined
        ? config.defaultValue
        : '';
    }
    state.errors[name] = [];
    state.touched[name] = false;
    state.dirty[name] = false;
    state.visited[name] = false;
  }

  /**
   * Get field configuration
   */
  function getField(name) {
    return fields.get(name);
  }

  /**
   * Set field value
   */
  function setFieldValue(name, value, shouldValidate = true) {
    const field = fields.get(name);
    if (!field) {
      console.warn(`Field ${name} not registered`);
      return;
    }

    // Apply input transformation
    if (field.transform?.input) {
      value = field.transform.input(value);
    }

    state.values[name] = value;

    // Track dirty state
    if (opts.state.trackDirty) {
      const initialValue = opts.state.initialValues[name];
      state.dirty[name] = value !== initialValue;
    }

    // Validate if needed
    if (shouldValidate && opts.validation.revalidateOn.includes('change')) {
      validateField(name);
    }
  }

  /**
   * Get field value
   */
  function getFieldValue(name) {
    return state.values[name];
  }

  /**
   * Set field touched
   */
  function setFieldTouched(name, touched = true) {
    if (!opts.state.trackTouched) return;

    state.touched[name] = touched;

    // Validate on blur if configured
    if (touched && opts.validation.revalidateOn.includes('blur')) {
      validateField(name);
    }
  }

  /**
   * Set field visited
   */
  function setFieldVisited(name, visited = true) {
    if (!opts.state.trackVisited) return;
    state.visited[name] = visited;
  }

  /**
   * Validate a single field
   */
  async function validateField(name) {
    const field = fields.get(name);
    if (!field) return { valid: true, errors: [] };

    stats.validations++;

    // Check conditional validation
    if (field.validateWhen && !field.validateWhen(state.values)) {
      state.errors[name] = [];
      return { valid: true, errors: [] };
    }

    const value = state.values[name];
    const errors = [];

    // Cancel previous async validation if any
    if (state.asyncValidations.has(name)) {
      clearTimeout(state.asyncValidations.get(name));
    }

    // Required validation
    if (field.required && (value === '' || value === null || value === undefined)) {
      errors.push({
        field: name,
        type: 'required',
        message: `${name} is required`
      });

      state.errors[name] = errors;
      return { valid: false, errors };
    }

    // Run validators
    for (const validator of field.validators) {
      try {
        let result;

        // Check if validator is async
        if (validator.validate.constructor.name === 'AsyncFunction' || opts.validation.async) {
          stats.asyncValidations++;

          // Debounce async validation
          if (validator.debounce || opts.validation.debounce) {
            await new Promise(resolve => {
              const timeoutId = setTimeout(resolve, validator.debounce || opts.validation.debounce);
              state.asyncValidations.set(name, timeoutId);
            });
          }

          result = await validator.validate(value, state.values);
        } else {
          result = validator.validate(value, state.values);
        }

        // Check result
        if (result !== true && result !== undefined && result !== null) {
          errors.push({
            field: name,
            type: validator.name || 'custom',
            message: validator.message || result || 'Validation failed'
          });

          if (opts.validation.stopOnFirstError) {
            break;
          }
        }
      } catch (error) {
        errors.push({
          field: name,
          type: 'error',
          message: error.message || 'Validation error'
        });

        if (opts.validation.stopOnFirstError) {
          break;
        }
      }
    }

    state.errors[name] = errors;
    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate all fields
   */
  async function validateForm() {
    state.isValidating = true;

    const validationPromises = Array.from(fields.keys()).map(name =>
      validateField(name)
    );

    const results = await Promise.all(validationPromises);

    state.isValidating = false;

    const allErrors = results.reduce((acc, result, index) => {
      const fieldName = Array.from(fields.keys())[index];
      if (result.errors.length > 0) {
        acc[fieldName] = result.errors;
      }
      return acc;
    }, {});

    const isValid = Object.keys(allErrors).length === 0;

    return {
      valid: isValid,
      errors: allErrors
    };
  }

  /**
   * Execute middleware
   */
  async function executeMiddleware(action, data) {
    if (opts.middleware.length === 0) return data;

    stats.middlewareExecutions++;

    let result = data;

    for (const middleware of opts.middleware) {
      try {
        const next = () => result;
        result = await middleware(action, result, next, state);
      } catch (error) {
        console.error('Middleware error:', error);
        throw error;
      }
    }

    return result;
  }

  /**
   * Apply field transformations
   */
  function applyTransformations(values) {
    const transformed = { ...values };

    fields.forEach((field, name) => {
      if (field.transform?.output && name in transformed) {
        transformed[name] = field.transform.output(transformed[name]);
      }
    });

    return transformed;
  }

  /**
   * Submit the form
   */
  async function handleSubmit(onSubmit) {
    stats.submissions++;

    try {
      // Prevent default if needed
      if (opts.submission.preventDefault && typeof event !== 'undefined') {
        event.preventDefault();
      }

      // Disable form during submission
      if (opts.submission.disableOnSubmit) {
        state.isSubmitting = true;
      }

      // Execute beforeSubmit middleware
      let values = { ...state.values };
      values = await executeMiddleware('beforeSubmit', values);

      // Validate before submit
      if (opts.submission.validateBeforeSubmit) {
        const validation = await validateForm();

        if (!validation.valid) {
          if (opts.submission.onError) {
            opts.submission.onError(validation.errors);
          }

          stats.failedSubmissions++;
          return { success: false, errors: validation.errors };
        }
      }

      // Apply transformations
      values = applyTransformations(values);

      // Execute afterValidation middleware
      values = await executeMiddleware('afterValidation', values);

      // Submit
      const result = await onSubmit(values);

      // Execute afterSubmit middleware
      await executeMiddleware('afterSubmit', result);

      state.submitCount++;
      stats.successfulSubmissions++;

      // Reset on success
      if (opts.submission.resetOnSuccess) {
        reset();
      }

      if (opts.submission.onSuccess) {
        opts.submission.onSuccess(result);
      }

      return { success: true, data: result };

    } catch (error) {
      stats.failedSubmissions++;

      if (opts.submission.onError) {
        opts.submission.onError(error);
      }

      // Execute onError middleware
      await executeMiddleware('onError', error);

      return { success: false, error };

    } finally {
      state.isSubmitting = false;
    }
  }

  /**
   * Reset form to initial state
   */
  function reset(values) {
    const resetValues = values || opts.state.resetValues || opts.state.initialValues;

    state.values = { ...resetValues };
    state.errors = {};
    state.touched = {};
    state.dirty = {};
    state.visited = {};
    state.submitCount = 0;

    // Re-initialize field states
    fields.forEach((field, name) => {
      // Ensure field has a value from resetValues or defaultValue
      if (!(name in state.values)) {
        state.values[name] = field.defaultValue !== undefined
          ? field.defaultValue
          : '';
      }
      state.errors[name] = [];
      state.touched[name] = false;
      state.dirty[name] = false;
      state.visited[name] = false;
    });
  }

  /**
   * Get form errors
   */
  function getErrors(fieldName) {
    if (fieldName) {
      return state.errors[fieldName] || [];
    }

    if (opts.errors.customFormatter) {
      return opts.errors.customFormatter(state.errors);
    }

    if (opts.errors.format === 'simple') {
      // Return array of error messages
      return Object.values(state.errors).flat().map(e => e.message);
    }

    // Return detailed errors
    return state.errors;
  }

  /**
   * Check if form is valid
   */
  function isValid() {
    return Object.values(state.errors).every(errors => errors.length === 0);
  }

  /**
   * Check if form is dirty
   */
  function isDirty(fieldName) {
    if (fieldName) {
      return state.dirty[fieldName] || false;
    }
    return Object.values(state.dirty).some(dirty => dirty);
  }

  /**
   * Check if form is touched
   */
  function isTouched(fieldName) {
    if (fieldName) {
      return state.touched[fieldName] || false;
    }
    return Object.values(state.touched).some(touched => touched);
  }

  /**
   * Get form values
   */
  function getValues() {
    return { ...state.values };
  }

  /**
   * Set form values
   */
  function setValues(values, shouldValidate = false) {
    Object.entries(values).forEach(([name, value]) => {
      setFieldValue(name, value, shouldValidate);
    });
  }

  /**
   * Get form state
   */
  function getState() {
    return {
      values: { ...state.values },
      errors: { ...state.errors },
      touched: { ...state.touched },
      dirty: { ...state.dirty },
      visited: { ...state.visited },
      isSubmitting: state.isSubmitting,
      isValidating: state.isValidating,
      submitCount: state.submitCount,
      isValid: isValid(),
      isDirty: isDirty(),
      isTouched: isTouched()
    };
  }

  /**
   * Get statistics
   */
  function getStats() {
    return {
      ...stats,
      fieldsRegistered: fields.size,
      activeAsyncValidations: state.asyncValidations.size
    };
  }

  // Register initial fields
  Object.entries(opts.fields).forEach(([name, config]) => {
    registerField(name, config);
  });

  return {
    registerField,
    getField,
    setFieldValue,
    getFieldValue,
    setFieldTouched,
    setFieldVisited,
    validateField,
    validateForm,
    handleSubmit,
    reset,
    getErrors,
    isValid,
    isDirty,
    isTouched,
    getValues,
    setValues,
    getState,
    getStats,
    // Expose state for testing
    _state: state
  };
}

// Export built-in validators
export const formValidators = {
  required: {
    name: 'required',
    validate: (value) => {
      return value !== '' && value !== null && value !== undefined;
    },
    message: 'This field is required'
  },

  email: {
    name: 'email',
    validate: (value) => {
      if (!value) return true;
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(value);
    },
    message: 'Please enter a valid email address'
  },

  minLength: (min) => ({
    name: 'minLength',
    validate: (value) => {
      if (!value) return true;
      return String(value).length >= min;
    },
    message: `Must be at least ${min} characters`
  }),

  maxLength: (max) => ({
    name: 'maxLength',
    validate: (value) => {
      if (!value) return true;
      return String(value).length <= max;
    },
    message: `Must be no more than ${max} characters`
  }),

  pattern: (regex, message) => ({
    name: 'pattern',
    validate: (value) => {
      if (!value) return true;
      return regex.test(value);
    },
    message: message || 'Invalid format'
  }),

  asyncEmail: {
    name: 'asyncEmail',
    validate: async (value) => {
      if (!value) return true;
      // Simulate async validation (e.g., check if email exists)
      await new Promise(resolve => setTimeout(resolve, 100));
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(value);
    },
    message: 'Please enter a valid email address',
    debounce: 500
  },

  asyncUnique: (checkFn) => ({
    name: 'asyncUnique',
    validate: async (value) => {
      if (!value) return true;
      return await checkFn(value);
    },
    message: 'This value is already taken',
    debounce: 500
  })
};

// Export default instance
export const enhancedForm = createForm();
