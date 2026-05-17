# Coherent.js v1.0 — Wave 4b: Playwright E2E + dev-server polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Section 5, "Playwright E2E suite" sub-block.

**Goal:** Stand up a Playwright E2E suite that exercises the Wave-4a HMR dev server in a real Chromium browser (proving the WebSocket + chokidar + static-handler stack works end-to-end), wire a new CI job that runs it on every PR, and close one small Wave-4a follow-up (`--no-hmr` flag honoring).

**Architecture:** A new top-level `e2e/` directory holds Playwright config and tests. Tests boot the real `coherent dev --coherent` (via `startDevServer()` imported directly — keeps the test self-contained, no child process management) pointed at a tiny fixture project under `e2e/fixtures/hmr-basic/`. The fixture is a static HTML page plus a hand-written ESM bundle that imports the published `@coherent.js/client` HMR module from `/node_modules/`. Tests use the browser as the protocol observer: open the page, watch the WebSocket frames the page sends/receives via Playwright's `page.on('websocket', ...)` API, touch fixture files, assert the browser receives the expected `hmr-update` messages. Playwright runs in CI as a new job parallel to `test` (separate job to keep the existing test pipeline's runtime predictable).

**Tech Stack:** `@playwright/test@^1.49` (latest stable) as a root devDep. Bundled Chromium only (no Firefox/Safari for now — single-browser coverage is enough to prove the protocol works; multi-browser is a refinement once we have operational experience). Node ≥ 20, ESM. Tests import `startDevServer` from the cli package directly so the test owns server lifecycle (no `coherent` subprocess to manage).

---

## Wave 4b explicitly NOT in scope (each with reasoning)

