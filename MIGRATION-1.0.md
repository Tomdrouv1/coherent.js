# Coherent.js v1.0 Migration Guide

This guide covers everything that changed between `1.0.0-beta.8` and `1.0.0`. The 1.0 cutover was deliberately treated as the last cheap opportunity to make structural improvements; the changes are larger than a typical patch release but smaller than a major rewrite.

**TL;DR for beta users:**

1. Replace your `@coherent.js/express`, `@coherent.js/fastify`, etc. imports with `@coherent.js/integrations/express`, `@coherent.js/integrations/fastify`, etc.
2. Replace your `@coherent.js/build-tools/*` imports with `@coherent.js/cli/build-tools/*`.
3. Replace your `@coherent.js/performance/*` imports with `@coherent.js/devtools/performance/*`.
4. If you imported anything from `@coherent.js/runtime` or `@coherent.js/web-components`, pin your existing `1.0.0-beta.8` — those packages are dropped in 1.0.
5. If you used `legacyHydrate` / `hydrateAll` / `hydrateBySelector` / `enableClientEvents` / `makeHydratable` / `autoHydrate` / `registerEventHandler`, replace with `hydrate()`.
6. If you used `createForm` / `formValidators` / `enhancedForm`, replace with `createFormBuilder` + `hydrateForm`.
7. Direct imports of `@coherent.js/client/src/hmr.js` now throw — import `{ hmrClient }` from `@coherent.js/client` instead.

See the quick-scan table below for the full list with one-line fixes. The remaining sections expand each entry.

---

## Quick scan

| Change | Fix |
|---|---|
| `@coherent.js/express` removed | Replace import with `@coherent.js/integrations/express` |
| `@coherent.js/fastify` removed | Replace with `@coherent.js/integrations/fastify` |
| `@coherent.js/koa` removed | Replace with `@coherent.js/integrations/koa` |
| `@coherent.js/nextjs` removed | Replace with `@coherent.js/integrations/nextjs` |
| `@coherent.js/adapters` (astro/remix/sveltekit) removed | Replace with `@coherent.js/integrations/{astro,remix,sveltekit}` |
| `@coherent.js/build-tools` removed | Replace with `@coherent.js/cli/build-tools[/vite\|/webpack\|/rollup\|/loader]` |
| `@coherent.js/performance` removed | Replace with `@coherent.js/devtools/performance/{cache,code-splitting,lazy-loading}` |
| `@coherent.js/profiler` removed | Use `@coherent.js/devtools` directly (substantive profiler already lives there) |
| `@coherent.js/language-server` removed | The `coherent-language-server` binary now ships from `@coherent.js/tooling` |
| `@coherent.js/language-service` removed | Absorbed into `@coherent.js/tooling` |
| `@coherent.js/testing` removed | Replace with `@coherent.js/tooling/testing` |
| `@coherent.js/runtime` removed (no 1.0 replacement) | Pin `1.0.0-beta.8` if needed; the edge-runtime story moves to a separate extras repo post-1.0 |
| `@coherent.js/web-components` removed (no 1.0 replacement) | Pin `1.0.0-beta.8` if needed |
| `legacyHydrate`, `hydrateAll`, `hydrateBySelector`, `enableClientEvents`, `makeHydratable`, `autoHydrate`, `registerEventHandler` removed from `@coherent.js/client` | Use `hydrate()` |
| `@coherent.js/client/src/hmr.js` direct imports throw | Import `{ hmrClient }` from `@coherent.js/client` |
| `@coherent.js/client/hydration` subpath export removed | No replacement — the underlying 1,857-line file is gone; use modern `hydrate()` |
| `createForm`, `formValidators`, `enhancedForm` removed from `@coherent.js/forms` | Use `createFormBuilder` + `hydrateForm` |
| `@coherent.js/forms/forms` subpath export removed | Source file is gone |
| `@coherent.js/forms/advanced-validation` subpath export removed | Source file is gone |
| `createFormBuilder({ fields: [...] })` now actually registers passed fields | Previously a silent no-op; this is a bugfix that may surprise callers who relied on the no-op behavior — but no such caller is known |

---

## Package renames

