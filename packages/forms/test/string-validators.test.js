/**
 * String validator entries with arguments: `'minLength:8'`.
 *
 * A string entry was looked up in the registry as a whole name, so
 * `validators: ['required', 'minLength:8']` silently dropped `'minLength:8'`:
 * the server accepted a 3-character password and `data-validators` never
 * mentioned the rule, so `hydrateForm` did not enforce it either.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@coherent.js/core';
import {
  createFormBuilder,
  hydrateForm,
  validateForm,
  FormValidator,
  registerValidator,
  validators
} from '../src/index.js';

/** The `data-validators` attribute of `name` as a browser would read it. */
function renderedAttribute(builder, name) {
  const html = render(builder.buildForm());
  const input = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))[0];
  const attribute = input.match(/data-validators="([^"]*)"/);
  return attribute ? attribute[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : null;
}

/** hydrateForm over a minimal DOM double holding one input. */
function hydrateInput(name, validatorsAttribute) {
  const input = {
    name,
    type: 'text',
    value: '',
    dataset: validatorsAttribute === null ? {} : { validators: validatorsAttribute },
    attributes: { name },
    style: {},
    classList: { add() {}, remove() {} },
    getAttribute: attr => input.attributes[attr] ?? null,
    setAttribute: (attr, value) => { input.attributes[attr] = String(value); },
    hasAttribute: attr => attr in input.attributes,
    addEventListener() {},
    removeEventListener() {},
    closest: () => null,
    parentElement: { appendChild: child => child }
  };
  return hydrateForm({
    querySelectorAll: selector => (selector === '[name]' ? [input] : []),
    querySelector: () => null,
    addEventListener() {},
    removeEventListener() {}
  });
}

beforeEach(() => {
  global.document = {
    createElement: () => ({ style: {}, setAttribute() {} }),
    getElementById: () => null,
    querySelector: () => null
  };
});

afterEach(() => {
  delete global.document;
});

describe("FormBuilder with ['required', 'minLength:8']", () => {
  const signup = () => createFormBuilder({
    fields: [{ name: 'password', type: 'password', validators: ['required', 'minLength:8'] }]
  });

  it('enforces minLength on the server', () => {
    const form = signup().fork().setValues({ password: 'abc' });
    expect(form.validate()).toEqual({ password: 'Minimum length is 8' });

    form.setValues({ password: 'long enough' });
    expect(form.validate()).toEqual({});
  });

  it('serializes it into data-validators like validators.minLength(8)', () => {
    expect(renderedAttribute(signup(), 'password')).toBe(
      '[{"name":"required","args":[]},{"name":"minLength","args":[8]}]'
    );
  });

  it('is enforced by hydrateForm', () => {
    const controller = hydrateInput('password', renderedAttribute(signup(), 'password'));

    controller.setFieldValue('password', 'abc');
    expect(controller.validateField('password')).toBe(false);
    expect(controller.getError('password')).toBe('Minimum length is 8');

    controller.setFieldValue('password', 'long enough');
    expect(controller.validateField('password')).toBe(true);
  });
});

describe("'name:arg1,arg2' entries", () => {
  it('map onto the built-in factories', () => {
    const errors = validateForm(
      { age: '15', size: 'xl', code: 'ab1', name: 'Al', bio: 'x'.repeat(11), confirm: 'b', password: 'a' },
      {
        age: ['min:18'],
        size: ['oneOf:s, m, l'],
        code: ['pattern:^[a-z]{2,3}$'],
        name: ['minLength:3,Use at least 3 letters, please'],
        bio: ['maxLength:10'],
        confirm: ['matches:password'],
        password: ['required:Password please']
      }
    );

    expect(errors).toEqual({
      age: 'Minimum value is 18',
      size: 'Invalid option',
      code: 'Invalid format',
      name: 'Use at least 3 letters, please',
      bio: 'Maximum length is 10',
      confirm: 'Fields do not match'
    });

    expect(validateForm({ age: '18', size: 'm', code: 'abc' }, {
      age: ['min:18', 'max:120'],
      size: ['oneOf:s,m,l'],
      code: ['pattern:^[a-z]{2,3}$']
    })).toBeNull();

    expect(validateForm({ password: '' }, { password: ['required:Password please'] }))
      .toEqual({ password: 'Password please' });
  });

  it('give the client the same rules and messages as the server', () => {
    const fieldValidators = ['pattern:^[a-z]{2,3}$', 'minLength:3,Too short, sorry'];
    const builder = createFormBuilder({ fields: [{ name: 'code', validators: fieldValidators }] });
    const attribute = renderedAttribute(builder, 'code');
    expect(JSON.parse(attribute)).toEqual([
      { name: 'pattern', args: [{ $regexp: ['^[a-z]{2,3}$', ''] }] },
      { name: 'minLength', args: [3, 'Too short, sorry'] }
    ]);

    const controller = hydrateInput('code', attribute);
    for (const value of ['ab1', 'ab', 'abc']) {
      builder.setValues({ code: value });
      controller.setFieldValue('code', value);
      controller.validateField('code');
      expect(controller.getError('code') ?? null, value).toBe(builder.validateField('code'));
    }
  });

  it('work in FormValidator schemas', () => {
    const schema = new FormValidator({ password: ['required', 'minLength:8'] });
    expect(schema.validate({ password: 'abc' })).toEqual({
      isValid: false,
      errors: { password: 'Minimum length is 8' }
    });
  });

  it('are skipped when the arguments do not fit the rule, like unknown names', () => {
    expect(validateForm({ a: 'x' }, { a: ['minLength:abc', 'pattern:(', 'nope:1'] })).toBeNull();
  });

  it('pass no arguments to registered validators, and still resolve exact names', () => {
    const noShouting = value => (value && value === value.toUpperCase() ? 'Please stop shouting' : null);
    registerValidator('noShoutingString', noShouting);
    registerValidator('legacy:name', noShouting);
    try {
      expect(validateForm({ a: 'HEY' }, { a: ['noShoutingString'] })).toEqual({ a: 'Please stop shouting' });
      expect(validateForm({ a: 'HEY' }, { a: ['legacy:name'] })).toEqual({ a: 'Please stop shouting' });
      expect(validateForm({ a: 'HEY' }, { a: ['noShoutingString:1'] })).toBeNull();
    } finally {
      delete validators.noShoutingString;
      delete validators['legacy:name'];
    }
  });
});
