import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: 'dist/index.js',
  external: ['@coherentjs/core'],
  minify: false,
  sourcemap: true
});

console.log('✅ @coherentjs/web-components built successfully');