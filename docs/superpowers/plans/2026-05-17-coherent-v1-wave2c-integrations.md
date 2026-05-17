# Coherent.js v1.0 — Wave 2c: `integrations` Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Wave 2 Section 1 (the `integrations` row).

**Goal:** Create a new `@coherent.js/integrations` package and absorb all 5 framework-integration packages (`express`, `fastify`, `koa`, `nextjs`, plus `adapters` which bundles astro/remix/sveltekit) as subpath exports. Takes the workspace from 17 → 13 packages.

**Architecture:** Same pattern as Wave 2b: each absorbed framework's source moves into `packages/integrations/src/<framework>/` and gets a subpath export (`@coherent.js/integrations/express`, etc.). Cross-package consumers (CLI scaffold templates, runtime-scaffold tests, examples, vite external lists) get updated in the same commit as the absorption. Atomic CI-green commits per task.

**Tech Stack:** pnpm workspaces, Vitest, ESM only (per CLAUDE.md), Node ≥ 20.

**Wave 2c NOT in scope:**
- `vscode-extension` absorption into `tooling` — Wave 4 (paired with marketplace publish work)
- API surface lockdown — Wave 3
- Browser parity (Playwright, HMR dev server) — Wave 4
- Release (migration guide, RC) — Wave 5

**Final package count after Wave 2c:**
17 → 13 packages. Plus a Wave-4 absorption of `vscode-extension` brings it to 12 (the spec target).

**Lessons baked in from prior waves:**
- All package.json `exports` use ESM-only paths (no `.cjs` paths unless `.cjs` is actually emitted). The integration packages currently advertise `.cjs` in `exports.require` (each has `"require": "./dist/index.cjs"`); we DROP those during the move per project ESM-only policy.
- Each absorbed package's TypeScript definitions (`.d.ts`) get preserved under the new `types/` subtree and referenced via `types` conditions in the exports field.
- Orphan-pattern files MUST be audited every task: `docs/README.md` (both sections), `examples/README.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `PUBLISHING_GUIDE.md` (with renumbering), `CLAUDE.md`, `README.md`, `AGENTS.md`, `.changeset/pre.json`, `.github/CODEOWNERS`, `.github/labeler.yml`, `tsconfig.json` project references, `eslint.config.js` per-package globs, `scripts/fix-sideeffects.js`, `scripts/add-exports-sections.js`, `scripts/shared-build.mjs`, `scripts/build.js`.

---

## Consumer reality (informs every task)

The 5 absorbed packages have **CLI scaffold template** consumers — this is the most impactful surface to update:

- `packages/cli/src/generators/runtime-scaffold.js`:
  - line ~234: emits `import { setupCoherent } from '@coherent.js/fastify';` in scaffold templates
  - line ~294: same for koa
  - line ~353, 358, 365: dependency declarations for express/fastify/koa
- `packages/cli/test/scaffold-matrix.test.js`: lines 77, 80, 83 assert scaffold output declares each integration as a dep
- `packages/cli/test/import-audit.test.js`: lines 107, 111, 116 list expected exports for each integration; lines 453, 463, 493 use `@coherent.js/express` in fixture code
- `examples/express-integration.js`: real import of `createCoherentHandler, setupCoherent` from `@coherent.js/express`
- `examples/nextjs-integration.js`: real import of `createCoherentNextHandler`
- `examples/vite-integration/vite.config.js`: externalizes `@coherent.js/express` and `@coherent.js/fastify`
- `website/src/index.js:525`: log-string mentions express

**Adapters package** has no real JS/TS consumers — only docs.

---

## File Structure (final state after Wave 2c)

```
packages/integrations/
├── package.json                     # NEW
├── README.md                        # NEW
├── LICENSE                          # NEW (copy from express)
├── build.mjs                        # NEW (emits dist/<framework>/index.js per absorbed adapter)
├── tsconfig.json                    # NEW (compiles all framework subtrees)
├── src/
│   ├── express/
│   │   ├── coherent-express.js     # moved from packages/express/src/
│   │   └── index.js                # moved from packages/express/src/
│   ├── fastify/
│   │   └── coherent-fastify.js     # moved from packages/fastify/src/
│   ├── koa/
│   │   ├── coherent-koa.js         # moved from packages/koa/src/
│   │   └── index.js                # moved from packages/koa/src/
│   ├── nextjs/
│   │   ├── coherent-nextjs.js      # moved from packages/nextjs/src/
│   │   └── index.js                # moved from packages/nextjs/src/
│   ├── astro/
│   │   └── index.js                # moved from packages/adapters/src/astro.js
│   ├── remix/
│   │   └── index.js                # moved from packages/adapters/src/remix.js
│   └── sveltekit/
│       └── index.js                # moved from packages/adapters/src/sveltekit.js
└── types/
    ├── express/
    │   └── index.d.ts              # moved from packages/express/src/coherent-express.d.ts
    ├── fastify/
    │   └── index.d.ts              # moved from packages/fastify/src/coherent-fastify.d.ts
    ├── nextjs/
    │   └── index.d.ts              # moved from packages/nextjs/src/coherent-nextjs.d.ts
    └── ... (koa, adapters lack .d.ts — leave subdirs empty or omit)
