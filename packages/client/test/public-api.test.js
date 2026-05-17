import { describe, it, expect } from 'vitest';
import * as client from '@coherent.js/client';

describe('@coherent.js/client public API', () => {
  it('exports the expected stable API surface', () => {
    expect(client).toHaveProperty('hydrate');
    expect(client).toHaveProperty('eventDelegation');
    expect(client).toHaveProperty('handlerRegistry');
    expect(client).toHaveProperty('serializeState');
    expect(client).toHaveProperty('deserializeState');
    expect(client).toHaveProperty('detectMismatch');
  });
});
