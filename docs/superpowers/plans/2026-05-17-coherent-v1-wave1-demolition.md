# Coherent.js v1.0 — Wave 1: Demolition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Wave 1.

**Goal:** Strip 1.0-blocking legacy code, deprecated APIs, and unsubstantiated README marketing claims; produce a green-CI trunk ready for Wave 2 (package consolidation).

**Architecture:** Pure deletion + module-level throw-shims for whole files being removed. No new feature work. Each task ends in one atomic, CI-green commit so trunk is shippable after every task.

**Tech Stack:** pnpm workspaces, Vitest, ESM only, Node ≥ 20.

**Wave 1 NOT in scope** (handled in later waves):
- Deletion of `packages/client/src/hydration.js` itself — its non-`legacyHydrate` exports (`autoHydrate`, `makeHydratable`, etc.) are still consumed by `packages/runtime/`, which is itself slated for deletion in Wave 2. Removing the file before runtime is dropped would break runtime tests for no benefit. Wave 1 only removes the public re-exports.
- All package consolidation (Wave 2)
- API surface lockdown (Wave 3)

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree**

Run: `cd /Users/thomasdrouvin/Perso/coherent && git status`
Expected: only the unrelated `package.json` modification from the existing session; no other uncommitted changes. If anything else is dirty, stop and investigate.

- [ ] **Step 2: Establish baseline — full test suite must pass before we start**

Run: `pnpm test`
Expected: all tests pass. If anything fails, fix or document the failure before proceeding — we need a green baseline to detect regressions caused by Wave 1.

- [ ] **Step 3: Establish baseline — lint and typecheck must pass**

Run: `pnpm lint && pnpm typecheck`
Expected: both green. Same reason as above.

---

## Task A: Remove legacy hydration named exports from `@coherent.js/client`

**Files:**
- Modify: `packages/client/src/index.js` (lines 36-45)
- Modify: `packages/client/types/index.d.ts` (lines 693-733)
- Modify: `packages/client/types/hydration.d.ts` (lines 46-52)
- Modify: `packages/cli/test/import-audit.test.js` (lines 166-172)
- Create: `packages/client/test/legacy-removal.test.js`

**Why this task:** The `legacyHydrate` alias and six other legacy hydration names are re-exported from the package's public entry. They're flagged for removal in the spec. The underlying `hydration.js` file stays (Wave 2 problem) because `packages/runtime/` still imports those same functions internally — but the *public* API surface should not advertise them.

- [ ] **Step 1: Write the failing test**

Create `packages/client/test/legacy-removal.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('Wave 1: removed public exports', () => {
  it('does not export legacyHydrate from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.legacyHydrate).toBeUndefined();
  });

  it('does not export hydrateAll from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.hydrateAll).toBeUndefined();
  });

  it('does not export hydrateBySelector from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.hydrateBySelector).toBeUndefined();
  });

  it('does not export enableClientEvents from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.enableClientEvents).toBeUndefined();
  });

  it('does not export makeHydratable from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.makeHydratable).toBeUndefined();
  });

  it('does not export autoHydrate from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.autoHydrate).toBeUndefined();
  });

  it('does not export registerEventHandler from @coherent.js/client', async () => {
    const mod = await import('../src/index.js');
    expect(mod.registerEventHandler).toBeUndefined();
  });

  it('still exports the modern hydrate API', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.hydrate).toBe('function');
  });
});
```

- [ ] **Step 2: Run the new test — confirm it fails as expected**

Run: `pnpm --filter @coherent.js/client run test -- test/legacy-removal.test.js`
Expected: 7 of 8 tests FAIL (all the `toBeUndefined` ones) because those exports still exist. The `still exports the modern hydrate API` test should PASS.

- [ ] **Step 3: Remove the legacy re-export block from `packages/client/src/index.js`**

Delete lines 36-45:

```js
// Legacy exports for backward compatibility
export {
  hydrate as legacyHydrate,
  hydrateAll,
  hydrateBySelector,
  enableClientEvents,
  makeHydratable,
  autoHydrate,
  registerEventHandler,
} from './hydration.js';
```