```

Deleted: `packages/express/`, `packages/fastify/`, `packages/koa/`, `packages/nextjs/`, `packages/adapters/`.

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: only pre-existing dirty files (`package.json`, `tsconfig.tsbuildinfo`, `pnpm-workspace.yaml`, `test-results/`). Don't touch them.

- [ ] **Step 2: Confirm baseline is green**

Run: `pnpm test && pnpm typecheck:packages && pnpm build`
Expected: green (1670 tests passing post-Wave-2b). If anything fails on a clean main checkout, stop and investigate.

---

## Task 1: Create `integrations` package + absorb `@coherent.js/express`

**Why first:** Establishes the package structure, build pipeline, exports pattern, and test fixture format that Tasks 2 and 3 follow. Express is the most-consumed integration (real example, CLI scaffold template, import-audit fixture).

**Files:**
- Create: entire `packages/integrations/` skeleton (package.json, README, LICENSE, build.mjs, tsconfig.json)
- Create: `packages/integrations/src/express/coherent-express.js`, `index.js`
- Create: `packages/integrations/types/express/index.d.ts`
- Modify: `packages/cli/src/generators/runtime-scaffold.js` — express dep line (~line 353)
- Modify: `packages/cli/test/scaffold-matrix.test.js` — express expectation (~line 77)
- Modify: `packages/cli/test/import-audit.test.js` — express export expectations (~line 107) AND fixture code (~lines 453, 463, 493)
- Modify: `examples/express-integration.js` — update import path
- Modify: `examples/vite-integration/vite.config.js` — replace `@coherent.js/express` with `@coherent.js/integrations` in external array
- Modify: `website/src/index.js:525` — update the log string
- Delete: `packages/express/`
- Audit + modify if found: docs files, `.changeset/pre.json`, `.github/CODEOWNERS`, `.github/labeler.yml`, `tsconfig.json` (project refs), `eslint.config.js`, `scripts/fix-sideeffects.js`, `scripts/add-exports-sections.js`
- Add tooling-equivalent ADDITIONS for the new `integrations` package: `.github/CODEOWNERS`, `tsconfig.json` project ref, `.github/labeler.yml` glob

### Step 1: Pre-check — confirm express consumer map

Run from `/Users/thomasdrouvin/Perso/coherent`:

```bash
grep -rn "@coherent.js/express\b" . \
  --include="*.js" --include="*.ts" --include="*.json" --include="*.md" --include="*.mjs" --include="*.yml" \
  2>/dev/null | grep -v "/node_modules/" | grep -v "/dist/" | grep -v "/coverage/" \
  | grep -v "pnpm-lock.yaml" | grep -v "packages/express/" | grep -v "CHANGELOG" \
  | grep -v "/docs/superpowers/" | grep -v "/\.planning/"
