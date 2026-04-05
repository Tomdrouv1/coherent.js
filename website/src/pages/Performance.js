import { withState } from "../../../packages/core/src/index.js";

// Performance.js - Interactive performance testing page with Coherent.js state management
const PerformanceComponent = withState({
  performanceResults: null,
  isRunning: false,
  currentTest: '',
  progress: 0
}, {
  debug: true
});

const PerformanceView = (props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;

  // Event handlers are now string-based and will call the global functions
  // loaded by performance.js when the page loads

  // Make setState available globally for performance.js to update component state
  if (typeof window !== 'undefined') {
    window.updatePerformanceState = (performanceResults) => {
      setState({ performanceResults });
    };
  }

  return {
    div: {
      className: 'performance-page',
      'data-coherent-component': 'performance',
      children: [
        // Header
        {
          div: {
            className: 'page-header',
            children: [
              { h1: { text: 'Performance Testing' } },
              { p: {
                className: 'page-lead',
                text: 'Interactive performance tests to benchmark Coherent.js rendering, caching, and optimization features.'
              } }
            ]
          }
        },

        // Test Controls
        {
          div: {
            className: 'test-controls reveal',
            children: [
              { h3: { text: 'Test Controls' } },
              {
                div: {
                  className: 'button-group',
                  children: [
                    {
                      button: {
                        id: 'run-all-tests',
                        className: 'button primary',
                        text: '🚀 Run All Performance Tests',
                        onclick: 'runPerformanceTests()'
                      }
                    },
                    {
                      button: {
                        id: 'run-render-test',
                        className: 'button secondary',
                        text: '📊 Rendering Test Only',
                        onclick: 'runRenderingTest()'
                      }
                    },
                    {
                      button: {
                        id: 'run-cache-test',
                        className: 'button secondary',
                        text: '💾 Cache Test Only', 
                        onclick: 'runCacheTest()'
                      }
                    },
                    {
                      button: {
                        id: 'clear-results',
                        className: 'button',
                        text: '🗑️ Clear Results',
                        onclick: 'clearResults()'
                      }
                    }
                  ]
                }
              }
            ]
          }
        },

        // Test Status
        {
          div: {
            id: 'test-status',
            className: 'test-status',
            style: 'margin: 20px 0; display: none;',
            children: [
              { div: { id: 'status-message', text: 'Ready to run tests...' } },
              {
                div: {
                  className: 'progress-bar',
                  style: 'margin: 10px 0; height: 6px;',
                  children: [
                    {
                      div: {
                        id: 'progress-fill',
                        style: 'width: 0%; height: 100%; transition: width 0.3s ease;'
                      }
                    }
                  ]
                }
              }
            ]
          }
        },

        // Results Section
        {
          div: {
            id: 'results-section',
            className: 'results-section',
            style: state.performanceResults ? 'display: block;' : 'display: none;',
            children: [
              { h2: { text: '📈 Test Results' } },
              { 
                div: { 
                  id: 'test-results', 
                  className: 'test-results',
                  children: state.performanceResults ? [
                    {
                      div: {
                        className: 'test-results-container',
                        children: [
                          {
                            div: {
                              className: 'test-result',
                              children: [
                                { h3: { text: '📊 Performance Test Results' } },
                                { p: { text: `Performance improvement: ${state.performanceResults.performanceImprovement}%` } },
                                { p: { text: `Cache speedup: ${state.performanceResults.cacheSpeedup}x` } },
                                { p: { text: `Average render time: ${state.performanceResults.avgRenderTime}ms` } },
                                { p: { text: `Cache hit rate: ${state.performanceResults.hitRate}%` } },
                                { p: { text: `Components: ${state.performanceResults.usedComponents}` } },
                                { p: { text: `Bundle size: ${state.performanceResults.bundleSize}` } }
                              ]
                            }
                          }
                        ]
                      }
                    }
                  ] : []
                }
              }
            ]
          }
        },

        // Performance Metrics Display
        {
          div: {
            className: 'metrics-grid reveal',
            children: [
              // Rendering Performance
              {
                div: {
                  className: 'metric-card',
                  children: [
                    { h3: { text: '🏃 Rendering Speed' } },
                    { 
                      div: { 
                        id: 'render-metrics',
                        text: state.performanceResults 
                          ? `${state.performanceResults.avgRenderTime}ms avg (${state.performanceResults.totalRenders} renders)`
                          : 'No data yet - run tests to see results'
                      }
                    }
                  ]
                }
              },
              
              // Cache Effectiveness
              {
                div: {
                  className: 'metric-card',
                  children: [
                    { h3: { text: '💾 Cache Performance' } },
                    { 
                      div: { 
                        id: 'cache-metrics',
                        text: state.performanceResults 
                          ? `${state.performanceResults.hitRate}% hit rate (${state.performanceResults.totalHits} hits, ${state.performanceResults.totalMisses} misses)`
                          : 'No data yet - run tests to see results'
                      }
                    }
                  ]
                }
              },

              // Memory Usage
              {
                div: {
                  className: 'metric-card',
                  children: [
                    { h3: { text: '🧠 Memory Efficiency' } },
                    { 
                      div: { 
                        id: 'memory-metrics',
                        text: state.performanceResults 
                          ? `${state.performanceResults.usedComponents} components (${state.performanceResults.bundleSize})`
                          : 'No data yet - run tests to see results'
                      }
                    }
                  ]
                }
              }
            ]
          }
        },

        // Interactive Demo Components
        {
          div: {
            className: 'demo-section reveal',
            children: [
              { h2: { text: '🔬 Live Performance Demo' } },
              
              // Heavy Component Demo
              {
                div: {
                  className: 'demo-card',
                  style: 'margin: 20px 0;',
                  children: [
                    { h3: { text: 'Heavy Component Rendering Test' } },
                    { p: { text: 'This test renders nested components with varying depth to measure rendering performance.' } },
                    {
                      div: {
                        className: 'demo-controls',
                        children: [
                          { label: { text: 'Depth: ' } },
                          {
                            input: {
                              type: 'range',
                              id: 'depth-slider',
                              min: '1',
                              max: '5',
                              value: '3',
                              oninput: 'updateDepthValue(this.value)'
                            }
                          },
                          { span: { id: 'depth-value', text: '3' } },
                          {
                            button: {
                              className: 'button secondary',
                              text: 'Test Render',
                              onclick: 'testHeavyComponent()'
                            }
                          }
                        ]
                      }
                    },
                    { div: { id: 'heavy-component-result', className: 'demo-result' } }
                  ]
                }
              },

              // Data Table Demo  
              {
                div: {
                  className: 'demo-card',
                  style: 'margin: 20px 0;',
                  children: [
                    { h3: { text: 'Large Data Table Rendering Test' } },
                    { p: { text: 'Tests performance with rendering large datasets in table format.' } },
                    {
                      div: {
                        className: 'demo-controls',
                        children: [
                          { label: { text: 'Rows: ' } },
                          {
                            input: {
                              type: 'range',
                              id: 'rows-slider',
                              min: '10',
                              max: '1000',
                              value: '100',
                              step: '10',
                              oninput: 'updateRowsValue(this.value)'
                            }
                          },
                          { span: { id: 'rows-value', text: '100' } },
                          {
                            button: {
                              className: 'button secondary',
                              text: 'Test Table',
                              onclick: 'testDataTable()'
                            }
                          }
                        ]
                      }
                    },
                    { div: { id: 'data-table-result', className: 'demo-result' } }
                  ]
                }
              }
            ]
          }
        },

        // Performance Tips
        {
          div: {
            className: 'tips-section reveal',
            children: [
              { h2: { text: '💡 Performance Optimization Tips' } },
              {
                div: {
                  className: 'tips-grid',
                  children: [
                    {
                      div: {
                        className: 'tip-card',
                        children: [
                          { h4: { text: 'Enable Caching' } },
                          { p: { text: 'Use framework caching for frequently rendered components to achieve up to 200x performance improvements.' } }
                        ]
                      }
                    },
                    {
                      div: {
                        className: 'tip-card',
                        children: [
                          { h4: { text: 'Static Components' } },
                          { p: { text: 'Pre-render static components and cache them for ultra-fast rendering of unchanging UI elements.' } }
                        ]
                      }
                    },
                    {
                      div: {
                        className: 'tip-card',
                        children: [
                          { h4: { text: 'Bundle Optimization' } },
                          { p: { text: 'Use the bundle optimizer to identify and remove unused components from your production builds.' } }
                        ]
                      }
                    },
                    {
                      div: {
                        className: 'tip-card',
                        children: [
                          { h4: { text: 'Memory Management' } },
                          { p: { text: 'Monitor memory usage and implement cleanup strategies for long-running applications.' } }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
};

// Create the stateful component
const StatefulPerformanceComponent = PerformanceComponent(PerformanceView);

export function Performance() {
  return StatefulPerformanceComponent();
}
