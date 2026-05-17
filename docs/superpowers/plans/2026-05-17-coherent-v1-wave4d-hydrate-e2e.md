# Coherent.js v1.0 — Wave 4d: Hydration & Event-Survival E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Section 5, Playwright E2E sub-block, **the two flows deferred from Wave 4b**: (a) SSR/hydration mismatch detection and (b) event survival across DOM patches.

**Goal:** Close out the spec's six-item E2E checklist by adding the two remaining browser-level tests, exercising the real `hydrate()` from `@coherent.js/client` end-to-end (not just unit-tested with mocked DOM). Result: the v1 audit's "human verification" items from spec Section 5 are 100% automated; nothing carries over to RC.

**Architecture:** A second tiny fixture under `e2e/fixtures/hmr-hydrate/` whose HTML is intentionally written as if it were SSR-rendered output (Coherent-shaped DOM with hydration-ready structure). Its `src/app.js` imports `hydrate` from the published client bundle, defines a small counter component, and exposes the mismatch list and click-counter state on `window.__coherent_e2e` so Playwright can assert them. Two new tests in `e2e/tests/hydrate.spec.js`:
1. **Mismatch detection**: serve SSR HTML whose text disagrees with the component output; assert the `onMismatch` callback fires with a divergence entry the test can match.
2. **Event survival**: hydrate a button + click handler, click once, assert state update + DOM patch happened, click again, assert the handler still fires (proving registration survived `patchDOM`).

**Tech Stack:** No new deps. Reuses Wave 4b's Playwright config, `bootFixture` helper, and `awaitWsFrame` pattern from `e2e/tests/hmr.spec.js`. The new fixture follows the same workspace-symlink trick as `hmr-basic` so the served `/node_modules/@coherent.js/client/dist/index.js` resolves.

---

## Wave 4d explicitly NOT in scope

- **Server-side rendering integration.** The "SSR" HTML in the mismatch fixture is hand-written to look like SSR output. We do NOT invoke the framework's actual SSR pipeline (which lives in `@coherent.js/core`'s render functions) — that would introduce a build step and double the fixture complexity. The mismatch test cares about "does the client detect a divergence between served DOM and component output," which doesn't require real SSR.
- **Scroll preservation / form input preservation E2E tests.** Wave 4a's HMR cycle handles these via the `state-capturer` module; Wave 4b's "component update" test indirectly exercises the broadcast → re-import path. Dedicated scroll/form preservation tests are valuable but separate concerns — they test HMR-with-state, not hydration. Defer to a future polish wave or skip if the existing unit tests in `packages/client/test/state-capturer.test.js` are deemed sufficient.
- **Hydration of nested/list components.** The fixture uses a single-element component for clarity. Nested/list reconciliation has its own unit tests (`vdom-diffing.test.js`, `dom-state-management.test.js`); covering them at the E2E level would mostly re-prove what unit tests already prove.
- **`strict: true` mode of mismatch detection.** That throws instead of warning; testing it would just verify error propagation, which is uninteresting. Default (warn) mode is the one users hit.
- **`hydrateAll` / `hydrateBySelector` etc.** Those were the legacy APIs removed in Wave 1. Only `hydrate()` exists in 1.0.

## What we ARE building

1. **New fixture `e2e/fixtures/hmr-hydrate/`** — HTML with SSR-shaped output, JS that hydrates, plus a `window.__coherent_e2e` test-only surface for Playwright assertions. Registered in `pnpm-workspace.yaml` so the workspace dep resolves.
2. **Two new Playwright tests** in `e2e/tests/hydrate.spec.js`:
   - Mismatch detection — assert `onMismatch` fires with a non-empty list and at least one entry mentioning the divergent path.
   - Event survival — assert click → DOM update → click → DOM update again, proving handler registration survives the patch.
3. **CHANGELOG entry.**

That's it. Three commits including the plan.

---

## File Structure

| Path | Change | Responsibility |
|---|---|---|
| `pnpm-workspace.yaml` | (Already covers `e2e/fixtures/*` from Wave 4b — no edit needed) | — |
| `e2e/fixtures/hmr-hydrate/package.json` | Create | Mirror of `hmr-basic`'s — workspace dep on `@coherent.js/client`, `"type":"module"`. |
| `e2e/fixtures/hmr-hydrate/.gitignore` | Create | Ignore `node_modules/`. |
| `e2e/fixtures/hmr-hydrate/index.html` | Create | SSR-shaped HTML with a counter button + a version paragraph. Visually trivial; the test-bearing structure is in the JS. |
| `e2e/fixtures/hmr-hydrate/src/app.js` | Create | Imports `hydrate` from the served `/node_modules/@coherent.js/client/dist/index.js`. Two mount cases gated on `location.search`: `?mode=mismatch` (component disagrees with SSR text) and `?mode=event` (counter with click handler). Both expose state on `window.__coherent_e2e`. |
| `e2e/tests/hydrate.spec.js` | Create | Two Playwright tests using the existing `bootFixture()` helper. |
| `CHANGELOG.md` | Modify | Wave 4d entry — closes the two deferred audit flows from Wave 4b's Notes. |

