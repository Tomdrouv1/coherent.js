/**
 * Form markup tests
 *
 * Reported from a production marketing site whose contact form posts to its
 * own origin so it works without JavaScript. The builder could not express it:
 *
 *  - every form carried `onsubmit="handleSubmit(event)"`, naming a global the
 *    package never defines — hydrateForm binds its own listener — and
 *    `novalidate`, which turns off the browser validation the no-JS path
 *    depends on. `novalidate: false` was ignored;
 *  - `attributes` was declared on FormField and read by nothing, so no
 *    autocomplete and no maxlength;
 *  - class names were hardcoded, so the site's CSS stopped applying, and
 *    controls carried a literal `class=""`;
 *  - fields hidden by `visible`/`showWhen` rendered anyway, which validate()
 *    had always skipped.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@coherent.js/core';
import { buildForm, createFormBuilder, DEFAULT_CLASS_NAMES } from '../src/index.js';

const CONTACT = {
  action: '/contact',
  method: 'post',
  className: 'contact-form',
  classNames: {
    field: 'contact-form__field',
    control: 'contact-form__input',
    submit: 'clk-btn clk-btn-primary',
    error: 'contact-form__error'
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      required: true,
      attributes: { autocomplete: 'email', maxlength: 120 }
    }
  ]
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('no-JS submission', () => {
  it('emits no inline onsubmit', () => {
    const html = render(buildForm(CONTACT));

    expect(html).not.toContain('onsubmit');
    expect(html).not.toContain('handleSubmit');
  });

  it('leaves native validation on', () => {
    expect(render(buildForm(CONTACT))).not.toContain('novalidate');
  });

  it('keeps the action and method a no-JS post needs', () => {
    const html = render(buildForm(CONTACT));

    expect(html).toContain('action="/contact"');
    expect(html).toContain('method="post"');
  });

  it('emits novalidate only when asked', () => {
    expect(render(buildForm({ ...CONTACT, novalidate: true }))).toContain('novalidate');
    expect(render(buildForm({ ...CONTACT, novalidate: false }))).not.toContain('novalidate');
  });

  it('emits the inline handler only when enhancement is opted into', () => {
    expect(render(buildForm({ ...CONTACT, enhance: true })))
      .toContain('onsubmit="handleSubmit(event)"');
  });

  it('uses a custom enhancement handler verbatim', () => {
    expect(render(buildForm({ ...CONTACT, enhance: 'contactSubmit(event)' })))
      .toContain('onsubmit="contactSubmit(event)"');
  });
});

describe('field attributes', () => {
  it('passes attributes through to the control', () => {
    const html = render(buildForm(CONTACT));

    expect(html).toContain('autocomplete="email"');
    expect(html).toContain('maxlength="120"');
  });

  it('honors disabled and readonly', () => {
    const html = render(buildForm({
      fields: [
        { name: 'a', type: 'text', disabled: true },
        { name: 'b', type: 'text', readonly: true }
      ]
    }));

    expect(html).toContain('disabled');
    expect(html).toContain('readonly');
  });

  it('cannot override the attributes the builder owns', () => {
    const html = render(buildForm({
      fields: [{
        name: 'email',
        type: 'email',
        attributes: { name: 'hijacked', id: 'hijacked', type: 'hidden' }
      }]
    }));

    expect(html).toContain('name="email"');
    expect(html).toContain('id="email"');
    expect(html).toContain('type="email"');
    expect(html).not.toContain('hijacked');
  });

  // formatAttributes escapes attribute values but interpolates names raw.
  it('drops attribute names that are not valid HTML names', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const html = render(buildForm({
      fields: [{ name: 'q', type: 'text', attributes: { 'x onclick=alert(1)': 'y' } }]
    }));

    expect(html).not.toContain('onclick');
    expect(warn).toHaveBeenCalled();
  });
});

describe('class names', () => {
  it('uses the configured names in place of the defaults', () => {
    const html = render(buildForm(CONTACT));

    expect(html).toContain('class="contact-form__field"');
    expect(html).toContain('class="contact-form__input"');
    expect(html).toContain('class="clk-btn clk-btn-primary"');
    expect(html).not.toContain('form-field');
    expect(html).not.toContain('submit-button');
  });

  it('appends a per-field class to the control class', () => {
    const html = render(buildForm({
      classNames: { control: 'base' },
      fields: [{ name: 'q', type: 'text', className: 'extra' }]
    }));

    expect(html).toContain('class="base extra"');
  });

  it('falls back to the documented defaults', () => {
    const html = render(buildForm({ fields: [{ name: 'q', type: 'text' }] }));

    expect(html).toContain(`class="${DEFAULT_CLASS_NAMES.field}"`);
    expect(html).toContain(`class="${DEFAULT_CLASS_NAMES.submit}"`);
  });

  it('never emits an empty class or placeholder attribute', () => {
    const html = render(buildForm({ fields: [{ name: 'q', type: 'text' }] }));

    expect(html).not.toContain('class=""');
    expect(html).not.toContain('placeholder=""');
  });

  it('keeps the data-field hook hydration uses to find the wrapper', () => {
    expect(render(buildForm(CONTACT))).toContain('data-field="email"');
  });
});

describe('field visibility', () => {
  it('omits a field marked not visible', () => {
    const html = render(buildForm({
      fields: [
        { name: 'shown', type: 'text' },
        { name: 'hidden', type: 'text', visible: false }
      ]
    }));

    expect(html).toContain('name="shown"');
    expect(html).not.toContain('name="hidden"');
  });

  it('renders and validates the same set of fields', () => {
    const builder = createFormBuilder({
      fields: [
        { name: 'always', type: 'text', required: true },
        { name: 'conditional', type: 'text', required: true, showWhen: () => false }
      ]
    });

    const html = render(builder.buildForm());
    const errors = builder.validate();

    expect(html).not.toContain('name="conditional"');
    expect(Object.keys(errors)).not.toContain('conditional');
  });
});

// The reported form carries a trap field the server reads as spam signal.
describe('honeypot', () => {
  const builder = createFormBuilder({
    action: '/contact',
    method: 'post',
    classNames: { control: 'contact-form__input' }
  });
  builder.field('email', { type: 'email', label: 'Email', required: true });
  builder.field('website', {
    type: 'text',
    label: 'Website',
    className: 'contact-form__trap',
    attributes: { tabindex: '-1', autocomplete: 'off' }
  });

  const html = render(builder.buildForm());

  it('renders the trap field with its hiding class', () => {
    expect(html).toContain('name="website"');
    expect(html).toContain('contact-form__trap');
  });

  it('keeps it out of the tab order and off autofill', () => {
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('autocomplete="off"');
  });

  it('does not require it', () => {
    expect(builder.validate()).not.toHaveProperty('website');
  });
});