Replace with a single comment line marking what was removed:

```js
// 1.0: removed legacy hydration re-exports — see docs/migration/1.0#removed-legacy-hydration
```

- [ ] **Step 4: Remove the legacy declarations from `packages/client/types/index.d.ts`**

Delete the function declarations for all seven legacy names: `legacyHydrate`, `hydrateAll`, `hydrateBySelector`, `enableClientEvents`, `makeHydratable`, `autoHydrate`, `registerEventHandler` (the first five start around line 693-733; `autoHydrate` and `registerEventHandler` may appear further down — verify by grep). Leave the modern `hydrate` declaration above them untouched.

Run to verify range: `grep -n "^export function \(legacyHydrate\|hydrateAll\|hydrateBySelector\|enableClientEvents\|makeHydratable\|autoHydrate\|registerEventHandler\)" packages/client/types/index.d.ts`

Delete each named-export block these point at. Also grep-and-remove any straggling references to those symbols elsewhere in the same file (option types are fine to leave; only the `export function` declarations go).

- [ ] **Step 5: Remove legacy names from `packages/client/types/hydration.d.ts`**

In the `export {` block at lines 46-52, remove the 7 legacy names so the block contains only modern exports. If the entire block becomes empty after removal, delete it.

- [ ] **Step 6: Update `packages/cli/test/import-audit.test.js` expected exports**

In the `'@coherent.js/client'` array (around line 152-173), delete these 7 lines (the legacy names):

```js
    'legacyHydrate',
    'hydrateAll',
    'hydrateBySelector',
    'enableClientEvents',
    'makeHydratable',
    'autoHydrate',
    'registerEventHandler'
```

Keep the trailing comma syntax valid — the last remaining entry should not have a trailing comma.

- [ ] **Step 7: Run the new legacy-removal test — confirm all 8 pass**

Run: `pnpm --filter @coherent.js/client run test -- test/legacy-removal.test.js`
Expected: 8/8 PASS.

- [ ] **Step 8: Run the affected sibling test suites**

Run: `pnpm --filter @coherent.js/client run test`
Expected: full client package suite green. The `core-logic.test.js` HMR test will still pass at this point — Task B touches it.

Run: `pnpm --filter @coherent.js/cli run test -- test/import-audit.test.js`
Expected: import-audit test green (no longer expecting legacy names).

- [ ] **Step 9: Run typecheck**

Run: `pnpm typecheck`
Expected: green. If TypeScript complains about a `legacyHydrate` reference somewhere we missed, find it with `grep -rn legacyHydrate packages/*/types packages/*/src` and remove.

- [ ] **Step 10: Commit**

```bash
git add packages/client/src/index.js \
        packages/client/types/index.d.ts \
        packages/client/types/hydration.d.ts \
        packages/client/test/legacy-removal.test.js \
        packages/cli/test/import-audit.test.js
git commit -m "$(cat <<'EOF'
refactor(client): remove legacyHydrate and 6 other legacy public exports

Drops legacyHydrate, hydrateAll, hydrateBySelector, enableClientEvents,
makeHydratable, autoHydrate, registerEventHandler from the
@coherent.js/client public API. Underlying hydration.js file remains
for now (consumed by @coherent.js/runtime, both go in Wave 2).

Part of Wave 1 demolition for v1.0 stable. See
docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md.
EOF
)"
```

---

## Task B: Replace `client/src/hmr.js` with a module-level throw-shim

**Files:**
- Modify: `packages/client/src/hmr.js` (replace entire content)
- Modify: `packages/client/test/core-logic.test.js` (lines 104-112)

**Why this task:** The legacy `hmr.js` file is a deprecated compatibility shim that auto-initializes HMR on import. The modular `hmr/` directory is the real API. We replace `hmr.js` with a throw-on-load shim so any direct import gets a clear migration-pointing error rather than silently working or silently breaking later.

- [ ] **Step 1: Write the failing test for the throw-shim**

