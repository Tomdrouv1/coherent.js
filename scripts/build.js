// scripts/build.js
import { build } from 'esbuild';

const builds = [
    // Core server framework (ESM)
    {
        entryPoints: ['packages/core/src/index.js'],
        format: 'esm',
        outfile: 'dist/coherent.js',
        platform: 'node',
        target: 'node16',
    },

    // Core server framework (CJS for compatibility)
    {
        entryPoints: ['packages/core/src/index.js'],
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
    {
        entryPoints: ['src/express/index.js'],
        format: 'cjs',
        outfile: 'dist/express.cjs',
        platform: 'node',
        target: 'node16',
        external: ['express'],
    },

    // Koa integration
    {
        entryPoints: ['src/koa/index.js'],
        format: 'esm',
        outfile: 'dist/koa.js',
        platform: 'node',
        target: 'node16',
        external: ['koa'],
    },
    {
        entryPoints: ['src/koa/index.js'],
        format: 'cjs',
        outfile: 'dist/koa.cjs',
        platform: 'node',
        target: 'node16',
        external: ['koa'],
    },

    // Fastify integration
    {
        entryPoints: ['src/fastify/coherent-fastify.js'],
        format: 'esm',
        outfile: 'dist/fastify.js',
        platform: 'node',
        target: 'node16',
        external: ['fastify'],
    },
    {
        entryPoints: ['src/fastify/coherent-fastify.js'],
        format: 'cjs',
        outfile: 'dist/fastify.cjs',
        platform: 'node',
        target: 'node16',
        external: ['fastify'],
    },

    // Next.js integration
    {
        entryPoints: ['src/nextjs/index.js'],
        format: 'esm',
        outfile: 'dist/nextjs.js',
        platform: 'node',
        target: 'node16',
        external: ['next'],
    },
    {
        entryPoints: ['src/nextjs/index.js'],
        format: 'cjs',
        outfile: 'dist/nextjs.cjs',
        platform: 'node',
        target: 'node16',
        external: ['next'],
    },

    // API framework
    {
        entryPoints: ['src/api/index.js'],
        format: 'esm',
        outfile: 'dist/api.js',
        platform: 'node',
        target: 'node16',
    },
    {
        entryPoints: ['src/api/index.js'],
        format: 'cjs',
        outfile: 'dist/api.cjs',
        platform: 'node',
        target: 'node16',
    },

    // Optional client-side hydration
    {
        entryPoints: ['packages/client/src/hydration.js'],
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
