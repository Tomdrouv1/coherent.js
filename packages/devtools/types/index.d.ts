/**
 * Coherent.js DevTools TypeScript Definitions
 * @module @coherent.js/devtools
 */

// ============================================================================
// Logger
// ============================================================================

/** Severity levels, ordered from most to least verbose. */
export const LogLevel: {
  readonly TRACE: 0;
  readonly DEBUG: 1;
  readonly INFO: 2;
  readonly WARN: 3;
  readonly ERROR: 4;
  readonly FATAL: 5;
};

/** One of the {@link LogLevel} values. */
export type LogLevelValue = 0 | 1 | 2 | 3 | 4 | 5;

export interface LoggerOptions {
  /** Minimum level to emit; defaults to `LogLevel.INFO` */
  level?: LogLevelValue;
  /** Prefix on every line; defaults to `'[Coherent]'` */
  prefix?: string;
  /** Include a timestamp; defaults to `true` */
  timestamp?: boolean;
  /** Colorize output; defaults to `true` */
  colors?: boolean;
  /** Cap on retained entries; defaults to `1000` */
  maxLogs?: number;
  /** Cap on buffered entries; defaults to `1000` */
  maxBufferSize?: number;
  /** Allow `group()`/`groupEnd()`; defaults to `true` */
  grouping?: boolean;
  /** Buffer instead of writing immediately; defaults to `false` */
  buffer?: boolean;
  /** Fraction of entries to keep, 0 to 1; defaults to `1.0` */
  sampleRate?: number;
  /** Record without writing anywhere; defaults to `false` */
  silent?: boolean;
  /** Write here instead of the console */
  output?: ((entry: LogEntry) => void) | null;
  /** Only emit these categories */
  categories?: string[] | null;
  /** Drop entries this rejects */
  filter?: ((entry: LogEntry) => boolean) | null;
  [option: string]: unknown;
}

export interface LogEntry {
  id: string;
  level: LogLevelValue;
  levelName: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
  category?: string;
  group?: string;
  context?: Record<string, unknown>;
}

/** Filter applied to entries before they are emitted. */
export interface LogFilter {
  (entry: LogEntry): boolean;
}

export interface LogQuery {
  level?: LogLevelValue;
  category?: string;
  /** Substring match against the message */
  search?: string;
  since?: number;
  limit?: number;
}

/** Structured logger with levels, filters, grouping and buffering. */
export class DevLogger {
  constructor(options?: LoggerOptions);

  options: LoggerOptions;
  logs: LogEntry[];
  filters: LogFilter[];
  handlers: Array<(entry: LogEntry) => void>;
  context: Record<string, unknown>;

  /**
   * Log at an explicit level, or under a category when the first argument is
   * a category name.
   */
  log(categoryOrLevel: string | LogLevelValue, messageOrData: string | Record<string, unknown>, data?: Record<string, unknown>): void;

