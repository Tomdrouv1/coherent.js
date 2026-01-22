/**
 * Coherent.js Forms TypeScript Definitions
 * @module @coherent.js/forms
 */

import type { CoherentNode, CoherentElement, StrictCoherentElement } from '@coherent.js/core';

// ============================================================================
// Form Field Types
// ============================================================================

/**
 * Available form field input types
 */
export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'textarea'
  | 'file'
  | 'hidden'
  | 'color'
  | 'range'
  | 'search'
  | 'month'
  | 'week';

/**
 * Option for select and radio fields
 */
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

/**
 * Typed form field definition with generic value type
 * @template T - The type of the field value
 */
export interface FormField<T = unknown> {
  /** Field input type */
  type: FormFieldType;
  /** Field name (used as form data key) */
  name: string;
  /** Human-readable label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether field is readonly */
  readonly?: boolean;
  /** Default/initial value */
  defaultValue?: T;
  /** Current value */
  value?: T;
  /** Options for select/radio fields */
  options?: SelectOption[];
  /** Validation rules */
  validators?: Validator[];
  /** Field-specific validation configuration */
  validation?: FieldValidation<T>;
  /** Additional HTML attributes */
  attributes?: Record<string, unknown>;
  /** Transform function to convert raw input to typed value */
  transform?: (value: unknown) => T;
}

/**
 * Field validation configuration with typed value
 * @template T - The type of the field value
 */
export interface FieldValidation<T = unknown> {
  /** Required validation with optional custom message */
  required?: boolean | string;
  /** Minimum length for string values */
  minLength?: number | { value: number; message: string };
  /** Maximum length for string values */
  maxLength?: number | { value: number; message: string };
  /** Minimum value for number values */
  min?: number | { value: number; message: string };
  /** Maximum value for number values */
  max?: number | { value: number; message: string };
  /** Regular expression pattern validation */
  pattern?: RegExp | { value: RegExp; message: string };
  /** Custom validation function */
  custom?: (value: T, formData: Record<string, unknown>) => boolean | string | Promise<boolean | string>;
  /** Validate on change (real-time) */
  validateOnChange?: boolean;
  /** Validate on blur */
  validateOnBlur?: boolean;
  /** Debounce time in milliseconds for validation */
  debounce?: number;
}

// ============================================================================
// Form Builder Types
// ============================================================================

/**
 * Form configuration options
 */
export interface FormConfig {
  /** Form fields */
  fields?: FormField[];
  /** Form action URL */
  action?: string;
  /** Form submission method */
  method?: 'get' | 'post';
  /** Form CSS class name */
  className?: string;
  /** Submit button text */
  submitText?: string;
  /** Form submit handler */
  onSubmit?: (data: FormData) => void | Promise<void>;
  /** Form encoding type */
  enctype?: 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
  /** Whether to disable browser validation */
  novalidate?: boolean;
  /** Form ID */
  id?: string;
}

/**
 * Typed form builder with generic form data shape
 * @template T - The shape of the form data
 */
export interface FormBuilder<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Add a field to the form
   * @template K - The key in the form data
   */
  addField<K extends keyof T>(name: K, field: Omit<FormField<T[K]>, 'name'>): FormBuilder<T>;

  /**
   * Remove a field from the form
   */
  removeField(name: keyof T): FormBuilder<T>;

  /**
   * Set the form action URL
   */
  setAction(action: string): FormBuilder<T>;

  /**
   * Set the form submission method
   */
  setMethod(method: 'get' | 'post'): FormBuilder<T>;

  /**
   * Set the form submit handler
   */
  onSubmit(handler: (data: T) => void | Promise<void>): FormBuilder<T>;

  /**
   * Build the form as a CoherentNode
   */
  build(): CoherentNode;

  /**
   * Render the form (alias for build)
   */
  render(): CoherentNode;

  /**
   * Validate form data
   */
  validate(data: unknown): { valid: boolean; errors: Record<keyof T, string[]> };

  /**
   * Get current field definitions
   */
  getFields(): FormField[];
}

/**
 * Create a typed form builder
 * @template T - The shape of the form data
 */
export function createFormBuilder<T extends Record<string, unknown> = Record<string, unknown>>(
  config?: FormConfig
): FormBuilder<T>;

/**
 * Build a form from configuration
 */
export function buildForm(config: FormConfig): CoherentNode;

/**
 * Render a single form field
 */
export function renderField<T = unknown>(field: FormField<T>): CoherentNode;

/**
 * Validate a single field value
 * @returns Error message or null if valid
 */
export function validateField<T>(field: FormField<T>, value: unknown): string | null;

// ============================================================================
// Form Builder Class
// ============================================================================

/**
 * Form builder class implementation
 */
export class FormBuilder<T extends Record<string, unknown> = Record<string, unknown>> {
  constructor(config?: FormConfig);
  addField<K extends keyof T>(name: K, field: Omit<FormField<T[K]>, 'name'>): this;
  removeField(name: keyof T): this;
  setAction(action: string): this;
  setMethod(method: 'get' | 'post'): this;
  onSubmit(handler: (data: T) => void | Promise<void>): this;
  build(): CoherentNode;
  render(): CoherentNode;
  validate(data: unknown): { valid: boolean; errors: Record<keyof T, string[]> };
  getFields(): FormField[];
}

// ============================================================================
// Form Hydration Types
// ============================================================================

/**
 * Options for hydrating a form on the client
 */
