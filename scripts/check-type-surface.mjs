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
 * Checks, per published entry point -- subpaths included, since
 * @coherent.js/integrations has no root export at all:
 *   1. value exports declared in the .d.ts but missing at runtime
 *   2. value exports present at runtime but undeclared
 *   3. methods declared on an exported class but absent from its prototype
 *   4. members declared on an exported object constant but absent from it
 *
 * Type-only exports (interface/type) are ignored -- they are erased by design.
 * Class instance fields are too: they are assigned in the constructor, so they
 * never appear on the prototype. Return types are out of scope; that needs the
 * type-tests.
 *
 * Entry points that cannot be imported are reported as skipped rather than
 * passing silently -- @coherent.js/client/hmr throws a migration error on
 * import, and the tooling LSP server needs transport arguments.
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

/** Top-level value declarations: things that must exist at runtime. */
const VALUE_EXPORT = /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function|const|let|var|class|enum)\s+([A-Za-z_$][\w$]*)/gm;

/** `export { a, b as c }` and `export { a } from './x'`, but not `export type {`. */
const EXPORT_LIST = /^export\s+(?!type[\s{])\{([^}]*)\}/gm;

/** `export * from './x'`, which forwards another file's exports verbatim. */
const EXPORT_STAR = /^export\s+\*\s+from\s+['"]([^'"]+)['"]/gm;

/** Resolve a relative specifier from a .d.ts to the declaration file it names. */
function resolveDeclaration(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;

  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base.replace(/\.js$/, '.d.ts'),
    `${base}.d.ts`,
    base,
    join(base, 'index.d.ts'),
  ];
  return candidates.find((path) => path.endsWith('.d.ts') && existsSync(path)) ?? null;
}

/**
 * Names a declaration file exports as values.
 *
 * Subpath entries are usually a re-export list rather than declarations of
 * their own, and `export *` forwards a sibling's exports, so both are followed
 * -- otherwise every re-exported name reads as undeclared.
 */
function declaredValueExports(file, seen = new Set()) {
  const names = new Set();
  if (seen.has(file)) return names;
  seen.add(file);

  const source = readFileSync(file, 'utf8');

  for (const [, name] of source.matchAll(VALUE_EXPORT)) names.add(name);

  for (const [, list] of source.matchAll(EXPORT_LIST)) {
    for (const entry of list.split(',')) {
      const clause = entry.trim();
      // `export { type Foo }` is erased; `a as b` exports b.
      if (!clause || /^type\s/.test(clause)) continue;
      const name = clause.split(/\s+as\s+/).pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default') names.add(name);
    }
  }

  for (const [, specifier] of source.matchAll(EXPORT_STAR)) {
    const target = resolveDeclaration(file, specifier);
    if (target) for (const name of declaredValueExports(target, seen)) names.add(name);
  }

  return names;
}

