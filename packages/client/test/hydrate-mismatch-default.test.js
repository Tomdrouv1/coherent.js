/**
 * Mismatch detection walks the whole server DOM, so it must not run in
 * production by accident. The build replaced process.env.NODE_ENV with the
 * build machine's value — unset, so 'development' — which baked
 * `detectMismatch = true` into dist: every production hydrate() walked the
 * DOM and logged warnings.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hydrate } from '../src/hydrate.js';
import { eventDelegation } from '../src/events/index.js';
import { installDom } from './helpers/dom.js';

const env = globalThis.process.env;
let dom;
let previousNodeEnv;
let warn;

// Server rendered a <p>; the client renders a <span>.
const Mismatched = () => ({ span: { text: 'Hello' } });

beforeEach(() => {
  dom = installDom();
  previousNodeEnv = env.NODE_ENV;
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  env.NODE_ENV = previousNodeEnv;
  eventDelegation.destroy();
  dom.uninstall();
});

describe('hydrate() mismatch detection default', () => {
  it('is off outside development', () => {
    for (const value of ['production', 'test', undefined]) {
      if (value === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = value;

      hydrate(Mismatched, dom.mount('<p>Hello</p>'));
    }

    expect(warn).not.toHaveBeenCalled();
  });

  it('is on when NODE_ENV is development at runtime', () => {
    env.NODE_ENV = 'development';

    hydrate(Mismatched, dom.mount('<p>Hello</p>'));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('Hydration mismatch detected');
  });

  it('is on when enabled explicitly, or implied by onMismatch and strict', () => {
    env.NODE_ENV = 'production';
    const onMismatch = vi.fn();

    hydrate(Mismatched, dom.mount('<p>Hello</p>'), { detectMismatch: true });
    hydrate(Mismatched, dom.mount('<p>Hello</p>'), { onMismatch });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(onMismatch).toHaveBeenCalledWith([expect.objectContaining({ type: 'tagName' })]);
    expect(() => hydrate(Mismatched, dom.mount('<p>Hello</p>'), { strict: true })).toThrow('Hydration failed');
  });

  it('stays off when disabled explicitly, even in development', () => {
    env.NODE_ENV = 'development';

    hydrate(Mismatched, dom.mount('<p>Hello</p>'), { detectMismatch: false, onMismatch: vi.fn() });

    expect(warn).not.toHaveBeenCalled();
  });
});
