/**
 * Performance Testing Examples
 * Demonstrates performance monitoring, caching, and optimization features
 */

import { renderToString } from '../src/coherent.js';
import { performanceMonitor } from '../src/performance/monitor.js';
import { globalCache } from '../src/performance/cache-manager.js';

// Recursive component for performance testing
const HeavyComponent = ({ depth = 0, maxDepth = 3, label = 'Node' }) => {
    if (depth >= maxDepth) {
        return { 
            span: { 
                text: `${label} ${depth}`,
                class: 'leaf-node'
            } 
        };
    }

    return {
        div: {
            class: `level-${depth} heavy-component`,
            children: [
                { h5: { text: `Level ${depth}` } },
                ...Array.from({ length: 2 }, (_, i) =>
                    HeavyComponent({ depth: depth + 1, maxDepth, label: `${label}-${i}` })
                )
            ]
        }
    };
};

// Data table component for performance testing
const PerformanceDataTable = ({ rows = [], showMetrics = false }) => ({
    div: {
        class: 'data-table-container',
        children: [
            showMetrics && {
                div: {
                    class: 'table-metrics',
                    children: [
                        { p: { text: `Rendering ${rows.length} rows` } },
                        { small: { text: `Memory usage: ~${(rows.length * 0.1).toFixed(1)}KB` } }
                    ]
                }
            },
            {
                table: {
                    class: 'performance-table',
                    children: [
                        {
                            thead: {
                                children: [{
                                    tr: {
                                        children: [
                                            { th: { text: 'ID' } },
                                            { th: { text: 'Name' } },
                                            { th: { text: 'Score' } },
                                            { th: { text: 'Status' } }
                                        ]
                                    }
                                }]
                            }
                        },
                        {
                            tbody: {
                                children: rows.map(row => ({
                                    tr: {
                                        key: row.id,
                                        class: row.status === 'active' ? 'active-row' : '',
                                        children: [
                                            { td: { text: row.id } },
                                            { td: { text: row.name } },
                                            { td: { text: row.score } },
                                            { td: { text: row.status, class: `status-${row.status}` } }
                                        ]
                                    }
                                }))
                            }
                        }
                    ]
                }
            }
        ].filter(Boolean)
    }
});

// Performance test suite
async function runPerformanceTests() {
    console.log('🚀 Starting Performance Tests\n');

    // Test 1: Render time comparison
    console.log('📊 Test 1: Basic vs Optimized Rendering');

    const testComponent = HeavyComponent({ maxDepth: 4 });

    // Basic rendering
    const basicStart = process.hrtime.bigint();
    for (let i = 0; i < 100; i++) {
        renderToString(testComponent, { enableCache: false, enableMonitoring: false });
    }
    const basicEnd = process.hrtime.bigint();
    const basicTime = Number(basicEnd - basicStart) / 1000000;

    // Optimized rendering
    const optimizedStart = process.hrtime.bigint();
    for (let i = 0; i < 100; i++) {
        renderToString(testComponent);
    }
    const optimizedEnd = process.hrtime.bigint();
    const optimizedTime = Number(optimizedEnd - optimizedStart) / 1000000;

    console.log(`Basic rendering (100x): ${basicTime.toFixed(2)}ms`);
    console.log(`Optimized rendering (100x): ${optimizedTime.toFixed(2)}ms`);
    console.log(`Performance improvement: ${((basicTime - optimizedTime) / basicTime * 100).toFixed(2)}%\n`);

    // Test 2: Cache efficiency
    console.log('💾 Test 2: Cache Performance');

    const generateLargeDataset = (size) => Array.from({ length: size }, (_, _index) => ({
        id: _index + 1,
        name: `User ${_index}`,
        email: `user${_index}@example.com`,
        status: _index % 3 === 0 ? 'active' : _index % 3 === 1 ? 'pending' : 'inactive'
    }));

    const tableData = generateLargeDataset(1000);

    const tableComponent = PerformanceDataTable({ rows: tableData });

    // First render (cold cache)
    const coldStart = process.hrtime.bigint();
    renderToString(tableComponent);
    const coldEnd = process.hrtime.bigint();

    // Repeated renders (warm cache)
    const warmStart = process.hrtime.bigint();
    for (let i = 0; i < 10; i++) {
        renderToString(tableComponent);
    }
    const warmEnd = process.hrtime.bigint();

    const coldTime = Number(coldEnd - coldStart) / 1000000;
    const warmTime = Number(warmEnd - warmStart) / 1000000 / 10;

    console.log(`Cold cache render: ${coldTime.toFixed(2)}ms`);
    console.log(`Warm cache render (avg): ${warmTime.toFixed(2)}ms`);
    console.log(`Cache speedup: ${(coldTime / warmTime).toFixed(2)}x\n`);

    // Test 3: Memory usage
    console.log('🧠 Test 3: Memory Usage Analysis');

    const memBefore = process.memoryUsage();

    // Create many components to test memory usage
    const components = Array.from({ length: 1000 }, () =>
        HeavyComponent({ depth: 0, maxDepth: 3 })
    );

    for (const component of components) {
        renderToString(component);
    }

    const memAfter = process.memoryUsage();
    const memDelta = memAfter.heapUsed - memBefore.heapUsed;

    console.log(`Memory used: ${(memDelta / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Average per component: ${(memDelta / components.length / 1024).toFixed(2)}KB\n`);

    // Test 4: Bundle analysis
    console.log('📦 Test 4: Bundle Optimization Analysis');

    const bundleAnalysis = bundleOptimizer.analyzeUsage(tableComponent, { rows: tableData });

    console.log('Bundle Analysis:');
    console.log(`- Used components: ${bundleAnalysis.usedComponents.length}`);
    console.log(`- Estimated bundle size: ${bundleAnalysis.bundleEstimate.estimated}KB`);
    console.log(`- Optimization opportunities: ${bundleAnalysis.optimizationOpportunities.length}`);

    if (bundleAnalysis.recommendations.length > 0) {
        console.log('\nRecommendations:');
        bundleAnalysis.recommendations.forEach(rec => {
            console.log(`- ${rec.action} (${rec.impact})`);
        });
    }

    console.log('\n');

    // Final results
    const finalReport = performanceMonitor.stop();

    console.log('📊 Final Performance Report:');
    console.log(`- Total renders: ${finalReport.summary.totalRenders}`);
    console.log(`- Average render time: ${finalReport.summary.averageRenderTime}ms`);
    console.log(`- Cache hit rate: ${finalReport.caching.hitRate}`);
    console.log(`- Memory efficiency: ${finalReport.summary.memoryEfficiency}`);

    if (finalReport.recommendations.length > 0) {
        console.log('\n🎯 Performance Recommendations:');
        finalReport.recommendations.forEach(rec => {
            console.log(`- [${rec.priority.toUpperCase()}] ${rec.suggestion}`);
            console.log(`  Impact: ${rec.impact}`);
        });
    }

    console.log('\n✅ Performance tests completed!');

    // Cleanup
    globalCache.destroy();
}

