/**
 * Coherent.js Forms TypeScript Definitions
 * @module @coherent.js/forms
 */

import type { CoherentNode } from '@coherent.js/core';

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
  /** Fields, as an array of `{ name, ...config }` or keyed by field name */
  fields?: FormField[] | Record<string, Omit<FormField, 'name'>>;
  /** Form action URL */
  action?: string;
  /** Form submission method */
  method?: 'get' | 'post' | (string & {});
  /** Form name attribute; defaults to `'form'` */
  name?: string;
  /** Form CSS class name */
  className?: string;
  /** Submit button text */
  submitText?: string;
  /** Form submit handler */
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  /** Form encoding type */
  enctype?: 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
  /** Whether to disable browser validation */
  novalidate?: boolean;
  /** Form ID */
  id?: string;
  /** Validate a field as it changes; defaults to `true` */
  validateOnChange?: boolean;
  /** Validate a field when it loses focus; defaults to `true` */
  validateOnBlur?: boolean;
  [option: string]: unknown;
}

/**
 * Accumulates fields and renders them as a Coherent component.
 *
 * Every mutator is chainable, and `build()`, `render()` and `buildForm()` all
 * return the same node — `toHTML()` is that node rendered to a string.
 *
 * ```ts
 * const form = new FormBuilder({ name: 'signup' })
 *   .field('email', { type: 'email', label: 'Email', required: true })
 *   .setAction('/subscribe')
 *   .setMethod('post')
 *   .build();
 * ```
 *
 * @template T - The shape of the form data
 */
export class FormBuilder<T extends Record<string, unknown> = Record<string, unknown>> {
  constructor(options?: FormConfig);

  options: FormConfig;
  fields: Map<string, FormField>;
  values: Partial<T>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;

  /** Define a field */
  field<K extends keyof T & string>(name: K, config?: Omit<FormField<T[K]>, 'name'>): this;
  /** Alias of {@link FormBuilder.field} */
  addField<K extends keyof T & string>(name: K, config?: Omit<FormField<T[K]>, 'name'>): this;
  removeField(name: keyof T & string): this;
  /** Merge changes into an existing field */
  updateField(name: keyof T & string, config: Partial<FormField>): this;

  /** Every field definition, in insertion order */
  getFields(): FormField[];
  getField(name: keyof T & string): FormField | undefined;

  /** Group fields for layout */
  addGroup(name: string, config?: Record<string, unknown>): this;
  getGroup(name: string): Record<string, unknown> | undefined;

  setValue<K extends keyof T & string>(name: K, value: T[K]): this;
  setValues(values: Partial<T>): this;
  getValue<K extends keyof T & string>(name: K): T[K] | undefined;
  getValues(): Partial<T>;

  /** Run one field's validators; returns the error or `null` */
  validateField(name: keyof T & string): string | null;

  /**
   * Validate every visible field and store the result. Returns the errors
   * keyed by field name — empty when the form is valid.
   */
  validate(): Record<string, string>;

  getFieldError(name: keyof T & string): string | null;
  hasErrors(): boolean;
  clearErrors(): this;
  isValid(): boolean;
  /** Mark a field as touched */
  touch(name: keyof T & string): void;
  /** Whether any value differs from its initial value */
  isDirty(): boolean;

  onSubmit(handler: (data: Partial<T>) => void | Promise<void>): this;
  onError(handler: (error: unknown) => void): this;
  isSubmitting(): boolean;

  setAction(action: string): this;
  setMethod(method: 'get' | 'post' | (string & {})): this;

  /** Build the form component */
  buildForm(options?: FormConfig): CoherentNode;
  /** Alias of {@link FormBuilder.buildForm} */
  build(options?: FormConfig): CoherentNode;
  /** Alias of {@link FormBuilder.buildForm} */
  render(options?: FormConfig): CoherentNode;
  /** The built form, rendered to an HTML string */
  toHTML(options?: FormConfig): string;