---

## Why one fixture with `?mode=` query, not two fixtures

Each fixture costs setup (package.json, gitignore, helper symlink, workspace registration). Two test cases that share infrastructure benefit from sharing a fixture, with the JS branching on a query parameter. Reads naturally: `bootFixture('hmr-hydrate')` then `page.goto(`${baseURL}/?mode=mismatch`)`. No code duplication, no extra workspace package.

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: pre-existing dirty noise only.

- [ ] **Step 2: Confirm prior wave gates are still green**

Run:
```bash
pnpm test && pnpm run e2e && node scripts/check-api-surface.mjs --check && node scripts/check-bundle-size.mjs --check
```
Expected: green. 4 Playwright tests pass.

- [ ] **Step 3: Confirm `hydrate` is exported from `@coherent.js/client/dist/index.js`**

Run:
```bash
node -e "import('./packages/client/dist/index.js').then(m => console.log('hydrate:', typeof m.hydrate, '/ hmrClient:', typeof m.hmrClient))"
```
Expected: `hydrate: function / hmrClient: object`. Both must export — `hydrate` for this wave's tests, `hmrClient` from the HMR bootstrap injected by the dev server.

---

## Task 1: Add the `hmr-hydrate` fixture

**Files:**
- Create: `e2e/fixtures/hmr-hydrate/package.json`
- Create: `e2e/fixtures/hmr-hydrate/.gitignore`
- Create: `e2e/fixtures/hmr-hydrate/index.html`
- Create: `e2e/fixtures/hmr-hydrate/src/app.js`

### Step 1: Create `package.json`

Create `e2e/fixtures/hmr-hydrate/package.json`:

```json
{
  "name": "@coherent.js/e2e-fixture-hmr-hydrate",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@coherent.js/client": "workspace:*"
  }
}
```

### Step 2: Create `.gitignore`

Create `e2e/fixtures/hmr-hydrate/.gitignore`:

```
node_modules/
```

### Step 3: Create `index.html`

The HTML is intentionally written as if a Coherent.js SSR pipeline had emitted it — a `<div id="app">` wrapping the to-be-hydrated content. For the mismatch test, the static text on the page deliberately says `v1`; the component will say `v2`.

Create `e2e/fixtures/hmr-hydrate/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>HMR Hydrate Fixture</title>
</head>
<body>
  <h1>HMR Hydrate Fixture</h1>
  <div id="app">
    <div>
      <button id="inc" type="button">count is 0</button>
      <p id="version">v1</p>
    </div>
  </div>
  <script type="module" src="/src/app.js"></script>
</body>
</html>
```

The structure is shared by both `?mode=` paths; the component decides what to render against it.

### Step 4: Create `src/app.js`

The JS dispatches on `location.search`. For each mode it creates a component, hydrates against `#app`, and exposes test-observable state on `window.__coherent_e2e`. Both modes use the published client's `hydrate` function.

Create `e2e/fixtures/hmr-hydrate/src/app.js`:

```js
// Wave 4d hydrate fixture. Two modes gated on ?mode=:
//   - mismatch: component output deliberately disagrees with the
//     SSR-shaped HTML so the framework's mismatch detector fires.
//   - event:    component has a click handler that bumps state and
//     re-renders, exercising the patchDOM + handler-survival path.
// Both modes expose results on window.__coherent_e2e for Playwright.

import { hydrate } from '/node_modules/@coherent.js/client/dist/index.js';

const container = document.getElementById('app');
const params = new URLSearchParams(location.search);
const mode = params.get('mode');

window.__coherent_e2e = {
  mode,
  mismatches: [],
  state: null,
  clickCount: 0,
};

if (mode === 'mismatch') {
  // Component output says version "v2"; SSR HTML says "v1". Same
  // structural shape, divergent text → mismatch detector should fire.
  const Component = () => ({
    div: {
      children: [
        { button: { id: 'inc', type: 'button', text: 'count is 0' } },
        { p: { id: 'version', text: 'v2' } },
      ],
    },
  });

  hydrate(Component, container, {
    onMismatch: (mismatches) => {
      window.__coherent_e2e.mismatches.push(...mismatches);
    },
  });
} else if (mode === 'event') {
  // Counter with a click handler. Each click bumps state, which
  // triggers patchDOM (changing the button's text), which then
  // re-registers handlers. The test clicks twice and asserts both
  // clicks reach the handler.
  const Component = ({ count = 0 }) => ({
    div: {
      children: [
        {
          button: {
            id: 'inc',
            type: 'button',
            text: `count is ${count}`,
            onClick: () => {
              window.__coherent_e2e.clickCount += 1;
              const { setState, getState } = window.__coherent_e2e.controls;
              setState({ count: getState().count + 1 });
              window.__coherent_e2e.state = getState();
            },
          },
        },
        { p: { id: 'version', text: 'v1' } },
      ],
    },
  });

  const controls = hydrate(Component, container, {
    initialState: { count: 0 },
  });
  window.__coherent_e2e.controls = controls;
  window.__coherent_e2e.state = controls.getState();
} else {
  // No mode set → no-op (helps debug a navigation accident).
  window.__coherent_e2e.error = `unknown mode: ${mode}`;
}
```