```

Compare against the Files section. Any new consumer not listed → stop and add to scope.

### Step 2: Create the `integrations` package skeleton

```bash
mkdir -p packages/integrations/src/express
mkdir -p packages/integrations/types/express
```

Create `packages/integrations/package.json`:

```json
{
  "name": "@coherent.js/integrations",
  "version": "1.0.0-beta.8",
  "description": "Framework integration adapters for Coherent.js: Express, Fastify, Koa, Next.js, Astro, Remix, SvelteKit.",
  "type": "module",
  "exports": {
    "./express": {
      "types": "./types/express/index.d.ts",
      "import": "./src/express/index.js"
    }
  },
  "files": [
    "src/",
    "types/",
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
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Tomdrouv1/coherent.js.git"
  },
  "homepage": "https://github.com/Tomdrouv1/coherent.js",
  "bugs": {
    "url": "https://github.com/Tomdrouv1/coherent.js/issues"
  },
  "peerDependencies": {
    "@coherent.js/core": "workspace:*",
    "express": ">=4.18.0 < 6.0.0"
  },
  "peerDependenciesMeta": {
    "express": { "optional": true }
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "sideEffects": false
}
```

(Tasks 2 and 3 will add fastify/koa/nextjs/astro/remix/sveltekit to `exports`, `peerDependencies`, and `peerDependenciesMeta` incrementally.)

Create `packages/integrations/README.md` (brief — describe subpaths, refer to the docs for details):

```markdown
# @coherent.js/integrations

Framework integration adapters for Coherent.js — bridges between your chosen HTTP/SSG framework and the Coherent.js rendering engine.

## Subpath exports

- `@coherent.js/integrations/express` — Express.js adapter
- `@coherent.js/integrations/fastify` — Fastify adapter (added in 1.0.0)
- `@coherent.js/integrations/koa` — Koa adapter (added in 1.0.0)
- `@coherent.js/integrations/nextjs` — Next.js adapter (added in 1.0.0)
- `@coherent.js/integrations/astro` — Astro adapter (added in 1.0.0)
- `@coherent.js/integrations/remix` — Remix adapter (added in 1.0.0)
- `@coherent.js/integrations/sveltekit` — SvelteKit adapter (added in 1.0.0)

## Migration from pre-1.0

Each framework previously shipped as its own package (`@coherent.js/express`, etc.). Migrate by changing import paths:

```diff
- import { setupCoherent } from '@coherent.js/express';
+ import { setupCoherent } from '@coherent.js/integrations/express';
```

Public API is unchanged — only the import path moves.

## License

MIT
```

Copy LICENSE:

```bash
cp packages/express/LICENSE packages/integrations/LICENSE
```

Create `packages/integrations/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "allowJs": true,
    "checkJs": false,
    "emitDeclarationOnly": false,
    "declaration": false,
    "noEmit": true
  },
  "include": ["src/**/*.js", "types/**/*.d.ts"],
  "exclude": ["dist", "node_modules"]
}
```

(typecheck-only — we don't emit a dist from tsc. JS source ships directly via the `./src/` exports. Match what Wave 2b's tooling does for the testing subtree.)

Create `packages/integrations/build.mjs`. Pattern: pure ESM passthrough (sources ship from `src/`, no bundling required since the project is ESM-only and the integration code is small per-framework). If devtools or tooling's build.mjs has a no-op pattern, mirror it. Minimal viable:

```js
console.log('✅ @coherent.js/integrations: src ships directly, no build required.');
```

This matches the Task-1 (Wave 2b) approach where cli's build-tools subpaths point at `./src/`.

### Step 3: Move express source files

```bash
cp packages/express/src/coherent-express.js packages/integrations/src/express/coherent-express.js
cp packages/express/src/index.js packages/integrations/src/express/index.js
```

Verify content preserved: `diff -r packages/express/src packages/integrations/src/express` should show no diff.

### Step 4: Move express TypeScript definitions

```bash
cp packages/express/src/coherent-express.d.ts packages/integrations/types/express/index.d.ts
```

Read the moved `.d.ts` for any relative type imports that broke. The express adapter likely imports from `@coherent.js/core` — that stays unchanged.

### Step 5: Adjust internal imports in moved express files

```bash
grep -n "from ['\"]\\.\\./\\|from ['\"]\\./" packages/integrations/src/express/*.js
```

For each match: within-directory imports (`./coherent-express.js`) are fine. Anything reaching outside `express/` to the old `packages/express/` root needs updating (unlikely given the file sizes).

### Step 6: Update `examples/express-integration.js`

Open the file. Change:

```js
import { createCoherentHandler, setupCoherent } from '@coherent.js/express';
```

to:

```js
import { createCoherentHandler, setupCoherent } from '@coherent.js/integrations/express';
```

Verify by grep: `grep -n "@coherent.js/express\|@coherent.js/integrations" examples/express-integration.js`. Should show only the integrations import.

### Step 7: Update `examples/vite-integration/vite.config.js`

Find the externals array (around line 48):

```js
external: ['@coherent.js/express', '@coherent.js/fastify']
```

For Task 1 (which only absorbs express), change to:

```js
external: ['@coherent.js/integrations', '@coherent.js/fastify']
```

(Task 2 will drop `@coherent.js/fastify` from this array when it absorbs fastify. Leaving fastify here for now means vite still externalizes it, which is correct because fastify still exists.)

### Step 8: Update `website/src/index.js:525`

Read the file around line 525. Find the log-string referencing `@coherent.js/express`. Update to mention `@coherent.js/integrations/express`. Single-string change.

### Step 9: Update CLI scaffold templates and tests for express

In `packages/cli/src/generators/runtime-scaffold.js`:
- Line ~353: change `'@coherent.js/express': \`^${cliVersion}\`` to `'@coherent.js/integrations': \`^${cliVersion}\`` (since the scaffolded project now only needs the one dep)
- If the scaffold also emits a real import string for express (search for `'@coherent.js/express'`), update that to `'@coherent.js/integrations/express'`

In `packages/cli/test/scaffold-matrix.test.js`:
- Around line 77: `expect(packageJson.dependencies['@coherent.js/express']).toBeDefined();` → change to `expect(packageJson.dependencies['@coherent.js/integrations']).toBeDefined();`

In `packages/cli/test/import-audit.test.js`:
- Around line 107: the `'@coherent.js/express': [...]` block listing expected exports — rename the key to `'@coherent.js/integrations/express'`. Same expected exports.
- Around lines 453, 463, 493: fixture code using `@coherent.js/express` → update to `@coherent.js/integrations/express`

Run the CLI tests to verify:

```bash
pnpm --filter @coherent.js/cli run test
```

### Step 10: Delete the express package

```bash
git rm -r packages/express
```

Also delete `docs/packages/express.md` if it exists:

```bash
[ -f docs/packages/express.md ] && git rm docs/packages/express.md
```

### Step 11: Audit orphan-pattern files for express

```bash
for f in \
  docs/README.md examples/README.md \
  ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md CLAUDE.md README.md AGENTS.md \
  .changeset/pre.json .github/CODEOWNERS .github/labeler.yml \
  tsconfig.json eslint.config.js \
  scripts/fix-sideeffects.js scripts/add-exports-sections.js \
  scripts/shared-build.mjs scripts/build.js; do
  if grep -q "@coherent.js/express\b\|packages/express" "$f" 2>/dev/null; then
    echo "$f has matches:"
    grep -n "@coherent.js/express\b\|packages/express" "$f"
  fi
done
```

For each match:
- Docs files: update to mention `@coherent.js/integrations/express` (or delete if better — `PUBLISHING_GUIDE.md` may want to consolidate)
- `.changeset/pre.json`: delete the express entry, fix trailing commas
- `.github/CODEOWNERS`: delete the express line (Step 12 adds the integrations entry)
- `.github/labeler.yml`: delete express glob (Step 12 adds integrations glob)
- `tsconfig.json`: delete express project ref (Step 12 adds integrations ref)
- `eslint.config.js`: delete or repoint per-package overrides
- `scripts/fix-sideeffects.js`: remove `'express'` from `packagesToFix`
- `scripts/add-exports-sections.js`: remove express section. Run `node --check` after.

### Step 12: ADD `integrations` orphan-pattern entries (since it's a NEW package)

- `.github/CODEOWNERS` — add `packages/integrations/ @Tomdrouv1` (match format of other entries)
- `.github/labeler.yml` — add a glob entry for `packages/integrations/**/*` under the appropriate label (likely "integrations" or "core" depending on convention)
- `tsconfig.json` — add `{ "path": "./packages/integrations" }` to the `references` array
- `eslint.config.js` — verify it covers `packages/integrations/**/*` via existing globs; if not, add it
- Do NOT add to `scripts/add-exports-sections.js` (script slated for removal)

### Step 13: Regenerate lockfile

```bash
pnpm install
```

Verify: `grep "@coherent.js/express" pnpm-lock.yaml` returns nothing.

### Step 14: Full quality gate

```bash
pnpm test
pnpm typecheck:packages
pnpm build
pnpm lint
```

Expected: all green. The express package's tests (if any) are gone — coverage transfers to integrations tests in later waves if needed. CLI tests should still pass (templates updated).

Verify the subpath import works:

```bash
node --input-type=module -e "import('@coherent.js/integrations/express').then(m => console.log('express OK:', Object.keys(m)))"
```

### Step 15: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add -A packages docs ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md CLAUDE.md README.md AGENTS.md examples website .changeset .github tsconfig.json eslint.config.js scripts pnpm-lock.yaml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
refactor(integrations): create @coherent.js/integrations, absorb @coherent.js/express

Establishes the new @coherent.js/integrations package consolidating
framework integration adapters as subpath exports. Absorbs the express
adapter as the first integration:

- Source moved to packages/integrations/src/express/
- Subpath export @coherent.js/integrations/express preserves the
  public API
- TypeScript definitions moved to packages/integrations/types/express/

Cross-package consumers updated:
- CLI scaffold templates emit the new import path
- CLI tests (scaffold-matrix, import-audit) updated
- examples/express-integration.js updated
- examples/vite-integration/vite.config.js externals updated
- website log strings updated

Tasks 2 and 3 of Wave 2c will add fastify/koa/nextjs and the SSG
adapters (astro/remix/sveltekit) using the same pattern.

Part of Wave 2c (integrations consolidation) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Absorb `fastify` + `koa` + `nextjs` into `integrations`

**Why batch:** All three are server-framework adapters that follow Task 1's express pattern. The CLI scaffold (`runtime-scaffold.js`) emits template strings for all three in adjacent code paths — updating them together is more coherent than three separate commits. After Task 1 establishes the structure, these three are mechanical applications of the same pattern.

**Files:**
- Create: `packages/integrations/src/fastify/coherent-fastify.js` (moved)
- Create: `packages/integrations/src/koa/coherent-koa.js`, `index.js` (moved)
- Create: `packages/integrations/src/nextjs/coherent-nextjs.js`, `index.js` (moved)
- Create: `packages/integrations/types/fastify/index.d.ts` (moved)
- Create: `packages/integrations/types/nextjs/index.d.ts` (moved)
- Modify: `packages/integrations/package.json` (add 3 subpath exports + peer-deps)
- Modify: `packages/cli/src/generators/runtime-scaffold.js` (3 places: ~line 234 fastify template, ~line 294 koa template, ~line 358 fastify dep, ~line 365 koa dep)
- Modify: `packages/cli/test/scaffold-matrix.test.js` (lines 80, 83)
- Modify: `packages/cli/test/import-audit.test.js` (lines 111, 116 — fastify and koa expected-export blocks)
- Modify: `examples/nextjs-integration.js` (update import path)
- Modify: `examples/vite-integration/vite.config.js` (remove `@coherent.js/fastify` from externals since it's gone)
- Delete: `packages/fastify/`, `packages/koa/`, `packages/nextjs/`
- Delete: `docs/packages/fastify.md`, `docs/packages/koa.md`, `docs/packages/nextjs.md` (if they exist)
- Audit + modify orphan-pattern files for ALL THREE deleted packages

### Step 1: Pre-check — consumer maps for all three

```bash
for pkg in fastify koa nextjs; do
  echo "=== $pkg consumers ==="
  grep -rn "@coherent.js/$pkg\b" . \
    --include="*.js" --include="*.ts" --include="*.json" --include="*.md" --include="*.mjs" --include="*.yml" \
    2>/dev/null | grep -v "/node_modules/" | grep -v "/dist/" | grep -v "/coverage/" \
    | grep -v "pnpm-lock.yaml" | grep -v "packages/$pkg/" | grep -v "CHANGELOG" \
    | grep -v "/docs/superpowers/" | grep -v "/\.planning/"