The 1.0 release consolidates the workspace from 21+ packages down to 12, plus the standalone `@coherent.js/vscode-extension`. Most renames are mechanical import-path updates.

### Integrations consolidation (Wave 2c)

The five framework-integration packages now ship as subpath exports of a single `@coherent.js/integrations` package.

| Old import | New import |
|---|---|
| `from '@coherent.js/express'` | `from '@coherent.js/integrations/express'` |
| `from '@coherent.js/fastify'` | `from '@coherent.js/integrations/fastify'` |
| `from '@coherent.js/koa'` | `from '@coherent.js/integrations/koa'` |
| `from '@coherent.js/nextjs'` | `from '@coherent.js/integrations/nextjs'` |
| `from '@coherent.js/adapters/astro'` | `from '@coherent.js/integrations/astro'` |
| `from '@coherent.js/adapters/remix'` | `from '@coherent.js/integrations/remix'` |
| `from '@coherent.js/adapters/sveltekit'` | `from '@coherent.js/integrations/sveltekit'` |

**sed one-liners (run from your repo root):**

```bash
# Linux / GNU sed
find . -name '*.js' -o -name '*.mjs' -o -name '*.ts' -o -name '*.tsx' \
  | xargs sed -i 's|@coherent.js/express|@coherent.js/integrations/express|g'

# macOS / BSD sed
find . \( -name '*.js' -o -name '*.mjs' -o -name '*.ts' -o -name '*.tsx' \) \
  -exec sed -i '' 's|@coherent.js/express|@coherent.js/integrations/express|g' {} +
```

Repeat for `fastify`, `koa`, `nextjs`, `adapters/astro`, `adapters/remix`, `adapters/sveltekit`. Six runs total covers all framework renames.

Update your `package.json` `dependencies`/`devDependencies` accordingly:

```bash
# Remove old packages
pnpm remove @coherent.js/express @coherent.js/fastify @coherent.js/koa @coherent.js/nextjs @coherent.js/adapters

# Add the consolidated one
pnpm add @coherent.js/integrations
```

### Build-tools consolidation (Wave 2b)

Vite, Webpack, Rollup plugins and the file loader now ship as subpath exports of `@coherent.js/cli`.

| Old import | New import |
|---|---|
| `from '@coherent.js/build-tools'` | `from '@coherent.js/cli/build-tools'` |
| `from '@coherent.js/build-tools/vite'` | `from '@coherent.js/cli/build-tools/vite'` |
| `from '@coherent.js/build-tools/webpack'` | `from '@coherent.js/cli/build-tools/webpack'` |
| `from '@coherent.js/build-tools/rollup'` | `from '@coherent.js/cli/build-tools/rollup'` |
| `from '@coherent.js/build-tools/loader'` | `from '@coherent.js/cli/build-tools/loader'` |

```bash
pnpm remove @coherent.js/build-tools
pnpm add @coherent.js/cli
```

(`@coherent.js/cli` was already a devDep in most projects via the `coherent` binary.)

### Performance utilities consolidation (Wave 2b)

The cache, code-splitting, and lazy-loading utilities now live under `@coherent.js/devtools/performance/*`.

| Old import | New import |
|---|---|
| `from '@coherent.js/performance/cache'` | `from '@coherent.js/devtools/performance/cache'` |
| `from '@coherent.js/performance/code-splitting'` | `from '@coherent.js/devtools/performance/code-splitting'` |
| `from '@coherent.js/performance/lazy-loading'` | `from '@coherent.js/devtools/performance/lazy-loading'` |

```bash
pnpm remove @coherent.js/performance @coherent.js/profiler
pnpm add @coherent.js/devtools
```

The `@coherent.js/profiler` package was 138 lines of placeholder scaffolding; the substantive profiling code already lived in `@coherent.js/devtools`.

### Tooling consolidation (Wave 2b)

The dev-time tooling packages (LSP server, language service, testing utilities) consolidated into `@coherent.js/tooling`. The `coherent-language-server` binary is unchanged.

| Old import | New import |
|---|---|
| `from '@coherent.js/testing'` | `from '@coherent.js/tooling/testing'` |
| `bin: coherent-language-server` from `@coherent.js/language-server` | `bin: coherent-language-server` from `@coherent.js/tooling` |
| (any internal use of `@coherent.js/language-service`) | absorbed into `@coherent.js/tooling`; no public API was exposed |

