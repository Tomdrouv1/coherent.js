import { build } from 'esbuild';

const entries = [
  'src/index.js',
  'src/astro.js', 
  'src/remix.js',
  'src/sveltekit.js'
];

for (const entry of entries) {
  const outfile = entry.replace('src/', 'dist/').replace('.js', '.js');
  
  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    external: ['@coherentjs/core', 'astro', '@remix-run/*', '@sveltejs/*'],
    minify: false,
    sourcemap: true
  });
}

console.log('✅ @coherentjs/adapters built successfully');