/**
 * Metrics Collector for Performance Profiler
 */

export class MetricsCollector {
  constructor(options = {}) {
    this.options = options;
    this.collectors = new Map();
  }

  addCollector(name, collector) {
    this.collectors.set(name, collector);
  }

  async collect() {
    const results = {};
    for (const [name, collector] of this.collectors) {
      try {
        results[name] = await collector.collect();
      } catch (error) {
        results[name] = { error: error.message };
      }
    }
    return results;
  }

  createRenderingCollector() {
    return {
      collect: () => ({
        renderCount: 0,
        averageRenderTime: 0,
        slowestRender: 0
      })
    };
  }
}