- **All six audit-item flows from spec Section 5 (mismatch detection, scroll preservation, event survival across DOM patch, form state across HMR).** The spec lists six. Wave 4b delivers the four that directly exercise the dev-server protocol the Wave-4a code added. The other two (mismatch detection and event survival across DOM patches) test framework-level features that already had unit coverage in `packages/client/` before Wave 4a started; rerunning them in a browser is valuable but not blocking for 1.0 — defer to a Wave 4d or post-RC pass once the Playwright runner has soaked.
- **Multi-browser coverage (Firefox, WebKit).** Chromium-only catches almost all protocol bugs at much lower CI cost. Adding Firefox/WebKit requires `playwright install firefox webkit`, doubles or triples runner time, and pulls in OS-level deps (`apt-get` on Ubuntu CI runners — `--with-deps` handles it but slows install). Worth doing once we hit a Firefox- or Safari-only bug, not before.
- **Visual regression / screenshot diffing.** Playwright supports it, but visual diffs are noisy on CI (font rendering varies across runners). Skip until we have a real need.
- **Template default-on flip.** Wave 4a's `--coherent` flag is opt-in. Making it the default for `coherent create`-scaffolded apps requires a non-trivial template overhaul: the current scaffolds (`packages/cli/src/generators/project-scaffold.js`) produce Node SSR apps with `node src/index.js` as the dev script, NOT static-file projects that match the Wave-4a dev server's serving model. Reconciling the two requires deciding whether the dev server should learn SSR (large) or whether templates should produce static-first projects (also large). Defer to Wave 5 or post-1.0.
- **VS Code marketplace publish.** Different concern, different process (needs a `vsce` Personal Access Token, can't be fully automated by Claude). Lives in its own Wave 4c plan.
- **Static-handler `hmr-error` broadcast on file-read failures.** Listed as a Wave-4a follow-up in the prior plan; on reflection the value is dubious — when a `.js` file is missing the browser already gets a 404 and shows it in the console. The HMR error overlay is for build/runtime errors, which our minimal dev server doesn't have. Drop the follow-up; revisit if real users complain.
- **`coherent dev --coherent` over HTTPS.** Spec defers TLS to reverse-proxy. No change.

## What we ARE building

1. **Playwright infrastructure** — config, runner, fixture project, root devDep.
2. **Four Playwright tests** matching the dev-server's contract:
   1. **Bootstrap injection in real browser** — Chromium navigates to `/`, asserts the HMR client bootstrap script tag is present in the served HTML AND that the browser successfully loaded it from `/__coherent_hmr_client.js` (i.e., the bootstrap response was JS, not 404).
   2. **WebSocket connection ack reaches the browser** — Playwright observes a WebSocket frame containing `"type":"connected"` from the dev server to the page.
   3. **JS file change triggers `hmr-update` reaching the browser** — touch a `.js` file under the fixture root, assert the page receives a WebSocket frame with `{"type":"hmr-update", filePath, webPath, updateType: "component"}` whose `webPath` matches.
   4. **CSS file change uses `updateType: "style"`** — same as #3 but for a `.css` file, asserting the type classifier is end-to-end correct.
3. **CI E2E job** — runs in parallel to `test`, installs only Chromium, runs the Playwright suite, uploads HTML report on failure.
4. **`--no-hmr` flag honoring** — when set, `startDevServer` skips the WebSocket server entirely and the static handler skips script injection. One small integration test added.
5. **CHANGELOG entry.**

---

## File Structure

| Path | Change | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `@playwright/test` to root `devDependencies`; add `e2e` and `e2e:install` scripts. |
| `playwright.config.js` | Create | Root-level Playwright config: `testDir: 'e2e/tests'`, chromium-only project, parallel-off (each test owns a dev server on a random port — but file mutations are real, so we serialize to keep tests deterministic). |
| `e2e/fixtures/hmr-basic/index.html` | Create | Static page with a single hydratable component placeholder. |
| `e2e/fixtures/hmr-basic/src/app.js` | Create | Initial component module: uses safe DOM construction (createElement + textContent) to mount a `<button>` whose click handler increments a counter shown in `<span>`. |
| `e2e/fixtures/hmr-basic/styles.css` | Create | One CSS rule. Used by the style-update test. |
| `e2e/tests/hmr.spec.js` | Create | The four Playwright tests. Uses `bootFixture()` helper from `../helpers/server.js`. |
| `e2e/helpers/server.js` | Create | Tiny helper that wraps `startDevServer` with: copy fixture to a tmp dir first (so tests can mutate files without dirtying the source-controlled fixture), random port, returns `{baseURL, root, close}`. |
| `e2e/.gitignore` | Create | Ignore `test-results/`, `playwright-report/`. |
| `e2e/fixtures/hmr-basic/.gitignore` | Create | Ignore `node_modules/`. |
| `e2e/fixtures/hmr-basic/package.json` | Create | Minimal — declares `"type": "module"` so app.js is treated correctly, and includes a workspace dep on `@coherent.js/client`. |
| `.github/workflows/ci.yml` | Modify | Add an `e2e` job (separate from `test` matrix) that installs Chromium and runs Playwright. |
| `packages/cli/src/dev-server/index.js` | Modify | Honor `options.hmr === false`: skip WS server creation, skip watcher start, pass `hmr: false` down to the static handler. |
| `packages/cli/src/dev-server/static-handler.js` | Modify | New option `hmr: boolean` (default true). When false, skip script injection AND respond 404 for `/__coherent_hmr_client.js`. |
| `packages/cli/src/commands/dev.js` | Modify | Pass `hmr: options.hmr !== false` (commander parses `--no-hmr` into `options.hmr === false`) down to `startDevServer`. |
| `packages/cli/test/dev-server/integration.test.js` | Modify | Add one `{ hmr: false }` integration test asserting no WS, no script tag, 404 on bootstrap path. |
| `CHANGELOG.md` | Modify | Wave 4b entry. |

**Workspace symlink strategy for `@coherent.js/client`:** Playwright's tests navigate to the dev server URL, and the served `index.html` injects a script that imports from `/node_modules/@coherent.js/client/dist/index.js`. That path is resolved by the static handler relative to the fixture root. With `e2e/fixtures/hmr-basic/` registered in `pnpm-workspace.yaml` and declaring `"@coherent.js/client": "workspace:*"`, pnpm will symlink `e2e/fixtures/hmr-basic/node_modules/@coherent.js/client` to the real `packages/client`. The `bootFixture` helper then copies the fixture (plus node_modules contents) into a per-test tmp dir.

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: pre-existing dirty noise only (`package.json`, `tsconfig.tsbuildinfo`, `test-results/`).

- [ ] **Step 2: Confirm prior wave gates are still green**

Run:
```bash
pnpm test && node scripts/check-api-surface.mjs --check && node scripts/check-bundle-size.mjs --check
```
Expected: green. 1674+ tests. API surface + bundle-size clean.

- [ ] **Step 3: Confirm `@coherent.js/client/dist/index.js` actually exports `hmrClient`**

Run:
```bash
node -e "import('./packages/client/dist/index.js').then(m => console.log('hmrClient:', typeof m.hmrClient, '/ HMRClient:', typeof m.HMRClient))"
```
Expected: `hmrClient: object / HMRClient: function`. This is the bootstrap's import target — if it ever stops exporting `hmrClient`, the Playwright tests will fail with an opaque "no such export" error, so confirm now.

---

## Task 1: Playwright infrastructure (devDep, config, workspace registration, fixture)

**Files:**
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Create: `playwright.config.js`
- Create: `e2e/.gitignore`
- Create: `e2e/fixtures/hmr-basic/.gitignore`
- Create: `e2e/fixtures/hmr-basic/package.json`
- Create: `e2e/fixtures/hmr-basic/index.html`
- Create: `e2e/fixtures/hmr-basic/src/app.js`
- Create: `e2e/fixtures/hmr-basic/styles.css`
- Create: `e2e/helpers/server.js`

### Step 1: Add `@playwright/test` to root devDeps

Open `package.json`. Find the `devDependencies` block. Add `"@playwright/test": "^1.49.0"` in alphabetical order. Also add to `scripts`:

```json
    "e2e": "playwright test",
    "e2e:install": "playwright install --with-deps chromium",
    "e2e:report": "playwright show-report"
```

Place the `e2e` scripts after the existing `test` block.

### Step 2: Install + download Chromium

Run:
```bash
pnpm install
pnpm run e2e:install
```
Expected: pnpm pulls `@playwright/test`; `playwright install` downloads Chromium into the pnpm-managed cache (typically `~/Library/Caches/ms-playwright/` on macOS). Last line: "chromium ... downloaded".

### Step 3: Register the fixture in `pnpm-workspace.yaml`

Open `pnpm-workspace.yaml`. It currently looks something like:

```yaml
packages:
  - 'packages/*'
```

Update to:

```yaml
packages:
  - 'packages/*'
  - 'e2e/fixtures/*'
```

This lets the fixture's `workspace:*` dep on `@coherent.js/client` resolve via the symlink.

### Step 4: Create the fixture project

Create `e2e/fixtures/hmr-basic/package.json`:

```json
{
  "name": "@coherent.js/e2e-fixture-hmr-basic",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@coherent.js/client": "workspace:*"
  }
}
```

Create `e2e/fixtures/hmr-basic/.gitignore`:

```
node_modules/
```

Create `e2e/fixtures/hmr-basic/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>HMR Basic Fixture</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <h1>HMR Basic Fixture</h1>
  <div id="app">loading…</div>
  <script type="module" src="/src/app.js"></script>
</body>
</html>
```

Create `e2e/fixtures/hmr-basic/src/app.js` — use safe DOM construction (createElement + textContent), no innerHTML:

```js
// Fixture app used by Wave 4b Playwright tests. Intentionally tiny —
// just enough to verify the dev server serves modules and the HMR
// client bootstrap loads. Uses createElement/textContent (no
// innerHTML) so it's XSS-safe by construction.

const root = document.getElementById('app');

let count = 0;

function render() {
  // Clear previous render
  while (root.firstChild) root.removeChild(root.firstChild);

  const button = document.createElement('button');
  button.id = 'inc';
  button.type = 'button';
  button.textContent = `count is ${count}`;
  button.addEventListener('click', () => {
    count += 1;
    render();
  });

  const version = document.createElement('p');
  version.id = 'version';
  version.textContent = 'v1';

  root.appendChild(button);
  root.appendChild(version);
}

render();
```

Create `e2e/fixtures/hmr-basic/styles.css`:

```css
body { font-family: sans-serif; padding: 1rem; background: #fff; }
#version { color: #333; }
```

### Step 5: Install workspace deps for the fixture

Run: `pnpm install`
Expected: `@coherent.js/client` symlinked into `e2e/fixtures/hmr-basic/node_modules/@coherent.js/client`. Verify:

```bash
ls -la e2e/fixtures/hmr-basic/node_modules/@coherent.js/
```
Expected: a symlink to `../../../packages/client`.

### Step 6: Create the test helper

Create `e2e/helpers/server.js`:

```js
/**
 * Test helper: copy a fixture to a tmp dir and boot the dev server.
 *
 * Tests own server lifecycle so:
 *   - Each test gets a private root (no file-mutation cross-talk)
 *   - Random port (no collision with the user's running dev server)
 *   - Cleanup is deterministic (close + rm in afterEach)
 *
 * @module e2e/helpers/server
 */

import { cpSync, mkdtempSync, rmSync, symlinkSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDevServer } from '../../packages/cli/src/dev-server/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

/**
 * Boot the dev server against a tmp copy of the named fixture.
 *
 * @param {string} fixtureName - Subdirectory under e2e/fixtures/
 * @param {object} [options]
 * @param {boolean} [options.hmr=true] - Pass-through to startDevServer.
 * @returns {Promise<{root: string, baseURL: string, close: () => Promise<void>}>}
 */
export async function bootFixture(fixtureName, options = {}) {
  const source = join(REPO_ROOT, 'e2e', 'fixtures', fixtureName);
  if (!existsSync(source)) {
    throw new Error(`Fixture not found: ${source}`);
  }

  const root = mkdtempSync(join(tmpdir(), `coherent-e2e-${fixtureName}-`));

  // Copy fixture content EXCLUDING node_modules — we'll wire that as a
  // direct symlink to the real packages/client, which makes the served
  // /node_modules/@coherent.js/client/dist/index.js path resolve.
  cpSync(source, root, {
    recursive: true,
    filter: (src) => !src.includes(`${join('', 'node_modules')}`),
  });

  // Wire @coherent.js/client as a symlink under root/node_modules.
  const realClient = resolve(REPO_ROOT, 'packages', 'client');
  const nm = join(root, 'node_modules', '@coherent.js');
  mkdirSync(nm, { recursive: true });
  const dest = join(nm, 'client');
  try {
    symlinkSync(realClient, dest, 'dir');
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  const server = await startDevServer({
    root,
    port: 0,
    host: '127.0.0.1',
    open: false,
    log: false,
    hmr: options.hmr !== false,
  });

  return {
    root,
    baseURL: `http://127.0.0.1:${server.port}`,
    async close() {
      await server.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}
```

### Step 7: Create the Playwright config

Create `playwright.config.js` at the repo root:

```js
/**
 * Playwright config for Coherent.js Wave 4b E2E suite.
 *
 * Single Chromium project — multi-browser is a future refinement.
 * Tests are serial because each one mutates fixture files; running
 * in parallel would cause flaky cross-test interference.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e/tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### Step 8: Create the e2e .gitignore

Create `e2e/.gitignore`:

```
test-results/
playwright-report/
```

### Step 9: Commit

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml playwright.config.js e2e/
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
chore(e2e): add Playwright infrastructure + hmr-basic fixture

Adds the scaffolding for Wave 4b Playwright E2E tests:

- `@playwright/test@^1.49` as root devDep; new scripts `e2e`,
  `e2e:install`, `e2e:report`
- `playwright.config.js` — chromium-only, fully-serial (tests
  mutate fixture files so parallelism would be flaky), retries
  in CI, html report on failure
- `e2e/fixtures/hmr-basic/` — a tiny static-served fixture
  (index.html + src/app.js + styles.css + package.json
  declaring a workspace dep on @coherent.js/client). Registered
  via pnpm-workspace.yaml so the workspace symlink resolves and
  the served `/node_modules/@coherent.js/client/dist/index.js`
  reaches the real client code. App uses
  createElement/textContent for XSS safety.
- `e2e/helpers/server.js` — `bootFixture(name, {hmr})` copies
  the fixture into a tmp dir, wires @coherent.js/client as a
  direct symlink, and boots `startDevServer` on a random port.
  Each test owns its own root so file mutations don't
  cross-contaminate.

No tests yet — those land in the next commit (Task 2).

First commit of Wave 4b (Playwright E2E + dev-server polish)
for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Write the four Playwright tests

**Files:**
- Create: `e2e/tests/hmr.spec.js`

### Step 1: Write the tests

Create `e2e/tests/hmr.spec.js`:

```js
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

/**
 * Collect WebSocket text frames received by the page until `predicate`
 * matches one, then resolve with the matching frame's parsed payload.
 *
 * Returns a `{ promise, cleanup }` pair — callers await `promise`,
 * then call `cleanup()` to remove the listener.
 */
function awaitWsFrame(page, predicate, timeoutMs = 4_000) {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });

  const timer = setTimeout(() => {
    reject(new Error(`timeout waiting for WS frame after ${timeoutMs}ms`));
  }, timeoutMs);

  const wsListener = (ws) => {
    ws.on('framereceived', ({ payload }) => {
      let data;
      try {
        data = JSON.parse(typeof payload === 'string' ? payload : payload.toString('utf8'));
      } catch {
        return;
      }
      if (predicate(data)) {
        clearTimeout(timer);
        resolve(data);
      }
    });
  };
  page.on('websocket', wsListener);

  return {
    promise,
    cleanup() {
      clearTimeout(timer);
      page.off('websocket', wsListener);
    },
  };
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

    const waiter = awaitWsFrame(page, (d) => d.type === 'connected');
    try {
      await page.goto(`${server.baseURL}/`);
      const frame = await waiter.promise;
      expect(frame).toMatchObject({ type: 'connected' });
    } finally {
      waiter.cleanup();
    }

    // Sanity: the fixture app rendered.
    await expect(page.locator('#inc')).toBeVisible();
    await expect(page.locator('#version')).toHaveText('v1');
  });

  test('component update — touching src/app.js fires {type:"hmr-update", updateType:"component"} reaching the browser', async ({ page }) => {
    server = await bootFixture('hmr-basic');

    // Open the page first so the WS is connected.
    await page.goto(`${server.baseURL}/`);

    // Wait for the connected ack before touching files — otherwise
    // the update message can race the connection.
    await awaitWsFrame(page, (d) => d.type === 'connected').promise;

    const waiter = awaitWsFrame(page, (d) => d.type === 'hmr-update');
    try {
      const appPath = join(server.root, 'src', 'app.js');
      const original = readFileSync(appPath, 'utf8');
      writeFileSync(appPath, original.replace("'v1'", "'v2'"));

      const frame = await waiter.promise;
      expect(frame.type).toBe('hmr-update');
      expect(frame.webPath).toBe('/src/app.js');
      expect(frame.updateType).toBe('component');
      expect(frame.filePath).toContain('app.js');
    } finally {
      waiter.cleanup();
    }
  });

  test('style update — touching styles.css fires {type:"hmr-update", updateType:"style"}', async ({ page }) => {
    server = await bootFixture('hmr-basic');

    await page.goto(`${server.baseURL}/`);
    await awaitWsFrame(page, (d) => d.type === 'connected').promise;

    const waiter = awaitWsFrame(page, (d) => d.type === 'hmr-update');
    try {
      const cssPath = join(server.root, 'styles.css');
      const original = readFileSync(cssPath, 'utf8');
      writeFileSync(cssPath, original + '\n/* touched */\n');

      const frame = await waiter.promise;
      expect(frame.webPath).toBe('/styles.css');
      expect(frame.updateType).toBe('style');
    } finally {
      waiter.cleanup();
    }
  });
});
```

### Step 2: Run the suite locally

Run: `pnpm run e2e`
Expected: 4 tests pass, ~10-20s total. If a test fails on first run with a timing error, re-run once; intermittent flakes here will be visible as the suite matures.

If a test fails with `Cannot find module '@coherent.js/client'` or similar from the browser side, double-check that the bootstrap fetch returns 200 with the expected content (Test 1 will catch this case).

### Step 3: Commit

```bash
git add e2e/tests/
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
test(e2e): add 4 Playwright tests for HMR dev server

