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
 *   - The packaged package.json declares activation events (with none,
 *     VS Code never starts the extension)
 *   - The packaged LSP server runs on its own: it is extracted alone into
 *     an empty directory (no node_modules, as when installed), spawned with
 *     --stdio, and must answer an LSP `initialize` request
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

import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

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
  return execFileSync('unzip', ['-p', vsixPath, entryName], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Spawn `serverPath --stdio`, send `initialize`, and resolve with the
 * response (rejects on exit, timeout, or an error response).
 */
function initializeServer(serverPath, cwd, timeoutMs = 20_000) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [serverPath, '--stdio'], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let buffer = Buffer.alloc(0);
    let stderr = '';
    const finish = (fn, value) => {
      clearTimeout(timer);
      child.kill();
      fn(value);
    };
    const timer = setTimeout(
      () => finish(reject, new Error(`no response to initialize within ${timeoutMs}ms\n${stderr}`)),
      timeoutMs
    );

    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('exit', (code) => finish(reject, new Error(`server exited (code ${code}) before answering\n${stderr}`)));
    child.on('error', (error) => finish(reject, error));
    child.stdout.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;
        const length = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, headerEnd).toString())?.[1]);
        if (buffer.length < headerEnd + 4 + length) return;
        const message = JSON.parse(buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString());
        buffer = buffer.subarray(headerEnd + 4 + length);
        if (message.id === 1) {
          if (message.error) finish(reject, new Error(`initialize failed: ${JSON.stringify(message.error)}`));
          else finish(resolvePromise, message.result);
          return;
        }
      }
    });

    const body = Buffer.from(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { processId: process.pid, rootUri: null, capabilities: {} }
    }));
    child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    child.stdin.write(body);
  });
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

async function main() {
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

  const packaged = JSON.parse(extractFile(vsixPath, 'extension/package.json'));
  if (!Array.isArray(packaged.activationEvents) || packaged.activationEvents.length === 0) {
    console.error('❌ The packaged package.json has no activationEvents: VS Code would never start the extension.');
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Activation events: ${packaged.activationEvents.join(', ')}`);

  // Run the server exactly as shipped: alone, with no node_modules around it.
  const isolated = mkdtempSync(join(tmpdir(), 'coherent-vsix-server-'));
  try {
    const serverPath = join(isolated, 'server.js');
    writeFileSync(serverPath, extractFile(vsixPath, 'extension/server/server.js'));
    const result = await initializeServer(serverPath, isolated);
    const capabilities = Object.keys(result?.capabilities || {});
    if (!result?.capabilities?.completionProvider || !result.capabilities.hoverProvider) {
      throw new Error(`unexpected capabilities: ${JSON.stringify(result?.capabilities)}`);
    }
    console.log(`✓ Packaged LSP server answers initialize standalone (${capabilities.join(', ')})`);
  } catch (err) {
    console.error('❌ Packaged LSP server did not start on its own:', err.message);
    process.exitCode = 1;
    return;
  } finally {
    rmSync(isolated, { recursive: true, force: true });
  }

  console.log('✅ VSIX publish-readiness check passed.');
}

await main();
