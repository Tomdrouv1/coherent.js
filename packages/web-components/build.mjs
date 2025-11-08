import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: 'dist/index.js',
  external: ['@coherent.js/core'],
  minify: false,
  sourcemap: true
});

console.log('✅ @coherent.js/web-components built successfully');