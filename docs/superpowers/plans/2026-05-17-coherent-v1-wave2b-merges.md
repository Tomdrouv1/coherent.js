# Coherent.js v1.0 — Wave 2b: Internal Package Merges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Wave 2 (Section 1 consolidation table).

**Goal:** Merge 6 small, narrowly-scoped packages into 3 larger consolidated ones (`cli`, `devtools`, new `tooling`) plus delete 2 essentially-empty packages (`profiler`, `language-service`). Takes the workspace from 22 → 16 packages.

**Architecture:** Each merge is one atomic commit. Sources move into subdirectories of the absorbing package (`packages/devtools/src/performance/`, `packages/cli/src/build-tools/`, etc.) preserving file boundaries. Subpath exports in the absorbing package expose the moved code at predictable paths (`@coherent.js/devtools/performance/cache`, `@coherent.js/cli/build-tools/vite`). Cross-package consumers (CLI scaffold templates, the `examples/vite-integration` config) get updated in the same commit as the merge.

**Tech Stack:** pnpm workspaces, Vitest, ESM only, Node ≥ 20. Mix of JS and TS code in the consolidated packages.

**Wave 2b NOT in scope** (handled later):
- `integrations` consolidation (`express`/`fastify`/`koa`/`nextjs`/`adapters` → subpath exports) — Wave 2c
- VS Code extension absorption into `tooling/vscode-extension/` — Wave 4 (paired with marketplace publish work, which has its own complexity around vsce build pipeline)
- API surface lockdown, perf gates, browser tests, release — Waves 3, 4, 5

**Decision: `@coherent.js/vscode-extension` stays as its own package for Wave 2b.** The spec puts it in `tooling`, but its lifecycle (separate vsce build pipeline, marketplace publish, its own `package.json` with VS Code extension metadata) is materially different from a normal npm package merger. Folding it in here without addressing the publish flow would create real friction. Defer to Wave 4. Wave 2b ends at 16 packages; Wave 2c takes 16 → 12; if Wave 4 absorbs vscode-extension, it ends at 11 (or 12 if it goes elsewhere). Either way the spec's "~10" target is met within tolerance.

**Lessons baked in from Wave 1 + Wave 2a:**
Every merge/delete must audit the same orphan-pattern files that Wave 2a's reviewers caught:
- `docs/README.md` (BOTH the "Available Packages" and "Extended Packages" sections)
- `examples/README.md`
- `ARCHITECTURE.md`, `DEVELOPMENT.md`, `PUBLISHING_GUIDE.md`
- `.changeset/pre.json`
- `.github/CODEOWNERS`
- `.github/labeler.yml`
- `tsconfig.json` (project references)
- `eslint.config.js` (per-package globs and override blocks)
- `scripts/fix-sideeffects.js` (`packagesToFix` array)
- `scripts/add-exports-sections.js` (package definition arrays)
- `scripts/shared-build.mjs` and `scripts/build.js` (hardcoded entry points)

For NEW packages (`tooling`), the same files need ADDITIONS (or at least verification that the new package fits the existing patterns without explicit listing).

---

## File Structure (per merge)

### After Task 1 (build-tools → cli)

- `packages/cli/src/build-tools/index.js` (moved from `packages/build-tools/src/index.js`)
- `packages/cli/src/build-tools/vite.js` (moved)
- `packages/cli/src/build-tools/webpack.js` (moved)
- `packages/cli/src/build-tools/rollup.js` (moved)
- `packages/cli/src/build-tools/coherent-loader.js` (moved)
- `packages/cli/src/build-tools/utils.js` (moved)
- `packages/cli/package.json` — adds subpath exports for `./build-tools`, `./build-tools/vite`, `./build-tools/webpack`, `./build-tools/rollup`, `./build-tools/loader`
- `packages/cli/build.mjs` — adds the new entry points to its build inputs
- `packages/build-tools/` — DELETED

### After Task 2 (performance → devtools, profiler deleted)

- `packages/devtools/src/performance/index.js` (moved from `packages/performance/src/index.js`)
- `packages/devtools/src/performance/cache.js` (moved)
- `packages/devtools/src/performance/code-splitting.js` (moved)
- `packages/devtools/src/performance/lazy-loading.js` (moved)
- `packages/devtools/package.json` — adds subpath exports for `./performance`, `./performance/cache`, `./performance/code-splitting`, `./performance/lazy-loading`
- `packages/devtools/build.mjs` — adds new entry points
- `packages/performance/` — DELETED
- `packages/profiler/` — DELETED (was effectively empty: 138 lines of placeholder scaffolding, zero in-source consumers, devtools already has its own substantive `profiler.js`)

### After Task 3 (testing + language-server → tooling, language-service deleted)

