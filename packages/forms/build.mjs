import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/form-builder.js',
  'src/form-hydration.js',
  'src/validation.js',
  'src/validators.js',
  'src/forms.js',
  'src/advanced-validation.js'
];

for (const entry of entries) {
  const outfile = entry.replace('src/', 'dist/').replace('.js', '.js');

  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    external: ['@coherent.js/core', '@coherent.js/state'],
    minify: false,
    sourcemap: true
  });
}

console.log('✅ @coherent.js/forms built successfully');
