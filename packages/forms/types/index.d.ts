/**
 * Coherent.js Forms TypeScript Definitions
 * @module @coherent.js/forms
 */

// ===== Form Builder Types =====

export interface FormField {
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local' | 'checkbox' | 'radio' | 'select' | 'textarea';
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  value?: any;
  options?: Array<{ value: string; label: string }>;
  validators?: Validator[];
  attributes?: Record<string, any>;
}

export interface FormConfig {
  fields: FormField[];
  action?: string;
  method?: 'get' | 'post';
  className?: string;
  submitText?: string;
  onSubmit?: (data: FormData) => void | Promise<void>;
}

export class FormBuilder {
  constructor(config: FormConfig);
  addField(field: FormField): this;
  removeField(name: string): this;
  build(): object;
  render(): object;
}

export function createFormBuilder(config: FormConfig): FormBuilder;
export function buildForm(config: FormConfig): object;

// ===== Form Hydration Types =====

export interface HydrationOptions {
  validation?: boolean;
  realTimeValidation?: boolean;
  onSubmit?: (event: Event, data: FormData) => void | Promise<void>;
  onValidate?: (errors: ValidationErrors) => void;
}

export interface HydratedForm {
  element: HTMLFormElement;
  validate(): ValidationResult;
  reset(): void;
  getData(): FormData;
  setData(data: Record<string, any>): void;
  destroy(): void;
}

export function hydrateForm(formElement: HTMLFormElement | string, options?: HydrationOptions): HydratedForm;

// ===== Validation Types =====

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
}

export interface ValidationErrors {
  [fieldName: string]: string[];
}

export interface Validator {
  (value: any): boolean | string | Promise<boolean | string>;
}

export class FormValidator {
  constructor(rules: Record<string, Validator[]>);
  validate(data: Record<string, any>): ValidationResult;
  validateAsync(data: Record<string, any>): Promise<ValidationResult>;
  addRule(field: string, validator: Validator): void;
  removeRule(field: string, validator: Validator): void;
}

export function createValidator(rules: Record<string, Validator[]>): FormValidator;
export function validate(data: Record<string, any>, rules: Record<string, Validator[]>): ValidationResult;

// ===== Built-in Validators =====

export const validators: {
  required(message?: string): Validator;
  email(message?: string): Validator;
  minLength(length: number, message?: string): Validator;
  maxLength(length: number, message?: string): Validator;
  min(value: number, message?: string): Validator;
  max(value: number, message?: string): Validator;
  pattern(regex: RegExp, message?: string): Validator;
  matches(field: string, message?: string): Validator;
  url(message?: string): Validator;
  number(message?: string): Validator;
  integer(message?: string): Validator;
  positive(message?: string): Validator;
  negative(message?: string): Validator;
  date(message?: string): Validator;
  custom(fn: (value: any) => boolean | string, message?: string): Validator;
  async(fn: (value: any) => Promise<boolean | string>): Validator;
};

export const formValidators: typeof validators;

// ===== Advanced Validation =====

export interface ValidationRule {
  validator: Validator;
  message?: string;
  async?: boolean;
}

export interface FieldValidation {
  rules: ValidationRule[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounce?: number;
}

export function createAsyncValidator(fn: (value: any) => Promise<boolean | string>): Validator;
export function combineValidators(...validators: Validator[]): Validator;
export function conditionalValidator(condition: (data: Record<string, any>) => boolean, validator: Validator): Validator;

// ===== Deprecated SPA-only Functions (for backward compatibility) =====

/** @deprecated Use createFormBuilder() on server + hydrateForm() on client */
export function createForm(config: FormConfig): object;

/** @deprecated Use validators with hydrateForm() instead */
export function enhancedForm(config: FormConfig & { validation?: Record<string, Validator[]> }): object;
