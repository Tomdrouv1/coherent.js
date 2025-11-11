/**
 * Coherent.js DevTools TypeScript Definitions
 * @module @coherent.js/devtools
 */

// ===== Logger Types =====

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colors?: boolean;
  maxLogs?: number;
  maxBufferSize?: number;
  grouping?: boolean;
  buffer?: boolean;
  sampleRate?: number;
  silent?: boolean;
  output?: ((log: LogEntry) => void) | null;
  categories?: string[] | null;
  filter?: ((log: LogEntry) => boolean) | null;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: any[];
  category?: string;
  context?: Record<string, any>;
}

export class DevLogger {
  constructor(options?: LoggerOptions);
  trace(message: string, ...data: any[]): void;
  debug(message: string, ...data: any[]): void;
  info(message: string, ...data: any[]): void;
  warn(message: string, ...data: any[]): void;
  error(message: string, ...data: any[]): void;
  fatal(message: string, ...data: any[]): void;
  log(level: LogLevel, message: string, ...data: any[]): void;
  group(label: string): void;
  groupEnd(): void;
  clear(): void;
  getLogs(): LogEntry[];
  setLevel(level: LogLevel): void;
  addFilter(filter: (log: LogEntry) => boolean): void;
  removeFilter(filter: (log: LogEntry) => boolean): void;
}

export function createLogger(options?: LoggerOptions): DevLogger;
export function createComponentLogger(componentName: string, options?: LoggerOptions): DevLogger;
export function createConsoleLogger(): DevLogger;

// ===== Inspector Types =====

export interface InspectorOptions {
  trackHistory?: boolean;
  maxHistory?: number;
  verbose?: boolean;
}

export interface ComponentAnalysis {
  type: string;
  valid: boolean;
  issues: string[];
  warnings: string[];
}

export interface ComponentTree {
  type: string;
  tagName?: string;
  children: ComponentTree[];
  depth: number;
}

export interface ComponentStats {
  depth: number;
  elementCount: number;
  complexity: number;
  nodeCount: number;
}

export interface InspectionResult {
  id: string;
  timestamp: number;
  inspectionTime: number;
  component: any;
  metadata: Record<string, any>;
  type: string;
  structure: any;
  props: Record<string, any>;
  depth: number;
  childCount: number;
  complexity: number;
  nodeCount: number;
  analysis: ComponentAnalysis;
  tree: ComponentTree;
  stats: ComponentStats;
  valid: boolean;
  issues: string[];
  errors: string[];
  warnings: string[];
}

export class ComponentInspector {
  constructor(options?: InspectorOptions);
  inspect(component: any, metadata?: Record<string, any>): InspectionResult;
  getHistory(): InspectionResult[];
  getComponent(id: string): InspectionResult | undefined;
  clear(): void;
}

export function createInspector(options?: InspectorOptions): ComponentInspector;
export function inspect(component: any, metadata?: Record<string, any>): InspectionResult;
export function validateComponent(component: any): { valid: boolean; issues: string[] };

// ===== Profiler Types =====

export interface ProfilerOptions {
  sampleRate?: number;
  maxSamples?: number;
  autoStart?: boolean;
}

export interface PerformanceMeasurement {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  metadata?: Record<string, any>;
}

export interface ProfileReport {
  measurements: PerformanceMeasurement[];
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  count: number;
}

export class PerformanceProfiler {
  constructor(options?: ProfilerOptions);
  start(name: string): void;
  end(name: string): PerformanceMeasurement | null;
  measure(name: string, fn: () => any): any;
  measureAsync(name: string, fn: () => Promise<any>): Promise<any>;
  getReport(name?: string): ProfileReport | Map<string, ProfileReport>;
  clear(): void;
  reset(): void;
}

export function createProfiler(options?: ProfilerOptions): PerformanceProfiler;
export function measure<T>(name: string, fn: () => T): T;
export function profile<T>(fn: () => T): { result: T; duration: number };

// ===== DevTools Types =====

export interface DevToolsOptions {
  logger?: LoggerOptions;
  inspector?: InspectorOptions;
  profiler?: ProfilerOptions;
  enabled?: boolean;
}

export class DevTools {
  logger: DevLogger;
  inspector: ComponentInspector;
  profiler: PerformanceProfiler;

  constructor(options?: DevToolsOptions);
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  clear(): void;
  getReport(): {
    logs: LogEntry[];
    inspections: InspectionResult[];
    profiles: Map<string, ProfileReport>;
  };
}

export function createDevTools(options?: DevToolsOptions): DevTools;

// Default export
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
