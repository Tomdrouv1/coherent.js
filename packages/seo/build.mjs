import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/meta.js',
  'src/sitemap.js',
  'src/structured-data.js'
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

console.log('✅ @coherent.js/seo built successfully');
