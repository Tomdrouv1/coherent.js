/**
 * Enhanced Error Handling System for Coherent.js
 * Provides detailed error messages and debugging context
 */

/**
 * Custom error types for better debugging
 */
export class CoherentError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'CoherentError';
        this.type = options.type || 'generic';
        this.component = options.component;
        this.context = options.context;
        this.suggestions = options.suggestions || [];
        this.timestamp = Date.now();
        
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CoherentError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            component: this.component,
            context: this.context,
            suggestions: this.suggestions,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

export class ComponentValidationError extends CoherentError {
    constructor(message, component, suggestions = []) {
        super(message, {
            type: 'validation',
            component,
            suggestions: [
                'Check component structure and syntax',
                'Ensure all required properties are present',
                'Validate prop types and values',
                ...suggestions
            ]
        });
        this.name = 'ComponentValidationError';
    }
}

export class RenderingError extends CoherentError {
    constructor(message, component, context, suggestions = []) {
        super(message, {
            type: 'rendering',
            component,
            context,
            suggestions: [
                'Check for circular references',
                'Validate component depth',
                'Ensure all functions return valid components',
                ...suggestions
            ]
        });
        this.name = 'RenderingError';
    }
}

export class PerformanceError extends CoherentError {
    constructor(message, metrics, suggestions = []) {
        super(message, {
            type: 'performance',
            context: metrics,
            suggestions: [
                'Consider component memoization',
                'Reduce component complexity',
                'Enable caching',
                ...suggestions
            ]
        });
        this.name = 'PerformanceError';
    }
}

export class StateError extends CoherentError {
    constructor(message, state, suggestions = []) {
        super(message, {
            type: 'state',
            context: state,
            suggestions: [
                'Check state mutations',
                'Ensure proper state initialization',
                'Validate state transitions',
                ...suggestions
            ]
        });
        this.name = 'StateError';
    }
}

/**
 * Error handler with context-aware reporting
 */
export class ErrorHandler {
    constructor(options = {}) {
        this.options = {
            enableStackTrace: options.enableStackTrace !== false,
            enableSuggestions: options.enableSuggestions !== false,
            enableLogging: options.enableLogging !== false,
            logLevel: options.logLevel || 'error',
            maxErrorHistory: options.maxErrorHistory || 100,
            ...options
        };

        this.errorHistory = [];
        this.errorCounts = new Map();
        this.suppressedErrors = new Set();
    }

    /**
     * Handle and report errors with detailed context
     */
    handle(error, context = {}) {
        // Create enhanced error if it's not already a CoherentError
        const enhancedError = this.enhanceError(error, context);

        // Add to history
        this.addToHistory(enhancedError);

        // Log if enabled
        if (this.options.enableLogging) {
            this.logError(enhancedError);
        }

        // Return enhanced error for potential re-throwing
        return enhancedError;
    }

    /**
     * Enhance existing errors with more context
     */
    enhanceError(error, context = {}) {
        if (error instanceof CoherentError) {
            return error;
        }

        // Determine error type from context
        const errorType = this.classifyError(error, context);
        
        // Create appropriate error type
        switch (errorType) {
            case 'validation':
                return new ComponentValidationError(
                    error.message,
                    context.component,
                    this.generateSuggestions(error, context)
                );

            case 'rendering':
                return new RenderingError(
                    error.message,
                    context.component,
                    context.renderContext,
                    this.generateSuggestions(error, context)
                );

            case 'performance':
                return new PerformanceError(
                    error.message,
                    context.metrics,
                    this.generateSuggestions(error, context)
                );

            case 'state':
                return new StateError(
                    error.message,
                    context.state,
                    this.generateSuggestions(error, context)
                );

            default:
                return new CoherentError(error.message, {
                    type: errorType,
                    component: context.component,
                    context: context.context,
                    suggestions: this.generateSuggestions(error, context)
                });
        }
    }

