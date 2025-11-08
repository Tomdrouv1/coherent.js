/**
 * Coherent.js Forms - Validators
 * 
 * Form validation utilities
 * 
 * @module forms/validators
 */

/**
 * Built-in validators with signature: (value, options, translator, allValues) => errorMessage | null
 */
export const validators = {
  required: (value, options = {}) => {
    if (value === null || value === undefined || value === '') {
      return options.message || validators.required.message || 'This field is required';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  minLength: (value, options = {}) => {
    if (!value) return null;
    const min = options.min || 0;
    if (value.length < min) {
      return options.message || `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value, options = {}) => {
    if (!value) return null;
    const max = options.max || Infinity;
    if (value.length > max) {
      return options.message || `Must be no more than ${max} characters`;
    }
    return null;
  },

  min: (value, options = {}) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    const minValue = options.min || 0;
    if (isNaN(num) || num < minValue) {
      return options.message || `Must be at least ${minValue}`;
    }
    return null;
  },

  max: (value, options = {}) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    const maxValue = options.max || Infinity;
    if (isNaN(num) || num > maxValue) {
      return options.message || `Must be no more than ${maxValue}`;
    }
    return null;
  },

  pattern: (value, options = {}) => {
    if (!value) return null;
    const regex = options.pattern || options.regex;
    if (regex && !regex.test(value)) {
      return options.message || 'Invalid format';
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  number: (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (isNaN(Number(value))) {
      return 'Must be a valid number';
    }
    return null;
  },

  integer: (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num)) {
      return 'Must be a whole number';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  date: (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Please enter a valid date';
    }
    return null;
  },

  match: (value, options = {}, translator, allValues = {}) => {
    if (!value) return null;
    const fieldName = options.field || options.fieldName;
    if (value !== allValues[fieldName]) {
      return options.message || `Must match ${fieldName}`;
    }
    return null;
  },

  custom: (value, options = {}, translator, allValues) => {
    const validatorFn = options.validator || options.fn;
    if (!validatorFn) return null;
    const isValid = validatorFn(value, allValues);
    return isValid ? null : (options.message || 'Validation failed');
  },

  fileType: (value, options = {}) => {
    if (!value) return null;
    
    const allowedTypes = options.accept || options.types || [];
    
    // Handle File object
    if (value.type !== undefined) {
      const fileType = value.type;
      const fileExt = value.name ? value.name.split('.').pop().toLowerCase() : '';
      
      // Check MIME type or extension
      const isValid = allowedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type.slice(1).toLowerCase();
        }
        if (type.includes('/')) {
          if (type.endsWith('/*')) {
            return fileType.startsWith(type.replace('/*', '/'));
          }
          return fileType === type;
        }
        return fileExt === type.toLowerCase();
      });
      
      if (!isValid) {
        return options.message || `File type must be one of: ${allowedTypes.join(', ')}`;
      }
      return null;
    }
    
    return null;
  },

  fileSize: (value, options = {}) => {
    if (!value) return null;
    
    const maxSize = options.maxSize || Infinity;
    
    // Handle File object
    if (value.size !== undefined) {
      if (value.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        return options.message || `File size must be less than ${maxSizeMB}MB`;
      }
      return null;
    }
    
    return null;
  },

  fileExtension: (value, options = {}) => {
    if (!value) return null;
    
    const allowedExtensions = options.extensions || [];
    const fileName = value.name || value;
    const ext = `.${  fileName.split('.').pop().toLowerCase()}`;
    
    const isValid = allowedExtensions.some(allowed => {
      return ext === allowed.toLowerCase();
    });
    
    if (!isValid) {
      return options.message || `File extension must be one of: ${allowedExtensions.join(', ')}`;
    }
    return null;
  },

  alpha: (value) => {
    if (!value) return null;
    const alphaRegex = /^[a-zA-Z]+$/;
    if (!alphaRegex.test(value)) {
      return 'Must contain only letters';
    }
    return null;
  },

  alphanumeric: (value) => {
    if (!value) return null;
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(value)) {
      return 'Must contain only letters and numbers';
    }
    return null;
  },

  uppercase: (value) => {
    if (!value) return null;
    if (value !== value.toUpperCase()) {
      return 'Must be uppercase';
    }
    return null;
  },

  // Get a registered validator
  get: (name) => {
    return validators[name];
  },

  // Compose multiple validators
  compose: (validatorList) => {
    return (value, options, translator, allValues) => {
      for (const validator of validatorList) {
        const error = typeof validator === 'function'
          ? validator(value, options, translator, allValues)
          : null;
        if (error) {
          return error;
        }
      }
      return null;
    };
  },

  // Debounce async validator
  debounce: (validator, delay = 300) => {
    let timeoutId;
    return (value) => {
      return new Promise((resolve) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          const result = await validator(value);
          resolve(result);
        }, delay);
      });
    };
  },

  // Cancellable async validator
  cancellable: (validator) => {
    let abortController;
    const wrapped = async (value) => {
      if (abortController) {
        abortController.abort();
      }
      // AbortController is a global browser/Node.js API
      abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      try {
        return await validator(value, abortController ? abortController.signal : null);
      } catch (error) {
        if (error.name === 'AbortError') {
          return null;
        }
        throw error;
      }
    };
    wrapped.cancel = () => {
      if (abortController) {
        abortController.abort();
      }
    };
    return wrapped;
  },

  // Conditional validator
  when: (condition, validator) => {
    return (value, options = {}, translator, allValues = {}) => {
      // Pass options as context if it looks like context (has non-validator properties)
      const context = options.min !== undefined || options.max !== undefined ? allValues : options;
      const shouldValidate = typeof condition === 'function' 
        ? condition(value, context) 
        : condition;
      
      if (!shouldValidate) {
        return null;
      }
      
      return typeof validator === 'function'
        ? validator(value, options, translator, allValues)
        : null;
    };
  },

  // Validator chain builder
  chain: (options = {}) => {
    const validatorList = [];
    const stopOnFirstError = options.stopOnFirstError !== false;
    
    const chain = {
      required: (opts) => {
        validatorList.push((v, o, t, a) => validators.required(v, opts || o, t, a));
        return chain;
      },
      email: (opts) => {
        validatorList.push((v, o, t, a) => validators.email(v, opts || o, t, a));
        return chain;
      },
      minLength: (opts) => {
        validatorList.push((v, o, t, a) => validators.minLength(v, opts || o, t, a));
        return chain;
      },
      maxLength: (opts) => {
        validatorList.push((v, o, t, a) => validators.maxLength(v, opts || o, t, a));
        return chain;
      },
      custom: (fn, message) => {
        validatorList.push((v, o, t, a) => {
          // Custom validator returns null if valid, message if invalid
          const result = fn(v, a);
          return result === null || result === true || result === undefined ? null : (message || result);
        });
        return chain;
      },
      validate: (value, opts, translator, allValues) => {
        if (stopOnFirstError) {
          // Stop on first error - return single error or null
          for (const validator of validatorList) {
            const error = validator(value, opts, translator, allValues);
            if (error) {
              return error;
            }
          }
          return null;
        } else {
          // Collect all errors - return array or null
          const errors = [];
          for (const validator of validatorList) {
            const error = validator(value, opts, translator, allValues);
            if (error) {
              errors.push(error);
            }
          }
          return errors.length > 0 ? errors : null;
        }
      }
    };
    
    return chain;
  }
};

/**
 * Validate a single field
 */
export function validateField(value, validatorList, formData = {}) {
  for (const validator of validatorList) {
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
export function validateForm(formData, fieldValidators) {
  const errors = {};
  
  for (const [fieldName, validatorList] of Object.entries(fieldValidators)) {
    const value = formData[fieldName];
    const error = validateField(value, validatorList, formData);
    if (error) {
      errors[fieldName] = error;
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Create a validator
 */
export function createValidator(validatorFn, message) {
  return (value, options, translator, allValues) => {
    const result = validatorFn(value, options, translator, allValues);
    // If validator returns a string, use it as the error message
    if (typeof result === 'string') {
      return result;
    }
    // If validator returns falsy (null, false, undefined), no error
    if (!result) {
      return null;
    }
    // If validator returns truthy (true, object, etc), use provided message
    return message || 'Validation failed';
  };
}

/**
 * Register a custom validator
 */
export function registerValidator(name, validatorFn) {
  validators[name] = validatorFn;
}

/**
 * Compose multiple validators
 */
export function composeValidators(...validatorFns) {
  return (value, options, translator, allValues) => {
    for (const validator of validatorFns) {
      const error = validator(value, options, translator, allValues);
      if (error) {
        return error;
      }
    }
    return null;
  };
}

export default {
  validators,
  validateField,
  validateForm,
  createValidator,
  registerValidator,
  composeValidators
};
