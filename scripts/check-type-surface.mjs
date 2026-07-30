#!/usr/bin/env node
/**
 * Type Surface Gate
 *
 * check-api-surface.mjs snapshots what each package exports at runtime. This
 * compares that against what its .d.ts *declares*, which is the contract
 * consumers actually compile against.
 *
 * Two 1.0.0 regressions were this exact drift: @coherent.js/core declared
 * createVNode/objectToVNode/diff/patch that exist nowhere, and
 * @coherent.js/forms declared FormBuilder.setAction/setMethod/build/render
 * that the class did not implement. Both typecheck clean and fail at runtime.
 *
 * Checks, per package:
 *   1. value exports declared in the .d.ts but missing at runtime
 *   2. value exports present at runtime but undeclared
 *   3. methods declared on an exported class but absent from its prototype
 *
 * Type-only exports (interface/type) are ignored -- they are erased by design.
 * Return types are out of scope; that needs the type-tests.
 *
 * Usage: node scripts/check-type-surface.mjs [--json]
 *
 * @module scripts/check-type-surface
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = resolve(REPO_ROOT, 'packages');
const ALLOWLIST_PATH = resolve(REPO_ROOT, 'scripts', 'type-surface-allowlist.json');

/** Top-level value exports: things that must exist at runtime. */
const VALUE_EXPORT = /^export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|enum)\s+([A-Za-z_$][\w$]*)/gm;

function declaredValueExports(source) {
  return new Set(Array.from(source.matchAll(VALUE_EXPORT), (m) => m[1]));
}

/** Extract the body of `export [declare] class <name> { ... }` by brace depth. */
function classBody(source, name) {
  const header = new RegExp(`export\\s+(?:declare\\s+)?class\\s+${name}\\b[^{]*{`);
  const start = source.match(header);
  if (!start) return null;

  let depth = 0;
  const from = start.index + start[0].length - 1;
  for (let i = from; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(from + 1, i);
  }
  return null;
}

/** Method names declared directly on a class body. */
function declaredMethods(body) {
  const methods = new Set();
  for (const line of body.split('\n')) {
    const match = line.match(/^\s{2,}(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*[<(]/);
    if (match && match[1] !== 'constructor' && match[1] !== 'new') methods.add(match[1]);
  }
  return methods;
}

function typesEntry(pkgJson) {
  return pkgJson.types
    ?? pkgJson.typings
    ?? (typeof pkgJson.exports?.['.'] === 'object' ? pkgJson.exports['.'].types : null);
}

function runtimeEntry(pkgJson) {
  const root = pkgJson.exports?.['.'];
  if (typeof root === 'string') return root;
  if (root && typeof root === 'object') return root.import ?? root.default ?? root.require ?? null;
  return pkgJson.main ?? null;
}

const allowlist = existsSync(ALLOWLIST_PATH)
  ? JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
  : {};

function allowed(pkg, kind, name) {
  return (allowlist[pkg]?.[kind] ?? []).includes(name);
}

const packages = readdirSync(PACKAGES_DIR)
  .filter((name) => statSync(join(PACKAGES_DIR, name)).isDirectory())
  .filter((name) => existsSync(join(PACKAGES_DIR, name, 'package.json')));

const findings = [];
const skipped = [];

for (const name of packages) {
  const dir = join(PACKAGES_DIR, name);
  const pkgJson = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  if (pkgJson.private) continue;

  const typesRel = typesEntry(pkgJson);
  const runtimeRel = runtimeEntry(pkgJson);
  if (!typesRel || !runtimeRel) {
    skipped.push(`${pkgJson.name}: no ${!typesRel ? 'types' : 'runtime'} entry`);
    continue;
  }

  const typesPath = resolve(dir, typesRel);
  const runtimePath = resolve(dir, runtimeRel);
  if (!existsSync(typesPath) || !existsSync(runtimePath)) {
    skipped.push(`${pkgJson.name}: entry file missing (run pnpm build)`);
    continue;
  }

  const source = readFileSync(typesPath, 'utf8');
  let mod;
  try {
    mod = await import(pathToFileURL(runtimePath).href);
  } catch (error) {
    skipped.push(`${pkgJson.name}: import failed (${error.code ?? error.name})`);
    continue;
  }

  const declared = declaredValueExports(source);
  const runtime = new Set(Object.keys(mod));

  for (const symbol of declared) {
    if (!runtime.has(symbol) && !allowed(pkgJson.name, 'missingAtRuntime', symbol)) {
      findings.push({ pkg: pkgJson.name, kind: 'missingAtRuntime', symbol });
    }
  }

  for (const symbol of runtime) {
    if (symbol === 'default') continue;
    if (!declared.has(symbol) && !allowed(pkgJson.name, 'undeclared', symbol)) {
      findings.push({ pkg: pkgJson.name, kind: 'undeclared', symbol });
    }
  }

  // Declared class methods must exist on the prototype.
  for (const symbol of declared) {
    const value = mod[symbol];
    if (typeof value !== 'function' || !value.prototype) continue;

    const body = classBody(source, symbol);
    if (!body) continue;

    for (const method of declaredMethods(body)) {
      if (typeof value.prototype[method] === 'function') continue;
      if (allowed(pkgJson.name, 'missingMethod', `${symbol}.${method}`)) continue;
      findings.push({ pkg: pkgJson.name, kind: 'missingMethod', symbol: `${symbol}.${method}` });
    }
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ findings, skipped }, null, 2));
  process.exit(findings.length ? 1 : 0);
}

console.log(`🔒 Comparing declared types against runtime exports (${packages.length} packages)...`);
for (const note of skipped) console.log(`   skipped ${note}`);

if (!findings.length) {
  console.log('✅ Every declared value export exists at runtime, and vice versa.');
  process.exit(0);
}

const LABEL = {
  missingAtRuntime: 'declared in .d.ts but missing at runtime',
  undeclared: 'exported at runtime but not declared',
  missingMethod: 'declared on the class but absent from its prototype',
};

console.error('\n❌ Type surface drift:\n');
for (const kind of ['missingAtRuntime', 'missingMethod', 'undeclared']) {
  const group = findings.filter((f) => f.kind === kind);
  if (!group.length) continue;

  console.error(`  ${LABEL[kind]}:`);
  for (const { pkg, symbol } of group) console.error(`    - ${pkg}: ${symbol}`);
  console.error('');
}
console.error('Fix the mismatch, or record a deliberate exception in');
console.error('scripts/type-surface-allowlist.json with a reason.');
process.exit(1);
