import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Global test configuration
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.test.{js,ts}',
        '**/*.config.{js,ts}',
        '**/build.mjs'
      ]
    },

    // File patterns
    include: [
      'packages/*/test/**/*.{test,spec}.{js,ts}',
      'packages/*/src/**/*.{test,spec}.{js,ts}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/node_modules/**'
    ],

    // Workspace configuration - Enable better test isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false // Allow multiple forks for better isolation
      }
    },
    
    // Test isolation settings
    isolate: true, // Isolate tests
    clearMocks: true, // Clear mocks between tests
    restoreMocks: true // Restore mocks between tests
  }
});