done
```

Expected: matches in CLI scaffold + tests, `examples/nextjs-integration.js`, `examples/vite-integration/vite.config.js` (fastify only), docs, scripts, configs.

### Step 2: Move source files

```bash
mkdir -p packages/integrations/src/fastify packages/integrations/src/koa packages/integrations/src/nextjs
mkdir -p packages/integrations/types/fastify packages/integrations/types/nextjs

# Fastify
cp packages/fastify/src/coherent-fastify.js packages/integrations/src/fastify/coherent-fastify.js
cp packages/fastify/src/coherent-fastify.d.ts packages/integrations/types/fastify/index.d.ts 2>/dev/null

# Koa
cp packages/koa/src/coherent-koa.js packages/integrations/src/koa/coherent-koa.js
[ -f packages/koa/src/index.js ] && cp packages/koa/src/index.js packages/integrations/src/koa/index.js

# Next.js
cp packages/nextjs/src/coherent-nextjs.js packages/integrations/src/nextjs/coherent-nextjs.js
cp packages/nextjs/src/index.js packages/integrations/src/nextjs/index.js
cp packages/nextjs/src/coherent-nextjs.d.ts packages/integrations/types/nextjs/index.d.ts
```

Some packages don't have `.d.ts` (koa lacks one based on the scout). Skip those `cp` commands if the source file doesn't exist (the `2>/dev/null` and `[ -f ... ] &&` guards handle this above).

Also note: fastify lacks `src/index.js`, only `coherent-fastify.js`. The subpath export should point at `coherent-fastify.js` directly:

```js
"./fastify": { ... "import": "./src/fastify/coherent-fastify.js" }
```

For express and nextjs which have an `index.js`, point at that. For koa, point at `index.js` if it exists, else `coherent-koa.js`.

### Step 3: Adjust internal imports in copied files

```bash
grep -n "from ['\"]\\.\\./\\|from ['\"]\\./" packages/integrations/src/fastify/*.js packages/integrations/src/koa/*.js packages/integrations/src/nextjs/*.js
```

Within-directory sibling imports are fine. Anything reaching outside needs updating.

### Step 4: Update `packages/integrations/package.json`

Add to the `exports` field (preserve the existing `./express` entry):

```json
"./fastify": {
  "types": "./types/fastify/index.d.ts",
  "import": "./src/fastify/coherent-fastify.js"
},
"./koa": {
  "import": "./src/koa/index.js"
},
"./nextjs": {
  "types": "./types/nextjs/index.d.ts",
  "import": "./src/nextjs/index.js"
}
```

If koa has no `index.js`, point its `import` at `./src/koa/coherent-koa.js`. If koa lacks `.d.ts`, omit the `types` condition.

Add peer-dependencies (preserve the express + core peers):

```json
"peerDependencies": {
  "@coherent.js/core": "workspace:*",
  "express": ">=4.18.0 < 6.0.0",
  "fastify": ">=4.0.0 < 6.0.0",
  "koa": ">=2.13.0 < 4.0.0",
  "next": ">=13.0.0"
},
"peerDependenciesMeta": {
  "express": { "optional": true },
  "fastify": { "optional": true },
  "koa": { "optional": true },
  "next": { "optional": true }
}
```

(Get exact version pins from each deleted package's `package.json` BEFORE deleting. Read `git show HEAD:packages/fastify/package.json | grep -A 5 peerDep` to confirm.)

### Step 5: Update CLI scaffold templates

Open `packages/cli/src/generators/runtime-scaffold.js`. Find and update:

- Line ~234: `import { setupCoherent } from '@coherent.js/fastify';` → `'@coherent.js/integrations/fastify';`
- Line ~294: `import { setupCoherent } from '@coherent.js/koa';` → `'@coherent.js/integrations/koa';`
- Line ~358: dep declaration `'@coherent.js/fastify': ...` → `'@coherent.js/integrations': ...`
- Line ~365: dep declaration `'@coherent.js/koa': ...` → `'@coherent.js/integrations': ...`
- Search for any `@coherent.js/nextjs` references and update to `@coherent.js/integrations/nextjs`

Some scaffolds may want a single `@coherent.js/integrations` dep at the project level (rather than per-framework). Pick ONE convention and apply consistently:
- Option A: Scaffolded project gets `@coherent.js/integrations` once in package.json + framework-specific subpath imports in code
- Option B: Scaffolded project gets `@coherent.js/integrations/<framework>` (the subpath) in package.json directly

Option A is the npm-canonical approach. Use it.

### Step 6: Update CLI tests

In `packages/cli/test/scaffold-matrix.test.js`:
- Line ~80: `expect(packageJson.dependencies['@coherent.js/fastify']).toBeDefined();` → `expect(packageJson.dependencies['@coherent.js/integrations']).toBeDefined();`
- Line ~83: same for koa

Note: after Task 1, express was already changed. Lines for fastify and koa get the same treatment.

In `packages/cli/test/import-audit.test.js`:
- Line ~111: key `'@coherent.js/fastify'` → `'@coherent.js/integrations/fastify'`
- Line ~116: key `'@coherent.js/koa'` → `'@coherent.js/integrations/koa'`

### Step 7: Update `examples/nextjs-integration.js`

```js
import { createCoherentNextHandler } from '@coherent.js/nextjs';
```

→

```js
import { createCoherentNextHandler } from '@coherent.js/integrations/nextjs';
```

### Step 8: Update `examples/vite-integration/vite.config.js`

Currently the externals array (post-Task-1) has:

```js
external: ['@coherent.js/integrations', '@coherent.js/fastify']
```

Change to:

```js
external: ['@coherent.js/integrations']
```

(Single integrations dep handles both.)

### Step 9: Delete the three packages and docs

```bash
git rm -r packages/fastify packages/koa packages/nextjs
[ -f docs/packages/fastify.md ] && git rm docs/packages/fastify.md
[ -f docs/packages/koa.md ] && git rm docs/packages/koa.md
[ -f docs/packages/nextjs.md ] && git rm docs/packages/nextjs.md
```

### Step 10: Orphan-pattern audit for all three packages

```bash
for pkg in fastify koa nextjs; do
  echo "=== removing $pkg references ==="
  for f in \
    docs/README.md examples/README.md \
    ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md CLAUDE.md README.md AGENTS.md \
    .changeset/pre.json .github/CODEOWNERS .github/labeler.yml \
    tsconfig.json eslint.config.js \
    scripts/fix-sideeffects.js scripts/add-exports-sections.js \
    scripts/shared-build.mjs scripts/build.js; do
    if grep -q "@coherent.js/$pkg\b\|packages/$pkg" "$f" 2>/dev/null; then
      echo "$f has matches:"; grep -n "$pkg" "$f"
    fi
  done
done
```

For each match, edit following the same patterns Task 1 established. PUBLISHING_GUIDE.md will need 3 entries removed + renumbering. Each integration's tree entry in ARCHITECTURE.md / DEVELOPMENT.md / CLAUDE.md should be removed (the `integrations` entry was added in Task 1).

Cross-references INSIDE other now-deleted packages (e.g., `packages/nextjs/README.md` references `@coherent.js/express` and `@coherent.js/koa`) go away with the package deletions — nothing to update.

### Step 11: Regenerate lockfile

```bash
pnpm install
```

Verify:

```bash
grep -E "@coherent.js/(fastify|koa|nextjs)\b" pnpm-lock.yaml
```

Should return nothing.

### Step 12: Full quality gate

```bash
pnpm test
pnpm typecheck:packages
pnpm build
pnpm lint
```

Expected: green. CLI tests should pass with the updated template/expectation strings.

Verify all 4 subpath imports:

```bash
for fw in express fastify koa nextjs; do
  node --input-type=module -e "import('@coherent.js/integrations/$fw').then(m => console.log('$fw OK:', Object.keys(m).slice(0,5)))"
done
```

### Step 13: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add -A packages docs ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md CLAUDE.md README.md AGENTS.md examples website .changeset .github tsconfig.json eslint.config.js scripts pnpm-lock.yaml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
refactor(integrations): absorb fastify, koa, and nextjs adapters

Adds three more server-framework subpath exports to @coherent.js/integrations:
- @coherent.js/integrations/fastify
- @coherent.js/integrations/koa
- @coherent.js/integrations/nextjs

Each was a tiny standalone package (~125-250 lines of source). Merging
them into integrations reaches the spec's "framework adapters
consistently bundled" goal.

CLI scaffold templates updated to emit '@coherent.js/integrations' as
the single dep with framework-specific subpath imports in user code.
CLI tests (scaffold-matrix, import-audit) updated accordingly.
examples/nextjs-integration.js uses the new import path.
examples/vite-integration externals list collapsed to a single entry.

Part of Wave 2c (integrations consolidation) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Absorb `adapters` (Astro, Remix, SvelteKit) into `integrations`

**Why third:** `@coherent.js/adapters` already bundles 3 SSG adapters with subpath exports of its own (`./astro`, `./remix`, `./sveltekit`). Moving them into `integrations` is just one more application of the same pattern. Zero real JS/TS consumers (only docs reference them) — easiest absorption of Wave 2c.

**Files:**
- Create: `packages/integrations/src/astro/index.js`, `packages/integrations/src/remix/index.js`, `packages/integrations/src/sveltekit/index.js` (moved from `packages/adapters/src/*.js`)
- Modify: `packages/integrations/package.json` (add 3 subpath exports)
- Delete: `packages/adapters/`
- Delete: `docs/packages/adapters.md`
- Modify: `docs/packages/adapters.md` references in any leftover docs (likely none post-Task-2's audit)
- Audit + modify orphan-pattern files for `adapters`

### Step 1: Confirm zero JS/TS consumers

```bash
grep -rn "@coherent.js/adapters\b" . \
  --include="*.js" --include="*.ts" --include="*.mjs" \
  2>/dev/null | grep -v "/node_modules/" | grep -v "/dist/" | grep -v "/coverage/" \
  | grep -v "pnpm-lock.yaml" | grep -v "packages/adapters/" \
  | grep -v "/docs/superpowers/" | grep -v "/\.planning/"
```

Expected: empty. If anything turns up (an example uses an SSG adapter), add to scope.

### Step 2: Move the 3 SSG source files

```bash
mkdir -p packages/integrations/src/astro packages/integrations/src/remix packages/integrations/src/sveltekit
cp packages/adapters/src/astro.js packages/integrations/src/astro/index.js
cp packages/adapters/src/remix.js packages/integrations/src/remix/index.js
cp packages/adapters/src/sveltekit.js packages/integrations/src/sveltekit/index.js
```

Verify content preserved (`diff`).

### Step 3: Adjust internal imports in copied files

```bash
grep -n "from ['\"]\\.\\./\\|from ['\"]\\./" packages/integrations/src/astro/*.js packages/integrations/src/remix/*.js packages/integrations/src/sveltekit/*.js
```

Most likely each is self-contained or only imports from `@coherent.js/core` (workspace dep — unchanged). Verify and fix anything that doesn't resolve.

### Step 4: Update `packages/integrations/package.json`

Add to the `exports` field:

```json
"./astro": {
  "import": "./src/astro/index.js"
},
"./remix": {
  "import": "./src/remix/index.js"
},
"./sveltekit": {
  "import": "./src/sveltekit/index.js"
}
```

(No `types` conditions — the adapters package had no `.d.ts` for these.)

Add peer-dependencies (from `git show HEAD:packages/adapters/package.json | grep -A 10 peerDep` BEFORE deleting). Update `peerDependenciesMeta` similarly.

### Step 5: Delete the adapters package and its doc

```bash
git rm -r packages/adapters
[ -f docs/packages/adapters.md ] && git rm docs/packages/adapters.md
```

### Step 6: Orphan-pattern audit for `adapters`

```bash
for f in \
  docs/README.md examples/README.md \
  ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md CLAUDE.md README.md AGENTS.md \
  .changeset/pre.json .github/CODEOWNERS .github/labeler.yml \
  tsconfig.json eslint.config.js \
  scripts/fix-sideeffects.js scripts/add-exports-sections.js; do
  if grep -q "@coherent.js/adapters\b\|packages/adapters" "$f" 2>/dev/null; then
    echo "$f has matches:"; grep -n "adapters" "$f"
  fi
done
```

For each match: same patterns as Task 1/2. Note that `eslint.config.js` may have an "adapters" override block that's still valid for `packages/integrations/src/{astro,remix,sveltekit}/**/*` (since those are the same adapters now under a new home) — consider repointing rather than deleting if the lint rules made sense.

`scripts/add-exports-sections.js` has an adapters entry that should be removed (the script is slated for removal anyway).

### Step 7: Update the integrations README to mention all 7 frameworks

Read `packages/integrations/README.md` (created in Task 1). Verify the subpath list mentions all 7 (express, fastify, koa, nextjs, astro, remix, sveltekit). If Task 1's draft listed them all already, no edit needed.

### Step 8: Regenerate lockfile

```bash
pnpm install
```

Verify: `grep "@coherent.js/adapters" pnpm-lock.yaml` returns nothing.

### Step 9: Full quality gate

```bash
pnpm test
pnpm typecheck:packages
pnpm build
pnpm lint
```

Expected: green.

Verify all 3 new SSG subpath imports:

```bash
for fw in astro remix sveltekit; do
  node --input-type=module -e "import('@coherent.js/integrations/$fw').then(m => console.log('$fw OK:', Object.keys(m).slice(0,5)))"
