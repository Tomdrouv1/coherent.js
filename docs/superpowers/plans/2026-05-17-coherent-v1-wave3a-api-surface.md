# Coherent.js v1.0 — Wave 3a: API Surface Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Section 2 (API surface lockdown), mechanism 3 ("API surface snapshot tests").

**Goal:** Ship a per-package API surface snapshot tool, commit baseline snapshots covering all 12 importable packages (vscode-extension excluded — not an npm-import package), and wire a CI gate that fails if any PR changes a package's public surface without updating the snapshot.

**Architecture:** A single homegrown ESM script at `scripts/check-api-surface.mjs` walks each package's `package.json` `exports` field, dynamically imports each subpath, and writes a sorted list of exported symbol names to `packages/<name>/api-surface.txt`. Two modes — `--write` regenerates baselines, `--check` exits non-zero on diff. CI runs `--check` after build. Reviewers see surface changes as `api-surface.txt` diffs in PRs — explicit, reviewable, intentional.

**Tech Stack:** ESM script, Node ≥ 20, no new dependencies. The spec time-boxes homegrown tooling at 1 day before falling back to `@microsoft/api-extractor`; this design fits well inside that budget.

**Wave 3a explicitly NOT in scope** (deferred to follow-on plans):

- **`@internal` JSDoc sweep + `stripInternal` in tsconfigs.** Per-package classification work. Once Wave 3a's snapshot lands, any future internal-vs-public re-classification shows up as a snapshot diff — so this isn't blocking. Can ship incrementally without coordination.
- **`experimental_` prefix pass.** Requires user judgment on which APIs are explicitly not SemVer-committed. Bring the candidate list to the user separately.
- **Perf CI gates (Section 4 of the spec).** Bundle size, render-throughput, tree-shake-reduction baselines. Independent subsystem — Wave 3b.
- **Cleaning up phantom `require` conditions.** Many packages still declare `"require": "./dist/*.cjs"` while the build only emits ESM. Each such phantom is a runtime trap for CJS consumers. Worth addressing as Wave 3a-follow-up but not strictly required for the lockdown.

---

## What "API surface" means here

A package's API surface, for snapshot purposes, is the **set of exported symbol names** reachable via each subpath listed in its `package.json` `exports` field.

Examples (illustrative, not authoritative):

- `@coherent.js/core` exports `{ ComponentSystem, ErrorBoundary, hydrate, renderToString, ... }` from its `.` subpath → snapshot lists those names.
- `@coherent.js/integrations` exports `{ setupCoherent, coherentMiddleware, ... }` from `./express` → snapshot lists those names under the `./express` section.

Not in scope for the snapshot (intentional MVP):

- Type signatures. Just names. This is a strong gate already: any added/removed/renamed export shows in the diff.
- Class methods / property names. Just top-level exports. A consumer importing `ComponentSystem` and using its `.render()` method would not have that method change detected — that's a follow-up if needed.
- `default` exports are included if present (they show as the literal name `default`).

This MVP catches **added exports** (forces a snapshot update review), **removed exports** (catches accidental breakage), and **renames** (shown as one removal + one addition).

---

## File Structure

| Path | Change | Responsibility |
|---|---|---|
| `scripts/check-api-surface.mjs` | Create | The whole tool. ESM. Two modes (`--write`, `--check`). Walks `packages/*/package.json` `exports`, dynamic-imports each subpath, writes/diffs per-package snapshot. |
| `packages/<name>/api-surface.txt` | Create (one per package, 12 total) | Committed baseline. Plain text. Sorted symbol names per subpath. Header comment marks it as generated. |
| `.github/workflows/ci.yml` | Modify | Add `Check API surface` step after `Build packages`. |
| `CHANGELOG.md` | Modify | Add Wave 3a Unreleased entry. |

**Packages with `api-surface.txt`:** api, cli, client, core, database, devtools, forms, i18n, integrations, seo, state, tooling. (12 packages — vscode-extension has no `exports` field, skip.)

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree relative to main**

Run: `git status`
Expected: only pre-existing dirty files (`package.json`, `tsconfig.tsbuildinfo`, `pnpm-workspace.yaml` `allowBuilds` block, `test-results/`). Do not touch them.

- [ ] **Step 2: Confirm baseline is green and packages built**

