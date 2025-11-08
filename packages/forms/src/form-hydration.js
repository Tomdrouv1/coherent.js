/**
 * Form Hydration for Coherent.js
 *
 * Progressive enhancement for server-rendered forms
 * Reads validation metadata from HTML and attaches client-side behavior
 *
 * @module forms/form-hydration
 */

import { validators } from './validators.js';

/**
 * Hydrate a server-rendered form with client-side validation and behavior
 *
 * @param {string|HTMLFormElement} formSelector - Form selector or element
 * @param {Object} options - Hydration options
 * @returns {Object} Form controller
 */
export function hydrateForm(formSelector, options = {}) {
  // Browser-only check
  if (typeof document === 'undefined') {
    console.warn('hydrateForm can only run in browser environment');
    return null;
  }

  const form = typeof formSelector === 'string'
    ? document.querySelector(formSelector)
    : formSelector;

  if (!form) {
    console.warn(`Form not found: ${formSelector}`);
    return null;
  }

  const opts = {
    validateOnBlur: true,
    validateOnChange: false,
    validateOnSubmit: true,
    showErrorsOnTouch: true,
    debounce: 300,
    ...options
  };

  // Form state
  const state = {
    values: {},
    errors: {},
    touched: {},
    isSubmitting: false,
    fields: new Map()
  };

  // Debounce timers
  const debounceTimers = new Map();

  /**
   * Parse validators from data-validators attribute
   */
  function parseValidators(validatorString) {
    if (!validatorString) return [];

    return validatorString.split(',').map(v => {
      const trimmed = v.trim();

      // Handle validators with parameters: minLength:8
      const [name, ...params] = trimmed.split(':');

      if (validators[name]) {
        return params.length > 0
          ? validators[name](...params.map(p => isNaN(p) ? p : Number(p)))
          : validators[name];
      }

      return null;
    }).filter(Boolean);
  }

  /**
   * Discover and register fields from form HTML
   */
  function discoverFields() {
    const inputs = form.querySelectorAll('[name]');

    inputs.forEach(input => {
      const name = input.getAttribute('name');
      const field = {
        name,
        element: input,
        type: input.getAttribute('type') || 'text',
        required: input.hasAttribute('required') || input.dataset.required === 'true',
        validators: parseValidators(input.dataset.validators),
        errorElement: null
      };

      // Find or create error display element
      const errorId = `${name}-error`;
      field.errorElement = document.getElementById(errorId) || createErrorElement(name, input);

      state.fields.set(name, field);
      state.values[name] = getFieldValue(input);
      state.touched[name] = false;
      state.errors[name] = null;
    });
  }

  /**
   * Create error display element
   */
  function createErrorElement(name, inputElement) {
    const errorDiv = document.createElement('div');
    errorDiv.id = `${name}-error`;
    errorDiv.className = 'error-message';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.style.display = 'none';

    // Insert after input or its parent field wrapper
    const fieldWrapper = inputElement.closest('.form-field') || inputElement.parentElement;
    fieldWrapper.appendChild(errorDiv);

    return errorDiv;
  }

  /**
   * Get field value based on input type
   */
  function getFieldValue(input) {
    if (input.type === 'checkbox') {
      return input.checked;
    } else if (input.type === 'radio') {
      const checked = form.querySelector(`[name="${input.name}"]:checked`);
      return checked ? checked.value : null;
    } else {
      return input.value;
    }
  }

  /**
   * Set field value
   */
  function setFieldValue(name, value) {
    const field = state.fields.get(name);
    if (!field) return;

    const { element } = field;

    if (element.type === 'checkbox') {
      element.checked = Boolean(value);
    } else if (element.type === 'radio') {
      const radio = form.querySelector(`[name="${name}"][value="${value}"]`);
      if (radio) radio.checked = true;
    } else {
      element.value = value;
    }

    state.values[name] = value;
  }

  /**
   * Validate a single field
   */
  function validateField(name) {
    const field = state.fields.get(name);
    if (!field) return true;

    const value = state.values[name];
    let error = null;

    // Required validation
    if (field.required && (value === null || value === undefined || value === '')) {
      error = 'This field is required';
    }

    // Run custom validators
    if (!error && field.validators.length > 0) {
      for (const validator of field.validators) {
        const result = validator.validate
          ? validator.validate(value, state.values)
          : validator(value, state.values);

        if (result !== true && result !== undefined && result !== null) {
          error = validator.message || result || 'Validation failed';
          break;
        }
      }
    }

    state.errors[name] = error;
    displayError(name, error);

    return !error;
  }

  /**
   * Display error message
   */
  function displayError(name, error) {
    const field = state.fields.get(name);
    if (!field) return;

    const { element, errorElement } = field;

    if (error && state.touched[name] && opts.showErrorsOnTouch) {
      // Show error
      errorElement.textContent = error;
      errorElement.style.display = 'block';
      element.setAttribute('aria-invalid', 'true');
      element.classList.add('error');
    } else {
      // Hide error
      errorElement.textContent = '';
      errorElement.style.display = 'none';
      element.setAttribute('aria-invalid', 'false');
      element.classList.remove('error');
    }
  }

  /**
   * Validate entire form
   */
  function validateForm() {
    let isValid = true;

    for (const name of state.fields.keys()) {
      const fieldValid = validateField(name);
      if (!fieldValid) isValid = false;
    }

    return isValid;
  }

  /**
   * Handle input change
   */
  function handleChange(event) {
    const input = event.target;
    const name = input.getAttribute('name');

    if (!state.fields.has(name)) return;

    state.values[name] = getFieldValue(input);

    if (opts.validateOnChange) {
      // Debounce validation
      if (debounceTimers.has(name)) {
        clearTimeout(debounceTimers.get(name));
      }

      const timer = setTimeout(() => {
        validateField(name);
        debounceTimers.delete(name);
      }, opts.debounce);

      debounceTimers.set(name, timer);
    }
  }

  /**
   * Handle input blur
   */
  function handleBlur(event) {
    const input = event.target;
    const name = input.getAttribute('name');

    if (!state.fields.has(name)) return;

    state.touched[name] = true;

    if (opts.validateOnBlur) {
      validateField(name);
    }
  }

  /**
   * Handle form submission
   */
  function handleSubmit(event) {
    event.preventDefault();

    // Mark all fields as touched
    for (const name of state.fields.keys()) {
      state.touched[name] = true;
    }

    const isValid = validateForm();

    if (!isValid) {
      // Focus first error field
      const firstErrorField = Array.from(state.fields.values())
        .find(field => state.errors[field.name]);

      if (firstErrorField) {
        firstErrorField.element.focus();
      }

      // Call onError callback
      if (options.onError) {
        options.onError(state.errors);
      }

      return;
    }

    // Form is valid, prepare submission
    state.isSubmitting = true;

    const submitData = { ...state.values };

    // Call onSubmit callback
    if (options.onSubmit) {
      const result = options.onSubmit(submitData, event);

      // If onSubmit returns false, don't submit
      if (result === false) {
        state.isSubmitting = false;
        return;
      }

      // If onSubmit returns a promise, wait for it
      if (result && typeof result.then === 'function') {
        result
          .then(() => {
            state.isSubmitting = false;
            if (options.onSuccess) {
              options.onSuccess(submitData);
            }
          })
          .catch(error => {
            state.isSubmitting = false;
            if (options.onError) {
              options.onError(error);
            }
          });
        return;
      }
    }

    // Default: submit the form normally
    if (!options.onSubmit) {
      form.submit();
    }

    state.isSubmitting = false;
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    // Input change events
    state.fields.forEach(field => {
      field.element.addEventListener('input', handleChange);
      field.element.addEventListener('blur', handleBlur);
    });

    // Form submit
    form.addEventListener('submit', handleSubmit);
  }

  /**
   * Detach event listeners (cleanup)
   */
  function detachEventListeners() {
    state.fields.forEach(field => {
      field.element.removeEventListener('input', handleChange);
      field.element.removeEventListener('blur', handleBlur);
    });

    form.removeEventListener('submit', handleSubmit);

    // Clear debounce timers
    debounceTimers.forEach(timer => clearTimeout(timer));
    debounceTimers.clear();
  }

  /**
   * Reset form to initial state
   */
  function reset() {
    state.fields.forEach(field => {
      setFieldValue(field.name, '');
      state.touched[field.name] = false;
      state.errors[field.name] = null;
      displayError(field.name, null);
    });

    state.isSubmitting = false;
    form.reset();
  }

  // Initialize
  discoverFields();
  attachEventListeners();

  // Public API
  return {
    validateField,
    validateForm,
    setFieldValue,
    getFieldValue: (name) => state.values[name],
    getError: (name) => state.errors[name],
    getErrors: () => ({ ...state.errors }),
    getValues: () => ({ ...state.values }),
    setTouched: (name, touched = true) => {
      state.touched[name] = touched;
    },
    reset,
    destroy: detachEventListeners,
    isValid: () => Object.values(state.errors).every(e => !e),
    isSubmitting: () => state.isSubmitting,
    getState: () => ({
      values: { ...state.values },
      errors: { ...state.errors },
      touched: { ...state.touched },
      isSubmitting: state.isSubmitting
    })
  };
}

export default hydrateForm;