```bash
pnpm remove @coherent.js/testing @coherent.js/language-server @coherent.js/language-service
pnpm add -D @coherent.js/tooling
```

---

## Removed APIs (Wave 1)

### `@coherent.js/client` legacy hydration

Seven legacy exports were removed. All of them are replaced by the single modern `hydrate()` function.

| Removed | Replacement |
|---|---|
| `legacyHydrate(...)` | `hydrate(component, container, options)` |
| `hydrateAll(...)` | `hydrate()` per root, or use `@coherent.js/cli` scaffolding |
| `hydrateBySelector(selector, component)` | `hydrate(component, document.querySelector(selector))` |
| `enableClientEvents()` | Automatic — `hydrate()` initializes event delegation |
| `makeHydratable(component)` | Not needed — any pure-object component is hydratable |
| `autoHydrate(registry)` | Hydrate roots explicitly with `hydrate()` |
| `registerEventHandler(name, fn)` | Define event handlers inline on the component (`onClick: () => {...}`) |

**Before:**

```js
import { legacyHydrate, makeHydratable, autoHydrate } from '@coherent.js/client';

const MyComponent = makeHydratable(({ count = 0 }) => ({
  button: { text: `count is ${count}`, onClick: () => count++ },
}));

autoHydrate({ MyComponent });
```

**After:**

```js
import { hydrate } from '@coherent.js/client';

const MyComponent = ({ count = 0 }) => ({
  button: {
    text: `count is ${count}`,
    onClick: () => { /* use setState from hydrate's return */ },
  },
});

const container = document.getElementById('my-root');
const { setState } = hydrate(MyComponent, container, { initialState: { count: 0 } });
```

The `./hydration` subpath export (which pointed at the deleted `hydration.js`) is also gone.

### `@coherent.js/client` HMR direct imports

Direct imports of `@coherent.js/client/src/hmr.js` (the deprecated shim) now throw a clear migration error at module load:

**Before:**

```js
import { something } from '@coherent.js/client/src/hmr.js';
```

**After:**

```js
import { hmrClient, HMRClient, createHotContext } from '@coherent.js/client';
// Or, if you only need the singleton:
import { hmrClient } from '@coherent.js/client';
hmrClient.initialize();
```

The HMR API surface is unchanged; only the import path moved (and was actually never the supported one — the shim was an oversight).

### `@coherent.js/forms` removed APIs

Three exports and two subpath exports were removed.

| Removed | Replacement |
|---|---|
| `createForm(definition)` | `createFormBuilder().fields([...])` |
| `formValidators` | Pass validators inline on form fields via `createFormBuilder` |
| `enhancedForm(form, opts)` | `hydrateForm(formElement, options)` |
| `./forms` subpath export | Source file is gone — re-export was a fossil from before the consolidation |
| `./advanced-validation` subpath export | Same |

**Before:**

```js
import { createForm, formValidators } from '@coherent.js/forms';

const ContactForm = createForm({
  fields: [
    { name: 'email', type: 'email', validator: formValidators.email },
    { name: 'message', type: 'textarea' },
  ],
});
```

**After:**

```js
import { createFormBuilder } from '@coherent.js/forms';

const ContactForm = createFormBuilder({
  fields: [
    { name: 'email', type: 'email', validate: (v) => /\S+@\S+\.\S+/.test(v) },
    { name: 'message', type: 'textarea' },
  ],
});
```

**Behavior bugfix:** `createFormBuilder({ fields: [...] })` used to silently ignore the `fields` array; you had to call `.field(...)` chained afterwards. Now the passed fields are actually registered. If your code worked despite this no-op (because it also called `.field(...)`), the behavior is a strict superset — no break. If your code relied on the no-op, it's a bugfix that may surprise you, but no such caller is known.

---

## Removed packages

### `@coherent.js/runtime`

The universal-runtime story (edge workers, Deno, Bun, Electron, Tauri) is post-1.0. No drop-in replacement in 1.0.

