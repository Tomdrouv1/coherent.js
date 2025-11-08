/**
 * Coherent.js Development Logger
 * 
 * Advanced logging system for development and debugging
 * 
 * @module devtools/logger
 */

/**
 * Log levels
 */
export const LogLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5
};

/**
 * Development Logger
 * Provides structured logging with filtering and formatting
 */
export class DevLogger {
  constructor(options = {}) {
    this.options = {
      level: options.level !== undefined ? options.level : LogLevel.INFO,
      prefix: '[Coherent]',
      timestamp: true,
      colors: true,
      maxLogs: 1000,
      maxBufferSize: options.maxBufferSize || 1000,
      grouping: true,
      buffer: options.buffer || false,
      sampleRate: options.sampleRate !== undefined ? options.sampleRate : 1.0,
      silent: options.silent || false,
      output: options.output || null,
      categories: options.categories || null,
      filter: options.filter || null,
      ...options
    };
    
    this.logs = [];
    this.groups = [];
    this.filters = [];
    this.handlers = [];
    this.context = {};
  }

  /**
   * Generic log method (supports category logging)
   */
  log(categoryOrLevel, messageOrData, data) {
    // Support log(category, message) signature
    if (typeof categoryOrLevel === 'string' && typeof messageOrData === 'string') {
      return this.logWithLevel(LogLevel.INFO, messageOrData, { category: categoryOrLevel, ...data });
    }
    // Support log(level, message, data) signature
    return this.logWithLevel(categoryOrLevel, messageOrData, data);
  }

  /**
   * Log a trace message
   */
  trace(message, data = {}) {
    return this.logWithLevel(LogLevel.TRACE, message, data);
  }

