import { describe, it, expect } from 'vitest';
import { render, memo } from '../src/index.js';

describe('shared nodes and cycles', () => {
  it('renders the same element object in several places', () => {
    const badge = { span: { className: 'badge', text: 'new' } };

    expect(render({ div: { children: [badge, badge, { p: { children: [badge] } }] } }))
      .toBe('<div><span class="badge">new</span><span class="badge">new</span><p><span class="badge">new</span></p></div>');
  });

  it('renders a shared props object and a shared children array', () => {
    const props = { className: 'item', text: 'x' };
    const items = [{ li: props }, { li: props }];

    expect(render({ div: { children: [{ ul: { children: items } }, { ol: { children: items } }] } }))
      .toBe('<div><ul><li class="item">x</li><li class="item">x</li></ul><ol><li class="item">x</li><li class="item">x</li></ol></div>');
  });

  it('renders a memoized result twice on one page', () => {
    const Avatar = memo(({ id }) => ({ img: { src: `/a/${id}.png`, alt: '' } }));

    expect(render({ div: { children: [Avatar({ id: 7 }), Avatar({ id: 7 })] } }))
      .toBe('<div><img src="/a/7.png" alt=""><img src="/a/7.png" alt=""></div>');
  });

  it('still reports real cycles', () => {
    const node = { div: { children: [] } };
    node.div.children.push(node);

    expect(() => render(node)).toThrow(/Circular reference/);
  });

  it('reports an array that contains itself instead of overflowing the stack', () => {
    const children = [{ span: { text: 'a' } }];
    children.push(children);

    expect(() => render({ div: { children } })).toThrow(/Circular reference/);
  });
});
