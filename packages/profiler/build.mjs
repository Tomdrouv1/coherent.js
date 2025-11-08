import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/profiler.js',
  'src/server.js',
  'src/dashboard/index.js',
  'src/collectors/metrics-collector.js'
];

for (const entry of entries) {
  const outfile = entry.replace('src/', 'dist/');
  
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

console.log('✅ @coherent.js/performance-profiler built successfully');