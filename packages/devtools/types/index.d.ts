/**
 * Coherent.js DevTools TypeScript Definitions
 * @module @coherent.js/devtools
 */

import type { CoherentNode, ComponentInstance, ComponentProps } from '@coherent.js/core';

// ============================================================================
// Logger Types
// ============================================================================

/**
 * Log level enumeration
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Prefix for all log messages */
  prefix?: string;
  /** Include timestamp in output */
  timestamp?: boolean;
  /** Use colored output */
  colors?: boolean;
  /** Maximum logs to keep in memory */
  maxLogs?: number;
  /** Maximum buffer size */
  maxBufferSize?: number;
  /** Enable log grouping */
  grouping?: boolean;
  /** Buffer logs before output */
  buffer?: boolean;
  /** Sample rate (0-1) for high-volume logging */
  sampleRate?: number;
  /** Suppress all output */
  silent?: boolean;
  /** Custom output handler */
  output?: ((log: LogEntry) => void) | null;
  /** Filter by categories */
  categories?: string[] | null;
  /** Custom filter function */
  filter?: ((log: LogEntry) => boolean) | null;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Timestamp (ms since epoch) */
  timestamp: number;
  /** Additional data */
  data?: unknown[];
  /** Log category */
  category?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Development logger class
 */
export class DevLogger {
  constructor(options?: LoggerOptions);

  /** Log at TRACE level */
  trace(message: string, ...data: unknown[]): void;

  /** Log at DEBUG level */
  debug(message: string, ...data: unknown[]): void;

  /** Log at INFO level */
  info(message: string, ...data: unknown[]): void;

  /** Log at WARN level */
  warn(message: string, ...data: unknown[]): void;

  /** Log at ERROR level */
  error(message: string, ...data: unknown[]): void;

  /** Log at FATAL level */
  fatal(message: string, ...data: unknown[]): void;

  /** Log at specific level */
  log(level: LogLevel, message: string, ...data: unknown[]): void;

  /** Start a log group */
  group(label: string): void;

  /** End current log group */
  groupEnd(): void;

  /** Clear all logs */
  clear(): void;

  /** Get all stored logs */
  getLogs(): LogEntry[];

  /** Set minimum log level */
  setLevel(level: LogLevel): void;

  /** Add a log filter */
  addFilter(filter: (log: LogEntry) => boolean): void;

  /** Remove a log filter */
  removeFilter(filter: (log: LogEntry) => boolean): void;
}

/**
 * Create a logger instance
 */
export function createLogger(options?: LoggerOptions): DevLogger;

/**
 * Create a logger for a specific component
 */
export function createComponentLogger(componentName: string, options?: LoggerOptions): DevLogger;

/**
 * Create a logger that outputs to console
 */
export function createConsoleLogger(): DevLogger;

// ============================================================================
// Inspector Types
// ============================================================================

/**
 * Inspector configuration options
 */