Edit `packages/client/test/core-logic.test.js`. Find the existing HMR Core Logic block (around lines 104-112). Replace the `should test HMR module structure` test with:

```js
  it('throws an informative migration error when legacy hmr.js is imported directly', async () => {
    await expect(import('../src/hmr.js')).rejects.toThrow(/Coherent\.js 1\.0/);
    await expect(import('../src/hmr.js')).rejects.toThrow(/coherentjs\.dev\/docs\/migration\/1\.0/);
  });
```

Leave the rest of the HMR Core Logic describe block (subsequent `it` blocks like `should test HMR message processing logic`) untouched.

- [ ] **Step 2: Run the test — confirm it fails**

Run: `pnpm --filter @coherent.js/client run test -- test/core-logic.test.js`
Expected: the new test FAILS (the import currently succeeds because hmr.js is still a real module).

- [ ] **Step 3: Replace `packages/client/src/hmr.js` content with a throw-shim**

Overwrite the entire file with:

```js
/**
 * Coherent.js HMR — legacy module entrypoint
 *
 * REMOVED in 1.0. This file existed in beta to auto-initialize HMR on import.
 * Direct imports of this path now throw immediately so callers see the
 * migration instruction instead of silent failures further down the call stack.
 *
 * @module @coherent.js/client/hmr
 */

throw new Error(
  "Coherent.js 1.0: importing '@coherent.js/client/src/hmr.js' was removed. " +
  "Import { hmrClient } from '@coherent.js/client' and call hmrClient.connect() instead. " +
  "See https://coherentjs.dev/docs/migration/1.0#removed-client-hmr-shim"
);
```

- [ ] **Step 4: Run the test — confirm it passes**

Run: `pnpm --filter @coherent.js/client run test -- test/core-logic.test.js`
Expected: all tests in the file PASS, including the new throw assertion.

- [ ] **Step 5: Run the full client package test suite**

Run: `pnpm --filter @coherent.js/client run test`
Expected: green. If any other test in the client package imports `../src/hmr.js` directly, it will now throw — update those imports to use `../src/hmr/index.js` or the package export `hmrClient`.

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/hmr.js packages/client/test/core-logic.test.js
git commit -m "$(cat <<'EOF'
refactor(client): replace legacy hmr.js with throw-on-load migration shim

Direct imports of @coherent.js/client/src/hmr.js now throw with a
migration URL. Modular @coherent.js/client/src/hmr/* is unchanged and
remains the supported API.

Part of Wave 1 demolition for v1.0 stable.
EOF
)"
```

---

## Task C: Remove forms deprecated SPA APIs and their tests

**Files:**
- Modify: `packages/forms/src/index.js` (lines 23-35)
- Modify: `packages/forms/src/form-builder.js` (lines 572-588)
- Modify: `packages/forms/build.mjs` (line 10)
- Delete: `packages/forms/src/forms.js`
- Delete: `packages/forms/src/advanced-validation.js`
- Delete: `packages/forms/test/forms.test.js`

**Why this task:** Three deprecated re-exports in `forms/index.js` (`createForm`, `formValidators`, `enhancedForm`, plus the `advanced-validation` wildcard re-export) and the deprecated `createForm` alias in `form-builder.js`. The underlying files (`forms.js`, `advanced-validation.js`) are not imported by anything except the package's own deprecated surface and the package's own test for the deprecated surface — confirmed by external grep returning only the build manifest. Hard delete is safe.

- [ ] **Step 1: Confirm no external consumers of the deprecated symbols**

Run from repo root:

```bash
grep -rn "\bcreateForm\b\|\bformValidators\b\|\benhancedForm\b" \
  packages examples website \
  --include="*.js" --include="*.ts" 2>/dev/null \
  | grep -v "/dist/" \
  | grep -v "packages/forms/src/forms.js" \
  | grep -v "packages/forms/src/form-builder.js" \
  | grep -v "packages/forms/src/index.js" \
  | grep -v "packages/forms/test/forms.test.js"
```

Expected: empty output. If any consumer turns up, stop and update them to use `createFormBuilder` + `hydrateForm` first, then resume this task.

Run:

```bash
grep -rn "from.*['\"].*advanced-validation['\"]" \
  packages examples website \
  --include="*.js" --include="*.ts" 2>/dev/null \
  | grep -v "/dist/" \
  | grep -v "packages/forms/src/index.js"
```

Expected: empty output (only `forms/build.mjs` will reference it, and Step 5 handles that).

- [ ] **Step 2: Write the failing test for removed exports**

Create `packages/forms/test/wave1-removal.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('Wave 1: removed deprecated forms exports', () => {
  it('does not export createForm from @coherent.js/forms', async () => {
    const mod = await import('../src/index.js');
    expect(mod.createForm).toBeUndefined();
  });

  it('does not export formValidators from @coherent.js/forms', async () => {
    const mod = await import('../src/index.js');
    expect(mod.formValidators).toBeUndefined();
  });

  it('does not export enhancedForm from @coherent.js/forms', async () => {
    const mod = await import('../src/index.js');
    expect(mod.enhancedForm).toBeUndefined();
  });

  it('still exports the modern createFormBuilder and hydrateForm', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.createFormBuilder).toBe('function');
    expect(typeof mod.hydrateForm).toBe('function');
  });
});
```

- [ ] **Step 3: Run the test — confirm 3 of 4 fail**

Run: `pnpm --filter @coherent.js/forms run test -- test/wave1-removal.test.js`
Expected: the 3 `toBeUndefined` tests FAIL; the modern-export test PASSES.

- [ ] **Step 4: Replace `packages/forms/src/index.js` content**

Overwrite the file with:

```js
/**
 * Coherent.js Forms
 *
 * SSR + Hydration form system
 *
 * @module forms
 */

