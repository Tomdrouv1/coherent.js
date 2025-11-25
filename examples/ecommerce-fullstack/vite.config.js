import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite Configuration for Coherent.js Production Validation
 *
 * Tests real-world tree shaking and bundle optimization
 */

export default defineConfig({
  build: {
    // Generate multiple bundles to test tree shaking
    rollupOptions: {
      input: {
        // Full bundle with all devtools (for comparison)
        'full-bundle': resolve(__dirname, 'test-full-bundle.js'),
        // Selective bundle with tree shaking
        'selective-bundle': resolve(__dirname, 'test-selective-bundle.js'),
        // Production bundle (optimal)
        'production-bundle': resolve(__dirname, 'app.js')
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

  // Resolve workspace aliases
  resolve: {
    alias: {
      '@coherent.js/core': resolve(__dirname, '../../packages/core/src/index.js'),
      '@coherent.js/state': resolve(__dirname, '../../packages/state/src/index.js'),
      '@coherent.js/api': resolve(__dirname, '../../packages/api/src/index.js'),
      '@coherent.js/devtools': resolve(__dirname, '../../packages/devtools/src/index.js')
    }
  }
});
