import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/test-renderer.js',
  'src/test-utils.js',
  'src/matchers.js'
];

for (const entry of entries) {
  const outfile = entry.replace('src/', 'dist/').replace('.js', '.js');

  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    external: ['@coherent.js/core', 'vitest'],
    minify: false,
    sourcemap: true
  });
}

console.log('✅ @coherent.js/testing built successfully');
