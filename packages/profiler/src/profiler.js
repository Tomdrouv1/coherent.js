/**
 * Performance Profiler for Coherent.js
 */

export class PerformanceProfiler {
  constructor(options = {}) {
    this.options = {
      enableMetrics: true,
      enableTracing: true,
      sampleRate: 1.0,
      ...options
    };
    this.metrics = new Map();
    this.traces = [];
  }

  startProfiling(name) {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        this.recordMetric(name, duration);
        return duration;
      }
    };
  }

  recordMetric(name, value, tags = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push({
      value,
      timestamp: Date.now(),
      tags
    });
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  reset() {
    this.metrics.clear();
    this.traces = [];
  }
}