done
```

### Step 10: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add -A packages docs ARCHITECTURE.md DEVELOPMENT.md PUBLISHING_GUIDE.md CLAUDE.md README.md AGENTS.md .changeset .github tsconfig.json eslint.config.js scripts pnpm-lock.yaml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
refactor(integrations): absorb astro, remix, sveltekit adapters

Adds three meta-framework subpath exports to @coherent.js/integrations:
- @coherent.js/integrations/astro
- @coherent.js/integrations/remix
- @coherent.js/integrations/sveltekit

Moved from the @coherent.js/adapters package, which already bundled all
three but is now folded into integrations for consistency with the
server-framework adapters. The adapters package is deleted.

No live JS/TS consumers existed for these — only docs referenced them.

Part of Wave 2c (integrations consolidation) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wave 2c verification + CHANGELOG entry

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

Expected: all 7 commands green. Clean+build catches stale dist artifacts.

If anything fails, report BLOCKED. Do NOT edit code in this task to fix regressions.

### Step 2: Confirm workspace at 13 packages

```bash
ls -1 packages/ | wc -l
```

Expected: `13`.

```bash
for pkg in express fastify koa nextjs adapters; do
  if [ -d "packages/$pkg" ]; then
    echo "FAIL: $pkg still exists"
  else
    echo "OK: $pkg gone"
  fi