// SERVER-SIDE: Build forms with validation metadata
export { FormBuilder, createFormBuilder, buildForm } from './form-builder.js';

// CLIENT-SIDE: Hydrate server-rendered forms
export { hydrateForm } from './form-hydration.js';

// SHARED: Validators (used by both server and client)
export { validators, FormValidator, createValidator, validate } from './validation.js';
export * from './validators.js';

// 1.0: removed deprecated SPA exports (createForm, formValidators, enhancedForm,
// advanced-validation). See docs/migration/1.0#removed-forms-spa-apis.
```

- [ ] **Step 5: Remove the deprecated `createForm` alias from `packages/forms/src/form-builder.js`**

Delete lines 572-588 (the block starting with `/** Create a form with UI builder capabilities (for SSR rendering)` and ending with the closing `}` of `createForm`). The export `createFormBuilder` immediately above stays.

Verify the next function declaration (`Quick form builder helper`) is still intact and the file ends cleanly.

- [ ] **Step 6: Delete the deprecated source files**

Run:

```bash
rm packages/forms/src/forms.js
rm packages/forms/src/advanced-validation.js
```

- [ ] **Step 7: Delete the test file for the removed surface**

Run:

```bash
rm packages/forms/test/forms.test.js
```

- [ ] **Step 8: Update `packages/forms/build.mjs` to drop the deleted input**

Open `packages/forms/build.mjs`. Find line 10 (`'src/advanced-validation.js'`) inside the inputs array. Remove that line. Fix trailing comma if needed.

- [ ] **Step 9: Run the wave1-removal test — confirm all 4 pass**

Run: `pnpm --filter @coherent.js/forms run test -- test/wave1-removal.test.js`
Expected: 4/4 PASS.

- [ ] **Step 10: Run the full forms package test suite**

Run: `pnpm --filter @coherent.js/forms run test`
Expected: green. `form-builder.test.js` and `validators.test.js` exercise APIs we kept and should still pass.

- [ ] **Step 11: Run the package build to confirm no stale references**

Run: `pnpm --filter @coherent.js/forms run build`
Expected: green. No `Cannot find module` errors for the deleted files.

- [ ] **Step 12: Commit**

```bash
git add packages/forms/src/index.js \
        packages/forms/src/form-builder.js \
        packages/forms/build.mjs \
        packages/forms/test/wave1-removal.test.js
git rm packages/forms/src/forms.js \
       packages/forms/src/advanced-validation.js \
       packages/forms/test/forms.test.js
git commit -m "$(cat <<'EOF'
refactor(forms): remove deprecated SPA form APIs

Removes createForm, formValidators, enhancedForm public exports plus the
advanced-validation wildcard re-export. Deletes the underlying
forms.js and advanced-validation.js source files and the forms.test.js
suite that exercised them. The deprecated createForm alias in
form-builder.js is also removed in favor of createFormBuilder.

No external consumers found in packages/, examples/, or website/.

Part of Wave 1 demolition for v1.0 stable.
EOF
)"
```

---

## Task D: Strip unsubstantiated marketing claims from README

**Files:**
- Modify: `README.md`

**Why this task:** The README claims "42.7% performance improvement over traditional OOP" and "95%+ cache hit rates" as headline framework properties. Per the spec, these get removed because the OOP comparison requires maintaining a benchmark fixture nobody is going to maintain, and the cache hit rate is workload-dependent (not a property of the framework). Keeping unverifiable claims undermines the credibility of the verifiable ones (bundle size, tree-shake reduction).

This task does not require a code test — README is documentation. The verification is visual inspection plus a grep that the strings are gone.

- [ ] **Step 1: Edit `README.md`**

Make the following edits exactly:

1. Delete line 14: `- **🏗️ 42.7% performance improvement** over traditional OOP`
2. Delete line 28: `- **LRU Caching**: Automatic performance optimization with 95%+ cache hit rates`
   Replace with: `- **LRU Caching**: Component-level caching with configurable LRU eviction`
3. In the benchmarks table (around lines 87-95), delete the entire row: `| Cache Hit Rate | **95%+** | 70%+ |`
4. Around line 254, delete the line: `- ✅ **Architecture**: 42.7% improvement over traditional OOP`

- [ ] **Step 2: Verify all four strings are gone**

Run:

```bash
grep -nE "42\.7%|95\%\+" README.md
```

Expected: empty output. If anything remains, repeat Step 1 on the missed line.

- [ ] **Step 3: Visual smoke check**

Run: `head -100 README.md`
Confirm the headline bullet list, the benchmarks table, and the "Production-Ready" section all read sensibly after the deletions (no orphaned bullets, no broken table borders, no dangling "and" connectives).

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs(readme): remove unsubstantiated perf claims (42.7% vs OOP, 95% cache hit)

The "42.7% vs OOP" claim requires maintaining a benchmark fixture that
does not exist; the "95%+ cache hit rate" is workload-dependent, not a
property of the framework. Both are removed to leave the README only
asserting numbers the CI perf gates (Wave 3) will actually defend.

Part of Wave 1 demolition for v1.0 stable.
EOF
)"
```

---

## Task E: Repo cruft cleanup

**Files:**
- Delete: `.DS_Store` (root), `website/.DS_Store`
- Delete: `output.txt`
- Modify: `.gitignore` (add `.DS_Store`, `output.txt`)

**Why this task:** Untracked-but-not-ignored junk files sit in the working tree forever and clutter every `git status`. None of these are tracked, but they keep coming back. Updating `.gitignore` prevents recurrence.

- [ ] **Step 1: Confirm none are tracked**

Run from repo root: `git ls-files | grep -E '\.DS_Store$|^output\.txt$'`
Expected: empty output. If anything is tracked, stop and use `git rm` rather than plain `rm`.

- [ ] **Step 2: Delete the local files**

Run:

```bash
rm -f .DS_Store website/.DS_Store output.txt
find . -name ".DS_Store" -not -path "./node_modules/*" -delete
```

- [ ] **Step 3: Add entries to `.gitignore`**

Open `.gitignore`. After the existing `.idea/` line (around line 38), add:

```
# OS cruft
.DS_Store
Thumbs.db

# Local debug dumps
output.txt
```

- [ ] **Step 4: Verify clean working tree state**

Run: `git status --short`
Expected output includes the `.gitignore` modification and nothing else from this task. No `.DS_Store` or `output.txt` should appear as untracked.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
chore: ignore .DS_Store and local debug dumps

Removes accumulated .DS_Store files and an old output.txt debug dump
from the working tree, and updates .gitignore to keep them out.

Part of Wave 1 demolition for v1.0 stable.
EOF
)"
```

---

## Task F: Wave 1 verification commit + CHANGELOG entry

**Files:**
- Modify: `CHANGELOG.md` (add Unreleased entry)

**Why this task:** After five surgical commits, run the full quality gate end-to-end to prove trunk is green, and record a CHANGELOG entry so the work is visible in the release pipeline.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: green. Any failure is a regression introduced by Wave 1 — diagnose before continuing. Common suspects: a test in another package that imports a removed name (we grepped, but grep can miss dynamic imports or template strings).

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: 0 warnings (project policy is `--max-warnings=0`).

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: green.

- [ ] **Step 4: Full build**

Run: `pnpm build`
Expected: green. All 26 packages still build (none of the deletions broke a downstream package's imports).

- [ ] **Step 5: Add an Unreleased entry to `CHANGELOG.md`**

Open `CHANGELOG.md`. Find the `## [Unreleased]` heading (currently empty per the file). Below it, add:

```markdown
### Removed

- **BREAKING (client):** Removed `legacyHydrate`, `hydrateAll`, `hydrateBySelector`, `enableClientEvents`, `makeHydratable`, `autoHydrate`, `registerEventHandler` from `@coherent.js/client` public exports. Use `hydrate()` instead. See [migration guide](https://coherentjs.dev/docs/migration/1.0#removed-legacy-hydration).
- **BREAKING (client):** `@coherent.js/client/src/hmr.js` direct imports now throw a migration error. Import `{ hmrClient }` from `@coherent.js/client` instead.
- **BREAKING (forms):** Removed `createForm`, `formValidators`, `enhancedForm`, and `advanced-validation` exports from `@coherent.js/forms`. Use `createFormBuilder` + `hydrateForm` instead.

### Changed

- **docs (readme):** Removed "42.7% improvement over OOP" and "95%+ cache hit rate" claims. The first required an unmaintained benchmark fixture; the second is workload-dependent and was misleading as a framework-level property.

### Maintenance

- `.gitignore` now covers `.DS_Store` and local debug dumps.
```

- [ ] **Step 6: Commit**

```bash
git add CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs(changelog): record Wave 1 demolition

Adds Unreleased entries for the legacy hydration export removals,
hmr.js throw-shim, forms deprecated SPA API removals, README claim
cleanup, and gitignore additions.

Closes Wave 1 of v1.0 stable hardening. Trunk is green and ready for
Wave 2 (package consolidation).
EOF
)"
```

- [ ] **Step 7: Final confirmation**

Run: `git log --oneline -10`
Expected: 6 new commits on top of the spec commit, each with a clear conventional-commit prefix (`refactor`, `docs`, `chore`).

Run: `git status`
Expected: only the pre-existing `package.json` modification from earlier in the session (unrelated to Wave 1). Nothing else dirty.

---

## Post-Wave-1 Handoff

Wave 1 is done. Next plans to write (each gets its own document):

- **Wave 2 — Restructure:** 26 → 12 packages, including the final deletion of `client/src/hydration.js` (which becomes safe once `runtime` is dropped). Drafted after Wave 1 merges so the file/import map reflects post-cleanup reality.
- **Wave 3 — Lockdown:** `exports` field audit, `@internal` sweep, API surface snapshot tests, `experimental_` prefix pass, perf CI gates.
- **Wave 4 — Browser parity:** HMR dev-server WebSocket implementation in `cli`, Playwright E2E suite, VS Code marketplace publish.
- **Wave 5 — Release:** Migration guide finalization, `1.0.0-rc.1` tag, soak period, `1.0.0` tag.

Reasoning for plan-per-wave: each wave produces shippable trunk and the post-cleanup state materially changes the file/import topology for the next wave. Writing all five plans up front would generate stale instructions by Wave 3.