  trace(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  fatal(message: string, data?: Record<string, unknown>): void;

  /** Log at an explicit level */
  logWithLevel(level: LogLevelValue, message: string, data?: Record<string, unknown>): void;

  /** Whether an entry passes the level, sampling and filters */
  shouldLog(level: LogLevelValue, message: string, data?: Record<string, unknown>): boolean;

  addFilter(filter: LogFilter): void;
  removeFilter(filter: LogFilter): void;

  /** Add a sink invoked for every emitted entry */
  addHandler(handler: (entry: LogEntry) => void): void;
  removeHandler(handler: (entry: LogEntry) => void): void;

  /** Open a named group; nest by calling again */
  group(name: string): void;
  groupEnd(): void;

  /** Retained entries, optionally narrowed */
  getLogs(filter?: LogQuery): LogEntry[];

  /** Entry counts by level and category */
  getStats(): Record<string, unknown>;

  /** Discard retained entries */
  clear(): void;

  /** Raise or lower the minimum level */
  setLevel(level: LogLevelValue): void;

  /** Serialize retained entries */
  export(format?: 'array' | 'json' | 'csv' | 'text'): unknown;

  /** A logger that stamps every entry with extra context */
  withContext(context: Record<string, unknown>): DevLogger;

  /** Render tabular data */
  table(data: unknown): void;

  /** Start a named timer */
  time(label: string): void;
  /** Stop a named timer and log the elapsed time */
  timeEnd(label: string): void;

  /** Entries held back by `buffer` */
  getBuffer(): LogEntry[];
  /** Emit and clear the buffer */
  flush(): void;
  /** Drop the buffer without emitting */
  clearBuffer(): void;
}

/** Create a {@link DevLogger}. */
export function createLogger(options?: LoggerOptions): DevLogger;

/** A logger prefixed with a component name. */
export function createComponentLogger(componentName: string, options?: LoggerOptions): DevLogger;

/** A logger that writes straight to the console. */
export function createConsoleLogger(prefix?: string): DevLogger;

// ============================================================================
// Inspector
// ============================================================================

export interface InspectorOptions {
  /** Retain past inspections; defaults to `true` */
  trackHistory?: boolean;
  /** Cap on retained inspections; defaults to `100` */
  maxHistory?: number;
  /** Log each inspection; defaults to `false` */
  verbose?: boolean;
  [option: string]: unknown;
}

export interface ComponentTreeNode {
  type: string;
  name?: string;
  props?: Record<string, unknown>;
  children?: ComponentTreeNode[];
  depth?: number;
  [key: string]: unknown;
}

export interface ComponentStats {
  depth: number;
  nodeCount: number;
  elementCount: number;
  complexity: number;
  [key: string]: unknown;
}

export interface ComponentAnalysis {
  type: string;
  valid: boolean;
  issues: string[];
  warnings: string[];
  [key: string]: unknown;
}

/** What one `inspect()` call produced. */
export interface InspectionResult {
  id: string;
  timestamp: number;
  /** Time the inspection itself took, in ms */
  inspectionTime: number;
  component: unknown;
  metadata: Record<string, unknown>;
  type: string;
  structure: unknown;
  props: Record<string, unknown>;
  depth: number;
  childCount: number;
  complexity: number;
  nodeCount: number;
  analysis: ComponentAnalysis;
  tree: ComponentTreeNode;
  stats: ComponentStats;
  valid: boolean;
  issues: string[];
  /** Alias of `issues` */
  errors: string[];
  warnings: string[];
}

/** Analyzes component structure and keeps a history of inspections. */
export class ComponentInspector {
  constructor(options?: InspectorOptions);

  options: InspectorOptions;
  components: Map<string, InspectionResult>;
  history: InspectionResult[];
  inspectionCount: number;

  /** Analyze a component and record the result */
  inspect(component: unknown, metadata?: Record<string, unknown>): InspectionResult;

  /** Props of the component's root element */
  extractProps(component: unknown): Record<string, unknown>;

  /** Type, validity, issues and warnings */
  analyzeComponent(component: unknown): ComponentAnalysis;

  /** Structural tree, capped at `maxDepth` */
  buildComponentTree(component: unknown, depth?: number, maxDepth?: number): ComponentTreeNode;

  /** Depth, node counts and complexity */
  calculateStats(component: unknown): ComponentStats;

  /** A past inspection by id */
  getComponent(id: string): InspectionResult | undefined;

  /** Copy of the inspection history */
  getHistory(): InspectionResult[];

  /** Past inspections matching every criterion */
  search(criteria: Record<string, unknown>): InspectionResult[];

  /** Structural differences between two components */
  compare(componentA: unknown, componentB: unknown): Record<string, unknown>;

  /** Summary of everything inspected so far */
  generateReport(): Record<string, unknown>;

  /** Drop recorded inspections and history */
  clear(): void;
  /** Drop history only */
  clearHistory(): void;

  /** Counts of inspections, components and issues */
  getStats(): Record<string, unknown>;

  /** Serialize recorded inspections */
  export(): Record<string, unknown>;
}

/** Create a {@link ComponentInspector}. */
export function createInspector(options?: InspectorOptions): ComponentInspector;

/** Inspect a component with a throwaway inspector. */
export function inspect(component: unknown, options?: InspectorOptions): InspectionResult;

/** Throws when the component is structurally invalid. */
export function validateComponent(component: unknown): boolean;

// ============================================================================
// Profiler
// ============================================================================

export interface ProfilerOptions {
  /** Record anything at all; defaults to `true` */
  enabled?: boolean;
  /** Fraction of sessions and renders to record, 0 to 1; defaults to `1.0` */
  sampleRate?: number;
  /** Above this many ms a render counts as slow; defaults to `16` */
  slowThreshold?: number;
  /** Sample heap usage where the runtime exposes it */
  trackMemory?: boolean;
  /** Cap on retained measurements; defaults to `1000` */
  maxSamples?: number;
  [option: string]: unknown;
}

export interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
}

