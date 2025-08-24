import test from 'node:test';
import assert from 'node:assert/strict';

import { withState } from '../src/coherent.js';

// Helper component factory using correct withState HOC API
function makeTestComponent() {
  return withState({ count: 0 })(function Wrapped(props) {
    const { state, stateUtils } = props;
    // trigger a state update to exercise the container
    if (state.count === 0) stateUtils.setState({ count: 1 });
    return { div: { text: String(state.count) } };
  });
}

test('withState does not leak a global "initialized" variable', () => {
  const before = Object.prototype.hasOwnProperty.call(globalThis, 'initialized');

  const Comp = makeTestComponent();
  // Invoke component function (no renderer needed for this check)
  const result = Comp({}, {}, {});

  assert.ok(result && typeof result === 'object', 'component should return an element object');

  const after = Object.prototype.hasOwnProperty.call(globalThis, 'initialized');
  assert.equal(before, after, 'globalThis should not gain an "initialized" property');
  assert.equal(globalThis.initialized, undefined, 'globalThis.initialized should be undefined');
});

test('withState component can execute without throwing', () => {
  const Comp = makeTestComponent();
  assert.doesNotThrow(() => {
    const out = Comp({}, {}, {});
    assert.ok(out);
  });
});
