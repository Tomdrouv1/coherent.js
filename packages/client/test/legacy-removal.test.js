import { describe, it, expect } from 'vitest';

describe('Wave 1: removed public exports', () => {
  it('does not export legacyHydrate from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.legacyHydrate).toBeUndefined();
  });

  it('does not export hydrateAll from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.hydrateAll).toBeUndefined();
  });

  it('does not export hydrateBySelector from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.hydrateBySelector).toBeUndefined();
  });

  it('does not export enableClientEvents from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.enableClientEvents).toBeUndefined();
  });

  it('does not export makeHydratable from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.makeHydratable).toBeUndefined();
  });

  it('does not export autoHydrate from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.autoHydrate).toBeUndefined();
  });

  it('does not export registerEventHandler from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.registerEventHandler).toBeUndefined();
  });

  it('still exports the modern hydrate API', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.hydrate).toBe('function');
  });
});