export interface InspectorOptions {
  /** Track inspection history */
  trackHistory?: boolean;
  /** Maximum history entries */
  maxHistory?: number;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Component analysis result
 */
export interface ComponentAnalysis {
  /** Component type */
  type: string;
  /** Whether component is valid */
  valid: boolean;
  /** Validation issues */
  issues: string[];
  /** Warnings */
  warnings: string[];
}

/**
 * Component tree node
 */
export interface ComponentTreeNode {
  /** Component type/name */
  type: string;
  /** Tag name (if element) */
  tagName?: string;
  /** Child nodes */
  children: ComponentTreeNode[];
  /** Tree depth */
  depth: number;
  /** Component name */
  name?: string;
  /** Component ID */
  id?: string;
  /** Props */
  props?: Record<string, unknown>;
  /** State */
  state?: Record<string, unknown>;
  /** Render count */
  renderCount?: number;
}

/**
 * Component statistics
 */
export interface ComponentStats {
  /** Maximum depth */
  depth: number;
  /** Total element count */
  elementCount: number;
  /** Complexity score */
  complexity: number;
  /** Total node count */
  nodeCount: number;
}

/**
 * Inspector data for a component
 */
export interface InspectorData {
  /** Component instance */
  component: ComponentInstance;
  /** Component props */
  props: Record<string, unknown>;
  /** Component state */
  state: Record<string, unknown>;
  /** Rendered output */
  rendered: CoherentNode;
  /** Render time (ms) */
  renderTime: number;
  /** Update count */
  updateCount: number;
}

/**
 * Full inspection result
 */
export interface InspectionResult {
  /** Unique inspection ID */
  id: string;
  /** Inspection timestamp */
  timestamp: number;
  /** Time taken to inspect */
  inspectionTime: number;
  /** Inspected component */
  component: unknown;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Component type */
  type: string;
  /** Component structure */
  structure: unknown;
  /** Component props */
  props: Record<string, unknown>;
  /** Tree depth */
  depth: number;
  /** Direct child count */
  childCount: number;
  /** Complexity score */
  complexity: number;
  /** Total node count */
  nodeCount: number;
  /** Analysis result */
  analysis: ComponentAnalysis;
  /** Component tree */
  tree: ComponentTreeNode;
  /** Statistics */
  stats: ComponentStats;
  /** Whether component is valid */
  valid: boolean;
  /** Validation issues */
  issues: string[];
  /** Errors found */
  errors: string[];
  /** Warnings found */
  warnings: string[];
}

/**
 * Component inspector class
 */
export class ComponentInspector {
  constructor(options?: InspectorOptions);

  /** Inspect a component */
  inspect(component: unknown, metadata?: Record<string, unknown>): InspectionResult;

  /** Get inspection history */
  getHistory(): InspectionResult[];

  /** Get a specific inspection by ID */
  getComponent(id: string): InspectionResult | undefined;

  /** Clear inspection history */
  clear(): void;
}

/**
 * Create an inspector instance
 */
export function createInspector(options?: InspectorOptions): ComponentInspector;

/**
 * Inspect a component
 */
export function inspect(component: unknown, metadata?: Record<string, unknown>): InspectionResult;

/**
 * Validate a component structure
 */
export function validateComponent(component: unknown): { valid: boolean; issues: string[] };

// ============================================================================
// Profiler Types
// ============================================================================

/**
 * Profiler configuration options
 */
export interface ProfilerOptions {
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Maximum samples to keep */
  maxSamples?: number;
  /** Auto-start profiling */
  autoStart?: boolean;
}

/**
 * Performance measurement
 */
export interface PerformanceMeasurement {
  /** Measurement name */
  name: string;
  /** Duration in ms */
  duration: number;
  /** Start time */
  startTime: number;
  /** End time */
  endTime: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Profiler result for a component render
 */
export interface ProfilerResult {
  /** Component name */
  componentName: string;
  /** Total duration */
  duration: number;
  /** Render phase */
  phase: 'mount' | 'update';
  /** Actual duration (excluding suspended time) */
  actualDuration: number;
  /** Base duration (without memoization) */
  baseDuration: number;
  /** Start time */
  startTime: number;
  /** Commit time */
  commitTime: number;
}

/**
 * Profile report for a measurement
 */
export interface ProfileReport {
  /** All measurements */
  measurements: PerformanceMeasurement[];
  /** Total time */
  totalTime: number;
  /** Average time */
  averageTime: number;
  /** Minimum time */
  minTime: number;
  /** Maximum time */
  maxTime: number;
  /** Sample count */
  count: number;
}

/**
 * Performance profiler class
 */
export class PerformanceProfiler {
  constructor(options?: ProfilerOptions);

  /** Start a measurement */
  start(name: string): void;

  /** End a measurement */
  end(name: string): PerformanceMeasurement | null;

  /** Measure a synchronous function */
  measure<T>(name: string, fn: () => T): T;

  /** Measure an async function */
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;

  /** Get profile report */
  getReport(name?: string): ProfileReport | Map<string, ProfileReport>;

  /** Clear all measurements */
  clear(): void;

