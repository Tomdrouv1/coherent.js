import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/vite.js', 
  'src/webpack.js',
  'src/rollup.js',
  'src/coherent-loader.js',
  'src/utils.js'
];

for (const entry of entries) {
  const outfile = entry.replace('src/', 'dist/');
  
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    external: ['@coherentjs/core', 'vite', 'webpack', 'rollup'],
    minify: false,
    sourcemap: true
  });
}

console.log('✅ @coherentjs/build-tools built successfully');