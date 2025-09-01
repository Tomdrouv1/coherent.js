/**
 * Form Validation and Data Binding System for Coherent.js
 * Provides comprehensive form handling with reactive validation
 */

import { ReactiveState, observable, computed } from '../state/reactive-state.js';
import { globalErrorHandler } from '../utils/_error-handler.js';

/**
 * Built-in validation rules
 */
export const validationRules = {
    required: (value, params = true) => {
        if (!params) return true;
        const isEmpty = value === null || value === undefined || value === '' || 
                       (Array.isArray(value) && value.length === 0);
        return !isEmpty || 'This field is required';
    },

    min: (value, minValue) => {
        if (value === null || value === undefined || value === '') return true;
        const num = Number(value);
        return isNaN(num) || num >= minValue || `Value must be at least ${minValue}`;
    },

    max: (value, maxValue) => {
        if (value === null || value === undefined || value === '') return true;
        const num = Number(value);
        return isNaN(num) || num <= maxValue || `Value must be no more than ${maxValue}`;
    },

    minLength: (value, minLen) => {
        if (value === null || value === undefined) return true;
        const str = String(value);
        return str.length >= minLen || `Must be at least ${minLen} characters`;
    },

    maxLength: (value, maxLen) => {
        if (value === null || value === undefined) return true;
        const str = String(value);
        return str.length <= maxLen || `Must be no more than ${maxLen} characters`;
    },

    pattern: (value, regex, message = 'Invalid format') => {
        if (value === null || value === undefined || value === '') return true;
        const pattern = typeof regex === 'string' ? new RegExp(regex) : regex;
        return pattern.test(String(value)) || message;
    },

    email: (value) => {
        if (value === null || value === undefined || value === '') return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(String(value)) || 'Please enter a valid email address';
    },

    url: (value) => {
        if (value === null || value === undefined || value === '') return true;
        try {
            new URL(String(value));
            return true;
        } catch {
            return 'Please enter a valid URL';
        }
    },

    numeric: (value) => {
        if (value === null || value === undefined || value === '') return true;
        return !isNaN(Number(value)) || 'Must be a valid number';
    },

    integer: (value) => {
        if (value === null || value === undefined || value === '') return true;
        const num = Number(value);
        return Number.isInteger(num) || 'Must be a whole number';
    },

    alpha: (value) => {
        if (value === null || value === undefined || value === '') return true;
        return /^[a-zA-Z]+$/.test(String(value)) || 'Must contain only letters';
    },

    alphanumeric: (value) => {
        if (value === null || value === undefined || value === '') return true;
        return /^[a-zA-Z0-9]+$/.test(String(value)) || 'Must contain only letters and numbers';
    },

    equals: (value, otherValue, fieldName = 'other field') => {
        return value === otherValue || `Must match ${fieldName}`;
    },

    oneOf: (value, options, message = 'Invalid selection') => {
        if (value === null || value === undefined || value === '') return true;
        return options.includes(value) || message;
    },

    custom: (value, validator, ...args) => {
        if (typeof validator !== 'function') {
            throw new Error('Custom validator must be a function');
        }
        return validator(value, ...args);
    }
};

/**
 * Field validation class
 */
class FieldValidator {
    constructor(name, rules = {}, options = {}) {
        this.name = name;
        this.rules = rules;
        this.options = {
            validateOnChange: options.validateOnChange !== false,
            validateOnBlur: options.validateOnBlur !== false,
            debounce: options.debounce || 0,
            ...options
        };

        this.errors = observable([]);
        this.isValid = computed(() => this.errors.value.length === 0);
        this.isPending = observable(false);
        this.isTouched = observable(false);
        this.isDirty = observable(false);

        this._debounceTimer = null;
    }

    /**
     * Validate field value
     */
    async validate(value, formData = {}) {
        this.isPending.value = true;
        const errors = [];

        try {
            for (const [ruleName, ruleParams] of Object.entries(this.rules)) {
                const validator = validationRules[ruleName];
                
                if (!validator) {
                    console.warn(`Unknown validation rule: ${ruleName}`);
                    continue;
                }

                let result;

                // Handle async validators
                if (validator.constructor.name === 'AsyncFunction') {
                    result = await validator(value, ruleParams, formData);
                } else {
                    result = validator(value, ruleParams, formData);
                }

                if (result !== true) {
                    errors.push(typeof result === 'string' ? result : `Invalid ${this.name}`);
                    
                    // Stop on first _error unless configured otherwise
                    if (!this.options.validateAll) {
                        break;
                    }
                }
            }
        } catch (_error) {
            globalErrorHandler.handle(_error, {
                type: 'validation-_error',
                context: { field: this.name, value, rules: this.rules }
            });
            errors.push('Validation _error occurred');
        } finally {
            this.isPending.value = false;
        }

        this.errors.value = errors;
        return this.isValid.value;
    }