- `packages/tooling/package.json` — NEW
- `packages/tooling/README.md` — NEW (very brief, describes the package)
- `packages/tooling/build.mjs` — NEW (orchestrates TS compile of LSP + JS bundle of testing)
- `packages/tooling/tsconfig.json` — NEW (compiles `src/lsp/`)
- `packages/tooling/src/testing/index.js` (moved from `packages/testing/src/index.js`)
- `packages/tooling/src/testing/matchers.js` (moved)
- `packages/tooling/src/testing/test-renderer.js` (moved)
- `packages/tooling/src/testing/test-utils.js` (moved)
- `packages/tooling/src/lsp/server.ts` (moved from `packages/language-server/src/server.ts`)
- `packages/tooling/src/lsp/analysis/*.ts` (moved)
- `packages/tooling/src/lsp/data/*.ts` (moved, plus generated `element-attributes.generated.json`)
- `packages/tooling/src/lsp/providers/*.ts` (moved)
- `packages/tooling/scripts/extract-attributes.ts` (moved from `packages/language-server/scripts/`)
- `packages/testing/` — DELETED
- `packages/language-server/` — DELETED
- `packages/language-service/` — DELETED (TS-only stub, zero consumers)
- `packages/cli/src/generators/package-scaffold.js` — UPDATED: scaffold templates that emit `import ... from '@coherent.js/testing'` now emit `'@coherent.js/tooling/testing'`
- `packages/cli/src/commands/create.js` — UPDATED: `@coherent.js/testing` option label and value updated to `@coherent.js/tooling/testing`

### After Task 4 (verification + CHANGELOG)

- `CHANGELOG.md` — extended Unreleased section with Wave 2b subsections

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree relative to main**

Run: `git status`
Expected: only the pre-existing modifications carried from prior sessions (`package.json`, several `tsconfig.tsbuildinfo` files, `pnpm-workspace.yaml`). Do not stage them.

- [ ] **Step 2: Confirm baseline is green**

Run: `pnpm test && pnpm typecheck:packages && pnpm build`
Expected: green (1672 tests passing post-Wave-2a). If anything fails on a clean main checkout, stop and investigate — Wave 2b builds on a green baseline.

---

## Task 1: Absorb `build-tools` into `cli`

**Why first:** Smallest merge (6 source files, all stubs averaging ~400 bytes each). Establishes the subpath-export pattern that Task 2 and Task 3 follow. Two real consumers (`examples/vite-integration`, `examples/ecommerce-fullstack`) which must be updated in the same commit.

**Files:**
- Create: `packages/cli/src/build-tools/index.js`, `vite.js`, `webpack.js`, `rollup.js`, `coherent-loader.js`, `utils.js` (copied from `packages/build-tools/src/`)
- Modify: `packages/cli/package.json` (add subpath exports)
- Modify: `packages/cli/build.mjs` (add new entry points)
- Modify: `examples/vite-integration/vite.config.js` (update import path)
- Modify: `examples/ecommerce-fullstack/package.json` (replace `@coherent.js/build-tools` workspace dep with `@coherent.js/cli`)
- Delete: `packages/build-tools/` (entire directory)
- Audit + modify if found: `docs/README.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `PUBLISHING_GUIDE.md`, `docs/packages/build-tools.md` (delete or repoint), `.changeset/pre.json`, `.github/CODEOWNERS`, `.github/labeler.yml`, `tsconfig.json`, `eslint.config.js`, `scripts/fix-sideeffects.js`, `scripts/add-exports-sections.js`

### Step 1: Pre-check — consumer map

Run from `/Users/thomasdrouvin/Perso/coherent`:

```bash
grep -rn "@coherent.js/build-tools" . \
  --include="*.js" --include="*.ts" --include="*.json" --include="*.md" --include="*.mjs" --include="*.yml" \
  2>/dev/null | grep -v "/node_modules/" | grep -v "/dist/" | grep -v "/coverage/" \
  | grep -v "pnpm-lock.yaml" | grep -v "packages/build-tools/" | grep -v "CHANGELOG"
