/**
 * A FormBuilder shared across requests.
 *
 * values, errors and touched live on the instance, so a builder created once
 * at module scope and filled per request rendered one user's submitted values
 * and errors into the next user's page. fork() gives each request its own
 * state, and buildForm({ values, errors }) renders per-request state without
 * touching the shared instance.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@coherent.js/core';
import { createFormBuilder } from '../src/index.js';

function signupForm() {
  return createFormBuilder({
    action: '/signup',
    method: 'post',
    fields: [
      { name: 'email', type: 'email', required: true },
      { name: 'plan', type: 'text', defaultValue: 'free' },
      { name: 'company', type: 'text', showWhen: values => values.plan === 'team' }
    ]
  });
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('fork()', () => {
  it('keeps one request\'s values and errors out of the shared builder', () => {
    const signup = signupForm();
    const pristine = render(signup.buildForm());

    const alice = signup.fork();
    alice.setValues({ email: 'alice@', plan: 'team', company: 'Acme' });
    alice.validate();
    alice.touch('email');
    const aliceHtml = render(alice.buildForm());

    expect(aliceHtml).toContain('value="alice@"');
    expect(aliceHtml).toContain('value="Acme"');
    expect(aliceHtml).toContain('<div id="email-error" role="alert" class="error-message">Please enter a valid email address</div>');

    // Bob's GET renders the shared definition: none of Alice's data.
    expect(render(signup.buildForm())).toBe(pristine);
    expect(signup.getValues()).toEqual({ plan: 'free' });
    expect(signup.errors).toEqual({});
  });

  it('copies the definition: fields, options, defaults and handlers', async () => {
    const signup = signupForm().onSubmit(values => ({ saved: values.email }));
    const copy = signup.fork();

    expect(copy.getFields()).toEqual(signup.getFields());
    expect(copy.getValues()).toEqual({ plan: 'free' });
    expect(render(copy.buildForm())).toBe(render(signup.buildForm()));

    copy.setValues({ email: 'bob@example.com' });
    expect(await copy.submit()).toEqual({ success: true, data: { saved: 'bob@example.com' } });

    copy.setAction('/elsewhere');
    expect(signup.options.action).toBe('/signup');
  });

  it('isolates concurrent requests that share one definition', async () => {
    const signup = signupForm();

    const handle = async (body) => {
      const form = signup.fork();
      form.setValues(body);
      await tick();
      form.validate();
      for (const name of Object.keys(body)) form.touch(name);
      await tick();
      return render(form.buildForm());
    };

    const [alice, bob] = await Promise.all([
      handle({ email: 'alice@' }),
      handle({ email: 'bob@example.com' })
    ]);

    expect(alice).toContain('value="alice@"');
    expect(alice).not.toContain('bob@example.com');
    expect(alice).toContain('Please enter a valid email address');
    expect(bob).toContain('value="bob@example.com"');
    expect(bob).not.toContain('alice@');
    expect(bob).not.toContain('email-error');
  });
});

describe('buildForm({ values, errors })', () => {
  it('renders per-request state without changing the builder', () => {
    const signup = signupForm();
    const pristine = render(signup.buildForm());

    const html = render(signup.buildForm({
      values: { email: 'alice@', plan: 'team', company: 'Acme' },
      errors: { email: 'Please enter a valid email address' }
    }));

    expect(html).toContain('value="alice@"');
    expect(html).toContain('value="Acme"'); // showWhen sees the per-render values
    expect(html).toContain('aria-describedby="email-error" class="error"');
    expect(html).toContain('<div id="email-error" role="alert" class="error-message">Please enter a valid email address</div>');

    expect(signup.getValues()).toEqual({ plan: 'free' });
    expect(signup.errors).toEqual({});
    expect(render(signup.buildForm())).toBe(pristine);
  });

  it('does not mix in state left on the instance', () => {
    const signup = signupForm();
    signup.setValues({ email: 'stale@example.com' });
    signup.errors = { email: 'Stale error' };
    signup.touch('email');

    const html = render(signup.buildForm({ values: { email: 'fresh@example.com' } }));

    expect(html).toContain('value="fresh@example.com"');
    expect(html).toContain('value="free"');
    expect(html).not.toContain('stale@example.com');
    expect(html).not.toContain('Stale error');
  });

  it('shows an error only for fields marked touched when touched is given', () => {
    const signup = signupForm();
    const html = render(signup.buildForm({
      values: { email: '' },
      errors: { email: 'This field is required' },
      touched: {}
    }));

    expect(html).not.toContain('id="email-error"');
    expect(html).toContain('aria-invalid="true"');
  });
});
