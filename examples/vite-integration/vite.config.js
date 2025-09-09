/**
 * Example Vite configuration with Coherent.js
 */

import { defineConfig } from 'vite';
import { coherentVitePlugin } from '@coherentjs/build-tools/vite';

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
      '@coherentjs/core',
      '@coherentjs/client'
    ]
  },
  
  // Configure SSR
  ssr: {
    noExternal: [
      '@coherentjs/core',
      '@coherentjs/client'
    ]
  },
  
  // Build configuration
  build: {
    target: 'node20',
    rollupOptions: {
      external: ['@coherentjs/express', '@coherentjs/fastify']
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