    /**
     * Validate with debouncing
     */
    validateDebounced(value, formData = {}) {
        if (this.options.debounce <= 0) {
            return this.validate(value, formData);
        }

        return new Promise((resolve) => {
            if (this._debounceTimer) {
                clearTimeout(this._debounceTimer);
            }

            this._debounceTimer = setTimeout(async () => {
                const result = await this.validate(value, formData);
                resolve(result);
            }, this.options.debounce);
        });
    }

    /**
     * Mark field as touched
     */
    touch() {
        this.isTouched.value = true;
    }

    /**
     * Mark field as dirty
     */
    dirty() {
        this.isDirty.value = true;
    }

    /**
     * Reset field state
     */
    reset() {
        this.errors.value = [];
        this.isTouched.value = false;
        this.isDirty.value = false;
        this.isPending.value = false;
    }

    /**
     * Get field state
     */
    getState() {
        return {
            errors: this.errors.value,
            isValid: this.isValid.value,
            isPending: this.isPending.value,
            isTouched: this.isTouched.value,
            isDirty: this.isDirty.value,
            hasError: this.errors.value.length > 0
        };
    }
}

/**
 * Form validation and binding system
 */
export class FormValidator {
    constructor(schema = {}, options = {}) {
        this.schema = schema;
        this.options = {
            validateOnSubmit: options.validateOnSubmit !== false,
            validateOnChange: options.validateOnChange !== false,
            stopOnFirstError: options.stopOnFirstError !== false,
            ...options
        };

        this.data = new ReactiveState();
        this.validators = new Map();
        this.isSubmitting = observable(false);
        this.submitCount = observable(0);

        // Initialize validators
        this.initializeValidators();

        // Computed properties for form state
        this.isValid = computed(() => {
            return Array.from(this.validators.values()).every(validator => validator.isValid.value);
        });

        this.isPending = computed(() => {
            return Array.from(this.validators.values()).some(validator => validator.isPending.value);
        });

        this.isTouched = computed(() => {
            return Array.from(this.validators.values()).some(validator => validator.isTouched.value);
        });

        this.isDirty = computed(() => {
            return Array.from(this.validators.values()).some(validator => validator.isDirty.value);
        });

        this.errors = computed(() => {
            const allErrors = {};
            for (const [name, validator] of this.validators.entries()) {
                if (validator.errors.value.length > 0) {
                    allErrors[name] = validator.errors.value;
                }
            }
            return allErrors;
        });
    }

    /**
     * Initialize field validators from schema
     */
    initializeValidators() {
        for (const [fieldName, fieldSchema] of Object.entries(this.schema)) {
            const rules = fieldSchema.rules || fieldSchema;
            const options = fieldSchema.options || {};
            
            this.validators.set(fieldName, new FieldValidator(fieldName, rules, options));
            
            // Initialize data
            this.data.set(fieldName, fieldSchema.default || '');

            // Watch for changes if validation on change is enabled
            if (this.options.validateOnChange) {
                this.data.watch(fieldName, (newValue) => {
                    const validator = this.validators.get(fieldName);
                    validator.dirty();
                    
                    if (validator.options.validateOnChange) {
                        validator.validateDebounced(newValue, this.data.toObject());
                    }
                });
            }
        }
    }

    /**
     * Set field value
     */
    setField(name, value) {
        this.data.set(name, value);
        
        const validator = this.validators.get(name);
        if (validator) {
            validator.dirty();
        }
    }

    /**
     * Get field value
     */
    getField(name) {
        return this.data.get(name);
    }

    /**
     * Set multiple fields
     */
    setFields(fields) {
        this.data.batch(fields);
    }

    /**
     * Get all form data
     */
    getData() {
        return this.data.toObject();
    }

    /**
     * Validate specific field
     */
    async validateField(name) {
        const validator = this.validators.get(name);
        if (!validator) {
            console.warn(`No validator found for field: ${name}`);
            return true;
        }

        const value = this.data.get(name);
        return validator.validate(value, this.data.toObject());
    }

    /**
     * Validate all fields
     */
    async validateAll() {
        const validationPromises = [];
        
        for (const [name, validator] of this.validators.entries()) {
            const value = this.data.get(name);
            validationPromises.push(validator.validate(value, this.data.toObject()));
        }

        const results = await Promise.all(validationPromises);
        return results.every(result => result === true);
    }

