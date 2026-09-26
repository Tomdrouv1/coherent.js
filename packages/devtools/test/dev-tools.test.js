/**
 * DevTools
 *
 * Regression coverage for: createDevTools() throwing with no arguments and
 * with the core module namespace (it assigned to the frozen namespace's
 * `render`); an unhandledRejection listener that swallowed rejections (and
 * crashed on reject(undefined)); unbounded warnings/errors; SIGINT hijacked
 * with an immediate process.exit(); `?dev=true` enabling DevTools on any
 * production hostname; a hard-coded ws://localhost:3001 hot-reload socket.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as core from '@coherent.js/core';
import { DevTools, createDevTools } from '../src/dev-tools.js';

const DEVTOOLS_DIR = fileURLToPath(new URL('..', import.meta.url));
const DEV_TOOLS_URL = pathToFileURL(fileURLToPath(new URL('../src/dev-tools.js', import.meta.url))).href;

const instances = [];
function make(...args) {
  const devtools = createDevTools(...args);
  instances.push(devtools);
  return devtools;
}

afterEach(() => {
  while (instances.length) instances.pop().destroy();
  vi.restoreAllMocks();
  delete globalThis.window;
});

/** Run a module snippet in a fresh Node process with DevTools imported. */
function runNode(body) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { DevTools } from ${JSON.stringify(DEV_TOOLS_URL)};
    console.log = () => {};
    ${body}
  `], { cwd: DEVTOOLS_DIR, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'development' }, timeout: 10_000 });
}

describe('createDevTools', () => {
  it('works without a Coherent instance', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => make()).not.toThrow();
    expect(() => make(undefined, { enabled: true })).not.toThrow();
    expect(() => make(undefined, { enabled: true }).render({ div: {} })).toThrow(/needs a Coherent instance/);
  });

  it('wraps the (frozen) core module namespace instead of patching it', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const originalRender = core.render;
    const devtools = make(core, { enabled: true });

    expect(core.render).toBe(originalRender);
    expect(devtools.render({ p: { text: 'hello' } })).toBe('<p>hello</p>');
    expect(devtools.renderHistory).toHaveLength(1);
    expect(devtools.renderHistory[0].outputSize).toBe('<p>hello</p>'.length);
  });

  it('is disabled outside development and then renders without recording', () => {
    const devtools = make(core, { enabled: false });
    expect(devtools.isEnabled).toBe(false);
    expect(devtools.render({ p: { text: 'x' } })).toBe('<p>x</p>');
    expect(devtools.renderHistory).toHaveLength(0);
  });
});

describe('process-level side effects', () => {
  it('installs no SIGINT or unhandledRejection listener by default', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const sigint = process.listenerCount('SIGINT');
    const rejection = process.listenerCount('unhandledRejection');
    make(core, { enabled: true });
    expect(process.listenerCount('SIGINT')).toBe(sigint);
    expect(process.listenerCount('unhandledRejection')).toBe(rejection);
  });

  it('an unhandled rejection still crashes the process with DevTools enabled', () => {
    const result = runNode(`
      new DevTools({ render: () => '' });
      Promise.reject(new Error('should crash'));
      setTimeout(() => console.info('STILL ALIVE'), 200);
    `);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('should crash');
    expect(result.stdout).not.toContain('STILL ALIVE');
  });

  it('trackUnhandledRejections records the rejection and does not swallow it', () => {
    const result = runNode(`
      const dt = new DevTools({ render: () => '' }, { trackUnhandledRejections: true });
      process.on('exit', () => console.info('RECORDED', JSON.stringify(dt.errors.map((e) => e.message))));
      Promise.reject(undefined);
      setTimeout(() => console.info('STILL ALIVE'), 200);
    `);
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('STILL ALIVE');
    expect(result.stderr).toContain('Unhandled promise rejection: undefined');
    expect(result.stderr).not.toContain('TypeError');
    expect(result.stdout).toContain('RECORDED ["undefined"]');
  });
});

describe('bounded history', () => {
  it('caps warnings and errors at maxEntries', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const devtools = make(core, { enabled: true, maxEntries: 5 });

    for (let i = 0; i < 50; i++) console.error(`error ${i}`);
    expect(devtools.errors).toHaveLength(5);
    expect(devtools.errors.at(-1).message).toBe('error 49');

    const huge = { ul: { children: Array.from({ length: 1200 }, (_, i) => ({ li: { text: String(i) } })) } };
    for (let i = 0; i < 20; i++) devtools.render(huge);
    expect(devtools.warnings.length).toBeLessThanOrEqual(5);
    expect(devtools.warnings.some((w) => /High complexity/.test(w.message))).toBe(true);
  });

  it('destroy() restores console.error and removes the global helpers', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const originalError = console.error;
    const devtools = createDevTools(core, { enabled: true });
    expect(console.error).not.toBe(originalError);
    expect(typeof globalThis.$inspect).toBe('function');
    devtools.destroy();
    expect(console.error).toBe(originalError);
    expect(globalThis.$inspect).toBeUndefined();
  });
});

describe('render timing', () => {
  // The render is timed with performance.now(); drive that clock from the
  // render itself so the result does not depend on how fast the machine is.
  function timedDevTools(renderMs) {
    let clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const coherent = {
      render: () => {
        clock += renderMs;
        return '<p>x</p>';
      },
    };
    return make(coherent, { enabled: true });
  }

  const slowWarnings = (devtools) =>
    devtools.warnings.filter((w) => /^Slow render/.test(w.message));

  it('warns about a render slower than 10 ms', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const devtools = timedDevTools(25);
    devtools.render({ p: { text: 'x' } });
    expect(slowWarnings(devtools)).toHaveLength(1);
    expect(slowWarnings(devtools)[0].message).toBe(
      'Slow render detected: 25.00ms'
    );
    expect(devtools.renderHistory.at(-1).renderTime).toBe(25);
  });

  it('does not warn about a render of 10 ms or less', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const devtools = timedDevTools(10);
    devtools.render({ p: { text: 'x' } });
    expect(slowWarnings(devtools)).toHaveLength(0);
  });
});

describe('browser enablement', () => {
  function shouldEnableInBrowser(location) {
    const realProcess = globalThis.process;
    globalThis.window = { location };
    Object.defineProperty(globalThis, 'process', { value: undefined, configurable: true, writable: true });
    try {
      return DevTools.prototype.shouldEnable.call({});
    } finally {
      Object.defineProperty(globalThis, 'process', { value: realProcess, configurable: true, writable: true });
    }
  }

  it('?dev=true does not enable DevTools on a production host', () => {
    expect(shouldEnableInBrowser({ hostname: 'shop.example.com', search: '?dev=true' })).toBe(false);
    expect(shouldEnableInBrowser({ hostname: 'localhost', search: '' })).toBe(true);
    expect(shouldEnableInBrowser({ hostname: '127.0.0.1', search: '' })).toBe(true);
  });

  it('only opens a hot-reload socket to an explicitly configured URL', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const WebSocket = vi.fn(function () { this.close = vi.fn(); });
    globalThis.window = { location: { hostname: 'localhost' }, WebSocket, addEventListener: vi.fn(), removeEventListener: vi.fn() };

    make(core, { enabled: true });
    expect(WebSocket).not.toHaveBeenCalled();

    make(core, { enabled: true, hotReloadUrl: 'ws://localhost:5173/coherent-dev' });
    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:5173/coherent-dev');
  });
});
