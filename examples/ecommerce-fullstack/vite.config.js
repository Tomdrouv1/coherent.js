import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite Configuration for Coherent.js Production Validation
 *
 * Tests real-world tree shaking and bundle optimization
 *
 * Every entry is server code (app.js is a node:http server, and core, api and
 * the devtools import Node built-ins), so this is an SSR build: it targets Node
 * and leaves the built-ins as real imports. A browser build replaced them with
 * empty stubs and failed to link.
 */

export default defineConfig({
  build: {
    ssr: true,
    // Generate multiple bundles to test tree shaking
    rolldownOptions: {
      input: {
        // Full bundle with all devtools (for comparison)
        'full-bundle': resolve(import.meta.dirname, 'test-full-bundle.js'),
        // Selective bundle with tree shaking
        'selective-bundle': resolve(import.meta.dirname, 'test-selective-bundle.js'),
        // Production bundle (optimal)
        'production-bundle': resolve(import.meta.dirname, 'app.js')
      },
      output: {
        dir: 'dist',
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-chunk.js',
        // Don't split chunks initially to see full bundle sizes
        manualChunks: undefined
      },
      // CRITICAL: Don't externalize Coherent.js packages for bundle analysis
      external: [],
      // Optimize for tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      }
    },

    // Production optimizations
    minify: 'terser',
    sourcemap: false,
    target: 'es2020',

    // Analyze bundle sizes
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,

    // Enable CSS and asset optimization
    cssCodeSplit: true,
    assetsInlineLimit: 4096
  },

  // An SSR build externalizes dependencies by default; bundle them instead, so
  // the size comparison measures what each entry actually pulls in. Node
  // built-ins stay external regardless.
  ssr: {
    noExternal: true
  },

  // Development server configuration
  server: {
    port: 3000,
    host: true
  },

  // CRITICAL: Include Coherent.js packages in bundle for analysis
  optimizeDeps: {
    include: [
      '@coherent.js/core',
      '@coherent.js/state',
      '@coherent.js/api',
      '@coherent.js/devtools'
    ],
    exclude: []
  },

  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __DEV__: JSON.stringify(false)
  },

  // Resolve workspace packages to their sources. Exact matches: a plain
  // '@coherent.js/devtools' key also rewrote '@coherent.js/devtools/visualizer'
  // to '.../src/index.js/visualizer'.
  resolve: {
    alias: [
      ['core', 'core/src/index.js'],
      ['state', 'state/src/index.js'],
      ['api', 'api/src/index.js'],
      ['devtools', 'devtools/src/index.js'],
      ['devtools/visualizer', 'devtools/src/component-visualizer.js'],
      ['devtools/performance', 'devtools/src/performance/index.js']
    ].map(([name, file]) => ({
      find: new RegExp(`^@coherent\\.js/${name}$`),
      replacement: resolve(import.meta.dirname, '../../packages', file)
    }))
  }
});