```

Confirm the consumer list matches the Files section. New consumers (anything not listed there) → stop and add to the task scope.

### Step 2: Copy source files from build-tools to cli/build-tools/

```bash
mkdir -p packages/cli/src/build-tools
cp packages/build-tools/src/index.js packages/cli/src/build-tools/index.js
cp packages/build-tools/src/vite.js packages/cli/src/build-tools/vite.js
cp packages/build-tools/src/webpack.js packages/cli/src/build-tools/webpack.js
cp packages/build-tools/src/rollup.js packages/cli/src/build-tools/rollup.js
cp packages/build-tools/src/coherent-loader.js packages/cli/src/build-tools/coherent-loader.js
cp packages/build-tools/src/utils.js packages/cli/src/build-tools/utils.js
```

Verify each file's content was preserved (`diff -r packages/build-tools/src packages/cli/src/build-tools` should show no differences).

### Step 3: Adjust internal imports inside the copied files

Open each of the 6 copied files. If any file imports another file from the same directory using a relative path (e.g., `vite.js` imports from `./utils.js`), the path doesn't need to change because the directory layout is preserved. But if any file imports a sibling using `'../something'` that no longer resolves, fix it.

Run:

```bash
grep -n "from ['\"]\\.\\./\\|from ['\"]\\./" packages/cli/src/build-tools/*.js
```

Inspect each match. If they reference siblings within `build-tools/`, they're fine (relative path resolves correctly within the new location). If they reference anything outside `build-tools/` that used to be at the package root (unlikely given file sizes), update accordingly.

### Step 4: Add subpath exports to `packages/cli/package.json`

Open `packages/cli/package.json`. Find the `exports` field. Add the following entries (preserve existing entries):

```json
"./build-tools": "./src/build-tools/index.js",
"./build-tools/vite": "./src/build-tools/vite.js",
"./build-tools/webpack": "./src/build-tools/webpack.js",
"./build-tools/rollup": "./src/build-tools/rollup.js",
"./build-tools/loader": "./src/build-tools/coherent-loader.js"
```

Verify trailing-comma JSON syntax. Note: if cli's exports use a `dev`/`prod` conditional structure, match that pattern; if it uses plain string values, use plain strings.

### Step 5: Update `packages/cli/build.mjs`

Open `packages/cli/build.mjs`. Find the build inputs configuration. Add entries for the 6 new files so esbuild emits dist outputs for them. Pattern follows the existing inputs.

If the current build only ships the main CLI binary and doesn't emit library JS, adding library outputs is required for the subpath exports to work in production. The exact code depends on cli's build script style — read the file first to understand the pattern.

### Step 6: Update `examples/vite-integration/vite.config.js`

Change:

```js
import { coherentVitePlugin } from '@coherent.js/build-tools/vite';
```

to:

```js
import { coherentVitePlugin } from '@coherent.js/cli/build-tools/vite';
```

### Step 7: Update `examples/ecommerce-fullstack/package.json`

Replace:

```json
"@coherent.js/build-tools": "workspace:*",
```

with:

```json
"@coherent.js/cli": "workspace:*",
```

(or, if `@coherent.js/cli` is already in the dependencies list, just delete the build-tools line — don't duplicate). Verify final JSON validity.

### Step 8: Delete the build-tools package

```bash
git rm -r packages/build-tools
```

### Step 9: Audit Task-1-pattern files

For each file in this list, grep for `build-tools` and remove the matching entry (if any):

```bash
for f in \
  docs/README.md ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md \
  .changeset/pre.json .github/CODEOWNERS .github/labeler.yml \
  tsconfig.json eslint.config.js \
  scripts/fix-sideeffects.js scripts/add-exports-sections.js \
  scripts/shared-build.mjs scripts/build.js; do
  echo "=== $f ==="
  grep -n "build-tools" "$f" 2>/dev/null || echo "(no matches)"
done
```

For each file with matches:
- `docs/README.md` — likely 1-2 references. Delete or update them to point at `@coherent.js/cli/build-tools` paths. If updating, do not invent docs sections — only fix what's there.
- `ARCHITECTURE.md`, `DEVELOPMENT.md` — delete the build-tools tree entries
- `PUBLISHING_GUIDE.md` — delete the build-tools list item and renumber subsequent items
- `.changeset/pre.json` — delete the build-tools entry
- `.github/CODEOWNERS` — delete `packages/build-tools/` line if present
- `.github/labeler.yml` — delete `packages/build-tools/**/*` line if present
- `tsconfig.json` — delete the `{ "path": "./packages/build-tools" }` reference if present
- `eslint.config.js` — delete any build-tools-specific glob or override block if present
- `scripts/fix-sideeffects.js` — remove `'build-tools'` from `packagesToFix` array if present
- `scripts/add-exports-sections.js` — remove the build-tools section entries (around lines 169 and 171 in the pre-Wave-2b numbering). Run `node --check scripts/add-exports-sections.js` after editing.
- `scripts/shared-build.mjs` and `scripts/build.js` — unlikely to have a build-tools entry point hardcoded, but grep just in case.

Also delete `docs/packages/build-tools.md` — it's a standalone doc for the now-deleted package:

```bash
git rm docs/packages/build-tools.md
```

(Or repoint it to the new `@coherent.js/cli/build-tools` namespace if the content has substantive material; honestly given it's a thin reference doc, deletion + a follow-up Wave 5 docs note is cleaner. Default: delete.)

### Step 10: Regenerate the lockfile

```bash
pnpm install
```

Verify `grep "@coherent.js/build-tools" pnpm-lock.yaml` returns nothing.

### Step 11: Full quality gate

```bash
pnpm test
pnpm typecheck:packages
pnpm build
```

Expected: all green. The build-tools package's small test suite (if any) goes away with the deletion. New cli subpath exports become available for consumption.

Verify the moved code is actually accessible:

```bash
node -e "import('@coherent.js/cli/build-tools/vite').then(m => console.log('vite OK', Object.keys(m)))"
```

(Run from repo root with the workspace activated. If it fails with "Cannot find module", the exports field or build pipeline didn't pick up the new paths.)

### Step 12: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add -A packages docs ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md .changeset .github tsconfig.json eslint.config.js scripts examples pnpm-lock.yaml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
refactor(cli): absorb @coherent.js/build-tools into @coherent.js/cli

Moves vite/webpack/rollup/loader plugins from the standalone
build-tools package into packages/cli/src/build-tools/, exposed via
subpath exports (@coherent.js/cli/build-tools/vite etc.). The build
plugins are dev-time CLI tooling, not runtime, so the cli package is
their natural home.

Examples updated: vite-integration uses the new import path,
ecommerce-fullstack swaps its workspace dep.

Part of Wave 2b (internal merges) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

(The `PNPM_CONFIG_*` prefix is the established workaround for the pnpm-verify-on-script-run issue. If the hook runs cleanly without it, that's fine too.)

---

## Task 2: Absorb `performance` into `devtools`, delete `profiler`

**Why second:** Now that the subpath-export pattern is established (Task 1), the same pattern applies to performance. `profiler` deserves outright deletion (138 lines of placeholder scaffolding, zero in-source consumers, devtools already has substantive `profiler.js` for the same concern).

**Files:**
- Create: `packages/devtools/src/performance/index.js`, `cache.js`, `code-splitting.js`, `lazy-loading.js` (moved from `packages/performance/src/`)
- Modify: `packages/devtools/package.json` (add subpath exports)
- Modify: `packages/devtools/build.mjs` (add new entry points)
- Delete: `packages/performance/`
- Delete: `packages/profiler/` (no merge, just delete)
- Audit + modify if found: same orphan-pattern file list as Task 1

### Step 1: Pre-check — consumer maps for both packages

```bash
echo "=== performance consumers ===" && grep -rn "@coherent.js/performance\b" . \
  --include="*.js" --include="*.ts" --include="*.json" --include="*.md" --include="*.mjs" --include="*.yml" \
  2>/dev/null | grep -v "/node_modules/" | grep -v "/dist/" | grep -v "/coverage/" \
  | grep -v "pnpm-lock.yaml" | grep -v "packages/performance/" | grep -v "CHANGELOG"

