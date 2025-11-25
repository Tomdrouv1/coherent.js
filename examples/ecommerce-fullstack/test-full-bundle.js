/**
 * Full Bundle Test - Imports ALL DevTools (Anti-Pattern)
 *
 * This demonstrates what happens when you import many DevTools features
 * Should result in larger bundle size compared to selective imports
 */

// ❌ ANTI-PATTERN: Imports many features, larger bundle
import {
  ComponentInspector,
  PerformanceProfiler,
  DevLogger,
  ComponentVisualizer,
  PerformanceDashboard,
  EnhancedErrorHandler,
  // Import everything to simulate worst-case bundle size
  createInspector,
  createProfiler,
  measure,
  profile,
  createLogger,
  createComponentLogger,
  createConsoleLogger,
  createComponentVisualizer,
  visualizeComponent,
  logComponentTree,
  createPerformanceDashboard,
  showPerformanceDashboard,
  createEnhancedErrorHandler,
  handleEnhancedError
} from '@coherent.js/devtools';

import { createCoherent } from '@coherent.js/core';
import { createFormState, createListState } from '@coherent.js/state';

// Use all DevTools features (forces bundler to include everything)
const allDevTools = {
  ComponentInspector,
  PerformanceProfiler,
  DevLogger,
  ComponentVisualizer,
  PerformanceDashboard,
  EnhancedErrorHandler,
  createInspector,
  createProfiler,
  measure,
  profile,
  createLogger,
  createComponentLogger,
  createConsoleLogger,
  createComponentVisualizer,
  visualizeComponent,
  logComponentTree,
  createPerformanceDashboard,
  showPerformanceDashboard,
  createEnhancedErrorHandler,
  handleEnhancedError
};

// Application code
const app = createCoherent({
  components: {
    TestApp: () => ({
      div: {
        text: 'Full Bundle Test - All DevTools Included'
      }
    })
  }
});

// Use all imported features to ensure they're not tree-shaken
console.log('DevTools features available:', Object.keys(allDevTools).length);

export default app;
