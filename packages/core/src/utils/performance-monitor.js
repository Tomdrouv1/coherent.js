/**
 * Performance Monitoring System with Budgets and Warnings
 * Tracks rendering performance and component efficiency
 */

import { createPerformanceWarning, globalErrorHandler } from './error-handler.js';

// Default performance budgets (in milliseconds)
const DEFAULT_BUDGETS = {
  // Rendering performance
  componentRender: 16,      // Single component render should be < 16ms (60fps)
  totalRender: 100,         // Total page render should be < 100ms
  largeComponentRender: 50, // Large components should be < 50ms
  
  // Memory thresholds
  componentMemory: 1024,    // Component should use < 1MB memory
  totalMemory: 50 * 1024,   // Total app should use < 50MB
  
  // Cache performance
  cacheHitRatio: 0.8,       // Cache hit ratio should be > 80%
  cacheSize: 10 * 1024,     // Cache should be < 10MB
  
  // Bundle size (theoretical limits for warnings)
  componentSize: 50 * 1024, // Single component < 50KB
  totalBundleSize: 500 * 1024, // Total bundle < 500KB
};

// Performance metrics storage
const _metrics = {
  renderTimes: new Map(),
  memoryUsage: new Map(),
  cacheStats: { hits: 0, misses: 0, size: 0 },
  componentSizes: new Map(),
  warnings: [],
  startTimes: new Map(),
};

// Configuration
const config = {
  enabled: process.env.NODE_ENV === 'development',
  budgets: { ...DEFAULT_BUDGETS },
  warningThreshold: 0.8, // Warn at 80% of budget
  trackMemory: true,
  trackCache: true,
  maxWarnings: 50,
  reportInterval: 10000, // Report every 10 seconds in dev mode
};

export class PerformanceMonitor {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.metrics = {
      renderTimes: new Map(),
      memoryUsage: new Map(),
      cacheStats: { hits: 0, misses: 0, size: 0 },
      componentSizes: new Map(),
      warnings: [],
      startTimes: new Map(),
    };
    
