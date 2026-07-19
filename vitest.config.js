import { defineConfig } from 'vitest/config';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';

const pkgSrc = (pkg, file = 'index.js') =>
  fileURLToPath(new URL(`./packages/${pkg}/src/${file}`, import.meta.url));

export default defineConfig({
  resolve: {
    // Tests exercise package source directly, without requiring a build first.
    // (This replaces the `development` exports condition the published
    // packages used to carry — that condition broke consumers because src/ is
    // not shipped in the npm tarballs.)
    alias: [
      { find: /^@coherent\.js\/core$/, replacement: pkgSrc('core') },
      { find: /^@coherent\.js\/client$/, replacement: pkgSrc('client') },
      { find: /^@coherent\.js\/state$/, replacement: pkgSrc('state') },
      { find: /^@coherent\.js\/devtools$/, replacement: pkgSrc('devtools') },
      { find: /^@coherent\.js\/tooling\/testing$/, replacement: pkgSrc('tooling', 'testing/index.js') },
    ],
  },

  test: {
    // Global test configuration
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,

    // Retry flaky tests automatically
    retry: env.CI ? 2 : 0, // Retry 2 times in CI, 0 locally

    // Better reporting for CI
    reporters: env.CI
      ? ['verbose', 'json', 'junit']
      : ['default'],
    outputFile: {
      json: './test-results/results.json',
      junit: './test-results/junit.xml'
    },

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
      'packages/*/src/**/*.{test,spec}.{js,ts}',
      'test/**/*.{test,spec}.{js,ts}'
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

    // Test isolation settings
    isolate: true, // Isolate tests
    clearMocks: true, // Clear mocks between tests
    restoreMocks: true // Restore mocks between tests
  }
});
