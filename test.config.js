/**
 * Shared test configuration for all packages
 */
export const testConfig = {
  // Node.js test runner options
  testNamePatterns: ['*.test.js'],
  testTimeout: 30000,
  concurrency: true,
  
  // Test environment setup
  globalSetup: './test-setup.js',
  
  // Coverage options (when using c8 or similar)
  coverage: {
    enabled: process.env.NODE_ENV === 'test',
    exclude: [
      'node_modules/**',
      'test/**',
      'dist/**',
      '**/*.test.js',
      '**/*.config.js'
    ]
  }
};

/**
 * Package-specific test configurations
 */
export const packageConfigs = {
  core: {
    testDir: 'packages/core/test',
    requires: []
  },
  api: {
    testDir: 'packages/api/test',
    requires: ['@coherentjs/core']
  },
  database: {
    testDir: 'packages/database/test',
    requires: ['@coherentjs/core'],
    environment: {
      DATABASE_URL: 'sqlite::memory:'
    }
  },
  client: {
    testDir: 'packages/client/test',
    requires: ['@coherentjs/core'],
    environment: {
      NODE_ENV: 'test'
    }
  },
  express: {
    testDir: 'packages/express/test',
    requires: ['@coherentjs/core', 'express']
  },
  fastify: {
    testDir: 'packages/fastify/test',
    requires: ['@coherentjs/core', 'fastify']
  },
  koa: {
    testDir: 'packages/koa/test',
    requires: ['@coherentjs/core', 'koa']
  },
  nextjs: {
    testDir: 'packages/nextjs/test',
    requires: ['@coherentjs/core', 'next']
  }
};

export default testConfig;