/**
 * Event delegation against a DOM with real capture/bubble dispatch.
 *
 * Every delegated listener except submit was registered passive, so
 * preventDefault() was silently ignored; only nine event types were ever
 * listened for, so onDoubleClick/onMouseEnter/onPointerDown got an attribute
 * but never fired; and only the nearest handler ran, so a container's
 * handler never heard its children's events.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hydrate } from '../src/hydrate.js';
import { eventDelegation } from '../src/events/index.js';
import { installDom } from './helpers/dom.js';

let dom;

beforeEach(() => {
  dom = installDom();
});

afterEach(() => {
  eventDelegation.destroy();
  dom.uninstall();
});

function mountAndHydrate(html, component) {
  const container = dom.mount(html);
  hydrate(component, container, { detectMismatch: false });
  return container;
}

describe('preventDefault()', () => {
  it('cancels a delegated click, e.g. SPA link navigation', () => {
    const container = mountAndHydrate('<a href="/next">Next</a>', () => ({
      a: { href: '/next', text: 'Next', onClick: (e) => e.preventDefault() },
    }));

    const event = dom.fire(container, 'click');

    expect(event.defaultPrevented).toBe(true);
  });

  it('cancels delegated keydown and change events', () => {
    const container = mountAndHydrate(
      '<form><input id="name"><input id="agree" type="checkbox"></form>',
      () => ({
        form: {
          children: [
            { input: { id: 'name', onKeyDown: (e) => e.preventDefault() } },
            { input: { id: 'agree', type: 'checkbox', onChange: (e) => e.preventDefault() } },
          ],
        },
      })
    );

    expect(dom.fire(container.querySelector('#name'), 'keydown', { key: 'Enter' }).defaultPrevented).toBe(true);
    expect(dom.fire(container.querySelector('#agree'), 'change').defaultPrevented).toBe(true);
  });

  it('keeps scroll-blocking types passive', () => {
    mountAndHydrate('<div></div>', () => ({ div: { onWheel: () => {} } }));

    const [wheel] = dom.document.listenersFor('wheel');
    const [click] = dom.document.listenersFor('click');

    expect(wheel.passive).toBe(true);
    expect(click.passive).toBe(false);
  });
});

describe('event types beyond the defaults', () => {
  it('fires onDoubleClick, onPointerDown and onContextMenu handlers', () => {
    const calls = [];
    const container = mountAndHydrate('<div id="box"></div>', () => ({
      div: {
        id: 'box',
        onDoubleClick: () => calls.push('dblclick'),
        onPointerDown: () => calls.push('pointerdown'),
        onContextMenu: () => calls.push('contextmenu'),
      },
    }));

    dom.fire(container, 'dblclick');
    dom.fire(container, 'pointerdown');
    dom.fire(container, 'contextmenu');

    expect(calls).toEqual(['dblclick', 'pointerdown', 'contextmenu']);
    expect(container.getAttribute('data-coherent-dblclick')).not.toBeNull();
  });

  it('runs onMouseEnter for its own element only, as the event does not bubble', () => {
    const calls = [];
    const container = mountAndHydrate('<ul><li>one</li></ul>', () => ({
      ul: {
        onMouseEnter: () => calls.push('ul'),
        children: [{ li: { text: 'one', onMouseEnter: () => calls.push('li') } }],
      },
    }));

    dom.fire(container.querySelector('li'), 'mouseenter', { bubbles: false });
    dom.fire(container, 'mouseenter', { bubbles: false });

    expect(calls).toEqual(['li', 'ul']);
  });
});

describe('bubbling through delegated handlers', () => {
  const component = (calls, stopAt) => () => ({
    section: {
      id: 'outer',
      onClick: () => calls.push('section'),
      children: [
        {
          div: {
            onClick: (e) => {
              calls.push('div');
              if (stopAt === 'div') e.stopPropagation();
            },
            children: [
              {
                button: {
                  text: 'Go',
                  onClick: (e) => {
                    calls.push('button');
                    if (stopAt === 'button') e.stopPropagation();
                  },
                },
              },
            ],
          },
        },
      ],
    },
  });
  const html = '<section id="outer"><div><button><span>Go</span></button></div></section>';

  it('runs the handlers of the target and every ancestor, innermost first', () => {
    const calls = [];
    const container = mountAndHydrate(html, component(calls));

    dom.fire(container.querySelector('span'), 'click');

    expect(calls).toEqual(['button', 'div', 'section']);
  });

  it('stops at the handler that calls stopPropagation()', () => {
    const calls = [];
    const container = mountAndHydrate(html, component(calls, 'div'));

    const event = dom.fire(container.querySelector('button'), 'click');

    expect(calls).toEqual(['button', 'div']);
    expect(event.propagationStopped).toBe(true);
  });

  it('passes each handler the element it is registered on', () => {
    const seen = [];
    const container = mountAndHydrate('<div id="a"><p id="b">x</p></div>', () => ({
      div: {
        id: 'a',
        onClick: (e) => seen.push(e.currentTarget.id),
        children: [{ p: { id: 'b', text: 'x', onClick: (e) => seen.push(e.target.id) } }],
      },
    }));

    dom.fire(container.querySelector('#b'), 'click');

    expect(seen).toEqual(['b', 'a']);
  });
});