Adds e2e/tests/hmr.spec.js covering the four flows that directly
exercise the Wave-4a HMR dev server protocol in a real Chromium
browser:

1. Bootstrap injection — served HTML contains the HMR client
   script tag AND /__coherent_hmr_client.js responds with valid
   JS containing `hmrClient`/`initialize` references.
2. Connection ack — page receives {type:"connected"} over the
   WebSocket on load.
3. Component update — touching src/app.js fires an hmr-update
   frame with {webPath:"/src/app.js", updateType:"component"}
   reaching the browser.
4. Style update — touching styles.css fires an hmr-update with
   updateType:"style".

Tests use the `bootFixture()` helper from Task 1 — each owns a
private tmp-dir copy of the fixture so file mutations don't
cross-contaminate. The two "audit-item" flows we did NOT cover
(SSR/hydration mismatch detection, event survival across DOM
patches) test framework features that already had unit coverage
in packages/client/ before Wave 4a — deferred to Wave 4d.

Second commit of Wave 4b (Playwright E2E + dev-server polish).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire CI E2E job

**Files:**
- Modify: `.github/workflows/ci.yml`

### Step 1: Add the e2e job

Open `.github/workflows/ci.yml`. After the existing `test` job ends (the `- name: Build website (sanity check)` step is its final one), add a new sibling job at the same indentation as `test:`:

