import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/inspector.js',
  'src/profiler.js',
  'src/logger.js'
];

for (const entry of entries) {
  const outfile = entry.replace('src/', 'dist/').replace('.js', '.js');

  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    external: ['@coherent.js/core'],
    minify: false,
    sourcemap: true
  });
}

console.log('✅ @coherent.js/devtools built successfully');
