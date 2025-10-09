/**
 * Enhanced Event Bus System for Coherent.js
 * Adds priority, throttling, filtering, and advanced features
 */

// Performance monitor available for future use
// import { performanceMonitor } from '../performance/monitor.js';

/**
 * Throttle helper
 */
function throttle(func, delay) {
  let lastCall = 0;
  let timeoutId = null;
  
  return function throttled(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, args);
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * Debounce helper (available for future use)
 */
// function debounce(func, delay) {
//   let timeoutId = null;
//   
//   return function debounced(...args) {
//     if (timeoutId) clearTimeout(timeoutId);
//     timeoutId = setTimeout(() => {
//       func.apply(this, args);
//     }, delay);
//   };
// }

/**
 * Event Bus with advanced features (backward compatible)
 */
export class EventBus {
  constructor(options = {}) {
    this.listeners = new Map(); // event -> Array of {listener, priority, options}
    this.handlers = new Map();
    this.actionHandlers = new Map();
    this.middleware = [];
    this.throttledEmitters = new Map();
    this.debouncedEmitters = new Map();
    
    this.options = {
      debug: false,
      performance: true,
      maxListeners: 100,
      enableWildcards: true,
      enableAsync: true,
      wildcardSeparator: ':',
      enablePriority: true,
      defaultPriority: 0,
      errorHandler: null,
      filters: {
        allowList: null,  // null means allow all
        blockList: []
      },
      throttle: {
        enabled: false,
        defaultDelay: 100,
        events: {}
      },
      batching: {
        enabled: false,
        maxBatchSize: 10,
        flushInterval: 16
      },
      ...options
    };

    // Performance tracking
    this.stats = {
      eventsEmitted: 0,
      listenersExecuted: 0,
      errorsOccurred: 0,
      averageEmitTime: 0,
      throttledEvents: 0,
      filteredEvents: 0
    };

    // Batching queue
    if (this.options.batching.enabled) {
      this.batchQueue = [];
      this.batchTimer = null;
    }

    // Debug middleware
    if (this.options.debug) {
      this.use((event, data, next) => {
        console.log(`[EventBus] ${event}:`, data);
        next();
      });
    }
  }

  /**
   * Add middleware
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Check if event passes filters
   */
  passesFilters(event) {
    const { allowList, blockList } = this.options.filters;
    
    // Check block list first
    if (blockList && blockList.length > 0) {
      for (const pattern of blockList) {
        if (this.matchPattern(pattern, event)) {
          this.stats.filteredEvents++;
          return false;
        }
      }
    }
    
    // Check allow list if it exists
    if (allowList && allowList.length > 0) {
      for (const pattern of allowList) {
        if (this.matchPattern(pattern, event)) {
          return true;
        }
      }
      this.stats.filteredEvents++;
      return false;
    }
    
    return true;
  }

  /**
   * Match event against pattern
   */
  matchPattern(pattern, event) {
    const sep = this.options.wildcardSeparator;
    const patternParts = pattern.split(sep);
    const eventParts = event.split(sep);
    
    if (pattern.includes('*')) {
      if (patternParts.length !== eventParts.length) {
        return false;
      }
      return patternParts.every((part, i) => part === '*' || part === eventParts[i]);
    }
    
    return pattern === event;
  }

  /**
   * Emit an event
   */
  async emit(event, data = null) {
    // Check filters
    if (!this.passesFilters(event)) {
      if (this.options.debug) {
        console.warn(`[EventBus] Event filtered: ${event}`);
      }
      return;
    }

    // Handle batching
    if (this.options.batching.enabled) {
      return this.addToBatch(event, data);
    }

    // Handle throttling
    if (this.options.throttle.enabled) {
      const throttleDelay = (this.options.throttle.events && this.options.throttle.events[event]) || this.options.throttle.defaultDelay;
      if (throttleDelay > 0) {
        return this.emitThrottled(event, data, throttleDelay);
      }
    }

    return this.emitImmediate(event, data);
  }

  /**
   * Emit immediately without throttling
   */
  async emitImmediate(event, data = null) {
    const startTime = this.options.performance ? performance.now() : 0;

    try {
      // Run middleware
      await this.runMiddleware(event, data);

      // Get listeners (sorted by priority if enabled)
      const listeners = this.getEventListeners(event);

      if (listeners.length === 0) {
        if (this.options.debug) {
          console.warn(`[EventBus] No listeners for event: ${event}`);
        }
        return;
      }

      // Execute listeners
      const promises = listeners.map(listenerObj =>
        this.executeListener(listenerObj.listener, event, data, listenerObj.options)
      );

      if (this.options.enableAsync) {
        await Promise.allSettled(promises);
      } else {
        for (const promise of promises) {
          await promise;
        }
      }

      this.stats.eventsEmitted++;
      this.stats.listenersExecuted += listeners.length;

    } catch (error) {
      this.stats.errorsOccurred++;
      this.handleError(error, event, data);
    } finally {
      if (this.options.performance) {
        const duration = performance.now() - startTime;
        this.updatePerformanceStats(duration);
      }
    }
  }

  /**
   * Emit with throttling
   */
  emitThrottled(event, data, delay) {
    if (!this.throttledEmitters.has(event)) {
      const throttled = throttle((evt, d) => this.emitImmediate(evt, d), delay);
      this.throttledEmitters.set(event, throttled);
    }
    
    this.stats.throttledEvents++;
    return this.throttledEmitters.get(event)(event, data);
  }

  /**
   * Add event to batch queue
   */
  addToBatch(event, data) {
    this.batchQueue.push({ event, data, timestamp: Date.now() });
    
    if (this.batchQueue.length >= this.options.batching.maxBatchSize) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.options.batching.flushInterval);
    }
  }

  /**
   * Flush batch queue
   */
  async flushBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    const batch = this.batchQueue.splice(0);
    
    for (const { event, data } of batch) {
      await this.emitImmediate(event, data);
    }
  }

  /**
   * Register event listener with options
   */
  on(event, listener, options = {}) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event);

    // Check max listeners
    if (listeners.length >= this.options.maxListeners) {
      console.warn(`[EventBus] Max listeners (${this.options.maxListeners}) reached for event: ${event}`);
    }

    // Create listener object
    const listenerId = this.generateListenerId(event);
    const listenerObj = {
      listener,
      listenerId,
      priority: options.priority !== undefined ? options.priority : this.options.defaultPriority,
      condition: options.condition || null,
      timeout: options.timeout || null,
      options
    };

    listener.__listenerId = listenerId;
    listener.__event = event;

    // Insert listener in priority order
    if (this.options.enablePriority) {
      const insertIndex = listeners.findIndex(l => l.priority < listenerObj.priority);
      if (insertIndex === -1) {
        listeners.push(listenerObj);
      } else {
        listeners.splice(insertIndex, 0, listenerObj);
      }
    } else {
      listeners.push(listenerObj);
    }

    return listenerId;
  }

  /**
   * Register one-time listener
   */
  once(event, listener, options = {}) {
    const onceListener = (...args) => {
      this.off(event, onceListener.__listenerId);
      return listener.call(this, ...args);
    };

    // Handle timeout for once listeners
    if (options.timeout) {
      const timeoutId = setTimeout(() => {
        this.off(event, onceListener.__listenerId);
        if (this.options.debug) {
          console.warn(`[EventBus] Listener timeout for event: ${event}`);
        }
      }, options.timeout);
      
      onceListener.__cleanup = () => clearTimeout(timeoutId);
    }

    return this.on(event, onceListener, options);
  }

  /**
   * Remove listener
   */
  off(event, listenerId) {
    if (!this.listeners.has(event)) {
      return false;
    }

    const listeners = this.listeners.get(event);
    const index = listeners.findIndex(l => l.listenerId === listenerId);
    
    if (index !== -1) {
      const listenerObj = listeners[index];
      if (listenerObj.listener.__cleanup) {
        listenerObj.listener.__cleanup();
      }
      listeners.splice(index, 1);
      
      if (listeners.length === 0) {
        this.listeners.delete(event);
      }
      
      return true;
    }

    return false;
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get event listeners with wildcard support
   */
  getEventListeners(event) {
    const listeners = [];

    // Direct listeners
    if (this.listeners.has(event)) {
      listeners.push(...this.listeners.get(event));
    }

    // Wildcard listeners
    if (this.options.enableWildcards) {
      for (const [pattern, patternListeners] of this.listeners) {
        if (pattern.includes('*') && this.matchPattern(pattern, event)) {
          listeners.push(...patternListeners);
        }
      }
    }

    // Sort by priority if enabled
    if (this.options.enablePriority) {
      listeners.sort((a, b) => b.priority - a.priority);
    }

    return listeners;
  }

  /**
   * Execute listener with options
   */
  async executeListener(listener, event, data, options = {}) {
    try {
      // Check condition
      if (options.condition && !options.condition(data)) {
        return;
      }

      const result = listener.call(this, data, event);

      if (result && typeof result.then === 'function') {
        await result;
      }

      return result;
    } catch (error) {
      this.handleError(error, event, data);
    }
  }

  /**
   * Run middleware chain
   */
  async runMiddleware(event, data) {
    if (this.middleware.length === 0) return;

    let index = 0;

    const next = async () => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        await middleware(event, data, next);
      }
    };

    await next();
  }

  /**
   * Handle errors
   */
  handleError(error, event, data) {
    if (this.options.errorHandler) {
      this.options.errorHandler(error, event, data);
    } else if (this.options.debug) {
      console.error(`[EventBus] Error in event ${event}:`, error, data);
    }

    // Emit error event
    this.emitSync('eventbus:error', { error, event, data });
  }

  /**
   * Synchronous emit
   */
  emitSync(event, data = null) {
    try {
      const listeners = this.getEventListeners(event);

      listeners.forEach(listenerObj => {
        try {
          if (!listenerObj.options.condition || listenerObj.options.condition(data)) {
            listenerObj.listener.call(this, data, event);
          }
        } catch (error) {
          this.handleError(error, event, data);
        }
      });

      this.stats.eventsEmitted++;
      this.stats.listenersExecuted += listeners.length;

    } catch (error) {
      this.stats.errorsOccurred++;
      this.handleError(error, event, data);
    }
  }

  /**
   * Register action handler
   */
  registerAction(action, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Action handler must be a function');
    }

    this.actionHandlers.set(action, handler);

    if (this.options.debug) {
      console.log(`[EventBus] Registered action: ${action}`);
    }
  }

  /**
   * Register multiple actions
   */
  registerActions(actions) {
    Object.entries(actions).forEach(([action, handler]) => {
      this.registerAction(action, handler);
    });
  }

  /**
   * Get registered actions
   */
  getRegisteredActions() {
    return Array.from(this.actionHandlers.keys());
  }

  /**
   * Handle action event (called by DOM integration)
   */
  handleAction(action, element, event, data) {
    const handler = this.actionHandlers.get(action);
    
    if (!handler) {
      if (this.options.debug) {
        console.warn(`[EventBus] No handler registered for action: ${action}`);
      }
      return;
    }

    try {
      handler.call(element, {
        element,
        event,
        data,
        emit: this.emit.bind(this),
        emitSync: this.emitSync.bind(this)
      });
    } catch (error) {
      this.handleError(error, `action:${action}`, { element, event, data });
    }
  }

  /**
   * Generate unique listener ID
   */
  generateListenerId(event) {
    return `${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update performance stats
   */
  updatePerformanceStats(duration) {
    const count = this.stats.eventsEmitted;
    this.stats.averageEmitTime = (this.stats.averageEmitTime * (count - 1) + duration) / count;
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      eventsEmitted: 0,
      listenersExecuted: 0,
      errorsOccurred: 0,
      averageEmitTime: 0,
      throttledEvents: 0,
      filteredEvents: 0
    };
  }

  /**
   * Destroy event bus
   */
  destroy() {
    this.removeAllListeners();
    this.actionHandlers.clear();
    this.handlers.clear();
    this.middleware = [];
    this.throttledEmitters.clear();
    this.debouncedEmitters.clear();
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
  }
}

/**
 * Create event bus instance
 */
export function createEventBus(options = {}) {
  return new EventBus(options);
}

/**
 * Global event bus instance
 */
export const globalEventBus = createEventBus();

/**
 * Quick access functions for global event bus
 */
export const emit = globalEventBus.emit.bind(globalEventBus);
export const emitSync = globalEventBus.emitSync.bind(globalEventBus);
export const on = globalEventBus.on.bind(globalEventBus);
export const once = globalEventBus.once.bind(globalEventBus);
export const off = globalEventBus.off.bind(globalEventBus);
export const registerAction = globalEventBus.registerAction.bind(globalEventBus);
export const handleAction = globalEventBus.handleAction.bind(globalEventBus);

export default EventBus;