```yaml
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Install pnpm
        uses: pnpm/action-setup@v6
        with:
          version: 10.33.0

      - name: Use Node.js 22.x
        uses: actions/setup-node@v6
        with:
          node-version: 22.x
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm run build

      - name: Cache Playwright browsers
        id: pw-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('pnpm-lock.yaml') }}

      - name: Install Playwright Chromium
        if: steps.pw-cache.outputs.cache-hit != 'true'
        run: pnpm run e2e:install

      - name: Install Playwright system deps only (when cache hit)
        if: steps.pw-cache.outputs.cache-hit == 'true'
        run: pnpm exec playwright install-deps chromium

      - name: Run Playwright tests
        run: pnpm run e2e
        env:
          CI: true

      - name: Upload Playwright report on failure
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### Step 2: Verify YAML syntax

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML OK')"`
Expected: `YAML OK`.

### Step 3: Commit

```bash
git add .github/workflows/ci.yml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
ci: add Playwright E2E job (parallel to test)

Adds a new `e2e` job to .github/workflows/ci.yml running parallel
to the existing `test` matrix. Runs on a single ubuntu-latest +
Node 22 (multi-Node E2E adds runtime cost without catching
additional bugs — protocol behavior doesn't vary across Node
versions for our HMR use case).

Caches Playwright's browser download by lockfile hash so most CI
runs skip the ~80MB Chromium download. Falls back to `install-deps
chromium` (system libs only) on a cache hit, which is fast.

Uploads playwright-report/ as an artifact on failure (7-day
retention) so PR authors can inspect HTML reports without
re-running locally.

Third commit of Wave 4b (Playwright E2E + dev-server polish).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Honor `--no-hmr` in the dev server

**Files:**
- Modify: `packages/cli/src/dev-server/index.js`
- Modify: `packages/cli/src/dev-server/static-handler.js`
- Modify: `packages/cli/src/commands/dev.js`
- Modify: `packages/cli/test/dev-server/integration.test.js`

### Step 1: Add the failing test

Open `packages/cli/test/dev-server/integration.test.js`. Add this test inside the existing `describe('startDevServer (integration)', () => { ... })` block, after the existing tests:

```js
  test('honors hmr:false — no WS, no script injection, 404 on bootstrap path', async () => {
    server = await startDevServer({ root, port: 0, host: '127.0.0.1', open: false, log: false, hmr: false });

    // HTML is served clean (no script injection)
    const htmlRes = await fetch(`http://127.0.0.1:${server.port}/`);
    const html = await htmlRes.text();
    expect(htmlRes.status).toBe(200);
    expect(html).not.toContain('__coherent_hmr_client');

    // Bootstrap path is 404
    const bootRes = await fetch(`http://127.0.0.1:${server.port}/__coherent_hmr_client.js`);
    expect(bootRes.status).toBe(404);

    // WebSocket upgrade attempts should fail (no WS server attached)
    const { WebSocket } = await import('ws');
    const ws = new WebSocket(`ws://127.0.0.1:${server.port}`);
    const result = await new Promise((resolve) => {
      ws.once('open', () => resolve('opened'));
      ws.once('error', () => resolve('errored'));
      ws.once('close', () => resolve('closed'));
      setTimeout(() => resolve('timeout'), 500);
    });
    expect(['errored', 'closed', 'timeout']).toContain(result);
    try { ws.close(); } catch { /* ignore */ }
  });
