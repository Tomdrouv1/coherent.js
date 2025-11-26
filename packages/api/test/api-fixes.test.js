/**
 * Test API fixes for v1.0.0
 * Verifies that renderToString -> render and createFormState exports work correctly
 */

import { describe, it, expect } from 'vitest';
import { render } from '@coherent.js/core';
import { createFormState, createReactiveState } from '@coherent.js/state';

describe('API Fixes for v1.0.0', () => {
  it('should import render function from core package', () => {
    expect(render).toBeDefined();
    expect(typeof render).toBe('function');
  });

  it('should render simple component with render function', async () => {
    const component = {
      div: { class: 'test', text: 'Hello World' }
    };

    const html = await render(component);
    expect(html).toContain('Hello World');
    expect(html).toContain('class="test"');
  });

  it('should import createFormState from state package', () => {
    expect(createFormState).toBeDefined();
    expect(typeof createFormState).toBe('function');
  });

  it('should create form state with initial values', () => {
    const formState = createFormState({
      name: 'John',
      email: 'john@example.com'
    });

    expect(formState.getValue('name')).toBe('John');
    expect(formState.getValue('email')).toBe('john@example.com');
  });

  it('should work with reactive state and rendering together', async () => {
    const state = createReactiveState({
      title: 'Coherent.js',
      count: 42
    });

    const component = {
      div: {
        children: [
          { h1: { text: state.get('title') }},
          { p: { text: `Count: ${state.get('count')}` }}
        ]
      }
    };

    const html = await render(component);
    expect(html).toContain('Coherent.js');
    expect(html).toContain('Count: 42');
  });
});