echo "=== profiler consumers ===" && grep -rn "@coherent.js/profiler" . \
  --include="*.js" --include="*.ts" --include="*.json" --include="*.md" --include="*.mjs" --include="*.yml" \
  2>/dev/null | grep -v "/node_modules/" | grep -v "/dist/" | grep -v "/coverage/" \
  | grep -v "pnpm-lock.yaml" | grep -v "packages/profiler/" | grep -v "CHANGELOG"
```

Expected (from pre-execution audit): NEITHER package has live JS/TS consumers. All matches should be docs/scripts/changeset references. If a real consumer turns up, stop and report.

### Step 2: Copy performance source files

```bash
mkdir -p packages/devtools/src/performance
cp packages/performance/src/index.js packages/devtools/src/performance/index.js
cp packages/performance/src/cache.js packages/devtools/src/performance/cache.js
cp packages/performance/src/code-splitting.js packages/devtools/src/performance/code-splitting.js
cp packages/performance/src/lazy-loading.js packages/devtools/src/performance/lazy-loading.js
```

Verify content preserved (`diff -r packages/performance/src packages/devtools/src/performance`).

### Step 3: Adjust internal imports in copied performance files

Same as Task 1 Step 3 — grep for relative imports, verify they still resolve in the new location. The performance package was self-contained (no cross-package imports for its internal files), so relative-within-directory imports should be fine.

### Step 4: Add subpath exports to `packages/devtools/package.json`

Open `packages/devtools/package.json`. Find the `exports` field. Add:

```json
"./performance": "./src/performance/index.js",
"./performance/cache": "./src/performance/cache.js",
"./performance/code-splitting": "./src/performance/code-splitting.js",
"./performance/lazy-loading": "./src/performance/lazy-loading.js"
```

Match the existing entries' format (dev/prod conditional or plain string).

### Step 5: Update `packages/devtools/build.mjs`

Add the 4 new files to the build inputs (matching the package's existing pattern).

### Step 6: Delete the performance package

```bash
git rm -r packages/performance
```

### Step 7: Delete the profiler package outright

```bash
git rm -r packages/profiler
```

No merge — profiler was 138 lines of placeholder scaffolding with zero in-source consumers. `packages/devtools/src/profiler.js` (the substantive profiling code) is unaffected and remains the real implementation.

### Step 8: Audit Task-1-pattern files

Run for BOTH `performance` and `profiler`:

```bash
for pkg in performance profiler; do
  echo "=== $pkg ==="
  for f in \
    docs/README.md ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md \
    .changeset/pre.json .github/CODEOWNERS .github/labeler.yml \
    tsconfig.json eslint.config.js \
    scripts/fix-sideeffects.js scripts/add-exports-sections.js \
    scripts/shared-build.mjs scripts/build.js; do
    if grep -q "$pkg" "$f" 2>/dev/null; then
      echo "$f has matches"
      grep -n "$pkg" "$f"
    fi
  done