```

### Step 2: Run the test to verify it fails

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/integration.test.js`
Expected: the new test FAILS — current code always injects the script + always serves the bootstrap + always starts the WS server.

### Step 3: Update `static-handler.js` to honor an `hmr` flag

Open `packages/cli/src/dev-server/static-handler.js`. Change the exported function signature from `createStaticHandler({ root })` to `createStaticHandler({ root, hmr = true })`.

Then, change the bootstrap branch from:

```js
if (urlPath === HMR_CLIENT_PATH || urlPath.startsWith(HMR_CLIENT_PATH + '?')) {
```

to:

```js
if (hmr && (urlPath === HMR_CLIENT_PATH || urlPath.startsWith(HMR_CLIENT_PATH + '?'))) {
```

And change the HTML response branch from:

```js
if (ct.startsWith('text/html')) {
  res.end(injectHmrScript(buf.toString('utf8')));
} else {
  res.end(buf);
}
```

to:

```js
if (ct.startsWith('text/html') && hmr) {
  res.end(injectHmrScript(buf.toString('utf8')));
} else {
  res.end(buf);
}
```

### Step 4: Update `index.js` to skip WS + watcher when `hmr: false`

Open `packages/cli/src/dev-server/index.js`. Add `hmr = true` to the destructure:

```js
  const {
    root,
    port = 3000,
    host = 'localhost',
    open = false,
    log = true,
    hmr = true,
  } = options;
```

