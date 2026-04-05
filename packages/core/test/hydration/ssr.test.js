import { describe, it, expect } from 'vitest';
import { render, Island } from '../../src/index.js';

describe('Selective Hydration SSR', () => {
  it('adds data-hydratable attribute when hydratable option is true', () => {
    const Component = {
      div: {
        className: 'interactive',
        text: 'Click me'
      }
    };

    const html = render(Component, { hydratable: true });
    expect(html).toContain('data-hydratable="true"');
  });

  it('does not add data-hydratable attribute when hydratable option is false or missing', () => {
    const Component = {
      div: {
        className: 'static',
        text: 'I am static'
      }
    };

    const html1 = render(Component, { hydratable: false });
    expect(html1).not.toContain('data-hydratable');

    const html2 = render(Component);
    expect(html2).not.toContain('data-hydratable');
  });

  it('adds data-coherent-island attribute when island option is true', () => {
    const Component = {
      div: {
        className: 'island',
        text: 'I am an island'
      }
    };

    const html = render(Component, { island: true });
    expect(html).toContain('data-coherent-island="true"');
  });

  it('adds data-coherent-island attribute when using Island wrapper', () => {
    const MyComponent = ({ name }) => ({
      div: {
        text: `Hello ${name}`
      }
    });

    const MyIsland = Island(MyComponent);
    
    // Test rendering the island function itself
    const html = render(MyIsland, { name: 'Junie' });
    expect(html).toContain('data-coherent-island="true"');
    expect(html).toContain('data-coherent-island-component="MyComponent"');
    expect(html).toContain('Hello Junie');
  });
});