    // Auto-report in development
    if (this.config.enabled && this.config.reportInterval > 0) {
      setInterval(() => this.generateReport(), this.config.reportInterval);
    }
  }

  /**
   * Start timing a component render
   */
  startRender(componentName, context = {}) {
    if (!this.config.enabled) return;
    
    const startTime = performance.now();
    const key = `${componentName}-${Date.now()}`;
    
    this.metrics.startTimes.set(key, {
      startTime,
      componentName,
      context
    });
    
    return key;
  }

  /**
   * End timing a component render and check budgets
   */
  endRender(timerKey, result = null) {
    if (!this.config.enabled || !timerKey) return;
    
    const timerInfo = this.metrics.startTimes.get(timerKey);
    if (!timerInfo) return;
    
    const endTime = performance.now();
    const renderTime = endTime - timerInfo.startTime;
    const { componentName, context } = timerInfo;
    
    // Store render time
    if (!this.metrics.renderTimes.has(componentName)) {
      this.metrics.renderTimes.set(componentName, []);
    }
    this.metrics.renderTimes.get(componentName).push({
      time: renderTime,
      timestamp: Date.now(),
      context
    });
    
    // Check performance budgets
    this.checkRenderBudget(componentName, renderTime, context);
    
    // Estimate component size if result is provided
    if (result) {
      this.estimateComponentSize(componentName, result);
    }
    
    // Cleanup
    this.metrics.startTimes.delete(timerKey);
    
    return renderTime;
  }

  /**
   * Check if render time exceeds budgets
   */
  checkRenderBudget(componentName, renderTime, context = {}) {
    const budgets = this.config.budgets;
    const isLarge = context.isLarge || (context.children && context.children.length > 10);
    
    const budget = isLarge ? budgets.largeComponentRender : budgets.componentRender;
    const warningThreshold = budget * this.config.warningThreshold;
    
    if (renderTime > budget) {
      this.addWarning('RENDER_BUDGET_EXCEEDED', {
        componentName,
        renderTime: Math.round(renderTime * 100) / 100,
        budget,
        exceeded: Math.round((renderTime - budget) * 100) / 100,
        context
      });
    } else if (renderTime > warningThreshold) {
      this.addWarning('RENDER_BUDGET_WARNING', {
        componentName,
        renderTime: Math.round(renderTime * 100) / 100,
        budget,
        percentage: Math.round((renderTime / budget) * 100),
        context
      });
    }
  }

  /**
   * Track memory usage
   */
  trackMemory(componentName, memoryUsed) {
    if (!this.config.enabled || !this.config.trackMemory) return;
    
    this.metrics.memoryUsage.set(componentName, {
      memory: memoryUsed,
      timestamp: Date.now()
    });
    
    // Check memory budget
    if (memoryUsed > this.config.budgets.componentMemory) {
      this.addWarning('MEMORY_BUDGET_EXCEEDED', {
        componentName,
        memoryUsed: Math.round(memoryUsed / 1024), // Convert to KB
        budget: Math.round(this.config.budgets.componentMemory / 1024),
        exceeded: Math.round((memoryUsed - this.config.budgets.componentMemory) / 1024)
      });
    }
  }

  /**
   * Track cache performance
   */
  trackCache(operation, componentName, hit = false) {
    if (!this.config.enabled || !this.config.trackCache) return;
    
    if (hit) {
      this.metrics.cacheStats.hits++;
    } else {
      this.metrics.cacheStats.misses++;
    }
    
    // Check cache hit ratio
    const total = this.metrics.cacheStats.hits + this.metrics.cacheStats.misses;
    if (total > 10) { // Only check after meaningful sample size
      const hitRatio = this.metrics.cacheStats.hits / total;
      
      if (hitRatio < this.config.budgets.cacheHitRatio) {
        this.addWarning('CACHE_EFFICIENCY_LOW', {
          hitRatio: Math.round(hitRatio * 100),
          expectedRatio: Math.round(this.config.budgets.cacheHitRatio * 100),
          totalRequests: total,
          componentName
        });
      }
    }
  }

  /**
   * Estimate component bundle size
   */
  estimateComponentSize(componentName, component) {
    try {
      const serialized = JSON.stringify(component);
      const estimatedSize = (typeof window !== 'undefined' && window.Blob) ? new window.Blob([serialized]).size : 
        (typeof Buffer !== 'undefined' ? Buffer.byteLength(serialized, 'utf8') : serialized.length);
      
      this.metrics.componentSizes.set(componentName, {
        size: estimatedSize,
        timestamp: Date.now()
      });
      
      // Check size budget
      if (estimatedSize > this.config.budgets.componentSize) {
        this.addWarning('COMPONENT_SIZE_EXCEEDED', {
          componentName,
          size: Math.round(estimatedSize / 1024), // KB
          budget: Math.round(this.config.budgets.componentSize / 1024),
          exceeded: Math.round((estimatedSize - this.config.budgets.componentSize) / 1024)
        });
      }
    } catch {
      // Ignore serialization errors
    }
  }

  /**
   * Add a performance warning
   */
  addWarning(type, details) {
    const warning = {
      type,
      details,
      timestamp: Date.now(),
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.metrics.warnings.unshift(warning);
    
    // Limit warnings to prevent memory bloat
    if (this.metrics.warnings.length > this.config.maxWarnings) {
      this.metrics.warnings = this.metrics.warnings.slice(0, this.config.maxWarnings);
    }
    
    // Create and handle error for immediate feedback
    const message = this.formatWarningMessage(warning);
    const perfError = createPerformanceWarning(message, details);
    
    if (globalErrorHandler) {
      globalErrorHandler.handle(perfError, { 
        component: details.componentName,
        metrics: details 
      });
    } else {
      console.warn(`⚡ Performance Warning: ${message}`);
    }
    
    return warning;
  }

  /**
   * Format warning message
   */
  formatWarningMessage(warning) {
    const { type, details } = warning;
    
    switch (type) {
      case 'RENDER_BUDGET_EXCEEDED':
        return `Component "${details.componentName}" render took ${details.renderTime}ms (budget: ${details.budget}ms, exceeded by ${details.exceeded}ms)`;
      
      case 'RENDER_BUDGET_WARNING':
        return `Component "${details.componentName}" render took ${details.renderTime}ms (${details.percentage}% of ${details.budget}ms budget)`;
      
      case 'MEMORY_BUDGET_EXCEEDED':
        return `Component "${details.componentName}" uses ${details.memoryUsed}KB memory (budget: ${details.budget}KB, exceeded by ${details.exceeded}KB)`;
      
      case 'CACHE_EFFICIENCY_LOW':
        return `Cache hit ratio is ${details.hitRatio}% (expected: ${details.expectedRatio}%) for component "${details.componentName}"`;
      
      case 'COMPONENT_SIZE_EXCEEDED':
        return `Component "${details.componentName}" size is ${details.size}KB (budget: ${details.budget}KB, exceeded by ${details.exceeded}KB)`;
      
      default:
        return `Performance issue detected: ${type}`;
    }
  }

  /**
   * Get component statistics
   */
  getComponentStats(componentName) {
    const renderTimes = this.metrics.renderTimes.get(componentName) || [];
    const memoryInfo = this.metrics.memoryUsage.get(componentName);
    const sizeInfo = this.metrics.componentSizes.get(componentName);
    
    if (renderTimes.length === 0) {
      return null;
    }
    
    const times = renderTimes.map(r => r.time);
    const avgRenderTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxRenderTime = Math.max(...times);
    const minRenderTime = Math.min(...times);
    
    return {
      componentName,
      renderStats: {
        count: times.length,
        average: Math.round(avgRenderTime * 100) / 100,
        max: Math.round(maxRenderTime * 100) / 100,
        min: Math.round(minRenderTime * 100) / 100,
        recent: times.slice(-5).map(t => Math.round(t * 100) / 100)
      },
      memory: memoryInfo ? Math.round(memoryInfo.memory / 1024) : null,
      size: sizeInfo ? Math.round(sizeInfo.size / 1024) : null,
      lastUpdated: renderTimes[renderTimes.length - 1]?.timestamp
    };
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.getSummary(),
      components: this.getTopComponents(),
      warnings: this.getRecentWarnings(10),
      recommendations: this.generateRecommendations()
    };
    
    if (this.config.enabled) {
      console.group('📊 Coherent.js Performance Report');
      this.printReport(report);
      console.groupEnd();
    }
    
    return report;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const totalComponents = this.metrics.renderTimes.size;
    const totalRenders = Array.from(this.metrics.renderTimes.values())
      .reduce((total, renders) => total + renders.length, 0);
    
    const allRenderTimes = Array.from(this.metrics.renderTimes.values())
      .flat()
      .map(r => r.time);
    
    const avgRenderTime = allRenderTimes.length > 0 
      ? allRenderTimes.reduce((a, b) => a + b, 0) / allRenderTimes.length 
      : 0;
    
    const slowComponents = Array.from(this.metrics.renderTimes.entries())
      .filter(([, renders]) => {
        const times = renders.map(r => r.time);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        return avg > this.config.budgets.componentRender;
      }).length;
    
    const cacheTotal = this.metrics.cacheStats.hits + this.metrics.cacheStats.misses;
    const cacheHitRatio = cacheTotal > 0 ? this.metrics.cacheStats.hits / cacheTotal : 0;
    
    return {
      totalComponents,
      totalRenders,
      averageRenderTime: Math.round(avgRenderTime * 100) / 100,
      slowComponents,
      cacheHitRatio: Math.round(cacheHitRatio * 100),
      totalWarnings: this.metrics.warnings.length
    };
  }

  /**
   * Get top performing and worst performing components
   */
  getTopComponents(limit = 5) {
    const componentStats = Array.from(this.metrics.renderTimes.keys())
      .map(name => this.getComponentStats(name))
      .filter(Boolean)
      .sort((a, b) => b.renderStats.average - a.renderStats.average);
    
    return {
      slowest: componentStats.slice(0, limit),
      fastest: componentStats.slice(-limit).reverse()
    };
  }

  /**
   * Get recent warnings
   */
  getRecentWarnings(limit = 10) {
    return this.metrics.warnings.slice(0, limit);
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const summary = this.getSummary();
    
    if (summary.slowComponents > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        message: `${summary.slowComponents} components exceed render budget. Consider memoization or optimization.`
      });
    }
    
    if (summary.cacheHitRatio < 80) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        message: `Cache hit ratio is ${summary.cacheHitRatio}%. Review caching strategy.`
      });
    }
    
    if (summary.averageRenderTime > this.config.budgets.componentRender) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Average render time (${summary.averageRenderTime}ms) exceeds budget. Profile component complexity.`
      });
    }
    
    if (this.metrics.warnings.length > 20) {
      recommendations.push({
        type: 'monitoring',
        priority: 'medium',
        message: `High number of performance warnings (${this.metrics.warnings.length}). Review component implementations.`
      });
    }
    
    return recommendations;
  }

  /**
   * Print formatted report to console
   */
  printReport(report) {
    const { summary, components, warnings, recommendations } = report;
    
    console.log('📈 Summary:');
    console.log(`  Components: ${summary.totalComponents} (${summary.slowComponents} slow)`);
    console.log(`  Renders: ${summary.totalRenders} (avg: ${summary.averageRenderTime}ms)`);
    console.log(`  Cache: ${summary.cacheHitRatio}% hit ratio`);
    console.log(`  Warnings: ${summary.totalWarnings}`);
    
    if (components.slowest.length > 0) {
      console.log('\n🐌 Slowest Components:');
      components.slowest.forEach((comp, i) => {
        console.log(`  ${i + 1}. ${comp.componentName}: ${comp.renderStats.average}ms avg`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ Recent Warnings:');
      warnings.slice(0, 3).forEach(warning => {
        console.log(`  • ${this.formatWarningMessage(warning)}`);
      });
    }
    
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : '🟡';
        console.log(`  ${priority} ${rec.message}`);
      });
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.renderTimes.clear();
    this.metrics.memoryUsage.clear();
    this.metrics.componentSizes.clear();
    this.metrics.warnings = [];
    this.metrics.startTimes.clear();
    this.metrics.cacheStats = { hits: 0, misses: 0, size: 0 };
  }

  /**
   * Update configuration
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();

// Utility functions for common monitoring scenarios
export function monitorRender(componentName, renderFunction, context = {}) {
  if (!globalPerformanceMonitor.config.enabled) {
    return renderFunction();
  }
  
  const timerKey = globalPerformanceMonitor.startRender(componentName, context);
  
  try {
    const result = renderFunction();
    globalPerformanceMonitor.endRender(timerKey, result);
    return result;
  } catch (error) {
    globalPerformanceMonitor.endRender(timerKey);
    throw error;
  }
}

export function monitorAsync(componentName, asyncFunction, context = {}) {
  if (!globalPerformanceMonitor.config.enabled) {
    return asyncFunction();
  }
  
  return new Promise((resolve, reject) => {
    (async () => {
    const timerKey = globalPerformanceMonitor.startRender(componentName, context);
    
    try {
      const result = await asyncFunction();
      globalPerformanceMonitor.endRender(timerKey, result);
      resolve(result);
    } catch (error) {
      globalPerformanceMonitor.endRender(timerKey);
      reject(error);
    }
    })();
  });
}

// Higher-order function to automatically monitor component renders
export function withPerformanceMonitoring(component, options = {}) {
  const componentName = options.name || component.name || 'AnonymousComponent';
  
  return function MonitoredComponent(props) {
    return monitorRender(componentName, () => component(props), {
      props,
      isLarge: options.isLarge || false
    });
  };
}

// Export configuration helpers
export function setPerformanceBudgets(budgets) {
  globalPerformanceMonitor.configure({ budgets: { ...globalPerformanceMonitor.config.budgets, ...budgets } });
}

export function enablePerformanceMonitoring(enabled = true) {
  globalPerformanceMonitor.configure({ enabled });
}

export function getPerformanceReport() {
  return globalPerformanceMonitor.generateReport();
}

export function clearPerformanceMetrics() {
  globalPerformanceMonitor.clearMetrics();
}

// Export the main class and instance
export default globalPerformanceMonitor;