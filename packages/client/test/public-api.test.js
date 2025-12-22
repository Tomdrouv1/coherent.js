import { describe, it, expect } from 'vitest';
import * as client from '@coherent.js/client';

describe('@coherent.js/client public API', () => {
  it('exports the expected stable API surface', () => {
    expect(client).toHaveProperty('hydrate');
    expect(client).toHaveProperty('hydrateAll');
    expect(client).toHaveProperty('hydrateBySelector');
    expect(client).toHaveProperty('enableClientEvents');
    expect(client).toHaveProperty('makeHydratable');
    expect(client).toHaveProperty('autoHydrate');
  });
});
