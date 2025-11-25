/**
 * Performance Insights Dashboard for Coherent.js
 *
 * Provides real-time performance metrics and insights for:
 * - API routing performance (smart routing, LRU cache)
 * - Component rendering performance (caching, optimization)
 * - Full-stack request flow analysis
 *
 * @module PerformanceDashboard
 */

export class PerformanceDashboard {
  constructor(options = {}) {
    this.options = {
      updateInterval: options.updateInterval || 5000,
      maxHistoryPoints: options.maxHistoryPoints || 100,
      enableAlerts: options.enableAlerts !== false,
      enableRecommendations: options.enableRecommendations !== false,
      colorOutput: options.colorOutput !== false,
      ...options
    };

    this.metrics = {
      api: {
        requests: 0,
        averageTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        staticRoutes: 0,
        dynamicRoutes: 0,
        history: []
      },
      components: {
        renders: 0,
        averageTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        staticComponents: 0,
        dynamicComponents: 0,
        memoryUsage: 0,
        history: []
      },
      fullstack: {
        totalRequests: 0,
        averageTime: 0,
        errors: 0,
        bottlenecks: [],
        history: []
      }
    };

    this.alerts = [];
    this.recommendations = [];
    this.startTime = Date.now();
    this.updateTimer = null;
  }