done
```

For each match, remove or update following the same patterns as Task 1.

Also delete or update these docs files if they exist:
- `docs/packages/performance.md` — delete or repoint to `@coherent.js/devtools/performance`
- `docs/packages/profiler.md` — delete (no replacement)

### Step 9: Regenerate the lockfile

```bash
pnpm install
```

Verify both `grep "@coherent.js/performance" pnpm-lock.yaml` and `grep "@coherent.js/profiler" pnpm-lock.yaml` return nothing.

### Step 10: Full quality gate

```bash
pnpm test
pnpm typecheck:packages
pnpm build
```

Expected: green. The performance package's test suite (if any) goes away; profiler's tests (if any) go away. Devtools gains new subpath exports.

Verify accessibility:

```bash
node -e "import('@coherent.js/devtools/performance/cache').then(m => console.log('cache OK', Object.keys(m).slice(0,5)))"
```

### Step 11: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add -A packages docs ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md .changeset .github tsconfig.json eslint.config.js scripts pnpm-lock.yaml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
refactor(devtools): absorb @coherent.js/performance, drop @coherent.js/profiler

Moves performance utilities (cache, code-splitting, lazy-loading) into
packages/devtools/src/performance/ exposed via subpath exports
(@coherent.js/devtools/performance/cache etc.). Devtools already
contained its own profiler.js and performance-dashboard.js for the
same domain; the three-package split was artificial.

@coherent.js/profiler is deleted outright — it was 138 lines of
placeholder scaffolding with zero in-source consumers.

Part of Wave 2b (internal merges) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create `tooling` package, absorb `testing` + `language-server`, delete `language-service`

**Why third:** Largest merge. Creates a new package (`tooling`) with a mixed JS+TS build, absorbs two real packages (`testing`, `language-server`), and deletes one TS-only stub (`language-service`). Cross-package consumer updates required for `cli`'s scaffold templates that emit `import ... from '@coherent.js/testing'`.

**`@coherent.js/vscode-extension` is NOT touched in this task.** It stays as its own package; deferred to Wave 4 (paired with marketplace publish work).

**Files:**
- Create: entire `packages/tooling/` tree (see File Structure section above for full layout)
- Modify: `packages/cli/src/generators/package-scaffold.js` (update template strings: `'@coherent.js/testing'` → `'@coherent.js/tooling/testing'`)
- Modify: `packages/cli/src/commands/create.js` (update the CLI option label and value around line 200)
- Delete: `packages/testing/`
- Delete: `packages/language-server/`
- Delete: `packages/language-service/`
- Audit + modify if found: same orphan-pattern file list as Task 1, for all THREE deleted packages
- Add (NEW package): the same files need ENTRIES for `tooling`:
  - `.github/CODEOWNERS` — add `packages/tooling/ @Tomdrouv1` if pattern is followed
  - `.changeset/pre.json` — leave alone (only matters for prerelease-tracking older versions; the new tooling package starts at 1.0.0 directly)
  - `tsconfig.json` — add `{ "path": "./packages/tooling" }` to references
  - `eslint.config.js` — verify it covers `packages/tooling/**/*` via existing globs; if not, add
  - `scripts/add-exports-sections.js` — add a tooling entry if the pattern requires it (optional; consider whether the orphan script is worth maintaining at all)

### Step 1: Pre-check — consumer maps for all three packages

```bash
for pkg in testing language-server language-service; do
  echo "=== $pkg consumers ==="
  grep -rn "@coherent.js/$pkg\b" . \
    --include="*.js" --include="*.ts" --include="*.json" --include="*.md" --include="*.mjs" --include="*.yml" \
    2>/dev/null | grep -v "/node_modules/" | grep -v "/dist/" | grep -v "/coverage/" \
    | grep -v "pnpm-lock.yaml" | grep -v "packages/$pkg/" | grep -v "CHANGELOG"
