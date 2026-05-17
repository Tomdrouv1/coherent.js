# Coherent.js v1.0 — Wave 3b: Bundle Size Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [`docs/superpowers/specs/2026-05-17-coherent-v1-hardening-design.md`](../specs/2026-05-17-coherent-v1-hardening-design.md) — Section 4 (Perf CI gate), specifically the **bundle-size** row.

**Goal:** Ship a per-package bundle-size snapshot tool, commit baselines, wire a CI hard-gate that fails PRs growing any package's bundle by more than 5% without a baseline update — and drop README claims we don't have a gate for.

**Architecture:** Mirror the proven Wave-3a pattern. A homegrown ESM script at `scripts/check-bundle-size.mjs` walks each package's built `dist/index.js`, measures raw + gzipped byte length, writes per-package `bundle-size.json` baselines. Two modes: `--write` regenerates, `--check` exits non-zero if any package's size drifts >5% from baseline. CI runs `--check` after build (same insertion point as Wave 3a's API surface check). Reviewers see size diffs in PRs as updated `bundle-size.json` files.

**Tech Stack:** ESM script, Node ≥ 20, no new dependencies (uses built-in `zlib.gzipSync`).

**Wave 3b explicitly NOT in scope** (each with reasoning):

- **Render throughput gate.** CI variance on shared GitHub Actions runners makes throughput gating noisy and false-fail-prone. The spec's recommended ±15% tolerance only narrows the problem; tightening requires self-hosted runners. Defer to a follow-up wave once the rest of the stable-release work is done — or skip outright if bundle-size gates prove sufficient.
- **Tree-shake reduction gate.** Requires per-subpath consumer bundles, which is non-trivial new tooling. The existing `scripts/analyze-bundle.mjs` references deleted packages (express/fastify/koa/nextjs absorbed in Wave 2c) so it would need a rewrite anyway. Defer.
- **Fixing the bit-rotted `scripts/analyze-bundle.mjs`.** Out of Wave 3b scope. Note as follow-up.
- **`perf-gate.js` extension** to cover bundle size. The existing `perf-gate.js` is specifically the LRU-cache benchmark gate (uses `benchmarkLRUCache`). Don't conflate two unrelated gates in one file. New gate lives in its own script.

**Why bundle size first and bundle size only:**

- **Deterministic.** Build the package, measure bytes, compare. No flakiness.
- **Highest leverage.** Bundle size is a top-mentioned README claim and the property most likely to silently regress as features are added.
- **Independent of the others.** Throughput and tree-shake gates can land later without rework.
- **Establishes the pattern for the others.** Once the bundle-size gate's baseline-file/--write/--check shape is in place, the throughput and tree-shake gates follow the same template.

---

## What "bundle size" means here

For each package whose `package.json` `main`/`exports[".".import]` resolves to a `dist/*.js` file (10 of the 13 packages — `integrations` and `tooling` ship from `src/` directly via `development`/`import` conditional, and `vscode-extension` has no `exports` field), measure:

- **`raw`**: byte length of the built `dist/index.js` (or whatever the `.` import resolves to)
- **`gz`**: byte length of the gzip-compressed `dist/index.js`

Snapshot both. The gate fails if either grows >5% from baseline.

Skipping rules:

- Packages with no `dist/index.js`: emit a section noting "no dist bundle (ships from src or is non-importable)". The baseline file is still created so the snapshot is consistent across all packages; the snapshot just doesn't measure anything.
- Skip dist subpaths beyond the root entry (Wave 3b only gates the `.` export). Subpath gating is a refinement for later.

---

## File Structure

| Path | Change | Responsibility |
|---|---|---|
| `scripts/check-bundle-size.mjs` | Create | The whole gate. ESM. `--write` and `--check` modes. Walks each package, measures dist/index.js raw + gzipped, writes/diffs `packages/<name>/bundle-size.json`. |
| `packages/<name>/bundle-size.json` | Create (13 total) | Committed baseline. JSON with `{ "raw": N, "gz": N }` or `{ "skipped": "<reason>" }`. |
| `.github/workflows/ci.yml` | Modify | Add `Check bundle size` step immediately after `Check API surface`. |
| `README.md` | Modify | Drop the specific "80.7KB gzipped production bundle" claim (it was a single-package measurement that doesn't represent a typical consumer's bundle); drop "79.5% tree shaking reduction" (we're not gating tree-shake). Keep "247 renders/sec" if it still appears — Wave 3c can either build a throughput gate that defends it or drop it. |
| `CHANGELOG.md` | Modify | Wave 3b Unreleased entry. |

**Packages with `bundle-size.json` measurements (have dist/index.js):**
api, cli, client, core, database, devtools, forms, i18n, seo, state

**Packages with `bundle-size.json` skip-marker:**
integrations (ships from src/), tooling (mixed JS/TS, exports point at dist subpaths not a root dist/index.js — verify and possibly include later), vscode-extension (extension, no `exports` field)

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree**

Run: `git status`
Expected: only pre-existing dirty files (`package.json`, `tsconfig.tsbuildinfo`, `pnpm-workspace.yaml` allowBuilds block, `test-results/`). Do not touch them.

- [ ] **Step 2: Confirm baseline is green and packages are freshly built**

Run: `pnpm clean && pnpm install && pnpm build && pnpm test && node scripts/check-api-surface.mjs --check`
Expected: green (1653 tests; API surface clean from Wave 3a).

The fresh build is essential — the bundle-size tool reads `dist/index.js`. Stale builds produce stale baselines.

---

## Task 1: Build the bundle-size gate + commit baselines

**Files:**
- Create: `scripts/check-bundle-size.mjs`
- Create: `packages/api/bundle-size.json`, `packages/cli/bundle-size.json`, `packages/client/bundle-size.json`, `packages/core/bundle-size.json`, `packages/database/bundle-size.json`, `packages/devtools/bundle-size.json`, `packages/forms/bundle-size.json`, `packages/i18n/bundle-size.json`, `packages/integrations/bundle-size.json`, `packages/seo/bundle-size.json`, `packages/state/bundle-size.json`, `packages/tooling/bundle-size.json`, `packages/vscode-extension/bundle-size.json`

### Step 1: Create the tool

Create `scripts/check-bundle-size.mjs` with the following content (full implementation, ready to copy):

```js
#!/usr/bin/env node
/**
 * Bundle Size Gate
 *
 * For each workspace package whose `.` export resolves to a `dist/*.js` file,
 * measures raw + gzipped byte length and snapshots to
 * `packages/<name>/bundle-size.json`.
 *
 * Two modes:
 *   --write   Regenerate all baselines from current builds.
 *   --check   Compare current sizes against committed baselines. Exits
 *             non-zero if any package's raw OR gz size has grown by more
 *             than TOLERANCE_PCT % since the baseline.
 *
 * Packages whose `.` export doesn't resolve to a file (e.g., ships from
 * `src/` directly, has no `exports` field, or only exports subpaths) get
 * a `{ "skipped": "<reason>" }` baseline file. The gate treats these as
 * always-passing.
 *
 * @module scripts/check-bundle-size
 */

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(REPO_ROOT, 'packages');

const TOLERANCE_PCT = 5;
const MODE_WRITE = '--write';
const MODE_CHECK = '--check';

function listPackages() {
  return readdirSync(PACKAGES_DIR)
    .filter((name) => statSync(join(PACKAGES_DIR, name)).isDirectory())
    .map((name) => ({ name, dir: join(PACKAGES_DIR, name) }))
    .filter(({ dir }) => existsSync(join(dir, 'package.json')))
    .map(({ name, dir }) => {
      const pkgJson = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      return { name, dir, pkgJson };
    });
}

/**
 * Resolve the `.` export's `import` (or `default`) condition to an absolute
 * file path. Returns null if `.` is not exported as a file (e.g., ships from
 * `src/`, points at a directory, no exports field).
 */
function resolveRootImportPath(pkg) {
  const exp = pkg.pkgJson.exports;
  if (!exp) return null;
  const dot = exp['.'];
  if (!dot) return null;

  let relPath = null;
  if (typeof dot === 'string') {
    relPath = dot;
  } else if (typeof dot === 'object') {
    if (typeof dot.import === 'string') relPath = dot.import;
    else if (typeof dot.default === 'string') relPath = dot.default;
  }
  if (!relPath || relPath.endsWith('/')) return null;
  // Only gate dist/* targets — src/* targets ship verbatim and have no build artifact to measure.
  if (!relPath.startsWith('./dist/')) return null;
  const abs = resolve(pkg.dir, relPath);
  if (!existsSync(abs)) return null;
  return abs;
}

function measure(pkg) {
  const target = resolveRootImportPath(pkg);
  if (!target) {
    const exp = pkg.pkgJson.exports;
    let reason;
    if (!exp) reason = 'no exports field';
    else if (!exp['.']) reason = 'no `.` root export';
    else reason = 'root export does not resolve to a dist/* file (ships from src/ or via subpaths only)';
    return { skipped: reason };
  }
  const buf = readFileSync(target);
  return {
    raw: buf.length,
    gz: gzipSync(buf).length,
  };
}

function formatBaseline(name, result) {
  return JSON.stringify(
    {
      package: `@coherent.js/${name}`,
      ...result,
    },
    null,
    2
  ) + '\n';
}

function pct(curr, base) {
  if (base === 0) return curr === 0 ? 0 : Infinity;
  return ((curr - base) / base) * 100;
}

async function runWrite() {
  const packages = listPackages();
  console.log(`📦 Generating bundle-size baselines for ${packages.length} packages (tolerance: ±${TOLERANCE_PCT}%)...`);
  for (const pkg of packages) {
    const result = measure(pkg);
    const target = join(pkg.dir, 'bundle-size.json');
    writeFileSync(target, formatBaseline(pkg.name, result), 'utf8');
    if (result.skipped) {
      console.log(`  · ${pkg.name}: skipped (${result.skipped})`);
    } else {
      console.log(`  ✓ ${pkg.name}: raw=${result.raw} gz=${result.gz}`);
    }
  }
  console.log('Done. Review the diffs before committing.');
}

async function runCheck() {
  const packages = listPackages();
  console.log(`🔒 Checking bundle sizes against committed baselines (${packages.length} packages, tolerance: ±${TOLERANCE_PCT}%)...`);
  const failures = [];
  const warnings = [];
  for (const pkg of packages) {
    const baselinePath = join(pkg.dir, 'bundle-size.json');
    if (!existsSync(baselinePath)) {
      failures.push({ name: pkg.name, reason: `missing baseline: ${baselinePath.replace(REPO_ROOT + '/', '')}` });
      continue;
    }
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    const current = measure(pkg);

    if (current.skipped && baseline.skipped) continue;
    if (current.skipped && !baseline.skipped) {
      failures.push({ name: pkg.name, reason: `now skipped (${current.skipped}) but baseline had measurements raw=${baseline.raw} gz=${baseline.gz}` });
      continue;
    }
    if (!current.skipped && baseline.skipped) {
      failures.push({ name: pkg.name, reason: `now measurable (raw=${current.raw} gz=${current.gz}) but baseline was skipped (${baseline.skipped}). Re-run --write to lock in.` });
      continue;
    }

    const rawPct = pct(current.raw, baseline.raw);
    const gzPct = pct(current.gz, baseline.gz);
    if (Math.abs(rawPct) > TOLERANCE_PCT || Math.abs(gzPct) > TOLERANCE_PCT) {
      failures.push({
        name: pkg.name,
        reason: `raw ${baseline.raw} → ${current.raw} (${rawPct.toFixed(1)}%); gz ${baseline.gz} → ${current.gz} (${gzPct.toFixed(1)}%); tolerance ±${TOLERANCE_PCT}%`,
      });
    } else if (rawPct !== 0 || gzPct !== 0) {
      warnings.push({
        name: pkg.name,
        reason: `raw ${rawPct.toFixed(1)}%, gz ${gzPct.toFixed(1)}% (within tolerance)`,
      });
    }
  }

  for (const { name, reason } of warnings) {
    console.log(`  ⚠️  ${name}: ${reason}`);
  }

  if (failures.length === 0) {
    console.log(`✅ All ${packages.length} packages within ±${TOLERANCE_PCT}% of bundle-size baseline.`);
    return;
  }

  console.error('❌ Bundle size drift detected:');
  for (const { name, reason } of failures) {
    console.error(`  - ${name}: ${reason}`);
  }
  console.error('');
  console.error('If the growth is intentional, run `node scripts/check-bundle-size.mjs --write` to regenerate the baselines, review the diff, and commit them together with the code change.');
  process.exitCode = 1;
}

async function main() {
  const mode = process.argv[2];
  if (mode === MODE_WRITE) {
    await runWrite();
  } else if (mode === MODE_CHECK) {
    await runCheck();
  } else {
    console.error('Usage: node scripts/check-bundle-size.mjs (--write|--check)');
    console.error('');
    console.error('  --write   Regenerate all packages/<name>/bundle-size.json baselines.');
    console.error('  --check   Verify current bundle sizes are within ±5% of baselines.');
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exitCode = 3;
});
```

Make it executable: `chmod +x scripts/check-bundle-size.mjs`

### Step 2: Confirm fresh build

Run: `pnpm clean && pnpm install && pnpm build`
Expected: all 13 packages build clean.

### Step 3: Generate baselines

Run: `node scripts/check-bundle-size.mjs --write`
Expected: 13 lines, mix of `✓ <name>: raw=N gz=N` for the 10 packages with `dist/index.js` and `· <name>: skipped (<reason>)` for the 3 without. Final line: "Done."

### Step 4: Inspect the generated baselines

Spot-check:

```bash
cat packages/core/bundle-size.json
cat packages/cli/bundle-size.json
cat packages/integrations/bundle-size.json
```

Expected:
- `core` and `cli` show `{ "package": "@coherent.js/core", "raw": N, "gz": N }` with sensible numbers (matching the gzip sizes printed earlier in the diagnosis: core ~42KB gz, cli ~82KB gz)
- `integrations` shows `{ "package": "@coherent.js/integrations", "skipped": "root export does not resolve to a dist/* file..." }`

### Step 5: Verify --check passes against the fresh baselines

Run: `node scripts/check-bundle-size.mjs --check`
Expected: `✅ All 13 packages within ±5% of bundle-size baseline.` exit 0.

### Step 6: Sanity-check the gate actually catches drift

Pick `packages/seo/bundle-size.json` (small package, fast to test). Open it and change the `gz` value to a number 10% larger:

```bash
# Quickly bump seo's baseline by 10% to simulate a regression-rollback scenario
node -e "const p='/Users/thomasdrouvin/Perso/coherent/packages/seo/bundle-size.json'; const j=JSON.parse(require('fs').readFileSync(p)); j.gz = Math.floor(j.gz * 1.1); require('fs').writeFileSync(p, JSON.stringify(j, null, 2) + '\n')"
```

Run: `node scripts/check-bundle-size.mjs --check`
Expected: exit code 1, error message includes `seo: ... gz X → Y (-9.1%) ... tolerance ±5%` (negative because the baseline now has the inflated number and current size is smaller).

Restore by running: `node scripts/check-bundle-size.mjs --write`

Re-run `--check`. Expected: clean.

This proves the gate works.

### Step 7: Stage and commit

```bash
git add scripts/check-bundle-size.mjs packages/*/bundle-size.json
```

Verify `git status --short` shows only those files (plus the standard pre-existing dirty noise).

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
feat(scripts): add bundle-size gate + commit baselines

Adds `scripts/check-bundle-size.mjs` mirroring the Wave-3a API-surface
gate pattern. Walks each workspace package, measures `dist/index.js`
raw + gzipped byte length, and snapshots per-package
`packages/<name>/bundle-size.json` baselines.

Two modes:
- `--write`: regenerate all baselines
- `--check`: fail non-zero if any package's raw OR gz size has drifted
  by more than ±5% from baseline

Packages whose `.` root export doesn't resolve to a `dist/*` file
(integrations, tooling, vscode-extension) get a `{ "skipped": "..." }`
baseline; the gate treats them as always-passing for now.

CI integration (next commit) will run --check after `pnpm build`,
right after the API surface check. Reviewers see bundle-size diffs in
PRs as updated `bundle-size.json` files — accidental bloat becomes
impossible to merge unnoticed.

This is the bundle-size mechanism described in Section 4 of the v1.0
hardening spec. Render-throughput and tree-shake gates are deferred
to a follow-up wave (Wave 3c) due to CI variance and tooling
complexity respectively.

Part of Wave 3b (perf gates) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Pre-commit hook runs lint+typecheck+test+build (~3-5 min). Use `PNPM_CONFIG_*` prefix if needed.

---

## Task 2: Wire the CI gate + drop unsubstantiated README claims

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

This task combines two related concerns into one commit: (a) add the CI gate that defends bundle size, (b) drop the README claims we're explicitly choosing NOT to defend with gates. Doing them together keeps the "we say what we measure, we measure what we say" invariant intact in a single reviewable change.

### Step 1: Add the CI gate step

Open `.github/workflows/ci.yml`. Find the `Check API surface` step (added in Wave 3a). Immediately AFTER it, insert:

```yaml
      - name: Check bundle size
        run: node scripts/check-bundle-size.mjs --check
```

The resulting fragment should look like:

```yaml
      - name: Build packages
        run: pnpm run build

      - name: Check API surface
        run: node scripts/check-api-surface.mjs --check

      - name: Check bundle size
        run: node scripts/check-bundle-size.mjs --check

      - name: Lint
        run: pnpm run lint
```

### Step 2: Verify YAML syntax

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML OK')"`
Expected: `YAML OK`

### Step 3: Drop unsubstantiated claims from README

Open `README.md`. The following claims need attention (Wave 1 dropped the OOP comparison and cache hit rate but left these):

1. **Line ~12: `- **📦 80.7KB gzipped** production bundle`** — DELETE. The figure was a single-snapshot measurement that doesn't represent a typical consumer's bundle (consumers import specific subpaths, often from one package). We now gate per-package bundle sizes via `bundle-size.json` baselines, so this aggregate claim is misleading. Replace with:

   ```markdown
   - **📦 Per-package bundle size gated by CI** (see `packages/*/bundle-size.json`)
   ```

2. **Line ~14: `- **🌳 79.5% tree shaking reduction** for development tools`** — DELETE. We're not gating tree-shake effectiveness in Wave 3b. Removing the claim is more honest than leaving an ungated number. No replacement line needed.

3. **Lines ~91-94 in the benchmarks table**: Verify that "Bundle Size" row's "80.7KB gzipped" entry is removed or rewritten. Same logic. If the entire benchmarks table now lacks defensible numbers, consider deleting the table entirely or replacing with a "see CI gates" reference.

4. **Line ~252 (in Production-Ready section):** if the bullet `- ✅ **Bundle Analysis**: Real file sizes, not mock data` references 80.7KB anywhere, update similarly. If it's just a generic claim, leave it.

5. **The "247 renders/sec" claim** stays untouched in Wave 3b — it's a defensible measurement from the existing `benchmark.js` even though we're not gating it yet. Wave 3c (if pursued) will either build a throughput gate matching the number or update the claim.

After edits, verify:

```bash
grep -nE "80\.7KB|79\.5%" README.md
```
Expected: empty output.

### Step 4: Verify the gate works locally one more time

```bash
node scripts/check-api-surface.mjs --check
node scripts/check-bundle-size.mjs --check
```
Expected: both clean.

### Step 5: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add .github/workflows/ci.yml README.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
ci: gate PRs on bundle-size drift + drop ungated README claims

Adds a `Check bundle size` step to .github/workflows/ci.yml between
`Check API surface` and `Lint`. Runs `node scripts/check-bundle-size.mjs
--check`, which fails the PR if any package's raw OR gz `dist/index.js`
size has grown by more than ±5% from its committed baseline.

Simultaneously drops two README claims we're not defending with gates:
- "80.7KB gzipped production bundle" (aggregate single-snapshot
  measurement that doesn't represent a typical consumer's bundle —
  now superseded by per-package CI gates)
- "79.5% tree shaking reduction" (no tree-shake gate exists; the
  number wasn't reproducible from any committed benchmark)

These follow the same pattern as Wave 1's OOP-comparison and
95%-cache-hit drops: only assert numbers the CI gates defend.

The "247 renders/sec" claim is left in for now — it's a defensible
measurement from benchmarks/benchmark.js. A throughput gate (Wave 3c
candidate) will either defend it or trigger an update.

Part of Wave 3b (perf gates) for v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: CHANGELOG entry

**File:** `CHANGELOG.md`

### Step 1: Locate the Unreleased section

The Unreleased section contains subsections from Waves 1, 2a, 2b, 2c, 3a. Wave 3b adds new subsections AFTER the existing Wave 3a blocks and BEFORE `## [1.0.0-beta.8]`.

### Step 2: Add Wave 3b subsections

```markdown
### Added (Wave 3b)

- **NEW: Bundle size gate.** `scripts/check-bundle-size.mjs` measures each package's built `dist/index.js` raw + gzipped byte length and snapshots per-package `packages/<name>/bundle-size.json` baselines. CI runs `--check` after build (right after the API surface check); fails PRs that grow any package's bundle by more than ±5% without an accompanying baseline update. Mirrors the Wave-3a API-surface gate pattern exactly.
- 13 baseline `bundle-size.json` files committed — 10 measured (api, cli, client, core, database, devtools, forms, i18n, seo, state), 3 marked `skipped` (integrations and tooling ship from `src/`; vscode-extension has no `exports` field).

### Removed (Wave 3b)

- **README:** Dropped "80.7KB gzipped production bundle" claim. Was a single-snapshot aggregate that didn't represent any real consumer's bundle. Replaced with a reference to the per-package `bundle-size.json` gates.
- **README:** Dropped "79.5% tree shaking reduction" claim. No tree-shake gate exists; the number was not reproducible from any committed benchmark. Removed rather than leave an ungated assertion.

### Notes (Wave 3b)

- The "247 renders/sec" claim in README is left untouched. It's a defensible measurement from `benchmarks/benchmark.js`. A render-throughput gate is a Wave 3c candidate — if pursued, it will either defend the number or trigger an update.
- Tree-shake reduction gating deferred to Wave 3c. The existing `scripts/analyze-bundle.mjs` references packages deleted in Wave 2c (express/fastify/koa/nextjs) so it's bit-rotted and needs a rewrite alongside any tree-shake gate work.
- Render throughput gating deferred to Wave 3c. CI variance on shared GitHub Actions runners makes throughput gating noisy and false-fail-prone; tightening would require self-hosted runners. Worth re-evaluating after some operational experience with the bundle-size gate.
- Skipped packages (integrations, tooling, vscode-extension) get re-evaluated whenever their root export shape changes — the `--write` baseline regeneration handles the transition automatically and the diff is reviewable.
```

### Step 3: Commit

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git add CHANGELOG.md
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false CI=true git commit -m "$(cat <<'EOF'
docs(changelog): record Wave 3b bundle size gate

Documents the new bundle-size snapshot tool, the 13 baseline
bundle-size.json files (10 measured, 3 skipped), the CI gate, and
the dropped README claims (80.7KB and 79.5% tree-shake). Notes the
explicit deferrals: render-throughput gating and tree-shake reduction
gating (both Wave 3c candidates).

Closes Wave 3b of v1.0 stable hardening.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Post-Wave-3b handoff

Wave 3b is done. Bundle size is now defended by CI alongside API surface — both gates run after build, before lint/test. Together they catch the two highest-value classes of accidental change (public API drift and bundle size regression).

Next plans:

- **Wave 3c (optional, only if needed)**: throughput gate + tree-shake gate. Defer until operational experience with Wave 3a+3b gates tells us whether they're sufficient.
- **Wave 4 — Browser parity:** HMR dev server WebSocket implementation in cli, Playwright E2E suite, VS Code marketplace publish, and `vscode-extension` absorption into `tooling/vscode-extension/` (takes the workspace to 12 packages, hitting the spec target).
- **Wave 5 — Release:** migration guide finalization, `1.0.0-rc.1` tag, 1-2 week soak, `1.0.0` tag.

Follow-up items surfaced by Wave 3b:

- Fix or delete `scripts/analyze-bundle.mjs` (references packages deleted in Wave 2c — express/fastify/koa/nextjs).
- Decide on render-throughput strategy: gate (Wave 3c) or accept as ungated reality and drop the "247 renders/sec" claim from README.
- Per-subpath bundle gating: Wave 3b only gates `.` root exports. Subpaths (`@coherent.js/cli/build-tools/vite`, `@coherent.js/integrations/express`, etc.) are not gated. A future iteration can extend `check-bundle-size.mjs` to walk all subpaths once we feel the root gate has proven its value.