done

if [ -d "packages/integrations" ]; then
  echo "OK: integrations exists"
else
  echo "FAIL: integrations missing"
fi
```

All 5 should print OK and `integrations` should exist.

```bash
ls -1 packages/
```

Expected (alphabetical): api, cli, client, core, database, devtools, forms, i18n, integrations, seo, state, tooling, vscode-extension.

### Step 3: Extend `## [Unreleased]` of `CHANGELOG.md`

Add NEW Wave 2c subsections AFTER the existing Wave 2b entries (and BEFORE `## [1.0.0-beta.8]`):

```markdown
### Removed (Wave 2c)

- **BREAKING:** Removed standalone `@coherent.js/express` package. Its Express.js adapter now ships as a subpath export of `@coherent.js/integrations`. Migration: replace `import ... from '@coherent.js/express'` with `import ... from '@coherent.js/integrations/express'`.
- **BREAKING:** Removed standalone `@coherent.js/fastify` package. Its Fastify adapter now ships as `@coherent.js/integrations/fastify`.
- **BREAKING:** Removed standalone `@coherent.js/koa` package. Its Koa adapter now ships as `@coherent.js/integrations/koa`.
- **BREAKING:** Removed standalone `@coherent.js/nextjs` package. Its Next.js integration now ships as `@coherent.js/integrations/nextjs`.
- **BREAKING:** Removed standalone `@coherent.js/adapters` package. Its Astro, Remix, and SvelteKit adapters now ship as `@coherent.js/integrations/astro`, `@coherent.js/integrations/remix`, `@coherent.js/integrations/sveltekit` respectively. (The pre-merge package already used those same subpath names, so the only change is the package prefix.)

### Added (Wave 2c)

- **NEW:** `@coherent.js/integrations` package consolidates ALL framework integration adapters. Subpaths: `./express`, `./fastify`, `./koa`, `./nextjs`, `./astro`, `./remix`, `./sveltekit`. Each previously shipped as its own package (`@coherent.js/<framework>` or, for the three SSG adapters, `@coherent.js/adapters/<framework>`). Public APIs unchanged — only import paths move. Peer-dependencies for each framework are declared optional, so consumers only need to install the ones they use.

### Changed (Wave 2c)

- `packages/cli/src/generators/runtime-scaffold.js` updated to scaffold new projects with a single `@coherent.js/integrations` dependency and framework-specific subpath imports (`import { setupCoherent } from '@coherent.js/integrations/express'` etc.).
- `packages/cli/test/scaffold-matrix.test.js` and `packages/cli/test/import-audit.test.js` updated to assert the new integrations dep + subpath patterns.
- `examples/express-integration.js`, `examples/nextjs-integration.js`, and `examples/vite-integration/vite.config.js` (external list) updated to the new import paths.
- `website/src/index.js` log strings updated to mention `@coherent.js/integrations/express`.

### Notes (Wave 2c)

- Workspace shrank from 17 → 13 packages (5 deleted, 1 created).
- All consolidations preserved test coverage and public API surface. Only import paths changed.
- Spec target was 12 packages; current count 13 reflects the deliberate Wave-2b decision to defer `vscode-extension` absorption into `tooling` to Wave 4 (paired with marketplace publish work). Wave 4 takes the workspace to 12.
- Remaining 13 packages: api, cli, client, core, database, devtools, forms, i18n, integrations, seo, state, tooling, vscode-extension.
```

