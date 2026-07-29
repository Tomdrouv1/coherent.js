/**
 * Component error handling tests
 *
 * Regression coverage for Component.handleError():
 *  - it referenced an undeclared `context` when propagating to a parent, so a
 *    nested component error threw ReferenceError *out of* the error boundary
 *    instead of returning the fallback element;
 *  - callHook() routes a throwing hook back into handleError(), so an
 *    errorCaptured hook that itself threw recursed until the stack blew.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Component } from '../src/components/component-system.js';

let errorSpy;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

const throwing = (name, extra = {}) => new Component({
  name,
  render: () => { throw new Error('boom'); },
  ...extra
});

describe('Component.handleError', () => {
  it('returns the fallback element instead of throwing', () => {
    const component = throwing('Solo');

    expect(component.render({})).toEqual({
      div: { className: 'component-_error', text: 'Error in Solo' }
    });
  });

  it('does not throw when propagating to a parent', () => {
    const child = throwing('Child');
    child.parent = new Component({ name: 'Parent', render: () => ({ div: {} }) });

    expect(() => child.render({})).not.toThrow();
    expect(child.render({}).div.text).toBe('Error in Child');
  });

  it('records the propagation trail', () => {
    const child = throwing('Child');
    child.parent = new Component({ name: 'Parent', render: () => ({ div: {} }) });

    child.render({});

    const messages = errorSpy.mock.calls.map(([message]) => message);
    expect(messages).toContain('Component Error in Child:');
    expect(messages).toContain('Component Error in Parent (Child):');
  });

  it('accepts an explicit context', () => {
    const component = throwing('Solo');

    component.handleError(new Error('boom'), 'render');

    expect(errorSpy.mock.calls[0][0]).toBe('Component Error in Solo (render):');
  });

  it('survives an errorCaptured hook that throws', () => {
    const component = throwing('Bad', {
      errorCaptured: () => { throw new Error('hook exploded'); }
    });

    expect(component.render({})).toEqual({
      div: { className: 'component-_error', text: 'Error in Bad' }
    });
  });

  it('clears the re-entrancy guard between errors', () => {
    const component = throwing('Bad', {
      errorCaptured: () => { throw new Error('hook exploded'); }
    });

    component.render({});
    expect(component.isHandlingError).toBe(false);

    errorSpy.mockClear();
    component.render({});
    expect(errorSpy).toHaveBeenCalled();
  });
});
