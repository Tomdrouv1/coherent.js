/**
 * One validator calling convention across every entry point.
 *
 * `@coherent.js/forms` exported validation.js's factory-style `validators`
 * (`validators.email(msg)(value)`) and `createValidator(schema)`, while
 * `@coherent.js/forms/validators` exported validators.js's direct-style
 * `validators` (`validators.email(value, opts)`) and `createValidator(fn)` —
 * the root's explicit export silently shadowed the star export. validateForm
 * called validators as `(value, formData)`, so the root's own factories used
 * uncalled came back as the error: `{ name: [Function] }`.
 */

import { describe, it, expect } from 'vitest';
import * as root from '../src/index.js';
import * as validatorsEntry from '../src/validators.js';
import * as validationEntry from '../src/validation.js';

const { validators, validateForm, validateField, createValidator, FormValidator, createFormBuilder } = root;

describe('one validators registry', () => {
  it('is the same object from the root, /validators and /validation', () => {
    expect(validatorsEntry.validators).toBe(root.validators);
    expect(validationEntry.validators).toBe(root.validators);
    expect(validatorsEntry.createValidator).toBe(root.createValidator);
    expect(validationEntry.createValidator).toBe(root.createValidator);
    expect(validatorsEntry.default.validators).toBe(root.validators);
  });
});

describe('validateForm and validateField', () => {
  it('accept a built-in listed without calling it', () => {
    expect(validateForm({ name: 'Ada' }, { name: [validators.required] })).toBeNull();
    expect(validateForm({ name: '' }, { name: [validators.required] }))
      .toEqual({ name: 'This field is required' });
  });

  it('accept factory-built validators', () => {
    expect(validateForm(
      { name: '', email: 'nope', password: 'short' },
      {
        name: [validators.required('Name please')],
        email: [validators.email()],
        password: [validators.minLength(8)]
      }
    )).toEqual({
      name: 'Name please',
      email: 'Invalid email address',
      password: 'Minimum length is 8'
    });
  });

  it('do not read a form field called `message` as the error text', () => {
    expect(validateForm({ name: '', message: 'hello' }, { name: [validators.required] }))
      .toEqual({ name: 'This field is required' });
  });

  it('accept a single validator instead of a list', () => {
    expect(validateField('', validators.required)).toBe('This field is required');
  });
});

describe('built-ins', () => {
  it('min(5) rejects a non-numeric value and passes an empty one', () => {
    expect(validators.min(5)('abc')).toBe('Minimum value is 5');
    expect(validators.min(5)('3')).toBe('Minimum value is 5');
    expect(validators.min(5)(7)).toBeNull();
    expect(validators.min(5)('')).toBeNull();
    expect(validatorsEntry.validators.min(5)('abc')).toBe('Minimum value is 5');
  });

  it('give the same answer called as a factory or directly', () => {
    expect(validators.minLength(8)('short')).toBe('Minimum length is 8');
    expect(validators.minLength('short', { min: 8 })).toBe('Minimum length is 8');
    expect(validators.max(10, 'Too many')(11)).toBe('Too many');
    expect(validators.max(11, { max: 10, message: 'Too many' })).toBe('Too many');
    expect(validators.pattern(/^\d+$/)('12a')).toBe('Invalid format');
    expect(validators.pattern('12a', { pattern: /^\d+$/ })).toBe('Invalid format');
  });

  it('treat a missing factory message as the default, not as a value', () => {
    const maybeMessage = undefined;
    const rule = validators.required(maybeMessage);
    expect(typeof rule).toBe('function');
    expect(rule('')).toBe('This field is required');
  });

  it('compare fields through formData', () => {
    const rule = validators.matches('password', 'Passwords differ');
    expect(rule('a', { password: 'b' })).toBe('Passwords differ');
    expect(rule('a', { password: 'a' })).toBeNull();
  });

  it('are usable in compose() uncalled', () => {
    const composed = validators.compose([validators.required, validators.email]);
    expect(composed('')).toBe('This field is required');
    expect(composed('nope')).toBe('Invalid email address');
    expect(composed('a@b.co')).toBeNull();
  });
});

describe('createValidator', () => {
  it('returns a FormValidator for a schema', () => {
    const validator = createValidator({ email: [validators.required, validators.email()] });
    expect(validator).toBeInstanceOf(FormValidator);
    expect(validator.validate({ email: 'x' })).toEqual({
      isValid: false,
      errors: { email: 'Invalid email address' }
    });
  });

  it('wraps a check function', () => {
    const noSpaces = createValidator(value => /\s/.test(value), 'No spaces');
    expect(noSpaces('a b')).toBe('No spaces');
    expect(noSpaces('ab')).toBeNull();
    expect(validateForm({ user: 'a b' }, { user: [noSpaces] })).toEqual({ user: 'No spaces' });
  });
});

describe('FormBuilder field validators', () => {
  it('accept a built-in listed without calling it', () => {
    const form = createFormBuilder({
      fields: [{ name: 'code', validators: [validators.alphanumeric, validators.maxLength(4)] }]
    });

    form.setValues({ code: 'ab-1' });
    expect(form.validate()).toEqual({ code: 'Must contain only letters and numbers' });

    form.setValues({ code: 'abc12' });
    expect(form.validate()).toEqual({ code: 'Maximum length is 4' });

    form.setValues({ code: 'ab12' });
    expect(form.validate()).toEqual({});
  });
});
