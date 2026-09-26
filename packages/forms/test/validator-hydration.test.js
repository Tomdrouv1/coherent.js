/**
 * Server → client validator round trip.
 *
 * buildInput wrote `data-validators` as `v.name || 'custom'`. Factory-built
 * validators (`validators.minLength(8)`) are anonymous closures, so every one
 * was emitted as `custom`, which hydrateForm treated as always valid: the
 * client accepted a 3-character password the server then rejected.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@coherent.js/core';
import { createFormBuilder, hydrateForm, validators, registerValidator } from '../src/index.js';

/** The control node the builder renders for `name`. */
function control(builder, name) {
  const field = builder.buildForm().form.children
    .find(child => child.div && child.div['data-field'] === name);
  const [, node] = field.div.children;
  return node.input || node.textarea || node.select;
}

/** Decode the entities core's attribute escaping may produce. */
function decodeAttribute(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** The `data-validators` attribute of `name` as a browser would read it. */
function renderedAttribute(builder, name) {
  const html = render(builder.buildForm());
  const input = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))[0];
  const attribute = input.match(/data-validators="([^"]*)"/);
  return attribute ? decodeAttribute(attribute[1]) : null;
}

/** A minimal DOM double: one form, one input carrying `dataset.validators`. */
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
  const form = {
    querySelectorAll: selector => (selector === '[name]' ? [input] : []),
    querySelector: () => null,
    addEventListener() {},
    removeEventListener() {}
  };
  return hydrateForm(form);
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

describe('data-validators', () => {
  it('describes a factory-built validator by name and arguments', () => {
    const builder = createFormBuilder({
      fields: [{ name: 'password', type: 'password', validators: [validators.minLength(8)] }]
    });

    expect(control(builder, 'password')['data-validators']).toBe('[{"name":"minLength","args":[8]}]');
  });

  it('keeps custom messages and rebuilds regular expressions', () => {
    const builder = createFormBuilder({
      fields: [{
        name: 'code',
        validators: [validators.required('Code please'), validators.pattern(/^[A-Z]{3}$/i, 'Three letters')]
      }]
    });

    expect(control(builder, 'code')['data-validators']).toBe(
      '[{"name":"required","args":["Code please"]},' +
      '{"name":"pattern","args":[{"$regexp":["^[A-Z]{3}$","i"]},"Three letters"]}]'
    );
  });

  it('describes a built-in listed without calling it', () => {
    const builder = createFormBuilder({
      fields: [{ name: 'email', validators: [validators.email] }]
    });

    expect(control(builder, 'email')['data-validators']).toBe('[{"name":"email","args":[]}]');
  });

  it('omits validators the client cannot rebuild instead of calling them "custom"', () => {
    const builder = createFormBuilder({
      fields: [{
        name: 'handle',
        validators: [value => (value === 'admin' ? 'Reserved' : null), validators.custom(v => v !== 'root')]
      }]
    });

    expect(control(builder, 'handle')['data-validators']).toBeUndefined();
    // Still enforced on the server.
    builder.setValues({ handle: 'admin' });
    expect(builder.validate()).toEqual({ handle: 'Reserved' });
  });

  it('describes a registered validator by its registered name', () => {
    const noShouting = value => (value && value === value.toUpperCase() ? 'Please stop shouting' : null);
    registerValidator('noShoutingRoundTrip', noShouting);
    try {
      const builder = createFormBuilder({
        fields: [{ name: 'bio', validators: [validators.noShoutingRoundTrip] }]
      });

      const attribute = renderedAttribute(builder, 'bio');
      expect(attribute).toBe('[{"name":"noShoutingRoundTrip","args":[]}]');

      const controller = hydrateInput('bio', attribute);
      controller.setFieldValue('bio', 'HELLO');
      expect(controller.validateField('bio')).toBe(false);
      expect(controller.getError('bio')).toBe('Please stop shouting');
    } finally {
      delete validators.noShoutingRoundTrip;
    }
  });

  it('escapes the JSON inside the rendered attribute', () => {
    const builder = createFormBuilder({
      fields: [{ name: 'password', validators: [validators.minLength(8)] }]
    });

    expect(render(builder.buildForm())).toContain(
      'data-validators="[{&quot;name&quot;:&quot;minLength&quot;,&quot;args&quot;:[8]}]"'
    );
  });
});

describe('client enforces what the server rendered', () => {
  it('rejects a value the server-side minLength(8) rejects', () => {
    const builder = createFormBuilder({
      fields: [{ name: 'password', validators: [validators.minLength(8)] }]
    });
    const controller = hydrateInput('password', renderedAttribute(builder, 'password'));

    controller.setFieldValue('password', 'short');
    expect(controller.validateField('password')).toBe(false);
    expect(controller.getError('password')).toBe('Minimum length is 8');

    controller.setFieldValue('password', 'long enough');
    expect(controller.validateField('password')).toBe(true);
  });

  it('rebuilds the pattern and its message', () => {
    const builder = createFormBuilder({
      fields: [{ name: 'code', validators: [validators.pattern(/^[A-Z]{3}$/i, 'Three letters')] }]
    });
    const controller = hydrateInput('code', renderedAttribute(builder, 'code'));

    controller.setFieldValue('code', 'ab1');
    expect(controller.validateField('code')).toBe(false);
    expect(controller.getError('code')).toBe('Three letters');

    controller.setFieldValue('code', 'abc');
    expect(controller.validateField('code')).toBe(true);
  });

  it('gives the same verdicts as the server for every emitted rule', () => {
    const fieldValidators = [validators.email(), validators.maxLength(12, 'Too long'), validators.alpha];
    const builder = createFormBuilder({ fields: [{ name: 'handle', validators: fieldValidators }] });
    const controller = hydrateInput('handle', renderedAttribute(builder, 'handle'));

    const verdicts = [];
    for (const value of ['nope', 'a@b.co', 'someone@example.com']) {
      builder.setValues({ handle: value });
      controller.setFieldValue('handle', value);
      controller.validateField('handle');
      verdicts.push([builder.validateField('handle'), controller.getError('handle')]);
    }

    expect(verdicts).toEqual([
      ['Invalid email address', 'Invalid email address'],
      ['Must contain only letters', 'Must contain only letters'],
      ['Too long', 'Too long']
    ]);
  });

  it('still reads the older comma-separated attribute', () => {
    const controller = hydrateInput('name', 'required,minLength:3');

    controller.setFieldValue('name', 'ab');
    expect(controller.validateField('name')).toBe(false);
    expect(controller.getError('name')).toBe('Minimum length is 3');
  });

  it('ignores unknown names and helpers', () => {
    const controller = hydrateInput('x', '[{"name":"constructor"},{"name":"chain"},{"name":"nope"}]');

    controller.setFieldValue('x', 'anything');
    expect(controller.validateField('x')).toBe(true);
  });
});
