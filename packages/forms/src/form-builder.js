/**
 * Coherent.js Form Builder
 * 
 * Utilities for building forms with Coherent.js
 * 
 * @module forms/form-builder
 */

/**
 * Form Builder
 * Helps create form components with validation
 */
export class FormBuilder {
  constructor(options = {}) {
    this.options = {
      validateOnChange: true,
      validateOnBlur: true,
      name: options.name || 'form',
      ...options
    };
    
    this.fields = new Map();
    this.groups = new Map();
    this.values = {};
    this.errors = {};
    this.touched = {};
    this.initialValues = {};
    this.submitHandler = null;
    this.errorHandler = null;
    this._isSubmitting = false;
  }

  /**
   * Add a field to the form (alias for field)
   */
  addField(name, config = {}) {
    return this.field(name, config);
  }

  /**
   * Add a field to the form
   */
  field(name, config = {}) {
    const fieldConfig = {
      name,
      type: config.type || 'text',
      label: config.label || name,
      placeholder: config.placeholder || '',
      defaultValue: config.defaultValue || '',
      validators: config.validators || [],
      required: config.required || false,
      visible: config.visible !== false,
      showWhen: config.showWhen,
      ...config
    };
    
    this.fields.set(name, fieldConfig);

    // Set default value
    if (config.defaultValue !== undefined) {
      this.values[name] = config.defaultValue;
      this.initialValues[name] = config.defaultValue;
    }

    return this;
  }

  /**
   * Remove a field from the form
   */
  removeField(name) {
    this.fields.delete(name);
    delete this.values[name];
    delete this.errors[name];
    delete this.touched[name];
    return this;
  }

  /**
   * Update field configuration
   */
  updateField(name, config) {
    const field = this.fields.get(name);
    if (field) {
      this.fields.set(name, { ...field, ...config });
    }
    return this;
  }

  /**
   * Get all fields as array
   */
  getFields() {
    return Array.from(this.fields.values());
  }

  /**
   * Add a field group
   */
  addGroup(name, config = {}) {
    this.groups.set(name, {
      name,
      label: config.label || name,
      fields: config.fields || [],
      ...config
    });

    // Add fields in the group
    if (config.fields) {
      config.fields.forEach(fieldConfig => {
        this.addField(fieldConfig.name, fieldConfig);
      });
    }

    return this;
  }

  /**
   * Get field configuration
   */
  getField(name) {
    return this.fields.get(name);
  }

  /**
   * Set field value
   */
  setValue(name, value) {
    this.values[name] = value;
    this.touched[name] = true;

    const field = this.fields.get(name);
    if (field && (field.validateOnChange || this.options.validateOnChange)) {
      this.validateField(name);
    }
  }

  /**
   * Set multiple values
   */
  setValues(values) {
    Object.assign(this.values, values);
    return this;
  }

  /**
   * Get field value
   */
  getValue(name) {
    return this.values[name];
  }

  /**
   * Get all values
   */
  getValues() {
    return { ...this.values };
  }

  /**
   * Get field error
   */
  getFieldError(name) {
    return this.errors[name];
  }