  /**
   * Log a debug message
   */
  debug(message, data = {}) {
    return this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   */
  info(message, data = {}) {
    return this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning
   */
  warn(message, data = {}) {
    return this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error
   */
  error(message, data = {}) {
    if (data instanceof Error) {
      data = {
        message: data.message,
        stack: data.stack,
        name: data.name,
        ...data
      };
    }
    return this.logWithLevel(LogLevel.ERROR, message, data);
  }

  /**
   * Log a fatal error
   */
  fatal(message, data = {}) {
    return this.log(LogLevel.FATAL, message, data);
  }

  /**
   * Core logging function
   */
  logWithLevel(level, message, data = {}) {
    // Apply sampling
    if (this.options.sampleRate < 1.0 && Math.random() > this.options.sampleRate) {
      return;
    }

    // Check if level is enabled
    if (level < this.options.level) {
      return;
    }

    // Apply filters
    if (!this.shouldLog(level, message, data)) {
      return;
    }

    // Merge context with data
    const mergedData = { ...this.context, ...data };

    const logEntry = {
      id: this.generateId(),
      level,
      levelName: this.getLevelName(level),
      message,
      data: mergedData,
      timestamp: Date.now(),
      group: this.groups.length > 0 ? this.groups[this.groups.length - 1] : null,
      stack: level >= LogLevel.ERROR ? new Error().stack : null
    };

    // Store log (always store for history/export)
    this.logs.push(logEntry);
    
    // Limit log size (rotation)
    const maxSize = this.options.buffer ? this.options.maxBufferSize : this.options.maxLogs;
    if (this.logs.length > maxSize) {
      this.logs.shift();
    }

    // Call handlers
    this.handlers.forEach(handler => {
      try {
        handler(logEntry);
      } catch (error) {
        console.error('Error in log handler:', error);
      }
    });

    // Output to console
    this.output(logEntry);

    return logEntry;
  }

  /**
   * Output log to console
   */
  output(logEntry) {
    const parts = [];

    // Timestamp
    if (this.options.timestamp) {
      const date = new Date(logEntry.timestamp);
      parts.push(`[${date.toISOString()}]`);
    }

    // Prefix
    if (this.options.prefix) {
      parts.push(this.options.prefix);
    }

    // Level
    parts.push(`[${logEntry.levelName}]`);

    // Group
    if (logEntry.group) {
      parts.push(`[${logEntry.group}]`);
    }

    // Message
    parts.push(logEntry.message);

    // Add context data to output if present
    const contextKeys = Object.keys(logEntry.data);
    if (contextKeys.length > 0) {
      const contextStr = contextKeys.map(key => `${key}=${logEntry.data[key]}`).join(' ');
      parts.push(`{${contextStr}}`);
    }

    const output = parts.join(' ');

    // Skip output if silent mode
    if (this.options.silent) {
      return;
    }

    // Use custom output handler if provided
    if (this.options.output) {
      this.options.output(logEntry);
      return;
    }

    // Console output
    if (typeof console !== 'undefined') {
      switch (logEntry.level) {
        case LogLevel.TRACE:
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          console.log(output, logEntry.data);
          break;
        case LogLevel.WARN:
          console.warn(output, logEntry.data);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(output, logEntry.data);
          if (logEntry.stack) {
            console.error(logEntry.stack);
          }
          break;
      }
    } else {
      console.log(output, logEntry.data);
    }
  }

  /**
   * Get color style for log level
   */
  getColorStyle(level) {
    const styles = {
      [LogLevel.TRACE]: 'color: gray',
      [LogLevel.DEBUG]: 'color: blue',
      [LogLevel.INFO]: 'color: green',
      [LogLevel.WARN]: 'color: orange',
      [LogLevel.ERROR]: 'color: red',
      [LogLevel.FATAL]: 'color: red; font-weight: bold'
    };
    return styles[level] || '';
  }

  /**
   * Get level name
   */
  getLevelName(level) {
    const names = {
      [LogLevel.TRACE]: 'TRACE',
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.FATAL]: 'FATAL'
    };
    return names[level] || 'UNKNOWN';
  }

  /**
   * Check if log should be output
   */
  shouldLog(level, message, data) {
    // Check custom filter option
    if (this.options.filter && !this.options.filter(message, data)) {
      return false;
    }

    // Check category filter
    if (this.options.categories && data.category) {
      if (!this.options.categories.includes(data.category)) {
        return false;
      }
    }

    // Check registered filters
    if (this.filters.length > 0) {
      return this.filters.every(filter => filter(level, message, data));
    }

    return true;
  }

  /**
   * Add a filter
   */
  addFilter(filter) {
    this.filters.push(filter);
  }

  /**
   * Remove a filter
   */
  removeFilter(filter) {
    const index = this.filters.indexOf(filter);
    if (index > -1) {
      this.filters.splice(index, 1);
    }
  }

  /**
   * Add a log handler
   */
  addHandler(handler) {
    this.handlers.push(handler);
  }

  /**
   * Remove a log handler
   */
  removeHandler(handler) {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * Start a log group
   */
  group(name) {
    this.groups.push(name);
    
    if (typeof console !== 'undefined' && console.group) {
      console.group(name);
    }
  }

  /**
   * End a log group
   */
  groupEnd() {
    this.groups.pop();
    
    if (typeof console !== 'undefined' && console.groupEnd) {
      console.groupEnd();
    }
  }

  /**
   * Get all logs
   */
  getLogs(filter = {}) {
    let results = [...this.logs];

    if (filter.level !== undefined) {
      results = results.filter(log => log.level >= filter.level);
    }

    if (filter.group) {
      results = results.filter(log => log.group === filter.group);
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      results = results.filter(log => 
        log.message.toLowerCase().includes(search) ||
        JSON.stringify(log.data).toLowerCase().includes(search)
      );
    }

    if (filter.limit) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  /**
   * Get log statistics
   */
  getStats() {
    const byLevel = {};
    
    Object.values(LogLevel).forEach(level => {
      byLevel[this.getLevelName(level)] = 0;
    });

    this.logs.forEach(log => {
      byLevel[log.levelName]++;
    });

    return {
      total: this.logs.length,
      byLevel,
      groups: [...new Set(this.logs.map(l => l.group).filter(Boolean))],
      timeRange: this.logs.length > 0 ? {
        start: this.logs[0].timestamp,
        end: this.logs[this.logs.length - 1].timestamp,
        duration: this.logs[this.logs.length - 1].timestamp - this.logs[0].timestamp
      } : null
    };
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    this.groups = [];
  }

  /**
   * Set log level
   */
  setLevel(level) {
    this.options.level = level;
  }

  /**
   * Export logs
   */
  export(format = 'array') {
    if (format === 'array' || !format) {
      // Return array of log objects for tests
      return this.logs.map(log => ({
        level: log.levelName,
        message: log.message,
        timestamp: log.timestamp,
        data: log.data
      }));
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(this.logs, null, 2);
      
      case 'csv':
        const headers = ['timestamp', 'level', 'group', 'message', 'data'];
        const rows = this.logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.levelName,
          log.group || '',
          log.message,
          JSON.stringify(log.data)
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      
      case 'text':
        return this.logs.map(log => {
          const date = new Date(log.timestamp).toISOString();
          const group = log.group ? `[${log.group}]` : '';
          return `${date} [${log.levelName}] ${group} ${log.message} ${JSON.stringify(log.data)}`;
        }).join('\n');
      
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  /**
   * Create a logger with additional context
   */
  withContext(context) {
    const contextLogger = new DevLogger(this.options);
    contextLogger.context = { ...this.context, ...context };
    contextLogger.logs = this.logs; // Share log buffer
    contextLogger.groups = this.groups;
    contextLogger.filters = this.filters;
    contextLogger.handlers = this.handlers;
    return contextLogger;
  }

  /**
   * Log a table
   */
  table(data) {
    if (typeof console !== 'undefined' && console.table) {
      console.table(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Start a timer
   */
  time(label) {
    if (typeof console !== 'undefined' && console.time) {
      console.time(label);
    }
  }

  /**
   * End a timer
   */
  timeEnd(label) {
    if (typeof console !== 'undefined' && console.timeEnd) {
      console.timeEnd(label);
    }
  }

  /**
   * Get log buffer
   */
  getBuffer() {
    return this.logs;
  }

  /**
   * Flush buffered logs
   */
  flush() {
    // Output all buffered logs
    this.logs.forEach(log => {
      this.output(log);
    });
  }

  /**
   * Clear buffer
   */
  clearBuffer() {
    this.logs = [];
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `log-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Create a logger
 */
export function createLogger(options = {}) {
  return new DevLogger(options);
}

/**
 * Create a component logger
 */
export function createComponentLogger(componentName, options = {}) {
  const logger = new DevLogger({
    prefix: `[${componentName}]`,
    ...options
  });

  // Add perf method for component performance logging
  logger.perf = (operation, duration) => {
    logger.info(`${operation} completed in ${duration}ms`);
  };

  // Add lifecycle method for component lifecycle logging
  logger.lifecycle = (event) => {
    logger.info(`Lifecycle: ${event}`);
  };

  return logger;
}

/**
 * Create a console logger (simple wrapper)
 */
export function createConsoleLogger(prefix = '') {
  return {
    trace: (...args) => console.debug(prefix, ...args),
    debug: (...args) => console.debug(prefix, ...args),
    info: (...args) => console.info(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
    fatal: (...args) => console.error(prefix, 'FATAL:', ...args)
  };
}

export default {
  DevLogger,
  LogLevel,
  createLogger,
  createComponentLogger,
  createConsoleLogger
};
