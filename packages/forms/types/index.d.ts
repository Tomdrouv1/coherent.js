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
  /** Render the field; `false` omits it from the built form */
  visible?: boolean;
  /** Render the field only when this returns true for the current values */
  showWhen?: (values: Record<string, unknown>) => boolean;
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
  /** Validation rules, run in order on the server and described to `hydrateForm` */
  validators?: ValidatorEntry[];
  /** Field-specific validation configuration */
  validation?: FieldValidation<T>;
  /**
   * Extra attributes on the control, for things the field config has no
   * dedicated option for — `autocomplete`, `maxlength`, `tabindex`, `data-*`.
   *
   * Applied before the builder's own attributes, so `name`, `id`, `type` and
   * the `aria-*` pair cannot be overridden. Names that are not valid HTML
   * attribute names are dropped with a warning.
   */
  attributes?: Record<string, unknown>;
  /** Class on the control, appended to `classNames.control` */
  className?: string;
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
 * Class applied to each structural slot of a built form.
 *
 * The wrapper is found by hydration through its `data-field` attribute, not
 * its class, so every one of these is free for the consumer to choose.
 */
export interface FormClassNames {
  /** Wrapper around label, control and error */
  field: string;
  label: string;
  /** Base class on the control, before any per-field `className` */
  control: string;
  /** Added to the control while it has a visible error */
  invalid: string;
  /** The error message element */
  error: string;
  submit: string;
}

/** The class names a form uses when `classNames` does not override them. */
export const DEFAULT_CLASS_NAMES: FormClassNames;

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
  /**
   * Emit `novalidate`, turning off the browser's own validation. Defaults to
   * `false` — leaving native validation working with JavaScript disabled.
   */
  novalidate?: boolean;
  /**
   * Emit an inline `onsubmit` handler. `true` uses `handleSubmit(event)`; a
   * string is used verbatim. Off by default, so the form submits natively —
   * {@link hydrateForm} binds its own listener and needs nothing inline, and
   * an inline handler is blocked by a strict CSP.
   */
  enhance?: boolean | string;
  /** Class names for each structural slot; see {@link DEFAULT_CLASS_NAMES} */
  classNames?: Partial<FormClassNames>;
  /** Form ID */
  id?: string;
  /** Validate a field as it changes; defaults to `true` */
  validateOnChange?: boolean;
  /** Validate a field when it loses focus; defaults to `true` */
  validateOnBlur?: boolean;
  [option: string]: unknown;
}

/**
 * Per-render state for `buildForm()`. Passing any of these renders from them
 * alone: the builder's own values, errors and touched state are neither read
 * nor changed, so one shared builder can render every request's state.
 */
export interface FormRenderState {
  /** Values to render, merged over the fields' default values */
  values?: Record<string, unknown>;
  /** Errors to render, keyed by field name */
  errors?: Record<string, string>;
  /** Fields whose error is shown; defaults to every field in `errors` */
  touched?: Record<string, boolean>;
}

/** Options for `buildForm()`: form configuration plus per-render state. */
export type BuildFormOptions = FormConfig & FormRenderState;

