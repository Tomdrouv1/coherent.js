/**
 * Coherent.js Form Builder
 * 
 * Utilities for building forms with Coherent.js
 * 
 * @module forms/form-builder
 */

import { render as renderToHTML } from '@coherent.js/core';

/**
 * Class applied to each structural slot. Consumers override any subset via
 * the `classNames` option; hydrateForm accepts `invalid` and `error` so the
 * client writes the same names the server rendered.
 */
export const DEFAULT_CLASS_NAMES = {
  /** Wrapper around label, control and error */
  field: 'form-field',
  label: '',
  /** Base class on the control, before any per-field className */
  control: '',
  /** Added to the control while it has a visible error */
  invalid: 'error',
  /** The error message element */
  error: 'error-message',
  submit: 'submit-button'
};

/**
 * Attribute names are interpolated into the markup unescaped by
 * formatAttributes, so a passthrough has to reject anything that is not a
 * plain name — otherwise `{'x onclick=alert(1)': ''}` injects an attribute.
 */
const VALID_ATTRIBUTE_NAME = /^[A-Za-z_:][-A-Za-z0-9_:.]*$/;

function safeAttributes(attributes) {
  if (!attributes || typeof attributes !== 'object') return {};

  const safe = {};
  for (const [name, value] of Object.entries(attributes)) {
    if (VALID_ATTRIBUTE_NAME.test(name)) {
      safe[name] = value;
    } else {
      console.warn(`[coherent.js/forms] Ignoring invalid attribute name: ${JSON.stringify(name)}`);
    }
  }
  return safe;
}