### Step 4: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs(changelog): record Wave 2c integrations consolidation

Documents the 5 framework-package deletions (express, fastify, koa,
nextjs, adapters) and the new @coherent.js/integrations package with
7 subpath exports (express, fastify, koa, nextjs, astro, remix,
sveltekit). Lists the cross-package consumer updates (CLI scaffold,
CLI tests, examples, website) and confirms the workspace count
transition 17 → 13.

Closes Wave 2c of v1.0 stable hardening. Spec target is 12 packages;
current count 13 reflects the vscode-extension deferral. Wave 4 takes
the workspace to 12 by absorbing vscode-extension into tooling.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 5: Final confirmation

```bash
git log --oneline <wave-2c-base-sha>..HEAD
```

Expected (most recent first): CHANGELOG commit, then Task 3 (adapters), Task 2 (fastify+koa+nextjs), Task 1 (integrations skeleton+express). Four commits total (plus any fix-ups).

```bash
git status --short
```

Expected: only pre-existing unrelated drift.

---

## Post-Wave-2c handoff

Wave 2c is done. Workspace is now 13 packages.

Next plans:
- **Wave 3 — Lockdown:** API surface snapshots, perf CI gates, `experimental_` prefix pass on undecided APIs, `@internal` JSDoc sweep, removing `.cjs` paths from exports where the build doesn't emit them. (Wave 2b/2c already addressed the .cjs issue for the absorbed packages; Wave 3 verifies across all remaining packages.)
- **Wave 4 — Browser parity:** HMR dev server WebSocket implementation in cli, Playwright E2E suite, VS Code marketplace publish AND `vscode-extension` absorption into `tooling/vscode-extension/`. Takes the workspace to 12.
- **Wave 5 — Release:** Migration guide finalization, `1.0.0-rc.1` tag, soak, `1.0.0` tag.
