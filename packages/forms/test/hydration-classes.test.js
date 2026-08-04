/**
 * Hydration class-contract tests
 *
 * The builder's class names are a live contract with hydrateForm, which used
 * to hardcode them: it found the field wrapper with `.form-field` and wrote
 * `.error-message` / `.error`. Making the builder's names configurable without
 * moving hydration onto the `data-field` attribute would have broken error
 * display for anyone who renamed them.
 *
 * The forms package runs in the `node` environment, so this drives hydrateForm
 * against a DOM double covering only what error rendering touches.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hydrateForm } from '../src/form-hydration.js';

function element(tag, attributes = {}) {
  const node = {
    tagName: tag.toUpperCase(),
    attributes: { ...attributes },
    dataset: {},
    style: {},
    children: [],
    parentElement: null,
    className: '',
    classList: {
      _set: new Set(),
      // A real DOMTokenList throws on a token containing whitespace.
      _assertToken(name) {
        if (/\s/.test(name)) {
          throw new Error(`InvalidCharacterError: ${JSON.stringify(name)}`);
        }
      },
      add(name) { this._assertToken(name); this._set.add(name); },
      remove(name) { this._assertToken(name); this._set.delete(name); },
      contains(name) { return this._set.has(name); }
    },
    value: '',
    get type() { return node.attributes.type ?? 'text'; },
    getAttribute: name => node.attributes[name] ?? null,
    setAttribute: (name, value) => { node.attributes[name] = String(value); },
    hasAttribute: name => name in node.attributes,
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) {
      child.parentElement = node;
      node.children.push(child);
      return child;
    },
    // Walk up until an ancestor matches `[attribute]` or `.class`
    closest(selector) {
      const attribute = selector.match(/^\[([^\]]+)\]$/)?.[1];
      const className = selector.startsWith('.') ? selector.slice(1) : null;

      for (let current = node; current; current = current.parentElement) {
        if (attribute && attribute in current.attributes) return current;
        if (className && current.className.split(' ').includes(className)) return current;
      }
      return null;
    },
    querySelectorAll: () => [],
    querySelector: () => null
  };
  return node;
}

/** A wrapper carrying `data-field` plus a custom class, with one input. */
function formWithField(wrapperClass) {
  const input = element('input', { name: 'email', type: 'email', required: '' });
  const wrapper = element('div', { 'data-field': 'email' });
  wrapper.className = wrapperClass;
  wrapper.appendChild(input);

  const form = element('form');
  form.appendChild(wrapper);
  form.querySelectorAll = selector => (selector === '[name]' ? [input] : []);

  return { form, wrapper, input };
}

let created;

beforeEach(() => {
  created = [];
  global.document = {
    createElement: tag => {
      const node = element(tag);
      created.push(node);
      return node;
    },
    getElementById: () => null,
    querySelector: () => null
  };
});

afterEach(() => {
  delete global.document;
  vi.restoreAllMocks();
});

describe('finding the field wrapper', () => {
  it('uses data-field rather than a class name', () => {
    const { form, wrapper } = formWithField('contact-form__field');

    hydrateForm(form);

    expect(created).toHaveLength(1);
    expect(created[0].parentElement).toBe(wrapper);
  });

  it('still works for hand-written markup with no data-field', () => {
    const input = element('input', { name: 'email' });
    const wrapper = element('div');
    wrapper.className = 'form-field';
    wrapper.appendChild(input);

    const form = element('form');
    form.appendChild(wrapper);
    form.querySelectorAll = selector => (selector === '[name]' ? [input] : []);

    hydrateForm(form);

    // No data-field to match, so the parentElement fallback applies — which
    // for the standard structure is the same wrapper.
    expect(created[0].parentElement).toBe(wrapper);
  });
});

describe('error class names', () => {
  it('defaults to the framework names', () => {
    const { form, input } = formWithField('form-field');

    const controller = hydrateForm(form);
    controller.setTouched('email');
    controller.validateField('email');

    expect(created[0].className).toBe('error-message');
    expect(input.classList.contains('error')).toBe(true);
  });

  it('writes the configured names instead', () => {
    const { form, input } = formWithField('contact-form__field');

    const controller = hydrateForm(form, {
      classNames: { error: 'contact-form__error', invalid: 'is-invalid' }
    });
    controller.setTouched('email');
    controller.validateField('email');

    expect(created[0].className).toBe('contact-form__error');
    expect(input.classList.contains('is-invalid')).toBe(true);
    expect(input.classList.contains('error')).toBe(false);
  });

  // classList.add/remove take one token each — a space-separated value throws
  // InvalidCharacterError in a real DOM.
  it('applies a multi-token invalid class one token at a time', () => {
    const { form, input } = formWithField('contact-form__field');

    const controller = hydrateForm(form, {
      classNames: { invalid: 'is-invalid has-error' }
    });
    controller.setTouched('email');
    controller.validateField('email');

    expect(input.classList.contains('is-invalid')).toBe(true);
    expect(input.classList.contains('has-error')).toBe(true);

    controller.setFieldValue('email', 'someone@example.com');
    controller.validateField('email');

    expect(input.classList.contains('is-invalid')).toBe(false);
    expect(input.classList.contains('has-error')).toBe(false);
  });

  it('removes the configured invalid class once the field passes', () => {
    const { form, input } = formWithField('contact-form__field');

    const controller = hydrateForm(form, { classNames: { invalid: 'is-invalid' } });
    controller.setTouched('email');
    controller.validateField('email');
    expect(input.classList.contains('is-invalid')).toBe(true);

    controller.setFieldValue('email', 'someone@example.com');
    controller.validateField('email');

    expect(input.classList.contains('is-invalid')).toBe(false);
  });
});
