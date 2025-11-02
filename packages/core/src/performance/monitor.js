/**
 * Enhanced Performance Monitoring System
 *
 * Provides comprehensive performance monitoring with:
 * - Custom metrics
 * - Sampling strategies
 * - Automated reporting
 * - Alert rules
 * - Resource monitoring
 * - Performance budgets
 */

/**
 * Create an enhanced performance monitor
 *
 * @param {Object} options - Configuration options
 * @param {boolean} [options.enabled=true] - Enable monitoring
 * @param {Object} [options.metrics] - Custom metrics configuration
 * @param {Object} [options.sampling] - Sampling strategy configuration
 * @param {Object} [options.reporting] - Automated reporting configuration
 * @param {Object} [options.alerts] - Alert rules configuration
 * @param {Object} [options.resources] - Resource monitoring configuration
 * @param {Object} [options.profiling] - Profiling configuration
 * @returns {Object} Enhanced performance monitor instance
 */
export function createPerformanceMonitor(options = {}) {
  const opts = {
    enabled: true,
    metrics: {
      custom: {}
    },
    sampling: {
      enabled: false,
      rate: 1.0,
      strategy: 'random'
    },
    reporting: {
      enabled: false,
      interval: 60000,
      format: 'json',
      batch: {
        enabled: false,
        maxSize: 100,
        flushInterval: 5000
      },
      onReport: null
    },
    alerts: {
      enabled: true,
      rules: []
    },
    resources: {
      enabled: false,
      track: ['memory'],
      interval: 1000
    },
    profiling: {
      enabled: false,
      mode: 'production',
      flamegraph: false,
      tracing: {
        enabled: false,
        sampleRate: 0.01
      }
    },
    ...options
  };

  // Ensure nested defaults are preserved
  opts.reporting.batch = {
    enabled: false,
    maxSize: 100,
    flushInterval: 5000,
    ...(options.reporting?.batch || {})
  };

  // Metrics storage
  const metrics = {
    builtin: {
      renderTime: { type: 'histogram', unit: 'ms', values: [] },
      componentCount: { type: 'counter', unit: 'renders', value: 0 },
      errorCount: { type: 'counter', unit: 'errors', value: 0 },
      memoryUsage: { type: 'gauge', unit: 'MB', values: [] }
    },
    custom: {}
  };

  // Initialize custom metrics
  Object.entries(opts.metrics.custom).forEach(([name, config]) => {
    metrics.custom[name] = {
      type: config.type || 'counter',
      unit: config.unit || '',
      threshold: config.threshold,
      values: config.type === 'histogram' ? [] : undefined,
      value: config.type === 'counter' || config.type === 'gauge' ? 0 : undefined
    };
  });

  // Sampling state
  const samplingState = {
    count: 0,
    sampled: 0,
    adaptiveRate: opts.sampling.rate
  };

  // Reporting state
  const reportingState = {
    batch: [],
    lastReport: Date.now(),
    reportTimer: null,
    flushTimer: null
  };

  // Alert state
  const alertState = {
    triggered: new Map(),
    history: []
  };

  // Resource monitoring state
  const resourceState = {
    samples: [],
    timer: null
  };

  // Profiling state
  const profilingState = {
    traces: [],
    flamegraphData: []
  };

  // Statistics
  const stats = {
    metricsRecorded: 0,
    sampleRate: opts.sampling.rate,
    reportsGenerated: 0,
    alertsTriggered: 0
  };

  /**
   * Check if event should be sampled
   */
  function shouldSample() {
    if (!opts.sampling.enabled) return true;

    samplingState.count++;

    if (opts.sampling.strategy === 'random') {
      return Math.random() < samplingState.adaptiveRate;
    } else if (opts.sampling.strategy === 'deterministic') {
      return samplingState.count % Math.ceil(1 / samplingState.adaptiveRate) === 0;
    } else if (opts.sampling.strategy === 'adaptive') {
      // Adaptive sampling based on recent metric values
      const recentRenderTimes = metrics.builtin.renderTime.values.slice(-10);
      if (recentRenderTimes.length > 0) {
        const avgTime = recentRenderTimes.reduce((a, b) => a + b, 0) / recentRenderTimes.length;
        // Sample more when performance is poor
        samplingState.adaptiveRate = avgTime > 16 ? Math.min(1.0, opts.sampling.rate * 2) : opts.sampling.rate;
      }
      return Math.random() < samplingState.adaptiveRate;
    }

    return true;
  }

  /**
   * Record a metric value
   */
  function recordMetric(name, value, metadata = {}) {
    if (!opts.enabled) return;
    if (!shouldSample()) return;

    stats.metricsRecorded++;

    // Check if it's a built-in metric
    const builtinMetric = metrics.builtin[name];
    if (builtinMetric) {
      if (builtinMetric.type === 'histogram') {
        builtinMetric.values.push(value);
        if (builtinMetric.values.length > 1000) {
          builtinMetric.values = builtinMetric.values.slice(-1000);
        }
      } else if (builtinMetric.type === 'counter') {
        builtinMetric.value += value;
      } else if (builtinMetric.type === 'gauge') {
        builtinMetric.values.push(value);
        if (builtinMetric.values.length > 100) {
          builtinMetric.values = builtinMetric.values.slice(-100);
        }
      }
    }

    // Check if it's a custom metric
    const customMetric = metrics.custom[name];
    if (customMetric) {
      if (customMetric.type === 'histogram') {
        customMetric.values = customMetric.values || [];
        customMetric.values.push(value);
        if (customMetric.values.length > 1000) {
          customMetric.values = customMetric.values.slice(-1000);
        }
      } else if (customMetric.type === 'counter') {
        customMetric.value = (customMetric.value || 0) + value;
      } else if (customMetric.type === 'gauge') {
        customMetric.values = customMetric.values || [];
        customMetric.values.push(value);
        if (customMetric.values.length > 100) {
          customMetric.values = customMetric.values.slice(-100);
        }
      }

      // Check threshold
      if (customMetric.threshold) {
        const currentValue = customMetric.type === 'histogram' || customMetric.type === 'gauge'
          ? customMetric.values[customMetric.values.length - 1]
          : customMetric.value;

        if (currentValue > customMetric.threshold) {
          checkAlerts(name, currentValue);
        }
      }
    }

    // Add to batch if enabled
    if (opts.reporting.enabled && opts.reporting.batch.enabled) {
      reportingState.batch.push({
        metric: name,
        value,
        metadata,
        timestamp: Date.now()
      });

      if (reportingState.batch.length >= opts.reporting.batch.maxSize) {
        flushBatch();
      }
    }

    // Check alerts
    checkAlerts(name, value);
  }

  /**
   * Check alert rules
   */
  function checkAlerts(metric, value) {
    if (!opts.alerts.enabled) return;

    opts.alerts.rules.forEach(rule => {
      if (rule.metric !== metric) return;

      let triggered = false;

      if (rule.condition === 'exceeds' && value > rule.threshold) {
        triggered = true;
      } else if (rule.condition === 'below' && value < rule.threshold) {
        triggered = true;
      } else if (rule.condition === 'equals' && value === rule.threshold) {
        triggered = true;
      }

      if (triggered) {
        const alertKey = `${rule.metric}-${rule.condition}-${rule.threshold}`;
        const lastTriggered = alertState.triggered.get(alertKey);
        const now = Date.now();

        // Debounce alerts (don't trigger same alert within 5 seconds)
        if (!lastTriggered || now - lastTriggered > 5000) {
          alertState.triggered.set(alertKey, now);
          alertState.history.push({
            rule,
            value,
            timestamp: now
          });
          stats.alertsTriggered++;

          if (rule.action) {
            rule.action(value, rule);
          }
        }
      }
    });
  }

  /**
   * Flush batch of metrics
   */
  function flushBatch() {
    if (reportingState.batch.length === 0) return;

    const batch = [...reportingState.batch];
    reportingState.batch = [];

    if (opts.reporting.onReport) {
      opts.reporting.onReport({ type: 'batch', data: batch });
    }
  }

  /**
   * Generate a performance report
   */
  function generateReport() {
    const report = {
      timestamp: Date.now(),
      statistics: { ...stats },
      metrics: {}
    };

    // Built-in metrics
    Object.entries(metrics.builtin).forEach(([name, metric]) => {
      if (metric.type === 'histogram') {
        report.metrics[name] = {
          type: 'histogram',
          unit: metric.unit,
          count: metric.values.length,
          min: metric.values.length > 0 ? Math.min(...metric.values) : 0,
          max: metric.values.length > 0 ? Math.max(...metric.values) : 0,
          avg: metric.values.length > 0
            ? metric.values.reduce((a, b) => a + b, 0) / metric.values.length
            : 0,
          p50: percentile(metric.values, 0.5),
          p95: percentile(metric.values, 0.95),
          p99: percentile(metric.values, 0.99)
        };
      } else if (metric.type === 'counter') {
        report.metrics[name] = {
          type: 'counter',
          unit: metric.unit,
          value: metric.value
        };
      } else if (metric.type === 'gauge') {
        report.metrics[name] = {
          type: 'gauge',
          unit: metric.unit,
          current: metric.values.length > 0 ? metric.values[metric.values.length - 1] : 0,
          avg: metric.values.length > 0
            ? metric.values.reduce((a, b) => a + b, 0) / metric.values.length
            : 0
        };
      }
    });

    // Custom metrics
    Object.entries(metrics.custom).forEach(([name, metric]) => {
      if (metric.type === 'histogram') {
        report.metrics[name] = {
          type: 'histogram',
          unit: metric.unit,
          count: metric.values?.length || 0,
          min: metric.values?.length > 0 ? Math.min(...metric.values) : 0,
          max: metric.values?.length > 0 ? Math.max(...metric.values) : 0,
          avg: metric.values?.length > 0
            ? metric.values.reduce((a, b) => a + b, 0) / metric.values.length
            : 0,
          p95: percentile(metric.values || [], 0.95),
          p99: percentile(metric.values || [], 0.99)
        };
      } else if (metric.type === 'counter') {
        report.metrics[name] = {
          type: 'counter',
          unit: metric.unit,
          value: metric.value || 0
        };
      } else if (metric.type === 'gauge') {
        report.metrics[name] = {
          type: 'gauge',
          unit: metric.unit,
          current: metric.values?.length > 0 ? metric.values[metric.values.length - 1] : 0,
          avg: metric.values?.length > 0
            ? metric.values.reduce((a, b) => a + b, 0) / metric.values.length
            : 0
        };
      }
    });

    // Alerts
    report.alerts = {
      total: alertState.history.length,
      recent: alertState.history.slice(-10)
    };

    // Resources
    if (opts.resources.enabled) {
      report.resources = {
        samples: resourceState.samples.slice(-20)
      };
    }

    stats.reportsGenerated++;

    if (opts.reporting.onReport) {
      opts.reporting.onReport({ type: 'report', data: report });
    }

    return report;
  }

  /**
   * Calculate percentile
   */
  function percentile(values, p) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Start resource monitoring
   */
  function startResourceMonitoring() {
    if (!opts.resources.enabled) return;

    const collectResources = () => {
      const sample = {
        timestamp: Date.now()
      };

      if (opts.resources.track.includes('memory')) {
        if (typeof process !== 'undefined' && process.memoryUsage) {
          const mem = process.memoryUsage();
          sample.memory = {
            heapUsed: mem.heapUsed / 1024 / 1024,
            heapTotal: mem.heapTotal / 1024 / 1024,
            external: mem.external / 1024 / 1024,
            rss: mem.rss / 1024 / 1024
          };
        } else if (typeof performance !== 'undefined' && performance.memory) {
          sample.memory = {
            heapUsed: performance.memory.usedJSHeapSize / 1024 / 1024,
            heapTotal: performance.memory.totalJSHeapSize / 1024 / 1024
          };
        }
      }

      resourceState.samples.push(sample);
      if (resourceState.samples.length > 100) {
        resourceState.samples = resourceState.samples.slice(-100);
      }

      resourceState.timer = setTimeout(collectResources, opts.resources.interval);
    };

    collectResources();
  }

  /**
   * Stop resource monitoring
   */
  function stopResourceMonitoring() {
    if (resourceState.timer) {
      clearTimeout(resourceState.timer);
      resourceState.timer = null;
    }
  }

  /**
   * Start automated reporting
   */
  function startReporting() {
    if (!opts.reporting.enabled) return;

    reportingState.reportTimer = setInterval(() => {
      generateReport();
    }, opts.reporting.interval);

    if (opts.reporting.batch.enabled) {
      reportingState.flushTimer = setInterval(() => {
        flushBatch();
      }, opts.reporting.batch.flushInterval);
    }
  }

  /**
   * Stop automated reporting
   */
  function stopReporting() {
    if (reportingState.reportTimer) {
      clearInterval(reportingState.reportTimer);
      reportingState.reportTimer = null;
    }
    if (reportingState.flushTimer) {
      clearInterval(reportingState.flushTimer);
      reportingState.flushTimer = null;
    }
    flushBatch(); // Flush remaining batch
  }

  /**
   * Start profiling
   */
  function startProfiling() {
    if (!opts.profiling.enabled) return;
    // Profiling implementation would hook into render pipeline
  }

  /**
   * Record a trace
   */
  function recordTrace(name, duration, metadata = {}) {
    if (!opts.profiling.enabled || !opts.profiling.tracing.enabled) return;

    if (Math.random() < opts.profiling.tracing.sampleRate) {
      profilingState.traces.push({
        name,
        duration,
        metadata,
        timestamp: Date.now()
      });

      if (profilingState.traces.length > 1000) {
        profilingState.traces = profilingState.traces.slice(-1000);
      }
    }
  }

  /**
   * Measure execution time
   */
  function measure(name, fn, metadata = {}) {
    if (!opts.enabled) return fn();

    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;

      recordMetric('renderTime', duration, { name, ...metadata });
      recordTrace(name, duration, metadata);

      return result;
    } catch (error) {
      recordMetric('errorCount', 1, { name, error: error.message });
      throw error;
    }
  }

  /**
   * Measure async execution time
   */
  async function measureAsync(name, fn, metadata = {}) {
    if (!opts.enabled) return fn();

    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;

      recordMetric('renderTime', duration, { name, ...metadata });
      recordTrace(name, duration, metadata);

      return result;
    } catch (error) {
      recordMetric('errorCount', 1, { name, error: error.message });
      throw error;
    }
  }

  /**
   * Add a custom metric
   */
  function addMetric(name, config) {
    metrics.custom[name] = {
      type: config.type || 'counter',
      unit: config.unit || '',
      threshold: config.threshold,
      values: config.type === 'histogram' ? [] : undefined,
      value: config.type === 'counter' || config.type === 'gauge' ? 0 : undefined
    };
  }

  /**
   * Add an alert rule
   */
  function addAlertRule(rule) {
    opts.alerts.rules.push(rule);
  }

  /**
   * Get current statistics
   */
  function getStats() {
    return {
      ...stats,
      sampleRate: samplingState.adaptiveRate,
      batchSize: reportingState.batch.length,
      resourceSamples: resourceState.samples.length,
      traces: profilingState.traces.length,
      alerts: {
        total: alertState.history.length,
        unique: alertState.triggered.size
      }
    };
  }

  /**
   * Reset all metrics
   */
  function reset() {
    // Reset built-in metrics
    Object.values(metrics.builtin).forEach(metric => {
      if (metric.type === 'histogram' || metric.type === 'gauge') {
        metric.values = [];
      } else if (metric.type === 'counter') {
        metric.value = 0;
      }
    });

    // Reset custom metrics
    Object.values(metrics.custom).forEach(metric => {
      if (metric.type === 'histogram' || metric.type === 'gauge') {
        metric.values = [];
      } else if (metric.type === 'counter') {
        metric.value = 0;
      }
    });

    // Reset state
    samplingState.count = 0;
    samplingState.sampled = 0;
    reportingState.batch = [];
    alertState.history = [];
    alertState.triggered.clear();
    resourceState.samples = [];
    profilingState.traces = [];

    // Reset stats
    stats.metricsRecorded = 0;
    stats.reportsGenerated = 0;
    stats.alertsTriggered = 0;
  }

  // Start monitoring
  if (opts.enabled) {
    startResourceMonitoring();
    startReporting();
    startProfiling();
  }

  return {
    recordMetric,
    measure,
    measureAsync,
    addMetric,
    addAlertRule,
    generateReport,
    getStats,
    reset,
    start() {
      opts.enabled = true;
      startResourceMonitoring();
      startReporting();
      startProfiling();
    },
    stop() {
      opts.enabled = false;
      stopResourceMonitoring();
      stopReporting();
      return generateReport();
    }
  };
}

// Export default instance
export const performanceMonitor = createPerformanceMonitor();
