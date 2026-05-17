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