    /**
     * Classify error type based on message and context
     */
    classifyError(error, context) {
        const message = error.message.toLowerCase();

        // Validation errors
        if (message.includes('invalid') || message.includes('validation') || 
            message.includes('required') || message.includes('type')) {
            return 'validation';
        }

        // Rendering errors
        if (message.includes('render') || message.includes('circular') ||
            message.includes('depth') || message.includes('cannot render')) {
            return 'rendering';
        }

        // Performance errors
        if (message.includes('slow') || message.includes('memory') ||
            message.includes('performance') || message.includes('timeout')) {
            return 'performance';
        }

        // State errors
        if (message.includes('state') || message.includes('mutation') ||
            message.includes('store') || context.state) {
            return 'state';
        }

        // Check context for type hints
        if (context.component) return 'validation';
        if (context.renderContext) return 'rendering';
        if (context.metrics) return 'performance';

        return 'generic';
    }

    /**
     * Generate helpful suggestions based on error
     */
    generateSuggestions(error, context = {}) {
        const suggestions = [];
        const message = error.message.toLowerCase();

        // Common patterns and suggestions
        const patterns = [
            {
                pattern: /cannot render|render.*failed/,
                suggestions: [
                    'Check if component returns a valid object structure',
                    'Ensure all properties are properly defined',
                    'Look for undefined variables or null references'
                ]
            },
            {
                pattern: /circular.*reference/,
                suggestions: [
                    'Remove circular references between components',
                    'Use lazy loading or memoization to break cycles',
                    'Check for self-referencing components'
                ]
            },
            {
                pattern: /maximum.*depth/,
                suggestions: [
                    'Reduce component nesting depth',
                    'Break complex components into smaller parts',
                    'Check for infinite recursion in component functions'
                ]
            },
            {
                pattern: /invalid.*component/,
                suggestions: [
                    'Ensure component follows the expected object structure',
                    'Check property names and values for typos',
                    'Verify component is not null or undefined'
                ]
            },
            {
                pattern: /performance|slow|timeout/,
                suggestions: [
                    'Enable component caching',
                    'Use memoization for expensive operations',
                    'Reduce component complexity',
                    'Consider lazy loading for large components'
                ]
            }
        ];

        // Match patterns and add suggestions
        patterns.forEach(({ pattern, suggestions: patternSuggestions }) => {
            if (pattern.test(message)) {
                suggestions.push(...patternSuggestions);
            }
        });

        // Context-specific suggestions
        if (context.component) {
            const componentType = typeof context.component;
            if (componentType === 'function') {
                suggestions.push('Check function component return value');
            } else if (componentType === 'object' && context.component === null) {
                suggestions.push('Component is null - ensure proper initialization');
            } else if (Array.isArray(context.component)) {
                suggestions.push('Arrays should contain valid component objects');
            }
        }

        // Add debugging tips
        if (suggestions.length === 0) {
            suggestions.push(
                'Enable development tools for more detailed debugging',
                'Check browser console for additional error details',
                'Use component validation tools to identify issues'
            );
        }

        return [...new Set(suggestions)]; // Remove duplicates
    }

    /**
     * Add error to history with deduplication
     */
    addToHistory(error) {
        const errorKey = `${error.name}:${error.message}`;
        
        // Update count
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

        // Add to history
        const historyEntry = {
            ...error.toJSON(),
            count: this.errorCounts.get(errorKey),
            firstSeen: this.errorHistory.find(e => e.key === errorKey)?.firstSeen || error.timestamp,
            key: errorKey
        };

        // Remove old entry if exists
        this.errorHistory = this.errorHistory.filter(e => e.key !== errorKey);
        
        // Add new entry
        this.errorHistory.unshift(historyEntry);

        // Limit history size
        if (this.errorHistory.length > this.options.maxErrorHistory) {
            this.errorHistory = this.errorHistory.slice(0, this.options.maxErrorHistory);
        }
    }

    /**
     * Log error with enhanced formatting
     */
    logError(error) {
        if (this.suppressedErrors.has(`${error.name  }:${  error.message}`)) {
            return;
        }

        const isRepeated = this.errorCounts.get(`${error.name}:${error.message}`) > 1;
        
        // Format error for console
        const errorGroup = `🚨 ${error.name}${isRepeated ? ` (×${this.errorCounts.get(`${error.name  }:${  error.message}`)})` : ''}`;
        
        console.group(errorGroup);
        
        // Main error message
        console.error(`❌ ${error.message}`);
        
        // Component context if available
        if (error.component) {
            console.log('🔍 Component:', this.formatComponent(error.component));
        }
        
        // Additional context
        if (error.context) {
            console.log('📋 Context:', error.context);
        }
        
        // Suggestions
        if (this.options.enableSuggestions && error.suggestions.length > 0) {
            console.group('💡 Suggestions:');
            error.suggestions.forEach((suggestion, index) => {
                console.log(`${index + 1}. ${suggestion}`);
            });
            console.groupEnd();
        }
        
        // Stack trace
        if (this.options.enableStackTrace && error.stack) {
            console.log('📚 Stack trace:', error.stack);
        }
        
        console.groupEnd();
    }