**Migration options:**
1. **Pin your existing `1.0.0-beta.8` version** if you need the integration: `pnpm add @coherent.js/runtime@1.0.0-beta.8`. The published beta-tag remains on npm.
2. **Use `@coherent.js/core` + your runtime's native HTTP server**. The framework's pure-object rendering doesn't depend on the runtime package; only the universal HTTP adapter glue was unique to it. For most edge workers (Cloudflare Workers, Vercel Edge, etc.) the native APIs are simple enough that a thin handcrafted adapter is cleaner.
3. **Track the post-1.0 extras repo** (TBD URL) where `@coherent.js/runtime` will live as `0.x`.

### `@coherent.js/web-components`

The Custom Elements integration was a single 151-line file with no consumers outside the also-removed `@coherent.js/runtime` package.

**Migration options:**
1. **Pin `1.0.0-beta.8`** if you need it: `pnpm add @coherent.js/web-components@1.0.0-beta.8`.
2. **Fold the small amount of code into your own project**. The file's source is preserved in the git history at the `1.0.0-beta.8` tag.

### `@coherent.js/profiler`

138 lines of placeholder scaffolding with no public API. The substantive profiling code lived (and still lives) in `@coherent.js/devtools`. There's nothing to migrate — `@coherent.js/devtools` already had everything the profiler stub claimed to provide.

---

## `experimental_` symbol renames

**(None in 1.0.)** All symbols exported from 1.0 packages are committed to SemVer compatibility. Future "we ship it but reserve the right to change it" APIs will use the `experimental_` prefix; nothing in 1.0 needs that treatment.

---

## README claims that were removed

The framework's README previously made several headline claims that 1.0 either tightened or dropped because they weren't defensible against CI gates:

| Claim | Status in 1.0 | Reason |
|---|---|---|
| "42.7% improvement over OOP" | **Dropped** | Required maintaining an OOP-equivalent benchmark fixture; the upkeep cost outweighed the marketing value. Framework hasn't gotten slower — we just stopped asserting a number we couldn't gate. |
| "95%+ cache hit rate" | **Dropped** | Workload-dependent. A framework property can't honestly claim a workload-dependent number. |
| "80.7KB gzipped bundle" | **Dropped (aggregate)** | Single-snapshot measurement that didn't represent a typical consumer's bundle (consumers import specific subpaths). Replaced with per-package gates: each package has a `bundle-size.json` baseline checked in, and CI fails any PR that grows a package's bundle by more than ±5%. See `packages/*/bundle-size.json` for the actual numbers. |
| "79.5% tree-shake reduction" | **Dropped** | No tree-shake reduction gate exists in 1.0; the number wasn't reproducible from any committed benchmark. Removing the claim was more honest than leaving an ungated assertion. |
| "247 renders/sec" | **Retained** | Defensible measurement from `benchmarks/benchmark.js`. A render-throughput gate is a future enhancement (would defend the number with CI variance management). |

---

## What was added in 1.0

This guide focuses on breaking changes for beta users. New features added during the hardening waves:

- **Built-in HMR dev server** (`coherent dev --coherent`) — HTTP + WebSocket + chokidar in-process, no vite/webpack/nodemon required for static-served projects. See the README "Development" section or `packages/cli/src/dev-server/` for source.
- **API surface lockdown** — every public symbol per package is snapshotted to `packages/<name>/api-surface.txt`; CI fails any PR that changes the surface without updating the snapshot. Prevents accidental breaking changes across 1.x.
- **Per-package bundle-size gates** — each package's `dist/index.js` raw + gzipped sizes are baselined to `packages/<name>/bundle-size.json`; CI fails PRs that grow either by more than ±5%.
- **Playwright E2E suite** — six audit-item flows automated against the dev server in real Chromium. See `e2e/`.
- **VS Code extension publish-readiness** — `scripts/check-vsix.mjs` + CI vsix job + `packages/vscode-extension/PUBLISHING.md` runbook.

---

## Getting help

- **Bug or migration confusion**: open an issue at https://github.com/Tomdrouv1/coherent.js/issues — include your `pnpm list --depth=0` output and the import paths you're stuck on.
- **General questions**: GitHub Discussions (https://github.com/Tomdrouv1/coherent.js/discussions).
- **The CHANGELOG** has every wave's detailed entry with reasoning, ordered chronologically. Useful if you're upgrading from a much older beta and need the full timeline.
