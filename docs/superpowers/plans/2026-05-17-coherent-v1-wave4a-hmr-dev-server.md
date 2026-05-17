# Coherent.js v1.0 — Wave 4a: HMR Dev Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Section 5 (HMR dev server), specifically the **dev server side**. Playwright E2E is Wave 4b.

**Goal:** Wire the `coherent dev` command to a built-in HTTP + WebSocket dev server with `chokidar` file-watching that broadcasts `{type, filePath, webPath}` HMR messages matching the protocol the existing client (`packages/client/src/hmr/client.js`) already implements. Opt-in via `--coherent` flag (or auto-detected `coherent.config.js`); existing vite/webpack/nodemon fallback behavior is preserved for backward compatibility.

**Architecture:** A new `packages/cli/src/dev-server/` subdirectory holds three focused modules: `hmr-server.js` (WebSocket + broadcast helpers), `file-watcher.js` (chokidar wrapper that maps absolute file paths → `{filePath, webPath, updateType}` messages), and `index.js` (orchestrator that ties an HTTP static server, the WebSocket server, and the file watcher together via a `startDevServer(options)` entry point). `commands/dev.js` adds a `--coherent` flag and a `coherent.config.js` autodetect; when either matches, it calls `startDevServer()` instead of delegating to vite/webpack/nodemon. The HTTP server serves the project root as static files (sufficient for the in-tree examples and scaffolded apps; full SSR routing is out of scope). Compile / module-load errors caught while serving JavaScript files broadcast as `{type: 'hmr-error', error: {...}}` to drive the client's existing overlay.

**Tech Stack:** `ws@^8.20.0` and `chokidar@^5.0.0` (already root devDeps; promoted to direct `dependencies` of `@coherent.js/cli`). ESM, Node ≥ 20. No other new deps.

---

## Wave 4a explicitly NOT in scope (each with reasoning)

- **Playwright E2E suite (the second half of spec Section 5).** Separate concern, separate CI job, separate dep. Belongs in Wave 4b. The dev server is a prerequisite, so it has to land first regardless.
- **Making the built-in server the default for scaffolded apps.** Templates (`packages/cli/src/templates/`, scaffolders in `packages/cli/src/generators/`) currently produce projects with `npm run dev` scripts. Switching the default would invalidate template tests and force a template-update wave. Wave 4a keeps the existing routing logic and adds the built-in server as opt-in. Wave 4b can flip the default once templates are updated.
- **VS Code extension marketplace publish (the third half of spec Section 5).** Independent operational task; doesn't share code with the dev-server. Keep it as its own focused Wave 4c (or fold into Wave 5 release).
- **Full SSR routing / framework integration.** The dev server's HTTP layer is intentionally minimal — static file serving plus an injected HMR client `<script>` tag for `.html` responses. Integrating with Express/Fastify/Koa/Next/etc. happens via the existing `@coherent.js/integrations` package in user code, not via the dev server. Keep the dev server's surface small and predictable.
- **HTTPS / TLS support.** `wss://` is selected by the client when `location.protocol === 'https:'`, but the built-in dev server only listens on plain HTTP. HTTPS is a configuration concern for production deployments, not local dev. The client's protocol-detection logic still works — when a user runs the server behind their own reverse proxy with TLS, the client picks `wss` automatically. No code change needed here.
- **Module dependency graph / accept-handler routing.** The client already has a `moduleTracker` that decides whether a given module can hot-update. The server just broadcasts the change; the client handles graph traversal. No server-side dep graph is needed for the protocol.
- **Bundling / transformation pipeline.** No esbuild, no swc, no on-the-fly compilation. Files are served verbatim. Users who need JSX or TypeScript already use vite/webpack via the existing dev paths.

## Protocol contract (from client code, verbatim)

The HMR client at `packages/client/src/hmr/client.js` switches on `data.type` (lines 227-254). The server must emit messages in this shape:

| Server-to-client `type` | Payload | Client behavior |
|---|---|---|
| `connected` | `{type: 'connected'}` | Connection ack |
| `hmr-update` (alias: `hmr-component-update`) | `{type, filePath, webPath, updateType?}` | Re-import module at `webPath \|\| filePath`, restore state |
| `hmr-full-reload` (alias: `reload`) | `{type}` | `location.reload()` |
| `hmr-error` | `{type, error: {message, file, line, column, stack}}` | Show overlay |

`filePath` is the absolute path on the server's filesystem (for log/debug visibility). `webPath` is the URL-relative path the browser uses to re-import (e.g., `/src/components/Button.js`). When both are present the client prefers `webPath` (see `client.js:274`). For Wave 4a we emit both — `filePath` as the absolute path, `webPath` as the path relative to the project root with a leading `/`.

The client also sends `{type: 'connected'}` back on open (line 145) and the `moduleTracker` may forward invalidation messages — the server can ignore unrecognized client→server messages for now.

---

## File Structure

| Path | Change | Responsibility |
|---|---|---|
| `packages/cli/src/dev-server/index.js` | Create | `startDevServer(options)` entry. Creates HTTP server, WebSocket server, file watcher; wires them; returns `{close()}` for graceful shutdown. ~120 lines. |
| `packages/cli/src/dev-server/hmr-server.js` | Create | `createHmrServer(httpServer)` returns `{broadcast(msg), close()}`. Wraps `ws` `WebSocketServer`, attaches to the HTTP upgrade event, tracks connected clients, sends `{type: 'connected'}` on open, drops dead sockets. ~80 lines. |
| `packages/cli/src/dev-server/file-watcher.js` | Create | `createFileWatcher({root, onChange, onError, ignored})`. Wraps `chokidar.watch`, debounces rapid events (50ms), classifies change → `updateType` ('component' / 'style' / 'asset'), builds `{filePath, webPath, updateType}` payload. ~90 lines. |
| `packages/cli/src/dev-server/static-handler.js` | Create | Tiny zero-dep static file handler. Maps URL → file under `root`, sets MIME by extension (the few we care about), 404s otherwise. For `.html` responses, injects `<script src="/__coherent_hmr_client.js"></script>` before `</body>` if not already present. Also serves the `/__coherent_hmr_client.js` endpoint (returns a tiny bootstrap that imports `@coherent.js/client/hmr` and calls `hmrClient.initialize()`). ~110 lines. |
| `packages/cli/src/commands/dev.js` | Modify | Add `--coherent` flag. Add `coherent.config.js` autodetect. When either matches, call `startDevServer({root, port, host, open})` instead of delegating. Keep all existing branches untouched. |
| `packages/cli/package.json` | Modify | Promote `ws` and `chokidar` from root `devDependencies` to direct `dependencies` of `@coherent.js/cli`. |
| `packages/cli/test/dev-server/hmr-server.test.js` | Create | Unit test: instantiate, connect a `ws` client, assert `connected` ack received; `broadcast()` reaches all clients; `close()` rejects new connections and drops existing ones. |
| `packages/cli/test/dev-server/file-watcher.test.js` | Create | Unit test: create temp dir, watch it, write a file, assert `onChange` fires with correct `{filePath, webPath, updateType}` once (debounced); ignored-paths excluded. |
| `packages/cli/test/dev-server/integration.test.js` | Create | Integration test: start the full dev server on a random port, serve a temp project, connect a `ws` client, touch a `.js` file, assert a `hmr-update` message arrives with the correct `webPath`. |
| `packages/cli/bundle-size.json` | Modify | Regenerate after rebuild — dev-server code adds bytes. Expected to stay within ±5% since `ws`/`chokidar` stay external in the esbuild config. |
| `packages/cli/api-surface.txt` | No change expected | Dev-server modules are internal; only the existing top-level `devCommand` (already snapshotted) is exposed via the CLI. |
| `CHANGELOG.md` | Modify | Wave 4a entry. |

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: only the pre-existing dirty noise from prior waves — `package.json` (root, edited by `pnpm install`), `packages/*/tsconfig.tsbuildinfo`, untracked `test-results/` directories. Do not touch those files.

