#!/usr/bin/env node
/**
 * Scaffold Boot E2E
 *
 * The gap that let rc.1 and rc.2 ship broken scaffolds: nothing installed,
 * typechecked, tested, and *booted* the projects `coherent create` produces.
 * This harness does exactly that for representative permutations, against the
 * workspace packages (linked via `link:` deps), so scaffold or integration
 * regressions surface before publish.
 *
 * Requires built packages (`pnpm run build:packages`) — run locally with
 * `pnpm run e2e:scaffold`, or via .github/workflows/scaffold-e2e.yml.
 *
 * @module scripts/scaffold-boot-e2e
 */

import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const require = createRequire(join(REPO_ROOT, 'package.json'));

const { scaffoldProject } = await import(
  new URL('../packages/cli/src/generators/project-scaffold.js', import.meta.url)
);

const PERMUTATIONS = [
  {
    name: 'js-built-in-basic',
    options: { language: 'javascript', runtime: 'built-in', packages: [] },
    port: 4311
  },
  {
    name: 'js-koa-api',
    options: { language: 'javascript', runtime: 'koa', packages: ['api'] },
    port: 4312
  },
  {
    name: 'ts-express-api',
    options: { language: 'typescript', runtime: 'express', packages: ['api'] },
    port: 4313
  },
  {
    name: 'ts-fastify-full',
    options: {
      language: 'typescript',
      runtime: 'fastify',
      packages: ['api', 'i18n', 'forms', 'seo', 'testing']
    },
    port: 4314
  }
  // TODO(v1.1): fullstack + database + auth permutations once the tracked
  // auth-scaffold gaps (password hashing, built-in setupAuthRoutes) close.
];

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')} failed (exit ${result.status})\n${result.stdout}\n${result.stderr}`
    );
  }
  return result;
}

function linkWorkspaceDeps(projectPath, hasFastify) {
  const pkgPath = join(projectPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  for (const deps of [pkg.dependencies, pkg.devDependencies]) {
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (name.startsWith('@coherent.js/')) {
        deps[name] = `link:${join(PACKAGES_DIR, name.replace('@coherent.js/', ''))}`;
      }
    }
  }
  if (hasFastify) {
    // The linked integrations package resolves the monorepo's fastify copy;
    // pin the project to the same version so TS sees one set of fastify types
    // (real installs share a single copy via peer resolution).
    const fastifyVersion = require('fastify/package.json').version;
    pkg.pnpm = { overrides: { fastify: fastifyVersion } };
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

async function waitForServer(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) return res;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not answer on port ${port} within ${timeoutMs}ms`);
}

async function bootAndProbe(projectPath, permutation) {
  const { port } = permutation;
  const isTypeScript = permutation.options.language === 'typescript';
  const entry = isTypeScript
    ? ['./node_modules/.bin/tsx', ['src/index.ts']]
    : [process.execPath, ['src/index.js']];

  const child = spawn(entry[0], entry[1], {
    cwd: projectPath,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });

  try {
    const res = await waitForServer(port);
    const html = await res.text();
    if (!html.includes('<h1>')) {
      throw new Error(`homepage did not render a heading:\n${html.slice(0, 300)}`);
    }

    if (permutation.options.packages.includes('api')) {
      const getRes = await fetch(`http://127.0.0.1:${port}/api/users/7`);
      const getBody = await getRes.json();
      if (getBody.id !== 7) {
        throw new Error(`GET /api/users/7 returned ${JSON.stringify(getBody)}`);
      }
      const postRes = await fetch(`http://127.0.0.1:${port}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ada', email: 'ada@example.com' })
      });
      const postBody = await postRes.json();
      if (postBody.name !== 'Ada') {
        throw new Error(`POST /api/users returned ${JSON.stringify(postBody)}`);
      }
    }
  } catch (error) {
    error.message += `\n--- server output ---\n${output.slice(-2000)}`;
    throw error;
  } finally {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
  }
}

async function testPermutation(permutation) {
  const started = Date.now();
  const projectPath = mkdtempSync(join(tmpdir(), `coherent-boot-${permutation.name}-`));
  console.log(`\n▶ ${permutation.name}`);

  try {
    await scaffoldProject(projectPath, {
      name: permutation.name,
      template: 'basic',
      ...permutation.options,
      packageManager: 'pnpm',
      skipInstall: true,
      skipGit: true
    });

    linkWorkspaceDeps(projectPath, permutation.options.runtime === 'fastify');

    run('pnpm', ['install', '--silent'], { cwd: projectPath });
    console.log('  install ✓');

    if (permutation.options.language === 'typescript') {
      run('pnpm', ['typecheck'], { cwd: projectPath });
      console.log('  typecheck ✓');
    }

    run('pnpm', ['test'], { cwd: projectPath });
    console.log('  tests ✓');

    await bootAndProbe(projectPath, permutation);
    console.log(`  boot + HTTP probes ✓ (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    return true;
  } catch (error) {
    console.error(`  ✗ ${permutation.name} FAILED:\n${error.message}`);
    return false;
  } finally {
    rmSync(projectPath, { recursive: true, force: true });
  }
}

async function main() {
  if (!existsSync(join(PACKAGES_DIR, 'core', 'dist', 'index.js'))) {
    console.error('Built packages required — run `pnpm run build:packages` first.');
    process.exit(2);
  }

  console.log(`Scaffold boot E2E — ${PERMUTATIONS.length} permutations`);
  let failed = 0;
  for (const permutation of PERMUTATIONS) {
    if (!(await testPermutation(permutation))) failed++;
  }

  if (failed > 0) {
    console.error(`\n❌ ${failed}/${PERMUTATIONS.length} permutations failed`);
    process.exit(1);
  }
  console.log(`\n✅ All ${PERMUTATIONS.length} scaffold permutations install, typecheck, test, and boot.`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(3);
});
