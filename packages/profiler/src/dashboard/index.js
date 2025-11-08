export function createDashboard(profiler, _options = {}) {
  return {
    render() {
      const metrics = profiler.getMetrics();
      return {
        div: {
          className: 'performance-dashboard',
          children: [
            {
              h2: {
                text: 'Performance Dashboard',
                className: 'dashboard-title'
              }
            },
            {
              div: {
                className: 'metrics-grid',
                children: Object.entries(metrics).map(([name, metric]) => ({
                  div: {
                    className: 'metric-card',
                    children: [
                      { h3: { text: name } },
                      { p: { text: `Count: ${metric.count}` } },
                      { p: { text: `Average: ${metric.average?.toFixed(2)}ms` } },
                      { p: { text: `Min: ${metric.min}ms` } },
                      { p: { text: `Max: ${metric.max}ms` } }
                    ]
                  }
                }))
              }
            }
          ]
        }
      };
    }
  };
}