- [ ] **Step 2: Confirm prior wave gates are still green**

Run:
```bash
pnpm clean && pnpm install && pnpm build && pnpm test && node scripts/check-api-surface.mjs --check && node scripts/check-bundle-size.mjs --check
```
Expected: all green. Wave 3a (API surface) and Wave 3b (bundle size) gates must pass before we layer Wave 4a on top.

- [ ] **Step 3: Confirm `ws` and `chokidar` are reachable from the cli workspace**

Run:
```bash
node -e "import('ws').then(m=>console.log('ws ok', typeof m.WebSocketServer))"
node -e "import('chokidar').then(m=>console.log('chokidar ok', typeof m.watch))"
```
Expected: `ws ok function` and `chokidar ok function`. (Both currently resolve because they're root devDeps. Task 1 promotes them to cli `dependencies` so they keep resolving for end-users of the published cli package.)

---

## Task 1: Promote `ws` and `chokidar` to cli dependencies

**Files:**
- Modify: `packages/cli/package.json`

### Step 1: Add the dependencies

Open `packages/cli/package.json`. Find the `"dependencies"` block (currently lines 46-52):

```json
  "dependencies": {
    "commander": "^12.1.0",
    "glob": "11.1.0",
    "ora": "^8.2.0",
    "picocolors": "^1.1.1",
    "prompts": "^2.4.2"
  },
```

Replace with (alphabetical, preserving the existing entries):

```json
  "dependencies": {
    "chokidar": "5.0.0",
    "commander": "^12.1.0",
    "glob": "11.1.0",
    "ora": "^8.2.0",
    "picocolors": "^1.1.1",
    "prompts": "^2.4.2",
    "ws": "8.20.0"
  },
```

Versions match what's already pinned in the root `package.json` devDeps — keep them aligned so we don't pull two versions into the install tree.

### Step 2: Install and verify the lockfile updates

Run: `pnpm install`
Expected: `pnpm-lock.yaml` updates to record `@coherent.js/cli` now declaring these deps. No errors.

### Step 3: Verify the cli can still build and existing tests still pass

Run: `pnpm --filter @coherent.js/cli run build && pnpm --filter @coherent.js/cli run test`
Expected: build succeeds; all current cli tests pass.

### Step 4: Verify the bundle-size gate is still satisfied

The new deps are kept external by `packages/cli/build.mjs` (they're not in its `external` array right now — we need to add them so they don't get bundled into `dist/index.js` and inflate the gz size).

Open `packages/cli/build.mjs`. Find the `external` array (around line 27):

```js
    'commander', 'inquirer', 'chalk', 'ora', 'fs-extra', 'picocolors', 'prompts'
```

Replace with:

```js
    'commander', 'inquirer', 'chalk', 'ora', 'fs-extra', 'picocolors', 'prompts',
    // Wave 4a HMR dev-server deps — kept external so they don't inflate dist/index.js
    'ws', 'chokidar'
```

Run: `pnpm --filter @coherent.js/cli run build && node scripts/check-bundle-size.mjs --check`
Expected: cli's `dist/index.js` size unchanged (Task 1 didn't import them yet); gate passes.

### Step 5: Commit

```bash
git add packages/cli/package.json packages/cli/build.mjs pnpm-lock.yaml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
chore(cli): promote ws + chokidar to direct deps for HMR dev server

Adds `ws@8.20.0` and `chokidar@5.0.0` (versions match the root
devDeps so the install tree stays single-version) as direct
`dependencies` of @coherent.js/cli. They become runtime deps when
the Wave 4a HMR dev server lands in the next commit.

Also marks both as `external` in packages/cli/build.mjs so they
stay out of the bundled `dist/index.js` — keeps the bundle-size
gate satisfied and lets end-users dedupe across packages.

No behavior change yet. Prep commit for Wave 4a.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Implement the WebSocket HMR server

**Files:**
- Create: `packages/cli/src/dev-server/hmr-server.js`
- Create: `packages/cli/test/dev-server/hmr-server.test.js`

### Step 1: Write the failing test

Create `packages/cli/test/dev-server/hmr-server.test.js`:

```js
/**
 * HMR WebSocket server tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';
import { createHmrServer } from '../../src/dev-server/hmr-server.js';

/**
 * Spin up an HTTP server on a random port + attach the HMR server.
 * Returns helpers that wait for events deterministically.
 */
async function startTestServer() {
  const httpServer = createServer((_req, res) => {
    res.statusCode = 404;
    res.end('not found');
  });
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address();
  const hmr = createHmrServer(httpServer);
  return {
    port,
    hmr,
    url: `ws://127.0.0.1:${port}`,
    async stop() {
      hmr.close();
      await new Promise((resolve) => httpServer.close(resolve));
    },
  };
}

function waitForMessage(ws, predicate, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeListener('message', onMessage);
      reject(new Error(`timeout waiting for message after ${timeoutMs}ms`));
    }, timeoutMs);

    function onMessage(buf) {
      let data;
      try {
        data = JSON.parse(buf.toString());
      } catch {
        return;
      }
      if (predicate(data)) {
        clearTimeout(timer);
        ws.removeListener('message', onMessage);
        resolve(data);
      }
    }

    ws.on('message', onMessage);
  });
}

function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

