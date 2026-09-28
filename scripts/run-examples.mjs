#!/usr/bin/env node
/**
 * Run every example and fail if one crashes.
 *
 * A top-level example (examples/*.js) passes when it exits with code 0, or
 * when it is a server that is still running after STARTUP_MS (it is then
 * stopped). An example app (examples/<app>/ with a package.json) runs its
 * `test` and `build` scripts, which must exit 0, then its `start` and
 * `preview` servers, which must come up. Everything runs against the built
 * packages, like a user's app: run `pnpm build` first.
 *
 *   node scripts/run-examples.mjs            # everything
 *   node scripts/run-examples.mjs streaming  # names containing "streaming"
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES = join(ROOT, 'examples');
const STARTUP_MS = 4000;
const TIMEOUT_MS = 30000;
// An app's test and build scripts start vitest or vite, slow on a cold runner.
const SCRIPT_TIMEOUT_MS = 120000;

const filter = process.argv[2];
const matches = (name) => !filter || name.includes(filter);

const files = readdirSync(EXAMPLES)
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .filter(matches)
  .sort();

const apps = readdirSync(EXAMPLES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(EXAMPLES, entry.name, 'package.json')))
  .map((entry) => entry.name)
  .filter(matches)
  .sort();

// Port 0: servers bind a free port, so examples never collide.
const SERVER_ENV = { ...process.env, PORT: '0', NODE_ENV: 'production' };

/**
 * Run a command to completion. With `server`, a process still running after
 * STARTUP_MS is a server that came up: it is stopped and passes.
 */
function run(label, command, args, { cwd, env = process.env, server = false, timeout = TIMEOUT_MS }) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });

    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(serverTimer);
      clearTimeout(killTimer);
      resolvePromise({ label, output, ...result });
    };

    // Still running after startup: a server that came up. Stop it.
    const serverTimer = server && setTimeout(() => {
      child.kill('SIGTERM');
      finish({ ok: true, kind: 'server' });
    }, STARTUP_MS);
    const killTimer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ ok: false, kind: 'timeout' });
    }, timeout);

    child.on('error', (error) => finish({ ok: false, kind: error.message }));
    child.on('exit', (code, signal) => {
      if (signal === 'SIGTERM' && settled) return;
      finish({ ok: code === 0, kind: code === 0 ? 'script' : `exit ${code ?? signal}` });
    });
  });
}

const checks = files.map((file) => () =>
  run(file, process.execPath, [join(EXAMPLES, file)], { cwd: ROOT, env: SERVER_ENV, server: true }));

for (const app of apps) {
  const cwd = join(EXAMPLES, app);
  const scripts = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).scripts ?? {};
  for (const script of ['test', 'build']) {
    if (scripts[script]) {
      checks.push(() => run(`${app} › ${script}`, 'pnpm', ['run', script], { cwd, timeout: SCRIPT_TIMEOUT_MS }));
    }
  }
  // `start` serves the source; `preview` serves what `build` produced, which
  // is the only way to learn the bundle works: a Vite 8 browser build of a
  // server exits 0 and throws as soon as the bundle runs.
  for (const script of ['start', 'preview']) {
    if (!scripts[script]) continue;
    // Start the server's node process directly: stopping it through pnpm
    // could leave the server itself running.
    const entry = /^node\s+(\S+)$/.exec(scripts[script].trim());
    checks.push(entry
      ? () => run(`${app} › ${script}`, process.execPath, [join(cwd, entry[1])], { cwd, env: SERVER_ENV, server: true })
      : async () => ({ label: `${app} › ${script}`, ok: false, kind: `unsupported ${script} script`, output: `Expected \`node <file>\`, found \`${scripts[script]}\`.` }));
  }
}

const results = [];
for (const check of checks) {
  const result = await check();
  results.push(result);
  console.log(`${result.ok ? '✓' : '✗'} ${result.label} (${result.kind})`);
  if (!result.ok) {
    console.log(result.output.split('\n').slice(-15).map((line) => `    ${line}`).join('\n'));
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} examples ran`);
process.exit(failed.length ? 1 : 0);
