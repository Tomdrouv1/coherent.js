import { renderToString } from '../src/coherent.js';
import { performanceMonitor } from '../src/performance/monitor.js';
import { globalCache } from '../src/performance/cache-manager.js';
import { bundleOptimizer } from '../src/performance/bundle-optimizer.js';

// Start monitoring
performanceMonitor.start();

// Test components for performance
const HeavyComponent = ({ depth = 0, maxDepth = 5 }) => {
    if (depth >= maxDepth) {
        return { span: { text: `Leaf ${depth}` } };
    }

    return {
        div: {
            className: `level-${depth}`,
            children: Array.from({ length: 3 }, (_, i) =>
                HeavyComponent({ depth: depth + 1, maxDepth })
            )
        }
    };
};

const DataTable = ({ rows = [] }) => ({
    table: {
        className: 'data-table',
        children: [
            {
                thead: {
                    children: [{
                        tr: {
                            children: [
                                { th: { text: 'ID' } },
                                { th: { text: 'Name' } },
                                { th: { text: 'Email' } },
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
                            children: [
                                { td: { text: row.id } },
                                { td: { text: row.name } },
                                { td: { text: row.email } },
                                { td: { text: row.status, className: `status-${row.status}` } }
                            ]
                        }
                    }))
                }
            }
        ]
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

    const tableData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'pending' : 'inactive'
    }));

    const tableComponent = DataTable({ rows: tableData });

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
    const components = Array.from({ length: 1000 }, (_, i) =>
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
