/**
 * Example Vite configuration with Coherent.js
 */

import { defineConfig } from 'vite';
import { coherentVitePlugin } from '@coherent.js/build-tools/vite';

export default defineConfig({
  plugins: [
    coherentVitePlugin({
      // Enable server-side rendering
      ssr: true,
      
      // Enable hot module replacement for components
      hmr: true,
      
      // Configure client-side hydration
      hydration: {
        enabled: true,
        selective: true // Only hydrate interactive components
      },
      
      // Entry point
      entry: 'src/main.js'
    })
  ],
  
  // Optimize dependencies for Coherent.js
  optimizeDeps: {
    include: [
      '@coherent.js/core',
      '@coherent.js/client'
    ]
  },
  
  // Configure SSR
  ssr: {
    noExternal: [
      '@coherent.js/core',
      '@coherent.js/client'
    ]
  },
  
  // Build configuration
  build: {
    target: 'node20',
    rollupOptions: {
      external: ['@coherent.js/express', '@coherent.js/fastify']
    }
  },
  
  // Development server
  server: {
    port: 3000,
    hmr: {
      clientPort: 24678
    }
  }
});