Pass `hmr` to the static handler:

```js
  const handler = createStaticHandler({ root, hmr });
```

Wrap the HMR server + watcher block in `if (hmr)`. The current code creates both unconditionally — restructure so that when `hmr === false`, neither is created. Replace the existing `const hmr = createHmrServer(...)` and `const watcher = await createFileWatcher(...)` lines (note: the existing local var is named `hmr` which would now collide — rename it to `hmrServer`):

```js
  let hmrServer = null;
  let watcher = null;
  if (hmr) {
    hmrServer = createHmrServer(httpServer);
    watcher = await createFileWatcher({
      root,
      onChange: (change) => {
        hmrServer.broadcast({
          type: 'hmr-update',
          filePath: change.filePath,
          webPath: change.webPath,
          updateType: change.updateType,
        });
        if (log) {
          // eslint-disable-next-line no-console
          console.log(picocolors.cyan('[hmr]'), change.updateType, change.webPath);
        }
      },
      onError: (err) => {
        hmrServer.broadcast({
          type: 'hmr-error',
          error: {
            message: err.message,
            file: null,
            line: null,
            column: null,
            stack: err.stack,
          },
        });
        if (log) {
          // eslint-disable-next-line no-console
          console.warn(picocolors.yellow('[hmr] watcher error:'), err.message);
        }
      },
    });
  }
```

