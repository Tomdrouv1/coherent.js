import * as esbuild from 'esbuild';
import { cp, mkdir, access } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// Copy language server from sibling package (if built)
const serverSource = join(__dirname, '../language-server/dist');
try {
  await access(serverSource);
  await mkdir(join(__dirname, 'server'), { recursive: true });
  await cp(serverSource, join(__dirname, 'server'), { recursive: true });
  console.log('Build complete: extension bundled, server copied to server/');
} catch {
  console.log('Build complete: extension bundled (language-server not yet built, skipping server copy)');
}
