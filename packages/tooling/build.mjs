import { execFileSync } from 'node:child_process';
import { rmSync, mkdirSync, cpSync, existsSync, chmodSync } from 'node:fs';
import { build } from 'esbuild';

// Clean
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
mkdirSync('dist/lsp/data', { recursive: true });

console.log('Extracting HTML element attributes...');
execFileSync('pnpm', ['exec', 'tsx', 'scripts/extract-attributes.ts'], { stdio: 'inherit' });

console.log('Compiling LSP (TypeScript)...');
execFileSync('pnpm', ['exec', 'tsc'], { stdio: 'inherit' });

const generatedJson = 'src/lsp/data/element-attributes.generated.json';
if (existsSync(generatedJson)) {
  cpSync(generatedJson, 'dist/lsp/data/element-attributes.generated.json');
}

// Ensure the LSP server entry is executable (it has a shebang and is the bin target)
const serverEntry = 'dist/lsp/server.js';
if (existsSync(serverEntry)) {
  chmodSync(serverEntry, 0o755);
}

console.log('Bundling testing utilities (JavaScript)...');
const testingEntries = [
  'src/testing/index.js',
  'src/testing/test-renderer.js',
  'src/testing/test-utils.js',
  'src/testing/matchers.js',
];

for (const entry of testingEntries) {
  const outfile = entry.replace('src/', 'dist/');

  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    external: ['@coherent.js/core', 'vitest'],
    minify: false,
    sourcemap: true,
  });
}

console.log('@coherent.js/tooling built successfully');
