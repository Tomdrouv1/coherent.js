import { render } from '@coherent.js/core';
import {
  createContextProvider,
  useContext,
  clearAllContexts,
  provideContext,
  restoreContext,
  runWithContext,
  globalStateManager
} from '../src/state-manager.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

/** Run a test body the way a request handler should: in its own scope. */
const inRequest = (fn) => () => runWithContext(fn);

// A fresh element per use: core's renderer rejects the same object instance
// appearing twice in one tree as a circular reference.
const themedButton = () => ({
  button: {
    className: () => `btn-${useContext('theme') || 'default'}`,
    text: 'Click me'
  }
});

/**
 * Minimal asynchronous renderer: calls functions with no arguments like core
 * does, renders arrays in order, and awaits between every node — the
 * interleaving a streaming render exposes context to.
 */
async function renderAsync(node) {
  await tick();
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'function') return renderAsync(node());
  if (Array.isArray(node)) {
    let html = '';
    for (const child of node) html += await renderAsync(child);
    return html;
  }
  const tag = Object.keys(node)[0];
  const { className, children, text } = node[tag];
  const cls = typeof className === 'function' ? className() : className;
  const inner = text ?? (await renderAsync(children));
  return `<${tag}${cls ? ` class="${cls}"` : ''}>${inner}</${tag}>`;
}

describe('createContextProvider with core render()', () => {
  beforeEach(() => clearAllContexts());

  // Core's renderer handed a provider a render callback, took back an HTML
  // string and escaped it: the whole subtree came out as `&lt;button ...`.
  it('renders its children as markup, escaped once', () => {
    const html = render(
      { div: { children: [createContextProvider('theme', 'dark', themedButton())] } },
      { enableCache: false }
    );

    expect(html).toBe('<div><button class="btn-dark">Click me</button></div>');
  });

  it('scopes the value to its children only', () => {
    const html = render(
      {
        div: {
          children: [
            themedButton(),
            createContextProvider('theme', 'dark', themedButton()),
            themedButton()
          ]
        }
      },
      { enableCache: false }
    );

    expect(html).toBe(
      '<div>' +
        '<button class="btn-default">Click me</button>' +
        '<button class="btn-dark">Click me</button>' +
        '<button class="btn-default">Click me</button>' +
        '</div>'
    );
    expect(useContext('theme')).toBeUndefined();
  });

  it('handles nested providers of the same key', () => {
    const app = {
      div: {
        children: [
          createContextProvider('theme', 'dark', {
            section: {
              children: [
                themedButton(),
                createContextProvider('theme', 'light', {
                  div: { children: [themedButton()] }
                }),
                themedButton()
              ]
            }
          })
        ]
      }
    };

    expect(render(app, { enableCache: false })).toBe(
      '<div><section>' +
        '<button class="btn-dark">Click me</button>' +
        '<div><button class="btn-light">Click me</button></div>' +
        '<button class="btn-dark">Click me</button>' +
        '</section></div>'
    );
  });

  it('can be rendered more than once', () => {
    const provider = createContextProvider('theme', 'dark', themedButton());

    const first = render({ main: { children: [provider] } }, { enableCache: false });
    const second = render({ main: { children: [provider] } }, { enableCache: false });

    expect(first).toBe('<main><button class="btn-dark">Click me</button></main>');
    expect(second).toBe(first);
  });
});