/** One recorded render. */
export interface RenderMeasurement {
  id: string;
  componentName: string;
  props: Record<string, unknown>;
  startTime: number;
  endTime?: number;
  duration?: number;
  startMemory: MemoryUsage | null;
  endMemory?: MemoryUsage | null;
  memoryDelta?: number;
  phase: string;
  result?: Record<string, unknown>;
  /** Whether `duration` exceeded `slowThreshold` */
  slow?: boolean;
}

/** A point in time inside a session. */
export interface ProfilerMark {
  name: string;
  timestamp: number;
  data: Record<string, unknown>;
  memory: MemoryUsage | null;
}

export interface ProfilerStatistics {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
}

export interface ProfilerMetrics {
  totalOperations: number;
  totalDuration: number;
  operationCounts: Record<string, number>;
  averageDuration: number;
  memoryUsage: number | null;
}

export interface ProfilerReport {
  summary: {
    totalOperations: number;
    averageDuration: number;
    slowOperations: number;
  };
  statistics: ProfilerStatistics;
  operations: Array<{ name: string; duration: number; timestamp: number }>;
  bottlenecks: Array<{ name: string; duration: number; timestamp: number }>;
  recommendations: unknown[];
  timestamp: number;
}

export interface MeasurementQuery {
  componentName?: string;
  /** Only measurements flagged slow */
  slow?: boolean;
  minDuration?: number;
  limit?: number;
}

/**
 * Records render timings, session marks and memory usage.
 *
 * `start()` returns a session id — `null` when profiling is disabled or the
 * call was sampled out — and every id-taking method tolerates `null`.
 */
export class PerformanceProfiler {
  constructor(options?: ProfilerOptions);

  options: ProfilerOptions;
  measurements: RenderMeasurement[];
  sessions: Map<string, Record<string, unknown>>;
  currentSession: Record<string, unknown> | null;
  marks: Map<string, RenderMeasurement>;

  /** Open a session; `null` when disabled or sampled out */
  start(name?: string): string | null;

  /** Close a session and return its analysis; `null` when unknown */
  stop(sessionId: string | null): Record<string, unknown> | null;

  /** Begin timing a render; `null` when disabled or sampled out */
  startRender(componentName: string, props?: Record<string, unknown>): string | null;

  /** Finish timing a render; `null` when the id is unknown */
  endRender(measurementId: string | null, result?: Record<string, unknown>): RenderMeasurement | null;

  /** Record a named point in the current session */
  mark(name: string, data?: Record<string, unknown>): ProfilerMark;

  /** Elapsed time between two marks; throws when either is missing */
  measure(startMark: string, endMark: string): {
    duration: number;
    startMark: string;
    endMark: string;
  };

  /** Heap usage, where the runtime exposes it */
  getMemoryUsage(): MemoryUsage | null;

  /** A mark in the current session by name */
  findMark(name: string): ProfilerMark | null | undefined;

  /** Retained measurements, optionally narrowed */
  getMeasurements(filter?: MeasurementQuery): RenderMeasurement[];

  /** Aggregate one session's measurements */
  analyzeSession(session: Record<string, unknown>): Record<string, unknown>;

  /** Group measurements by component name */
  groupByComponent(measurements: RenderMeasurement[]): Record<string, unknown>;

  /** Totals, averages and the slowest recent renders */
  getSummary(): Record<string, unknown>;

  /** Mean, median, min, max and standard deviation */
  getStatistics(): ProfilerStatistics;

  /** Measurements slower than the threshold, slowest first */
  getBottlenecks(threshold?: number | null): Array<{
    name: string;
    duration: number;
    timestamp: number;
  }>;

  /** Operation counts, totals and heap usage */
  getMetrics(): ProfilerMetrics;

  /** Statistics, metrics, bottlenecks and recommendations together */
  generateReport(): ProfilerReport;

  /** Serialize sessions, measurements and metrics */
  export(): Record<string, unknown>;

  /** Render the metrics as a printable block */
  formatMetrics(): string;

  /** Compare two sessions; `null` when either id is unknown */
  compare(profileId1: string, profileId2: string): Record<string, unknown> | null;

  /** Suggestions derived from the recorded measurements */
  getRecommendations(): unknown[];

  /** Drop measurements, sessions and marks */
  clear(): void;

  /** Resume recording */
  enable(): void;
  /** Stop recording; `start()` and `startRender()` then return `null` */
  disable(): void;
}

/** Create a {@link PerformanceProfiler}. */
export function createProfiler(options?: ProfilerOptions): PerformanceProfiler;

