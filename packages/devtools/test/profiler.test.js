/**
 * Tests for DevTools - PerformanceProfiler
 * 
 * Coverage areas:
 * - Profiling sessions
 * - Metrics collection
 * - Performance reporting
 * - Integration with components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceProfiler, createProfiler, measure, profile } from '../src/profiler.js';

describe('PerformanceProfiler', () => {
  let profiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler({
      enabled: true,
      sampleRate: 1,
      maxSamples: 1000
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Profiling Sessions', () => {
    it('should start profiling session', () => {
      const sessionId = profiler.start('test-operation');

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });

    it('should stop profiling session', () => {
      const sessionId = profiler.start('test-operation');
      const result = profiler.stop(sessionId);

      expect(result).toHaveProperty('duration');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should measure operation duration', async () => {
      const sessionId = profiler.start('async-operation');

      await new Promise(resolve => setTimeout(resolve, 10));

      const result = profiler.stop(sessionId);

      expect(result.duration).toBeGreaterThanOrEqual(10);
    });

    it('should track multiple operations', () => {
      const session1 = profiler.start('operation-1');
      const session2 = profiler.start('operation-2');

      profiler.stop(session1);
      profiler.stop(session2);

      const metrics = profiler.getMetrics();

      expect(metrics.totalOperations).toBe(2);
    });

    it('should handle nested profiling sessions', () => {
      const outer = profiler.start('outer-operation');
      const inner = profiler.start('inner-operation');

      profiler.stop(inner);
      profiler.stop(outer);

      const metrics = profiler.getMetrics();

      expect(metrics.totalOperations).toBe(2);
    });
  });

  describe('Metrics Collection', () => {
    it('should collect timing metrics', () => {
      const sessionId = profiler.start('timed-operation');
      profiler.stop(sessionId);

      const metrics = profiler.getMetrics();

      expect(metrics).toHaveProperty('averageDuration');
      expect(metrics).toHaveProperty('totalDuration');
    });

    it('should collect memory metrics', () => {
      const sessionId = profiler.start('memory-operation');
      profiler.stop(sessionId);

      const metrics = profiler.getMetrics();

      expect(metrics).toHaveProperty('memoryUsage');
    });

    it('should calculate statistics', () => {
      // Run multiple operations
      for (let i = 0; i < 10; i++) {
        const sessionId = profiler.start(`operation-${i}`);
        profiler.stop(sessionId);
      }

      const stats = profiler.getStatistics();

      expect(stats).toHaveProperty('mean');
      expect(stats).toHaveProperty('median');
      expect(stats).toHaveProperty('min');
      expect(stats).toHaveProperty('max');
    });

    it('should identify bottlenecks', () => {
      // Fast operation
      const fast = profiler.start('fast-operation');
      profiler.stop(fast);

      // Slow operation
      const slow = profiler.start('slow-operation');
      // Simulate slow operation
      const start = Date.now();
      while (Date.now() - start < 50) {
        // Busy wait
      }
      profiler.stop(slow);

      const bottlenecks = profiler.getBottlenecks();

      expect(bottlenecks.length).toBeGreaterThan(0);
      expect(bottlenecks[0].name).toBe('slow-operation');
    });

    it('should track operation frequency', () => {
      for (let i = 0; i < 5; i++) {
        const sessionId = profiler.start('frequent-operation');
        profiler.stop(sessionId);
      }

      const metrics = profiler.getMetrics();

      expect(metrics.operationCounts['frequent-operation']).toBe(5);
    });
  });

  describe('Performance Reporting', () => {
    it('should generate performance report', () => {
      const sessionId = profiler.start('test-operation');
      profiler.stop(sessionId);

      const report = profiler.generateReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('operations');
      expect(report).toHaveProperty('recommendations');
    });

    it('should export profiling data', () => {
      const sessionId = profiler.start('test-operation');
      profiler.stop(sessionId);

      const exported = profiler.export();

      expect(exported).toHaveProperty('sessions');
      expect(exported).toHaveProperty('metrics');
      expect(exported.sessions).toHaveLength(1);
    });

    it('should format metrics for display', () => {
      const sessionId = profiler.start('test-operation');
      profiler.stop(sessionId);

      const formatted = profiler.formatMetrics();

      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should compare profiles', () => {
      const profile1 = profiler.start('operation-v1');
      profiler.stop(profile1);

      const profile2 = profiler.start('operation-v2');
      profiler.stop(profile2);

      const comparison = profiler.compare(profile1, profile2);

      expect(comparison).toHaveProperty('difference');
      expect(comparison).toHaveProperty('percentChange');
    });

    it('should provide performance recommendations', () => {
      // Create slow operation
      const slow = profiler.start('slow-operation');
      const start = Date.now();
      while (Date.now() - start < 100) {
        // Busy wait
      }
      profiler.stop(slow);

      const recommendations = profiler.getRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('operation');
      expect(recommendations[0]).toHaveProperty('suggestion');
    });
  });

  describe('Integration', () => {
    it('should profile component renders', () => {
      const component = { div: { text: 'Test' } };

      const sessionId = profiler.start('component-render');
      // Simulate render
      JSON.stringify(component);
      profiler.stop(sessionId);

      const metrics = profiler.getMetrics();

      expect(metrics.totalOperations).toBe(1);
    });

    it('should profile API calls', async () => {
      const sessionId = profiler.start('api-call');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 20));

      const result = profiler.stop(sessionId);

      expect(result.duration).toBeGreaterThanOrEqual(20);
    });

    it('should handle profiling errors gracefully', () => {
      expect(() => profiler.stop('non-existent-session')).not.toThrow();
    });
  });

  describe('Helper Functions', () => {
    it('should create profiler with factory function', () => {
      const newProfiler = createProfiler({ enabled: true });

      expect(newProfiler).toBeInstanceOf(PerformanceProfiler);
    });

    it('should use standalone measure function', async () => {
      const result = await measure('test-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      expect(result.value).toBe('result');
      expect(result.duration).toBeGreaterThanOrEqual(10);
    });

    it('should use profile decorator', () => {
      const fn = profile(function testFunction() {
        return 'test';
      });

      const result = fn();

      expect(result).toBe('test');
    });

    it('should handle async functions with measure', async () => {
      const result = await measure('async-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'async-result';
      });

      expect(result.value).toBe('async-result');
      expect(result.duration).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Configuration', () => {
    it('should respect enabled flag', () => {
      const disabledProfiler = new PerformanceProfiler({ enabled: false });

      const sessionId = disabledProfiler.start('test');
      const result = disabledProfiler.stop(sessionId);

      expect(result).toBeNull();
    });

    it('should respect sample rate', () => {
      const sampledProfiler = new PerformanceProfiler({ sampleRate: 0.5 });

      let profiledCount = 0;
      for (let i = 0; i < 100; i++) {
        const sessionId = sampledProfiler.start(`operation-${i}`);
        const result = sampledProfiler.stop(sessionId);
        if (result) profiledCount++;
      }

      // Should be approximately 50% (with some variance)
      expect(profiledCount).toBeGreaterThan(30);
      expect(profiledCount).toBeLessThan(70);
    });

    it('should limit max samples', () => {
      const limitedProfiler = new PerformanceProfiler({ maxSamples: 10 });

      for (let i = 0; i < 20; i++) {
        const sessionId = limitedProfiler.start(`operation-${i}`);
        limitedProfiler.stop(sessionId);
      }

      const metrics = limitedProfiler.getMetrics();

      expect(metrics.totalOperations).toBeLessThanOrEqual(10);
    });
  });
});
