/**
 * Coherent.js DevTools
 * 
 * Complete developer tools suite for debugging and profiling
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

// Re-export everything
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
  createDevTools
};

// Default export with all utilities
export default {
  // Inspector
  ComponentInspector,
  createInspector,
  inspect,
  validateComponent,

  // Profiler
  PerformanceProfiler,
  createProfiler,
  measure,
  profile,

  // Logger
  DevLogger,
  LogLevel,
  createLogger,
  createComponentLogger,
  createConsoleLogger,

  // DevTools
  DevTools,
  createDevTools
};
