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

  // Regression: type-tests/public-api.typecheck.ts asserted these, but they
  // were never re-exported from index.js. The mismatch stayed invisible
  // because tsconfig.typecheck.json set `baseUrl`, removed in TypeScript 7,
  // so tsc aborted on the config before checking anything.
  it.each([
    'Component',
    'createHOC',
    'memoComponent',
    'escapeHtml',
    'isVoidElement',
    'formatAttributes',
    'cacheManager',
    'createCacheManager'
  ])('exports %s', name => {
    expect(core[name]).toBeDefined();
  });

  it('exports a single escapeHtml implementation', () => {
    // index.js used to carry a second copy escaping ' as &#x27; while the
    // renderer used &#39;, so the package shipped two different escapers.
    expect(core.escapeHtml("it's")).toBe('it&#39;s');
    expect(core.default.escapeHtml).toBe(core.escapeHtml);
  });
});
