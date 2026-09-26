/**
 * Router ↔ browser integration. The router never called pushState, listened
 * to popstate or clicks, honoured `mode`/`base`, or matched `/users/:id`;
 * back() twice ping-ponged between two routes; and a slow navigation that
 * resolved after a later one overwrote it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRouter } from '../src/router.js';
import { installDom, ShimEvent } from './helpers/dom.js';

let dom;
let browser;

/** A window.location/window.history pair backed by an entry list. */
function installBrowser(startUrl) {
  const entries = [new URL(startUrl)];
  let index = 0;
  const win = dom.window;
  const current = () => entries[index];

  win.location = {
    get href() { return current().href; },
    get origin() { return current().origin; },
    get pathname() { return current().pathname; },
    get search() { return current().search; },
    get hash() { return current().hash; },
  };
  const go = (delta) => {
    const next = index + delta;
    if (next < 0 || next >= entries.length) return;
    const hashOnly = entries[next].pathname === current().pathname && entries[next].search === current().search;
    index = next;
    win.dispatchEvent(new ShimEvent('popstate', { bubbles: false }));
    if (hashOnly) win.dispatchEvent(new ShimEvent('hashchange', { bubbles: false }));
  };
  win.history = {
    pushState: vi.fn((_state, _title, url) => {
      entries.splice(index + 1);
      entries.push(new URL(url, current()));
      index = entries.length - 1;
    }),
    replaceState: vi.fn((_state, _title, url) => {
      entries[index] = new URL(url, current());
    }),
    back: () => go(-1),
    forward: () => go(1),
  };
  return { entries, url: () => current().href };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

function makeRouter(options) {
  const router = createRouter({ scrollBehavior: { enabled: false }, ...options });
  for (const path of ['/', '/a', '/b', '/c', '/users/:id', '/files/*']) {
    router.addRoute(path, { component: { div: { text: path } } });
  }
  return router;
}

beforeEach(() => {
  dom = installDom();
  browser = installBrowser('https://example.test/app/');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  dom.uninstall();
});

describe('route patterns', () => {
  it('matches :params, a trailing *, and splits query and hash', async () => {
    const router = makeRouter();

    expect(await router.push('/users/42?tab=posts#top')).toBe(true);
    expect(router.getCurrentRoute()).toMatchObject({
      path: '/users/42',
      fullPath: '/users/42?tab=posts#top',
      params: { id: '42' },
      query: { tab: 'posts' },
      hash: '#top',
    });

    await router.push('/files/docs/a%20b.txt');
    expect(router.getCurrentRoute().params).toEqual({ pathMatch: 'docs/a b.txt' });

    expect(await router.push('/nowhere')).toBe(false);
    expect(router.getCurrentRoute().path).toBe('/files/docs/a%20b.txt');
  });
});

describe('history API', () => {
  it('pushes and replaces browser entries under the base path', async () => {
    const router = makeRouter({ base: '/app/' });

    await router.push('/a');
    await router.push('/users/7?x=1');
    await router.replace('/b');

    expect(window.history.pushState).toHaveBeenCalledTimes(2);
    expect(window.history.replaceState).toHaveBeenCalledTimes(1);
    expect(browser.entries.map((u) => u.pathname + u.search)).toEqual(['/app/', '/app/a', '/app/b']);
  });

  // /\/+$/ trimmed the base in quadratic time on input like '////…x'.
  it('trims trailing slashes from the base in linear time', async () => {
    const started = performance.now();
    makeRouter({ base: `${'/'.repeat(50_000)}x` });
    expect(performance.now() - started).toBeLessThan(250);

    const router = makeRouter({ base: '/app///' });
    await router.push('/a');
    expect(browser.entries.map((u) => u.pathname).at(-1)).toBe('/app/a');
  });

  it('uses the hash in hash mode', async () => {
    const router = makeRouter({ mode: 'hash' });

    await router.push('/c');

    expect(browser.url()).toBe('https://example.test/app/#/c');
  });

  it('start() resolves the current location and follows back/forward', async () => {
    browser = installBrowser('https://example.test/app/users/7?tab=posts');
    const router = makeRouter({ base: '/app' });

    await router.start({ interceptLinks: false });
    expect(router.getCurrentRoute()).toMatchObject({ path: '/users/7', params: { id: '7' }, query: { tab: 'posts' } });

    await router.push('/a');
    await router.push('/b');
    router.back();
    await settle();
    expect(router.getCurrentRoute().path).toBe('/a');

    router.back();
    await settle();
    expect(router.getCurrentRoute().path).toBe('/users/7');

    router.forward();
    await settle();
    expect(router.getCurrentRoute().path).toBe('/a');
    router.stop();
  });

  it('start() in hash mode reads and follows the hash', async () => {
    browser = installBrowser('https://example.test/app/#/b');
    const router = makeRouter({ mode: 'hash' });

    await router.start();
    expect(router.getCurrentRoute().path).toBe('/b');

    await router.push('/c');
    window.history.back();
    await settle();
    expect(router.getCurrentRoute().path).toBe('/b');
    router.stop();
  });

  it('intercepts clicks on links to registered routes only', async () => {
    const router = makeRouter({ base: '/app' });
    await router.start();
    const root = dom.mount(`
      <nav>
        <a id="user" href="/app/users/9"><span>User 9</span></a>
        <a id="server" href="/app/server-page">Server</a>
        <a id="external" href="https://other.test/app/a">Other</a>
        <a id="blank" href="/app/a" target="_blank">New tab</a>
      </nav>`);

    const userClick = dom.fire(root.querySelector('#user span'), 'click', { button: 0 });
    await settle();
    const others = ['server', 'external', 'blank'].map((id) =>
      dom.fire(root.querySelector(`#${id}`), 'click', { button: 0 }).defaultPrevented
    );

    expect(userClick.defaultPrevented).toBe(true);
    expect(router.getCurrentRoute()).toMatchObject({ path: '/users/9', params: { id: '9' } });
    expect(browser.url()).toBe('https://example.test/app/users/9');
    expect(others).toEqual([false, false, false]);
    router.stop();
  });

  it('stop() detaches the listeners', async () => {
    const router = makeRouter();
    await router.start();

    router.stop();

    expect(dom.window.listenersFor('popstate')).toHaveLength(0);
    expect(dom.document.listenersFor('click')).toHaveLength(0);
  });
});

describe('without start()', () => {
  it('goes back through its own history instead of ping-ponging', async () => {
    const router = makeRouter();
    await router.push('/a');
    await router.push('/b');
    await router.push('/c');

    router.back();
    await settle();
    router.back();
    await settle();
    expect(router.getCurrentRoute().path).toBe('/a');

    router.forward();
    await settle();
    expect(router.getCurrentRoute().path).toBe('/b');
  });
});

describe('concurrent navigations', () => {
  it('lets the last navigation win over a slower earlier one', async () => {
    const router = makeRouter();
    router.addRoute('/slow', {
      component: () => new Promise((resolve) => setTimeout(() => resolve({ div: { text: 'slow' } }), 20)),
    });

    const [slow, fast] = await Promise.all([router.push('/slow'), router.push('/a')]);

    expect([slow, fast]).toEqual([false, true]);
    expect(router.getCurrentRoute().path).toBe('/a');
    expect(browser.entries.map((u) => u.pathname)).toEqual(['/app/', '/a']);
  });

  it('cancels a navigation whose beforeEnter guard returns false', async () => {
    const router = makeRouter();
    router.addRoute('/admin', { component: { div: {} }, beforeEnter: () => false });
    await router.push('/a');

    expect(await router.push('/admin')).toBe(false);
    expect(router.getCurrentRoute().path).toBe('/a');
  });
});