  /** Build the node for one field, including its label and error */
  buildField(name: keyof T & string): CoherentNode;

  /** Copy of the current values */
  serialize(): Partial<T>;
  /** Whether a field's `showWhen`/`showIf` condition currently holds */
  isFieldVisible(name: keyof T & string): boolean;
  /** Restore default values and clear errors and touched state */
  reset(): this;
}

/**
 * Create a form builder, optionally seeding it from `config.fields`.
 * @template T - The shape of the form data
 */
export function createFormBuilder<T extends Record<string, unknown> = Record<string, unknown>>(
  config?: FormConfig
): FormBuilder<T>;

/**
 * Build a form component from configuration, in one call.
 *
 * `fields` may be an array of `{ name, ...config }` objects or an object
 * keyed by field name; passing a bare array is shorthand for `{ fields }`.
 */
export function buildForm(config?: FormConfig | FormField[]): CoherentNode;

// ============================================================================
// Form Hydration Types
// ============================================================================

/**
 * Options for hydrating a form on the client
 */
export interface HydrationOptions {
  /** Validate a field when it loses focus; defaults to `true` */
  validateOnBlur?: boolean;
  /** Validate a field as it changes; defaults to `false` */
  validateOnChange?: boolean;
  /** Validate everything on submit; defaults to `true` */
  validateOnSubmit?: boolean;
  /** Only show a field's error once it has been touched; defaults to `true` */
  showErrorsOnTouch?: boolean;
  /** Debounce window for change validation, in ms; defaults to `300` */
  debounce?: number;
  /**
   * Called instead of the browser's native submit. Return `false` to cancel,
   * or a promise to defer completion.
   */
  onSubmit?: (data: Record<string, unknown>, event: Event) => unknown;
  /** Called with the field errors on a failed submit, or a rejected `onSubmit` */
  onError?: (errors: ValidationErrors | unknown) => void;
  /** Called after a promise returned by `onSubmit` resolves */
  onSuccess?: (data: Record<string, unknown>) => void;
  [option: string]: unknown;
}

/**
 * Controller returned by {@link hydrateForm}.
 */
export interface HydratedForm {
  /** Validate one field and record the result */
  validateField(name: string): string | null;
  /** Validate every field; `true` when all pass */
  validateForm(): boolean;

  setFieldValue(name: string, value: unknown): void;
  getFieldValue(name: string): unknown;

  /** Error currently shown for a field, or `undefined` */
  getError(name: string): string | undefined;
  /** Copy of the current errors */
  getErrors(): ValidationErrors;
  /** Copy of the current values */
  getValues(): Record<string, unknown>;

  setTouched(name: string, touched?: boolean): void;

  /** Restore initial values and clear errors */
  reset(): void;
  /** Detach every listener and cancel pending debounces */
  destroy(): void;

  isValid(): boolean;
  isSubmitting(): boolean;

  /** Snapshot of values, errors, touched flags and submit state */
  getState(): {
    values: Record<string, unknown>;
    errors: ValidationErrors;
    touched: Record<string, boolean>;
    isSubmitting: boolean;
  };
}

/**
 * Attach client-side behavior to a server-rendered form.
 *
 * Returns `null` outside a browser, or when the selector matches nothing.
 */
export function hydrateForm(
  formSelector: HTMLFormElement | string,
  options?: HydrationOptions
): HydratedForm | null;

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether every field passed */
  isValid: boolean;
  /** The first error per failing field; passing fields are absent */
  errors: ValidationErrors;
}

/**
 * Validation errors mapped by field name
 */
export interface ValidationErrors {
  [fieldName: string]: string;
}

/**
 * A field check: returns an error message, or `null` when the value passes.
 *
 * The second argument is the whole form, so validators like
 * `validators.matches` can compare fields.
 */
export interface Validator {
  (value: unknown, formData?: Record<string, unknown>): string | null;
}

/**
 * Per-field validators. A field maps to one validator or a list run in order,
 * stopping at the first error.
 */