describe('createHmrServer', () => {
  let server;

  beforeEach(async () => {
    server = await startTestServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  test('sends {type: "connected"} ack on client connect', async () => {
    const client = new WebSocket(server.url);
    await waitForOpen(client);
    const msg = await waitForMessage(client, (d) => d.type === 'connected');
    expect(msg).toEqual({ type: 'connected' });
    client.close();
  });

  test('broadcast() reaches all connected clients', async () => {
    const a = new WebSocket(server.url);
    const b = new WebSocket(server.url);
    await Promise.all([waitForOpen(a), waitForOpen(b)]);

    // Drain the initial 'connected' acks before broadcasting
    await Promise.all([
      waitForMessage(a, (d) => d.type === 'connected'),
      waitForMessage(b, (d) => d.type === 'connected'),
    ]);

    const update = { type: 'hmr-update', filePath: '/abs/x.js', webPath: '/x.js' };
    const [recvA, recvB] = await Promise.all([
      waitForMessage(a, (d) => d.type === 'hmr-update'),
      waitForMessage(b, (d) => d.type === 'hmr-update'),
      Promise.resolve().then(() => server.hmr.broadcast(update)),
    ]);

    expect(recvA).toEqual(update);
    expect(recvB).toEqual(update);
    a.close();
    b.close();
  });

  test('close() drops existing clients and rejects new connections', async () => {
    const a = new WebSocket(server.url);
    await waitForOpen(a);
    await waitForMessage(a, (d) => d.type === 'connected');

    const closed = new Promise((resolve) => a.once('close', resolve));
    server.hmr.close();
    await closed; // existing client got dropped

    // After close, new clients should fail to connect
    const b = new WebSocket(server.url);
    const result = await new Promise((resolve) => {
      b.once('open', () => resolve('opened'));
      b.once('error', () => resolve('errored'));
      b.once('close', () => resolve('closed'));
      setTimeout(() => resolve('timeout'), 500);
    });
    expect(['errored', 'closed', 'timeout']).toContain(result);
    try { b.close(); } catch { /* ignore */ }
  });

  test('broadcast() to zero clients is a no-op', () => {
    expect(() => server.hmr.broadcast({ type: 'hmr-update', filePath: '/x', webPath: '/x' })).not.toThrow();
  });

  test('malformed broadcast still serializes (sanity)', () => {
    // Ensures we use JSON.stringify and don't crash on circular structures by guarding.
    // Circular objects throw — we want a meaningful error, not a silent corrupt frame.
    const circular = { type: 'hmr-update' };
    circular.self = circular;
    expect(() => server.hmr.broadcast(circular)).toThrow();
  });
});
```

### Step 2: Run the test to verify it fails

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/hmr-server.test.js`
Expected: FAIL with "Cannot find module '../../src/dev-server/hmr-server.js'" or similar.

### Step 3: Implement `hmr-server.js`

Create `packages/cli/src/dev-server/hmr-server.js`:

```js
/**
 * HMR WebSocket Server
 *
 * Attaches a WebSocket server to an existing HTTP server (sharing the
 * same port), tracks connected dev clients, and exposes a broadcast()
 * helper that serializes a message once and fan-outs to every live
 * client. Used by the Coherent dev server to push hot-update events
 * to browser-side HMR clients.
 *
 * Wire protocol matches packages/client/src/hmr/client.js — server
 * sends `{type, filePath?, webPath?, error?, updateType?}` objects;
 * client switches on `type` and handles updates, reloads, errors.
 *
 * @module @coherent.js/cli/dev-server/hmr-server
 */

import { WebSocketServer } from 'ws';

/**
 * @typedef {Object} HmrServer
 * @property {(message: object) => void} broadcast - Serialize and send a JSON message to every live client.
 * @property {() => void} close - Close the WebSocket server and drop all clients.
 * @property {() => number} clientCount - Current number of live clients (for tests / diagnostics).
 */

/**
 * Create and attach an HMR WebSocket server to an existing HTTP server.
 *
 * The WS server shares the HTTP server's port — clients connect to
 * `ws://host:port` (no separate port to manage). New clients receive
 * a `{type: 'connected'}` ack on open. Dead clients are pruned on
 * the next broadcast.
 *
 * @param {import('node:http').Server} httpServer - HTTP server to attach to.
 * @returns {HmrServer}
 */
export function createHmrServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket) => {
    try {
      socket.send(JSON.stringify({ type: 'connected' }));
    } catch {
      // Client may have disconnected mid-handshake; ignore.
    }
  });

  // Surface listener errors instead of crashing the dev server.
  wss.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('[coherent dev] HMR server error:', err.message);
  });

  return {
    broadcast(message) {
      const frame = JSON.stringify(message); // throws on circular — surfaces caller bug loudly
      for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
          try {
            client.send(frame);
          } catch {
            // Dead socket — let `ws` clean it up on its own close event.
          }
        }
      }
    },
    close() {
      for (const client of wss.clients) {
        try { client.close(); } catch { /* ignore */ }
      }
      wss.close();
    },
    clientCount() {
      let n = 0;
      for (const c of wss.clients) if (c.readyState === c.OPEN) n++;
      return n;
    },
  };
}
```

### Step 4: Run the test to verify it passes

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/hmr-server.test.js`
Expected: all 5 tests pass.

### Step 5: Run the full cli test suite to check for regressions

Run: `pnpm --filter @coherent.js/cli run test`
Expected: all tests pass (new tests + existing ones).

### Step 6: Commit

```bash
git add packages/cli/src/dev-server/hmr-server.js packages/cli/test/dev-server/hmr-server.test.js
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
feat(cli): add HMR WebSocket server for dev-server

Adds packages/cli/src/dev-server/hmr-server.js exposing
`createHmrServer(httpServer)`, which attaches a `ws` WebSocketServer
to an existing HTTP server (shared port), sends a `{type:'connected'}`
ack on each new connection, and exposes:

- `broadcast(message)` — JSON-serialize once, fan-out to every live
  client. Throws on circular structures (loud caller bug, not a
  silent corrupt frame).
- `close()` — drop all clients, close the WS server.
- `clientCount()` — for tests / diagnostics.

Wire protocol matches packages/client/src/hmr/client.js — the client
already switches on `data.type` for 'connected', 'hmr-update',
'hmr-full-reload', 'hmr-error', etc. The server doesn't try to
understand individual message types; it's a typed message bus.

Tested with vitest: connection ack, broadcast fan-out, close drops
clients + rejects reconnects, no-clients broadcast is a no-op,
circular payload throws.

First commit of Wave 4a (HMR dev server) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Implement the chokidar file watcher

**Files:**
- Create: `packages/cli/src/dev-server/file-watcher.js`
- Create: `packages/cli/test/dev-server/file-watcher.test.js`

### Step 1: Write the failing test

Create `packages/cli/test/dev-server/file-watcher.test.js`:

```js
/**
 * File watcher tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { createFileWatcher } from '../../src/dev-server/file-watcher.js';

async function waitFor(predicate, { timeoutMs = 2000, intervalMs = 25 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('waitFor timed out');
}

describe('createFileWatcher', () => {
  let root;
  let watcher;
  let changes;
  let errors;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'coherent-fw-'));
    changes = [];
    errors = [];
  });

  afterEach(async () => {
    if (watcher) await watcher.close();
    rmSync(root, { recursive: true, force: true });
  });

  test('emits a change payload with filePath, webPath, updateType on .js write', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    const file = join(root, 'src', 'app.js');
    mkdirSync(join(root, 'src'));
    writeFileSync(file, 'export const x = 1;');

    await waitFor(() => changes.length >= 1);

    expect(changes[0]).toMatchObject({
      filePath: file,
      // webPath is project-relative with leading slash, POSIX separators
      webPath: '/src/app.js',
      updateType: 'component',
    });
    expect(errors).toEqual([]);
  });

  test('classifies .css changes as updateType "style"', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    const file = join(root, 'styles.css');
    writeFileSync(file, 'body { color: red; }');

    await waitFor(() => changes.length >= 1);
    expect(changes[0].updateType).toBe('style');
  });

  test('classifies unknown extensions as updateType "asset"', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    const file = join(root, 'image.png');
    writeFileSync(file, 'fake-png-bytes');

    await waitFor(() => changes.length >= 1);
    expect(changes[0].updateType).toBe('asset');
  });

  test('debounces rapid writes to the same file into a single change', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
      debounceMs: 50,
    });

    const file = join(root, 'rapid.js');
    writeFileSync(file, 'v1');
    writeFileSync(file, 'v2');
    writeFileSync(file, 'v3');

    // Wait for the debounce window plus headroom
    await new Promise((r) => setTimeout(r, 200));

    const rapidChanges = changes.filter((c) => c.filePath === file);
    expect(rapidChanges.length).toBe(1);
  });

  test('ignores node_modules and .git by default', async () => {
    mkdirSync(join(root, 'node_modules', 'foo'), { recursive: true });
    mkdirSync(join(root, '.git'), { recursive: true });

    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    writeFileSync(join(root, 'node_modules', 'foo', 'index.js'), 'noise');
    writeFileSync(join(root, '.git', 'HEAD'), 'noise');

    // Allow some time; nothing should fire
    await new Promise((r) => setTimeout(r, 200));
    expect(changes).toEqual([]);
  });

  test('webPath uses forward slashes even on platforms with backslash separators', async () => {
    watcher = await createFileWatcher({
      root,
      onChange: (c) => changes.push(c),
      onError: (e) => errors.push(e),
    });

    mkdirSync(join(root, 'nested', 'deeper'), { recursive: true });
    writeFileSync(join(root, 'nested', 'deeper', 'leaf.js'), 'export {};');

    await waitFor(() => changes.length >= 1);
    expect(changes[0].webPath).toBe('/nested/deeper/leaf.js');
    // Sanity: never contains the platform-native separator if it's backslash
    if (sep === '\\') {
      expect(changes[0].webPath).not.toContain('\\');
    }
  });
});
```

### Step 2: Run the test to verify it fails

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/file-watcher.test.js`
Expected: FAIL with "Cannot find module '../../src/dev-server/file-watcher.js'".

### Step 3: Implement `file-watcher.js`

Create `packages/cli/src/dev-server/file-watcher.js`:

```js
/**
 * File Watcher for the dev server.
 *
 * Wraps chokidar with a small projection that maps absolute file paths
 * to HMR-protocol payloads (filePath + webPath + updateType) and a per-
 * file debounce so rapid editor saves coalesce into one HMR message.
 *
 * @module @coherent.js/cli/dev-server/file-watcher
 */

