/**
 * HMR regressions:
 * - a module without an accept handler got no update and no reload (the
 *   fallback imported a hydration module that no longer exists);
 * - disconnect() still scheduled a reconnect from the socket's close event;
 * - each overlay show() added a keydown listener that hide() removed once;
 * - radios of one group collapsed onto one captured key, wiping the choice;
 * - tracked fetch replaced the caller's AbortSignal;
 * - the ./hmr subpath threw on import.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HMRClient } from '../../src/hmr/client.js';
import { ErrorOverlay } from '../../src/hmr/overlay.js';
import { StateCapturer } from '../../src/hmr/state-capturer.js';
import { CleanupTracker } from '../../src/hmr/cleanup-tracker.js';
import { moduleTracker } from '../../src/hmr/module-tracker.js';
import { installDom } from '../helpers/dom.js';

let dom;

beforeEach(() => {
  dom = installDom();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  dom.uninstall();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('HMRClient updates', () => {
  it('reloads the page for a module that does not accept hot updates', async () => {
    const client = new HMRClient();
    client.importModule = vi.fn(async () => ({ default: {} }));
    client.reload = vi.fn();

    await client.handleUpdate({ webPath: '/components/Plain.js' });

    expect(client.importModule).toHaveBeenCalledWith(expect.stringMatching(/^\/components\/Plain\.js\?t=\d+$/));
    expect(client.reload).toHaveBeenCalledTimes(1);
  });

  it('applies the update in place for a module that accepts it', async () => {
    const client = new HMRClient();
    const accepted = vi.fn();
    const newModule = { default: { v: 2 } };
    moduleTracker.createHotContext('/components/Hot.js').accept(accepted);
    client.importModule = vi.fn(async () => newModule);
    client.reload = vi.fn();

    await client.handleUpdate({ webPath: '/components/Hot.js' });

    expect(accepted).toHaveBeenCalledWith(newModule);
    expect(client.reload).not.toHaveBeenCalled();
  });
});

describe('HMRClient.disconnect()', () => {
  it('does not reconnect when the closed socket reports its close', () => {
    vi.useFakeTimers();
    const sockets = [];
    class FakeWebSocket {
      constructor(url) {
        this.url = url;
        this.listeners = {};
        sockets.push(this);
      }
      addEventListener(type, handler) {
        (this.listeners[type] ??= []).push(handler);
      }
      send() {}
      close() {
        for (const handler of this.listeners.close ?? []) handler({});
      }
    }
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:3000', reload: vi.fn() });

    const client = new HMRClient();
    client.connect();
    client.disconnect();
    vi.advanceTimersByTime(60_000);

    expect(sockets).toHaveLength(1);
    expect(client.reconnectTimeout).toBeNull();
  });
});

describe('ErrorOverlay', () => {
  it('keeps a single Escape listener however often it is shown', () => {
    const overlay = new ErrorOverlay();

    overlay.show({ message: 'first' });
    overlay.show({ message: 'second' });
    overlay.show({ message: 'third' });
    expect(dom.document.listenersFor('keydown')).toHaveLength(1);

    overlay.hide();
    expect(dom.document.listenersFor('keydown')).toHaveLength(0);
  });
});

describe('StateCapturer', () => {
  const form = (checked) => `
    <form>
      <input type="radio" name="size" value="s"${checked === 's' ? ' checked' : ''}>
      <input type="radio" name="size" value="m"${checked === 'm' ? ' checked' : ''}>
      <input type="radio" name="size" value="l"${checked === 'l' ? ' checked' : ''}>
      <input type="checkbox" name="extras" value="cheese">
      <input type="checkbox" name="extras" value="bacon">
    </form>`;

  it('restores the selected radio of a group and each checkbox of a group', () => {
    const capturer = new StateCapturer();
    const root = dom.mount(form('s'));
    root.querySelector('[value="m"]').checked = true;
    root.querySelector('[value="bacon"]').checked = true;

    capturer.captureFormState();
    // HMR re-renders the form with its server defaults
    const fresh = dom.mount(form('s'));
    capturer.restoreFormState();

    const checked = fresh.querySelectorAll('input').filter((input) => input.checked).map((input) => input.value);
    expect(checked).toEqual(['m', 'bacon']);
  });
});

describe('CleanupTracker fetch', () => {
  it("keeps the caller's AbortSignal and still aborts on cleanup", async () => {
    const received = [];
    vi.stubGlobal('fetch', vi.fn((_url, options) => {
      received.push(options.signal);
      return new Promise(() => {});
    }));
    const tracker = new CleanupTracker();
    const ctx = tracker.createContext('mod');

    const caller = new AbortController();
    ctx.fetch('/api/a', { signal: caller.signal, method: 'POST' });
    ctx.fetch('/api/b');
    caller.abort(new Error('user cancelled'));

    expect(received[0].aborted).toBe(true);
    expect(received[0].reason.message).toBe('user cancelled');
    expect(received[1].aborted).toBe(false);

    tracker.cleanup('mod');
    expect(received[1].aborted).toBe(true);
  });
});

describe('@coherent.js/client/hmr entry point', () => {
  it('exports the HMR API instead of throwing', async () => {
    const hmr = await import('../../src/hmr.js');

    expect(hmr.hmrClient).toBeInstanceOf(HMRClient);
    expect(typeof hmr.createHotContext).toBe('function');
    expect(hmr.escapeHtml('<b>')).toBe('&lt;b&gt;');
  });
});