/** Extract the braced body a header regex opens, by brace depth. */
function bracedBody(source, header) {
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

/** The body of `export [declare] class <name> { ... }`. */
function classBody(source, name) {
  return bracedBody(source, new RegExp(`export\\s+(?:declare\\s+)?class\\s+${name}\\b[^{]*{`));
}

/**
 * The body of `export [declare] const <name>: { ... }`.
 *
 * Object constants carry as much API as classes do -- `stateUtils`,
 * `validators`, `hoc`, `fireEvent` -- and drift the same way.
 */
function constBody(source, name) {
  return bracedBody(source, new RegExp(`export\\s+(?:declare\\s+)?const\\s+${name}\\s*:\\s*{`));
}

/**
 * Names declared at the top level of a class or object-type body.
 *
 * Only depth-1 lines count, so members of a nested type literal -- a method's
 * return shape, say -- are not mistaken for members of the outer type.
 * Optional members are skipped: `foo?: T` says nothing about whether the
 * runtime provides it.
 *
 * `methodsOnly` is for classes: instance fields are assigned in the
 * constructor, so they never appear on the prototype and cannot be checked
 * there. Methods can.
 */
function declaredMembers(body, { methodsOnly = false } = {}) {
  const members = new Set();
  // `static`, `abstract`, `readonly` and get/set accessors all sit between the
  // indent and the member name.
  const modifiers = '(?:(?:static|abstract|readonly|get|set)\\s+)*';
  const shape = methodsOnly
    ? new RegExp(`^\\s+${modifiers}([A-Za-z_$][\\w$]*)\\s*(\\??)\\s*[<(]`)
    : new RegExp(`^\\s+${modifiers}([A-Za-z_$][\\w$]*)\\s*(\\??)\\s*[<(:]`);

  // Braces and parens both nest: a member spelled across several lines puts
  // its parameters and its return-type literal at a deeper level than itself.
  let depth = 0;
  for (const line of body.split('\n')) {
    if (depth === 0) {
      const match = line.match(shape);
      if (match && match[2] !== '?' && match[1] !== 'constructor' && match[1] !== 'new') {
        members.add(match[1]);
      }
    }
    for (const char of line) {
      if (char === '{' || char === '(') depth++;
      else if (char === '}' || char === ')') depth--;
    }
  }
  return members;
}

/**
 * Whether `target` or anything it inherits from defines `member`.
 *
 * Descriptor lookup rather than a property read: reading a declared accessor
 * would invoke the getter against the prototype, where instance fields do not
 * exist, and throw.
 */
function hasMember(target, member) {
  for (let object = target; object; object = Object.getPrototypeOf(object)) {
    if (Object.getOwnPropertyDescriptor(object, member)) return true;
  }
  return false;
}

function runtimeTarget(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object') return entry.import ?? entry.default ?? entry.require ?? null;
  return null;
}

/**
 * Every (subpath, types, runtime) triple a package publishes.
 *
 * @coherent.js/integrations has no root export at all -- every adapter is a
 * subpath -- so checking only `.` skipped the package entirely.
 */
function entryPoints(pkgJson) {
  const exports = pkgJson.exports ?? {};
  const found = [];

  for (const [subpath, entry] of Object.entries(exports)) {
    // Wildcard subpaths have no single file to resolve.
    if (subpath.includes('*')) continue;

    const types = typeof entry === 'object' ? entry.types : null;
    const runtime = runtimeTarget(entry);
    if (types && runtime) found.push({ subpath, types, runtime });
  }

  if (!found.some((e) => e.subpath === '.')) {
    const types = pkgJson.types ?? pkgJson.typings;
    const runtime = runtimeTarget(exports['.']) ?? pkgJson.main;
    if (types && runtime) found.push({ subpath: '.', types, runtime });
  }

  return found;
}

/**
 * Optional escape hatch, keyed by entry-point label (`@coherent.js/core`, or
 * `@coherent.js/integrations (./express)`). The file does not exist while the
 * surface is clean; add it only for drift that is deliberate, with a reason.
 */
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

let checked = 0;

for (const name of packages) {
  const dir = join(PACKAGES_DIR, name);
  const pkgJson = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  if (pkgJson.private) continue;

  const entries = entryPoints(pkgJson);
  if (!entries.length) {
    skipped.push(`${pkgJson.name}: no typed entry point`);
    continue;
  }

  for (const { subpath, types, runtime: runtimeRel } of entries) {
    // Only the root entry is bare; subpaths are reported as `pkg (./express)`.
    const label = subpath === '.' ? pkgJson.name : `${pkgJson.name} (${subpath})`;

    const typesPath = resolve(dir, types);
    const runtimePath = resolve(dir, runtimeRel);
    if (!existsSync(typesPath) || !existsSync(runtimePath)) {
      skipped.push(`${label}: entry file missing (run pnpm build)`);
      continue;
    }

    let mod;
    try {
      mod = await import(pathToFileURL(runtimePath).href);
    } catch (error) {
      skipped.push(`${label}: import failed (${error.code ?? error.name})`);
      continue;
    }

    checked++;
    const source = readFileSync(typesPath, 'utf8');
    const declared = declaredValueExports(typesPath);
    const runtime = new Set(Object.keys(mod));

    for (const symbol of declared) {
      if (!runtime.has(symbol) && !allowed(label, 'missingAtRuntime', symbol)) {
        findings.push({ pkg: label, kind: 'missingAtRuntime', symbol });
      }
    }

    for (const symbol of runtime) {
      if (symbol === 'default') continue;
      if (!declared.has(symbol) && !allowed(label, 'undeclared', symbol)) {
        findings.push({ pkg: label, kind: 'undeclared', symbol });
      }
    }

    // Declared class methods must exist on the prototype, and declared members
    // of an exported object constant must exist on the object.
    for (const symbol of declared) {
      const value = mod[symbol];
      if (value === null || value === undefined) continue;

      const isClass = typeof value === 'function' && value.prototype;
      const body = isClass ? classBody(source, symbol) : constBody(source, symbol);
      if (!body) continue;

      const target = isClass ? value.prototype : value;
      for (const member of declaredMembers(body, { methodsOnly: isClass })) {
        if (hasMember(target, member)) continue;
        if (allowed(label, 'missingMethod', `${symbol}.${member}`)) continue;
        findings.push({ pkg: label, kind: 'missingMethod', symbol: `${symbol}.${member}` });
      }
    }
  }
}

// A build regression that empties dist/ would leave every entry point skipped.
// Reporting success then would silently disable the gate rather than fail it.
const nothingChecked = checked === 0;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ checked, findings, skipped }, null, 2));
  process.exit(findings.length || nothingChecked ? 1 : 0);
}

console.log(`🔒 Comparing declared types against runtime exports (${checked} entry points)...`);
for (const note of skipped) console.log(`   skipped ${note}`);

if (nothingChecked) {
  console.error('\n❌ No entry point could be checked. Run `pnpm build` first.');
  process.exit(1);
}

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