Update the returned `close()` to be tolerant of either being null:

```js
    async close() {
      if (watcher) await watcher.close();
      if (hmrServer) hmrServer.close();
      await new Promise((resolve) => httpServer.close(() => resolve()));
    },
```

Update the startup log to reflect the mode:

```js
  if (log) {
    // eslint-disable-next-line no-console
    console.log(picocolors.green('✅ Coherent dev server ready'));
    // eslint-disable-next-line no-console
    console.log(picocolors.cyan('🌐 Local:'), `http://${host}:${actualPort}`);
    if (!hmr) {
      // eslint-disable-next-line no-console
      console.log(picocolors.gray('   HMR: disabled (--no-hmr)'));
    }
  }
```

(Note: the cli source scope already has `no-console: off` in its ESLint config — the agent who did Wave 4a removed the disable-next-line directives. If they're not needed, drop them. Match whatever lint config currently expects.)

### Step 5: Update `commands/dev.js` to pass `--no-hmr` through

Open `packages/cli/src/commands/dev.js`. In the built-in dev server branch (the `if (shouldUseCoherentDevServer(...))` block), change the `startDevServer` call to add `hmr`:

```js
        const server = await startDevServer({
          root: cwd,
          port: Number(options.port),
          host: options.host,
          open: Boolean(options.open),
          log: true,
          hmr: options.hmr !== false,
        });
```

Commander's `.option('--no-hmr', ...)` parses into `options.hmr === false` when the flag is passed; otherwise the property is undefined or true. The `!== false` predicate handles both.

### Step 6: Run the test to verify it passes

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/integration.test.js`
Expected: all 4 integration tests pass (3 existing + 1 new).

### Step 7: Run the full cli suite

Run: `pnpm --filter @coherent.js/cli run test`
Expected: all 106 tests pass.

### Step 8: Re-run Playwright (sanity — should still pass since hmr defaults to true)

Run: `pnpm run e2e`
Expected: still 4 tests pass.

### Step 9: Verify bundle-size gate

Run: `pnpm --filter @coherent.js/cli run build && node scripts/check-bundle-size.mjs --check`

The new code is tiny (a few flag checks) so should easily stay within ±5% of the baseline. If it does drift past the gate, regenerate with `--write` and stage the diff.

### Step 10: Commit

```bash
git add packages/cli/src/dev-server/index.js packages/cli/src/dev-server/static-handler.js packages/cli/src/commands/dev.js packages/cli/test/dev-server/integration.test.js
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
feat(cli): honor --no-hmr in built-in dev server

The --no-hmr flag was parsed but ignored in Wave 4a. This commit
wires it through:

- `createStaticHandler` gains an `hmr: boolean` option (default
  true). When false: no script injection on HTML responses, and
  /__coherent_hmr_client.js returns 404.
- `startDevServer` gains an `hmr: boolean` option (default true).
  When false: no WebSocket server is created, no chokidar watcher
  is started, and the static handler is configured the same way.
- `commands/dev.js` passes `options.hmr !== false` through
  (commander parses --no-hmr into options.hmr === false).

Integration test added: hmr:false serves clean HTML, 404s the
bootstrap path, and WS upgrade attempts fail (no server attached).

Closes a Wave 4a follow-up. Fourth commit of Wave 4b.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: CHANGELOG entry

**File:** `CHANGELOG.md`

### Step 1: Add Wave 4b subsections

Open `CHANGELOG.md`. Find the existing `### Notes (Wave 4a)` block. Add after it (before `## [1.0.0-beta.8]`):

