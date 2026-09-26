#!/usr/bin/env node
/**
 * Run every top-level example and fail if one crashes.
 *
 * An example passes when it exits with code 0, or when it is a server that
 * is still running after STARTUP_MS (it is then stopped). Examples run
 * against the built packages, like a user's app: run `pnpm build` first.
 *
 *   node scripts/run-examples.mjs            # all examples/*.js
 *   node scripts/run-examples.mjs streaming  # names containing "streaming"
 */

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES = join(ROOT, 'examples');
const STARTUP_MS = 4000;
const TIMEOUT_MS = 30000;

const filter = process.argv[2];
const files = readdirSync(EXAMPLES)
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .filter((name) => !filter || name.includes(filter))
  .sort();

function run(file) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [join(EXAMPLES, file)], {
      cwd: ROOT,
      // Port 0: servers bind a free port, so examples never collide.
      env: { ...process.env, PORT: '0', NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(serverTimer);
      clearTimeout(killTimer);
      resolvePromise({ file, output, ...result });
    };

    // Still running after startup: a server that came up. Stop it.
    const serverTimer = setTimeout(() => {
      child.kill('SIGTERM');
      finish({ ok: true, kind: 'server' });
    }, STARTUP_MS);
    const killTimer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ ok: false, kind: 'timeout' });
    }, TIMEOUT_MS);

    child.on('exit', (code, signal) => {
      if (signal === 'SIGTERM' && settled) return;
      finish({ ok: code === 0, kind: code === 0 ? 'script' : `exit ${code ?? signal}` });
    });
  });
}

const results = [];
for (const file of files) {
  const result = await run(file);
  results.push(result);
  console.log(`${result.ok ? '✓' : '✗'} ${file} (${result.kind})`);
  if (!result.ok) {
    console.log(result.output.split('\n').slice(-15).map((line) => `    ${line}`).join('\n'));
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} examples ran`);
process.exit(failed.length ? 1 : 0);
