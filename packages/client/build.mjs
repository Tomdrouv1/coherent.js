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
    'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
  },
});

for (const [path, output] of Object.entries(result.metafile.outputs)) {
  if (output.entryPoint) {
    const sizeKB = Math.round(output.bytes / 1024 * 100) / 100;
    console.log(`  📏 ${path}: ${sizeKB}KB`);
  }
}

console.log('✅ Built browser package @coherent.js/client successfully');