/**
 * Time an async function. Rejects with `{ error, duration }` when `fn` throws.
 */
export function measure<T>(
  name: string,
  fn: () => T | Promise<T>,
  profiler?: PerformanceProfiler | null
): Promise<{ value: T; duration: number }>;

/** Wrap a function so calls to it can be profiled. */
export function profile<F extends (...args: never[]) => unknown>(fn: F): F;

// ============================================================================
// DevTools
// ============================================================================

/**
 * Development-only instrumentation: render interception, validation, hot
 * reload and a browser panel.
 *
 * Enabled only when `NODE_ENV=development`, or on localhost / `?dev=true` in
 * a browser. `isEnabled` is a property, not a method.
 */
export class DevTools {
  constructor(coherentInstance?: unknown);

  coherent: unknown;
  /** Whether instrumentation is active in this environment */
  isEnabled: boolean;
  renderHistory: unknown[];
  componentRegistry: Map<string, unknown>;
  warnings: unknown[];
  errors: unknown[];
  hotReloadEnabled: boolean;

  /** Whether the environment looks like development */
  shouldEnable(): boolean;

  /** Install every hook; called by the constructor when enabled */
  initialize(): void;

  /** Report a component's type, structure and props */
  inspectComponent(component: unknown): Record<string, unknown>;

  /** Render the structure as an indented tree */
  visualizeStructure(component: unknown, depth?: number, maxDepth?: number): string;

  /** Suggestions for a specific component */
  getOptimizationRecommendations(component: unknown): unknown[];

  /** Aggregate timings from the render history */
  getPerformanceInsights(): Record<string, unknown>;

  /** Throws when the component is structurally invalid */
  validateComponent(component: unknown): boolean;

  /** Deep structural check, collecting issues instead of throwing */
  deepValidateComponent(component: unknown, path?: string, depth?: number): unknown[];

  /** Depth, breadth and node counts */
  analyzeComplexity(component: unknown, depth?: number): Record<string, unknown>;

  /** Drop render history, warnings and errors */
  clearDevData(): void;

  /** Turn one instrumentation feature on or off */
  toggleFeature(feature: string): void;

  /** Print a summary of the session to the console */
  printDevSummary(): void;
}

/** Create a {@link DevTools} instance bound to a Coherent instance. */
export function createDevTools(coherentInstance?: unknown): DevTools;

// ============================================================================
// Component Visualizer
// ============================================================================

export interface VisualizerOptions {
  /** Depth cap; defaults to `50` */
  maxDepth?: number;
  /** Include props; defaults to `true` */
  showProps?: boolean;
  /** Include metadata; defaults to `true` */
  showMetadata?: boolean;
  /** Emit ANSI colors; defaults to `true` */
  colorOutput?: boolean;
  /** One line per node; defaults to `false` */
  compactMode?: boolean;
  [option: string]: unknown;
}

export interface VisualizerStats {
  totalComponents: number;
  totalDepth: number;
  staticComponents: number;
  dynamicComponents: number;
  /** Time spent building the visualization, in ms */
  renderTime: number;
}

export interface VisualizationResult {
  /** The printable tree */
  visualization: string;
  stats: VisualizerStats;
  tree: ComponentTreeNode;
}

/** Renders a component tree as printable text, DOT or JSON. */
export class ComponentVisualizer {
  constructor(options?: VisualizerOptions);

  options: VisualizerOptions;
  stats: VisualizerStats;

  /** Build the tree and render it */
  visualize(component: unknown, name?: string): VisualizationResult;

  /** Build the tree without rendering */
  buildTree(component: unknown, name: string, depth: number): ComponentTreeNode;

  /** Render a prepared tree */
  renderTree(tree: ComponentTreeNode): string;

  /** Serialize a tree as JSON */
  exportAsJSON(tree: ComponentTreeNode): string;

  /** Serialize a tree as Graphviz DOT */
  exportAsDOT(tree: ComponentTreeNode): string;
}

/** Create a {@link ComponentVisualizer}. */
export function createComponentVisualizer(options?: VisualizerOptions): ComponentVisualizer;

/** Visualize with a throwaway visualizer. */
export function visualizeComponent(
  component: unknown,
  name?: string,
  options?: VisualizerOptions
): VisualizationResult;

/** {@link visualizeComponent}, printed to the console. */
export function logComponentTree(
  component: unknown,
  name?: string,
  options?: VisualizerOptions
): VisualizationResult;

