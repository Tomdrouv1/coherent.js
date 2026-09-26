/**
 * The client must read a component tree the way core's renderer writes it,
 * or hydration binds handlers to the wrong elements and patching drifts away
 * from what the server would render.
 *
 * It read only the first key of `{ span: ..., button: ... }`, which core
 * renders as two siblings, so the next element's handler ran on the button;
 * it wrote `className: ['a', cond && 'b']` as "a,false", `{ active: true }`
 * as "[object Object]", dropped `aria-hidden: false` and `spellcheck: false`,
 * ignored `class` next to `className`, and wrote `text: null` as "null".
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, lazy } from '@coherent.js/core';
import { hydrate } from '../src/hydrate.js';
import { eventDelegation } from '../src/events/index.js';
import { detectMismatch } from '../src/hydration/index.js';
import { createElement, patchElement } from '../src/hydration/patch.js';
import { getRenderedChildren } from '../src/hydration/vnode.js';
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

/** Mount core's output and return its root element. */
const mountServer = (vNode) => dom.mount(ssr(vNode));

/** Core's output for `vNode`, as the browser's DOM serialises it. */
const serverMarkup = (vNode) => mountServer(vNode).outerHTML;

/** outerHTML without hydrate()'s own marker attribute. */
const markup = (element) => element.outerHTML.replace(' data-coherent-hydrated="true"', '');

/** Trees whose client reading used to differ from core's rendering. */
const PARITY_CASES = [
  ['a multi-key child as sibling elements', {
    div: { children: [{ span: { text: 'label' }, button: { text: 'Go' } }, { a: { text: 'link' } }] },
  }],
  ['multi-key shorthand, null and function content', {
    div: { children: [{ b: 'bold', br: null, i: () => 'computed' }, 'tail'] },
  }],
  ['objects with a key that is not a tag name as nothing', {
    div: { children: [{ my_tag: 'x' }, { span: 'a', 'not a tag': 'b' }, { p: 'kept' }] },
  }],
  ['a lazy() child as what it evaluates to', {
    div: { children: [lazy(() => ({ em: 'deferred' })), { span: 'after' }] },
  }],
  ['className arrays with falsy and nested entries', {
    div: { className: ['a', false, null, undefined, 'c', ['d', { e: true, f: false }]] },
  }],
  ['className objects', { div: { className: { active: true, hidden: false } } }],
  ['an empty className array', { div: { className: [] } }],
  ['class and className together', { div: { class: ['x', false], className: { y: true } } }],
  ['a merged class in the place of `class`', { div: { className: 'a', id: 'i', class: 'b' } }],
  ['a function className', { div: { className: () => ['fn', false && 'no'] } }],
  ['aria-* booleans as "true"/"false"', { div: { 'aria-hidden': false, 'aria-expanded': true } }],
  ['enumerated booleans as "true"/"false"', {
    div: { spellcheck: false, draggable: true, contenteditable: false },
  }],
  ['boolean attributes as present or absent', {
    input: { type: 'checkbox', disabled: true, required: false, readonly: true },
  }],
  ['null and undefined attributes as absent', { a: { href: null, title: undefined, id: 'x' } }],
  ['function attributes called, on* handlers skipped', {
    button: { title: () => 'Computed', 'data-count': () => 3, onclick: () => {}, text: 'Go' },
  }],
  ['text: null as no text', { p: { text: null, children: ['after'] } }],
  ['text: undefined as no text', { span: { text: undefined } }],
  ['zero as text and attribute', { span: { text: 0, 'data-n': 0 } }],
  // Core used to get these wrong itself (htmlFor="x", "color: false",
  // style="", --main-color, "null", a function's source in class).
  ['htmlFor as for', { label: { htmlFor: 'email', text: 'Email' } }],
  ['style values that are null, undefined or false as left out', {
    div: { style: { color: false, margin: null, padding: undefined, fontSize: '2px' } },
  }],
  ['an empty style as no attribute', { div: { style: {}, id: 's' } }],
  ['custom properties with their case', { div: { style: { '--mainColor': 'red' } } }],
  ['a text function returning null as no text', { p: { text: () => null, children: ['after'] } }],
  ['html: null as no raw HTML', { p: { html: null, text: 'fallback' } }],
  ['a function in class next to className, called', { div: { class: () => 'a', className: 'b' } }],
];

