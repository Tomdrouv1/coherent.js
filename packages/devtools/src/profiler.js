/**
 * Coherent.js Performance Profiler
 *
 * Tracks and analyzes rendering performance
 *
 * Timings come from performance.now() (sub-millisecond, monotonic), so
 * `startTime` / `endTime` are relative to the time origin, not epoch
 * milliseconds. A profiler records nothing until enabled.
 *
 * @module devtools/profiler
 */

const hasPerformanceTimeline = () =>
  typeof performance !== 'undefined' && typeof performance.mark === 'function';

/** Monotonic high-resolution clock in milliseconds. */
function now() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/** Remove entries this profiler added to the global performance timeline. */
function clearTimelineEntries(marks, measureName) {
  if (!hasPerformanceTimeline()) return;
  for (const mark of marks) {
    performance.clearMarks?.(mark);
  }
  if (measureName) {
    performance.clearMeasures?.(measureName);
  }
}

/**
 * Add a performance.measure() for DevTools timelines, then clear it and its
 * marks so a long-running process does not accumulate timeline entries.
 */
function recordTimelineMeasure(name, startMark, endMark) {
  if (!hasPerformanceTimeline()) return;
  try {
    performance.mark(endMark);
    performance.measure?.(name, startMark, endMark);
  } catch {
    // Ignore measure errors (e.g. the start mark was already cleared)
  } finally {
    clearTimelineEntries([startMark, endMark], name);
  }
}

/**
 * Performance Profiler
 * Measures and analyzes component rendering performance
 */
export class PerformanceProfiler {
  constructor(options = {}) {
    this.options = {
      // Opt-in: a profiler that is merely constructed must cost nothing.
      enabled: false,
      sampleRate: 1.0, // 1.0 = 100% sampling
      slowThreshold: 16, // 16ms = 60fps
      trackMemory: typeof performance !== 'undefined' && performance.memory,
      maxSamples: options.maxSamples || 1000,
      ...options
    };
    
    this.measurements = [];
    this.sessions = new Map();
    this.currentSession = null;
    this.marks = new Map();
  }

