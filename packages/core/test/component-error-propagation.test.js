import { describe, it, expect, vi } from 'vitest';
import { render, renderToStream, createErrorBoundary, createAsyncErrorBoundary } from '../src/index.js';

const Boom = () => {
  throw new Error('database unavailable');
};

describe('errors thrown by function components', () => {
  it('propagate out of render() with the component path and cause', () => {
    let caught;
    try {
      render({ main: { children: [{ p: { text: 'before' } }, Boom, { p: { text: 'after' } }] } });
    } catch (error) {
      caught = error;
    }

    // It used to render <main><p>before</p><p>after</p></main> with no signal.
    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toBe('database unavailable');
    expect(caught.renderPath).toBe('root.main.children[1]');
    expect(caught.cause).toBeInstanceOf(Error);
    expect(caught.cause.message).toBe('database unavailable');
  });

  it('can be replaced through the onError option', () => {
    const onError = vi.fn(() => ({ p: { className: 'error', text: 'unavailable' } }));
    const html = render({ main: { children: [Boom, { p: { text: 'after' } }] } }, { onError });

    expect(html).toBe('<main><p class="error">unavailable</p><p>after</p></main>');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'database unavailable' }), { path: 'root.main.children[0]' });
  });

  it('can be omitted by returning null from onError', () => {
    expect(render({ main: { children: [Boom, { p: { text: 'after' } }] } }, { onError: () => null }))
      .toBe('<main><p>after</p></main>');
  });

  // Regression: for an element whose content is a function (`{ div: Boom }`)
  // the replacement was rendered as that element's props, so the fallback
  // came out as `<div p="[object Object]"></div>`.
  it('replaces the whole element when its content function throws', () => {
    const onError = vi.fn(() => ({ p: { className: 'error', text: 'unavailable' } }));
    const tree = { main: { children: [{ div: Boom }, { p: { text: 'after' } }] } };

    expect(render(tree, { onError })).toBe('<main><p class="error">unavailable</p><p>after</p></main>');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'database unavailable' }), { path: 'root.main.children[0].div' });
    expect(render(tree, { onError: () => null })).toBe('<main><p>after</p></main>');
  });

  it('replaces the whole element when streaming, too', async () => {
    const tree = { main: { children: [{ div: Boom }, { p: { text: 'after' } }] } };
    let html = '';
    for await (const chunk of renderToStream(tree, { onError: () => ({ p: { text: 'unavailable' } }) })) html += chunk;

    expect(html).toBe('<main><p>unavailable</p><p>after</p></main>');
  });
});

describe('error boundaries on the server', () => {
  it('catch errors from nested function components', () => {
    const Inner = () => ({ span: { children: [Boom] } });
    const Outer = () => ({ section: { children: [{ h2: { text: 'Title' } }, Inner] } });
    const Safe = createErrorBoundary({ fallback: { div: { text: 'fallback' } } })(Outer);

    expect(render(Safe())).toBe('<div>fallback</div>');
  });

  it('render each call independently', () => {
    const Profile = ({ user }) => {
      if (!user) throw new Error('no user');
      return { p: { text: user.name } };
    };
    const onError = vi.fn();
    const Safe = createErrorBoundary({ fallback: { p: { text: 'fallback' } }, onError })(Profile);

    expect(render(Safe({ user: null, ssn: '123-45-6789' }))).toBe('<p>fallback</p>');
    // One failed request used to switch every later request to the fallback.
    expect(render(Safe({ user: { name: 'Ada' } }))).toBe('<p>Ada</p>');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('leave no timer behind in async boundaries', async () => {
    vi.useFakeTimers();
    try {
      const Safe = createAsyncErrorBoundary({ timeout: 10_000 })(async () => ({ p: { text: 'ok' } }));

      await expect(Safe()).resolves.toEqual({ p: { text: 'ok' } });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