import chokidar from 'chokidar';
import { relative, sep } from 'node:path';

/**
 * @typedef {Object} FileChangeEvent
 * @property {string} filePath - Absolute filesystem path of the changed file.
 * @property {string} webPath - URL-relative path (POSIX separators, leading slash).
 * @property {'component'|'style'|'asset'} updateType - Coarse classification used by the HMR client to pick a strategy.
 */

/**
 * @typedef {Object} FileWatcherOptions
 * @property {string} root - Absolute path to the project root being watched.
 * @property {(change: FileChangeEvent) => void} onChange - Called per debounced change.
 * @property {(err: Error) => void} [onError] - Called on chokidar errors.
 * @property {number} [debounceMs=50] - Coalesce rapid writes to the same file within this window.
 * @property {Array<string|RegExp>} [ignored] - Additional ignore patterns (merged with defaults).
 */

/**
 * @typedef {Object} FileWatcher
 * @property {() => Promise<void>} close - Stop watching and release resources.
 */

const DEFAULT_IGNORES = [
  /(^|[/\\])\../,             // dotfiles + dotted dirs (.git, .DS_Store, etc.)
  /(^|[/\\])node_modules([/\\]|$)/,
  /(^|[/\\])dist([/\\]|$)/,
  /(^|[/\\])coverage([/\\]|$)/,
  /(^|[/\\])\.cache([/\\]|$)/,
];

const COMPONENT_EXTS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);
const STYLE_EXTS = new Set(['.css', '.scss', '.sass', '.less']);

function classify(path) {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return 'asset';
  const ext = path.slice(dot).toLowerCase();
  if (COMPONENT_EXTS.has(ext)) return 'component';
  if (STYLE_EXTS.has(ext)) return 'style';
  return 'asset';
}

function toWebPath(root, absPath) {
  const rel = relative(root, absPath);
  // Normalize separators to forward slashes for the URL
  const posix = sep === '\\' ? rel.split(sep).join('/') : rel;
  return posix.startsWith('/') ? posix : `/${posix}`;
}

/**
 * Create a debounced chokidar-backed file watcher.
 *
 * Resolves once chokidar has emitted `ready` so callers know the
 * initial scan is finished and subsequent writes are real edits.
 *
 * @param {FileWatcherOptions} options
 * @returns {Promise<FileWatcher>}
 */
export async function createFileWatcher(options) {
  const {
    root,
    onChange,
    onError,
    debounceMs = 50,
    ignored = [],
  } = options;

  const watcher = chokidar.watch(root, {
    ignored: [...DEFAULT_IGNORES, ...ignored],
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: false,
  });

  /** @type {Map<string, NodeJS.Timeout>} */
  const pending = new Map();

  function schedule(filePath) {
    const prev = pending.get(filePath);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      pending.delete(filePath);
      try {
        onChange({
          filePath,
          webPath: toWebPath(root, filePath),
          updateType: classify(filePath),
        });
      } catch (err) {
        if (onError) onError(err);
      }
    }, debounceMs);
    pending.set(filePath, timer);
  }

  watcher.on('add', schedule);
  watcher.on('change', schedule);
  watcher.on('unlink', schedule);

  if (onError) {
    watcher.on('error', onError);
  }

  await new Promise((resolve) => watcher.once('ready', resolve));

  return {
    async close() {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
      await watcher.close();
    },
  };
}
```

### Step 4: Run the test to verify it passes

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/file-watcher.test.js`
Expected: all 6 tests pass.

### Step 5: Run the full cli test suite to check for regressions

Run: `pnpm --filter @coherent.js/cli run test`
Expected: all tests pass.

### Step 6: Commit

```bash
git add packages/cli/src/dev-server/file-watcher.js packages/cli/test/dev-server/file-watcher.test.js
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
feat(cli): add chokidar file watcher for HMR dev-server

Adds packages/cli/src/dev-server/file-watcher.js exposing
`createFileWatcher({root, onChange, onError, debounceMs, ignored})`,
which wraps chokidar with:

- Per-file debounce (default 50ms) so rapid editor saves coalesce
  into one HMR message.
- Default ignores for node_modules, dist, coverage, .cache,
  dotfiles, .git.
- A path projection that emits {filePath, webPath, updateType}
  payloads matching the HMR client's expected shape. webPath is
  always POSIX (leading slash, forward slashes) regardless of
  platform separator.
- Coarse updateType classification: 'component' for JS/TS, 'style'
  for CSS/SCSS/SASS/LESS, 'asset' for everything else. The HMR
  client uses this hint to pick a strategy; finer classification
  can come later.

Resolves only after chokidar's `ready` event so callers know the
initial scan is done.

Tested with vitest: per-extension classification, debounce,
node_modules/.git ignore, POSIX webPath on backslash platforms.

Second commit of Wave 4a (HMR dev server).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Static file handler with HMR client injection

**Files:**
- Create: `packages/cli/src/dev-server/static-handler.js`
- Create: `packages/cli/test/dev-server/static-handler.test.js`

### Step 1: Write the failing test

Create `packages/cli/test/dev-server/static-handler.test.js`:

```js
/**
 * Static file handler tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticHandler } from '../../src/dev-server/static-handler.js';

async function startServer(handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}`,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

async function fetchText(url) {
  const res = await fetch(url);
  return { status: res.status, contentType: res.headers.get('content-type'), text: await res.text() };
}

describe('createStaticHandler', () => {
  let root;
  let server;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'coherent-sh-'));
  });

  afterEach(async () => {
    if (server) await server.stop();
    rmSync(root, { recursive: true, force: true });
  });

  test('serves a JS file with text/javascript', async () => {
    writeFileSync(join(root, 'app.js'), 'export const x = 1;');
    server = await startServer(createStaticHandler({ root }));

    const { status, contentType, text } = await fetchText(`${server.base}/app.js`);
    expect(status).toBe(200);
    expect(contentType).toMatch(/text\/javascript|application\/javascript/);
    expect(text).toContain('export const x = 1');
  });

  test('serves an HTML file with the HMR client bootstrap script injected before </body>', async () => {
    writeFileSync(join(root, 'index.html'), '<!doctype html><html><body><h1>hi</h1></body></html>');
    server = await startServer(createStaticHandler({ root }));

    const { status, contentType, text } = await fetchText(`${server.base}/index.html`);
    expect(status).toBe(200);
    expect(contentType).toMatch(/text\/html/);
    expect(text).toMatch(/<script[^>]+src="\/__coherent_hmr_client\.js"[^>]*><\/script>/);
    expect(text.indexOf('__coherent_hmr_client')).toBeLessThan(text.indexOf('</body>'));
  });

  test('does not inject the bootstrap twice if already present', async () => {
    const html = '<!doctype html><html><body><script src="/__coherent_hmr_client.js"></script></body></html>';
    writeFileSync(join(root, 'index.html'), html);
    server = await startServer(createStaticHandler({ root }));

    const { text } = await fetchText(`${server.base}/index.html`);
    const matches = text.match(/__coherent_hmr_client\.js/g) || [];
    expect(matches.length).toBe(1);
  });

  test('serves /__coherent_hmr_client.js with a tiny bootstrap that imports the client HMR module', async () => {
    server = await startServer(createStaticHandler({ root }));

    const { status, contentType, text } = await fetchText(`${server.base}/__coherent_hmr_client.js`);
    expect(status).toBe(200);
    expect(contentType).toMatch(/text\/javascript|application\/javascript/);
    expect(text).toContain('@coherent.js/client');
    expect(text).toContain('hmrClient');
    expect(text).toContain('initialize');
  });

  test('serves / as /index.html when an index.html exists in the root', async () => {
    writeFileSync(join(root, 'index.html'), '<!doctype html><html><body>root</body></html>');
    server = await startServer(createStaticHandler({ root }));

    const { status, text } = await fetchText(`${server.base}/`);
    expect(status).toBe(200);
    expect(text).toContain('root');
  });

  test('returns 404 for paths that do not resolve to a file in root', async () => {
    server = await startServer(createStaticHandler({ root }));

    const { status } = await fetchText(`${server.base}/no-such-file.txt`);
    expect(status).toBe(404);
  });

  test('refuses path traversal (does not serve files outside root)', async () => {
    writeFileSync(join(root, 'safe.txt'), 'safe');
    // Write a file in the temp parent that shouldn't be reachable
    const sibling = join(tmpdir(), `coherent-sh-sibling-${Date.now()}.txt`);
    writeFileSync(sibling, 'secret');
    try {
      server = await startServer(createStaticHandler({ root }));
      const { status } = await fetchText(`${server.base}/../coherent-sh-sibling-${sibling.split('coherent-sh-sibling-')[1]}`);
      expect(status).toBe(404);
    } finally {
      rmSync(sibling, { force: true });
    }
  });
});
```

### Step 2: Run the test to verify it fails

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/static-handler.test.js`
Expected: FAIL with "Cannot find module '../../src/dev-server/static-handler.js'".

### Step 3: Implement `static-handler.js`

Create `packages/cli/src/dev-server/static-handler.js`:

```js
/**
 * Static File Handler for the dev server.
 *
 * Tiny zero-dep request handler that:
 *   - Maps `req.url` to a file under `root` (with safe path-traversal
 *     rejection)
 *   - Sets a content-type by extension
 *   - For .html responses, injects a `<script>` tag pointing at the
 *     HMR client bootstrap right before `</body>`, idempotently
 *   - Serves the bootstrap itself at `/__coherent_hmr_client.js`
 *
 * Intentionally minimal — no SSR routing, no transformations, no
 * directory listing. Users wanting more reach for vite/webpack or
 * one of the integrations packages.
 *
 * @module @coherent.js/cli/dev-server/static-handler
 */

