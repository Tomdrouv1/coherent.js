import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/inspector.js',
  'src/profiler.js',
  'src/logger.js',
  'src/performance-dashboard.js',
  'src/performance/index.js',
  'src/performance/cache.js',
  'src/performance/code-splitting.js',
  'src/performance/lazy-loading.js'
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
