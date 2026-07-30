/**
 * registerValidator tests
 *
 * validators.js and validation.js both export a const named `validators`, and
 * index.js re-exports validation.js's explicitly — which shadows the other in
 * the star export. registerValidator() wrote only to the shadowed object, so
 * `validators[name]` stayed undefined for every consumer and the function was
 * a silent no-op.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { registerValidator, validators, FormValidator } from '../src/index.js';

/** Names touched by a test, with whatever they held before. */
const saved = new Map();

function register(name, fn) {
  if (!saved.has(name)) saved.set(name, validators[name]);
  registerValidator(name, fn);
}

afterEach(() => {
  for (const [name, original] of saved) {
    if (original === undefined) delete validators[name];
    else validators[name] = original;
  }
  saved.clear();
});

describe('registerValidator', () => {
  it('puts the validator on the exported registry', () => {
    register('evenLength', () => null);

    expect(typeof validators.evenLength).toBe('function');
  });

  it('registers a validator a schema can then use', () => {
    register('noShouting', value =>
      typeof value === 'string' && value && value === value.toUpperCase()
        ? 'Please stop shouting'
        : null
    );

    const validator = new FormValidator({ message: [validators.noShouting] });

    expect(validator.validate({ message: 'HELLO' })).toEqual({
      isValid: false,
      errors: { message: 'Please stop shouting' }
    });
    expect(validator.validate({ message: 'hello' }).isValid).toBe(true);
  });

  it('overwrites an existing name', () => {
    register('email', () => 'replaced');

    expect(validators.email()).toBe('replaced');
  });
});