/**
 * Accumulates fields and renders them as a Coherent component.
 *
 * Every mutator is chainable, and `build()`, `render()` and `buildForm()` all
 * return the same node — `toHTML()` is that node rendered to a string.
 *
 * A builder holds the values, errors and touched state of one submission. On
 * a server, keep the definition at module scope and call `fork()` per request
 * (or render with `buildForm({ values, errors })`), so one user's submission
 * never renders into another user's page.
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

  /**
   * A copy of the definition (fields, groups, options, handlers) with fresh
   * values, errors and touched state — one per request on a server.
   */
  fork(): FormBuilder<T>;

  /** Build the form component; see {@link FormRenderState} for per-render state */
  buildForm(options?: BuildFormOptions): CoherentNode;
  /** Alias of {@link FormBuilder.buildForm} */
  build(options?: BuildFormOptions): CoherentNode;
  /** Alias of {@link FormBuilder.buildForm} */
  render(options?: BuildFormOptions): CoherentNode;
  /** The built form, rendered to an HTML string */
  toHTML(options?: BuildFormOptions): string;

  /** Merge configured class names over {@link DEFAULT_CLASS_NAMES} */
  resolveClassNames(overrides?: Partial<FormClassNames>): FormClassNames;

  /** The state a render uses: the per-render state given, else the builder's own */
  resolveRenderState(options?: FormRenderState): Required<FormRenderState>;

  /** Build the node for one field, including its label and error */
  buildField(name: keyof T & string, classNames?: FormClassNames, state?: Required<FormRenderState>): CoherentNode;
  /** Build one field's control */
  buildInput(name: keyof T & string, classNames?: FormClassNames, state?: Required<FormRenderState>): CoherentNode | null;
  /** Build one field's label */
  buildLabel(name: keyof T & string, classNames?: FormClassNames): CoherentNode | null;
  /** Build one field's error message, or `null` when it has none to show */
  buildError(name: keyof T & string, classNames?: FormClassNames, state?: Required<FormRenderState>): CoherentNode | null;

  /** Copy of the current values */
  serialize(): Partial<T>;
  /** Whether a field's `showWhen`/`showIf` condition holds for `values` (default: the current values) */
  isFieldVisible(name: keyof T & string, values?: Record<string, unknown>): boolean;
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
   * Class names the client writes. Pass the same `invalid` and `error` given
   * to {@link buildForm}, or the classes added on failure will not match what
   * the server rendered.
   */
  classNames?: Partial<Pick<FormClassNames, 'invalid' | 'error'>>;
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
 *
 * This is the one calling convention every runner uses: schemas,
 * `validateField`, `validateForm`, `FormBuilder` fields and `hydrateForm`.
 */
export interface Validator {
  (value: unknown, formData?: Record<string, unknown>): string | null;
}

/**
 * What a validator list accepts: a {@link Validator}, a built-in listed
 * without calling it (`validators.required`, run with its defaults), or the
 * name of a built-in or registered validator.
 */
export type ValidatorEntry = Validator | BuiltinValidator | string;

/**
 * Per-field validators. A field maps to one validator or a list run in order,
 * stopping at the first error.
 */
export type ValidationSchema = Record<string, ValidatorEntry | ValidatorEntry[]>;

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
 * Create a {@link FormValidator} for a schema.
 */
export function createValidator(schema?: ValidationSchema): FormValidator;
/**
 * Wrap a check function as a {@link Validator}: a string result is the error,
 * another truthy result becomes `message`, a falsy one passes.
 */
export function createValidator(
  validatorFn: (
    value: unknown,
    options?: unknown,
    translator?: unknown,
    allValues?: Record<string, unknown>
  ) => unknown,
  message?: string
): Validator;

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
  validatorList: ValidatorEntry | ValidatorEntry[],
  formData?: Record<string, unknown>
): string | null;

/**
 * Run per-field validator lists over a whole form. Returns `null` when
 * everything passes, rather than an empty object.
 */
export function validateForm(
  formData: Record<string, unknown>,
  fieldValidators: Record<string, ValidatorEntry | ValidatorEntry[]>
): ValidationErrors | null;

/**
 * Add a validator to {@link validators} under `name`.
 *
 * Unlike the built-ins, which are factories, this stores `validatorFn`
 * directly — so use it as `validators[name]`, not `validators[name]()`.
 * Registering over a built-in therefore changes that name's calling
 * convention. The form builder describes registered validators to the client
 * by name, so `hydrateForm` enforces them when the browser registers the same
 * name.
 */
export function registerValidator(name: string, validatorFn: Validator): void;

/**
 * Combine validators into one that returns the first error, or `null`.
 */
export function composeValidators(...validatorFns: ValidatorEntry[]): Validator;

// ============================================================================
// Built-in Validators
// ============================================================================

/** Options for the direct form of a built-in: `validators.minLength(value, { min: 8 })`. */
export interface BuiltinOptions {
  message?: string;
  [option: string]: unknown;
}

/**
 * A built-in validator. Call it as a factory to get a {@link Validator}
 * (`validators.required()`, `validators.required('Name please')`), list it
 * uncalled to use its defaults, or call it directly with a value and an
 * options object (`validators.required(value, {})`) to get the error.
 *
 * A lone string argument is always a factory message.
 */
export interface BuiltinValidator<Args extends unknown[] = []> {
  (...args: [...Args, message?: string]): Validator;
  (value: unknown, options: BuiltinOptions, translator?: unknown, allValues?: Record<string, unknown>): string | null;
  /** Overrides the default message of this built-in */
  message?: string;
}

