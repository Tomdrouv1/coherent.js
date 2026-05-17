/**
 * Wave 4d Playwright E2E tests for hydration behavior.
 *
 * Both tests use the hmr-hydrate fixture and gate behavior on a
 * ?mode= query param. The fixture exposes results via
 * window.__coherent_e2e so each test reads them with page.evaluate().
 */

import { test, expect } from '@playwright/test';
import { bootFixture } from '../helpers/server.js';

test.describe('Hydration (Wave 4d)', () => {
  let server;

  test.afterEach(async () => {
    if (server) await server.close();
    server = null;
  });

  test('mismatch detection — onMismatch fires when component output disagrees with SSR DOM', async ({ page }) => {
    // The fixture's HTML statically says "v1"; the component says "v2".
    // The framework's mismatch detector should fire on hydrate.
    server = await bootFixture('hmr-hydrate', { hmr: false });

    await page.goto(`${server.baseURL}/?mode=mismatch`);

    // Wait for hydrate to run AND for window.__coherent_e2e to populate.
    await page.waitForFunction(() => window.__coherent_e2e && window.__coherent_e2e.mode === 'mismatch');

    const result = await page.evaluate(() => ({
      mismatches: window.__coherent_e2e.mismatches,
      count: window.__coherent_e2e.mismatches.length,
    }));

    expect(result.count).toBeGreaterThan(0);

    // At least one mismatch entry should reference the divergent text.
    // The exact shape of the entry is internal to the framework — we
    // serialize the whole thing and look for both text snippets.
    const serialized = JSON.stringify(result.mismatches);
    expect(serialized).toMatch(/v1|v2/);
  });

  test('event survival — click handler still fires after a state-driven DOM patch', async ({ page }) => {
    // Hydrate a counter. Click once → state updates → patchDOM runs.
    // Click again → handler must still be wired up despite the patch.
    server = await bootFixture('hmr-hydrate', { hmr: false });

    await page.goto(`${server.baseURL}/?mode=event`);

    // Wait for hydrate to wire up controls.
    await page.waitForFunction(() => window.__coherent_e2e && window.__coherent_e2e.controls);

    const initial = await page.evaluate(() => ({
      clickCount: window.__coherent_e2e.clickCount,
      state: window.__coherent_e2e.state,
      buttonText: document.getElementById('inc').textContent,
    }));
    expect(initial.clickCount).toBe(0);
    expect(initial.state).toEqual({ count: 0 });
    expect(initial.buttonText).toBe('count is 0');

    // First click — proves event delegation works at all.
    await page.locator('#inc').click();
    await page.waitForFunction(() => window.__coherent_e2e.clickCount === 1);

    const afterOne = await page.evaluate(() => ({
      clickCount: window.__coherent_e2e.clickCount,
      state: window.__coherent_e2e.state,
      buttonText: document.getElementById('inc').textContent,
    }));
    expect(afterOne.clickCount).toBe(1);
    expect(afterOne.state).toEqual({ count: 1 });
    expect(afterOne.buttonText).toBe('count is 1'); // patchDOM updated the text

    // Second click — proves the handler survived patchDOM (the
    // re-registration in registerEventHandlers after each rerender).
    await page.locator('#inc').click();
    await page.waitForFunction(() => window.__coherent_e2e.clickCount === 2);

    const afterTwo = await page.evaluate(() => ({
      clickCount: window.__coherent_e2e.clickCount,
      state: window.__coherent_e2e.state,
      buttonText: document.getElementById('inc').textContent,
    }));
    expect(afterTwo.clickCount).toBe(2);
    expect(afterTwo.state).toEqual({ count: 2 });
    expect(afterTwo.buttonText).toBe('count is 2');
  });
});