import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname, join } from 'node:path';

const HMR_CLIENT_PATH = '/__coherent_hmr_client.js';
const HMR_SCRIPT_TAG = `<script type="module" src="${HMR_CLIENT_PATH}"></script>`;

// Minimal MIME map — covers the things a Coherent dev project actually serves.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.cjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.map':  'application/json; charset=utf-8',
};

// Bootstrap shipped at /__coherent_hmr_client.js — imports the client
// HMR module from the user's node_modules and initializes it. Kept
// inline (not a file on disk) so the dev server doesn't depend on
// any built artifact other than the user's installed @coherent.js/client.
// `@coherent.js/client` builds to a single bundled `dist/index.js` that
// re-exports `hmrClient` from its hmr submodule (see packages/client/src/index.js).
// We import from the bundled entry — there is no standalone `dist/hmr.js`.
const HMR_BOOTSTRAP = `// Coherent.js HMR client bootstrap (served by coherent dev)
import { hmrClient } from '/node_modules/@coherent.js/client/dist/index.js';
hmrClient.initialize();
`;

function contentTypeFor(filePath) {
  return MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function injectHmrScript(html) {
  if (html.includes(HMR_CLIENT_PATH)) return html;
  const idx = html.lastIndexOf('</body>');
  if (idx === -1) {
    // No body tag — append at end. Browser will still execute.
    return html + '\n' + HMR_SCRIPT_TAG + '\n';
  }
  return html.slice(0, idx) + HMR_SCRIPT_TAG + '\n' + html.slice(idx);
}

/**
 * Resolve `urlPath` relative to `root` while rejecting path traversal.
 * Returns null if the resolved path escapes `root`.
 */
function safeResolve(root, urlPath) {
  // Strip query/hash; decode percent-escapes.
  const cleaned = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  // Strip leading slashes so `join` treats it as relative.
  const rel = cleaned.replace(/^\/+/, '');
  const abs = resolve(root, rel);
  const rootResolved = resolve(root);
  if (abs !== rootResolved && !abs.startsWith(rootResolved + sep)) {
    return null;
  }
  return abs;
}

/**
 * Create an HTTP request handler that serves files under `root`.
 *
 * @param {Object} options
 * @param {string} options.root - Absolute path to the project root.
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}
 */
export function createStaticHandler({ root }) {
  return async function handle(req, res) {
    try {
      const urlPath = req.url || '/';

      // Serve the inline HMR client bootstrap.
      if (urlPath === HMR_CLIENT_PATH || urlPath.startsWith(HMR_CLIENT_PATH + '?')) {
        res.statusCode = 200;
        res.setHeader('content-type', MIME['.js']);
        res.setHeader('cache-control', 'no-cache');
        res.end(HMR_BOOTSTRAP);
        return;
      }

      const resolved = safeResolve(root, urlPath);
      if (!resolved) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      // If the path is a directory (or '/'), try its index.html.
      let target = resolved;
      try {
        const s = await stat(target);
        if (s.isDirectory()) {
          target = join(target, 'index.html');
          await stat(target); // throws if missing
        }
      } catch {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      const buf = await readFile(target);
      const ct = contentTypeFor(target);
      res.statusCode = 200;
      res.setHeader('content-type', ct);
      res.setHeader('cache-control', 'no-cache');

      if (ct.startsWith('text/html')) {
        res.end(injectHmrScript(buf.toString('utf8')));
      } else {
        res.end(buf);
      }
    } catch (err) {
      res.statusCode = 500;
      res.end(`Internal Server Error: ${err.message}`);
    }
  };
}
```

### Step 4: Run the test to verify it passes

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/static-handler.test.js`
Expected: all 7 tests pass.

### Step 5: Commit

```bash
git add packages/cli/src/dev-server/static-handler.js packages/cli/test/dev-server/static-handler.test.js
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
feat(cli): add static file handler for HMR dev-server

Adds packages/cli/src/dev-server/static-handler.js exposing
`createStaticHandler({root})` — a tiny zero-dep request handler
that serves files under root with:

- A minimal MIME map (html/js/css/json/svg/png/jpg/gif/ico/webp/
  woff/woff2/map) — the things a Coherent dev project actually
  serves. Everything else falls back to application/octet-stream.
- Idempotent injection of `<script type="module"
  src="/__coherent_hmr_client.js"></script>` before `</body>`
  on HTML responses, so any HTML the user serves wires up HMR
  automatically. Skipped if the page already references the path.
- An inline bootstrap served at /__coherent_hmr_client.js that
  imports hmrClient from /node_modules/@coherent.js/client/dist/index.js
  (the bundled entry — there is no standalone dist/hmr.js, the
  client package re-exports hmrClient from its src/index.js) and
  calls initialize() — no build step, no file on disk.
- Safe path resolution that rejects traversal (returns 404 for
  paths that escape root).
- Directory → index.html resolution for '/'-style requests.

Intentionally NOT included: SSR routing, transformations,
directory listings — users wanting more reach for vite/webpack
or the integrations package.

Tested with vitest: MIME by extension, idempotent injection, path
traversal rejection, index.html for /, bootstrap content.

Third commit of Wave 4a (HMR dev server).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Orchestrator — `startDevServer` ties it all together

**Files:**
- Create: `packages/cli/src/dev-server/index.js`
- Create: `packages/cli/test/dev-server/integration.test.js`

### Step 1: Write the failing integration test

Create `packages/cli/test/dev-server/integration.test.js`:

```js
/**
 * Full dev server integration test
 *
 * Boots the orchestrator (HTTP + WS + watcher), connects a real ws
 * client, touches a real file, asserts the correct HMR message
 * arrives over the wire.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { startDevServer } from '../../src/dev-server/index.js';

function waitForMessage(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeListener('message', onMessage);
      reject(new Error(`timeout waiting for message after ${timeoutMs}ms`));
    }, timeoutMs);

    function onMessage(buf) {
      let data;
      try { data = JSON.parse(buf.toString()); } catch { return; }
      if (predicate(data)) {
        clearTimeout(timer);
        ws.removeListener('message', onMessage);
        resolve(data);
      }
    }
    ws.on('message', onMessage);
  });
}

function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}

describe('startDevServer (integration)', () => {
  let root;
  let server;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'coherent-devsrv-'));
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><html><body><h1>hi</h1></body></html>');
    writeFileSync(join(root, 'src', 'app.js'), 'export const v = 1;');
  });

  afterEach(async () => {
    if (server) await server.close();
    rmSync(root, { recursive: true, force: true });
  });

  test('serves index.html with the HMR script injected', async () => {
    server = await startDevServer({ root, port: 0, host: '127.0.0.1', open: false, log: false });
    const res = await fetch(`http://127.0.0.1:${server.port}/`);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('__coherent_hmr_client.js');
  });

  test('broadcasts hmr-update when a watched file changes', async () => {
    server = await startDevServer({ root, port: 0, host: '127.0.0.1', open: false, log: false });

    const client = new WebSocket(`ws://127.0.0.1:${server.port}`);
    await waitForOpen(client);
    await waitForMessage(client, (d) => d.type === 'connected');

    const updatePromise = waitForMessage(client, (d) => d.type === 'hmr-update');

    // Touch the file *after* the watcher is ready (startDevServer awaits ready).
    writeFileSync(join(root, 'src', 'app.js'), 'export const v = 2;');

    const update = await updatePromise;
    expect(update.filePath).toBe(join(root, 'src', 'app.js'));
    expect(update.webPath).toBe('/src/app.js');
    expect(update.updateType).toBe('component');

    client.close();
  });

  test('close() shuts down HTTP, WS, and watcher cleanly', async () => {
    server = await startDevServer({ root, port: 0, host: '127.0.0.1', open: false, log: false });
    const port = server.port;
    await server.close();
    server = null;

    // Subsequent fetch should fail (connection refused).
    let errored = false;
    try {
      await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) });
    } catch {
      errored = true;
    }
    expect(errored).toBe(true);
  });
});
```

### Step 2: Run the test to verify it fails

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/integration.test.js`
Expected: FAIL with "Cannot find module '../../src/dev-server/index.js'".

### Step 3: Implement the orchestrator

Create `packages/cli/src/dev-server/index.js`:

```js
/**
 * Coherent Dev Server
 *
 * Orchestrator that boots:
 *   - An HTTP server serving static files under `root` (with HMR
 *     client injection on HTML responses)
 *   - A WebSocket server sharing the HTTP port, used to broadcast
 *     HMR messages to connected browser clients
 *   - A chokidar file watcher that emits HMR update messages on
 *     edits to files under `root`
 *
 * @module @coherent.js/cli/dev-server
 */

import { createServer } from 'node:http';
import picocolors from 'picocolors';
import { createHmrServer } from './hmr-server.js';
import { createFileWatcher } from './file-watcher.js';
import { createStaticHandler } from './static-handler.js';

/**
 * @typedef {Object} DevServerOptions
 * @property {string} root - Absolute path to the project root.
 * @property {number} [port=3000] - Port to listen on. `0` picks a random free port (useful for tests).
 * @property {string} [host='localhost'] - Host interface to bind.
 * @property {boolean} [open=false] - Open the default browser to the served URL after start.
 * @property {boolean} [log=true] - Emit startup / change log lines to stdout.
 */

/**
 * @typedef {Object} DevServer
 * @property {number} port - The actual port the HTTP server is listening on.
 * @property {string} host - The host the HTTP server is bound to.
 * @property {() => Promise<void>} close - Shut down HTTP server, WS server, and file watcher.
 */

/**
 * Start the Coherent dev server and return a handle for graceful shutdown.
 *
 * Resolves once the HTTP server is listening AND the file watcher's
 * initial scan is complete — callers can immediately connect a WS
 * client and trust that touching a file will fire an HMR message.
 *
 * @param {DevServerOptions} options
 * @returns {Promise<DevServer>}
 */
export async function startDevServer(options) {
  const {
    root,
    port = 3000,
    host = 'localhost',
    open = false,
    log = true,
  } = options;

  const handler = createStaticHandler({ root });
  const httpServer = createServer(handler);

  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => {
      httpServer.removeListener('error', reject);
      resolve();
    });
  });

  const actualPort = httpServer.address().port;

  const hmr = createHmrServer(httpServer);

  const watcher = await createFileWatcher({
    root,
    onChange: (change) => {
      hmr.broadcast({
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
      hmr.broadcast({
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

  if (log) {
    // eslint-disable-next-line no-console
    console.log(picocolors.green('✅ Coherent dev server ready'));
    // eslint-disable-next-line no-console
    console.log(picocolors.cyan('🌐 Local:'), `http://${host}:${actualPort}`);
  }

  if (open) {
    try {
      const { default: openModule } = await import('open');
      await openModule(`http://${host}:${actualPort}`);
    } catch {
      // 'open' is optional — silently no-op if missing
    }
  }

  return {
    port: actualPort,
    host,
    async close() {
      await watcher.close();
      hmr.close();
      await new Promise((resolve) => httpServer.close(() => resolve()));
    },
  };
}
```

### Step 4: Run the integration test to verify it passes

Run: `pnpm --filter @coherent.js/cli run test -- test/dev-server/integration.test.js`
Expected: all 3 tests pass.

### Step 5: Run the full cli test suite

Run: `pnpm --filter @coherent.js/cli run test`
Expected: all tests pass.

### Step 6: Commit

```bash
git add packages/cli/src/dev-server/index.js packages/cli/test/dev-server/integration.test.js
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
feat(cli): add startDevServer orchestrator for HMR dev-server

Adds packages/cli/src/dev-server/index.js exposing
`startDevServer({root, port, host, open, log})`, the orchestrator
that ties the three pieces from prior commits together:

- HTTP server serving static files under `root` via
  createStaticHandler (with idempotent HMR script injection on
  HTML responses)
- WebSocket server via createHmrServer, sharing the HTTP port
- chokidar file watcher via createFileWatcher, which broadcasts
  {type:'hmr-update', filePath, webPath, updateType} on change
  and {type:'hmr-error', error:{...}} on watcher errors

Resolves only after both the HTTP server is listening AND the
file watcher's initial scan is complete — callers can immediately
connect a WS client and trust that touching a file will fire an
HMR message. (This makes integration tests deterministic.)

Returns a handle with `{port, host, close()}` where close() shuts
down watcher → ws → http in order, awaiting each.

`port: 0` picks a random free port (useful for tests).

Integration-tested with vitest: HMR script injection on index.html,
end-to-end ws update on file change, clean shutdown via close().

Fourth commit of Wave 4a (HMR dev server). Next commit wires the
`coherent dev` command to call this when --coherent or
coherent.config.js is present.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire `coherent dev` to the built-in server

**Files:**
- Modify: `packages/cli/src/commands/dev.js`

### Step 1: Add the `--coherent` flag and autodetect branch

Open `packages/cli/src/commands/dev.js`. Replace the file's body (the existing dev command + action) with the version below. The diff is contained: a new option, a new autodetect predicate, and a new branch that calls `startDevServer` early-returning before the existing vite/webpack/nodemon logic runs.

Replace the entire file with:

```js
/**
 * Dev command - Starts development server with hot reload
 */

import { Command } from 'commander';
import ora from 'ora';
import picocolors from 'picocolors';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { startDevServer } from '../dev-server/index.js';

/**
 * True when the current project should use the built-in Coherent dev
 * server instead of delegating to vite/webpack/nodemon. Either the
 * `--coherent` flag is set, or a `coherent.config.js`/`.mjs` file
 * exists in the project root.
 */
function shouldUseCoherentDevServer(cwd, options) {
  if (options.coherent) return true;
  return existsSync(join(cwd, 'coherent.config.js')) || existsSync(join(cwd, 'coherent.config.mjs'));
}

export const devCommand = new Command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'port number', '3000')
  .option('-h, --host <host>', 'host address', 'localhost')
  .option('--open', 'open browser automatically')
  .option('--no-hmr', 'disable hot module replacement')
  .option('--coherent', 'use the built-in Coherent HMR dev server (HTTP + WebSocket + chokidar)')
  .action(async (options) => {
    console.log(picocolors.cyan('🚀 Starting Coherent.js development server...'));
    console.log();

    const cwd = process.cwd();
    const packageJsonPath = join(cwd, 'package.json');
    if (!existsSync(packageJsonPath)) {
      console.error(picocolors.red('❌ No package.json found. Are you in a project directory?'));
      process.exit(1);
    }

    let packageJson;
    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    } catch {
      console.error(picocolors.red('❌ Failed to read package.json'));
      process.exit(1);
    }

    // --- Built-in Coherent dev server (opt-in via --coherent or coherent.config.js) ---
    if (shouldUseCoherentDevServer(cwd, options)) {
      try {
        const server = await startDevServer({
          root: cwd,
          port: Number(options.port),
          host: options.host,
          open: Boolean(options.open),
          log: true,
        });

        const cleanup = async () => {
          console.log();
          console.log(picocolors.yellow('👋 Stopping Coherent dev server...'));
          try { await server.close(); } catch { /* ignore */ }
          process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
      } catch (error) {
        console.error(picocolors.red('❌ Failed to start Coherent dev server:'), error.message);
        process.exit(1);
      }
      return;
    }

    // --- Fallback: existing delegation behavior (unchanged) ---
    const spinner = ora('Starting development server...').start();

    try {
      let devProcess;

      if (packageJson.scripts && packageJson.scripts.dev) {
        spinner.text = 'Running dev script...';

        devProcess = spawn('npm', ['run', 'dev'], {
          stdio: 'inherit',
          cwd,
          shell: true,
          env: {
            ...process.env,
            PORT: options.port,
            HOST: options.host,
          },
        });
      } else if (existsSync('vite.config.js') || existsSync('vite.config.ts')) {
        spinner.text = 'Starting default dev server...';
        devProcess = spawn('npx', ['vite', '--port', options.port, '--host', options.host], {
          stdio: 'inherit',
          cwd,
          shell: true,
        });
      } else if (existsSync('webpack.config.js')) {
        spinner.text = 'Starting default dev server...';
        devProcess = spawn('npx', ['webpack', 'serve', '--port', options.port, '--host', options.host], {
          stdio: 'inherit',
          cwd,
          shell: true,
        });
      } else if (packageJson.type === 'module' || existsSync('src/index.js')) {
        spinner.text = 'Starting default dev server...';
        devProcess = spawn('npx', ['nodemon', 'src/index.js'], {
          stdio: 'inherit',
          cwd,
          shell: true,
          env: {
            ...process.env,
            PORT: options.port,
            HOST: options.host,
          },
        });
      } else {
        throw new Error('No development server configuration found. Run with --coherent to use the built-in Coherent HMR dev server.');
      }

      spinner.stop();

      console.log(picocolors.green('✅ Development server started!'));
      console.log();
      console.log(picocolors.cyan('🌐 Local:'), `http://${options.host}:${options.port}`);

      if (options.host !== 'localhost') {
        console.log(picocolors.cyan('🔗 Network:'), `http://${options.host}:${options.port}`);
      }

      console.log();
      console.log(picocolors.gray('Press Ctrl+C to stop the server'));
      console.log();

      if (options.open) {
        const { default: open } = await import('open');
        await open(`http://${options.host}:${options.port}`);
      }

      const cleanup = () => {
        console.log();
        console.log(picocolors.yellow('👋 Stopping development server...'));
        if (devProcess) {
          devProcess.kill();
        }
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      devProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error(picocolors.red(`❌ Development server exited with code ${code}`));
          process.exit(code);
        }
      });

      devProcess.on('_error', (_error) => {
        console.error(picocolors.red('❌ Failed to start development server:'), _error.message);
        process.exit(1);
      });

    } catch (error) {
      spinner.fail('Failed to start development server');
      console.error(picocolors.red('❌ Error:'), error.message);

      console.log();
      console.log(picocolors.yellow('💡 Suggestions:'));
      console.log(picocolors.gray('  • Run with --coherent to use the built-in Coherent HMR dev server'));
      console.log(picocolors.gray('  • Make sure you have a dev script in package.json'));
      console.log(picocolors.gray('  • Install development dependencies: npm install'));
      console.log(picocolors.gray('  • Check if port', options.port, 'is available'));

      process.exit(1);
    }
  });
```

### Step 2: Run the cli test suite

Run: `pnpm --filter @coherent.js/cli run test`
Expected: all tests pass (existing + the four new dev-server tests).

### Step 3: Build the cli + verify the bundle-size gate is still satisfied

Run: `pnpm --filter @coherent.js/cli run build && node scripts/check-bundle-size.mjs --check`

If the gate FAILS (likely, since dev.js now imports startDevServer which transitively brings in static-handler / hmr-server / file-watcher into the bundle):

- Inspect the drift:
  ```bash
  node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('packages/cli/bundle-size.json')); const cur=fs.readFileSync('packages/cli/dist/index.js').length; const gz=require('zlib').gzipSync(fs.readFileSync('packages/cli/dist/index.js')).length; console.log({baseline_raw: j.raw, current_raw: cur, raw_pct: ((cur-j.raw)/j.raw*100).toFixed(1)+'%', baseline_gz: j.gz, current_gz: gz, gz_pct: ((gz-j.gz)/j.gz*100).toFixed(1)+'%'})"
  ```
- Decide: if growth is justified (≈ 2-6 KB raw / ~1-2 KB gz for the dev-server modules, with `ws`/`chokidar` external), regenerate the baseline:
  ```bash
  node scripts/check-bundle-size.mjs --write
  ```
  Inspect the diff with `git diff packages/cli/bundle-size.json`. If growth is wildly out of band (>20% raw), stop — something is wrong (probably ws/chokidar accidentally got bundled). Recheck `packages/cli/build.mjs` `external` array.

### Step 4: Build all packages and run the full gate suite

Run:
```bash
pnpm build && pnpm test && node scripts/check-api-surface.mjs --check && node scripts/check-bundle-size.mjs --check
```
Expected: all green. API surface should be unchanged (dev-server modules are internal). Bundle-size may need the baseline update from Step 3 staged.

### Step 5: Manually smoke-test the dev server

Run:
```bash
mkdir -p /tmp/coherent-smoke && cd /tmp/coherent-smoke && cat > package.json <<'EOF'
{"name":"smoke","type":"module","private":true}
EOF
echo '<!doctype html><html><body><h1>smoke</h1></body></html>' > index.html
node /Users/thomasdrouvin/Perso/coherent/packages/cli/bin/coherent.js dev --coherent --port 4321 &
SMOKE_PID=$!
sleep 1
curl -s http://localhost:4321/ | grep -q __coherent_hmr_client && echo OK_HTML_INJECTION || echo FAIL_HTML_INJECTION
curl -s http://localhost:4321/__coherent_hmr_client.js | grep -q hmrClient && echo OK_BOOTSTRAP || echo FAIL_BOOTSTRAP
kill $SMOKE_PID 2>/dev/null
cd /Users/thomasdrouvin/Perso/coherent
rm -rf /tmp/coherent-smoke
```
Expected: prints `OK_HTML_INJECTION` and `OK_BOOTSTRAP`. (If the cli `bin/coherent.js` shebang isn't executable, use `node packages/cli/bin/coherent.js` as above — the absolute path is used so the test runs from `/tmp/coherent-smoke` correctly.)

### Step 6: Commit

```bash
git add packages/cli/src/commands/dev.js packages/cli/bundle-size.json
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
feat(cli): wire `coherent dev` to built-in HMR server (opt-in)