    /**
     * Format component for logging
     */
    formatComponent(component, maxDepth = 2, currentDepth = 0) {
        if (currentDepth > maxDepth) {
            return '[...deep]';
        }

        if (typeof component === 'function') {
            return `[Function: ${component.name || 'anonymous'}]`;
        }

        if (Array.isArray(component)) {
            return component.slice(0, 3).map(item => 
                this.formatComponent(item, maxDepth, currentDepth + 1)
            );
        }

        if (component && typeof component === 'object') {
            const formatted = {};
            const keys = Object.keys(component).slice(0, 5);
            
            for (const key of keys) {
                if (key === 'children' && component[key]) {
                    formatted[key] = this.formatComponent(component[key], maxDepth, currentDepth + 1);
                } else {
                    formatted[key] = component[key];
                }
            }

            if (Object.keys(component).length > 5) {
                formatted['...'] = `(${Object.keys(component).length - 5} more)`;
            }

            return formatted;
        }

        return component;
    }

    /**
     * Suppress specific error types
     */
    suppress(errorPattern) {
        this.suppressedErrors.add(errorPattern);
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
        this.errorCounts.clear();
    }

    /**
     * Get error statistics
     */
    getStats() {
        const errorsByType = {};
        const errorsByTime = {};

        this.errorHistory.forEach(error => {
            // Count by type
            errorsByType[error.type] = (errorsByType[error.type] || 0) + error.count;

            // Count by hour
            const hour = new Date(error.timestamp).toISOString().slice(0, 13);
            errorsByTime[hour] = (errorsByTime[hour] || 0) + error.count;
        });

        return {
            totalErrors: this.errorHistory.reduce((sum, e) => sum + e.count, 0),
            uniqueErrors: this.errorHistory.length,
            errorsByType,
            errorsByTime,
            mostCommonErrors: this.getMostCommonErrors(5),
            recentErrors: this.errorHistory.slice(0, 10)
        };
    }

    /**
     * Get most common errors
     */
    getMostCommonErrors(limit = 10) {
        return this.errorHistory
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
            .map(({ name, message, count, type }) => ({
                name,
                message,
                count,
                type
            }));
    }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler();

/**
 * Convenience functions for common error types
 */
export function throwValidationError(message, component, suggestions = []) {
    throw new ComponentValidationError(message, component, suggestions);
}

export function throwRenderingError(message, component, context, suggestions = []) {
    throw new RenderingError(message, component, context, suggestions);
}

export function throwPerformanceError(message, metrics, suggestions = []) {
    throw new PerformanceError(message, metrics, suggestions);
}

export function throwStateError(message, state, suggestions = []) {
    throw new StateError(message, state, suggestions);
}

/**
 * Try-catch wrapper with enhanced error handling
 */
export function safeExecute(fn, context = {}, fallback = null) {
    try {
        return fn();
    } catch (error) {
        const enhancedError = globalErrorHandler.handle(error, context);
        
        if (fallback !== null) {
            return typeof fallback === 'function' ? fallback(enhancedError) : fallback;
        }
        
        throw enhancedError;
    }
}

/**
 * Async try-catch wrapper
 */
export async function safeExecuteAsync(fn, context = {}, fallback = null) {
    try {
        return await fn();
    } catch (error) {
        const enhancedError = globalErrorHandler.handle(error, context);
        
        if (fallback !== null) {
            return typeof fallback === 'function' ? fallback(enhancedError) : fallback;
        }
        
        throw enhancedError;
    }
}

/**
 * Factory function to create an ErrorHandler instance
 * 
 * @param {Object} options - ErrorHandler configuration
 * @returns {ErrorHandler} ErrorHandler instance
 * 
 * @example
 * const errorHandler = createErrorHandler({
 *   enableTracing: true,
 *   enableSuggestions: true
 * });
 */
export function createErrorHandler(options = {}) {
    return new ErrorHandler(options);
}

export default ErrorHandler;