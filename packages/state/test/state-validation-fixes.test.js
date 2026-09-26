/**
 * Validation defects: a null value for an `object` property threw a
 * TypeError instead of failing validation; `additionalProperties: false` was
 * ignored unless `allowUnknown: false` was also set; coercion turned "false"
 * into true; NaN passed as a number; and a second ModalState#open() left the
 * first caller's promise pending forever.
 */

import { describe, it, expect } from 'vitest';
import { createValidatedState } from '../src/state-validation.js';
import { createModalState } from '../src/enhanced-state-patterns.js';
import * as patterns from '../src/enhanced-state-patterns.js';

const errorsOf = (state, update) => {
  const errors = [];
  const validated = createValidatedState(state.initial, { ...state.options, onError: (e) => errors.push(...e) });
  validated.setState(update);
  return { errors: errors.map(({ path, type }) => ({ path, type })), state: validated.getState() };
};

describe('object type', () => {
  const profileSchema = {
    type: 'object',
    properties: { profile: { type: 'object', required: ['name'] } },
  };

  it('reports null as a type error instead of throwing', () => {
    const result = errorsOf(
      { initial: { profile: { name: 'Ada' } }, options: { schema: profileSchema } },
      { profile: null }
    );

    expect(result.errors).toEqual([{ path: 'profile', type: 'type' }]);
    expect(result.state).toEqual({ profile: { name: 'Ada' } });
  });

  it('reports null as a type error with coercion on too', () => {
    const result = errorsOf(
      { initial: { profile: { name: 'Ada' } }, options: { schema: profileSchema, coerce: true } },
      { profile: null }
    );

    expect(result.errors).toEqual([{ path: 'profile', type: 'type' }]);
  });

  it('does not accept an array as an object', () => {
    const result = errorsOf(
      { initial: { profile: { name: 'Ada' } }, options: { schema: profileSchema } },
      { profile: ['Ada'] }
    );

    expect(result.errors).toEqual([{ path: 'profile', type: 'type' }]);
  });
});

describe('additionalProperties: false', () => {
  it('rejects unknown properties on its own', () => {
    const schema = { type: 'object', properties: { a: { type: 'number' } }, additionalProperties: false };

    const result = errorsOf({ initial: {}, options: { schema } }, { a: 1, isAdmin: true });

    expect(result.errors).toEqual([{ path: 'isAdmin', type: 'additionalProperties' }]);
    expect(result.state).toEqual({});
  });

  it('is implied for listed properties by allowUnknown: false', () => {
    const schema = { type: 'object', properties: { a: { type: 'number' } } };

    const result = errorsOf({ initial: {}, options: { schema, allowUnknown: false } }, { a: 1, b: 2 });

    expect(result.errors).toEqual([{ path: 'b', type: 'additionalProperties' }]);
  });
});

describe('coercion', () => {
  const schema = {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      n: { type: 'number' },
      i: { type: 'integer' },
      s: { type: 'string' },
    },
  };
  const coerced = (update) => errorsOf({ initial: {}, options: { schema, coerce: true } }, update);

  it('reads "false" and "0" as false, not true', () => {
    expect(coerced({ ok: 'false' }).state).toEqual({ ok: false });
    expect(coerced({ ok: '0' }).state).toEqual({ ok: false });
    expect(coerced({ ok: 'true' }).state).toEqual({ ok: true });
  });

  it('refuses conversions that would invent a value', () => {
    expect(coerced({ ok: 'maybe' }).errors).toEqual([{ path: 'ok', type: 'type' }]);
    expect(coerced({ n: '' }).errors).toEqual([{ path: 'n', type: 'type' }]);
    expect(coerced({ i: '12abc' }).errors).toEqual([{ path: 'i', type: 'type' }]);
    expect(coerced({ s: { toString: 'x' } }).errors).toEqual([{ path: 's', type: 'type' }]);
  });

  it('still converts numeric strings and numbers', () => {
    expect(coerced({ n: '4.5', i: '12', s: 42 }).state).toEqual({ n: 4.5, i: 12, s: '42' });
  });
});

describe('number type', () => {
  it('rejects NaN', () => {
    const schema = { type: 'object', properties: { n: { type: 'number', minimum: 0 } } };

    const result = errorsOf({ initial: { n: 1 }, options: { schema } }, { n: NaN });

    expect(result.errors).toEqual([{ path: 'n', type: 'type' }]);
    expect(result.state).toEqual({ n: 1 });
  });
});

describe('ModalState#open()', () => {
  it('settles the previous caller with null when a new modal replaces it', async () => {
    const modal = createModalState();

    const first = modal.open('confirm-delete');
    const second = modal.open('confirm-logout');
    modal.close('ok');

    await expect(first).resolves.toBeNull();
    await expect(second).resolves.toBe('ok');
  });
});

describe('enhanced-state-patterns exports', () => {
  it('does not ship the demo in production code', () => {
    expect(patterns.demoEnhancedPatterns).toBeUndefined();
    expect(Object.keys(patterns.default)).not.toContain('demoEnhancedPatterns');
  });
});