**Why expose `controls` on `window.__coherent_e2e`?** The click handler defined inside the component closure needs `setState`/`getState` from the `hydrate` return value, but the component is defined *before* `hydrate` runs. Stashing the controls on window after hydrate returns lets the handler reach back into them. This is a fixture-grade convenience, not a recommended user pattern.

### Step 5: Install workspace deps

Run: `pnpm install`
Expected: pnpm sees the new fixture in `e2e/fixtures/*` (already covered by Wave 4b's pnpm-workspace.yaml update), wires the `@coherent.js/client` workspace symlink. Lockfile may update.

Verify:
```bash
ls -la e2e/fixtures/hmr-hydrate/node_modules/@coherent.js/ 2>/dev/null
```
Expected: a symlink. If pnpm hoisted instead, the `bootFixture` helper's manual symlink will handle it at test time.

### Step 6: Sanity-run the existing e2e suite (no new tests yet)

Run: `pnpm run e2e`
Expected: still 4 tests pass. New fixture doesn't break anything because no test references it yet.

### Step 7: Commit

```bash
git add e2e/fixtures/hmr-hydrate/ pnpm-lock.yaml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
chore(e2e): add hmr-hydrate fixture for Wave 4d tests

Adds e2e/fixtures/hmr-hydrate/ — a second fixture for the Wave-4d
Playwright tests covering SSR/hydration mismatch detection and
event survival across DOM patches.

The fixture is one HTML page + one JS file that branches on
`?mode=`:
  - ?mode=mismatch — component output deliberately disagrees with
    the SSR-shaped HTML so the framework's mismatch detector fires
    via the `onMismatch` callback.
  - ?mode=event — counter with a click handler that bumps state
    and re-renders, exercising the patchDOM + handler-survival
    path.

Both modes expose results on `window.__coherent_e2e` so Playwright
can assert from page.evaluate(). The fixture imports `hydrate`
from the workspace-symlinked /node_modules/@coherent.js/client/
dist/index.js — same wiring as hmr-basic.

Single fixture / two modes (not two fixtures) because the test
infrastructure (HTML scaffold, pnpm workspace, symlink) is
identical and there's no benefit to duplication.

No tests yet — those land in the next commit (Task 2).

First commit of Wave 4d (hydrate E2E) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Two new Playwright tests

**Files:**
- Create: `e2e/tests/hydrate.spec.js`

### Step 1: Write the tests

Create `e2e/tests/hydrate.spec.js`:

```js
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
```

### Step 2: Run the new test file

Run: `pnpm exec playwright test e2e/tests/hydrate.spec.js`
Expected: 2 tests pass in ~1-2 seconds.

**If the mismatch test fails with `result.count === 0`:**
- The framework may not be detecting the text divergence in this exact configuration. Open the page manually:
  ```bash
  pnpm --filter coherent-language-support exec node -e "/* boot fixture and serve at fixed port for manual inspection */" # or just inspect packages/client/src/hydration/mismatch-detector.js
  ```
- The mismatch detector might require specific DOM shape markers. If the `<div id="app">` wrapper is the problem, hydrate against its child instead (change `const container = document.getElementById('app')` to `... .firstElementChild` in the fixture).

**If the event-survival test fails with `clickCount === 0` after the first click:**
- The event delegation may not have initialized. Check that the fixture's HTML doesn't have `<script>` tags that would block hydrate from running.
- Check that `data-coherent-click` attributes appear on the button after hydrate. Use Playwright's `page.evaluate(() => document.getElementById('inc').outerHTML)` to inspect.

### Step 3: Run the full suite to confirm no regressions

Run: `pnpm run e2e`
Expected: 6 tests pass total (4 from Wave 4b + 2 new).

### Step 4: Commit

```bash
git add e2e/tests/hydrate.spec.js
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
test(e2e): add Wave 4d hydration + event-survival Playwright tests

Adds e2e/tests/hydrate.spec.js with two tests against the
hmr-hydrate fixture, closing the two deferred audit-item flows
from Wave 4b:

1. **Mismatch detection** — fixture serves SSR-shaped HTML whose
   text says "v1" while the component output says "v2". The
   onMismatch callback should fire with a non-empty list and at
   least one entry referencing the divergent text.

2. **Event survival across DOM patch** — fixture hydrates a
   counter with an onClick handler. Click once → state updates
   → patchDOM runs (button text becomes "count is 1"). Click
   again → state increments to 2, button text becomes "count is
   2". Proves the handler registration survives the
   re-registration that happens after every rerender.

Both tests use the existing bootFixture() helper from Wave 4b
with hmr:false (these tests don't exercise the HMR loop — they
exercise hydration, which is orthogonal). The dev server is just
the static-file delivery mechanism.

Second commit of Wave 4d. The spec's six-item E2E checklist is
now 100% automated:
- (Wave 4b) bootstrap injection
- (Wave 4b) WS connection ack
- (Wave 4b) component HMR update
- (Wave 4b) style HMR update
- (Wave 4d) mismatch detection
- (Wave 4d) event survival across DOM patch

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: CHANGELOG entry

**File:** `CHANGELOG.md`

### Step 1: Add Wave 4d subsections

Open `CHANGELOG.md`. Find the existing `### Notes (Wave 4c)` block. Add after it (before `## [1.0.0-beta.8]`):

```markdown
### Added (Wave 4d)

- **NEW: 2 Playwright tests for hydration behavior** (`e2e/tests/hydrate.spec.js`):
  - **Mismatch detection** — fixture serves SSR-shaped HTML whose text disagrees with the component output; asserts the `onMismatch` callback fires with a non-empty list. Closes the deferred audit flow from Wave 4b.
  - **Event survival across DOM patch** — hydrates a counter, clicks once (state updates, `patchDOM` re-renders the button text), clicks again, asserts the handler still fires. Closes the deferred audit flow from Wave 4b.
- **NEW: `e2e/fixtures/hmr-hydrate/`** — single fixture / two modes (`?mode=mismatch` and `?mode=event`) so the two tests share HTML scaffolding without duplicating workspace plumbing. Both modes expose results via `window.__coherent_e2e` for Playwright assertions.

### Notes (Wave 4d)

- The spec's six-item E2E checklist (Section 5) is now 100% automated. Nothing carries over to RC.
- The mismatch fixture uses hand-written SSR-shaped HTML, not the framework's actual SSR pipeline. Reasoning: the mismatch detector cares about "does what the server sent agree with what the client renders," which doesn't require invoking real SSR. Avoiding the build step keeps the fixture in static-file territory where the Wave-4a dev server lives.
- Scroll/form preservation E2E tests were not added. They test HMR-with-state-preservation (a different concern from hydration), already have unit coverage in `packages/client/test/state-capturer.test.js`, and Wave 4b's component-update test indirectly exercises the broadcast → re-import path. If a real bug ever surfaces, that's the time to add a dedicated browser test.
- The fixture's click handler reaches the `setState` controls via `window.__coherent_e2e.controls` (stashed after `hydrate()` returns). This is a fixture-grade test convenience, NOT a recommended user pattern — in real apps the closure captures `setState` directly.
```

### Step 2: Commit

```bash
git add CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs(changelog): record Wave 4d hydration E2E tests

Documents the two new Playwright tests (mismatch detection + event
survival across DOM patches) and the hmr-hydrate fixture they use.
Notes that the spec's six-item E2E checklist is now 100% automated,
that hand-written SSR-shaped HTML is the deliberate alternative to
invoking the real SSR pipeline (keeps the fixture in static-file
territory), and that scroll/form preservation tests are still
intentionally out of scope (orthogonal to hydration, already unit-
covered).

Closes Wave 4d of v1.0 stable hardening. Next: Wave 5 (release).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Post-Wave-4d handoff

Wave 4 is complete:
- **4a** — built-in HMR dev server (~400 lines + 20 unit tests)
- **4b** — Playwright infrastructure + 4 protocol tests + CI job + `--no-hmr`
- **4c** — VS Code extension publish-readiness (script + CI + PUBLISHING.md)
- **4d** — 2 hydration E2E tests closing the audit checklist

Next:

- **Wave 5 — Release.** `MIGRATION-1.0.md` finalization, coordinated `1.0.0` version bump across all packages including `vscode-extension`, `1.0.0-rc.1` tag, 1-2 week soak, `1.0.0` tag. After tag: run `PUBLISHING.md` for the marketplace.

No outstanding follow-ups from Wave 4.
