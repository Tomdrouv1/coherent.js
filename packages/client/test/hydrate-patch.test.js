/**
 * Re-rendering a hydrated component must bring the DOM in line with the new
 * virtual tree. patchDOM() only walked existing children and stringified
 * attribute values, so lists never grew or shrank, style objects became
 * "[object Object]", key/html became attributes, function values were written
 * as source, and edited fields ignored value/checked. Every re-render also
 * registered new handler ids without releasing the old ones.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@coherent.js/core';
import { hydrate } from '../src/hydrate.js';
import { eventDelegation, handlerRegistry } from '../src/events/index.js';
import { installDom } from './helpers/dom.js';

let dom;

beforeEach(() => {
  dom = installDom();
});

afterEach(() => {
  eventDelegation.destroy();
  dom.uninstall();
});

/**
 * Mount server output — `html`, or `component(state)` rendered by core — and
 * hydrate it.
 */
function setup(component, state = {}, html = render(component(state), { enableCache: false })) {
  const container = dom.mount(html);
  const app = hydrate(component, container, { initialState: state, detectMismatch: false });
  return { container, app };
}

/** outerHTML without hydrate()'s own marker attribute. */
const markup = (element) => element.outerHTML.replace(' data-coherent-hydrated="true"', '');

describe('patching children', () => {
  const List = ({ items }) => ({
    ul: { children: items.map((item) => ({ li: { text: item } })) },
  });

  it('adds children when a list grows', () => {
    const { container, app } = setup(List, { items: ['a'] });

    app.setState({ items: ['a', 'b', 'c'] });

    expect(markup(container)).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>');
  });

  it('removes children when a list shrinks or empties', () => {
    const { container, app } = setup(List, { items: ['a', 'b', 'c'] });

    app.setState({ items: ['a'] });
    expect(markup(container)).toBe('<ul><li>a</li></ul>');

    app.setState({ items: [] });
    expect(markup(container)).toBe('<ul></ul>');
  });

  it('replaces a child whose tag changed and updates text in place', () => {
    const View = ({ editing, label }) => ({
      div: {
        children: [
          'Name: ',
          label,
          editing ? { input: { value: label } } : { span: { text: label } },
        ],
      },
    });
    const { container, app } = setup(View, { editing: false, label: 'Ada' });

    app.setState({ editing: true, label: 'Grace' });

    expect(markup(container)).toBe('<div>Name: Grace<input value="Grace"></div>');
  });

  it('matches keyed children by key, keeping their DOM nodes', () => {
    const Keyed = ({ ids }) => ({
      ul: { children: ids.map((id) => ({ li: { key: id, id, text: id } })) },
    });
    const { container, app } = setup(Keyed, { ids: ['a', 'b', 'c'] });
    const [a, b, c] = container.children;

    app.setState({ ids: ['c', 'a'] });

    expect(markup(container)).toBe('<ul><li id="c">c</li><li id="a">a</li></ul>');
    expect(container.children[0]).toBe(c);
    expect(container.children[1]).toBe(a);
    expect(b.parentNode).toBeNull();
  });

  it('sets and updates raw `html` content instead of an html attribute', () => {
    const Raw = ({ markup }) => ({ div: { html: markup } });
    const { container, app } = setup(Raw, { markup: '<b>one</b>' });

    app.setState({ markup: '<i>two</i>' });

    expect(markup(container)).toBe('<div><i>two</i></div>');
  });
});