describe('context isolation between concurrent requests', () => {
  beforeEach(() => clearAllContexts());

  // provideContext() wrote to one module-level Map, so the handler that
  // resumed last saw whichever request provided last.
  it('keeps each request handler on its own value across awaits', async () => {
    const handleRequest = (user, delay) =>
      runWithContext(async () => {
        provideContext('user', user);
        await tick(delay);
        return useContext('user');
      });

    const seen = await Promise.all([handleRequest('alice', 1), handleRequest('bob', 5)]);

    expect(seen).toEqual(['alice', 'bob']);
  });

  it('isolates runWithContext scopes from each other and from the caller', inRequest(async () => {
    provideContext('user', 'outer');

    const seen = await Promise.all(
      ['alice', 'bob'].map((user, i) =>
        runWithContext(async () => {
          const before = useContext('user');
          provideContext('user', user);
          await tick(i === 0 ? 5 : 1);
          return [before, useContext('user')];
        })
      )
    );

    expect(seen).toEqual([
      [undefined, 'alice'],
      [undefined, 'bob']
    ]);
    expect(useContext('user')).toBe('outer');
    restoreContext('user');
  }));

  it('seeds runWithContext with initial values', () => {
    const seen = runWithContext(() => useContext('locale'), { locale: 'fr' });

    expect(seen).toBe('fr');
    expect(useContext('locale')).toBeUndefined();
  });

  it('keeps provider values across the awaits of interleaved async renders', async () => {
    const page = (theme) => ({
      main: {
        children: [
          createContextProvider('theme', theme, {
            div: { children: [themedButton(), themedButton()] }
          }),
          themedButton()
        ]
      }
    });

    const [red, blue] = await Promise.all([
      runWithContext(() => renderAsync(page('red'))),
      runWithContext(() => renderAsync(page('blue')))
    ]);

    const expected = (theme) =>
      '<main><div>' +
      `<button class="btn-${theme}">Click me</button>` +
      `<button class="btn-${theme}">Click me</button>` +
      '</div><button class="btn-default">Click me</button></main>';
    expect(red).toBe(expected('red'));
    expect(blue).toBe(expected('blue'));
  });

  // The render-callback form restored the previous value in a `finally`
  // before an async callback had resumed.
  it('keeps the value for an async render callback', async () => {
    const provider = createContextProvider('theme', 'dark', 'children');

    const result = await provider(async (children) => {
      await tick(1);
      return `${children}:${useContext('theme')}`;
    });

    expect(result).toBe('children:dark');
    expect(useContext('theme')).toBeUndefined();
  });
});

describe('context without AsyncLocalStorage (browsers)', () => {
  let original;

  beforeEach(() => {
    original = globalThis.process.getBuiltinModule;
    globalThis.process.getBuiltinModule = undefined;
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.process.getBuiltinModule = original;
    vi.resetModules();
  });

  it('scopes providers during a synchronous render', async () => {
    const ctx = await import('../src/state-manager.js');
    const button = () => ({
      button: { className: () => `btn-${ctx.useContext('theme') || 'default'}` }
    });

    const html = render(
      {
        div: {
          children: [
            ctx.createContextProvider('theme', 'dark', {
              p: { children: [button(), ctx.createContextProvider('theme', 'light', button())] }
            }),
            button()
          ]
        }
      },
      { enableCache: false }
    );

    expect(html).toBe(
      '<div><p><button class="btn-dark"></button><button class="btn-light"></button></p>' +
        '<button class="btn-default"></button></div>'
    );
    expect(ctx.useContext('theme')).toBeUndefined();
  });

  it('restores the previous scope after runWithContext', async () => {
    const ctx = await import('../src/state-manager.js');
    ctx.provideContext('theme', 'dark');

    expect(ctx.runWithContext(() => ctx.useContext('theme'), { theme: 'light' })).toBe('light');
    expect(ctx.useContext('theme')).toBe('dark');

    ctx.clearAllContexts();
    expect(ctx.useContext('theme')).toBeUndefined();
  });
});


/**
 * Regression: clearAllContexts() cleared only the undo stacks, never the
 * values. useContext() reads globalState — module-level, so shared by every
 * render in the process — which meant a context provided while rendering one
 * request stayed readable while rendering the next.
 */
describe('clearAllContexts', () => {
  beforeEach(() => {
    clearAllContexts();
    globalStateManager.clear();
  });

  it('removes provided contexts', inRequest(() => {
    provideContext('currentUser', { id: 42 });
    expect(useContext('currentUser')).toEqual({ id: 42 });

    clearAllContexts();

    expect(useContext('currentUser')).toBeUndefined();
  }));

  it('does not leak a context into the next render', inRequest(() => {
    // Render one: an authenticated request.
    provideContext('currentUser', { id: 42, email: 'alice@example.com' });
    clearAllContexts();

    // Render two: a different, anonymous visitor.
    expect(useContext('currentUser')).toBeUndefined();
  }));

  it('clears every provided key, not just the most recent', inRequest(() => {
    provideContext('theme', 'dark');
    provideContext('locale', 'fr');
    provideContext('currentUser', { id: 7 });

    clearAllContexts();

    expect(useContext('theme')).toBeUndefined();
    expect(useContext('locale')).toBeUndefined();
    expect(useContext('currentUser')).toBeUndefined();
  }));

  it('clears nested providers of the same key', inRequest(() => {
    provideContext('theme', 'dark');
    provideContext('theme', 'light');

    clearAllContexts();

    expect(useContext('theme')).toBeUndefined();
  }));

  // What the previous implementation was trying to protect by clearing
  // nothing: globalState holds more than contexts.
  it('leaves unrelated global state alone', inRequest(() => {
    globalStateManager.set('requestId', 'abc-123');
    provideContext('theme', 'dark');

    clearAllContexts();

    expect(globalStateManager.get('requestId')).toBe('abc-123');
    expect(useContext('theme')).toBeUndefined();
  }));

  it('restores a pre-existing value rather than deleting the key', inRequest(() => {
    globalStateManager.set('theme', 'system');
    provideContext('theme', 'dark');
    expect(useContext('theme')).toBe('dark');

    clearAllContexts();

    expect(useContext('theme')).toBe('system');
  }));

  it('leaves restoreContext harmless afterwards', inRequest(() => {
    provideContext('theme', 'dark');
    clearAllContexts();

    // The stack is gone, so this is a no-op rather than resurrecting a value.
    restoreContext('theme');

    expect(useContext('theme')).toBeUndefined();
  }));
});