// Run the tests
runPerformanceTests().catch(console.error);

// Create a performance test demo component for live preview
const PerformanceTestDemo = {
  div: {
    className: 'performance-test-demo',
    children: [
      {
        div: {
          className: 'header',
          children: [
            { h1: { text: 'Coherent.js Performance Test Demo' } },
            { p: { text: 'This demo showcases performance monitoring, caching, and optimization features.' } }
          ]
        }
      },
      
      {
        div: {
          className: 'section',
          children: [
            { h2: { text: '🚀 Performance Monitoring' } },
            {
              div: {
                className: 'performance-demo',
                children: [
                  { p: { text: 'Coherent.js includes built-in performance monitoring and optimization tools.' } },
                  {
                    div: {
                      className: 'performance-stats',
                      style: 'background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;',
                      children: [
                        { h4: { text: 'Performance Features:' } },
                        {
                          ul: {
                            children: [
                              { li: { text: 'Real-time render time tracking' } },
                              { li: { text: 'Automatic component caching' } },
                              { li: { text: 'Memory usage optimization' } },
                              { li: { text: 'Bundle size analysis' } }
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
      },
      
      {
        div: {
          className: 'section',
          children: [
            { h2: { text: '📊 Heavy Component Test' } },
            {
              div: {
                className: 'heavy-component-demo',
                children: [
                  { p: { text: 'Testing performance with nested components:' } },
                  {
                    div: {
                      className: 'level-0',
                      style: 'border: 1px solid #ddd; padding: 10px; margin: 5px;',
                      children: [
                        { span: { text: 'Level 0' } },
                        {
                          div: {
                            className: 'level-1',
                            style: 'border: 1px solid #ccc; padding: 8px; margin: 3px;',
                            children: [
                              { span: { text: 'Level 1' } },
                              {
                                div: {
                                  className: 'level-2',
                                  style: 'border: 1px solid #bbb; padding: 6px; margin: 2px;',
                                  children: [
                                    { span: { text: 'Leaf 2' } }
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
            }
          ]
        }
      },
      
      {
        div: {
          className: 'section',
          children: [
            { h2: { text: '📈 Data Table Performance' } },
            {
              div: {
                className: 'data-table-demo',
                children: [
                  { p: { text: 'Performance testing with large data tables:' } },
                  {
                    table: {
                      className: 'data-table',
                      style: 'width: 100%; border-collapse: collapse; margin: 10px 0;',
                      children: [
                        {
                          thead: {
                            children: [
                              {
                                tr: {
                                  children: [
                                    { th: { text: 'ID', style: 'border: 1px solid #ddd; padding: 8px; background: #f5f5f5;' } },
                                    { th: { text: 'Name', style: 'border: 1px solid #ddd; padding: 8px; background: #f5f5f5;' } },
                                    { th: { text: 'Value', style: 'border: 1px solid #ddd; padding: 8px; background: #f5f5f5;' } },
                                    { th: { text: 'Status', style: 'border: 1px solid #ddd; padding: 8px; background: #f5f5f5;' } }
                                  ]
                                }
                              }
                            ]
                          }
                        },
                        {
                          tbody: {
                            children: Array.from({ length: 5 }, (_, _index) => ({
                              tr: {
                                children: [
                                  { td: { text: `${_index + 1}`, style: 'border: 1px solid #ddd; padding: 8px;' } },
                                  { td: { text: `Item ${_index + 1}`, style: 'border: 1px solid #ddd; padding: 8px;' } },
                                  { td: { text: `${(Math.random() * 1000).toFixed(2)}`, style: 'border: 1px solid #ddd; padding: 8px;' } },
                                  { td: { text: _index % 2 === 0 ? 'Active' : 'Pending', style: 'border: 1px solid #ddd; padding: 8px;' } }
                                ]
                              }
                            }))
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
      },
      
      {
        div: {
          className: 'footer',
          style: 'margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;',
          children: [
            { h3: { text: '⚡ Performance Benefits' } },
            {
              ul: {
                children: [
                  { li: { text: 'Automatic performance monitoring and reporting' } },
                  { li: { text: 'Intelligent component caching and memoization' } },
                  { li: { text: 'Memory usage optimization and leak detection' } },
                  { li: { text: 'Bundle size analysis and optimization recommendations' } }
                ]
              }
            }
          ]
        }
      }
    ]
  }
};

export default PerformanceTestDemo;
