import { codecovVitePlugin } from '@codecov/vite-plugin';
import { defineConfig } from 'vitest/config';
import { env } from 'node:process';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage'
    },

    plugins: [
      codecovVitePlugin({
        enableBundleAnalysis: env.CODECOV_TOKEN !== undefined,
        bundleName: "@coherent.js/adapters",
        uploadToken: env.CODECOV_TOKEN,
      }),
    ],
  }
});