/**
 * Regression: outside runWithContext() provideContext() used
 * AsyncLocalStorage#enterWith(), which attaches the value to the caller's
 * async context. Node runs every request of a keep-alive connection in the
 * same one, so a value provided while handling one user's request was read by
 * the next request on that socket.
 */
describe('context outside runWithContext() on the server', () => {
  it('throws instead of providing a value that outlives the call', () => {
    expect(() => provideContext('user', 'alice')).toThrow(/runWithContext/);
    expect(useContext('user')).toBeUndefined();
  });

  it('does not carry a value into the next request on a keep-alive connection', async () => {
    const server = http.createServer(async (req, res) => {
      if (req.url === '/login') {
        try {
          provideContext('user', 'alice');
        } catch {
          // the fix: refused outside runWithContext()
        }
      }
      await tick(5);
      res.end(String(useContext('user')));
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    const get = (path) =>
      new Promise((resolve, reject) => {
        http
          .get({ host: '127.0.0.1', port: server.address().port, path, agent }, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve(body));
          })
          .on('error', reject);
      });

    try {
      await get('/login');
      expect(await get('/other')).toBe('undefined');
    } finally {
      agent.destroy();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('lets restoreContext() and clearAllContexts() run when there is nothing to remove', () => {
    expect(() => restoreContext('user')).not.toThrow();
    expect(() => clearAllContexts()).not.toThrow();
  });
});

/**
 * Regression: a provider entered its value with one marker component and left
 * it with another after its children. A child that threw skipped the "leave"
 * marker, so the value stayed current for the rest of the scope (and, outside
 * runWithContext(), for the next request on the connection).
 */
describe('createContextProvider with a throwing child', () => {
  const failing = () => {
    throw new Error('boom');
  };

  it('restores the outer value when rendering fails', inRequest(() => {
    expect(() =>
      render({ div: { children: [createContextProvider('user', 'alice', failing)] } })
    ).toThrow(/boom/);

    expect(useContext('user')).toBeUndefined();
  }));

  it('restores the outer value outside runWithContext()', () => {
    expect(() =>
      render({ div: { children: [createContextProvider('user', 'alice', { p: { children: [failing] } })] } })
    ).toThrow(/boom/);

    expect(useContext('user')).toBeUndefined();
  });

  it('keeps nested providers balanced when an inner child fails', inRequest(() => {
    provideContext('theme', 'outer');
    const tree = createContextProvider('theme', 'dark', {
      section: { children: [createContextProvider('theme', 'light', failing)] }
    });

    expect(() => render({ main: { children: [tree] } })).toThrow(/boom/);

    expect(useContext('theme')).toBe('outer');
  }));
});

describe('createContextProvider subtree evaluation', () => {
  it('evaluates text, html and attribute functions in the context', () => {
    const html = render(
      createContextProvider('theme', 'dark', {
        p: {
          title: () => useContext('theme'),
          text: () => `text-${useContext('theme')}`,
          children: [{ span: { html: () => `<b>${useContext('theme')}</b>` } }]
        }
      })
    );

    expect(html).toBe('<p title="dark">text-dark<span><b>dark</b></span></p>');
  });

  it('never calls event handlers', () => {
    const onclick = vi.fn();
    const html = render(createContextProvider('theme', 'dark', { button: { onclick, text: 'Go' } }));

    expect(onclick).not.toHaveBeenCalled();
    expect(html).toBe('<button>Go</button>');
  });

  it('keeps trusted content markers usable', async () => {
    const { dangerouslySetInnerContent } = await import('@coherent.js/core');
    const html = render(
      createContextProvider('theme', 'dark', { div: { children: [dangerouslySetInnerContent('<i>raw</i>')] } })
    );

    expect(html).toBe('<div><i>raw</i></div>');
  });
});