export interface HydrationOptions {
  /** Enable validation */
  validation?: boolean;
  /** Enable real-time validation as user types */
  realTimeValidation?: boolean;
  /** Form submit handler */
  onSubmit?: (event: Event, data: FormData) => void | Promise<void>;
  /** Validation error handler */
  onValidate?: (errors: ValidationErrors) => void;
  /** Prevent default form submission */
  preventSubmit?: boolean;
}

/**
 * Hydrated form interface for client-side interaction
 */
export interface HydratedForm {
  /** The form DOM element */
  element: HTMLFormElement;
  /** Validate all form fields */
  validate(): ValidationResult;
  /** Reset form to initial values */
  reset(): void;
  /** Get current form data */
  getData(): FormData;
  /** Get form data as object */
  getValues<T = Record<string, unknown>>(): T;
  /** Set form field values */
  setData(data: Record<string, unknown>): void;
  /** Set a single field value */
  setValue(name: string, value: unknown): void;
  /** Destroy hydration and clean up event listeners */
  destroy(): void;
  /** Check if form is valid */
  isValid(): boolean;
  /** Get validation errors */
  getErrors(): ValidationErrors;
}

/**
 * Hydrate a form element for client-side interactivity
 */
export function hydrateForm(
  formElement: HTMLFormElement | string,
  options?: HydrationOptions
): HydratedForm;

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether all fields are valid */
  valid: boolean;
  /** Validation errors by field name */
  errors: ValidationErrors;
}

/**
 * Validation errors mapped by field name
 */
export interface ValidationErrors {
  [fieldName: string]: string[];
}

/**
 * Validator function type
 */
export interface Validator {
  (value: unknown): boolean | string | Promise<boolean | string>;
}

/**
 * Form validator class
 */
export class FormValidator {
  constructor(rules: Record<string, Validator[]>);
  /** Synchronous validation */
  validate(data: Record<string, unknown>): ValidationResult;
  /** Asynchronous validation */
  validateAsync(data: Record<string, unknown>): Promise<ValidationResult>;
  /** Add a validation rule */
  addRule(field: string, validator: Validator): void;
  /** Remove a validation rule */
  removeRule(field: string, validator: Validator): void;
  /** Clear all rules for a field */
  clearRules(field: string): void;
}

/**
 * Create a form validator
 */
export function createValidator(rules: Record<string, Validator[]>): FormValidator;

/**
 * Validate data against rules
 */
export function validate(
  data: Record<string, unknown>,
  rules: Record<string, Validator[]>
): ValidationResult;

// ============================================================================
// Built-in Validators
// ============================================================================

/**
 * Built-in validator functions
 */
export const validators: {
  /** Require a value to be present */
  required(message?: string): Validator;
  /** Validate email format */
  email(message?: string): Validator;
  /** Minimum string length */
  minLength(length: number, message?: string): Validator;
  /** Maximum string length */
  maxLength(length: number, message?: string): Validator;
  /** Minimum numeric value */
  min(value: number, message?: string): Validator;
  /** Maximum numeric value */
  max(value: number, message?: string): Validator;
  /** Pattern matching */
  pattern(regex: RegExp, message?: string): Validator;
  /** Match another field's value */
  matches(field: string, message?: string): Validator;
  /** Validate URL format */
  url(message?: string): Validator;
  /** Validate as number */
  number(message?: string): Validator;
  /** Validate as integer */
  integer(message?: string): Validator;
  /** Validate as positive number */
  positive(message?: string): Validator;
  /** Validate as negative number */
  negative(message?: string): Validator;
  /** Validate date format */
  date(message?: string): Validator;
  /** Custom validation function */
  custom(fn: (value: unknown) => boolean | string, message?: string): Validator;
  /** Async validation function */
  async(fn: (value: unknown) => Promise<boolean | string>): Validator;
};

/** Alias for validators */
export const formValidators: typeof validators;

// ============================================================================
// Advanced Validation
// ============================================================================

/**
 * Validation rule configuration
 */
export interface ValidationRule {
  /** The validator function */
  validator: Validator;
  /** Custom error message */
  message?: string;
  /** Whether this is an async validator */
  async?: boolean;
}

/**
 * Create an async validator
 */
export function createAsyncValidator(
  fn: (value: unknown) => Promise<boolean | string>
): Validator;

/**
 * Combine multiple validators into one
 */
export function combineValidators(...validators: Validator[]): Validator;

/**
 * Create a conditional validator
 */
export function conditionalValidator(
  condition: (data: Record<string, unknown>) => boolean,
  validator: Validator
): Validator;

// ============================================================================
// Form Utilities
// ============================================================================

/**
 * Parse FormData to typed object
 */
export function parseFormData<T extends Record<string, unknown>>(formData: FormData): T;

/**
 * Serialize object to FormData
 */
export function toFormData(data: Record<string, unknown>): FormData;

/**
 * Create a form group (fieldset)
 */
export function createFieldGroup(
  legend: string,
  fields: FormField[]
): CoherentNode;

// ============================================================================
// Deprecated Functions (Backward Compatibility)
// ============================================================================

/** @deprecated Use createFormBuilder() on server + hydrateForm() on client */
export function createForm(config: FormConfig): CoherentNode;

/** @deprecated Use validators with hydrateForm() instead */
export function enhancedForm(
  config: FormConfig & { validation?: Record<string, Validator[]> }
): CoherentNode;
