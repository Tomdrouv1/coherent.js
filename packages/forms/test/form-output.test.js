/**
 * Form output tests
 *
 * Regression coverage for @coherent.js/forms shipping a form builder whose
 * output did not match its type declarations:
 *  - buildForm() returned the FormBuilder, so render(buildForm(...)) threw
 *    "Invalid component structure" where the .d.ts promised a CoherentNode;
 *  - the form element dropped action, method and name entirely;
 *  - toHTML() hand-rolled a string that emitted only type/name/id per field
 *    and interpolated values unescaped;
 *  - setAction, setMethod, build and render were declared but absent.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@coherent.js/core';
import { buildForm, createFormBuilder, FormBuilder } from '../src/index.js';

const CONFIG = {
  action: '/subscribe',
  method: 'post',
  name: 'signup',
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'age', type: 'number', label: 'Age' },
    { name: 'bio', type: 'textarea', label: 'Bio' }
  ]
};

describe('buildForm', () => {
  it('returns a renderable component, not the builder', () => {
    const form = buildForm(CONFIG);

    expect(form).toHaveProperty('form');
    expect(() => render(form)).not.toThrow();
  });

  it('keeps the form action and method', () => {
    const html = render(buildForm(CONFIG));

    expect(html).toContain('action="/subscribe"');
    expect(html).toContain('method="post"');
    expect(html).toContain('name="signup"');
  });

  it('keeps every field type', () => {
    const html = render(buildForm(CONFIG));

    expect(html).toContain('type="email"');
    expect(html).toContain('type="number"');
    expect(html).toContain('type="textarea"');
  });

  it('never emits a stringified object', () => {
    expect(render(buildForm(CONFIG))).not.toContain('[object Object]');
  });

  it('accepts fields keyed by name', () => {
    const html = render(buildForm({
      action: '/x',
      fields: { email: { type: 'email', label: 'Email' } }
    }));

    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
  });

  it('accepts a bare array of fields', () => {
    const html = render(buildForm([{ name: 'email', type: 'email', label: 'Email' }]));

    expect(html).toContain('name="email"');
  });

  it('omits attributes that were not configured', () => {
    const html = render(buildForm({ fields: [{ name: 'q', type: 'text' }] }));

    expect(html).not.toContain('action=');
    expect(html).not.toContain('method=');
  });
});

describe('FormBuilder.toHTML', () => {
  it('matches what rendering the component produces', () => {
    const builder = createFormBuilder(CONFIG);

    expect(builder.toHTML()).toBe(render(builder.buildForm()));
  });

  it('keeps action, method and field types', () => {
    const html = createFormBuilder(CONFIG).toHTML();

    expect(html).toContain('action="/subscribe"');
    expect(html).toContain('method="post"');
    expect(html).toContain('type="email"');
    expect(html).toContain('type="number"');
  });

  it('escapes field labels rather than interpolating them raw', () => {
    const builder = new FormBuilder({ action: '/x' });
    builder.addField('q', { type: 'text', label: '<script>alert(1)</script>' });

    const html = builder.toHTML();

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('declared FormBuilder methods', () => {
  it.each(['setAction', 'setMethod', 'build', 'render'])('implements %s', name => {
    expect(typeof new FormBuilder()[name]).toBe('function');
  });

  it('chains setAction and setMethod into the built form', () => {
    const builder = new FormBuilder();
    builder.addField('email', { type: 'email', label: 'Email' });

    const html = render(builder.setAction('/signup').setMethod('post').build());

    expect(html).toContain('action="/signup"');
    expect(html).toContain('method="post"');
  });

  it('render() returns the same component as build()', () => {
    const builder = createFormBuilder(CONFIG);

    expect(render(builder.render())).toBe(render(builder.build()));
  });
});