/** A chain built with `validators.chain()`. */
export interface ValidatorChain {
  required(options?: BuiltinOptions): ValidatorChain;
  email(options?: BuiltinOptions): ValidatorChain;
  minLength(options?: BuiltinOptions & { min?: number }): ValidatorChain;
  maxLength(options?: BuiltinOptions & { max?: number }): ValidatorChain;
  custom(fn: (value: unknown, allValues?: Record<string, unknown>) => unknown, message?: string): ValidatorChain;
  /** First error (or every error with `stopOnFirstError: false`), or `null` */
  validate(
    value: unknown,
    options?: unknown,
    translator?: unknown,
    allValues?: Record<string, unknown>
  ): string | string[] | null;
}

/**
 * The validator registry, shared by `@coherent.js/forms`,
 * `@coherent.js/forms/validation` and `@coherent.js/forms/validators`.
 *
 * Each built-in is a factory returning a {@link Validator}:
 * `validators.minLength(8)`, `validators.email('Bad email')`. Validators added
 * with {@link registerValidator} are stored as bare validators.
 */
export const validators: {
  /** Reject `null`, `undefined` and the empty string */
  required: BuiltinValidator;
  /** Validate email format; empty values pass */
  email: BuiltinValidator;
  /** Parseable as a URL; empty values pass */
  url: BuiltinValidator;
  /** Minimum length; empty values pass */
  minLength: BuiltinValidator<[min: number]>;
  /** Maximum length; empty values pass */
  maxLength: BuiltinValidator<[max: number]>;
  /** Minimum numeric value; empty values pass, non-numeric values fail */
  min: BuiltinValidator<[min: number]>;
  /** Maximum numeric value; empty values pass, non-numeric values fail */
  max: BuiltinValidator<[max: number]>;
  /** Match a regular expression; empty values pass */
  pattern: BuiltinValidator<[regex: RegExp]>;
  /** Equal another field's value (even when empty) */
  matches: BuiltinValidator<[fieldName: string]>;
  /** Equal another field's value; empty values pass */
  match: BuiltinValidator<[fieldName: string]>;
  /** One of a fixed set; empty values pass */
  oneOf: BuiltinValidator<[options: unknown[]]>;
  /** Fail when `fn` returns falsy */
  custom: BuiltinValidator<[fn: (value: unknown, formData?: Record<string, unknown>) => unknown]>;
  /** A number; empty values pass */
  number: BuiltinValidator;
  /** A whole number; empty values pass */
  integer: BuiltinValidator;
  /** Digits, spaces and `-+()`, with at least 10 digits; empty values pass */
  phone: BuiltinValidator;
  /** Parseable as a date; empty values pass */
  date: BuiltinValidator;
  /** Letters only; empty values pass */
  alpha: BuiltinValidator;
  /** Letters and digits only; empty values pass */
  alphanumeric: BuiltinValidator;
  /** All uppercase; empty values pass */
  uppercase: BuiltinValidator;
  /** File MIME type or extension (`'image/*'`, `'.pdf'`) */
  fileType: BuiltinValidator<[accept: string[]]>;
  /** File size in bytes */
  fileSize: BuiltinValidator<[maxSize: number]>;
  /** File extension (`'.pdf'`) */
  fileExtension: BuiltinValidator<[extensions: string[]]>;

  /** A registered validator or built-in by name */
  get(name: string): Validator | BuiltinValidator<unknown[]> | undefined;
  /** Combine validators into one returning the first error */
  compose(validatorList: ValidatorEntry[]): Validator;
  /** Debounce an async validator */
  debounce<V>(validator: (value: V) => unknown, delay?: number): (value: V) => Promise<unknown>;
  /** Wrap an async validator so each call aborts the previous one */
  cancellable<V>(
    validator: (value: V, signal: AbortSignal | null) => Promise<string | null>
  ): ((value: V) => Promise<string | null>) & { cancel(): void };
  /** Run `validator` only when `condition` holds */
  when(
    condition: boolean | ((value: unknown, context: Record<string, unknown>) => unknown),
    validator: ValidatorEntry
  ): Validator;
  /** Build a validator chain */
  chain(options?: { stopOnFirstError?: boolean }): ValidatorChain;

  /** Validators added with {@link registerValidator} */
  [name: string]: (...args: any[]) => any;
};

// ============================================================================
// Form Utilities
// ============================================================================

// 1.0: removed deprecated SPA APIs — createForm, formValidators, enhancedForm,
// createAsyncValidator, combineValidators, conditionalValidator.
// See docs/migration/1.0#removed-forms-spa-apis.