describe('patching attributes', () => {
  it('serialises style objects like the server', () => {
    const Box = ({ color }) => ({ div: { style: { color, fontSize: '12px' } } });
    const { container, app } = setup(Box, { color: 'blue' });

    app.setState({ color: 'red' });

    expect(container.getAttribute('style')).toBe('color: red; font-size: 12px');
  });

  it('evaluates function values instead of writing their source', () => {
    const Toggle = ({ active }) => ({
      button: { className: () => (active ? 'on' : 'off'), 'aria-pressed': () => String(active) },
    });
    const { container, app } = setup(Toggle, { active: false });

    app.setState({ active: true });

    expect(markup(container)).toBe('<button class="on" aria-pressed="true"></button>');
  });

  it('never renders key, and removes attributes whose value went away', () => {
    const Item = ({ busy }) => ({
      button: { key: 'save', title: busy ? 'Saving' : undefined, disabled: busy, text: 'Save' },
    });
    const { container, app } = setup(Item, { busy: true });

    app.setState({ busy: false });

    expect(markup(container)).toBe('<button>Save</button>');
  });

  it('writes value and checked to the properties of fields the user edited', () => {
    const Form = ({ text, agreed }) => ({
      form: {
        children: [
          { input: { id: 'text', value: text } },
          { input: { id: 'agree', type: 'checkbox', checked: agreed } },
        ],
      },
    });
    const { container, app } = setup(Form, { text: '', agreed: false });
    const text = container.querySelector('#text');
    const agree = container.querySelector('#agree');

    // The user types and ticks the box; the app then resets the form.
    text.value = 'typed';
    agree.checked = true;
    app.setState({ text: '', agreed: false });

    expect(text.value).toBe('');
    expect(agree.checked).toBe(false);

    app.setState({ text: 'filled', agreed: true });
    expect(text.value).toBe('filled');
    expect(agree.checked).toBe(true);
  });
});

describe('handlers across re-renders', () => {
  const Counter = ({ count = 0 }) => ({
    div: {
      children: [
        { span: { id: 'count', text: String(count) } },
        { button: { id: 'inc', text: '+', onClick: (e) => e.setState({ count: e.state.count + 1 }) } },
      ],
    },
  });

  it('keeps one registry entry per handler however often it re-renders', () => {
    const html = '<div><span id="count">0</span><button id="inc">+</button></div>';
    const { container, app } = setup(Counter, { count: 0 }, html);

    for (let i = 1; i <= 1000; i++) app.setState({ count: i });
    dom.fire(container.querySelector('#inc'), 'click');

    expect(handlerRegistry.size).toBe(1);
    expect(container.querySelector('#count').textContent).toBe('1001');
  });

  it('replaces the previous hydration when a container is hydrated twice', () => {
    const html = '<div><span id="count">0</span><button id="inc">+</button></div>';
    const { container } = setup(Counter, { count: 0 }, html);

    hydrate(Counter, container, { initialState: { count: 0 }, detectMismatch: false });
    dom.fire(container.querySelector('#inc'), 'click');

    expect(handlerRegistry.size).toBe(1);
    expect(container.querySelector('#count').textContent).toBe('1');
  });

  it('removes the delegation attribute of a handler that went away', () => {
    const Once = ({ done }) => ({
      button: { text: done ? 'Done' : 'Go', onClick: done ? undefined : (e) => e.setState({ done: true }) },
    });
    const { container } = setup(Once, { done: false }, '<button>Go</button>');
    expect(container.getAttribute('data-coherent-click')).not.toBeNull();

    dom.fire(container, 'click');

    expect(markup(container)).toBe('<button>Done</button>');
    expect(handlerRegistry.size).toBe(0);
  });

  it('gives handlers the component, its state and its props', () => {
    const seen = [];
    function Greeter({ name }) {
      return {
        button: {
          text: `Hi ${name}`,
          onClick: (e) => seen.push([e.component, e.state, e.props]),
        },
      };
    }
    const container = dom.mount('<button>Hi Ada</button>');
    hydrate(Greeter, container, { initialState: { count: 2 }, props: { name: 'Ada' }, detectMismatch: false });

    dom.fire(container, 'click');

    expect(seen).toEqual([[Greeter, { count: 2 }, { name: 'Ada', count: 2 }]]);
  });
});

describe('unmount()', () => {
  it('is terminal: later setState() neither patches nor re-registers handlers', () => {
    const Counter = ({ count }) => ({
      button: { text: String(count), onClick: (e) => e.setState({ count: count + 1 }) },
    });
    const { container, app } = setup(Counter, { count: 0 }, '<button>0</button>');

    app.unmount();
    app.setState({ count: 5 });
    app.rerender();

    expect(container.outerHTML).toBe('<button>0</button>');
    expect(handlerRegistry.size).toBe(0);
  });
});
