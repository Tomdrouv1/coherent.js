/**
 * Coherent.js DevTools
 *
 * Tree-shakable developer tools suite for debugging and profiling
 * Import only what you need:
 *
 * import { logComponentTree } from '@coherent.js/devtools/visualizer';
 * import { createPerformanceDashboard } from '@coherent.js/devtools/performance';
 * import { handleEnhancedError } from '@coherent.js/devtools/errors';
 *
 * @module devtools
 */

// Import for default export
import {
  ComponentInspector,
  createInspector,
  inspect,
  validateComponent
} from './inspector.js';

import {
  PerformanceProfiler,
  createProfiler,
  measure,
  profile
} from './profiler.js';

import {
  DevLogger,
  LogLevel,
  createLogger,
  createComponentLogger,
  createConsoleLogger
} from './logger.js';

import {
  DevTools,
  createDevTools
} from './dev-tools.js';

// Import new enhanced developer experience tools
import {
  ComponentVisualizer,
  createComponentVisualizer,
  visualizeComponent,
  logComponentTree
} from './component-visualizer.js';

import {
  PerformanceDashboard,
  createPerformanceDashboard,
  showPerformanceDashboard
} from './performance-dashboard.js';

import {
  EnhancedErrorHandler,
  createEnhancedErrorHandler,
  handleEnhancedError
} from './enhanced-errors.js';

// Re-export everything as named exports for proper tree shaking
export {
  ComponentInspector,
  createInspector,
  inspect,
  validateComponent,
  PerformanceProfiler,
  createProfiler,
  measure,
  profile,
  DevLogger,
  LogLevel,
  createLogger,
  createComponentLogger,
  createConsoleLogger,
  DevTools,
  createDevTools,
  // Enhanced developer experience tools
  ComponentVisualizer,
  createComponentVisualizer,
  visualizeComponent,
  logComponentTree,
  PerformanceDashboard,
  createPerformanceDashboard,
  showPerformanceDashboard,
  EnhancedErrorHandler,
  createEnhancedErrorHandler,
  handleEnhancedError
};

// Note: No default export to enable proper tree shaking
// Use named imports: import { logComponentTree } from '@coherent.js/devtools';