/** Join class names, dropping empties so no element carries `class=""`. */
function joinClasses(...names) {
  return names.filter(Boolean).join(' ');
}

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
  toHTML(options = {}) {
    // Delegates to buildForm() so there is one source of truth. The previous
    // hand-rolled string builder dropped action, method and every field
    // attribute beyond type/name/id, and interpolated values unescaped.
    return renderToHTML(this.buildForm(options));
  }

  /**
   * Mark field as touched
   */
  touch(name) {
    this.touched[name] = true;
  }

  /**
   * Build input component with validation metadata for hydration
   */
  buildInput(name, classNames = this.resolveClassNames()) {
    const field = this.fields.get(name);
    if (!field) return null;

    const value = this.values[name] || '';
    const error = this.errors[name];
    const isTouched = this.touched[name];

    // Build validator names string for data-validators attribute
    const validatorNames = field.validators
      .map(v => {
        if (typeof v === 'function') return v.name || 'custom';
        if (typeof v === 'string') return v;
        return null;
      })
      .filter(Boolean)
      .join(',');

    const controlClass = joinClasses(
      classNames.control,
      field.className,
      error && isTouched ? classNames.invalid : null
    );

    const inputProps = {
      // Spread first: name, id, type and the aria-* pair below are the
      // builder's own invariants, and hydration keys off them.
      ...safeAttributes(field.attributes),
      type: field.type,
      name: field.name,
      id: field.name,
      value: value,
      'aria-invalid': error ? 'true' : 'false',
      'aria-describedby': error ? `${name}-error` : undefined
    };

    if (field.placeholder) inputProps.placeholder = field.placeholder;
    if (controlClass) inputProps.className = controlClass;
    if (field.disabled) inputProps.disabled = true;
    if (field.readonly) inputProps.readonly = true;

    // Add validation metadata for client-side hydration
    if (field.required) {
      inputProps.required = true;
      inputProps['data-required'] = 'true';
    }

    if (validatorNames) {
      inputProps['data-validators'] = validatorNames;
    }

    // Note: Event handlers are attached during hydration, not inline
    // This enables progressive enhancement and CSP compliance

    // textarea and select are elements, not input types. `type="textarea"` is
    // not valid HTML — browsers render it as a single-line text box.
    if (field.type === 'textarea' || field.type === 'select') {
      const { type: _type, value: _value, ...rest } = inputProps;
      const props = { ...rest };

      if (field.type === 'textarea') {
        return { textarea: { ...props, text: String(value) } };
      }

      const { placeholder: _placeholder, ...selectProps } = props;

      return {
        select: {
          ...selectProps,
          children: (field.options ?? []).map(option => {
            const { value: optionValue, label = optionValue } =
              typeof option === 'object' && option !== null ? option : { value: option };

            return {
              option: {
                value: optionValue,
                selected: String(optionValue) === String(value) || undefined,
                text: String(label)
              }
            };
          })
        }
      };
    }

    return {
      input: inputProps
    };
  }

  /**
   * Build label component
   */
  buildLabel(name, classNames = this.resolveClassNames()) {
    const field = this.fields.get(name);
    if (!field) return null;

    const props = { for: field.name, text: field.label };
    if (classNames.label) props.className = classNames.label;

    return { label: props };
  }

  /**
   * Build error component
   */
  buildError(name, classNames = this.resolveClassNames()) {
    const error = this.errors[name];
    const isTouched = this.touched[name];

    if (!error || !isTouched) return null;

    const props = { id: `${name}-error`, role: 'alert', text: error };
    if (classNames.error) props.className = classNames.error;

    return { div: props };
  }

  /**
   * Merge configured class names over the defaults
   */
  resolveClassNames(overrides = {}) {
    return { ...DEFAULT_CLASS_NAMES, ...this.options.classNames, ...overrides };
  }

  /**
   * Build complete field component
   */
  buildField(name, classNames = this.resolveClassNames()) {
    const field = this.fields.get(name);
    if (!field) return null;

    const children = [
      this.buildLabel(name, classNames),
      this.buildInput(name, classNames)
    ];

    const error = this.buildError(name, classNames);
    if (error) {
      children.push(error);
    }

    // data-field is the structural hook hydrateForm uses to find the wrapper,
    // so classes stay entirely the consumer's to choose.
    const props = { 'data-field': name, children };
    if (classNames.field) props.className = classNames.field;

    return { div: props };
  }

  /**
   * Build entire form
   */
  buildForm(options = {}) {
    const settings = { ...this.options, ...options };
    const classNames = this.resolveClassNames(options.classNames);
    const fields = [];

    for (const [name] of this.fields) {
      // validate() has always skipped fields hidden by showWhen/showIf; render
      // agreed with it only by accident, because nothing was ever hidden.
      if (!this.isFieldVisible(name)) continue;
      fields.push(this.buildField(name, classNames));
    }

    if (settings.submitButton !== false) {
      const button = { type: 'submit', text: settings.submitText || 'Submit' };
      if (classNames.submit) button.className = classNames.submit;
      fields.push({ button });
    }

    const form = {};

    if (settings.action) form.action = settings.action;
    if (settings.method) form.method = settings.method;
    if (settings.name) form.name = settings.name;
    if (settings.id) form.id = settings.id;
    if (settings.className) form.className = settings.className;
    if (settings.enctype) form.enctype = settings.enctype;

    // Plain HTML by default: the form posts to `action` and the browser runs
    // its own validation with JavaScript off. hydrateForm binds its own submit
    // listener, so it never needed the inline handler this used to emit — and
    // an inline handler breaks under a strict CSP besides.
    if (settings.enhance) {
      form.onsubmit = typeof settings.enhance === 'string'
        ? settings.enhance
        : 'handleSubmit(event)';
    }

    if (settings.novalidate === true) form.novalidate = true;

    form.children = fields;

    return { form };
  }

  /**
   * Set the form action URL
   */
  setAction(action) {
    this.options.action = action;
    return this;
  }

  /**
   * Set the form submission method
   */
  setMethod(method) {
    this.options.method = method;
    return this;
  }

  /**
   * Build the form component (alias for buildForm)
   */
  build(options = {}) {
    return this.buildForm(options);
  }

  /**
   * Render the form to a component (alias for buildForm)
   */
  render(options = {}) {
    return this.buildForm(options);
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
 * Build a form component from a configuration object.
 *
 * Returns a renderable component, as the type declarations have always said.
 * It previously returned the FormBuilder itself, so `render(buildForm(...))`
 * threw "Invalid component structure". Use createFormBuilder() when you want
 * the builder.
 *
 * @param {Object} config - Form configuration; `fields` may be an array of
 *   field objects or an object keyed by field name. Remaining keys (action,
 *   method, name, className, enctype, submitText) configure the form element.
 * @returns {Object} A Coherent.js component
 */
export function buildForm(config = {}) {
  const { fields = [], ...options } = Array.isArray(config) ? { fields: config } : config;
  const builder = new FormBuilder(options);

  if (Array.isArray(fields)) {
    for (const field of fields) {
      if (field && field.name) builder.field(field.name, field);
    }
  } else {
    for (const [name, field] of Object.entries(fields)) {
      builder.field(name, field);
    }
  }

  return builder.buildForm(options);
}

export default {
  FormBuilder,
  createFormBuilder,
  buildForm
};
