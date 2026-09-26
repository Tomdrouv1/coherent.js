/**
 * Wave 4b Playwright E2E tests for the Coherent HMR dev server.
 *
 * Each test boots a fresh dev server against a tmp copy of the
 * hmr-basic fixture, navigates Chromium to it, and asserts on
 * either the served HTML, the WebSocket frames the page receives,
 * or both.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bootFixture } from '../helpers/server.js';

/** Frames each captured WebSocket has received so far, parsed. */
const receivedFrames = new WeakMap();

/**
 * Wait for a WS frame matching `predicate` on a WebSocket captured by
 * gotoAndCaptureWs(). Frames that already arrived count: the 'connected'
 * ack can land before page.goto() resolves, and a listener attached only
 * after that missed it and timed out.
 *
 * @param {import('@playwright/test').WebSocket} ws - captured Playwright WS
 * @param {(data: object) => boolean} predicate
 * @param {number} timeoutMs
 * @returns {Promise<object>} the parsed frame payload
 */
function waitForFrame(ws, predicate, timeoutMs = 8_000) {
  const frames = receivedFrames.get(ws);
  const seen = frames.list.find(predicate);
  if (seen) return Promise.resolve(seen);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      frames.waiters.delete(check);
      reject(new Error(`timeout waiting for WS frame after ${timeoutMs}ms`));
    }, timeoutMs);

    function check(data) {
      if (!predicate(data)) return;
      clearTimeout(timer);
      frames.waiters.delete(check);
      resolve(data);
    }
    frames.waiters.add(check);
  });
}

/**
 * Navigate to `url` and return the Playwright WebSocket object for the HMR
 * connection. Its frames are recorded from the moment the socket opens, so
 * the 'connected' ack that arrives right after the handshake is never
 * missed, whether or not goto() has resolved yet.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 * @returns {Promise<import('@playwright/test').WebSocket>}
 */
async function gotoAndCaptureWs(page, url) {
  const wsPromise = new Promise((resolve) => {
    page.once('websocket', (ws) => {
      const frames = { list: [], waiters: new Set() };
      receivedFrames.set(ws, frames);
      ws.on('framereceived', ({ payload }) => {
        let data;
        try {
          data = JSON.parse(typeof payload === 'string' ? payload : payload.toString('utf8'));
        } catch {
          return;
        }
        frames.list.push(data);
        for (const waiter of [...frames.waiters]) waiter(data);
      });
      resolve(ws);
    });
  });
  await page.goto(url);
  return wsPromise;
}

test.describe('HMR dev server (Wave 4b)', () => {
  let server;

  test.afterEach(async () => {
    if (server) await server.close();
    server = null;
  });

  test('bootstrap script injection — served HTML contains the HMR client tag and the bootstrap responds JS', async ({ page }) => {
    server = await bootFixture('hmr-basic');

    const htmlRes = await page.request.get(`${server.baseURL}/`);
    expect(htmlRes.status()).toBe(200);
    const html = await htmlRes.text();
    expect(html).toMatch(/<script[^>]+src="\/__coherent_hmr_client\.js"/);

    const bootRes = await page.request.get(`${server.baseURL}/__coherent_hmr_client.js`);
    expect(bootRes.status()).toBe(200);
    const bootText = await bootRes.text();
    expect(bootRes.headers()['content-type']).toMatch(/javascript/);
    expect(bootText).toContain('hmrClient');
    expect(bootText).toContain('initialize');
  });

  test('connection ack — browser receives {type:"connected"} over WebSocket', async ({ page }) => {
    server = await bootFixture('hmr-basic');

    const ws = await gotoAndCaptureWs(page, `${server.baseURL}/`);
    const frame = await waitForFrame(ws, (d) => d.type === 'connected');
    expect(frame).toMatchObject({ type: 'connected' });

    // Sanity: the fixture app rendered.
    await expect(page.locator('#inc')).toBeVisible();
    await expect(page.locator('#version')).toHaveText('v1');
  });

  test('component update — touching src/app.js fires {type:"hmr-update", updateType:"component"} reaching the browser', async ({ page }) => {
    server = await bootFixture('hmr-basic');

    const ws = await gotoAndCaptureWs(page, `${server.baseURL}/`);

    // Wait for the connected ack before touching files — otherwise
    // the update message can race the connection.
    await waitForFrame(ws, (d) => d.type === 'connected');

    // Set up waiter before mutating the file.
    const updatePromise = waitForFrame(ws, (d) => d.type === 'hmr-update');

    const appPath = join(server.root, 'src', 'app.js');
    const original = readFileSync(appPath, 'utf8');
    writeFileSync(appPath, original.replace("'v1'", "'v2'"));

    const frame = await updatePromise;
    expect(frame.type).toBe('hmr-update');
    expect(frame.webPath).toBe('/src/app.js');
    expect(frame.updateType).toBe('component');
    expect(frame.filePath).toContain('app.js');
  });

  test('style update — touching styles.css fires {type:"hmr-update", updateType:"style"}', async ({ page }) => {
    server = await bootFixture('hmr-basic');

    const ws = await gotoAndCaptureWs(page, `${server.baseURL}/`);
    await waitForFrame(ws, (d) => d.type === 'connected');

    const updatePromise = waitForFrame(ws, (d) => d.type === 'hmr-update');

    const cssPath = join(server.root, 'styles.css');
    const original = readFileSync(cssPath, 'utf8');
    writeFileSync(cssPath, original + '\n/* touched */\n');

    const frame = await updatePromise;
    expect(frame.webPath).toBe('/styles.css');
    expect(frame.updateType).toBe('style');
  });
});
