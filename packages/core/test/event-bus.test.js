import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEventBus } from '../src/events/event-bus.js';

describe('Event Bus System', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = createEventBus({ 
      debug: false, 
      performance: false,
      enablePriority: false  // Keep backward compatibility by default
    });
  });

  describe('Basic Event Emission', () => {
    it('should emit and listen to events', async () => {
      const listener = vi.fn();
      eventBus.on('test-event', listener);
      
      await eventBus.emit('test-event', { data: 'test' });
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ data: 'test' }, 'test-event');
    });

    it('should handle multiple listeners for same event', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      eventBus.on('multi-event', listener1);
      eventBus.on('multi-event', listener2);
      
      await eventBus.emit('multi-event', { value: 42 });
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should not call listeners for different events', async () => {
      const listener = vi.fn();
      eventBus.on('event-a', listener);
      
      await eventBus.emit('event-b', {});
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Management', () => {
    it('should remove specific listener with off()', async () => {
      const listener = vi.fn();
      const listenerId = eventBus.on('remove-test', listener);
      eventBus.off('remove-test', listenerId);
      
      await eventBus.emit('remove-test', {});
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove all listeners for an event', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      eventBus.on('clear-event', listener1);
      eventBus.on('clear-event', listener2);
      eventBus.removeAllListeners('clear-event');
      
      await eventBus.emit('clear-event', {});
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should handle once() for one-time listeners', async () => {
      const listener = vi.fn();
      eventBus.once('once-event', listener);
      
      await eventBus.emit('once-event', {});
      await eventBus.emit('once-event', {});
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Wildcard Events', () => {
    it('should support wildcard listeners with *', async () => {
      const listener = vi.fn();
      eventBus.on('user:*', listener);
      
      await eventBus.emit('user:created', { id: 1 });
      await eventBus.emit('user:updated', { id: 1 });
      
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should support wildcard with multiple segments', async () => {
      const listener = vi.fn();
      eventBus.on('app:*:action', listener);
      
      await eventBus.emit('app:user:action', {});
      await eventBus.emit('app:post:action', {});
      
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('Middleware System', () => {
    it('should execute middleware before listeners', async () => {
      const order = [];
      
      eventBus.use((event, data, next) => {
        order.push('middleware');
        next();
      });
      
      eventBus.on('middleware-test', () => {
        order.push('listener');
      });
      
      await eventBus.emit('middleware-test', {});
      
      expect(order).toEqual(['middleware', 'listener']);
    });

    it('should allow middleware to modify data', async () => {
      eventBus.use((event, data, next) => {
        data.modified = true;
        next();
      });
      
      const listener = vi.fn();
      eventBus.on('modify-test', listener);
      
      await eventBus.emit('modify-test', { original: true });
      
      expect(listener).toHaveBeenCalledWith({ original: true, modified: true }, 'modify-test');
    });

    it('should support multiple middleware in chain', async () => {
      const order = [];
      
      eventBus.use((event, data, next) => {
        order.push('middleware1');
        next();
      });
      
      eventBus.use((event, data, next) => {
        order.push('middleware2');
        next();
      });
      
      eventBus.on('chain-test', () => {
        order.push('listener');
      });
      
      await eventBus.emit('chain-test', {});
      
      expect(order).toEqual(['middleware1', 'middleware2', 'listener']);
    });
  });

  describe('Error Handling', () => {
    it('should catch errors in listeners', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      
      eventBus.on('error-test', errorListener);
      eventBus.on('error-test', normalListener);
      
      await eventBus.emit('error-test', {});
      
      // Should still call other listeners despite error
      expect(normalListener).toHaveBeenCalled();
    });

    it('should emit error events when errors occur', async () => {
      const errorHandler = vi.fn();
      eventBus.on('eventbus:error', errorHandler);
      
      eventBus.on('error-event', () => {
        throw new Error('Test error');
      });
      
      await eventBus.emit('error-event', {});
      
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Performance Tracking', () => {
    it('should track events emitted', async () => {
      eventBus.on('perf-event', () => {});
      
      await eventBus.emit('perf-event', {});
      await eventBus.emit('perf-event', {});
      
      const stats = eventBus.getStats();
      expect(stats.eventsEmitted).toBe(2);
    });

    it('should track listeners executed', async () => {
      eventBus.on('multi-listener', () => {});
      eventBus.on('multi-listener', () => {});
      eventBus.on('multi-listener', () => {});
      
      await eventBus.emit('multi-listener', {});
      
      const stats = eventBus.getStats();
      expect(stats.listenersExecuted).toBe(3);
    });
  });

  describe('Action Handlers', () => {
    it('should register action handlers', () => {
      const handler = vi.fn();
      eventBus.registerAction('test-action', handler);
      
      const actions = eventBus.getRegisteredActions();
      expect(actions).toContain('test-action');
    });

    it('should register multiple actions at once', () => {
      eventBus.registerActions({
        'action1': vi.fn(),
        'action2': vi.fn()
      });
      
      const actions = eventBus.getRegisteredActions();
      expect(actions).toContain('action1');
      expect(actions).toContain('action2');
    });
  });

  describe('Max Listeners Warning', () => {
    it('should warn when exceeding max listeners', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const bus = createEventBus({ maxListeners: 2 });
      
      bus.on('test', () => {});
      bus.on('test', () => {});
      bus.on('test', () => {}); // Should trigger warning
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Clear All Listeners', () => {
    it('should clear all event listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      eventBus.on('event1', listener1);
      eventBus.on('event2', listener2);
      
      eventBus.removeAllListeners();
      
      await eventBus.emit('event1', {});
      await eventBus.emit('event2', {});
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Enhanced Features', () => {
    describe('Priority-based Listeners', () => {
      it('should execute listeners in priority order when enabled', async () => {
        const bus = createEventBus({ enablePriority: true });
        const order = [];
        
        bus.on('test', () => order.push('low'), { priority: -10 });
        bus.on('test', () => order.push('high'), { priority: 100 });
        bus.on('test', () => order.push('medium'), { priority: 50 });
        
        await bus.emit('test');
        
        expect(order).toEqual(['high', 'medium', 'low']);
      });
    });

    describe('Event Filtering', () => {
      it('should block events in blockList', async () => {
        const bus = createEventBus({
          filters: {
            blockList: ['internal:*']
          }
        });
        
        const listener = vi.fn();
        bus.on('internal:test', listener);
        
        await bus.emit('internal:test');
        
        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe('Throttling', () => {
      it('should throttle events when enabled', async () => {
        const bus = createEventBus({
          throttle: {
            enabled: true,
            defaultDelay: 50
          }
        });
        
        const listener = vi.fn();
        bus.on('scroll', listener);
        
        await bus.emit('scroll');
        await bus.emit('scroll');
        await bus.emit('scroll');
        
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });

    describe('Conditional Listeners', () => {
      it('should only execute when condition is met', async () => {
        const listener = vi.fn();
        
        eventBus.on('user:action', listener, {
          condition: (data) => data.userId === 123
        });
        
        await eventBus.emit('user:action', { userId: 456 });
        expect(listener).not.toHaveBeenCalled();
        
        await eventBus.emit('user:action', { userId: 123 });
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
  });
});