export type ValidationSchema = Record<string, Validator | Validator[]>;

/**
 * Runs a {@link ValidationSchema} and tracks errors and touched fields.
 *
 * ```ts
 * const validator = new FormValidator({
 *   email: [validators.required(), validators.email()]
 * });
 * const { isValid, errors } = validator.validate({ email: '' });
 * ```
 */
export class FormValidator {
  constructor(schema?: ValidationSchema);

  schema: ValidationSchema;
  /** Errors from the last `validate()` call */
  errors: ValidationErrors;
  touched: Record<string, boolean>;

  /**
   * Check one field. Returns the first error, or `null` when it passes or has
   * no validators.
   */
  validateField(
    name: string,
    value: unknown,
    formData?: Record<string, unknown>
  ): string | null;

  /**
   * Check every field in `formData` plus any schema field it omits, and store
   * the result in `errors`.
   */
  validate(formData: Record<string, unknown>): ValidationResult;

  /** Mark a field as touched */
  touch(name: string): void;
  isTouched(name: string): boolean;

  /** Error recorded for a field by the last `validate()`, or `null` */
  getError(name: string): string | null;
  hasError(name: string): boolean;

  clearErrors(): void;
  clearTouched(): void;
  /** Clear both errors and touched state */
  reset(): void;
}

/**
 * Create a form validator
 */
export function createValidator(schema?: ValidationSchema): FormValidator;

/**
 * Validate data against a schema with a throwaway validator
 */
export function validate(
  formData: Record<string, unknown>,
  schema?: ValidationSchema
): ValidationResult;

/**
 * Run a list of validators against one value, returning the first error or
 * `null`.
 */
export function validateField(
  value: unknown,
  validatorList: Validator[],
  formData?: Record<string, unknown>
): string | null;

/**
 * Run per-field validator lists over a whole form. Returns `null` when
 * everything passes, rather than an empty object.
 */
export function validateForm(
  formData: Record<string, unknown>,
  fieldValidators: Record<string, Validator[]>
): ValidationErrors | null;

/**
 * Add a validator to {@link validators} under `name`.
 */
export function registerValidator(name: string, validatorFn: Validator): void;

/**
 * Combine validators into one that returns the first error, or `null`.
 */
export function composeValidators(...validatorFns: Validator[]): Validator;

// ============================================================================
// Built-in Validators
// ============================================================================

/**
 * Built-in validator factories. Each returns a {@link Validator}, so call it
 * before putting it in a schema: `validators.required()`, not
 * `validators.required`.
 *
 * Custom validators added with {@link registerValidator} also appear here.
 */
export const validators: {
  /** Reject `null`, `undefined` and the empty string */
  required(message?: string): Validator;
  /** Validate email format; empty values pass */
  email(message?: string): Validator;
  /** Minimum length; empty values pass */
  minLength(min: number, message?: string): Validator;
  /** Maximum length; empty values pass */
  maxLength(max: number, message?: string): Validator;
  /** Minimum numeric value */
  min(min: number, message?: string): Validator;
  /** Maximum numeric value */
  max(max: number, message?: string): Validator;
  /** Parseable as a URL; empty values pass */
  url(message?: string): Validator;
  /** Match a regular expression; empty values pass */
  pattern(regex: RegExp, message?: string): Validator;
  /** Equal another field's value */
  matches(fieldName: string, message?: string): Validator;
  /** One of a fixed set; empty values pass */
  oneOf(options: unknown[], message?: string): Validator;
  /** Fail when `fn` returns falsy */
  custom(
    fn: (value: unknown, formData?: Record<string, unknown>) => boolean,
    message?: string
  ): Validator;
  [name: string]: Validator | ((...args: never[]) => Validator);
};

// ============================================================================
// Form Utilities
// ============================================================================

// 1.0: removed deprecated SPA APIs — createForm, formValidators, enhancedForm,
// createAsyncValidator, combineValidators, conditionalValidator.
// See docs/migration/1.0#removed-forms-spa-apis.