  /** Reset profiler state */
  reset(): void;
}

/**
 * Create a profiler instance
 */
export function createProfiler(options?: ProfilerOptions): PerformanceProfiler;

/**
 * Measure a synchronous function
 */
export function measure<T>(name: string, fn: () => T): T;

/**
 * Profile a function and return result with duration
 */
export function profile<T>(fn: () => T): { result: T; duration: number };

/**
 * Create a profiler that tracks render performance
 */
export function createRenderProfiler(config?: ProfilerOptions): {
  start(label: string): void;
  end(label: string): number;
  measure<T>(label: string, fn: () => T): T;
  measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
  getMetrics(): ProfileReport;
  reset(): void;
  onRender(callback: (result: ProfilerResult) => void): () => void;
};

/**
 * HOC to add profiling to a component
 */
export function withProfiling<P extends ComponentProps>(
  component: (props: P) => CoherentNode,
  name?: string
): (props: P) => CoherentNode;

// ============================================================================
// DevTools Configuration
// ============================================================================

/**
 * DevTools configuration options
 */
export interface DevToolsConfig {
  /** Enable devtools */
  enabled?: boolean;
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Trace renders */
  traceRenders?: boolean;
  /** Trace state changes */
  traceState?: boolean;
  /** Show panel UI */
  panel?: boolean;
}

/**
 * DevTools instance interface
 */
export interface DevToolsInstance {
  /** Inspect a component */
  inspect(component: ComponentInstance): InspectorData;

  /** Log a message */
  log(level: string, message: string, data?: unknown): void;

  /** Trace an event */
  trace(event: string, data?: unknown): void;

  /** Get the component tree */
  getComponentTree(): ComponentTreeNode[];

  /** Enable devtools */
  enable(): void;

  /** Disable devtools */
  disable(): void;

  /** Check if enabled */
  isEnabled(): boolean;
}

/**
 * Create a devtools instance
 */
export function createDevtools(config?: DevToolsConfig): DevToolsInstance;

/**
 * HOC to add devtools tracking to a component
 */
export function withDevtools<T extends (...args: unknown[]) => CoherentNode>(
  component: T,
  name?: string
): T;

// ============================================================================
// DevTools Class
// ============================================================================

/**
 * Combined DevTools options
 */
export interface DevToolsOptions {
  /** Logger options */
  logger?: LoggerOptions;
  /** Inspector options */
  inspector?: InspectorOptions;
  /** Profiler options */
  profiler?: ProfilerOptions;
  /** Enable all tools */
  enabled?: boolean;
}

/**
 * Combined DevTools class
 */
export class DevTools {
  /** Logger instance */
  logger: DevLogger;
  /** Inspector instance */
  inspector: ComponentInspector;
  /** Profiler instance */
  profiler: PerformanceProfiler;

  constructor(options?: DevToolsOptions);

  /** Enable all tools */
  enable(): void;

  /** Disable all tools */
  disable(): void;

  /** Check if enabled */
  isEnabled(): boolean;

  /** Clear all data */
  clear(): void;

  /** Get combined report */
  getReport(): {
    logs: LogEntry[];
    inspections: InspectionResult[];
    profiles: Map<string, ProfileReport>;
  };
}

/**
 * Create a DevTools instance
 */
export function createDevTools(options?: DevToolsOptions): DevTools;

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default devtools export
 */
declare const devtools: {
  ComponentInspector: typeof ComponentInspector;
  createInspector: typeof createInspector;
  inspect: typeof inspect;
  validateComponent: typeof validateComponent;
  PerformanceProfiler: typeof PerformanceProfiler;
  createProfiler: typeof createProfiler;
  measure: typeof measure;
  profile: typeof profile;
  DevLogger: typeof DevLogger;
  LogLevel: typeof LogLevel;
  createLogger: typeof createLogger;
  createComponentLogger: typeof createComponentLogger;
  createConsoleLogger: typeof createConsoleLogger;
  DevTools: typeof DevTools;
  createDevTools: typeof createDevTools;
};

export default devtools;