  /**
   * Start monitoring performance
   */
  startMonitoring() {
    if (this.updateTimer) return;

    this.updateTimer = setInterval(() => {
      this.updateMetrics();
      this.generateAlerts();
      this.generateRecommendations();
    }, this.options.updateInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Record API request metrics
   */
  recordAPIRequest(duration, routeType, cacheHit = false) {
    this.metrics.api.requests++;
    this.metrics.api.averageTime = this.updateAverage(
      this.metrics.api.averageTime,
      duration,
      this.metrics.api.requests
    );

    if (cacheHit) {
      this.metrics.api.cacheHits++;
    } else {
      this.metrics.api.cacheMisses++;
    }

    if (routeType === 'static') {
      this.metrics.api.staticRoutes++;
    } else {
      this.metrics.api.dynamicRoutes++;
    }

    this.addToHistory('api', {
      timestamp: Date.now(),
      duration,
      routeType,
      cacheHit
    });
  }

  /**
   * Record component render metrics
   */
  recordComponentRender(duration, componentType, cacheHit = false, memoryDelta = 0) {
    this.metrics.components.renders++;
    this.metrics.components.averageTime = this.updateAverage(
      this.metrics.components.averageTime,
      duration,
      this.metrics.components.renders
    );

    if (cacheHit) {
      this.metrics.components.cacheHits++;
    } else {
      this.metrics.components.cacheMisses++;
    }

    if (componentType === 'static') {
      this.metrics.components.staticComponents++;
    } else {
      this.metrics.components.dynamicComponents++;
    }

    this.metrics.components.memoryUsage += memoryDelta;

    this.addToHistory('components', {
      timestamp: Date.now(),
      duration,
      componentType,
      cacheHit,
      memoryDelta
    });
  }

  /**
   * Record full-stack request metrics
   */
  recordFullStackRequest(duration, error = null, bottlenecks = []) {
    this.metrics.fullstack.totalRequests++;
    this.metrics.fullstack.averageTime = this.updateAverage(
      this.metrics.fullstack.averageTime,
      duration,
      this.metrics.fullstack.totalRequests
    );

    if (error) {
      this.metrics.fullstack.errors++;
    }

    this.metrics.fullstack.bottlenecks = bottlenecks;

    this.addToHistory('fullstack', {
      timestamp: Date.now(),
      duration,
      error,
      bottlenecks
    });
  }

  /**
   * Update metrics from external sources
   */
  updateMetrics() {
    // This would integrate with actual performance monitors
    // For now, we'll simulate some metrics updates
    const now = Date.now();
    const uptime = now - this.startTime;

    // Calculate rates
    const apiRate = this.metrics.api.requests / (uptime / 1000);
    const componentRate = this.metrics.components.renders / (uptime / 1000);
    const fullStackRate = this.metrics.fullstack.totalRequests / (uptime / 1000);

    return {
      apiRate,
      componentRate,
      fullStackRate,
      uptime
    };
  }

  /**
   * Generate performance alerts
   */
  generateAlerts() {
    this.alerts = [];

    // API performance alerts
    if (this.metrics.api.averageTime > 50) {
      this.alerts.push({
        type: 'warning',
        category: 'api',
        message: `API response time is high: ${this.metrics.api.averageTime.toFixed(2)}ms`,
        threshold: 50,
        current: this.metrics.api.averageTime
      });
    }

    const apiCacheHitRate = this.getCacheHitRate('api');
    if (apiCacheHitRate < 80) {
      this.alerts.push({
        type: 'warning',
        category: 'api',
        message: `API cache hit rate is low: ${apiCacheHitRate.toFixed(1)}%`,
        threshold: 80,
        current: apiCacheHitRate
      });
    }

    // Component performance alerts
    if (this.metrics.components.averageTime > 20) {
      this.alerts.push({
        type: 'warning',
        category: 'components',
        message: `Component render time is high: ${this.metrics.components.averageTime.toFixed(2)}ms`,
        threshold: 20,
        current: this.metrics.components.averageTime
      });
    }

    const componentCacheHitRate = this.getCacheHitRate('components');
    if (componentCacheHitRate < 90) {
      this.alerts.push({
        type: 'warning',
        category: 'components',
        message: `Component cache hit rate is low: ${componentCacheHitRate.toFixed(1)}%`,
        threshold: 90,
        current: componentCacheHitRate
      });
    }

    // Full-stack alerts
    if (this.metrics.fullstack.errors > 0) {
      this.alerts.push({
        type: 'error',
        category: 'fullstack',
        message: `${this.metrics.fullstack.errors} errors detected`,
        threshold: 0,
        current: this.metrics.fullstack.errors
      });
    }
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    this.recommendations = [];

    // API recommendations
    const staticRouteRatio = this.metrics.api.staticRoutes / Math.max(this.metrics.api.requests, 1);
    if (staticRouteRatio < 0.7) {
      this.recommendations.push({
        type: 'optimization',
        category: 'api',
        message: 'Consider adding more static routes to improve smart routing efficiency',
        impact: 'high',
        effort: 'low'
      });
    }

    const apiCacheHitRate = this.getCacheHitRate('api');
    if (apiCacheHitRate < 90) {
      this.recommendations.push({
        type: 'optimization',
        category: 'api',
        message: 'Increase API cache size or TTL to improve cache hit rate',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Component recommendations
    const staticComponentRatio = this.metrics.components.staticComponents / Math.max(this.metrics.components.renders, 1);
    if (staticComponentRatio < 0.8) {
      this.recommendations.push({
        type: 'optimization',
        category: 'components',
        message: 'More components could be optimized as static for better caching',
        impact: 'high',
        effort: 'medium'
      });
    }

    // Memory recommendations
    if (this.metrics.components.memoryUsage > 100 * 1024 * 1024) { // 100MB
      this.recommendations.push({
        type: 'optimization',
        category: 'memory',
        message: 'Memory usage is high. Consider reducing cache size or implementing memory cleanup',
        impact: 'medium',
        effort: 'medium'
      });
    }
  }

  /**
   * Get cache hit rate for category
   */
  getCacheHitRate(category) {
    const metrics = this.metrics[category];
    if (!metrics || !metrics.cacheHits) return 0;

    const total = metrics.cacheHits + metrics.cacheMisses;
    return total > 0 ? (metrics.cacheHits / total) * 100 : 0;
  }

  /**
   * Update running average
   */
  updateAverage(current, newValue, count) {
    return ((current * (count - 1)) + newValue) / count;
  }

  /**
   * Add data point to history
   */
  addToHistory(category, data) {
    if (!this.metrics[category].history) {
      this.metrics[category].history = [];
    }

    this.metrics[category].history.push(data);

    // Limit history size
    if (this.metrics[category].history.length > this.options.maxHistoryPoints) {
      this.metrics[category].history = this.metrics[category].history.slice(-this.options.maxHistoryPoints);
    }
  }

  /**
   * Generate dashboard visualization
   */
  generateDashboard() {
    const lines = [];

    if (this.options.colorOutput) {
      lines.push(this.colorize('📊 Coherent.js Performance Dashboard', 'cyan'));
      lines.push(this.colorize('═'.repeat(50), 'cyan'));
    } else {
      lines.push('📊 Coherent.js Performance Dashboard');
      lines.push('═'.repeat(50));
    }

    const uptime = (Date.now() - this.startTime) / 1000;
    lines.push(`⏱️  Uptime: ${uptime.toFixed(1)}s`);
    lines.push('');

    // API Performance Section
    lines.push('🚀 API Performance');
    lines.push('─'.repeat(20));
    const apiCacheHitRate = this.getCacheHitRate('api');
    lines.push(`   Requests: ${this.metrics.api.requests} (${(this.metrics.api.requests / uptime).toFixed(1)} req/s)`);
    lines.push(`   Avg Time: ${this.metrics.api.averageTime.toFixed(2)}ms`);
    lines.push(`   Cache Hit Rate: ${apiCacheHitRate.toFixed(1)}%`);
    lines.push(`   Static Routes: ${this.metrics.api.staticRoutes}/${this.metrics.api.requests} (${((this.metrics.api.staticRoutes / Math.max(this.metrics.api.requests, 1)) * 100).toFixed(1)}%)`);
    lines.push('');

    // Component Performance Section
    lines.push('🏗️  Component Performance');
    lines.push('─'.repeat(25));
    const componentCacheHitRate = this.getCacheHitRate('components');
    lines.push(`   Renders: ${this.metrics.components.renders} (${(this.metrics.components.renders / uptime).toFixed(1)} renders/s)`);
    lines.push(`   Avg Time: ${this.metrics.components.averageTime.toFixed(2)}ms`);
    lines.push(`   Cache Hit Rate: ${componentCacheHitRate.toFixed(1)}%`);
    lines.push(`   Static Components: ${this.metrics.components.staticComponents}/${this.metrics.components.renders} (${((this.metrics.components.staticComponents / Math.max(this.metrics.components.renders, 1)) * 100).toFixed(1)}%)`);
    lines.push(`   Memory Usage: ${(this.metrics.components.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    lines.push('');

    // Full-Stack Performance Section
    lines.push('🌐 Full-Stack Performance');
    lines.push('─'.repeat(26));
    lines.push(`   Total Requests: ${this.metrics.fullstack.totalRequests} (${(this.metrics.fullstack.totalRequests / uptime).toFixed(1)} req/s)`);
    lines.push(`   Avg Time: ${this.metrics.fullstack.averageTime.toFixed(2)}ms`);
    lines.push(`   Errors: ${this.metrics.fullstack.errors}`);
    lines.push('');

    // Alerts Section
    if (this.alerts.length > 0) {
      lines.push('⚠️  Performance Alerts');
      lines.push('─'.repeat(22));
      this.alerts.forEach(alert => {
        const icon = alert.type === 'error' ? '❌' : '⚠️';
        lines.push(`   ${icon} ${alert.message}`);
      });
      lines.push('');
    }

    // Recommendations Section
    if (this.recommendations.length > 0) {
      lines.push('💡 Optimization Recommendations');
      lines.push('─'.repeat(30));
      this.recommendations.forEach(rec => {
        const impact = rec.impact === 'high' ? '🔥' : rec.impact === 'medium' ? '⚡' : '💤';
        lines.push(`   ${impact} ${rec.message} (${rec.effort} effort)`);
      });
      lines.push('');
    }

    // Performance Score
    const score = this.calculatePerformanceScore();
    const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
    lines.push(`Performance Score: ${this.colorize(`${score.toFixed(1)}/100`, scoreColor)}`);

    return lines.join('\n');
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore() {
    let score = 100;

    // API performance factors
    if (this.metrics.api.averageTime > 50) score -= 10;
    if (this.metrics.api.averageTime > 100) score -= 10;
    if (this.getCacheHitRate('api') < 90) score -= 10;

    // Component performance factors
    if (this.metrics.components.averageTime > 20) score -= 10;
    if (this.metrics.components.averageTime > 50) score -= 10;
    if (this.getCacheHitRate('components') < 95) score -= 10;

    // Error penalty
    if (this.metrics.fullstack.errors > 0) score -= Math.min(20, this.metrics.fullstack.errors * 5);

    return Math.max(0, score);
  }

  /**
   * Add color to text
   */
  colorize(text, color) {
    if (!this.options.colorOutput) return text;

    const colors = {
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m'
    };

    const reset = '\x1b[0m';
    return `${colors[color] || ''}${text}${reset}`;
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics() {
    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      metrics: { ...this.metrics },
      alerts: [...this.alerts],
      recommendations: [...this.recommendations],
      performanceScore: this.calculatePerformanceScore()
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      api: { requests: 0, averageTime: 0, cacheHits: 0, cacheMisses: 0, staticRoutes: 0, dynamicRoutes: 0, history: [] },
      components: { renders: 0, averageTime: 0, cacheHits: 0, cacheMisses: 0, staticComponents: 0, dynamicComponents: 0, memoryUsage: 0, history: [] },
      fullstack: { totalRequests: 0, averageTime: 0, errors: 0, bottlenecks: [], history: [] }
    };
    this.alerts = [];
    this.recommendations = [];
    this.startTime = Date.now();
  }
}

/**
 * Create a performance dashboard
 */
export function createPerformanceDashboard(options = {}) {
  return new PerformanceDashboard(options);
}

/**
 * Get dashboard and print to console
 */
export function showPerformanceDashboard(dashboard) {
  const output = dashboard.generateDashboard();
  console.log(output);
  return dashboard;
}

export default {
  PerformanceDashboard,
  createPerformanceDashboard,
  showPerformanceDashboard
};
