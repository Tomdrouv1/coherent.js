import { describe, it, expect } from 'vitest';
import { render, memoize, ComponentCache, performanceMonitor } from '../src/index.js';
import { renderWithTiming } from '../src/rendering/html-renderer.js';

describe('rendering values', () => {
  it('skips booleans in children so `cond && element` works', () => {
    const loggedIn = false;
    expect(render({ ul: { children: [loggedIn && { li: { text: 'Logout' } }, { li: { text: 'Home' } }, true] } }))
      .toBe('<ul><li>Home</li></ul>');
  });

  it('keeps rendering booleans passed as text', () => {
    expect(render({ span: { text: false } })).toBe('<span>false</span>');
  });

  it('renders text: null as empty', () => {
    expect(render({ p: { text: null } })).toBe('<p></p>');
  });

  it('keeps numbers, including 0', () => {
    expect(render({ td: { children: [0] } })).toBe('<td>0</td>');
  });

  it('joins class arrays and objects', () => {
    expect(render({ p: { className: ['btn', false, 'btn-primary', ['large']] } })).toBe('<p class="btn btn-primary large"></p>');
    expect(render({ p: { className: { active: true, disabled: false, open: 1 } } })).toBe('<p class="active open"></p>');
  });

  it('merges class and className into one attribute', () => {
    expect(render({ p: { class: 'a', className: 'b', id: 'x' } })).toBe('<p class="a b" id="x"></p>');
  });

  it('writes false for aria-* and enumerated attributes', () => {
    expect(render({ div: { 'aria-hidden': false, 'aria-expanded': true, spellcheck: false, draggable: true, hidden: false } }))
      .toBe('<div aria-hidden="false" aria-expanded="true" spellcheck="false" draggable="true"></div>');
  });
});

describe('scoped CSS', () => {
  const Card = () => ({
    div: {
      children: [
        { style: { text: '.title{color:red} @media (max-width: 600px){.title, .link:hover{color:blue}} @keyframes spin{from{opacity:0} 50%{opacity:.5} to{opacity:1}} @font-face{font-family:x}' } },
        { h2: { className: 'title', text: 'Hi' } }
      ]
    }
  });

  it('is deterministic across renders', () => {
    expect(render(Card(), { scoped: true })).toBe(render(Card(), { scoped: true }));
  });

  it('scopes rules inside @media and leaves @keyframes and @font-face alone', () => {
    const html = render(Card(), { scoped: true });
    const scope = html.match(/coh-[0-9a-z]+/)[0];
    const css = html.match(/<style[^>]*>(.*)<\/style>/)[1];

    expect(css).toBe(
      `.title[${scope}] {color:red} @media (max-width: 600px){.title[${scope}], .link[${scope}]:hover {color:blue}} @keyframes spin{from{opacity:0} 50%{opacity:.5} to{opacity:1}} @font-face{font-family:x}`
    );
  });

  it('scopes a function component passed to render', () => {
    expect(render(Card, { scoped: true })).toBe(render(Card(), { scoped: true }));
    expect(render(Card, { scoped: true })).toMatch(/<h2 class="title" coh-[0-9a-z]+="">Hi<\/h2>/);
  });
});

describe('monitoring and timers', () => {
  it('renders with enableMonitoring', () => {
    performanceMonitor.reset();
    expect(render({ div: { children: [{ p: { text: 'x' } }] } }, { enableMonitoring: true })).toBe('<div><p>x</p></div>');
    expect(performanceMonitor.generateReport().metrics.renderTime.count).toBeGreaterThan(0);
  });

  it('renderWithTiming returns HTML and timing', () => {
    const { html, timing } = renderWithTiming({ p: { text: 'x' } });
    expect(html).toBe('<p>x</p>');
    expect(typeof timing.total).toBe('number');
  });

  it('memoize does not keep the process alive', () => {
    const cache = new ComponentCache();
    expect(cache.cleanupTimer.hasRef()).toBe(false);
    cache.destroy?.();
    expect(typeof memoize).toBe('function');
  });
});