    /**
     * Handle field blur event
     */
    handleBlur(name) {
        const validator = this.validators.get(name);
        if (validator) {
            validator.touch();
            
            if (validator.options.validateOnBlur) {
                const value = this.data.get(name);
                validator.validate(value, this.data.toObject());
            }
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit(submitHandler) {
        if (this.isSubmitting.value) {
            return false;
        }

        this.isSubmitting.value = true;
        this.submitCount.value += 1;

        try {
            // Mark all fields as touched
            for (const validator of this.validators.values()) {
                validator.touch();
            }

            // Validate all fields if required
            let isValid = true;
            if (this.options.validateOnSubmit) {
                isValid = await this.validateAll();
            }

            if (!isValid) {
                return false;
            }

            // Execute submit handler
            if (typeof submitHandler === 'function') {
                const result = await submitHandler(this.getData(), this);
                return result !== false;
            }

            return true;

        } catch (_error) {
            globalErrorHandler.handle(_error, {
                type: 'form-submit-_error',
                context: { formData: this.getData() }
            });
            return false;
        } finally {
            this.isSubmitting.value = false;
        }
    }

    /**
     * Reset form to initial state
     */
    reset() {
        // Reset data to defaults
        for (const [fieldName, fieldSchema] of Object.entries(this.schema)) {
            this.data.set(fieldName, fieldSchema.default || '');
        }

        // Reset validators
        for (const validator of this.validators.values()) {
            validator.reset();
        }

        this.submitCount.value = 0;
    }

    /**
     * Add custom validator
     */
    addValidator(name, rules, options = {}) {
        this.validators.set(name, new FieldValidator(name, rules, options));
        if (!this.data.has(name)) {
            this.data.set(name, '');
        }
    }

    /**
     * Remove validator
     */
    removeValidator(name) {
        this.validators.delete(name);
    }

    /**
     * Get field validator
     */
    getValidator(name) {
        return this.validators.get(name);
    }

    /**
     * Get form state summary
     */
    getState() {
        return {
            isValid: this.isValid.value,
            isPending: this.isPending.value,
            isTouched: this.isTouched.value,
            isDirty: this.isDirty.value,
            isSubmitting: this.isSubmitting.value,
            submitCount: this.submitCount.value,
            errors: this.errors.value,
            data: this.getData()
        };
    }

    /**
     * Watch form state changes
     */
    watch(callback, options = {}) {
        const unsubscribers = [];

        // Watch form-level computed properties
        if (options.watchValid !== false) {
            unsubscribers.push(this.isValid.watch(callback));
        }
        if (options.watchPending !== false) {
            unsubscribers.push(this.isPending.watch(callback));
        }
        if (options.watchErrors !== false) {
            unsubscribers.push(this.errors.watch(callback));
        }

        // Return unsubscribe function
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }

    /**
     * Cleanup form
     */
    destroy() {
        this.data.destroy();
        this.validators.clear();
    }
}

/**
 * Create form validator
 */
export function createForm(schema, options = {}) {
    return new FormValidator(schema, options);
}

/**
 * Data binding utilities
 */
export const binding = {
    /**
     * Two-way data binding for input elements
     */
    model(form, fieldName, options = {}) {
        return {
            value: form.getField(fieldName),
            oninput: (event) => {
                const value = options.number ? Number(event.target.value) : event.target.value;
                form.setField(fieldName, value);
            },
            onblur: () => {
                form.handleBlur(fieldName);
            }
        };
    },

    /**
     * Checkbox binding
     */
    checkbox(form, fieldName) {
        return {
            checked: Boolean(form.getField(fieldName)),
            onchange: (event) => {
                form.setField(fieldName, event.target.checked);
            },
            onblur: () => {
                form.handleBlur(fieldName);
            }
        };
    },

    /**
     * Select dropdown binding
     */
    select(form, fieldName, options = {}) {
        return {
            value: form.getField(fieldName),
            onchange: (event) => {
                const value = options.multiple 
                    ? Array.from(event.target.selectedOptions, opt => opt.value)
                    : event.target.value;
                form.setField(fieldName, value);
            },
            onblur: () => {
                form.handleBlur(fieldName);
            }
        };
    },

    /**
     * Radio button binding
     */
    radio(form, fieldName, value) {
        return {
            checked: form.getField(fieldName) === value,
            value: value,
            onchange: (event) => {
                if (event.target.checked) {
                    form.setField(fieldName, value);
                }
            }
        };
    }
};

/**
 * Form component helpers
 */
export const formComponents = {
    /**
     * Validation _error display
     */
    ValidationError({ form, field, className = 'validation-_error' }) {
        const validator = form.getValidator(field);
        if (!validator || validator.errors.value.length === 0) {
            return null;
        }

        return {
            div: {
                className,
                children: validator.errors.value.map(_error => ({
                    span: { text: _error, className: '_error-message' }
                }))
            }
        };
    },

    /**
     * Form field wrapper with validation
     */
    FormField({ form, field, label, children, showErrors = true }) {
        const validator = form.getValidator(field);
        const state = validator ? validator.getState() : {};

        return {
            div: {
                className: `form-field ${state.hasError ? 'has-_error' : ''} ${state.isTouched ? 'touched' : ''}`,
                children: [
                    label ? { label: { text: label, htmlFor: field } } : null,
                    children,
                    showErrors && state.hasError ? 
                        formComponents.ValidationError({ form, field }) : null
                ].filter(Boolean)
            }
        };
    }
};
