import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/form-builder.js',
  'src/form-hydration.js',
  'src/validation.js',
  'src/validators.js',
  // Server-only (node:crypto); never imported by the entries above.
  'src/csrf.js'
];

for (const entry of entries) {
  const outfile = entry.replace('src/', 'dist/');

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
