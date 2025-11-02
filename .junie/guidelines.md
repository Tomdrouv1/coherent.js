# Coherent.js – Project-Specific Development Guidelines

This document captures development practices that are particular to this repository. It assumes you are an experienced JS/Node developer and focuses on repo‑specific details and non-obvious gotchas.


## 1) Build and Configuration

- Tooling and engines
  - Node: >= 20 (enforced via `package.json` engines)
  - Package manager: pnpm (repo is a PNPM workspace/monorepo)
  - Module system: ESM (`"type": "module"` at the root and in packages)
- Install
  - At the repo root: `pnpm install`
- Monorepo layout
  - Workspaces live under `packages/*` (see root `package.json` → `workspaces`).
  - Each package may have its own scripts and (sometimes) its own `vitest.config.js`.
- Build
  - Build all packages (recommended for CI and release):
    ```bash
    pnpm run build:packages
    ```
  - Type declarations (where applicable):
    ```bash
    pnpm run build:types
    ```
  - Build a specific package (example: core):
    ```bash
    pnpm --filter @coherentjs/core run build
    ```
  - Notes for `@coherentjs/core`:
    - `exports` maps `development` to `./src/index.js` and production to `./dist/*`. During website/dev flows we often import from `src` directly (see `scripts/serve-website.js`). Be mindful of ESM file URL imports used during dev.
- Dev website
  - Build and serve the demo website in one step:
    ```bash
    pnpm run website:dev
    ```
  - Production build + serve:
    ```bash
    pnpm run website:start
    ```
- Lint/format/typecheck
  - Lint (strict rules tuned for this repo; see notes below):
    ```bash
    pnpm run lint
    ```
  - Auto-fix:
    ```bash
    pnpm run lint:fix
    ```
  - Formatting (Prettier):
    ```bash
    pnpm run format
    ```
  - Type checking (TypeScript is used for types only in some packages):
    ```bash
    pnpm run typecheck
    ```


## 2) Testing

The mono‑repo uses Vitest v3 with a root `vitest.config.js` and several package‑level configs. Test isolation is enabled via `pool: 'forks'` and `isolate: true` to avoid cross‑suite state bleed.

- Run the full test suite from the root:
  ```bash
  pnpm test
  ```
  - Aliases: `pnpm test:vitest`, `pnpm test:watch`, `pnpm test:ui`
  - Coverage (V8 provider, multi‑report output):
    ```bash
    pnpm test:coverage
    ```
    Reports are written to `coverage/` (HTML at `coverage/lcov-report/index.html`).

- Per‑package test runs
  - Example (core):
    ```bash
    pnpm --filter @coherentjs/core run test
    ```
  - Watch mode in a package:
    ```bash
    pnpm --filter @coherentjs/core run test:watch
    ```

- Focus a single test file (most reliable approach in this monorepo)
  - Use the package’s own test script and pass the relative path:
    ```bash
    pnpm --filter @coherentjs/core run test -- test/some-file.test.js
    ```
  - Alternatively from the root (Vitest should respect explicit file paths, but depending on config it may still collect the workspace). The package‑scoped approach above avoids surprises.

- Test discovery conventions
  - Root config includes both:
    - `packages/*/test/**/*.{test,spec}.{js,ts}`
    - `packages/*/src/**/*.{test,spec}.{js,ts}`
  - Several packages (e.g., `@coherentjs/core`) also ship their own `vitest.config.js` with `include: ['test/**/*.{test,spec}.{js,ts}']`.
  - Place new tests under the corresponding package’s `test/` directory unless you have a strong reason to colocate under `src/`.

- Runtime environment and isolation
  - Default environment is `node`. Browser APIs must be mocked/shimmed within tests.
  - Vitest forks pool is enabled at root. Do not rely on cross‑suite globals; keep tests hermetic. Use `vi.clearAllMocks()` et al. where needed (root enables `clearMocks`/`restoreMocks`).

- Browser‑like tests
  - For client‑side utilities, create light shims as done in `packages/client/test/event-system.test.js`:
    ```js
    global.window = { __coherentEventRegistry: {}, addEventListener: vi.fn() };
    global.document = { querySelector: vi.fn(), querySelectorAll: vi.fn(() => []) };
    ```
  - Prefer explicit mocks over global side effects; reset state in `beforeEach`.

### 2.1 Demonstration: adding and executing a new test

We verified that adding a simple test under `@coherentjs/core` is correctly discovered and executed. Example test body (works with the current HEAD):

```js
// packages/core/test/example-render.test.js
import { describe, it, expect } from 'vitest';
import { renderToString } from '../src/index.js';

describe('renderToString smoke', () => {
  it('renders a simple element', async () => {
    const html = await renderToString({ div: { text: 'Hello World' } });
    expect(html).toContain('Hello World');
  });
});
```

Run just this file (package‑scoped):
```bash
pnpm --filter @coherentjs/core run test -- test/example-render.test.js
```

Run the full suite (root):
```bash
pnpm test
```

We executed an equivalent temporary test to validate the flow before writing this document.


## 3) Additional Development Notes

- Code style (see `eslint.config.js`)
  - ESM across the repo. Prefer `const`, forbid `var`, require `eqeqeq`.
  - Disallow `eval` and implied eval; disallow `new Function`.
  - `no-console` is allowed for server‑side code; debugging statements (`debugger`) are errors.
  - Tests and examples may be more permissive; errors and warnings are tuned per package.
- Package exports and dev mapping
  - `@coherentjs/core` uses conditional exports. In development, imports may resolve to `src` (see `exports.development`). This is leveraged by website/dev scripts that import via `file://` URLs into `src`.
  - If your code depends on bundling behavior, test both dev (`src`) and built (`dist`) paths.
- Performance and streaming
  - The framework focuses on object‑based rendering and streaming SSR. When adding features in `@coherentjs/core/src/index.js`, prefer stateless helpers; if stateful, ensure they are compatible with streaming and memoization.
- Long‑running/integration tests
  - A root `test-server.js` exists for integration scenarios. Keep such tests isolated and off the critical path for fast unit CI; prefer unit tests under each package.
- Coverage strategy
  - Root config excludes dist, coverage artifacts, and config files from coverage. Use `pnpm test:coverage` at root; package‑level coverage is supported where `vitest.config.js` exists.
- CI and releases
  - Changesets is used for versioning/publishing. The `release` script runs `build` and `test` before publish. Keep tests fast and deterministic to avoid flaky releases.


## 4) Common pitfalls and tips

- Focused test runs: In this monorepo, running `vitest run <file>` from the root may still collect other workspaces depending on config. Prefer package‑scoped runs with `pnpm --filter <pkg> run test -- <relative-path>` for deterministic targeting.
- Globals and isolation: Root Vitest enables process isolation (`pool: 'forks'`) and clears/restores mocks between tests. Do not leak state via `global.*`; always reset in hooks.
- ESM only: Use `import`/`export`. Avoid CommonJS `require` unless you are in a `dist/*` artifact or a script that explicitly supports CJS.
- Node engine: Ensure Node 20+; many scripts assume modern runtime features and URL‑based dynamic imports.


## 5) Quick reference

- Install: `pnpm i`
- Build all: `pnpm build:packages`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Test all: `pnpm test`
- Test package only: `pnpm --filter @coherentjs/core run test`
- Test single file (core): `pnpm --filter @coherentjs/core run test -- test/example-render.test.js`