describe('createElement() builds what render() renders', () => {
  it.each(PARITY_CASES)('renders %s', (_name, vNode) => {
    expect(createElement(vNode).outerHTML).toBe(serverMarkup(vNode));
  });
});

describe('mismatch detection reads trees the way render() writes them', () => {
  it.each(PARITY_CASES)('finds no mismatch for %s', (_name, vNode) => {
    expect(detectMismatch(mountServer(vNode), vNode)).toEqual([]);
  });
});

describe('getRenderedChildren() lists what render() renders', () => {
  it('lists no text for text: null or undefined', () => {
    expect(getRenderedChildren('span', { text: null })).toEqual([]);
    expect(getRenderedChildren('span', { text: undefined })).toEqual([]);
  });

  it('lists each key of a multi-key object as its own element, in order', () => {
    const items = getRenderedChildren('div', {
      children: [{ span: { text: 'label' }, button: { text: 'Go' } }, { a: 'link' }],
    });

    expect(items.map((item) => Object.keys(item.vNode))).toEqual([['span'], ['button'], ['a']]);
  });
});

describe('hydrate() binds handlers across multi-key elements', () => {
  it('binds the button of a multi-key child to its own handler, not the next element\'s', () => {
    const calls = [];
    const App = () => ({
      div: {
        children: [
          { span: { text: 'label' }, button: { text: 'Go', onclick: () => calls.push('button') } },
          { a: { text: 'link', onclick: () => calls.push('link') } },
        ],
      },
    });
    const container = mountServer(App());
    hydrate(App, container, { detectMismatch: false });

    dom.fire(container.querySelector('button'), 'click');
    dom.fire(container.querySelector('a'), 'click');

    expect(calls).toEqual(['button', 'link']);
  });
});

describe('patchElement() converges to what render() renders for the new view', () => {
  const PATCH_CASES = [
    ['text to text: null', { button: { text: 'Save' } }, { button: { text: null } }],
    ['class arrays as state changes',
      { button: { className: ['btn', true && 'active', false && 'busy'] } },
      { button: { className: ['btn', false && 'active', true && 'busy'] } }],
    ['class objects and class + className',
      { div: { className: { open: true } } },
      { div: { class: 'panel', className: { open: false, closed: true } } }],
    ['aria-* and enumerated booleans flipping',
      { div: { 'aria-hidden': true, spellcheck: true, contenteditable: true } },
      { div: { 'aria-hidden': false, spellcheck: false, contenteditable: false } }],
    ['boolean attributes toggling off and on',
      { button: { disabled: true, text: 'Go' } },
      { button: { disabled: false, autofocus: true, text: 'Go' } }],
    ['attributes becoming null',
      { a: { href: '/x', title: 'X' } },
      { a: { href: null, title: undefined } }],
    ['multi-key children growing',
      { div: { children: [{ span: 'a', button: 'b' }] } },
      { div: { children: [{ span: 'a2', button: { text: 'b2', disabled: true } }, { a: 'c' }] } }],
  ];

  it.each(PATCH_CASES)('patches %s', (_name, before, after) => {
    const element = mountServer(before);

    patchElement(element, before, after);

    expect(element.outerHTML).toBe(serverMarkup(after));
  });

  it('re-renders a hydrated toggle to the server markup of its new state', () => {
    const Toggle = (state) => ({
      button: {
        className: ['btn', state.active && 'active', state.busy && 'busy'],
        'aria-pressed': state.active,
        text: state.label,
      },
    });
    const initial = { active: true, busy: false, label: 'Save' };
    const container = mountServer(Toggle(initial));
    expect(markup(container)).toBe('<button class="btn active" aria-pressed="true">Save</button>');
    const app = hydrate(Toggle, container, { initialState: initial, detectMismatch: false });

    app.setState({ active: false, busy: true, label: null });

    expect(markup(container)).toBe(serverMarkup(Toggle({ active: false, busy: true, label: null })));
    expect(markup(container)).toBe('<button class="btn busy" aria-pressed="false"></button>');
  });
});
