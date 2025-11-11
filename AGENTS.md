# AGENTS.md

Guidance for any AI code assistant (ChatGPT, Claude, Copilot, Code Llama, etc.) working in this repository. Keep edits minimal, deterministic, and consistent with the project's tooling and conventions.

## Project Overview

Coherent.js is a high-performance server-side rendering framework centered on pure JavaScript objects. The repo is a pnpm monorepo with multiple packages under `packages/*` and strict ESM across the codebase.

Key properties:
- Node.js: >= 20 (enforced via engines)
- Package manager: pnpm (workspace/monorepo)
- Module system: ESM (no CommonJS unless in `dist/*` artifacts)
- Tests: Vitest v3 with process isolation (`pool: 'forks'`, `isolate: true`)

Useful root files:
- `vitest.config.js` – Root testing config and coverage settings
- `eslint.config.js` – Lint rules and globals
- `package.json` – Scripts used throughout the repo
- `.junie/guidelines.md` – Deep project-specific runbooks (build/test tips)

Primary packages (examples, not exhaustive):
- `@coherent.js/core` – Core runtime and rendering
- `@coherent.js/client` – Client-side hydration utilities
- `@coherent.js/testing` – Testing helpers for components
- Integration packages (Express/Fastify/Koa/Next, etc.) may be present

## Environment & Tooling Requirements

- Use Node 20+ only.
- Use pnpm for all installs and scripts; do not use npm/yarn.
- ESM only: prefer `import`/`export`; avoid `require()` outside of `dist/*` or scripts that explicitly support CJS.
- Respect conditional exports: `@coherent.js/core` maps `development` to `./src/index.js` and production to `./dist/*`. Dev tooling may import from `src` directly.

Install at the repo root:
```bash
pnpm install
```

## Commands Cheat Sheet

Build:
```bash
pnpm build            # build all packages
pnpm build:packages   # build all packages (stream output)
pnpm build:types      # build TS types (where applicable)
```

Website/dev:
```bash
pnpm website:dev      # dev website (build + serve in dev flow)
pnpm website:start    # production build + serve
```

Lint/format/typecheck:
```bash
pnpm lint             # strict ESLint rules
pnpm lint:fix         # apply fixes
pnpm format           # Prettier write
pnpm typecheck        # TypeScript noEmit checks
```

Examples (a subset):
```bash
pnpm example:basic
pnpm example:components
pnpm example:performance
pnpm example:streaming
pnpm example:hydration
```

## Testing Workflow (Vitest v3)

Global configuration lives in `vitest.config.js`:
- Environment: `node`
- Isolation: `pool: 'forks'`, `isolate: true`
- Clear and restore mocks between tests
- Coverage: V8 provider with `text`, `json`, `html`, `lcov` outputs
- Discovery includes:
  - `packages/*/test/**/*.{test,spec}.{js,ts}`
  - `packages/*/src/**/*.{test,spec}.{js,ts}`

Common commands:
```bash
pnpm test             # run full suite at root
pnpm test:watch       # watch mode
pnpm test:coverage    # run with coverage
```

Focused runs (preferred stability in a monorepo):
```bash
# Run a single test file in @coherent.js/core (most reliable approach)
pnpm --filter @coherent.js/core run test -- test/example-render.test.js
```

Notes:
- Root-level `vitest run <file>` may still collect other workspaces; prefer package-scoped runs.
- For browser-like tests, create shims (see `packages/client/test/event-system.test.js`). Example pattern:
  ```js
  global.window = { __coherentEventRegistry: {}, addEventListener: vi.fn() };
  global.document = { querySelector: vi.fn(), querySelectorAll: vi.fn(() => []) };
  ```
- Keep tests hermetic; do not rely on cross-suite globals.

Coverage output:
- Written to `coverage/` at root (`coverage/lcov-report/index.html` for HTML)

## Editing Guidelines for AI Agents

- Keep changes minimal and surgical. Avoid broad refactors unless explicitly requested.
- Match existing code style: ESM imports, prefer `const`, `eqeqeq`, no `eval` or implied eval, no `new Function`.
- Do not edit `dist/` artifact files or generated coverage/output directories.
- Respect conditional exports in `@coherent.js/core`: tests and website dev flows may import `src` via development export mapping.
- When adding tests, prefer placing them under `packages/<pkg>/test/` unless there's a compelling reason to colocate.
- Reset mocks/state between tests; avoid `global.*` leaks.
- If touching client-side utilities, add browser shims in tests as needed; default environment is Node.
- For performance-sensitive areas (streaming SSR, memoization), prefer stateless helpers; if stateful, ensure compatibility with streaming and memoization.
- Use package-scoped test runs to validate changes locally.

Safety/operational constraints:
- Use pnpm only; avoid yarn/npm.
- Avoid destructive shell operations (e.g., `rm -rf` outside allowed paths). Never delete `packages/` or critical configs.
- Do not run long-lived or networked services unless explicitly required.

## @coherent.js/core Specifics

- Conditional exports:
  ```json
  {
    "exports": {
      ".": {
        "development": "./src/index.js",
        "import": "./dist/index.js",
        "require": "./dist/index.cjs"
      }
    }
  }
  ```
- Some dev flows (e.g., website dev server) import `src` via file URLs. If changes rely on bundling behavior, validate both `src` (dev) and `dist` (built).
- CSS scoping and SSR streaming are core concerns; preserve behavior and avoid global side effects.

## Quick Tasks Examples

Add a new core test:
```bash
# Create: packages/core/test/example-render.test.js
# Content:
import { describe, it, expect } from 'vitest';
import { renderToString } from '../src/index.js';

describe('renderToString smoke', () => {
  it('renders a simple element', async () => {
    const html = await renderToString({ div: { text: 'Hello World' } });
    expect(html).toContain('Hello World');
  });
});

# Run it deterministically (package-scoped):
pnpm --filter @coherent.js/core run test -- test/example-render.test.js
```

Run all tests:
```bash
pnpm test
```

Format, lint, and typecheck:
```bash
pnpm format && pnpm lint && pnpm typecheck
```

Start website in dev:
```bash
pnpm website:dev
```

## Do / Don't Checklist

Do:
- Use Node 20+, pnpm, and ESM imports.
- Prefer package-scoped tests for focused runs.
- Keep tests hermetic; use shims for browser APIs.
- Maintain consistent code style and follow `eslint.config.js` rules.

Don't:
- Don't introduce CommonJS in `src/`.
- Don't modify `dist/`, `coverage/`, or generated outputs.
- Don't rely on cross-suite globals or shared state.
- Don't switch package manager or Node version requirements.

## References

- `.junie/guidelines.md` – Comprehensive project-specific development guide
- `vitest.config.js` – Root test config and isolation settings
- `packages/core/vitest.config.js` – Package-level test config
- `packages/client/test/event-system.test.js` – Example of browser shims in tests
- `package.json` (root) – Authoritative scripts for build/test/dev flows
