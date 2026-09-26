import { describe, it, expect } from 'vitest';
import { render, renderToStream, streamingUtils, dangerouslySetInnerContent } from '../src/index.js';

async function collect(component, options) {
  const chunks = [];
  for await (const chunk of renderToStream(component, options)) chunks.push(chunk);
  return chunks;
}

const bigList = (n) => ({ ul: { children: Array.from({ length: n }, (_, i) => ({ li: { key: i, className: 'row', text: `item ${i} <&>` } })) } });

describe('renderToStream', () => {
  const cases = {
    'script bodies are not HTML-escaped': { script: { text: 'if (a < b && c) { run("x"); }' } },
    'text and children both render': { p: { text: 'Hello ', children: [{ b: { text: 'world' } }] } },
    'key is not an attribute': { div: { key: 'k1', id: 'x', text: 'y' } },
    'number shorthand': { td: 42 },
    'invalid tag names render nothing': { div: { children: [{ 'img src=x onerror=alert(1)': {} }] } },
    'void elements': { div: { children: [{ br: {} }, { img: { src: '/a.png', alt: '' } }] } },
    'trusted content': { div: { children: [dangerouslySetInnerContent('<em>raw</em>')] } },
    'booleans in children': { ul: { children: [false && { li: 'x' }, { li: 'y' }] } },
    'multi-key objects': { h1: { text: 'Title' }, p: { text: 'Paragraph' } },
    'streamed large list with nested small subtrees': { main: { children: [{ h1: 'List' }, bigList(50), { footer: { children: [{ small: '(c)' }] } }] } }
  };

  for (const [name, component] of Object.entries(cases)) {
    it(`matches render(): ${name}`, async () => {
      expect((await collect(component)).join('')).toBe(render(component));
    });
  }

  it('matches render() with scoped CSS and a function component', async () => {
    const Card = () => ({ div: { children: [{ style: { text: '.c{color:red}' } }, { p: { className: 'c', text: 'x' } }] } });
    expect((await collect(Card, { scoped: true })).join('')).toBe(render(Card, { scoped: true }));
  });

  it('yields several chunks and gives the event loop a turn between them', async () => {
    let ticks = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      ticks++;
      setImmediate(tick);
    };
    setImmediate(tick);

    const chunks = await collect({ table: { children: [bigList(3000)] } }, { chunkSize: 4096 });
    running = false;

    expect(chunks.length).toBeGreaterThan(10);
    expect(ticks).toBeGreaterThanOrEqual(chunks.length - 1);
    expect(chunks.join('')).toBe(render({ table: { children: [bigList(3000)] } }));
  });

  it('throws errors instead of hiding them in an HTML comment', async () => {
    const Boom = () => {
      throw new Error('boom --> <script>alert(1)</script>');
    };
    await expect(collect({ div: { children: [bigList(20), Boom] } })).rejects.toThrow('boom');
  });

  it('supports onError like render()', async () => {
    const Boom = () => {
      throw new Error('boom');
    };
    const tree = { div: { children: [Boom, { p: 'after' }] } };
    const onError = () => ({ p: 'fallback' });
    expect((await collect(tree, { onError })).join('')).toBe(render(tree, { onError }));
  });

  it('reports cycles', async () => {
    const children = [{ span: 'a' }];
    children.push(children);
    await expect(collect({ div: { children } })).rejects.toThrow(/Circular reference/);
  });

  it('streamToResponse aborts the response when rendering fails', async () => {
    const Boom = () => {
      throw new Error('boom');
    };
    const events = [];
    const response = {
      headersSent: false,
      getHeader: () => undefined,
      setHeader: (name, value) => events.push(['header', name, value]),
      write: (chunk) => { events.push(['write', chunk.length]); return true; },
      once: () => {},
      end: () => events.push(['end']),
      destroy: (error) => events.push(['destroy', error.message])
    };

    await expect(streamingUtils.streamToResponse(renderToStream({ div: { children: [Boom] } }), response)).rejects.toThrow('boom');
    expect(events).toContainEqual(['destroy', 'boom']);
    expect(events.some(([type]) => type === 'end')).toBe(false);
  });
});