done
```

Expected:
- `testing`: matches in `packages/cli/src/commands/create.js`, `packages/cli/src/generators/package-scaffold.js`, plus docs/scripts/changeset
- `language-server`: zero in-source consumers (LSP is consumed by editors via the binary)
- `language-service`: zero in-source consumers

If anything else turns up (an example uses `@coherent.js/testing`, etc.), add to scope.

### Step 2: Create the `tooling` package skeleton

```bash
mkdir -p packages/tooling/src/testing
mkdir -p packages/tooling/src/lsp
mkdir -p packages/tooling/scripts
mkdir -p packages/tooling/bin
```

Create `packages/tooling/package.json`:

```json
{
  "name": "@coherent.js/tooling",
  "version": "1.0.0-beta.8",
  "description": "Coherent.js dev-time tooling: testing utilities (Vitest matchers, render harness) and Language Server Protocol implementation.",
  "type": "module",
  "main": "./dist/testing/index.js",
  "exports": {
    "./testing": "./dist/testing/index.js",
    "./testing/renderer": "./dist/testing/test-renderer.js",
    "./testing/utils": "./dist/testing/test-utils.js",
    "./testing/matchers": "./dist/testing/matchers.js",
    "./lsp": "./dist/lsp/server.js"
  },
  "bin": {
    "coherent-language-server": "./dist/lsp/server.js"
  },
  "files": [
    "dist/",
    "bin/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "node build.mjs",
    "clean": "rm -rf dist/",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "engines": { "node": ">=20.0.0" },
  "license": "MIT",
  "peerDependencies": {
    "@coherent.js/core": "workspace:*"
  },
  "dependencies": {
    "vscode-languageserver": "^9.0.1",
    "vscode-languageserver-textdocument": "^1.0.11"
  },
  "devDependencies": {
    "vitest": "workspace:*",
    "tsx": "^4.0.0"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "sideEffects": false
}
```

(Adjust `dependencies` to match what `packages/language-server/package.json` actually declared — read it first to get the exact list and versions.)

Create `packages/tooling/README.md`:

```markdown
# @coherent.js/tooling

Dev-time tooling for Coherent.js: testing utilities and Language Server Protocol implementation.

## Subpath exports

- `@coherent.js/tooling/testing` — Vitest matchers, render harness, test utilities
- `@coherent.js/tooling/testing/renderer` — server-side render harness for component tests
- `@coherent.js/tooling/testing/matchers` — Vitest custom matchers (`toRender`, `toMatchSnapshot`, etc.)
- `@coherent.js/tooling/testing/utils` — assorted test helpers
- `@coherent.js/tooling/lsp` — Language Server Protocol implementation (consumed via the `coherent-language-server` binary)

## Binary

Installs `coherent-language-server`. Configure your editor's LSP client to launch this binary with `--stdio`.

## License

MIT
```

Create `packages/tooling/LICENSE` — copy from `packages/testing/LICENSE` or the repo-root LICENSE.

Create `packages/tooling/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist/lsp",
    "rootDir": "./src/lsp",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "resolveJsonModule": true
  },
  "include": ["src/lsp/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

(Match the patterns from `packages/language-server/tsconfig.json` — read it first.)

Create `packages/tooling/build.mjs`. **Pattern requirements (prose; do NOT copy code blindly — adapt from existing references)**:

The build must produce two output trees:
1. `dist/lsp/` — TypeScript compilation output. Source: `src/lsp/**/*.ts`. Pipeline matches `packages/language-server/package.json`'s pre-Wave-2b build script: first run `tsx scripts/extract-attributes.ts` (generates `src/lsp/data/element-attributes.generated.json`), then `tsc` (compiles TS), then copy the generated JSON into `dist/lsp/data/`.
2. `dist/testing/` — JavaScript bundle output. Source: `src/testing/*.js`. Pipeline matches `packages/testing/build.mjs`'s pre-Wave-2b approach (likely esbuild with per-file entry points, format esm, platform node, target node20, bundle false).

References to read before writing:
- `packages/language-server/package.json` (build script line)
- `packages/language-server/tsconfig.json` (compiler options)
- `packages/testing/build.mjs` (the existing JS build pattern)

Implementation notes:
- Use `execFileSync` from `node:child_process` (NOT `execSync` — execFileSync passes args as an array which avoids shell injection). Example shape: `execFileSync('tsx', ['scripts/extract-attributes.ts'], { stdio: 'inherit' })` and `execFileSync('tsc', [], { stdio: 'inherit' })`.
- Use `cpSync` and `mkdirSync` from `node:fs` for any file copies; `rmSync({ recursive: true, force: true })` for clean.
- For esbuild, `import { build } from 'esbuild'` and call it with an options object matching the existing testing/build.mjs pattern.

The exact code is left to the implementer — the requirement is "two-phase build producing the two dist subtrees that match the package.json `exports` field paths." Verify by listing `dist/` after build and confirming both `dist/lsp/server.js` and `dist/testing/index.js` exist.

### Step 3: Move testing source files into tooling

```bash
cp packages/testing/src/index.js packages/tooling/src/testing/index.js
cp packages/testing/src/matchers.js packages/tooling/src/testing/matchers.js
cp packages/testing/src/test-renderer.js packages/tooling/src/testing/test-renderer.js
cp packages/testing/src/test-utils.js packages/tooling/src/testing/test-utils.js
```

Also copy the test directory if it exists and has substantive tests:

```bash
if [ -d packages/testing/test ]; then
  mkdir -p packages/tooling/test/testing
  cp -r packages/testing/test/* packages/tooling/test/testing/
fi
```

Adjust imports inside the moved testing tests so they reference `../../src/testing/...` instead of `../src/...`.

### Step 4: Move language-server source files into tooling

```bash
cp -r packages/language-server/src/* packages/tooling/src/lsp/
cp -r packages/language-server/scripts/* packages/tooling/scripts/
```

Inside `packages/tooling/scripts/extract-attributes.ts`, find any path references like `'../src/data/'` and adjust to `'../src/lsp/data/'` (because the script now sits at `packages/tooling/scripts/` and the LSP code is at `packages/tooling/src/lsp/`, not at `packages/tooling/src/`).

Read the moved `src/lsp/server.ts` and its `analysis/` and `providers/` subdirectories. Adjust any relative imports that broke due to the new directory depth (most should still work — the `lsp/` subdirectory preserves the language-server's internal structure).

### Step 5: Add the LSP binary shim

Create `packages/tooling/bin/coherent-language-server` (or omit if `dist/lsp/server.js` already has a `#!/usr/bin/env node` shebang line and is executable). Recommended: rely on the shebang and the `bin` field in `package.json` pointing at `./dist/lsp/server.js`.

If the original `packages/language-server/dist/server.js` had a shebang, the moved TS source should preserve it (TS doesn't add a shebang automatically; check `packages/language-server/src/server.ts` and replicate at the top of `packages/tooling/src/lsp/server.ts`).

### Step 6: Update CLI scaffold templates

Open `packages/cli/src/generators/package-scaffold.js`. Find every string literal containing `@coherent.js/testing` (around lines 435, 439, 483, 503). Update each to `@coherent.js/tooling/testing`.

Open `packages/cli/src/commands/create.js`. Around line 200, find:

```js
{ title: '@coherent.js/testing', value: 'testing', description: 'Testing utilities & helpers' }
```

Update to:

```js
{ title: '@coherent.js/tooling (testing)', value: 'testing', description: 'Testing utilities & helpers (subpath of tooling)' }
```

Keep the `value: 'testing'` if scaffold logic switches on that string — changing the value would require following the call chain. Only change the displayed title and description.

### Step 7: Delete the three old packages

```bash
git rm -r packages/testing
git rm -r packages/language-server
git rm -r packages/language-service
```

### Step 8: Audit Task-1-pattern files for all three deleted packages AND for the new tooling package

For deletions (`testing`, `language-server`, `language-service`):

```bash
for pkg in testing language-server language-service; do
  echo "=== removing $pkg references ==="
  for f in \
    docs/README.md ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md \
    .changeset/pre.json .github/CODEOWNERS .github/labeler.yml \
    tsconfig.json eslint.config.js \
    scripts/fix-sideeffects.js scripts/add-exports-sections.js \
    scripts/shared-build.mjs scripts/build.js; do
    if grep -q "$pkg" "$f" 2>/dev/null; then
      echo "$f has matches"
      grep -n "$pkg" "$f"
    fi
  done
done
```

Remove matching entries.

Delete `docs/packages/testing.md`, `docs/packages/language-server.md`, `docs/packages/language-service.md` if they exist.

For NEW `tooling` package, ADD entries to:
- `.github/CODEOWNERS` — `packages/tooling/ @Tomdrouv1`
- `.github/labeler.yml` — `packages/tooling/**/*` under the appropriate label (look at how other packages are categorized; tooling fits with build/dev tools)
- `tsconfig.json` — add `{ "path": "./packages/tooling" }` to the references array
- `eslint.config.js` — verify the file is covered by the existing globs. If `packages/tooling` is not matched, add it (likely fits the same category as `testing` did previously).

Do NOT add tooling to `scripts/add-exports-sections.js` — that script is a docs generator flagged for removal in a future wave; adding entries to it is wasted effort.

### Step 9: Update top-level docs to reflect the consolidation

- `docs/README.md` — under "Available Packages" or equivalent, replace the testing/language-server/language-service entries with a single `tooling` entry. Same for "Extended Packages" section if applicable.
- `ARCHITECTURE.md` — update the package tree: remove the 3 deleted packages, add a `tooling/` entry.
- `DEVELOPMENT.md` — same as ARCHITECTURE.md.
- `PUBLISHING_GUIDE.md` — replace the 3 deleted entries with one `tooling` entry. Renumber the list.

### Step 10: Regenerate the lockfile

```bash
pnpm install
```

Verify:

```bash
grep -E "@coherent.js/(testing|language-server|language-service)\b" pnpm-lock.yaml
```

Should return nothing (or only historical hashes that get cleaned on subsequent installs).

Verify the new package is registered:

```bash
pnpm list --recursive --depth -1 | grep tooling
```

Should show `@coherent.js/tooling`.

### Step 11: Full quality gate

```bash
pnpm --filter @coherent.js/tooling run build
pnpm --filter @coherent.js/tooling run test
pnpm --filter @coherent.js/cli run test
pnpm test
pnpm typecheck:packages
pnpm build
```

Expected: all green. The tooling package builds (both LSP and testing artifacts present in `dist/`), all tests pass, CLI tests pass (scaffold templates now emit new tooling paths).

Verify subpath imports work:

```bash
node -e "import('@coherent.js/tooling/testing').then(m => console.log('testing OK:', Object.keys(m).slice(0, 5)))"
```

Verify the binary is installed:

```bash
ls node_modules/.bin/coherent-language-server
```

Should print the path (it's a symlink into the tooling package's bin).

### Step 12: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add -A packages docs ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md .changeset .github tsconfig.json eslint.config.js scripts pnpm-lock.yaml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
refactor(tooling): create @coherent.js/tooling, absorb testing + language-server, drop language-service

New @coherent.js/tooling package consolidates dev-time tooling:

- @coherent.js/tooling/testing (and subpaths): Vitest matchers,
  render harness, test utilities — moved from @coherent.js/testing
- @coherent.js/tooling/lsp + coherent-language-server binary:
  Language Server Protocol implementation — moved from
  @coherent.js/language-server

@coherent.js/language-service (TS-only stub, zero consumers) is
deleted with no replacement.

@coherent.js/vscode-extension is NOT touched in this commit — it
stays as its own package pending Wave 4 (marketplace publish work).

CLI scaffold templates updated to emit '@coherent.js/tooling/testing'
imports instead of '@coherent.js/testing'.

Part of Wave 2b (internal merges) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wave 2b verification + CHANGELOG entry

**Files:**
- Modify: `CHANGELOG.md`

### Step 1: Full pre-flight quality gate including CLEAN BUILD

```bash
pnpm clean
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm typecheck:packages
```

Expected: all 7 commands green. The clean+build pair catches stale dist artifacts that could mask issues from the package moves.

If anything fails, report BLOCKED. Do NOT edit code in this task to fix regressions.

### Step 2: Confirm workspace shrank to 16 packages

```bash
ls -1 packages/ | wc -l
```

Expected: `16` (down from 22 at start of Wave 2b: -6 packages = -build-tools -performance -profiler -testing -language-server -language-service +tooling).

Per-package verification:

```bash
for pkg in build-tools performance profiler testing language-server language-service; do
  if [ -d "packages/$pkg" ]; then
    echo "FAIL: $pkg still exists"
  else
    echo "OK: $pkg gone"
  fi
done

if [ -d "packages/tooling" ]; then
  echo "OK: tooling exists"
else
  echo "FAIL: tooling missing"
fi
```

All 6 should print OK and `tooling` should exist.

### Step 3: Extend the `## [Unreleased]` section of `CHANGELOG.md`

Open `CHANGELOG.md`. The existing `## [Unreleased]` section contains Wave 1 + Wave 2a entries. Add NEW Wave 2b subsections AFTER the existing Wave 2a ones (and BEFORE `## [1.0.0-beta.8]`):

```markdown
### Removed (Wave 2b)

- **BREAKING:** Removed standalone `@coherent.js/build-tools` package. Its plugins (vite, webpack, rollup, loader) now ship as subpath exports of `@coherent.js/cli`. Migration: replace `import ... from '@coherent.js/build-tools/vite'` with `import ... from '@coherent.js/cli/build-tools/vite'`. The `@coherent.js/build-tools` package name is no longer published.
- **BREAKING:** Removed standalone `@coherent.js/performance` package. Its utilities (cache, code-splitting, lazy-loading) now ship as subpath exports of `@coherent.js/devtools`. Migration: replace `import ... from '@coherent.js/performance/cache'` with `import ... from '@coherent.js/devtools/performance/cache'`.
- **BREAKING:** Removed `@coherent.js/profiler` package. It contained 138 lines of placeholder scaffolding with no in-source consumers. `@coherent.js/devtools` already provides the substantive profiling code via its own `profiler.js`.
- **BREAKING:** Removed standalone `@coherent.js/testing` package. Its Vitest matchers, render harness, and test utilities now ship as subpath exports of `@coherent.js/tooling`. Migration: replace `import ... from '@coherent.js/testing'` with `import ... from '@coherent.js/tooling/testing'`.
- **BREAKING:** Removed standalone `@coherent.js/language-server` package. Its Language Server Protocol implementation and `coherent-language-server` binary now ship inside `@coherent.js/tooling`. Editor LSP configs that launched the binary by package-prefixed path should now reference `@coherent.js/tooling` (or just continue to invoke the `coherent-language-server` binary if it's on PATH).
- **BREAKING:** Removed `@coherent.js/language-service` package. It was a TypeScript-only stub with no consumers; deleted with no replacement.

### Added (Wave 2b)

- **NEW:** `@coherent.js/tooling` package consolidates dev-time tooling. Subpaths: `./testing`, `./testing/renderer`, `./testing/utils`, `./testing/matchers`, `./lsp`. Bin: `coherent-language-server`. `@coherent.js/vscode-extension` remains a separate package for now — pending Wave 4 (marketplace publish work).
- `@coherent.js/cli` now exposes `./build-tools`, `./build-tools/vite`, `./build-tools/webpack`, `./build-tools/rollup`, `./build-tools/loader` subpaths (absorbed from the deleted `@coherent.js/build-tools` package).
- `@coherent.js/devtools` now exposes `./performance`, `./performance/cache`, `./performance/code-splitting`, `./performance/lazy-loading` subpaths (absorbed from the deleted `@coherent.js/performance` package).

### Changed (Wave 2b)

- `packages/cli/src/generators/package-scaffold.js` and `packages/cli/src/commands/create.js` updated to emit/display the new `@coherent.js/tooling/testing` import path when scaffolding new projects.
- `examples/vite-integration/vite.config.js` updated to import from `@coherent.js/cli/build-tools/vite`.
- `examples/ecommerce-fullstack/package.json` swapped its `@coherent.js/build-tools` workspace dep for `@coherent.js/cli`.

### Notes (Wave 2b)

- Workspace shrank from 22 → 16 packages.
- Net file move: ~30 source files relocated into 3 absorbing packages, 5 small/empty packages deleted, 1 new `tooling` package created with a mixed JS+TS build.
- Remaining 16 packages: adapters, api, cli, client, core, database, devtools, express, fastify, forms, i18n, koa, nextjs, seo, state, tooling, vscode-extension. (vscode-extension stays separate pending Wave 4; Wave 2c will consolidate adapters+express+fastify+koa+nextjs into `integrations` to reach the spec target.)
```

### Step 4: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs(changelog): record Wave 2b internal merges

Documents the absorption of build-tools into cli, performance into
devtools (profiler outright deleted), and the creation of the new
tooling package absorbing testing + language-server (language-service
deleted).

Closes Wave 2b of v1.0 stable hardening. Trunk is green; workspace is
now 16 packages (was 22). Ready for Wave 2c (integrations
consolidation: express+fastify+koa+nextjs+adapters → integrations
subpaths).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 5: Final confirmation

```bash
git log --oneline <wave-2b-base-sha>..HEAD
```

Expected (most recent first): your CHANGELOG commit, then Task 3 commit, Task 2 commit, Task 1 commit. Four commits total (plus follow-up fix-up commits if any).

```bash
git status --short
```

Expected: only pre-existing unrelated drift. Nothing from Wave 2b uncommitted.

---

## Post-Wave-2b handoff

Wave 2b is done. Workspace is now 16 packages.

Next plans:
- **Wave 2c — `integrations` consolidation:** New `@coherent.js/integrations` package with subpath exports for `express`, `fastify`, `koa`, `nextjs`, and the three adapters (astro/remix/sveltekit currently bundled in `@coherent.js/adapters`). Biggest restructure of the wave — many downstream consumers. Plans this after Wave 2b merges to reflect post-merge workspace state. Target: 16 → 12 packages.
- **Wave 3 — Lockdown** (API surface snapshots, perf CI gates).
- **Wave 4 — Browser parity** (HMR dev server, Playwright E2E, VS Code marketplace publish — this is when vscode-extension absorbs into tooling).
- **Wave 5 — Release** (migration guide, rc soak, 1.0 tag).
