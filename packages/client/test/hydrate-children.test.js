/**
 * Hydration must pair virtual children with DOM nodes the way the server
 * rendered them. hydrate() and the mismatch detector paired them by raw index,
 * so a null child, a text child, merged adjacent strings or raw HTML shifted
 * every following element: the Save button ran Delete's handler.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, dangerouslySetInnerContent } from '@coherent.js/core';
import { hydrate } from '../src/hydrate.js';
import { eventDelegation } from '../src/events/index.js';
import { detectMismatch } from '../src/hydration/index.js';
import { installDom } from './helpers/dom.js';

let dom;

beforeEach(() => {
  dom = installDom();
});

afterEach(() => {
  eventDelegation.destroy();
  dom.uninstall();
});

const ssr = (vNode) => render(vNode, { enableCache: false });

/** Render on the "server", parse, hydrate, and return the container. */
function hydrateFromServer(component, options = {}) {
  const container = dom.mount(ssr(component({})));
  hydrate(component, container, { detectMismatch: false, ...options });
  return container;
}

function clickAll(container, ids) {
  for (const id of ids) {
    dom.fire(container.querySelector(`#${id}`), 'click');
  }
}

describe('hydrate() binds handlers to the element that rendered them', () => {
  it('ignores a null child before the buttons', () => {
    const calls = [];
    const App = () => ({
      div: {
        children: [
          null,
          { button: { id: 'del', text: 'Delete', onClick: () => calls.push('delete') } },
          { button: { id: 'save', text: 'Save', onClick: () => calls.push('save') } },
        ],
      },
    });

    const container = hydrateFromServer(App);
    clickAll(container, ['save', 'del']);

    expect(calls).toEqual(['save', 'delete']);
  });

  it('ignores undefined children and flattens nested arrays', () => {
    const calls = [];
    const App = () => ({
      ul: {
        children: [
          undefined,
          [{ li: { id: 'a', text: 'A', onClick: () => calls.push('a') } }],
          [[undefined, { li: { id: 'b', text: 'B', onClick: () => calls.push('b') } }]],
        ],
      },
    });

    const container = hydrateFromServer(App);
    clickAll(container, ['b', 'a']);

    expect(calls).toEqual(['b', 'a']);
  });

  it('does not count text children, merged or not, as elements', () => {
    const calls = [];
    const App = () => ({
      p: {
        children: [
          'Total: ',
          3,
          ' items',
          { button: { id: 'more', text: 'More', onClick: () => calls.push('more') } },
          ' and ',
          { button: { id: 'less', text: 'Less', onClick: () => calls.push('less') } },
        ],
      },
    });

    const container = hydrateFromServer(App);
    clickAll(container, ['less', 'more']);

    expect(calls).toEqual(['less', 'more']);
  });

  it('renders `text` before `children`, as the server does', () => {
    const calls = [];
    const App = () => ({
      section: {
        text: 'Heading',
        children: [{ button: { id: 'go', text: 'Go', onClick: () => calls.push('go') } }],
      },
    });

    const container = hydrateFromServer(App);
    clickAll(container, ['go']);

    expect(calls).toEqual(['go']);
  });

  it('calls zero-argument function children like the renderer', () => {
    const calls = [];
    const Badge = () => ({ span: { id: 'badge', text: 'new' } });
    const App = () => ({
      div: {
        children: [
          Badge,
          { button: { id: 'ok', text: 'OK', onClick: () => calls.push('ok') } },
        ],
      },
    });

    const container = hydrateFromServer(App);
    clickAll(container, ['ok']);

    expect(calls).toEqual(['ok']);
    expect(container.querySelector('#badge').getAttribute('data-coherent-click')).toBeNull();
  });

  it('binds elements after raw HTML by counting from the end', () => {
    const calls = [];
    const App = () => ({
      article: {
        children: [
          dangerouslySetInnerContent('<b>bold</b><i>italic</i>'),
          { button: { id: 'like', text: 'Like', onClick: () => calls.push('like') } },
        ],
      },
    });

    const container = hydrateFromServer(App);
    clickAll(container, ['like']);

    expect(calls).toEqual(['like']);
    expect(container.querySelector('i').getAttribute('data-coherent-click')).toBeNull();
  });

  it('skips whitespace-only text between server-rendered elements', () => {
    const calls = [];
    const App = () => ({
      div: {
        children: [
          { button: { id: 'one', text: '1', onClick: () => calls.push('one') } },
          { button: { id: 'two', text: '2', onClick: () => calls.push('two') } },
        ],
      },
    });
    const container = dom.mount(
      '<div>\n  <button id="one">1</button>\n  <button id="two">2</button>\n</div>'
    );

    hydrate(App, container, { detectMismatch: false });
    clickAll(container, ['two', 'one']);

    expect(calls).toEqual(['two', 'one']);
  });
});

describe('detectMismatch() compares children as the server rendered them', () => {
  const mismatchesFor = (vNode, html = ssr(vNode)) => detectMismatch(dom.mount(html), vNode);

  it('reports nothing for identical output with null children and merged text', () => {
    const vNode = {
      div: {
        className: 'cart',
        children: [
          null,
          'Total: ',
          3,
          ' items',
          [undefined, { span: { text: 'EUR' } }],
          '   ',
          { button: { id: 'pay', text: 'Pay' } },
        ],
      },
    };

    expect(mismatchesFor(vNode)).toEqual([]);
  });

  it('reports nothing for `text` plus `children`', () => {
    const vNode = { h2: { text: 'Title ', children: [{ small: { text: 'sub' } }] } };

    expect(mismatchesFor(vNode)).toEqual([]);
  });

  it('treats boolean children as rendering nothing', () => {
    const vNode = {
      div: { children: [false, { span: { text: 'a' } }, true, 'b'] },
    };

    expect(mismatchesFor(vNode, '<div><span>a</span>b</div>')).toEqual([]);
  });

  it('expects no attribute for a null or false value', () => {
    const vNode = { input: { id: null, disabled: false, value: () => 'computed' } };

    expect(mismatchesFor(vNode, '<input value="computed">')).toEqual([]);
  });

  it('still reports a real difference at the right path', () => {
    const vNode = {
      div: { children: [null, 'Hello ', 'world', { span: { text: 'x' } }] },
    };

    const mismatches = mismatchesFor(vNode, '<div>Hello there<span>x</span></div>');

    expect(mismatches).toEqual([
      expect.objectContaining({
        type: 'text',
        path: 'children[0]',
        expected: 'Hello world',
        actual: 'Hello there',
      }),
    ]);
  });

  it('reports a missing element with its position among rendered children', () => {
    const vNode = {
      ul: { children: [null, { li: { text: 'a' } }, { li: { text: 'b' } }] },
    };

    const mismatches = mismatchesFor(vNode, '<ul><li>a</li></ul>');

    expect(mismatches.map(({ type, path, expected, actual }) => ({ type, path, expected, actual }))).toEqual([
      { type: 'children_count', path: 'children', expected: 2, actual: 1 },
      { type: 'missing_dom_child', path: 'children[1]', expected: '<li>', actual: null },
    ]);
  });
});
