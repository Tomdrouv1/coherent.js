import { describe, it, expect } from 'vitest';
import * as core from '@coherent.js/core';

describe('@coherent.js/core public API', () => {
  it('exports the expected stable API surface', () => {
    expect(core).toHaveProperty('render');
    expect(core).toHaveProperty('VERSION');

    expect(core).toHaveProperty('renderWithTemplate');
    expect(core).toHaveProperty('renderWithMonitoring');
    expect(core).toHaveProperty('renderComponentFactory');
    expect(core).toHaveProperty('createErrorResponse');

    expect(core).toHaveProperty('importPeerDependency');
    expect(core).toHaveProperty('isPeerDependencyAvailable');
    expect(core).toHaveProperty('checkPeerDependencies');
    expect(core).toHaveProperty('createLazyIntegration');

    expect(core).toHaveProperty('hasChildren');
    expect(core).toHaveProperty('normalizeChildren');
  });
});
