/**
 * Selective Bundle Test - Tree-Shakable Imports (Good Practice)
 *
 * This demonstrates optimal tree shaking by importing only what's needed
 * Should result in significantly smaller bundle size
 */

// ✅ BEST PRACTICE: Import only what you need
import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard } from '@coherent.js/devtools/performance';

import { createCoherent } from '@coherent.js/core';
import { createFormState, createListState } from '@coherent.js/state';

// Use only specific DevTools features (allows tree shaking)
const visualizer = { logComponentTree };
const dashboard = { createPerformanceDashboard };

// Application code
const app = createCoherent({
  components: {
    TestApp: () => ({
      div: {
        text: 'Selective Bundle Test - Tree Shaking Enabled'
      }
    })
  }
});

// Use only imported features
console.log('Tree-shakable DevTools features:', Object.keys(visualizer).length + Object.keys(dashboard).length);

export default app;