Adds a new --coherent flag and a `coherent.config.{js,mjs}`
autodetect to the dev command. When either matches, `coherent dev`
calls startDevServer() (Task 5 orchestrator) instead of delegating
to vite/webpack/nodemon — full HTTP + WebSocket + chokidar HMR
without leaving the cli.

All existing delegation behavior is preserved unchanged for
backward compatibility. When no other config matches and
--coherent isn't set, we still print the "no dev server
configuration found" error — but the error message now suggests
--coherent as a next step.

Bundle-size baseline regenerated for @coherent.js/cli to absorb
the new dev-server modules (ws + chokidar stay external per the
build.mjs change from Task 1). Drift was within expected bounds
(~few KB raw / sub-2KB gz).

Fifth commit of Wave 4a (HMR dev server). End-users can now run
`coherent dev --coherent` in any project with an index.html to
get a full HMR dev environment. Default-on for scaffolded apps
is a separate concern handled in Wave 4b together with template
updates and Playwright E2E.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: CHANGELOG entry

**File:** `CHANGELOG.md`

### Step 1: Locate the Unreleased section

The Unreleased section contains subsections from Waves 1, 2a, 2b, 2c, 3a, 3b. Wave 4a adds new subsections AFTER the existing Wave 3b blocks and BEFORE `## [1.0.0-beta.8]`.

