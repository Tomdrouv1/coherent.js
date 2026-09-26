import { describe, it, expect } from 'vitest';
import { render, lazy } from '../src/index.js';

describe('async components and lazy values', () => {
  it('rejects a Promise child with an explicit error', () => {
    const AsyncWidget = async () => ({ p: { text: 'loaded' } });

    // It used to render <div></div>.
    expect(() => render({ div: { children: [AsyncWidget] } })).toThrow(/Cannot render a Promise at root\.div\.children\[0\]/);
    expect(() => render({ div: { children: [Promise.resolve({ p: 'x' })] } })).toThrow(/render\(\) is synchronous/);
  });

  it('rejects an async component passed to render()', () => {
    expect(() => render(async () => ({ p: 'x' }))).toThrow(/Cannot render a Promise/);
  });

  it('renders lazy() values', () => {
    let calls = 0;
    const expensive = lazy(() => {
      calls++;
      return { p: { text: 'computed' } };
    });

    expect(render({ div: { children: [expensive] } })).toBe('<div><p>computed</p></div>');
    expect(render({ div: { children: [expensive] } })).toBe('<div><p>computed</p></div>');
    expect(calls).toBe(1);
  });
});
