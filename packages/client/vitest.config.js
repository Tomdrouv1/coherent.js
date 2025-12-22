import { defineConfig } from 'vitest/config';
import { env } from 'node:process';
import { codecovVitePlugin } from '@codecov/vite-plugin';

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
        bundleName: "@coherent.js/client",
        uploadToken: env.CODECOV_TOKEN,
      }),
    ],
  }
});
