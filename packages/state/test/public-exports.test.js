/**
 * Public export tests
 *
 * The .d.ts described FormState, ListState, ModalState, RouterState,
 * StateError and globalErrorHandler, but index.js re-exported only the
 * create*State factories — so importing any of them by name failed at runtime
 * while typechecking clean.
 */

import { describe, it, expect } from 'vitest';
import {
  FormState,
  ListState,
  ModalState,
  RouterState,
  StateError,
  globalErrorHandler,
  createFormState,
  createListState,
  createModalState,
  createRouterState,
  observable
} from '../src/index.js';

describe('state pattern classes', () => {
  it.each([
    ['FormState', FormState],
    ['ListState', ListState],
    ['ModalState', ModalState],
    ['RouterState', RouterState]
  ])('exports %s', (_name, Klass) => {
    expect(typeof Klass).toBe('function');
  });

  it.each([
    ['createFormState', createFormState, FormState],
    ['createListState', createListState, ListState],
    ['createModalState', createModalState, ModalState],
    ['createRouterState', createRouterState, RouterState]
  ])('%s builds an instance of the exported class', (_name, factory, Klass) => {
    expect(factory()).toBeInstanceOf(Klass);
  });
});

describe('StateError', () => {
  it('is the error thrown by the reactive primitives', () => {
    const value = observable(1);

    expect(() => value.watch('not a function')).toThrow(StateError);
  });
});

describe('globalErrorHandler', () => {
  it('exposes a handle method', () => {
    expect(typeof globalErrorHandler.handle).toBe('function');
  });
});
