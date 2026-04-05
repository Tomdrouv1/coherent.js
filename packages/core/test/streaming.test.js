
import { describe, it, expect } from 'vitest';
import { renderToStream } from '../src/rendering/html-renderer.js';

describe('Streaming Rendering', () => {
  it('renders simple component to stream', async () => {
    const component = { div: { text: 'Hello' } };
    const chunks = [];
    for await (const chunk of renderToStream(component)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('<div>Hello</div>');
  });

  it('renders components with children to stream', async () => {
    const component = {
      div: {
        children: [
          { h1: { text: 'Title' } },
          { p: { text: 'Content' } }
        ]
      }
    };
    const chunks = [];
    for await (const chunk of renderToStream(component)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('<div><h1>Title</h1><p>Content</p></div>');
  });

  it('renders function components to stream', async () => {
    const Greeting = () => ({ div: { text: 'Hello from function' } });
    const chunks = [];
    for await (const chunk of renderToStream(Greeting)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('<div>Hello from function</div>');
  });

  it('handles deep nesting in stream', async () => {
    const component = {
      div: {
        children: [
          {
            div: {
              children: [
                { span: { text: 'Deep' } }
              ]
            }
          }
        ]
      }
    };
    const chunks = [];
    for await (const chunk of renderToStream(component)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('<div><div><span>Deep</span></div></div>');
  });

  it('handles withState components in stream', async () => {
    const { withState } = await import('../src/components/component-system.js');
    const Counter = withState({ count: 10 })(({ state }) => ({
      div: { text: `Count: ${state.count}` }
    }));

    const chunks = [];
    for await (const chunk of renderToStream(Counter)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('<div>Count: 10</div>');
  });

  it('handles function components with context in stream', async () => {
    // Simulated context-aware component that returns content
    const ContextProvider = () => {
      return { div: { text: 'Context Content' } };
    };

    const chunks = [];
    for await (const chunk of renderToStream(ContextProvider)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('<div>Context Content</div>');
  });

  it('handles multiple elements in one object in stream', async () => {
    const component = {
      h1: { text: 'Title' },
      p: { text: 'Paragraph' }
    };
    const chunks = [];
    for await (const chunk of renderToStream(component)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('<h1>Title</h1><p>Paragraph</p>');
  });

  it('handles style objects in stream', async () => {
    const component = { div: { style: { color: 'red', fontSize: '16px' }, text: 'Styled' } };
    const chunks = [];
    for await (const chunk of renderToStream(component)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('<div style="color: red; font-size: 16px">Styled</div>');
  });

  it('handles null props in stream', async () => {
    const component = { div: null };
    const chunks = [];
    for await (const chunk of renderToStream(component)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('<div></div>');
  });

  it('handles empty objects in stream', async () => {
    const component = {};
    const chunks = [];
    for await (const chunk of renderToStream(component)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('');
  });
});
