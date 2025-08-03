// scripts/build.js
import { build } from 'esbuild';

const builds = [
    // Core server framework (ESM)
    {
        entryPoints: ['src/coherent.js'],
        format: 'esm',
        outfile: 'dist/coherent.js',
        platform: 'node',
        target: 'node16',
    },

    // Core server framework (CJS for compatibility)
    {
        entryPoints: ['src/coherent.js'],
        format: 'cjs',
        outfile: 'dist/coherent.cjs',
        platform: 'node',
        target: 'node16',
    },

    // Express integration
    {
        entryPoints: ['src/express/index.js'],
        format: 'esm',
        outfile: 'dist/express.js',
        platform: 'node',
        target: 'node16',
        external: ['express'],
    },

    // Optional client-side hydration
    {
        entryPoints: ['src/client/hydration.js'],
        format: 'esm',
        outfile: 'dist/client.js',
        platform: 'browser',
        target: 'es2020',
        minify: true,
    },
];

console.log('🏗️  Building Coherent Server Framework...\n');

for (const config of builds) {
    await build({
        bundle: true,
        sourcemap: true,
        ...config,
    });
    console.log(`✅ Built ${config.outfile}`);
}

console.log('\n📦 Server framework build complete!');