  /**
   * Check if form has errors
   */
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = {};
    return this;
  }

  /**
   * Check if form is dirty (values changed from initial)
   */
  isDirty() {
    return Object.keys(this.values).some(key => {
      return this.values[key] !== this.initialValues[key];
    });
  }

  /**
   * Check if form is valid
   */
  isValid() {
    const result = this.validate();
    return Object.keys(result).length === 0;
  }

  /**
   * Validate a field
   */
  validateField(name) {
    const field = this.fields.get(name);
    if (!field) return null;

    // Skip validation for hidden fields (support both showWhen and showIf)
    const showCondition = field.showWhen || field.showIf;
    if (showCondition && !showCondition(this.values)) {
      delete this.errors[name];
      return null;
    }

    const value = this.values[name];
    
    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      const error = 'This field is required';
      this.errors[name] = error;
      return error;
    }

    // Skip further validation if empty and not required
    if (!value && !field.required) {
      delete this.errors[name];
      return null;
    }

    // Type-based validation
    if (value) {
      if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          const error = 'Please enter a valid email address';
          this.errors[name] = error;
          return error;
        }
      } else if (field.type === 'url') {
        try {
          new URL(value);
        } catch {
          const error = 'Please enter a valid URL';
          this.errors[name] = error;
          return error;
        }
      } else if (field.type === 'number') {
        if (isNaN(Number(value))) {
          const error = 'Please enter a valid number';
          this.errors[name] = error;
          return error;
        }
      }
    }

    // Check custom validate function
    if (field.validate) {
      const error = field.validate(value, this.values);
      if (error) {
        this.errors[name] = error;
        return error;
      }
    }

    // Run validators
    for (const validator of field.validators || []) {
      const error = validator(value, this.values);
      if (error) {
        this.errors[name] = error;
        return error;
      }
    }

    delete this.errors[name];
    return null;
  }

  /**
   * Validate all fields
   */
  validate() {
    const errors = {};

    for (const [name, field] of this.fields) {
      // Skip hidden fields (support both showWhen and showIf)
      const showCondition = field.showWhen || field.showIf;
      if (showCondition && !showCondition(this.values)) {
        continue;
      }

      const error = this.validateField(name);
      if (error) {
        errors[name] = error;
      }
    }

    this.errors = errors;
    return errors;
  }

  /**
   * Set submit handler
   */
  onSubmit(handler) {
    this.submitHandler = handler;
    return this;
  }

  /**
   * Set error handler
   */
  onError(handler) {
    this.errorHandler = handler;
    return this;
  }

  /**
   * Submit the form
   */
  async submit() {
    const errors = this.validate();
    
    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    if (!this.submitHandler) {
      return { success: true, data: this.values };
    }

    this._isSubmitting = true;

    try {
      const result = await this.submitHandler(this.values);
      this._isSubmitting = false;
      return { success: true, data: result };
    } catch (error) {
      this._isSubmitting = false;
      if (this.errorHandler) {
        this.errorHandler(error);
      }
      return { success: false, error };
    }
  }

  /**
   * Serialize form data
   */
  serialize() {
    return { ...this.values };
  }

  /**
   * Convert form to HTML string
   */
  toHTML() {
    const fields = this.getFields();
    let html = `<form name="${this.options.name}">`;
    
    fields.forEach(field => {
      html += `<div class="form-field">`;
      html += `<label for="${field.name}">${field.label}</label>`;
      html += `<input type="${field.type}" name="${field.name}" id="${field.name}">`;
      html += `</div>`;
    });
    
    html += `</form>`;
    return html;
  }

  /**
   * Mark field as touched
   */
  touch(name) {
    this.touched[name] = true;
  }

  /**
   * Build input component
   */
  buildInput(name) {
    const field = this.fields.get(name);
    if (!field) return null;

    const value = this.values[name] || '';
    const error = this.errors[name];
    const isTouched = this.touched[name];

    return {
      input: {
        type: field.type,
        name: field.name,
        id: field.name,
        value: value,
        placeholder: field.placeholder,
        'aria-invalid': error ? 'true' : 'false',
        'aria-describedby': error ? `${name}-error` : undefined,
        className: error && isTouched ? 'error' : '',
        onchange: `handleChange('${name}', event.target.value)`,
        onblur: `handleBlur('${name}')`
      }
    };
  }

  /**
   * Build label component
   */
  buildLabel(name) {
    const field = this.fields.get(name);
    if (!field) return null;

    return {
      label: {
        for: field.name,
        text: field.label
      }
    };
  }

  /**
   * Build error component
   */
  buildError(name) {
    const error = this.errors[name];
    const isTouched = this.touched[name];

    if (!error || !isTouched) return null;

    return {
      div: {
        id: `${name}-error`,
        className: 'error-message',
        role: 'alert',
        text: error
      }
    };
  }

  /**
   * Build complete field component
   */
  buildField(name) {
    const field = this.fields.get(name);
    if (!field) return null;

    const children = [
      this.buildLabel(name),
      this.buildInput(name)
    ];

    const error = this.buildError(name);
    if (error) {
      children.push(error);
    }

    return {
      div: {
        className: 'form-field',
        'data-field': name,
        children
      }
    };
  }

  /**
   * Build entire form
   */
  buildForm(options = {}) {
    const fields = [];

    for (const [name] of this.fields) {
      fields.push(this.buildField(name));
    }

    if (options.submitButton !== false) {
      fields.push({
        button: {
          type: 'submit',
          text: options.submitText || 'Submit',
          className: 'submit-button'
        }
      });
    }

    return {
      form: {
        onsubmit: 'handleSubmit(event)',
        novalidate: true,
        children: fields
      }
    };
  }

  /**
   * Check if form is currently submitting
   */
  isSubmitting() {
    return this._isSubmitting;
  }

  /**
   * Get a field group
   */
  getGroup(name) {
    return this.groups.get(name);
  }

  /**
   * Check if a field is visible
   */
  isFieldVisible(name) {
    const field = this.fields.get(name);
    if (!field) return false;
    
    // Support both showWhen and showIf
    const showCondition = field.showWhen || field.showIf;
    if (showCondition) {
      return showCondition(this.values);
    }
    
    return field.visible !== false;
  }

  /**
   * Reset form
   */
  reset() {
    // Reset to initial values or empty strings
    this.values = {};
    for (const [name, field] of this.fields) {
      if (field.defaultValue !== undefined) {
        this.values[name] = field.defaultValue;
      } else {
        this.values[name] = '';
      }
    }
    this.errors = {};
    this.touched = {};
    this._isSubmitting = false;
    return this;
  }
}

/**
 * Create a form builder
 */
export function createFormBuilder(options = {}) {
  return new FormBuilder(options);
}

/**
 * Create a form (alias for createFormBuilder)
 */
export function createForm(options = {}) {
  const form = new FormBuilder(options);
  
  // Add fields if provided
  if (options.fields) {
    options.fields.forEach(fieldConfig => {
      form.addField(fieldConfig.name, fieldConfig);
    });
  }
  
  return form;
}

/**
 * Quick form builder helper
 */
export function buildForm(fields, options = {}) {
  const builder = new FormBuilder(options);

  for (const [name, config] of Object.entries(fields)) {
    builder.field(name, config);
  }

  return builder;
}

export default {
  FormBuilder,
  createFormBuilder,
  createForm,
  buildForm
};
