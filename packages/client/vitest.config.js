import { defineConfig } from 'vitest/config';
import { coherentSources, sharedTestOptions } from '../../vitest.shared.js';

// Same resolution as the root config: @coherent.js/* imports run against
// package sources, not whatever dist/ was last built.
export default defineConfig({
  plugins: [coherentSources()],
  test: {
    ...sharedTestOptions,
    include: ['test/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage'
    }
  }
});
