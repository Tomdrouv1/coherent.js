import { describe, it, expect } from 'vitest';
import { withState } from '../src/index.js';

// Helper component factory using correct withState HOC API
function makeTestComponent() {
  return withState({ count: 0 })(function Wrapped(props) {
    const { state, stateUtils } = props;
    // trigger a state update to exercise the container
    if (state.count === 0) stateUtils.setState({ count: 1 });
    return { div: { text: String(state.count) } };
  });
}

describe('State Container', () => {
  it('withState does not leak a global "initialized" variable', () => {
    const before = Object.prototype.hasOwnProperty.call(globalThis, 'initialized');

    const Comp = makeTestComponent();
    // Invoke component function (no renderer needed for this check)
    const result = Comp({}, {}, {});

    expect(result && typeof result === 'object').toBe(true); // component should return an element object

    const after = Object.prototype.hasOwnProperty.call(globalThis, 'initialized');
    expect(before).toBe(after); // globalThis should not gain an "initialized" property
    expect(globalThis.initialized).toBe(undefined); // globalThis.initialized should be undefined
  });

  it('withState component can execute without throwing', () => {
    const Comp = makeTestComponent();
    expect(() => {
      const out = Comp({}, {}, {});
      expect(out).toBeTruthy();
    }).not.toThrow();
  });
});

describe('withStateUtils.shared', () => {
  it('shares one container between components with the same key', async () => {
    const { withStateUtils, render } = await import('../src/index.js');
    const key = `shared-${Date.now()}`;
    const A = withStateUtils.shared({ theme: 'light' }, key)(({ state }) => ({ p: { text: `A:${state.theme}` } }));
    const B = withStateUtils.shared({ theme: 'ignored' }, key)(({ state }) => ({ p: { text: `B:${state.theme}` } }));

    // It threw "middleware is not iterable" before rendering anything.
    expect(render(A())).toBe('<p>A:light</p>');
    expect(render(B())).toBe('<p>B:light</p>');
  });
});
