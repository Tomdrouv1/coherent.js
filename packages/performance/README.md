# @coherent.js/performance

Performance monitoring and optimization utilities for Coherent.js applications.

## Installation

```bash
npm install @coherent.js/performance
# or
pnpm add @coherent.js/performance
# or
yarn add @coherent.js/performance
```

## Overview

The `@coherent.js/performance` package provides comprehensive performance monitoring and optimization tools for Coherent.js applications, including:

- Real-time performance monitoring
- Rendering performance metrics
- Memory usage tracking
- Bundle size analysis
- Performance bottlenecks detection
- Optimization recommendations

## Quick Start

```javascript
import { createPerformanceMonitor } from '@coherent.js/performance';

// Create performance monitor
const monitor = createPerformanceMonitor({
  // Optional configuration
  logLevel: 'info',
  sampleRate: 1.0, // Monitor all renders
  thresholds: {
    render: 50, // Warn if render takes >50ms
    memory: 100 // Warn if memory usage >100MB
  }
});

// Start monitoring
monitor.start();

// Your Coherent.js application
function App() {
  return {
    div: {
      children: [
        { h1: { text: 'Performance Monitored App' } },
        { p: { text: 'Performance data is being collected...' } }
      ]
    }
  };
}

// Stop monitoring when needed
// monitor.stop();
```

## Features

### Real-time Monitoring

Monitor application performance in real-time:

```javascript
import { createPerformanceMonitor } from '@coherent.js/performance';

const monitor = createPerformanceMonitor({
  onMetrics: (metrics) => {
    // Handle metrics in real-time
    console.log('Render time:', metrics.renderTime, 'ms');
    console.log('Memory usage:', metrics.memoryUsage, 'MB');
    
    // Send to analytics
    sendToAnalytics('performance', metrics);
  }
});

monitor.start();
```

### Rendering Performance

Track component rendering performance:

```javascript
import { withPerformance } from '@coherent.js/performance';

const OptimizedComponent = withPerformance({
  name: 'UserProfile',
  threshold: 30 // Warn if rendering takes >30ms
})(function UserProfile({ user }) {
  return {
    div: {
      className: 'user-profile',
      children: [
        { img: { src: user.avatar, alt: user.name } },
        { h2: { text: user.name } },
        { p: { text: user.bio } }
      ]
    }
  };
});
```

### Memory Tracking

Monitor memory usage patterns:

```javascript
import { createMemoryTracker } from '@coherent.js/performance';

const memoryTracker = createMemoryTracker({
  interval: 5000, // Check every 5 seconds
  onWarning: (usage) => {
    console.warn('High memory usage detected:', usage);
  }
});

memoryTracker.start();
```

## Performance Metrics

### Core Metrics

Track essential performance metrics:

```javascript
const monitor = createPerformanceMonitor({
  metrics: {
    renderTime: true,      // Component render time
    totalTime: true,       // Total render time
    memoryUsage: true,     // Memory consumption
    gcEvents: true,        // Garbage collection events
    eventLoopDelay: true,  // Event loop delay
    bundleSize: true       // Bundle size analysis
  }
});
```

### Custom Metrics

Define custom performance metrics:

```javascript
const monitor = createPerformanceMonitor({
  customMetrics: {
    databaseQueries: () => getQueryCount(),
    apiCalls: () => getApiCallCount(),
    cacheHits: () => getCacheHitRate()
  }
});
```

## Configuration Options

### Thresholds

Set performance thresholds for alerts:

```javascript
const monitor = createPerformanceMonitor({
  thresholds: {
    renderTime: 50,        // ms
    totalTime: 200,        // ms
    memoryUsage: 150,      // MB
    eventLoopDelay: 20,    // ms
    bundleSize: 500        // KB
  }
});
```

### Sampling

Control monitoring sampling rate:

```javascript
const monitor = createPerformanceMonitor({
  sampleRate: 0.1, // Only monitor 10% of renders
  sampleStrategy: 'random' // or 'first' or 'last'
});
```

### Logging

Configure logging behavior:

```javascript
const monitor = createPerformanceMonitor({
  logLevel: 'warn', // 'debug', 'info', 'warn', 'error'
  logFormat: 'json', // or 'text'
  logDestination: 'console' // or 'file' or custom function
});
```

## Performance Optimization

### Bundle Analysis

Analyze and optimize bundle size:

```javascript
import { analyzeBundle } from '@coherent.js/performance';

// Analyze your application bundle
const bundleAnalysis = await analyzeBundle({
  entryPoints: ['./src/index.js'],
  outputDir: './dist'
});

console.log('Bundle size:', bundleAnalysis.totalSize);
console.log('Largest modules:', bundleAnalysis.largestModules);
```

### Code Splitting Recommendations

Get code splitting recommendations:

```javascript
import { getCodeSplittingRecommendations } from '@coherent.js/performance';

const recommendations = getCodeSplittingRecommendations({
  componentUsage: getComponentUsageData(),
  routePatterns: getRoutePatterns()
});

recommendations.forEach(rec => {
  console.log(`Split ${rec.component} into separate bundle`);
});
```

## Advanced Features

### Profiling

Detailed performance profiling:

```javascript
import { createProfiler } from '@coherent.js/performance';

const profiler = createProfiler({
  detailLevel: 'high', // 'low', 'medium', 'high'
  outputFormat: 'json' // or 'html'
});

// Profile a specific operation
profiler.profile('render-dashboard', () => {
  return renderDashboard(data);
});
```

### Comparison Reports

Generate performance comparison reports:

