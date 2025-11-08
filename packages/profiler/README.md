# @coherent.js/profiler

Advanced performance monitoring and profiling tools for Coherent.js applications.

## Installation

```bash
npm install @coherent.js/profiler
```

## Usage

### Basic Profiling

```js
import { PerformanceProfiler } from '@coherent.js/profiler';

const profiler = new PerformanceProfiler();

const profileId = profiler.startProfile('render-component');
profiler.mark(profileId, 'start-render');
// ... your code
profiler.mark(profileId, 'end-render');
const report = profiler.endProfile(profileId);
```

### Metrics Collection

```js
import { MetricsCollector } from '@coherent.js/performance-profiler';

const collector = new MetricsCollector();
collector.recordMetric('render-time', 16.5);
```

### Performance Dashboard

```js
import { createDashboard } from '@coherent.js/performance-profiler';

const dashboard = createDashboard(profiler);
const dashboardHTML = dashboard.render();
```