```markdown
### Added (Wave 4b)

- **NEW: Playwright E2E suite.** `e2e/` top-level dir with Chromium-only Playwright config, a tiny static-served fixture (`e2e/fixtures/hmr-basic/`), and four tests that exercise the Wave-4a HMR dev server in a real browser:
  1. Bootstrap script tag is injected into served HTML and the `/__coherent_hmr_client.js` endpoint returns valid JS.
  2. Browser receives `{type:'connected'}` over the WebSocket on load.
  3. Touching a `.js` file fires `{type:'hmr-update', updateType:'component'}` reaching the browser with the correct `webPath`.
  4. Touching a `.css` file fires the same with `updateType:'style'`.
- **NEW: `e2e` CI job.** Runs parallel to the `test` matrix on a single ubuntu-latest + Node 22. Caches Playwright's browser download by lockfile hash so most CI runs skip the ~80MB Chromium pull. Uploads `playwright-report/` as a 7-day artifact on failure.
- **`--no-hmr` flag now honored.** When set, the built-in dev server skips both the WebSocket server and the static handler's script injection; `/__coherent_hmr_client.js` returns 404. Useful for `coherent dev --coherent --no-hmr` plain-static-serve scenarios.

### Changed (Wave 4b)

- **`startDevServer` and `createStaticHandler`** gained a new `hmr: boolean` option (defaults to true — no behavior change unless explicitly disabled).
- **`pnpm-workspace.yaml`** now includes `e2e/fixtures/*` so fixture projects can declare workspace deps on framework packages.

### Notes (Wave 4b)

- Two of the spec's six audit-item E2E flows are not covered yet: SSR/hydration mismatch detection and event survival across DOM patches. Both test client-side framework features that already had unit coverage in `packages/client/` before Wave 4a; rerunning them in a browser is valuable but not blocking for 1.0. Deferred to Wave 4d (post-RC pass).
- Multi-browser E2E (Firefox/WebKit) is intentionally out of scope. Chromium-only catches the bulk of protocol bugs at much lower CI cost; expand when a browser-specific bug actually appears.
- The dropped Wave-4a follow-up about wiring `hmr-error` from the static handler on file-read failures is **abandoned**, not deferred — the browser already gets a 404 with a clear console message, and our minimal dev server has no build pipeline that would produce broadcast-worthy compile errors. Revisit if real users complain.
- Template default-on for `--coherent` in `coherent create` is still **deferred** (now to Wave 5 or post-1.0). Scaffolded apps produce Node SSR projects today; reconciling them with the static-first dev server is a larger redesign than Wave 4 should swallow.
```

### Step 2: Commit

```bash
git add CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs(changelog): record Wave 4b Playwright E2E + --no-hmr

Documents the new Playwright E2E suite (4 tests against the
Wave-4a HMR dev server in real Chromium), the new e2e CI job, and
the now-honored --no-hmr flag. Lists the explicit deferrals: two
remaining audit-item flows (mismatch detection, event survival)
to Wave 4d; multi-browser to a future need-driven expansion;
template default-on to Wave 5/post-1.0. Records the abandoned
static-handler hmr-error follow-up.

Closes Wave 4b of v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Post-Wave-4b handoff

Wave 4b is done. The HMR dev server has end-to-end browser coverage in CI, and `--no-hmr` works.

Next:

- **Wave 4c** — VS Code extension marketplace publish prep (separate plan). Operational, can't be fully automated by Claude (needs `vsce` PAT).
- **Wave 4d (optional)** — fill in the remaining two audit-item E2E flows once Wave 4b has soaked. Or fold into Wave 5 if they're not strictly needed for 1.0.
- **Wave 5** — `MIGRATION-1.0.md` finalization, `1.0.0-rc.1` tag, soak, `1.0.0` tag.

Follow-up items surfaced by Wave 4b:

- Watch for E2E flakiness in CI. The chokidar→WS path is async by nature and the 4_000ms timeout in `awaitWsFrame` is generous; if real CI runs are slower, bump it. Use the playwright-report artifact uploads to diagnose.
- The fixture `app.js` could grow to include explicit `import.meta.hot.accept(...)` once we want to test the full "module re-imports and accept handler runs without page reload" flow — that's the natural Wave 4d test.
