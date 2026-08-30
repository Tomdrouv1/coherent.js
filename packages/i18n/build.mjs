import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/translator.js',
  'src/formatters.js',
  'src/locale.js'
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

console.log('✅ @coherent.js/i18n built successfully');
