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
    external: ['@coherentjs/core'],
    minify: false,
    sourcemap: true
  });
}

console.log('✅ @coherentjs/performance-profiler built successfully');