// ============================================================================
// Performance Dashboard
// ============================================================================

export interface DashboardOptions {
  /** Metric refresh interval in ms; defaults to `5000` */
  updateInterval?: number;
  /** History points retained per category; defaults to `100` */
  maxHistoryPoints?: number;
  /** Raise alerts on threshold breaches; defaults to `true` */
  enableAlerts?: boolean;
  /** Derive recommendations; defaults to `true` */
  enableRecommendations?: boolean;
  /** Emit ANSI colors; defaults to `true` */
  colorOutput?: boolean;
  [option: string]: unknown;
}

export interface DashboardMetrics {
  api: Record<string, unknown>;
  components: Record<string, unknown>;
  fullstack: Record<string, unknown>;
}

/** Collects API, component and full-stack timings and renders them. */
export class PerformanceDashboard {
  constructor(options?: DashboardOptions);

  options: DashboardOptions;
  metrics: DashboardMetrics;
  alerts: unknown[];
  recommendations: unknown[];
  startTime: number;

  /** Begin refreshing metrics on `updateInterval` */
  startMonitoring(): void;
  /** Stop refreshing */
  stopMonitoring(): void;

  recordAPIRequest(duration: number, routeType: string, cacheHit?: boolean): void;
  recordComponentRender(
    duration: number,
    componentType: string,
    cacheHit?: boolean,
    memoryDelta?: number
  ): void;
  recordFullStackRequest(duration: number, error?: unknown, bottlenecks?: unknown[]): void;

  /** Recompute derived metrics, alerts and recommendations */
  updateMetrics(): void;

  /** Cache hit ratio for one category */
  getCacheHitRate(category: string): number;

  /** Render the dashboard as printable text */
  generateDashboard(): string;

  /** Overall score derived from the current metrics */
  calculatePerformanceScore(): number;

  /** Serialize the current metrics */
  exportMetrics(): Record<string, unknown>;

  /** Clear every metric and alert */
  reset(): void;
}

/** Create a {@link PerformanceDashboard}. */
export function createPerformanceDashboard(options?: DashboardOptions): PerformanceDashboard;

/** Print a dashboard to the console and return it. */
export function showPerformanceDashboard(dashboard: PerformanceDashboard): PerformanceDashboard;

// ============================================================================
// Enhanced Errors
// ============================================================================

export interface ErrorHandlerOptions {
  /** How far to walk the component tree for context; defaults to `5` */
  maxContextDepth?: number;
  /** Keep the original stack; defaults to `true` */
  includeStackTrace?: boolean;
  /** Derive fix suggestions; defaults to `true` */
  showSuggestions?: boolean;
  /** Emit ANSI colors; defaults to `true` */
  colorOutput?: boolean;
  [option: string]: unknown;
}

/** An error with component context and suggested fixes attached. */
export interface EnhancedError {
  originalError: Error;
  message: string;
  stack?: string;
  timestamp: number;
  component: Record<string, unknown> | null;
  context: Record<string, unknown>;
  suggestions: string[];
  severity: string;
  category: string;
  componentContext?: Record<string, unknown>;
  propValidation?: Record<string, unknown>;
}

/** Turns a raw error into one carrying component context and suggestions. */
export class EnhancedErrorHandler {
  constructor(options?: ErrorHandlerOptions);

  options: ErrorHandlerOptions;
  errorHistory: EnhancedError[];

  /** Enhance an error and record it; the last 100 are retained */
  handleError(
    error: Error,
    component?: unknown,
    context?: Record<string, unknown>
  ): EnhancedError;

  /** Type, validity and complexity of a component */
  analyzeComponent(component: unknown): Record<string, unknown>;

  /** Where the component sits in the tree */
  getComponentContext(component: unknown, path?: string[]): Record<string, unknown>;

  /** Prop problems that could explain the error */
  validateProps(component: unknown): Record<string, unknown>;

  /** Fixes matching the error's known patterns */
  generateSuggestions(enhancedError: EnhancedError): string[];

  /** Render an enhanced error for the console */
  formatError(enhancedError: EnhancedError): string;

  /** Counts by severity and category */
  getErrorStats(): Record<string, unknown>;
}

/** Create an {@link EnhancedErrorHandler}. */
export function createEnhancedErrorHandler(options?: ErrorHandlerOptions): EnhancedErrorHandler;

/** Enhance an error, print it, and return it. */
export function handleEnhancedError(
  error: Error,
  component?: unknown,
  context?: Record<string, unknown>
): EnhancedError;