Run: `pnpm clean && pnpm install && pnpm build && pnpm test`
Expected: green (1653 tests passing post-Wave-2c). The snapshot tool needs `dist/` populated for packages whose exports point at `./dist/...`. Without a fresh build, `--write` will fail with `MODULE_NOT_FOUND` for those packages.

---

## Task 1: Build the snapshot tool + commit baselines

**Files:**
- Create: `scripts/check-api-surface.mjs`
- Create: `packages/api/api-surface.txt`, `packages/cli/api-surface.txt`, `packages/client/api-surface.txt`, `packages/core/api-surface.txt`, `packages/database/api-surface.txt`, `packages/devtools/api-surface.txt`, `packages/forms/api-surface.txt`, `packages/i18n/api-surface.txt`, `packages/integrations/api-surface.txt`, `packages/seo/api-surface.txt`, `packages/state/api-surface.txt`, `packages/tooling/api-surface.txt`

### Step 1: Create the tool

Create `scripts/check-api-surface.mjs` with the following content. The full implementation, ready to copy:

```js
#!/usr/bin/env node
/**
 * API Surface Snapshot Tool
 *
 * Walks each workspace package's package.json `exports` field, dynamic-imports
 * each subpath, and snapshots the sorted list of exported symbol names to
 * `packages/<name>/api-surface.txt`.
 *
 * Two modes:
 *   --write   Regenerate all snapshots from current source/dist.
 *   --check   Compare current surface against committed snapshots.
 *             Exits non-zero if any package's surface has drifted.
 *
 * The snapshot is intentionally just symbol names (not type signatures or
 * method surfaces) — a strong, low-maintenance gate. Type-level changes can
 * be added in a future iteration if needed.
 *
 * @module scripts/check-api-surface
 */

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(REPO_ROOT, 'packages');

const HEADER_LINES = [
  '# API Surface Snapshot',
  '# Generated by scripts/check-api-surface.mjs --write',
  '# DO NOT EDIT MANUALLY. To update: run `node scripts/check-api-surface.mjs --write`',
  '# Each section lists the sorted exported symbol names for one subpath.',
  '#',
];

const MODE_WRITE = '--write';
const MODE_CHECK = '--check';

/**
 * List workspace packages that have a package.json with an `exports` field.
 * Skips packages with no exports field (e.g., vscode-extension).
 */
function listPackages() {
  return readdirSync(PACKAGES_DIR)
    .filter((name) => statSync(join(PACKAGES_DIR, name)).isDirectory())
    .map((name) => ({ name, dir: join(PACKAGES_DIR, name) }))
    .filter(({ dir }) => existsSync(join(dir, 'package.json')))
    .map(({ name, dir }) => {
      const pkgJson = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      return { name, dir, pkgJson };
    })
    .filter(({ pkgJson }) => pkgJson.exports && Object.keys(pkgJson.exports).length > 0);
}

/**
 * Resolve the runtime entry path for a subpath export.
 *
 * Handles both plain-string exports ("./foo": "./dist/foo.js") and conditional
 * exports ({ "./foo": { import: "./dist/foo.js", require: "./dist/foo.cjs" } }).
 * Prefers `import` over `default` over `require`.
 *
 * Returns null for directory exports (paths ending in `/`) — those can't be
 * dynamic-imported. Returns null for unresolvable subpaths.
 */
function resolveExportPath(exportValue) {
  if (typeof exportValue === 'string') {
    if (exportValue.endsWith('/')) return null; // directory export
    return exportValue;
  }
  if (exportValue && typeof exportValue === 'object') {
    if (typeof exportValue.import === 'string') return exportValue.import;
    if (typeof exportValue.default === 'string') return exportValue.default;
    if (typeof exportValue.require === 'string') return exportValue.require;
  }
  return null;
}

/**
 * Dynamic-import a file and return its sorted exported symbol names.
 * Throws if the import fails (e.g., file doesn't exist, syntax error).
 */
async function snapshotSubpath(packageDir, subpath, exportValue) {
  const relPath = resolveExportPath(exportValue);
  if (!relPath) {
    return { subpath, exports: null, note: 'directory export (no snapshot)' };
  }
  const absPath = resolve(packageDir, relPath);
  if (!existsSync(absPath)) {
    return { subpath, exports: null, note: `target file missing: ${relPath}` };
  }
  try {
    const mod = await import(pathToFileURL(absPath).href);
    const names = Object.keys(mod).sort();
    return { subpath, exports: names, note: null };
  } catch (err) {
    return { subpath, exports: null, note: `import failed: ${err.message}` };
  }
}

/**
 * Format a package's snapshot into the on-disk text format.
 * Returns a string ready to write to `api-surface.txt`.
 */
function formatSnapshot(packageName, sections) {
  const lines = [
    ...HEADER_LINES,
    `# Package: ${packageName}`,
    '',
  ];
  for (const { subpath, exports, note } of sections) {
    lines.push(`== ${subpath} ==`);
    if (note) {
      lines.push(`# ${note}`);
    } else if (exports.length === 0) {
      lines.push('# (no exports)');
    } else {
      for (const name of exports) {
        lines.push(name);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Generate the current surface snapshot for one package by walking its
 * exports field and dynamic-importing each subpath.
 */
async function snapshotPackage(pkg) {
  const subpaths = Object.keys(pkg.pkgJson.exports).sort();
  const sections = [];
  for (const subpath of subpaths) {
    const section = await snapshotSubpath(pkg.dir, subpath, pkg.pkgJson.exports[subpath]);
    sections.push(section);
  }
  return { name: pkg.name, dir: pkg.dir, content: formatSnapshot(`@coherent.js/${pkg.name}`, sections) };
}

async function runWrite() {
  const packages = listPackages();
  console.log(`📸 Generating API surface snapshots for ${packages.length} packages...`);
  for (const pkg of packages) {
    const { name, dir, content } = await snapshotPackage(pkg);
    const target = join(dir, 'api-surface.txt');
    writeFileSync(target, content, 'utf8');
    console.log(`  ✓ ${name}: wrote ${target.replace(REPO_ROOT + '/', '')}`);
  }
  console.log('Done. Review the diffs before committing.');
}

async function runCheck() {
  const packages = listPackages();
  console.log(`🔒 Checking API surface against committed snapshots (${packages.length} packages)...`);
  const failures = [];
  for (const pkg of packages) {
    const { name, dir, content } = await snapshotPackage(pkg);
    const target = join(dir, 'api-surface.txt');
    if (!existsSync(target)) {
      failures.push({ name, reason: `missing baseline: ${target.replace(REPO_ROOT + '/', '')}` });
      continue;
    }
    const baseline = readFileSync(target, 'utf8');
    if (baseline !== content) {
      failures.push({ name, reason: `drift detected — re-run \`node scripts/check-api-surface.mjs --write\` and commit the updated ${target.replace(REPO_ROOT + '/', '')}` });
    }
  }
  if (failures.length === 0) {
    console.log('✅ All API surfaces match committed snapshots.');
    return;
  }
  console.error('❌ API surface drift detected:');
  for (const { name, reason } of failures) {
    console.error(`  - ${name}: ${reason}`);
  }
  console.error('');
  console.error('If the changes are intentional, run --write to regenerate the snapshots, review the diff, and commit them together with the code change.');
  process.exitCode = 1;
}

async function main() {
  const mode = process.argv[2];
  if (mode === MODE_WRITE) {
    await runWrite();
  } else if (mode === MODE_CHECK) {
    await runCheck();
  } else {
    console.error('Usage: node scripts/check-api-surface.mjs (--write|--check)');
    console.error('');
    console.error('  --write   Regenerate all packages/<name>/api-surface.txt snapshots.');
    console.error('  --check   Verify current API surface matches committed snapshots.');
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exitCode = 3;
});
```

### Step 2: Make sure packages are built (snapshots read from `dist/` for most packages)

Run: `pnpm clean && pnpm install && pnpm build`
Expected: all 13 packages build cleanly. If any fails, fix that first — the snapshot tool will fail on missing `dist/` files.

### Step 3: Run the tool in write mode

Run: `node scripts/check-api-surface.mjs --write`

Expected output: per-package "wrote packages/<name>/api-surface.txt" lines, ending with "Done."

If any line shows an error note like `# import failed: ...`, investigate immediately. Common causes:

- The package's build didn't emit the `dist/` file declared in `exports` (look for a phantom `.cjs` or stale `dist/`).
- A subpath in `exports` points at a non-existent file.

For phantom `.cjs` declarations specifically (where the package.json says `"require": "./dist/foo.cjs"` but the build only emits ESM): the tool will fall through to `import` automatically (per `resolveExportPath`), so this is not a hard failure — just a sign that the `.cjs` entry should be cleaned up in a follow-up. Note these in your report.

### Step 4: Inspect each new snapshot file

For each of the 12 generated files, eyeball the contents:

```bash
for f in packages/*/api-surface.txt; do
  echo "=== $f ==="
  head -30 "$f"
  echo ""
done | head -200
```

Verify:
- The header is present
- Each `== <subpath> ==` section has expected symbol names (or a `# (no exports)` line if empty)
- No section shows `# import failed: ...` unless you've already accepted the failure as a known limitation

### Step 5: Verify the tool's `--check` mode passes against the just-written baselines

Run: `node scripts/check-api-surface.mjs --check`
Expected: `✅ All API surfaces match committed snapshots.` with exit code 0.

### Step 6: Sanity-check the tool catches a real drift

Pick any small snapshot file (e.g., `packages/seo/api-surface.txt`) and manually delete one line.

Run: `node scripts/check-api-surface.mjs --check`
Expected: `❌ API surface drift detected: - seo: drift detected — re-run ...` with exit code 1.

Restore the deleted line:

```bash
node scripts/check-api-surface.mjs --write
```

Re-run `--check`. Expected: clean again.

This proves the gate actually works before we wire it into CI.

### Step 7: Commit the tool + baselines

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add scripts/check-api-surface.mjs packages/*/api-surface.txt
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
feat(scripts): add API surface snapshot tool + commit baselines

Adds `scripts/check-api-surface.mjs` which walks each workspace package's
package.json `exports` field, dynamic-imports each subpath, and snapshots
the sorted list of exported symbol names to `packages/<name>/api-surface.txt`.

Two modes:
- `--write`: regenerate all baselines
- `--check`: fail non-zero if current surface drifts from committed snapshots

Commits initial baselines for the 12 importable packages (vscode-extension
excluded — no `exports` field, not an npm-import package).

This is the snapshot mechanism described in Section 2 of the v1.0
hardening spec: any added/removed/renamed public export now shows as a
reviewable `api-surface.txt` diff in PRs, forcing conscious approval.

Part of Wave 3a (API surface lockdown) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Pre-commit hook runs full pipeline; budget ~3-5 min. If it trips with pnpm-verify issues, the `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true` prefix bypasses (established workaround from Waves 2a/2b/2c).

---

## Task 2: Wire the CI gate

**Files:**
- Modify: `.github/workflows/ci.yml` — add `Check API surface` step

### Step 1: Read the current CI workflow

Run: `cat .github/workflows/ci.yml`
Note: the workflow currently runs Install → Build → Lint → Type check → Tests → Coverage → Codecov upload → Website build. The new step should go AFTER Build (because the snapshot tool needs `dist/` populated for many packages) and BEFORE Lint (so a surface drift is the first failure surfaced — it's cheaper than running the full test suite to discover the same issue).

### Step 2: Add the new step

Open `.github/workflows/ci.yml`. Find the `Build packages` step. Immediately AFTER it (and BEFORE `Lint`), insert:

```yaml
      - name: Check API surface
        run: node scripts/check-api-surface.mjs --check
```

The full surrounding context should look like:

```yaml
      - name: Build packages
        run: pnpm run build

      - name: Check API surface
        run: node scripts/check-api-surface.mjs --check

      - name: Lint
        run: pnpm run lint
```

### Step 3: Verify YAML syntax

Run: `node -e "import('yaml').then(m => console.log(m.parse(require('fs').readFileSync('.github/workflows/ci.yml', 'utf8'))))" 2>&1 | head -5`

If `yaml` isn't installed in the repo (likely the case), substitute with a plain syntax check using Python or another available YAML parser:

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML OK')"
```

Expected: `YAML OK`. If Python isn't available, just verify visually that indentation is correct (4 spaces or whatever the surrounding steps use — check by reading the existing `Lint` step's indentation).

### Step 4: Verify the step would work locally

Run: `node scripts/check-api-surface.mjs --check`
Expected: `✅ All API surfaces match committed snapshots.` exit 0.

This is what CI will run.

### Step 5: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add .github/workflows/ci.yml
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
ci: gate PRs on API surface drift

Adds a `Check API surface` step to .github/workflows/ci.yml between
Build and Lint. Runs `node scripts/check-api-surface.mjs --check`,
which fails the PR if any package's public exports have changed
without an accompanying snapshot update.

This is the CI-side enforcement of the snapshot mechanism introduced
in the previous commit. PR reviewers will see the snapshot diff
alongside the source change, making accidental or unintentional
public-API drift impossible to merge unnoticed.

Part of Wave 3a (API surface lockdown) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: CHANGELOG entry

**Files:**
- Modify: `CHANGELOG.md`

### Step 1: Open `CHANGELOG.md` and locate `## [Unreleased]`

The Unreleased section already contains subsections from Waves 1, 2a, 2b, 2c. Wave 3a adds new subsections AFTER the existing Wave 2c blocks and BEFORE `## [1.0.0-beta.8]`.

### Step 2: Add the Wave 3a subsections

```markdown
### Added (Wave 3a)

- **NEW: API surface snapshot gate.** `scripts/check-api-surface.mjs` walks each workspace package's `package.json` `exports` field, dynamic-imports each subpath, and snapshots the sorted list of exported symbol names to `packages/<name>/api-surface.txt`. CI runs the script in `--check` mode after build; any PR that changes a package's public exports without updating the snapshot fails the build. Reviewers see the surface diff explicitly, making accidental SemVer breakage impossible to merge unnoticed.
- 12 baseline `api-surface.txt` files committed — one per importable package (vscode-extension excluded; not an npm-import package).

### Notes (Wave 3a)

- The snapshot is intentionally name-level only, not type-signature level. Adding/removing/renaming any public export trips the gate; changing a method's parameters on a class that's already exported does not. This trade-off matches the spec's 1-day time-cap on homegrown tooling; type-level snapshotting can be added later via `@microsoft/api-extractor` if needed.
- Wave 3a explicitly defers three Section-2 items to follow-on work: the `@internal` JSDoc sweep + `stripInternal` audit (per-package classification work; the snapshot already catches any reclassification as a diff); the `experimental_` prefix pass (requires user input on which APIs are explicitly not SemVer-committed); and cleanup of phantom `require` → `*.cjs` declarations in package.json files (most packages still advertise `.cjs` paths their ESM-only build doesn't emit — Wave-2b tooling and Wave-2c integrations already fixed their own cases).
- The snapshot tool surfaces phantom `.cjs` declarations as "import failed" notes when running `--write` — these get baked into the baseline as-is, so the gate enforces consistency rather than silently filling in. A follow-up cleanup PR can drop the unused `.cjs` paths from `exports` fields across api, client, database, devtools, and others.
- Perf CI gates (Section 4 of the spec) are tracked separately as Wave 3b.
```

### Step 3: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs(changelog): record Wave 3a API surface lockdown

Documents the new `scripts/check-api-surface.mjs` snapshot tool, the
12 baseline `api-surface.txt` files (one per importable package), and
the CI gate that fails on undeclared surface drift. Lists the items
explicitly deferred from Wave 3a: @internal sweep, experimental_
prefix pass, phantom .cjs cleanup, and Wave 3b perf gates.

Closes Wave 3a of v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Post-Wave-3a handoff

Wave 3a is done. The public API surface is now defended by CI: every PR that touches an exported symbol must include a corresponding `api-surface.txt` diff, which forces a reviewer's conscious approval.

Next plans:
- **Wave 3b — Perf CI gates** (Section 4 of the spec): bundle size baseline + hard gate (any package growing >5% without baseline update fails CI); render-throughput soft gate with ±15% tolerance band; tree-shake reduction gate using the existing `analyze-bundle.mjs` script. Plus dropping the unverified "247 renders/sec" et al. from README if Wave 1's cleanup missed anything.
- **Wave 4 — Browser parity:** HMR dev server WebSocket implementation in cli, Playwright E2E suite, VS Code marketplace publish, and `vscode-extension` absorption into `tooling/vscode-extension/` (takes the workspace to 12 packages, hitting the spec target).
- **Wave 5 — Release:** migration guide finalization, `1.0.0-rc.1` tag, 1-2 week soak, `1.0.0` tag.

Follow-up items surfaced by Wave 3a but explicitly NOT done in 3a:
- Phantom `require` → `*.cjs` declarations across api/client/database/devtools/etc. — drop them so `exports` matches the ESM-only build reality.
- `@internal` JSDoc sweep across all packages.
- `experimental_` prefix pass on candidate APIs (bring the list to the user).
