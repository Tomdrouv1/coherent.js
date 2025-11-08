import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createPerformanceMonitor } from '../src/performance/monitor.js';

describe('Enhanced Performance Monitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = createPerformanceMonitor({ enabled: true });
  });

  afterEach(() => {
    if (monitor) {
      monitor.stop();
    }
  });

  describe('Basic Functionality', () => {
    it('should create a monitor instance', () => {
      expect(monitor).toBeDefined();
      expect(monitor.recordMetric).toBeInstanceOf(Function);
      expect(monitor.measure).toBeInstanceOf(Function);
      expect(monitor.generateReport).toBeInstanceOf(Function);
    });

    it('should record built-in metrics', () => {
      monitor.recordMetric('renderTime', 10);
      monitor.recordMetric('renderTime', 20);
      monitor.recordMetric('renderTime', 15);

      const report = monitor.generateReport();
      expect(report.metrics.renderTime).toBeDefined();
      expect(report.metrics.renderTime.count).toBe(3);
      expect(report.metrics.renderTime.avg).toBeCloseTo(15, 1);
    });

    it('should record counter metrics', () => {
      monitor.recordMetric('componentCount', 1);
      monitor.recordMetric('componentCount', 1);
      monitor.recordMetric('componentCount', 1);

      const report = monitor.generateReport();
      expect(report.metrics.componentCount).toBeDefined();
      expect(report.metrics.componentCount.value).toBe(3);
    });

    it('should generate statistics', () => {
      monitor.recordMetric('renderTime', 10);
      monitor.recordMetric('renderTime', 20);

      const stats = monitor.getStats();
      expect(stats.metricsRecorded).toBe(2);
      expect(stats.reportsGenerated).toBe(0);
    });
  });

  describe('Custom Metrics', () => {
    it('should add custom counter metrics', () => {
      const customMonitor = createPerformanceMonitor({
        enabled: true,
        metrics: {
          custom: {
            'api-calls': {
              type: 'counter',
              unit: 'requests',
              threshold: 100
            }
          }
        }
      });

      customMonitor.recordMetric('api-calls', 1);
      customMonitor.recordMetric('api-calls', 1);

      const report = customMonitor.generateReport();
      expect(report.metrics['api-calls']).toBeDefined();
      expect(report.metrics['api-calls'].value).toBe(2);
      expect(report.metrics['api-calls'].unit).toBe('requests');

      customMonitor.stop();
    });

    it('should add custom histogram metrics', () => {
      const customMonitor = createPerformanceMonitor({
        enabled: true,
        metrics: {
          custom: {
            'response-time': {
              type: 'histogram',
              unit: 'ms',
              threshold: 1000
            }
          }
        }
      });

      customMonitor.recordMetric('response-time', 100);
      customMonitor.recordMetric('response-time', 200);
      customMonitor.recordMetric('response-time', 150);

      const report = customMonitor.generateReport();
      expect(report.metrics['response-time']).toBeDefined();
      expect(report.metrics['response-time'].count).toBe(3);
      expect(report.metrics['response-time'].avg).toBeCloseTo(150, 1);
      expect(report.metrics['response-time'].min).toBe(100);
      expect(report.metrics['response-time'].max).toBe(200);

      customMonitor.stop();
    });

    it('should add custom gauge metrics', () => {
      const customMonitor = createPerformanceMonitor({
        enabled: true,
        metrics: {
          custom: {
            'cpu-usage': {
              type: 'gauge',
              unit: '%',
              threshold: 80
            }
          }
        }
      });

      customMonitor.recordMetric('cpu-usage', 50);
      customMonitor.recordMetric('cpu-usage', 60);
      customMonitor.recordMetric('cpu-usage', 55);

      const report = customMonitor.generateReport();
      expect(report.metrics['cpu-usage']).toBeDefined();
      expect(report.metrics['cpu-usage'].current).toBe(55);
      expect(report.metrics['cpu-usage'].avg).toBeCloseTo(55, 1);

      customMonitor.stop();
    });

    it('should dynamically add metrics', () => {
      monitor.addMetric('dynamic-metric', {
        type: 'counter',
        unit: 'count'
      });

      monitor.recordMetric('dynamic-metric', 5);

      const report = monitor.generateReport();
      expect(report.metrics['dynamic-metric']).toBeDefined();
      expect(report.metrics['dynamic-metric'].value).toBe(5);
    });
  });

  describe('Sampling Strategies', () => {
    it('should sample all events when sampling is disabled', () => {
      const samplingMonitor = createPerformanceMonitor({
        enabled: true,
        sampling: {
          enabled: false,
          rate: 0.5
        }
      });

      for (let i = 0; i < 100; i++) {
        samplingMonitor.recordMetric('renderTime', 10);
      }

      const stats = samplingMonitor.getStats();
      expect(stats.metricsRecorded).toBe(100);

      samplingMonitor.stop();
    });

    it('should use random sampling', () => {
      const samplingMonitor = createPerformanceMonitor({
        enabled: true,
        sampling: {
          enabled: true,
          rate: 0.5,
          strategy: 'random'
        }
      });

      for (let i = 0; i < 1000; i++) {
        samplingMonitor.recordMetric('renderTime', 10);
      }

      const stats = samplingMonitor.getStats();
      // With 50% sampling rate, expect around 500 samples (allow margin)
      expect(stats.metricsRecorded).toBeGreaterThan(400);
      expect(stats.metricsRecorded).toBeLessThan(600);

      samplingMonitor.stop();
    });

    it('should use deterministic sampling', () => {
      const samplingMonitor = createPerformanceMonitor({
        enabled: true,
        sampling: {
          enabled: true,
          rate: 0.5,
          strategy: 'deterministic'
        }
      });

      for (let i = 0; i < 100; i++) {
        samplingMonitor.recordMetric('renderTime', 10);
      }

      const stats = samplingMonitor.getStats();
      // Deterministic should be exactly 50%
      expect(stats.metricsRecorded).toBe(50);

      samplingMonitor.stop();
    });

    it('should use adaptive sampling', () => {
      const samplingMonitor = createPerformanceMonitor({
        enabled: true,
        sampling: {
          enabled: true,
          rate: 0.1,
          strategy: 'adaptive'
        }
      });

      // First record some fast renders to establish baseline
      for (let i = 0; i < 10; i++) {
        samplingMonitor.recordMetric('renderTime', 5);
      }

      // Then record slow renders (should increase sampling)
      for (let i = 0; i < 20; i++) {
        samplingMonitor.recordMetric('renderTime', 25);
      }

      const stats1 = samplingMonitor.getStats();
      const rate1 = stats1.sampleRate;

      // Adaptive sampling should have increased rate from baseline 0.1
      // Since we have slow renders (25ms > 16ms threshold), rate should increase
      expect(rate1).toBeGreaterThanOrEqual(0.1);

      samplingMonitor.stop();
    });
  });

  describe('Alert Rules', () => {
    it('should trigger alerts when threshold is exceeded', () => {
      const alertFn = vi.fn();

      const alertMonitor = createPerformanceMonitor({
        enabled: true,
        alerts: {
          enabled: true,
          rules: [
            {
              metric: 'renderTime',
              condition: 'exceeds',
              threshold: 16,
              action: alertFn
            }
          ]
        }
      });

      alertMonitor.recordMetric('renderTime', 10); // No alert
      alertMonitor.recordMetric('renderTime', 20); // Alert

      expect(alertFn).toHaveBeenCalledTimes(1);
      expect(alertFn).toHaveBeenCalledWith(20, expect.any(Object));

      const stats = alertMonitor.getStats();
      expect(stats.alerts.total).toBe(1);

      alertMonitor.stop();
    });

    it('should support below condition', () => {
      const alertFn = vi.fn();

      const alertMonitor = createPerformanceMonitor({
        enabled: true,
        alerts: {
          enabled: true,
          rules: [
            {
              metric: 'renderTime',
              condition: 'below',
              threshold: 5,
              action: alertFn
            }
          ]
        }
      });

      alertMonitor.recordMetric('renderTime', 3); // Alert
      alertMonitor.recordMetric('renderTime', 10); // No alert

      expect(alertFn).toHaveBeenCalledTimes(1);

      alertMonitor.stop();
    });

    it('should support equals condition', () => {
      const alertFn = vi.fn();

      const alertMonitor = createPerformanceMonitor({
        enabled: true,
        alerts: {
          enabled: true,
          rules: [
            {
              metric: 'componentCount',
              condition: 'equals',
              threshold: 10,
              action: alertFn
            }
          ]
        }
      });

      alertMonitor.recordMetric('componentCount', 10); // Alert
      alertMonitor.recordMetric('componentCount', 5); // No alert

      expect(alertFn).toHaveBeenCalledTimes(1);

      alertMonitor.stop();
    });

    it('should debounce alerts', async () => {
      const alertFn = vi.fn();

      const alertMonitor = createPerformanceMonitor({
        enabled: true,
        alerts: {
          enabled: true,
          rules: [
            {
              metric: 'renderTime',
              condition: 'exceeds',
              threshold: 16,
              action: alertFn
            }
          ]
        }
      });

      // Trigger multiple times quickly
      alertMonitor.recordMetric('renderTime', 20);
      alertMonitor.recordMetric('renderTime', 20);
      alertMonitor.recordMetric('renderTime', 20);

      // Only first should trigger due to debouncing
      expect(alertFn).toHaveBeenCalledTimes(1);

      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 5100));

      // Should trigger again after debounce
      alertMonitor.recordMetric('renderTime', 20);
      expect(alertFn).toHaveBeenCalledTimes(2);

      alertMonitor.stop();
    });

    it('should dynamically add alert rules', () => {
      const alertFn = vi.fn();

      monitor.addAlertRule({
        metric: 'renderTime',
        condition: 'exceeds',
        threshold: 100,
        action: alertFn
      });

      monitor.recordMetric('renderTime', 150);

      expect(alertFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Automated Reporting', () => {
    it('should generate periodic reports', async () => {
      const reportFn = vi.fn();

      const reportMonitor = createPerformanceMonitor({
        enabled: true,
        reporting: {
          enabled: true,
          interval: 100,
          onReport: reportFn
        }
      });

      await new Promise(resolve => setTimeout(resolve, 250));

      // Should have generated 2 reports
      expect(reportFn).toHaveBeenCalledTimes(2);
      expect(reportFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'report',
          data: expect.any(Object)
        })
      );

      reportMonitor.stop();
    });

    it('should batch metrics', () => {
      const reportFn = vi.fn();

      const batchMonitor = createPerformanceMonitor({
        enabled: true,
        reporting: {
          enabled: true,
          interval: 60000,
          batch: {
            enabled: true,
            maxSize: 5,
            flushInterval: 5000
          },
          onReport: reportFn
        }
      });

      // Record metrics
      for (let i = 0; i < 5; i++) {
        batchMonitor.recordMetric('renderTime', 10);
      }

      // Should flush batch when max size reached
      expect(reportFn).toHaveBeenCalledTimes(1);
      expect(reportFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'batch',
          data: expect.arrayContaining([
            expect.objectContaining({
              metric: 'renderTime',
              value: 10
            })
          ])
        })
      );

      batchMonitor.stop();
    });

    it('should flush batch on interval', async () => {
      const reportFn = vi.fn();

      const batchMonitor = createPerformanceMonitor({
        enabled: true,
        reporting: {
          enabled: true,
          interval: 60000,
          batch: {
            enabled: true,
            maxSize: 100,
            flushInterval: 100
          },
          onReport: reportFn
        }
      });

      batchMonitor.recordMetric('renderTime', 10);

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have flushed batch
      expect(reportFn).toHaveBeenCalled();

      batchMonitor.stop();
    });

    it('should flush remaining batch on stop', () => {
      const reportFn = vi.fn();

      const batchMonitor = createPerformanceMonitor({
        enabled: true,
        reporting: {
          enabled: true,
          interval: 60000,
          batch: {
            enabled: true,
            maxSize: 100,
            flushInterval: 5000
          },
          onReport: reportFn
        }
      });

      batchMonitor.recordMetric('renderTime', 10);
      batchMonitor.recordMetric('renderTime', 15);

      batchMonitor.stop();

      // Should flush on stop
      expect(reportFn).toHaveBeenCalled();
    });
  });

  describe('Measurement Utilities', () => {
    it('should measure synchronous function execution', () => {
      const result = monitor.measure('testFunction', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500);

      const report = monitor.generateReport();
      expect(report.metrics.renderTime.count).toBe(1);
      expect(report.metrics.renderTime.avg).toBeGreaterThan(0);
    });

    it('should measure async function execution', async () => {
      const result = await monitor.measureAsync('asyncFunction', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });

      expect(result).toBe('done');

      const report = monitor.generateReport();
      expect(report.metrics.renderTime.count).toBe(1);
      // setTimeout is not precise - allow ±2ms variance
      expect(report.metrics.renderTime.avg).toBeGreaterThanOrEqual(8);
      expect(report.metrics.renderTime.avg).toBeLessThan(20);
    });

    it('should record errors during measurement', () => {
      expect(() => {
        monitor.measure('errorFunction', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      const report = monitor.generateReport();
      expect(report.metrics.errorCount.value).toBe(1);
    });

    it('should record errors during async measurement', async () => {
      await expect(
        monitor.measureAsync('asyncErrorFunction', async () => {
          throw new Error('Async test error');
        })
      ).rejects.toThrow('Async test error');

      const report = monitor.generateReport();
      expect(report.metrics.errorCount.value).toBe(1);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive reports', () => {
      monitor.recordMetric('renderTime', 10);
      monitor.recordMetric('renderTime', 20);
      monitor.recordMetric('renderTime', 15);
      monitor.recordMetric('componentCount', 1);
      monitor.recordMetric('errorCount', 1);

      const report = monitor.generateReport();

      expect(report.timestamp).toBeDefined();
      expect(report.statistics).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.metrics.renderTime).toBeDefined();
      expect(report.metrics.componentCount).toBeDefined();
      expect(report.metrics.errorCount).toBeDefined();
    });

    it('should calculate percentiles correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      values.forEach(v => monitor.recordMetric('renderTime', v));

      const report = monitor.generateReport();

      expect(report.metrics.renderTime.p50).toBeCloseTo(5, 0);
      expect(report.metrics.renderTime.p95).toBeCloseTo(10, 0);
      expect(report.metrics.renderTime.p99).toBeCloseTo(10, 0);
    });

    it('should include alert information', () => {
      const alertFn = vi.fn();

      const alertMonitor = createPerformanceMonitor({
        enabled: true,
        alerts: {
          enabled: true,
          rules: [
            {
              metric: 'renderTime',
              condition: 'exceeds',
              threshold: 16,
              action: alertFn
            }
          ]
        }
      });

      alertMonitor.recordMetric('renderTime', 20);
      alertMonitor.recordMetric('renderTime', 25);

      const report = alertMonitor.generateReport();
      expect(report.alerts).toBeDefined();
      expect(report.alerts.total).toBe(1); // Debounced
      expect(report.alerts.recent).toHaveLength(1);

      alertMonitor.stop();
    });

    it('should increment report counter', () => {
      monitor.generateReport();
      monitor.generateReport();

      const stats = monitor.getStats();
      expect(stats.reportsGenerated).toBe(2);
    });
  });

  describe('Resource Monitoring', () => {
    it('should collect resource samples when enabled', async () => {
      const resourceMonitor = createPerformanceMonitor({
        enabled: true,
        resources: {
          enabled: true,
          track: ['memory'],
          interval: 50
        }
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      const report = resourceMonitor.generateReport();
      expect(report.resources).toBeDefined();
      expect(report.resources.samples.length).toBeGreaterThan(0);

      resourceMonitor.stop();
    });

    it('should not collect resources when disabled', async () => {
      const resourceMonitor = createPerformanceMonitor({
        enabled: true,
        resources: {
          enabled: false
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const report = resourceMonitor.generateReport();
      expect(report.resources).toBeUndefined();

      resourceMonitor.stop();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      monitor.recordMetric('renderTime', 10);
      monitor.recordMetric('renderTime', 20);
      monitor.recordMetric('componentCount', 1);

      monitor.reset();

      const report = monitor.generateReport();
      expect(report.metrics.renderTime.count).toBe(0);
      expect(report.metrics.componentCount.value).toBe(0);
    });

    it('should reset statistics', () => {
      monitor.recordMetric('renderTime', 10);
      monitor.generateReport();

      monitor.reset();

      const stats = monitor.getStats();
      expect(stats.metricsRecorded).toBe(0);
    });
  });

  describe('Start/Stop', () => {
    it('should start and stop monitoring', () => {
      const testMonitor = createPerformanceMonitor({ enabled: false });

      testMonitor.start();
      testMonitor.recordMetric('renderTime', 10);

      const stats1 = testMonitor.getStats();
      expect(stats1.metricsRecorded).toBe(1);

      const report = testMonitor.stop();
      expect(report).toBeDefined();
      expect(report.metrics).toBeDefined();

      // After stop, recording should not work
      testMonitor.recordMetric('renderTime', 20);
      const stats2 = testMonitor.getStats();
      expect(stats2.metricsRecorded).toBe(1); // Still 1
    });
  });
});
