# Coherent.js v1.0 — Wave 5: Release (rc.1 cut) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Section 6 (Migration guide) and Section 7 (Wave 5 sequencing).

**Goal:** Cut `1.0.0-rc.1` locally — coordinated version bump across all 14 versioned package.json files, `MIGRATION-1.0.md` written and complete enough that beta users have a one-stop reference, `RELEASING.md` runbook so the user can drive the rest (push, npm publish, announce, soak, then bump to `1.0.0`). End state: a local annotated git tag `v1.0.0-rc.1` ready to push.

**Architecture:** Five focused commits, each independently revertable. The version bump is contained to package.json files (no source code changes); workspace deps stay `workspace:*` and resolve at publish time. The CHANGELOG promotion is a mechanical rename of `## [Unreleased]` → `## [1.0.0-rc.1] - <date>`. The new docs (`MIGRATION-1.0.md` at repo root for GitHub discoverability + `RELEASING.md` next to it) are the largest writing effort.

**What I'm NOT doing** (per the spec's "Wave 5 sequencing" — these are user-driven):
- `git push origin main` (you push when you're ready)
- `git push origin v1.0.0-rc.1` (same)
- `pnpm publish` to npm (needs your npm credentials)
- Discord/GitHub release announcement (your voice, your call)
- Wait 1-2 weeks for soak (clock-time, not Claude-time)
- Bump `rc.1` → `1.0.0` after soak (documented in `RELEASING.md` so you can do it in one short session)

After Wave 5 completes, your queue is:
1. Review the 5 new commits.
2. `git push origin main && git push origin v1.0.0-rc.1`.
3. `pnpm publish -r --access public --tag rc --no-git-checks` (or the convenience script we add).
4. Announce on Discord/GitHub. Link to MIGRATION-1.0.md.
5. Soak. If something needs fixing: patch + cut `rc.2` via the same script flow.
6. After ≥ 5 quiet days: follow `RELEASING.md`'s "Promoting rc to stable" section to bump → tag → publish `1.0.0`.

---

## Wave 5 explicitly NOT in scope

- **Website rewrite / docs site rebuild.** Spec Section 7 explicitly decouples this from npm release ("website can lag by a couple weeks pointing at old API"). The website's `package.json` is independently versioned (`1.0.0`) and lives in `website/` — Wave 5 doesn't touch it. The marketing announcement can ship before the website catches up.
- **Migration codemod packages.** Spec calls them out as "deferred (the sed one-liners are sufficient for the current user base)." MIGRATION-1.0.md includes the sed one-liners; no codemod tooling.
- **Edge-runtime story.** `@coherent.js/runtime` was dropped in Wave 2a. Per spec: "demoted to extras repo as 0.x." Not Wave 5's problem — Wave 5 just notes the dropped package in MIGRATION-1.0.md with a pointer to "track at <future extras repo URL>".
- **VS Code marketplace publish.** Wave 4c made the extension publish-ready and wrote `packages/vscode-extension/PUBLISHING.md`. Wave 5 bumps the extension's `package.json` to rc.1 in lockstep, so when you eventually run `vsce publish` it ships at `1.0.0-rc.1` (or `1.0.0` after the second bump). The actual publish is a separate runbook (`PUBLISHING.md`); RELEASING.md cross-references it.
- **`experimental_` symbol renames.** Spec Section 2 mentioned this as a possibility for "undecided APIs." Wave 3a's API surface snapshot shows no `experimental_` prefixes — nothing currently needs that treatment. The MIGRATION guide includes a "(none in 1.0)" note for completeness.
- **A formal "1.0 philosophy" essay or announcement blog post.** Spec puts this in the announcement, not in MIGRATION-1.0.md ("Operational doc. Marketing goes in the announcement blog post"). Wave 5 keeps MIGRATION-1.0.md operational.
- **Auto-publish on tag.** Not Wave 5's scope. We add a convenience `publish:rc` script to `package.json`; everything else stays manual. CI auto-publish is a security-surface concern deferred indefinitely (see Wave 4c notes).
- **Self-hosted CI runners for tighter perf gates.** Per spec Section 7, this is "deferred to post-1.0 if perf-gate variance becomes a real problem."

---

## What we ARE doing

| Task | Outcome |
|---|---|
| 1. Write `MIGRATION-1.0.md` | Single doc at repo root with: quick-scan table of all breakers, package-rename sed one-liners, removed-API before/after diffs, removed-package notes, removed README claims, plus a "no `experimental_` APIs in 1.0" disclaimer. |
| 2. Write `RELEASING.md` | Maintainer runbook: pre-release checklist, version-bump procedure, tag + publish flow for rc.x AND stable, marketplace publish cross-ref, rollback. |
| 3. Add `publish:rc` script + update beta-version doc refs | Root `package.json` gets a `publish:rc` script (`--tag rc`); two doc files lose their stale `1.0.0-beta.8` references. |
| 4. Coordinated version bump to `1.0.0-rc.1` | All 14 versioned `package.json`s flip atomically; CHANGELOG version-timeline ASCII art updated to reflect the cut. |
| 5. CHANGELOG cut + local tag | `## [Unreleased]` becomes `## [1.0.0-rc.1] - 2026-05-17`; new empty `## [Unreleased]` opens above it. Annotated git tag `v1.0.0-rc.1` created locally (NOT pushed). |

That's it. Five commits, one tag, ~3-5 hours of focused work mostly in MIGRATION-1.0.md.

---

## File Structure

| Path | Change | Responsibility |
|---|---|---|
| `MIGRATION-1.0.md` | Create | The 1.0 breaking-changes guide. ~200-400 lines. |
| `RELEASING.md` | Create | The maintainer release runbook. ~150-250 lines. |
| `package.json` (root) | Modify | Bump version `1.0.0-beta.8` → `1.0.0-rc.1`. Add `publish:rc` script. |
| `packages/<name>/package.json` (13 files) | Modify | Each bumped to `1.0.0-rc.1`. |
| `docs/getting-started/quick-start.md` | Modify | One-line replacement: `v1.0.0-beta.8` → `v1.0.0-rc.1` (or generic "current release"). |
| `docs/deployment/integrations.md` | Modify | Same — one beta.8 reference to update. |
| `README.md` | Modify | Update the "21 packages" claim (now stale post-Wave-2) → "12 packages" matching spec target. Also drop the `21 packages` mention in line 14 about tree-shaking. |
| `CHANGELOG.md` | Modify | (a) Update the Version Timeline ASCII art to add the `1.0.0-rc.1` row; (b) rename `## [Unreleased]` → `## [1.0.0-rc.1] - 2026-05-17`; (c) open a fresh empty `## [Unreleased]` block above. |
| (No source code changes) | — | Wave 5 is release-mechanics only. |

**Why no `pnpm-lock.yaml` change is expected**: bumping `version` fields doesn't change resolved deps (workspace deps stay `workspace:*` and resolve at publish time, not install time). If pnpm does want to re-resolve, that's fine; commit the lockfile alongside the bump.

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree + all prior wave gates green**

Run:
```bash
git status
pnpm test && pnpm run e2e && node scripts/check-api-surface.mjs --check && node scripts/check-bundle-size.mjs --check && pnpm --filter coherent-language-support run package && node scripts/check-vsix.mjs && rm -f packages/vscode-extension/coherent-language-support-*.vsix
```
Expected: working tree shows only pre-existing dirty noise; all gates green; vsix builds and checks pass.

- [ ] **Step 2: Confirm the version landscape**

Run: `grep -h '"version":' package.json packages/*/package.json | sort -u`
Expected: exactly two distinct version strings — `"version": "1.0.0-beta.8"` (14 occurrences) and `"version": "pnpm changeset version"` (the root scripts.version, an unrelated string match that we ignore). If there are stragglers at other versions, list them — they need attention before the bump.

- [ ] **Step 3: Confirm publish scripts**

Run: `grep -A1 '"scripts"' package.json | head -30`
Visually verify the root `package.json` has `publish:beta` and `publish:latest` scripts. Task 3 adds `publish:rc` next to them.

---

## Task 1: Write `MIGRATION-1.0.md`

**Files:**
- Create: `MIGRATION-1.0.md`

This is the longest task. It's a writing task — no code. The content is fully specified below; the implementer copies it verbatim, no judgment calls needed.

### Step 1: Create the file

Create `MIGRATION-1.0.md` at the repo root with the following content:

````markdown
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

````

### Step 2: Sanity-check the file

Run: `wc -l MIGRATION-1.0.md && head -5 MIGRATION-1.0.md`
Expected: ~280-350 lines, first line is the title.

### Step 3: Commit

```bash
git add MIGRATION-1.0.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs: add MIGRATION-1.0.md for v1.0 release

Adds the 1.0 migration guide at repo root for GitHub
discoverability. Structure follows spec Section 6:

1. TL;DR for beta users (7 most-likely-to-hit-you items)
2. Quick scan table (~20 rows, ctrl-F friendly)
3. Package renames (integrations, build-tools, performance,
   tooling) with sed one-liners and pnpm add/remove commands
4. Removed APIs (Wave 1 client legacy hydration, HMR import
   shim, forms deprecations) with before/after code
5. Removed packages (runtime, web-components, profiler) with
   migration options
6. experimental_ section — "(none in 1.0)" explicit
7. README claims that were removed (OOP comparison, cache hit
   rate, bundle aggregate, tree-shake) with reasoning
8. What was added in 1.0 (dev server, API surface lockdown,
   bundle-size gates, Playwright suite, vsix publish prep)
9. Getting help links

Operational doc — no marketing essay. The 1.0 announcement
blog post lives elsewhere.

First commit of Wave 5 (release) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Write `RELEASING.md`

**Files:**
- Create: `RELEASING.md`

### Step 1: Create the file

Create `RELEASING.md` at the repo root:

````markdown
# Releasing Coherent.js

Maintainer runbook for cutting releases. End users want `MIGRATION-1.0.md`.

## Release flavors

| Tag | npm dist-tag | When |
|---|---|---|
| `vX.Y.Z-beta.N` | `beta` | Pre-1.0 betas. No longer cut after 1.0. |
| `vX.Y.Z-rc.N` | `rc` | Release candidates. 1-2 week soak before promoting to stable. |
| `vX.Y.Z` | `latest` | Stable. Default for `pnpm add @coherent.js/core`. |

## Pre-release checklist (any cut)

```bash
git status                              # clean tree
pnpm test                               # all unit tests pass
pnpm run e2e                            # all Playwright tests pass
node scripts/check-api-surface.mjs --check
node scripts/check-bundle-size.mjs --check
pnpm --filter coherent-language-support run package && node scripts/check-vsix.mjs
rm -f packages/vscode-extension/coherent-language-support-*.vsix
```

All five gates must be green. CI runs all of them on every PR; a green main is your prerequisite.

## Cutting an `rc.N`

### 1. Bump versions

All 14 versioned `package.json` files (`package.json` at the root + 13 under `packages/`) move together. The vscode-extension is in lockstep with the framework.

Easiest one-shot:

```bash
OLD=1.0.0-beta.8
NEW=1.0.0-rc.1   # bump accordingly
for f in package.json packages/*/package.json; do
  # macOS / BSD sed
  sed -i '' "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" "$f"
done
git diff --stat package.json packages/*/package.json   # should show 14 files, 14 +/14 -
```

For GNU sed, drop the `''` after `-i`.

Update the CHANGELOG.md Version Timeline ASCII art at the top to add the new row.

### 2. Cut the CHANGELOG

Rename the `## [Unreleased]` heading to `## [1.0.0-rc.1] - YYYY-MM-DD`. Open a fresh empty `## [Unreleased]` above it (with no subsections). Don't move content around — just rename.

### 3. Commit the bump

```bash
git add package.json packages/*/package.json CHANGELOG.md
git commit -m "release: 1.0.0-rc.1"
```

### 4. Tag locally

```bash
git tag -a v1.0.0-rc.1 -m "Coherent.js 1.0.0-rc.1"
```

### 5. Push (irreversible from here)

```bash
git push origin main
git push origin v1.0.0-rc.1
```

### 6. Publish to npm

```bash
pnpm publish -r --access public --tag rc --no-git-checks
# or, after Task 3 of Wave 5:
pnpm run publish:rc
```

`pnpm publish -r` walks the workspace; each package publishes independently. `workspace:*` deps are rewritten to the actual version (`1.0.0-rc.1`) at publish time.

Users install with `pnpm add @coherent.js/core@rc`.

### 7. Publish the VS Code extension

Cross-reference: `packages/vscode-extension/PUBLISHING.md`. Short version:

```bash
pnpm --filter coherent-language-support run clean
pnpm --filter coherent-language-support run package
node scripts/check-vsix.mjs
pnpm --filter coherent-language-support exec vsce publish --no-dependencies
```

`vsce publish` needs your marketplace PAT — see PUBLISHING.md for the one-time setup if you haven't done it.

### 8. Announce

GitHub Releases (auto-attached to the tag — fill in release notes referencing MIGRATION-1.0.md), Discord. Link MIGRATION-1.0.md prominently.

### 9. Soak

Watch for bug reports. The spec budget is 1-2 weeks. If something needs fixing:

- Patch + cut `1.0.0-rc.2` via this same flow (bump versions, CHANGELOG, tag, publish).
- If multiple rcs are needed that's fine — better than shipping a broken stable.

Don't bump to stable until the rc has been quiet for ≥ 5 days (spec criterion).

## Promoting rc to stable (1.0.0)

After the soak, repeat the rc flow with two changes:

1. **NEW version**: `1.0.0` (no `-rc.N`).
2. **npm dist-tag**: `latest` (the default), not `rc`.

```bash
OLD=1.0.0-rc.1  # or whichever rc you last cut
NEW=1.0.0
for f in package.json packages/*/package.json; do
  sed -i '' "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" "$f"
done

# Update CHANGELOG: rename [Unreleased] → [1.0.0] - YYYY-MM-DD
# Update Version Timeline ASCII art at top

git add package.json packages/*/package.json CHANGELOG.md
git commit -m "release: 1.0.0"
git tag -a v1.0.0 -m "Coherent.js 1.0.0"
git push origin main v1.0.0

# Publish — defaults to 'latest' dist-tag
pnpm run publish:latest

# VS Code extension
pnpm --filter coherent-language-support run clean
pnpm --filter coherent-language-support run package
node scripts/check-vsix.mjs
pnpm --filter coherent-language-support exec vsce publish --no-dependencies
```

GitHub Release: auto-attached to `v1.0.0`. Include a "thank you to rc testers" section if applicable.

## Post-release (any cut)

- Verify the marketplace listing reflects the new version: https://marketplace.visualstudio.com/items?itemName=coherentjs.coherent-language-support
- Verify each npm listing reflects the new version: `npm view @coherent.js/core versions --json | jq '.[-3:]'` (last 3 should include yours)
- Bump local working-tree to `<next>-beta.0` if continuing development immediately; or leave it on the stable version if no further work is planned this cycle.

## Patches (1.0.x)

Same flow as a stable cut, with version pattern `1.0.<N+1>`. No rc needed for patch releases (unless the change is invasive). Pre-release checklist still applies.

## Rollback

Once published, npm versions are immutable (npm allows `unpublish` only within 72 hours of publish and only if no other packages depend on it). The realistic rollback is to **cut a fixed patch version**:

1. Revert or fix the broken commit.
2. Bump to the next patch (`1.0.<N+1>`).
3. Publish via the patch flow above.
4. Add a note to the CHANGELOG explaining what broke.

For the VS Code extension specifically, `vsce unpublish` is possible — see `packages/vscode-extension/PUBLISHING.md` Rollback section.

## When NOT to release

- Working tree dirty.
- Any gate red (test, e2e, api-surface, bundle-size, vsix).
- Within 24h of a known external dep regression (e.g., the chokidar release that breaks our watcher) — wait for the upstream fix.
- During an active incident affecting consumers (don't ship a new version on top of a still-being-diagnosed problem).
````

### Step 2: Commit

```bash
git add RELEASING.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs: add RELEASING.md maintainer runbook

Adds the release runbook at repo root for maintainers. Covers:

- Release flavors: beta/rc/latest dist-tags
- Pre-release checklist (test, e2e, api-surface, bundle-size,
  vsix — must all be green)
- Cutting an rc: bump versions (sed one-liner for all 14
  package.jsons), cut CHANGELOG, tag, push, publish (`--tag rc`),
  publish extension via PUBLISHING.md, announce, soak ≥5 days
- Promoting rc → stable: same flow, NEW=1.0.0, dist-tag latest
- Post-release verification (marketplace + npm view)
- Patch flow (1.0.<N+1>, no rc needed unless invasive)
- Rollback strategy (npm versions immutable → cut patch; vsce
  unpublish possible per PUBLISHING.md)
- When NOT to release (red gate, dirty tree, upstream
  regression, active incident)

Cross-references PUBLISHING.md (VS Code) and MIGRATION-1.0.md
(end-user breaking-changes guide).

Second commit of Wave 5 (release).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add `publish:rc` script + drop stale beta refs from docs

**Files:**
- Modify: `package.json` (root)
- Modify: `docs/getting-started/quick-start.md`
- Modify: `docs/deployment/integrations.md`
- Modify: `README.md`

### Step 1: Add `publish:rc` script

Open root `package.json`. Find the `scripts.publish:beta` and `scripts.publish:latest` lines (around line 28-29). Add a new line between them or right after:

```json
    "publish:beta": "pnpm publish -r --access public --tag beta --no-git-checks",
    "publish:rc": "pnpm publish -r --access public --tag rc --no-git-checks",
    "publish:latest": "pnpm publish -r --access public --no-git-checks",
```

### Step 2: Update docs that hardcode the beta version

`docs/getting-started/quick-start.md` line 34:

```markdown
> **Note**: Coherent.js is currently in beta (v1.0.0-beta.8).
```

Replace with a more durable phrasing:

```markdown
> **Note**: Coherent.js 1.0 is currently in release-candidate. Install with `pnpm add @coherent.js/core@rc`. The stable release follows after a 1-2 week soak.
```

`docs/deployment/integrations.md` line ~615:

```markdown
> **Note**: Use `@beta` tag for the current beta release (v1.0.0-beta.8).
```

Replace with:

```markdown
> **Note**: Use `@rc` for the current release candidate or omit the tag (defaults to the latest stable once released).
```

### Step 3: Update README package-count claim

`README.md` line 14 says "across all 21 packages" (or similar). Find and update to match the actual 1.0 workspace size — 12 published packages (per the spec target; vscode-extension is the 13th workspace member but ships via marketplace, not npm).

Use grep to confirm what to change:

```bash
grep -n "21 packages\|across all.*packages" README.md
```

Replace each occurrence with `across all 12 packages` (or `across 12 packages` — match the surrounding text style).

### Step 4: Commit

```bash
git add package.json docs/getting-started/quick-start.md docs/deployment/integrations.md README.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
chore: add publish:rc script + scrub stale beta.8 doc references

Adds `publish:rc` to root package.json scripts:
  pnpm publish -r --access public --tag rc --no-git-checks

Slots between publish:beta and publish:latest. Used by the
RELEASING.md rc-cut flow.

Also updates two docs that hard-coded `v1.0.0-beta.8`:
- docs/getting-started/quick-start.md → reframes as "rc + soak"
  rather than fossilizing a specific version number
- docs/deployment/integrations.md → same, generalizes the tag
  guidance

And updates README.md's stale "21 packages" claim to "12
packages" matching the spec's consolidation target (vscode-
extension is the 13th workspace member but ships via
marketplace, not npm).

Third commit of Wave 5 (release).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Coordinated version bump to `1.0.0-rc.1`

**Files:**
- Modify: `package.json` (root)
- Modify: `packages/api/package.json`
- Modify: `packages/cli/package.json`
- Modify: `packages/client/package.json`
- Modify: `packages/core/package.json`
- Modify: `packages/database/package.json`
- Modify: `packages/devtools/package.json`
- Modify: `packages/forms/package.json`
- Modify: `packages/i18n/package.json`
- Modify: `packages/integrations/package.json`
- Modify: `packages/seo/package.json`
- Modify: `packages/state/package.json`
- Modify: `packages/tooling/package.json`
- Modify: `packages/vscode-extension/package.json`
- Modify: `CHANGELOG.md` (Version Timeline ASCII art only — the [Unreleased] cut happens in Task 5)

### Step 1: Bump all 14 versioned package.json files

Run the sed one-liner (macOS / BSD sed):

```bash
for f in package.json packages/api/package.json packages/cli/package.json \
         packages/client/package.json packages/core/package.json \
         packages/database/package.json packages/devtools/package.json \
         packages/forms/package.json packages/i18n/package.json \
         packages/integrations/package.json packages/seo/package.json \
         packages/state/package.json packages/tooling/package.json \
         packages/vscode-extension/package.json; do
  sed -i '' 's/"version": "1.0.0-beta.8"/"version": "1.0.0-rc.1"/' "$f"
done
```

(GNU sed: drop the `''` after `-i`.)

Verify:

```bash
grep -h '"version":' package.json packages/*/package.json | sort -u
```
Expected: `"version": "1.0.0-rc.1",` (once) and `"version": "pnpm changeset version",` (scripts entry, unrelated). If any package still shows `beta.8`, repeat the sed for the specific file.

### Step 2: Update CHANGELOG Version Timeline ASCII art

Open `CHANGELOG.md`. Find the `## Version Timeline` block (around line 8). It currently shows `v1.0.0-beta.8 (CURRENT)` and `Future → v1.0.0 (PLANNED)`. Update:

```
📅 2026-04-06  →  v1.0.0-beta.8  (CURRENT)
                   ├─ Major website UI/UX overhaul
                   ├─ Website restructured as Coherent.js project
                   ├─ CI/CD and build fixes
                   └─ Dependency updates
```

Change `(CURRENT)` to no marker (it's no longer current), and add a new row above for rc.1:

```
📅 2026-05-17  →  v1.0.0-rc.1   (CURRENT)
                   ├─ Comprehensive structural hardening (Waves 1-4)
                   ├─ Workspace consolidated 21 → 12 packages
                   ├─ Built-in HMR dev server + Playwright E2E
                   └─ API surface + bundle size gates in CI

📅 2026-04-06  →  v1.0.0-beta.8
                   ├─ Major website UI/UX overhaul
                   ...
```

Also update the `Future` row:

```
📅 Future      →  v1.0.0         (PLANNED — after rc soak)
                   └─ First stable release
```

### Step 3: Run gates one more time (sanity)

The version bump shouldn't affect tests or gates, but verify:

```bash
pnpm test 2>&1 | tail -3
pnpm run e2e 2>&1 | tail -3
node scripts/check-api-surface.mjs --check 2>&1 | tail -2
node scripts/check-bundle-size.mjs --check 2>&1 | tail -2
```
Expected: all green. If anything broke from a version reference somewhere unexpected, fix it before commit.

### Step 4: Commit the bump

```bash
git add package.json packages/*/package.json CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
release: bump all packages to 1.0.0-rc.1

Coordinated version bump across the 14 versioned package.json
files (root + 12 published packages + vscode-extension). All
move in lockstep per the v1.0 release plan.

The CHANGELOG's Version Timeline ASCII art at the top is
updated to add the rc.1 row and demote beta.8 from CURRENT.

The CHANGELOG `## [Unreleased]` heading promotion to
`## [1.0.0-rc.1]` happens in the next commit (Task 5 — paired
with the local git tag so the cut is atomic).

Workspace deps stay `workspace:*` and rewrite to the actual
version at publish time. No source changes — release mechanics
only.

Fourth commit of Wave 5 (release).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: CHANGELOG cut + local git tag

**Files:**
- Modify: `CHANGELOG.md`

This is the "release cut" itself — the CHANGELOG `[Unreleased]` block gets renamed to `[1.0.0-rc.1] - <date>`, a new empty `[Unreleased]` opens above, and the annotated git tag is created locally.

### Step 1: Promote Unreleased to 1.0.0-rc.1

Open `CHANGELOG.md`. Find the `## [Unreleased]` heading. Rename to:

```markdown
## [1.0.0-rc.1] - 2026-05-17
```

Immediately above that (between `## Version Timeline` block end and the new heading), insert a fresh empty Unreleased:

```markdown
## [Unreleased]

(No entries yet.)

```

So the structure becomes:

```markdown
## Version Timeline

```
<ASCII art>
```

## [Unreleased]

(No entries yet.)

## [1.0.0-rc.1] - 2026-05-17

### Removed
...
```

Do NOT move or alter any of the wave entries — they stay exactly as they are, just under the new heading.

### Step 2: Commit the cut

```bash
git add CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
release: cut CHANGELOG for 1.0.0-rc.1

Renames `## [Unreleased]` → `## [1.0.0-rc.1] - 2026-05-17`,
preserving every wave subsection underneath. Opens a fresh
empty `## [Unreleased]` block above for future work.

This is the formal "release cut" — paired with the local
v1.0.0-rc.1 annotated git tag (next step, no separate commit).

After this commit, push + publish:
  git push origin main
  git push origin v1.0.0-rc.1
  pnpm run publish:rc
  # Then per RELEASING.md: VS Code extension, announce, soak.

Fifth and final commit of Wave 5 (release).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 3: Create the annotated tag locally (DO NOT push)

```bash
git tag -a v1.0.0-rc.1 -m "Coherent.js 1.0.0-rc.1

First release candidate of the v1.0 stable release. After a
1-2 week soak with no quiet-period regressions, this becomes
1.0.0.

See MIGRATION-1.0.md for the breaking changes guide and
RELEASING.md for the release process."
```

Verify the tag is local:

```bash
git tag -l 'v1.0.0*'
# expected: v1.0.0-rc.1
git ls-remote --tags origin v1.0.0-rc.1
# expected: empty (not yet pushed)
```

### Step 4: Print the post-Wave-5 next-steps

Output the following so the user sees it after Wave 5 wraps:

```
Wave 5 complete locally. Five commits + one annotated tag (v1.0.0-rc.1).

When you're ready to publish:
  git push origin main
  git push origin v1.0.0-rc.1
  pnpm run publish:rc

Then per RELEASING.md:
  - VS Code extension (PUBLISHING.md)
  - GitHub Release notes referencing MIGRATION-1.0.md
  - Discord announcement
  - 1-2 week soak before promoting to 1.0.0
```

---

## Post-Wave-5 handoff

Wave 5 is done locally. The repo holds:
- 5 new commits adding MIGRATION-1.0.md, RELEASING.md, the publish:rc script, version bumps, and the CHANGELOG cut
- 1 local annotated tag `v1.0.0-rc.1` ready to push

**User-driven from here:**

1. Review the 5 commits + the tag.
2. `git push origin main` and `git push origin v1.0.0-rc.1`.
3. `pnpm run publish:rc` (publishes 12 packages to npm with `--tag rc`).
4. Publish the VS Code extension per `packages/vscode-extension/PUBLISHING.md`.
5. Create the GitHub Release; paste in the rc.1 CHANGELOG section; link MIGRATION-1.0.md.
6. Announce on Discord.
7. Soak ≥ 5 quiet days (spec floor; 1-2 weeks is the target).
8. Per `RELEASING.md` "Promoting rc to stable": bump → tag → publish `1.0.0`.

No follow-up coding work expected from Wave 5. If the soak surfaces bugs, fix them and cut `rc.2` via the same flow.
