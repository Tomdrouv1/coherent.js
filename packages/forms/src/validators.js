/**
 * Coherent.js Forms - Validators
 *
 * Form validation utilities. `validators` and `createValidator` here are the
 * same as the ones `@coherent.js/forms` exports, with one calling convention:
 * a validator is `(value, formData) => error | null`, and each built-in is a
 * factory returning one (`validators.minLength(8)`). A built-in may be listed
 * uncalled (`[validators.required]`) and still accepts the older direct form
 * `validators.minLength(value, { min: 8 })`. See rules.js for details.
 *
 * @module forms/validators
 */

import {
  validators,
  validateField,
  validateForm,
  registerValidator,
  composeValidators
} from './rules.js';
import { createValidator } from './validation.js';

export {
  validators,
  validateField,
  validateForm,
  createValidator,
  registerValidator,
  composeValidators
};

export default {
  validators,
  validateField,
  validateForm,
  createValidator,
  registerValidator,
  composeValidators
};
