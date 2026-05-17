import { describe, it, expect } from 'vitest';

describe('Wave 1: removed deprecated forms exports', () => {
  it('does not export createForm from @coherent.js/forms', async () => {
    const mod = await import('../src/index.js');
    expect(mod.createForm).toBeUndefined();
  });

  it('does not export formValidators from @coherent.js/forms', async () => {
    const mod = await import('../src/index.js');
    expect(mod.formValidators).toBeUndefined();
  });

  it('does not export enhancedForm from @coherent.js/forms', async () => {
    const mod = await import('../src/index.js');
    expect(mod.enhancedForm).toBeUndefined();
  });

  it('still exports the modern createFormBuilder and hydrateForm', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.createFormBuilder).toBe('function');
    expect(typeof mod.hydrateForm).toBe('function');
  });
});
