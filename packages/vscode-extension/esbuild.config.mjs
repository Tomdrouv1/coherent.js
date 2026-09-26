import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLING_DIR = join(__dirname, '../tooling');

// Bundle extension
await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  platform: 'node',
  format: 'cjs', // VS Code requires CommonJS for extension main
  sourcemap: true,
});

// Bundle the language server (@coherent.js/tooling/lsp) from source into ONE
// self-contained file. The .vsix ships without node_modules (.vscodeignore,
// `vsce package --no-dependencies`), so a plain copy of tooling's dist could
// not load vscode-languageserver. Building from source also means this build
// never depends on tooling having been built first (or finishing first when
// the packages build in parallel).

// The element attribute data is generated from core's type declarations.
// Extract a private copy, so we never read the file tooling's own build may
// be writing at the same moment.
const dataDir = mkdtempSync(join(tmpdir(), 'coherent-vscode-'));
const dataFile = join(dataDir, 'element-attributes.generated.json');
try {
  execFileSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/extract-attributes.ts', '--out', dataFile],
    { cwd: TOOLING_DIR, stdio: ['ignore', 'ignore', 'inherit'] }
  );
  const elementData = readFileSync(dataFile, 'utf8');
  JSON.parse(elementData); // fail the build on a truncated/invalid file

  // Swap tooling's runtime JSON loader for the data, inlined.
  const inlineElementData = {
    name: 'inline-element-data',
    setup(build) {
      build.onResolve({ filter: /[\\/]generated-data\.js$/ }, () => ({
        path: 'generated-data',
        namespace: 'coherent-inline',
      }));
      build.onLoad({ filter: /.*/, namespace: 'coherent-inline' }, () => ({
        contents: `export function loadGeneratedData() { return ${elementData}; }`,
        loader: 'js',
      }));
    },
  };

  rmSync(join(__dirname, 'server'), { recursive: true, force: true });
  await esbuild.build({
    entryPoints: [join(TOOLING_DIR, 'src/lsp/bin.ts')],
    bundle: true,
    outfile: 'server/server.js',
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    plugins: [inlineElementData],
    minify: true, // it bundles the TypeScript parser; keeps the .vsix small
    logLevel: 'warning',
  });
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

console.log('Build complete: extension bundled to dist/, language server bundled to server/server.js');
