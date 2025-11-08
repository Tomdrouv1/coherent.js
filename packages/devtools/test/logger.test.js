/**
 * Tests for DevTools - DevLogger
 * 
 * Coverage areas:
 * - Logging levels
 * - Filtering and formatting
 * - Output handling
 * - Component logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DevLogger, LogLevel, createLogger, createComponentLogger } from '../src/logger.js';

describe('DevLogger', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = new DevLogger({
      level: LogLevel.TRACE,
      timestamp: true,
      colors: false
    });

    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logging Levels', () => {
    it('should log trace messages', () => {
      logger.trace('Trace message');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      logger.debug('Debug message');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Info message');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log warnings', () => {
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log errors', () => {
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log fatal errors', () => {
      logger.fatal('Fatal error');

      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Filtering', () => {
    it('should filter by log level', () => {
      const warnLogger = new DevLogger({ level: LogLevel.WARN });

      warnLogger.debug('Debug message');
      warnLogger.warn('Warning message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should filter by category', () => {
      const categorizedLogger = new DevLogger({
        categories: ['component', 'api']
      });

      categorizedLogger.log('component', 'Component log');
      categorizedLogger.log('database', 'Database log');

      // Should only log 'component' category
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it('should apply custom filters', () => {
      const filteredLogger = new DevLogger({
        filter: (message) => !message.includes('ignore')
      });

      filteredLogger.info('Important message');
      filteredLogger.info('ignore this message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it('should respect silent mode', () => {
      const silentLogger = new DevLogger({ silent: true });

      silentLogger.info('This should not appear');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('Formatting', () => {
    it('should format log messages', () => {
      logger.info('Test message');

      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('Test message');
    });

    it('should include timestamps', () => {
      const timestampLogger = new DevLogger({ timestamp: true });

      timestampLogger.info('Message with timestamp');

      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toMatch(/\d{4}-\d{2}-\d{2}/); // Date pattern
    });

    it('should include stack traces for errors', () => {
      const error = new Error('Test error');

      logger.error('Error occurred', error);

      const call = consoleSpy.error.mock.calls[0];
      expect(call.some(arg => (typeof arg === 'string' && arg.includes('stack')) || (arg && arg.stack))).toBe(true);
    });

    it('should format objects', () => {
      const obj = { key: 'value', nested: { prop: 123 } };

      logger.info('Object:', obj);

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle circular references', () => {
      const circular = { name: 'test' };
      circular.self = circular;

      expect(() => logger.info('Circular:', circular)).not.toThrow();
    });
  });

  describe('Output Handling', () => {
    it('should write to console by default', () => {
      logger.info('Console message');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should support custom output handlers', () => {
      const customOutput = vi.fn();
      const customLogger = new DevLogger({
        output: customOutput
      });

      customLogger.info('Custom output');

      expect(customOutput).toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should buffer logs when needed', () => {
      const bufferedLogger = new DevLogger({ buffer: true });

      bufferedLogger.info('Message 1');
      bufferedLogger.info('Message 2');

      const buffer = bufferedLogger.getBuffer();

      expect(buffer).toHaveLength(2);
    });

    it('should flush buffered logs', () => {
      const bufferedLogger = new DevLogger({ buffer: true });

      bufferedLogger.info('Buffered message');
      bufferedLogger.flush();

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should clear buffer', () => {
      const bufferedLogger = new DevLogger({ buffer: true });

      bufferedLogger.info('Message');
      bufferedLogger.clearBuffer();

      const buffer = bufferedLogger.getBuffer();

      expect(buffer).toHaveLength(0);
    });
  });

  describe('Component Logging', () => {
    it('should create component-specific logger', () => {
      const componentLogger = createComponentLogger('MyComponent');

      componentLogger.info('Component message');

      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('MyComponent');
    });

    it('should track component lifecycle', () => {
      const componentLogger = createComponentLogger('MyComponent');

      componentLogger.lifecycle('mounted');
      componentLogger.lifecycle('updated');
      componentLogger.lifecycle('unmounted');

      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
    });

    it('should log component errors', () => {
      const componentLogger = createComponentLogger('MyComponent');

      componentLogger.error('Component error');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log component performance', () => {
      const componentLogger = createComponentLogger('MyComponent');

      componentLogger.perf('render', 15.5);

      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    it('should create logger with factory function', () => {
      const newLogger = createLogger({ level: LogLevel.INFO });

      expect(newLogger).toBeInstanceOf(DevLogger);
    });

    it('should support log groups', () => {
      logger.group('Test Group');
      logger.info('Inside group');
      logger.groupEnd();

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should support log tables', () => {
      const data = [
        { name: 'Item 1', value: 100 },
        { name: 'Item 2', value: 200 }
      ];

      logger.table(data);

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should measure time', () => {
      logger.time('operation');
      logger.timeEnd('operation');

      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('Advanced Features', () => {
    it('should support log contexts', () => {
      const contextLogger = logger.withContext({ userId: '123', requestId: 'abc' });

      contextLogger.info('Contextual message');

      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('userId');
    });

    it('should support log sampling', () => {
      const sampledLogger = new DevLogger({ sampleRate: 0.5 });

      let loggedCount = 0;
      for (let i = 0; i < 100; i++) {
        sampledLogger.info(`Message ${i}`);
        if (consoleSpy.log.mock.calls.length > loggedCount) {
          loggedCount++;
        }
      }

      // Should be approximately 50% (with variance)
      expect(loggedCount).toBeGreaterThan(30);
      expect(loggedCount).toBeLessThan(70);
    });

    it('should export logs', () => {
      const exportLogger = new DevLogger({ buffer: true });

      exportLogger.info('Message 1');
      exportLogger.warn('Warning');
      exportLogger.error('Error');

      const exported = exportLogger.export();

      expect(exported).toHaveLength(3);
      expect(exported[0]).toHaveProperty('level');
      expect(exported[0]).toHaveProperty('message');
      expect(exported[0]).toHaveProperty('timestamp');
    });

    it('should handle log rotation', () => {
      const rotatingLogger = new DevLogger({
        buffer: true,
        maxBufferSize: 5
      });

      for (let i = 0; i < 10; i++) {
        rotatingLogger.info(`Message ${i}`);
      }

      const buffer = rotatingLogger.getBuffer();

      expect(buffer.length).toBeLessThanOrEqual(5);
    });
  });
});
