# Profiler

`@coherent.js/profiler` provides performance profiling and metrics collection tools for Coherent.js applications. Use it to measure render times, collect custom metrics, and visualize performance data through a built-in dashboard.

## Installation

```bash
pnpm add @coherent.js/profiler
```

## Basic Usage

### Profiling Render Operations

```javascript
import { PerformanceProfiler } from '@coherent.js/profiler';

const profiler = new PerformanceProfiler({
  enableMetrics: true,
  enableTracing: true,
  sampleRate: 1.0
});

// Profile an operation
const handle = profiler.startProfiling('page-render');
// ... perform rendering ...
const duration = handle.end(); // returns duration in ms

// Record a metric directly
profiler.recordMetric('api-latency', 42, { endpoint: '/users' });

// Retrieve all collected metrics
const metrics = profiler.getMetrics();
```

### Metrics Collector

Aggregate metrics from multiple sources.

```javascript
import { MetricsCollector } from '@coherent.js/profiler';

const collector = new MetricsCollector();

collector.addCollector('rendering', collector.createRenderingCollector());
collector.addCollector('custom', {
  collect: async () => ({ requestCount: 150, errorRate: 0.02 })
});

const results = await collector.collect();
```

### Dashboard

Render a Coherent.js component that displays collected metrics.

```javascript
import { PerformanceProfiler, createDashboard } from '@coherent.js/profiler';

const profiler = new PerformanceProfiler();
const dashboard = createDashboard(profiler);

// Returns a Coherent.js component object
const component = dashboard.render();
```

### Profiler Server

Expose profiler data via an HTTP endpoint.

```javascript
import { PerformanceProfiler, createProfilerServer } from '@coherent.js/profiler';

const profiler = new PerformanceProfiler();
const server = createProfilerServer(profiler, { port: 3001 });

await server.start();
// ... later ...
await server.stop();
```

## API Reference

### PerformanceProfiler

| Method | Description |
|---|---|
| `startProfiling(name)` | Start a named timing. Returns `{ end() }` which records the metric and returns duration |
| `recordMetric(name, value, tags?)` | Record a metric value with optional tags |
| `getMetrics()` | Get all recorded metrics as `{ [name]: Array<{ value, timestamp, tags }> }` |
| `reset()` | Clear all metrics and traces |

### MetricsCollector

| Method | Description |
|---|---|
| `addCollector(name, collector)` | Register a collector with a `.collect()` method |
| `collect()` | Run all collectors and return aggregated results |
| `createRenderingCollector()` | Create a built-in rendering metrics collector |

### createDashboard(profiler, options?)

Returns an object with a `render()` method that produces a Coherent.js component displaying metrics.

### createProfilerServer(profiler, options?)

Returns `{ start(), stop() }` for an HTTP server exposing profiler data.

## Known Limitations

- The profiler server is a stub; it logs to console but does not serve real HTTP responses.
- The rendering collector returns zeroed placeholder data and must be wired to actual render hooks.
- Uses `performance.now()` which requires the Performance API (available in Node.js 16+ and browsers).