```javascript
import { createComparisonReport } from '@coherent.js/performance';

const beforeMetrics = getMetricsBeforeOptimization();
const afterMetrics = getMetricsAfterOptimization();

const report = createComparisonReport({
  before: beforeMetrics,
  after: afterMetrics,
  improvementsOnly: true
});

console.log(report.summary);
```

### Integration with Monitoring Services

Integrate with external monitoring services:

```javascript
const monitor = createPerformanceMonitor({
  integrations: {
    newRelic: {
      apiKey: process.env.NEW_RELIC_API_KEY,
      accountId: process.env.NEW_RELIC_ACCOUNT_ID
    },
    datadog: {
      apiKey: process.env.DATADOG_API_KEY,
      site: 'datadoghq.com'
    }
  }
});
```

## API Reference

### createPerformanceMonitor(options)

Create a new performance monitor instance.

**Parameters:**
- `options.logLevel` - Logging level ('debug', 'info', 'warn', 'error')
- `options.sampleRate` - Sampling rate (0.0 to 1.0)
- `options.thresholds` - Performance thresholds for alerts
- `options.metrics` - Which metrics to collect
- `options.onMetrics` - Callback for real-time metrics

**Returns:** Performance monitor instance

### withPerformance(options)

Higher-order component for performance monitoring.

**Parameters:**
- `options.name` - Component name for tracking
- `options.threshold` - Performance threshold in ms
- `options.onRender` - Callback after each render

**Returns:** Wrapped component function

### createMemoryTracker(options)

Create a memory usage tracker.

**Parameters:**
- `options.interval` - Check interval in ms
- `options.onWarning` - Callback for memory warnings

### Methods

- `monitor.start()` - Start performance monitoring
- `monitor.stop()` - Stop performance monitoring
- `monitor.getMetrics()` - Get current metrics
- `monitor.reset()` - Reset collected metrics

## Examples

### Full Application Monitoring

```javascript
import { createPerformanceMonitor, withPerformance } from '@coherent.js/performance';
import { render } from '@coherent.js/core';

// Create monitor
const monitor = createPerformanceMonitor({
  logLevel: 'info',
  thresholds: {
    renderTime: 30,
    memoryUsage: 100
  },
  onMetrics: (metrics) => {
    // Send to analytics service
    analytics.track('performance_metrics', metrics);
    
    // Alert on issues
    if (metrics.renderTime > 100) {
      alertService.warn('High render time detected');
    }
  }
});

// Monitor specific components
const MonitoredDashboard = withPerformance({
  name: 'Dashboard',
  threshold: 25
})(function Dashboard({ data }) {
  return {
    div: {
      className: 'dashboard',
      children: data.widgets.map(widget => ({
        div: {
          className: 'widget',
          children: [
            { h3: { text: widget.title } },
            { p: { text: widget.content } }
          ]
        }
      }))
    }
  };
});

// Start monitoring
monitor.start();

// Render application
render(MonitoredDashboard, { data: getDashboardData() });
```

### Production Performance Dashboard

```javascript
import { createPerformanceMonitor } from '@coherent.js/performance';

class PerformanceDashboard {
  constructor() {
    this.monitor = createPerformanceMonitor({
      sampleRate: 0.05, // Only 5% in production
      logLevel: 'warn',
      thresholds: {
        renderTime: 100,
        memoryUsage: 200,
        eventLoopDelay: 50
      }
    });
    
    this.metricsHistory = [];
  }
  
  start() {
    this.monitor.start();
    
    // Collect metrics periodically
    setInterval(() => {
      const metrics = this.monitor.getMetrics();
      this.metricsHistory.push({
        timestamp: Date.now(),
        ...metrics
      });
      
      // Keep only last 100 entries
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }
    }, 60000); // Every minute
  }
  
  getReport() {
    return {
      avgRenderTime: this.getAverage('renderTime'),
      peakMemory: this.getPeak('memoryUsage'),
      metricsHistory: this.metricsHistory
    };
  }
  
  getAverage(metric) {
    const values = this.metricsHistory.map(m => m[metric]).filter(Boolean);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  getPeak(metric) {
    return Math.max(...this.metricsHistory.map(m => m[metric]).filter(Boolean));
  }
}

// Usage
const dashboard = new PerformanceDashboard();
dashboard.start();

// Expose report endpoint
app.get('/performance-report', (req, res) => {
  res.json(dashboard.getReport());
});
```

## Best Practices

### 1. Environment-Specific Configuration

```javascript
const config = process.env.NODE_ENV === 'production' 
  ? {
      sampleRate: 0.1,
      logLevel: 'warn'
    }
  : {
      sampleRate: 1.0,
      logLevel: 'debug'
    };

const monitor = createPerformanceMonitor(config);
```

### 2. Selective Monitoring

```javascript
// Only monitor in production or staging
if (['production', 'staging'].includes(process.env.NODE_ENV)) {
  monitor.start();
}
```

### 3. Resource-Efficient Monitoring

```javascript
const monitor = createPerformanceMonitor({
  sampleRate: 0.1,           // Only sample 10%
  metrics: {                 // Only collect essential metrics
    renderTime: true,
    memoryUsage: true
  },
  thresholds: {              // Conservative thresholds
    renderTime: 100,
    memoryUsage: 500
  }
});
```

## Related Packages

- [@coherent.js/core](../core/README.md) - Core framework
- [@coherent.js/profiler](../profiler/README.md) - Detailed profiling tools
- [@coherent.js/devtools](../devtools/README.md) - Development tools

## License

MIT