  /**
   * Start a profiling session
   */
  start(name = 'default') {
    if (!this.options.enabled) {
      return null;
    }

    // Apply sampling
    if (this.options.sampleRate < 1.0 && Math.random() > this.options.sampleRate) {
      return null;
    }

    const session = {
      id: this.generateId(),
      name,
      startTime: now(),
      measurements: [],
      marks: [],
      active: true
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;

    if (hasPerformanceTimeline()) {
      performance.mark(`coherent-session-start-${session.id}`);
    }

    return session.id;
  }

  /**
   * Stop a profiling session
   */
  stop(sessionId) {
    if (!sessionId) {
      return null;
    }

    const session = this.sessions.get(sessionId);

    if (!session) {
      return null; // Gracefully handle non-existent sessions
    }

    session.endTime = now();
    session.duration = session.endTime - session.startTime;
    session.active = false;

    recordTimelineMeasure(
      `coherent-session-${session.id}`,
      `coherent-session-start-${session.id}`,
      `coherent-session-end-${session.id}`
    );

    if (this.currentSession === session) {
      this.currentSession = null;
    }

    // Store measurement
    this.addMeasurement(session);

    return this.analyzeSession(session);
  }

  /**
   * Start measuring a render
   */
  startRender(componentName, props = {}) {
    if (!this.options.enabled) return null;
    
    // Sample rate check
    if (Math.random() > this.options.sampleRate) return null;

    const measurementId = this.generateId();
    const measurement = {
      id: measurementId,
      componentName,
      props,
      startTime: now(),
      startMemory: this.getMemoryUsage(),
      phase: 'render'
    };

    this.marks.set(measurementId, measurement);

    if (hasPerformanceTimeline()) {
      performance.mark(`coherent-render-start-${measurementId}`);
    }

    return measurementId;
  }

  /**
   * End measuring a render
   */
  endRender(measurementId, result = {}) {
    if (!measurementId || !this.marks.has(measurementId)) return null;

    const measurement = this.marks.get(measurementId);
    measurement.endTime = now();
    measurement.duration = measurement.endTime - measurement.startTime;
    measurement.endMemory = this.getMemoryUsage();
    measurement.memoryDelta = measurement.startMemory && measurement.endMemory
      ? measurement.endMemory.used - measurement.startMemory.used
      : null;
    measurement.result = result;
    measurement.slow = measurement.duration > this.options.slowThreshold;

    recordTimelineMeasure(
      `coherent-render-${measurementId}`,
      `coherent-render-start-${measurementId}`,
      `coherent-render-end-${measurementId}`
    );

    // Add to measurements (bounded by maxSamples)
    this.addMeasurement(measurement);

    // Add to current session
    if (this.currentSession) {
      this.currentSession.measurements.push(measurement);
      this.trim(this.currentSession.measurements);
    }

    // Clean up
    this.marks.delete(measurementId);

    return measurement;
  }

  /**
   * Mark a point in time
   */
  mark(name, data = {}) {
    const mark = {
      name,
      timestamp: now(),
      data,
      memory: this.getMemoryUsage()
    };

    if (this.currentSession) {
      this.currentSession.marks.push(mark);
      this.trim(this.currentSession.marks);
    }

    return mark;
  }

  /**
   * Measure time between two marks
   */
  measure(startMark, endMark) {
    const start = this.findMark(startMark);
    const end = this.findMark(endMark);

    if (!start || !end) {
      throw new Error('Mark not found');
    }

    return {
      duration: end.timestamp - start.timestamp,
      startMark: start.name,
      endMark: end.name
    };
  }

  /**
   * Append a measurement, dropping the oldest beyond `maxSamples`.
   */
  addMeasurement(measurement) {
    this.measurements.push(measurement);
    this.trim(this.measurements);
  }

  /**
   * Drop the oldest entries of `list` beyond `maxSamples`.
   */
  trim(list) {
    const max = Math.max(1, Number(this.options.maxSamples) || 1000);
    if (list.length > max) {
      list.splice(0, list.length - max);
    }
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * Find a mark by name
   */
  findMark(name) {
    if (!this.currentSession) return null;
    return this.currentSession.marks.find(m => m.name === name);
  }

  /**
   * Get all measurements
   */
  getMeasurements(filter = {}) {
    let results = [...this.measurements];

    if (filter.componentName) {
      results = results.filter(m => m.componentName === filter.componentName);
    }

    if (filter.slow) {
      results = results.filter(m => m.slow);
    }

    if (filter.minDuration) {
      results = results.filter(m => m.duration >= filter.minDuration);
    }

    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Analyze a session
   */
  analyzeSession(session) {
    const measurements = session.measurements;

    if (measurements.length === 0) {
      return {
        session: session.id,
        duration: session.duration,
        measurements: 0,
        analysis: null
      };
    }

    const durations = measurements.map(m => m.duration);
    const sorted = [...durations].sort((a, b) => a - b);

    return {
      session: session.id,
      name: session.name,
      duration: session.duration,
      measurements: measurements.length,
      analysis: {
        total: durations.reduce((a, b) => a + b, 0),
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        median: sorted[Math.floor(sorted.length / 2)],
        min: Math.min(...durations),
        max: Math.max(...durations),
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
        slowRenders: measurements.filter(m => m.slow).length,
        slowPercentage: (measurements.filter(m => m.slow).length / measurements.length) * 100
      },
      byComponent: this.groupByComponent(measurements),
      slowest: measurements
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map(m => ({
          component: m.componentName,
          duration: m.duration,
          timestamp: m.startTime
        }))
    };
  }

  /**
   * Group measurements by component
   */
  groupByComponent(measurements) {
    const groups = {};

    measurements.forEach(m => {
      if (!groups[m.componentName]) {
        groups[m.componentName] = {
          count: 0,
          totalDuration: 0,
          durations: []
        };
      }

      groups[m.componentName].count++;
      groups[m.componentName].totalDuration += m.duration;
      groups[m.componentName].durations.push(m.duration);
    });

    // Calculate stats for each component
    Object.keys(groups).forEach(name => {
      const group = groups[name];
      group.average = group.totalDuration / group.count;
      group.min = Math.min(...group.durations);
      group.max = Math.max(...group.durations);
    });

    return groups;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const allMeasurements = this.measurements;

    if (allMeasurements.length === 0) {
      return {
        totalMeasurements: 0,
        totalSessions: this.sessions.size,
        analysis: null
      };
    }

    const durations = allMeasurements.map(m => m.duration);

    return {
      totalMeasurements: allMeasurements.length,
      totalSessions: this.sessions.size,
      slowRenders: allMeasurements.filter(m => m.slow).length,
      analysis: {
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        slowPercentage: (allMeasurements.filter(m => m.slow).length / allMeasurements.length) * 100
      },
      byComponent: this.groupByComponent(allMeasurements),
      recentSlow: allMeasurements
        .filter(m => m.slow)
        .slice(-10)
        .map(m => ({
          component: m.componentName,
          duration: m.duration,
          timestamp: m.startTime
        }))
    };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    if (this.measurements.length === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }

    const durations = this.measurements.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const mean = sum / durations.length;
    
    const sorted = [...durations].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const variance = durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median,
      min: Math.min(...durations),
      max: Math.max(...durations),
      stdDev
    };
  }

  /**
   * Get bottlenecks
   */
  getBottlenecks(threshold = null) {
    const slowThreshold = threshold || this.options.slowThreshold;
    return this.measurements
      .filter(m => m.duration > slowThreshold)
      .sort((a, b) => b.duration - a.duration)
      .map(m => ({
        name: m.name,
        duration: m.duration,
        timestamp: m.startTime
      }));
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const operationCounts = {};
    this.measurements.forEach(m => {
      operationCounts[m.name] = (operationCounts[m.name] || 0) + 1;
    });

    const totalDuration = this.measurements.reduce((sum, m) => sum + m.duration, 0);

    return {
      totalOperations: this.measurements.length,
      totalDuration,
      operationCounts,
      averageDuration: this.measurements.length > 0 ? totalDuration / this.measurements.length : 0,
      memoryUsage: this.options.trackMemory && typeof performance !== 'undefined' && performance.memory
        ? performance.memory.usedJSHeapSize
        : null
    };
  }

  /**
   * Generate report
   */
  generateReport() {
    const stats = this.getStatistics();
    const metrics = this.getMetrics();
    const bottlenecks = this.getBottlenecks();
    const recommendations = this.getRecommendations();

    return {
      summary: {
        totalOperations: metrics.totalOperations,
        averageDuration: metrics.averageDuration,
        slowOperations: bottlenecks.length
      },
      statistics: stats,
      operations: this.measurements.map(m => ({
        name: m.name,
        duration: m.duration,
        timestamp: m.startTime
      })),
      bottlenecks: bottlenecks.slice(0, 10),
      recommendations,
      timestamp: Date.now()
    };
  }

  /**
   * Export profiling data
   */
  export() {
    return {
      sessions: Array.from(this.sessions.values()),
      measurements: this.measurements,
      metrics: this.getMetrics(),
      statistics: this.getStatistics(),
      exportedAt: Date.now()
    };
  }

  /**
   * Format metrics for display
   */
  formatMetrics() {
    const metrics = this.getMetrics();
    const stats = this.getStatistics();
    
    let output = `Performance Metrics\n`;
    output += `==================\n`;
    output += `Total Operations: ${metrics.totalOperations}\n`;
    output += `Average Duration: ${metrics.averageDuration.toFixed(2)}ms\n`;
    output += `Mean: ${stats.mean.toFixed(2)}ms\n`;
    output += `Median: ${stats.median.toFixed(2)}ms\n`;
    output += `Min: ${stats.min.toFixed(2)}ms\n`;
    output += `Max: ${stats.max.toFixed(2)}ms\n`;
    
    return output;
  }

  /**
   * Compare two profiles
   */
  compare(profileId1, profileId2) {
    const session1 = this.sessions.get(profileId1);
    const session2 = this.sessions.get(profileId2);

    if (!session1 || !session2) {
      return null;
    }

    return {
      difference: session2.duration - session1.duration,
      percentChange: ((session2.duration - session1.duration) / session1.duration) * 100,
      profile1: { name: session1.name, duration: session1.duration },
      profile2: { name: session2.name, duration: session2.duration }
    };
  }

  /**
   * Get performance recommendations
   */
  getRecommendations() {
    const recommendations = [];
    const bottlenecks = this.getBottlenecks();
    const stats = this.getStatistics();

    if (bottlenecks.length > 0) {
      bottlenecks.slice(0, 5).forEach(bottleneck => {
        recommendations.push({
          type: 'bottleneck',
          operation: bottleneck.name,
          suggestion: `Optimize ${bottleneck.name} - duration: ${bottleneck.duration.toFixed(2)}ms exceeds threshold`,
          severity: 'high',
          message: `Found slow operation exceeding ${this.options.slowThreshold}ms`
        });
      });
    }

    if (stats.max > this.options.slowThreshold * 2) {
      recommendations.push({
        type: 'performance',
        operation: 'general',
        suggestion: `Review operations with high duration`,
        message: `Maximum duration (${stats.max.toFixed(2)}ms) is significantly high`,
        severity: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Clear all data
   */
  clear() {
    clearTimelineEntries([
      ...[...this.marks.keys()].map((id) => `coherent-render-start-${id}`),
      ...[...this.sessions.values()]
        .filter((session) => session.active)
        .map((session) => `coherent-session-start-${session.id}`)
    ]);
    this.measurements = [];
    this.sessions.clear();
    this.currentSession = null;
    this.marks.clear();
  }

  /**
   * Enable profiler
   */
  enable() {
    this.options.enabled = true;
  }

  /**
   * Disable profiler
   */
  disable() {
    this.options.enabled = false;
  }

  /**
   * Generate unique ID.
   *
   * Uses crypto.getRandomValues rather than Math.random: the ids key the
   * session and measurement maps, so a predictable suffix lets one caller
   * guess or collide with another's entry. getRandomValues is available in
   * Node 19+ and in browsers without requiring a secure context, unlike
   * randomUUID.
   *
   * @returns {string} A unique profiling id
   */
  generateId() {
    const bytes = new Uint8Array(8);
    globalThis.crypto.getRandomValues(bytes);
    const suffix = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `prof-${Date.now()}-${suffix}`;
  }
}

/**
 * Create a performance profiler
 */
export function createProfiler(options = {}) {
  return new PerformanceProfiler(options);
}

/**
 * Measure a function execution.
 *
 * Resolves with `{ value, duration }`. When `fn` throws, rejects with that
 * error (an Error — non-Error values are wrapped, with the original as
 * `cause`) carrying a `duration` property.
 */
export async function measure(name, fn, profiler = null) {
  // Measuring is the whole point of the call, so an ad-hoc profiler is enabled.
  const prof = profiler || new PerformanceProfiler({ enabled: true });
  const sessionId = prof.start(name);

  try {
    const value = await fn();
    const result = prof.stop(sessionId);
    return { value, duration: result?.duration || 0 };
  } catch (error) {
    const result = prof.stop(sessionId);
    const failure = error instanceof Error
      ? error
      : new Error(`${name} failed: ${String(error)}`, { cause: error });
    try {
      failure.duration = result?.duration || 0;
    } catch {
      // frozen error object: rethrow it as is
    }
    throw failure;
  }
}

/**
 * Wrap a function so every call is recorded as a render measurement.
 *
 * @param {Function} fn - Function to profile (sync or async).
 * @param {PerformanceProfiler|Object} [options] - A profiler, or
 *   `{ profiler, name }`. Without a profiler an enabled one is created;
 *   either way it is exposed as `wrapped.profiler`.
 * @returns {Function} The wrapper; it returns what `fn` returns.
 */
export function profile(fn, options = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('profile() expects a function');
  }
  const opts = options instanceof PerformanceProfiler ? { profiler: options } : options;
  const profiler = opts.profiler || new PerformanceProfiler({ enabled: true });
  const name = opts.name || fn.name || 'anonymous';

  function profiled(...args) {
    const id = profiler.startRender(name);
    let result;
    try {
      result = fn.apply(this, args);
    } catch (error) {
      profiler.endRender(id, { error: true });
      throw error;
    }
    if (result && typeof result.then === 'function') {
      return Promise.resolve(result).then(
        (value) => {
          profiler.endRender(id);
          return value;
        },
        (error) => {
          profiler.endRender(id, { error: true });
          throw error;
        }
      );
    }
    profiler.endRender(id);
    return result;
  }

  Object.defineProperty(profiled, 'name', { value: name });
  profiled.profiler = profiler;
  return profiled;
}

export default {
  PerformanceProfiler,
  createProfiler,
  measure,
  profile
};