### Step 2: Add Wave 4a subsections

Add the following to the Unreleased section, after Wave 3b's blocks:

```markdown
### Added (Wave 4a)

- **NEW: Built-in HMR dev server.** `coherent dev --coherent` (or any project with `coherent.config.{js,mjs}`) now spins up a full HTTP + WebSocket + chokidar dev environment in-process — no vite/webpack/nodemon required. Broadcasts `{type:'hmr-update', filePath, webPath, updateType}` messages to the existing client at `packages/client/src/hmr/client.js`. ~400 lines split across four modules in `packages/cli/src/dev-server/`:
  - `hmr-server.js` — `ws` WebSocketServer wrapper with `broadcast/close/clientCount`
  - `file-watcher.js` — chokidar wrapper with debounce + `{filePath, webPath, updateType}` projection (POSIX webPath on all platforms)
  - `static-handler.js` — zero-dep static file server with idempotent HMR script injection on HTML, safe path-traversal rejection, inline `/__coherent_hmr_client.js` bootstrap
  - `index.js` — `startDevServer({root, port, host, open, log})` orchestrator
- **`ws@8.20.0` and `chokidar@5.0.0` promoted** from root devDeps to direct `@coherent.js/cli` dependencies. Both are marked `external` in `packages/cli/build.mjs` so they don't inflate the cli's bundle-size baseline.

### Changed (Wave 4a)

- **`coherent dev` error message** now suggests `--coherent` as a next step when no other dev-server configuration is detected.
- **`@coherent.js/cli` bundle-size baseline** regenerated to absorb the new dev-server modules. `ws` and `chokidar` stay external.

### Notes (Wave 4a)

- Wave 4a is **opt-in**. Existing projects with vite/webpack/nodemon or a `dev` script in package.json get the same behavior as before. Making the built-in server the default for scaffolded apps requires template updates and is intentionally deferred to Wave 4b.
- **Out of scope for Wave 4a, deferred to Wave 4b:** Playwright E2E suite covering the six audit-item flows from spec Section 5 (hydration golden path, event survival, mismatch detection, HMR component update, form preservation, scroll preservation), template updates to make `--coherent` the default for scaffolded apps, VS Code marketplace publish.
- **Out of scope, deferred to Wave 5 or post-1.0:** HTTPS/TLS for the dev server (use a reverse proxy; the client picks `wss://` automatically based on `location.protocol`), on-the-fly JSX/TS compilation (use vite/webpack via existing dev paths), full SSR routing (use the integrations package), module dependency graph (the client's `moduleTracker` already handles graph traversal).
- **Compile-error overlay path** currently only fires on chokidar `error` events (watcher errors, not module-load errors). Wiring the static handler to broadcast `hmr-error` when it can't serve a `.js` file is a small follow-up — left out of Wave 4a to keep the protocol surface minimal while we get operational experience.
```

### Step 3: Commit

```bash
git add CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs(changelog): record Wave 4a HMR dev server

