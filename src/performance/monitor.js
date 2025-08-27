/**
 * Real-time performance monitoring and metrics collection
 */

import { createCacheManager } from './cache-manager.js';

// Create a dedicated cache instance for monitoring
const monitorCache = createCacheManager({
    maxSize: 1000,
    ttlMs: 300000 // 5 minutes
});

export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            renderTimes: [],
            componentCounts: new Map(),
            memoryUsage: [],
            cachePerformance: [],
            errors: []
        };

        this.startTime = Date.now();
        this.isMonitoring = false;
    }

    start() {
        this.isMonitoring = true;
        this.collectSystemMetrics();
        console.log('🚀 Performance monitoring started');
    }

    stop() {
        this.isMonitoring = false;
        console.log('⏹️  Performance monitoring stopped');
        return this.generateReport();
    }

    // Measure render performance
    measureRender(component, props, renderFn) {
        const startTime = process.hrtime.bigint();
        const startMemory = process.memoryUsage();

        try {
            const result = renderFn(component, props);
            const endTime = process.hrtime.bigint();
            const endMemory = process.memoryUsage();

            const renderTimeMs = Number(endTime - startTime) / 1000000;
            const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

            this.recordRenderMetric({
                component: this.getComponentName(component),
                renderTime: renderTimeMs,
                memoryDelta,
                resultSize: typeof result === 'string' ? result.length : 0
            });

            return result;
        } catch (error) {
            this.recordError(error, component);
            throw error;
        }
    }

    recordRenderMetric(metric) {
        this.metrics.renderTimes.push({
            ...metric,
            timestamp: Date.now()
        });

        // Update component usage stats
        const current = this.metrics.componentCounts.get(metric.component) || 0;
        this.metrics.componentCounts.set(metric.component, current + 1);

        // Keep only recent metrics
        if (this.metrics.renderTimes.length > 1000) {
            this.metrics.renderTimes = this.metrics.renderTimes.slice(-1000);
        }
    }

    recordError(error, component) {
        this.metrics.errors.push({
            error: error.message,
            component: this.getComponentName(component),
            stack: error.stack,
            timestamp: Date.now()
        });
    }

    collectSystemMetrics() {
        if (!this.isMonitoring) return;

        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage.push({
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
        });

        // Get cache stats if available
        if (monitorCache) {
            const cacheStats = monitorCache.getStats();
            this.metrics.cachePerformance.push({
                timestamp: Date.now(),
                ...cacheStats
            });
        }

        // Keep only recent system metrics
        if (this.metrics.memoryUsage.length > 100) {
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
        }

        setTimeout(() => this.collectSystemMetrics(), 5000); // Every 5 seconds
    }

    getComponentName(component) {
        if (typeof component === 'function') {
            return component.name || 'AnonymousFunction';
        }
        if (typeof component === 'object' && component) {
            const keys = Object.keys(component);
            return keys.length > 0 ? keys[0] : 'EmptyObject';
        }
        return 'Unknown';
    }

    generateReport() {
        const now = Date.now();
        const uptimeMs = now - this.startTime;

        return {
            summary: {
                uptime: `${(uptimeMs / 1000).toFixed(2)}s`,
                totalRenders: this.metrics.renderTimes.length,
                averageRenderTime: this.calculateAverageRenderTime(),
                errorRate: this.calculateErrorRate(),
                memoryEfficiency: this.calculateMemoryEfficiency()
            },

            performance: {
                renderTimes: this.getRenderTimeStats(),
                topComponents: this.getTopComponentsByUsage(),
                slowestComponents: this.getSlowestComponents(),
                memoryTrends: this.getMemoryTrends()
            },

            caching: globalCache.getStats(),

            recommendations: this.generatePerformanceRecommendations(),

            rawMetrics: {
                recentRenders: this.metrics.renderTimes.slice(-50),
                recentErrors: this.metrics.errors.slice(-10),
                memorySnapshots: this.metrics.memoryUsage.slice(-20)
            }
        };
    }

    calculateAverageRenderTime() {
        if (this.metrics.renderTimes.length === 0) return 0;

        const total = this.metrics.renderTimes.reduce((sum, metric) => sum + metric.renderTime, 0);
        return (total / this.metrics.renderTimes.length).toFixed(2);
    }

    calculateErrorRate() {
        const totalOperations = this.metrics.renderTimes.length + this.metrics.errors.length;
        if (totalOperations === 0) return 0;

        return ((this.metrics.errors.length / totalOperations) * 100).toFixed(2);
    }

    calculateMemoryEfficiency() {
        if (this.metrics.memoryUsage.length < 2) return 'N/A';

        const recent = this.metrics.memoryUsage.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];
        
        // Calculate growth over the recent time period
        const totalGrowth = last.heapUsed - first.heapUsed;
        const timeSpanMs = last.timestamp - first.timestamp;
        const recentRenderCount = this.metrics.renderTimes.filter(
            r => r.timestamp >= first.timestamp && r.timestamp <= last.timestamp
        ).length;
        
        if (recentRenderCount === 0) return 'N/A';
        const growthPerRender = totalGrowth / recentRenderCount;
        
        // Convert to KB for readability
        const growthKB = (growthPerRender / 1024).toFixed(2);
        
        if (Math.abs(growthPerRender) < 1024) {
            return 'Excellent (< 1KB/render in 10s)';
        } else if (Math.abs(growthPerRender) < 10240) {
            return `Good (${growthKB}KB/render in ${timeSpanMs}ms)`;
        } else if (Math.abs(growthPerRender) < 102400) {
            return `Fair (${growthKB}KB/render in ${timeSpanMs}ms)`;
        } else {
            return `Poor (${growthKB}KB/render in ${timeSpanMs}ms)`;
        }
    }

    getRenderTimeStats() {
        if (this.metrics.renderTimes.length === 0) return {};

        const times = this.metrics.renderTimes.map(m => m.renderTime).sort((a, b) => a - b);

        return {
            min: times[0].toFixed(2),
            max: times[times.length - 1].toFixed(2),
            median: times[Math.floor(times.length / 2)].toFixed(2),
            p95: times[Math.floor(times.length * 0.95)].toFixed(2),
            p99: times[Math.floor(times.length * 0.99)].toFixed(2)
        };
    }

    getTopComponentsByUsage(limit = 10) {
        return Array.from(this.metrics.componentCounts.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([component, count]) => ({ component, count }));
    }

    getSlowestComponents(limit = 10) {
        const componentTimes = new Map();

        for (const metric of this.metrics.renderTimes) {
            const existing = componentTimes.get(metric.component) || [];
            existing.push(metric.renderTime);
            componentTimes.set(metric.component, existing);
        }

        return Array.from(componentTimes.entries())
            .map(([component, times]) => ({
                component,
                avgTime: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
                maxTime: Math.max(...times).toFixed(2),
                count: times.length
            }))
            .sort((a, b) => parseFloat(b.avgTime) - parseFloat(a.avgTime))
            .slice(0, limit);
    }

    getMemoryTrends() {
        if (this.metrics.memoryUsage.length < 2) return {};

        const recent = this.metrics.memoryUsage.slice(-20);
        const trend = this.calculateTrend(recent.map(m => m.heapUsed));

        return {
            direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            rate: `${Math.abs(trend).toFixed(2)  } bytes/second`,
            currentHeap: `${(recent[recent.length - 1].heapUsed / 1024 / 1024).toFixed(2)  }MB`,
            trend: trend
        };
    }

    generatePerformanceRecommendations() {
        const recommendations = [];
        const avgRenderTime = parseFloat(this.calculateAverageRenderTime());

        if (avgRenderTime > 10) {
            recommendations.push({
                priority: 'high',
                issue: 'High average render time',
                suggestion: 'Enable caching for frequently rendered components',
                impact: 'Could reduce render time by 70-90%'
            });
        }

        const errorRate = parseFloat(this.calculateErrorRate());
        if (errorRate > 5) {
            recommendations.push({
                priority: 'high',
                issue: 'High error rate',
                suggestion: 'Review component validation and error handling',
                impact: 'Improve stability and user experience'
            });
        }

        const memTrends = this.getMemoryTrends();
        if (memTrends.direction === 'increasing' && memTrends.trend > 1000000) {
            recommendations.push({
                priority: 'medium',
                issue: 'Memory usage increasing',
                suggestion: 'Check for memory leaks, implement cleanup for cached objects',
                impact: 'Prevent out-of-memory errors in production'
            });
        }

        const topComponents = this.getTopComponentsByUsage(5);
        const hotComponents = topComponents.filter(c => c.count > this.metrics.renderTimes.length * 0.1);

        // Filter out components that are already static cached
        const uncachedHotComponents = hotComponents.filter(c => {
            return !this.staticCachedComponents || !this.staticCachedComponents.has(c.component);
        });

        if (uncachedHotComponents.length > 0) {
            recommendations.push({
                priority: 'medium',
                issue: 'High frequency components detected',
                suggestion: `Consider static caching for: ${uncachedHotComponents.map(c => c.component).join(', ')}`,
                impact: 'Significant performance improvement for hot paths'
            });
        } else if (hotComponents.length > 0) {
            // All hot components are already static cached - provide positive feedback
            recommendations.push({
                priority: 'low',
                issue: 'Hot components optimized',
                suggestion: `Static caching active for: ${hotComponents.map(c => c.component).join(', ')}`,
                impact: 'Excellent performance optimization already implemented'
            });
        }

        return recommendations;
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;

        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    // Real-time monitoring interface
    getRealtimeStats() {
        const recent = this.metrics.renderTimes.slice(-10);
        const recentMemory = this.metrics.memoryUsage.slice(-3);

        return {
            currentRenderRate: recent.length > 0 ? `${(recent.length / 10).toFixed(1)  }/s` : '0/s',
            avgRecentRenderTime: recent.length > 0
                ? `${(recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length).toFixed(2)  }ms`
                : '0ms',
            memoryUsage: recentMemory.length > 0
                ? `${(recentMemory[recentMemory.length - 1].heapUsed / 1024 / 1024).toFixed(2)  }MB`
                : '0MB',
            cacheHitRate: globalCache.getStats().hitRate,
            activeComponents: this.metrics.componentCounts.size
        };
    }

    /**
     * Record component render performance
     */
    recordRender(componentName, startTime, endTime, metadata = {}) {
        if (!this.enabled) return;

        const renderTime = endTime - startTime;
        const renderData = {
            component: componentName,
            duration: renderTime,
            timestamp: Date.now(),
            ...metadata
        };

        // Store render time
        this.renderTimes.push(renderData);

        // Update component stats
        if (!this.componentStats.has(componentName)) {
            this.componentStats.set(componentName, {
                renders: 0,
                totalTime: 0,
                avgTime: 0,
                minTime: Infinity,
                maxTime: 0
            });
        }

        const stats = this.componentStats.get(componentName);
        stats.renders++;
        stats.totalTime += renderTime;
        stats.avgTime = stats.totalTime / stats.renders;
        stats.minTime = Math.min(stats.minTime, renderTime);
        stats.maxTime = Math.max(stats.maxTime, renderTime);

        // Cleanup old data (keep last 1000 renders)
        if (this.renderTimes.length > 1000) {
            this.renderTimes = this.renderTimes.slice(-1000);
        }

        // Warning for slow renders
        if (renderTime > this.thresholds.renderTime) {
            console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
        }
    }
}

// Global monitor instance
export const performanceMonitor = new PerformanceMonitor();

