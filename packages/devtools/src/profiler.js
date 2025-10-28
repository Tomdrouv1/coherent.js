/**
 * Coherent.js Performance Profiler
 * 
 * Tracks and analyzes rendering performance
 * 
 * @module devtools/profiler
 */

/**
 * Performance Profiler
 * Measures and analyzes component rendering performance
 */
export class PerformanceProfiler {
  constructor(options = {}) {
    this.options = {
      enabled: true,
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
      startTime: Date.now(),
      measurements: [],
      marks: [],
      active: true
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;

    if (typeof performance !== 'undefined' && performance.mark) {
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

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.active = false;

    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`coherent-session-end-${session.id}`);
    }

    if (this.currentSession === session) {
      this.currentSession = null;
    }

    // Store measurement
    this.measurements.push(session);
    
    // Limit measurements (maxSamples)
    if (this.measurements.length > this.options.maxSamples) {
      this.measurements.shift();
    }

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
      startTime: Date.now(),
      startMemory: this.getMemoryUsage(),
      phase: 'render'
    };

    this.marks.set(measurementId, measurement);

    if (typeof performance !== 'undefined' && performance.mark) {
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
    measurement.endTime = Date.now();
    measurement.duration = measurement.endTime - measurement.startTime;
    measurement.endMemory = this.getMemoryUsage();
    measurement.memoryDelta = measurement.endMemory - measurement.startMemory;
    measurement.result = result;
    measurement.slow = measurement.duration > this.options.slowThreshold;

    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`coherent-render-end-${measurementId}`);
      
      if (performance.measure) {
        try {
          performance.measure(
            `coherent-render-${measurementId}`,
            `coherent-render-start-${measurementId}`,
            `coherent-render-end-${measurementId}`
          );
        } catch {
          // Ignore measure errors
        }
      }
    }

    // Add to measurements
    this.measurements.push(measurement);
    
    // Add to current session
    if (this.currentSession) {
      this.currentSession.measurements.push(measurement);
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
      timestamp: Date.now(),
      data,
      memory: this.getMemoryUsage()
    };

    if (this.currentSession) {
      this.currentSession.marks.push(mark);
    }

    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`coherent-mark-${name}`);
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
   * Generate unique ID
   */
  generateId() {
    return `prof-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Create a performance profiler
 */
export function createProfiler(options = {}) {
  return new PerformanceProfiler(options);
}

/**
 * Measure a function execution
 */
export async function measure(name, fn, profiler = null) {
  const prof = profiler || new PerformanceProfiler();
  const sessionId = prof.start(name);
  
  try {
    const value = await fn();
    const result = prof.stop(sessionId);
    return { value, duration: result?.duration || 0 };
  } catch (error) {
    const result = prof.stop(sessionId);
    throw { error, duration: result?.duration || 0 };
  }
}

/**
 * Create a profiling decorator
 */
export function profile(fn) {
  return function(...args) {
    const result = fn(...args);
    return result;
  };
}

export default {
  PerformanceProfiler,
  createProfiler,
  measure,
  profile
};
