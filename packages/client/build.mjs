import { build } from 'esbuild';
import { env } from 'node:process';

// One build with code splitting so the entry points share chunks — the event
// registry singletons must not be duplicated between './index' and './events'.
const result = await build({
  entryPoints: [
    'src/index.js',
    'src/events/index.js',
    'src/router.js',
    'src/hmr.js'
  ],
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  outdir: 'dist',
  outbase: 'src',
  sourcemap: true,
  treeShaking: true,
  minify: env.NODE_ENV === 'production',
  metafile: true,
  define: {
    // Keep `process.env.NODE_ENV` as written, for the app's bundler to
    // replace. Baking in the build machine's value (unset, so 'development';
    // esbuild's browser platform does the same on its own) made every
    // production hydrate() walk the DOM for mismatches.
    'process.env.NODE_ENV': 'process.env.NODE_ENV',
  },
});

for (const [path, output] of Object.entries(result.metafile.outputs)) {
  if (output.entryPoint) {
    const sizeKB = Math.round(output.bytes / 1024 * 100) / 100;
    console.log(`  📏 ${path}: ${sizeKB}KB`);
  }
}

console.log('✅ Built browser package @coherent.js/client successfully');
