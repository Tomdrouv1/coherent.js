import { describe, it, expect } from 'vitest';
import { render } from '../src/index.js';

describe('function event handlers on the server', () => {
  const Button = (label) => ({
    button: { className: 'btn', onClick: () => label, onmouseover: () => {}, text: label }
  });

  it('render no attribute', () => {
    expect(render(Button('Save'))).toBe('<button class="btn">Save</button>');
  });

  it('render deterministically', () => {
    expect(render(Button('Save'))).toBe(render(Button('Save')));
  });

  it('are not retained after rendering', () => {
    for (let i = 0; i < 1000; i++) {
      render(Button(`user-${i}`));
    }

    expect(globalThis.__coherentActionRegistry).toBeUndefined();
  });

  it('keep inline string handlers', () => {
    expect(render({ button: { onclick: 'history.back()', text: 'Back' } }))
      .toBe('<button onclick="history.back()">Back</button>');
  });
});
