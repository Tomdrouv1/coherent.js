#!/usr/bin/env node
/**
 * VSIX Publish-Readiness Check
 *
 * Given a freshly-built VS Code extension .vsix, asserts it is
 * well-formed:
 *   - Required files are inside (extension entry, LSP server,
 *     snippets, icon)
 *   - The vsixmanifest's version matches packages/vscode-extension/
 *     package.json
 *
 * Usage:
 *   node scripts/check-vsix.mjs [path/to/file.vsix]
 *
 * If no path is given, picks the newest .vsix under
 * packages/vscode-extension/.
 *
 * Exits non-zero on any failure, prints a clear reason. Designed
 * to be run after `pnpm --filter coherent-language-support run
 * package` in CI.
 *
 * @module scripts/check-vsix
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const EXT_DIR = join(REPO_ROOT, 'packages', 'vscode-extension');

const REQUIRED_ENTRIES = [
  'extension/dist/extension.js',
  'extension/server/server.js',
  'extension/snippets/coherent.json',
  'extension/icon.png',
  'extension/package.json',
  'extension.vsixmanifest',
];

function newestVsixIn(dir) {
  const candidates = readdirSync(dir)
    .filter((f) => f.endsWith('.vsix'))
    .map((f) => ({ name: f, full: join(dir, f), mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.full || null;
}

function listZipEntries(vsixPath) {
  // .vsix is a zip; macOS, Linux, and Windows runners all have `unzip -l`.
  const out = execFileSync('unzip', ['-l', vsixPath], { encoding: 'utf8' });
  const lines = out.split('\n').slice(3); // skip header
  const entries = [];
  for (const line of lines) {
    // unzip -l format: "  <size>  <date>  <time>   <name>"
    const m = line.match(/^\s*\d+\s+\S+\s+\S+\s+(.+)$/);
    if (m && !m[1].startsWith('--')) entries.push(m[1].trim());
  }
  return entries;
}

function extractFile(vsixPath, entryName) {
  return execFileSync('unzip', ['-p', vsixPath, entryName], { encoding: 'utf8' });
}

function getManifestVersion(vsixPath) {
  const manifest = extractFile(vsixPath, 'extension.vsixmanifest');
  // Match <Identity ... Version="x.y.z" ... />
  const m = manifest.match(/<Identity\s+[^>]*Version="([^"]+)"/);
  if (!m) throw new Error('Could not find <Identity Version="..."> in vsixmanifest');
  return m[1];
}

function getPackageJsonVersion() {
  const pj = JSON.parse(readFileSync(join(EXT_DIR, 'package.json'), 'utf8'));
  return pj.version;
}

function main() {
  const arg = process.argv[2];
  const vsixPath = arg ? resolve(arg) : newestVsixIn(EXT_DIR);
  if (!vsixPath) {
    console.error('❌ No .vsix found. Run `pnpm --filter coherent-language-support run package` first.');
    process.exitCode = 1;
    return;
  }

  console.log(`📦 Checking ${vsixPath.replace(REPO_ROOT + '/', '')}`);

  let entries;
  try {
    entries = listZipEntries(vsixPath);
  } catch (err) {
    console.error('❌ Could not list zip entries:', err.message);
    process.exitCode = 1;
    return;
  }

  const missing = REQUIRED_ENTRIES.filter((req) => !entries.includes(req));
  if (missing.length) {
    console.error('❌ Missing expected entries in vsix:');
    for (const m of missing) console.error('   -', m);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ All ${REQUIRED_ENTRIES.length} required entries present`);

  let manifestVersion;
  try {
    manifestVersion = getManifestVersion(vsixPath);
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
    return;
  }
  const pkgVersion = getPackageJsonVersion();
  if (manifestVersion !== pkgVersion) {
    console.error(`❌ Version mismatch: vsixmanifest=${manifestVersion}, package.json=${pkgVersion}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Version ${manifestVersion} consistent (vsixmanifest ⇔ package.json)`);

  console.log('✅ VSIX publish-readiness check passed.');
}

main();