Documents the new built-in HMR dev server (HTTP + WebSocket +
chokidar) wired via `coherent dev --coherent` or
`coherent.config.{js,mjs}` autodetect. Lists the four dev-server
modules, the ws/chokidar dep promotion, the bundle-size baseline
regeneration, and the explicit deferrals: Playwright E2E,
template default-on flip, and VS Code marketplace publish all go
to Wave 4b.

Closes Wave 4a of v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Post-Wave-4a handoff

Wave 4a is done. `coherent dev --coherent` now boots a working HMR loop end-to-end: HTTP server serves files, WebSocket pushes update messages on file change, the existing client at `packages/client/src/hmr/client.js` consumes them and re-imports modules with state preservation.

Next plans:

- **Wave 4b — Browser parity completion:** Playwright E2E suite covering the six flows from spec Section 5 (hydration golden path, event survival, mismatch detection, HMR component update, form input preservation across HMR, scroll preservation across HMR). New `e2e/` top-level directory, fixtures generated by the real `cli create`, served by the real `cli dev --coherent`. New CI job parallel to `test`/`perf`. Also: template updates to make `--coherent` the default for scaffolded apps; VS Code marketplace publish.
- **Wave 5 — Release:** MIGRATION-1.0.md finalization, `1.0.0-rc.1` tag, 1-2 week soak, `1.0.0` tag.

Follow-up items surfaced by Wave 4a:

- Wire static handler to broadcast `hmr-error` when serving a `.js` file fails (e.g., file deleted between request and read). Currently only chokidar errors trigger the overlay — module-load errors would be useful too. Small (~20 lines) but deserves its own commit so the protocol surface stays auditable.
- Consider lifting `--no-hmr` from a parsed-but-ignored option to an actual gate: when set, `startDevServer` should still serve files but skip injecting the HMR script and skip starting the WebSocket server. Trivial; deferred.
- The bundle-size gate baseline-bump pattern in Task 6 Step 3 is now well-trodden — any wave that meaningfully touches an exported package will need it. Worth a one-line `bundle-size: regenerated baseline` checklist item in the plan template.
