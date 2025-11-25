/**
 * Enhanced Error Context for Coherent.js
 *
 * Provides detailed, actionable error messages for functional component debugging:
 * - Component tree context when errors occur
 * - Prop validation with helpful suggestions
 * - Performance-related error insights
 * - Fix suggestions based on common patterns
 *
 * @module EnhancedErrors
 */

import { isCoherentObject, hasChildren } from '../../core/src/core/object-utils.js';

export class EnhancedErrorHandler {
  constructor(options = {}) {
    this.options = {
      maxContextDepth: options.maxContextDepth || 5,
      includeStackTrace: options.includeStackTrace !== false,
      showSuggestions: options.showSuggestions !== false,
      colorOutput: options.colorOutput !== false,
      ...options
    };

    this.errorHistory = [];
    this.commonPatterns = this.initializeCommonPatterns();
  }

  /**
   * Handle and enhance an error with component context
   */
  handleError(error, component = null, context = {}) {
    const enhancedError = {
      originalError: error,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      component: component ? this.analyzeComponent(component) : null,
      context,
      suggestions: [],
      severity: this.determineSeverity(error),
      category: this.categorizeError(error)
    };

    // Add component context
    if (component) {
      enhancedError.componentContext = this.getComponentContext(component, context.path || []);
      enhancedError.propValidation = this.validateProps(component);
    }

    // Generate suggestions
    if (this.options.showSuggestions) {
      enhancedError.suggestions = this.generateSuggestions(enhancedError);
    }

    // Add to history
    this.errorHistory.push(enhancedError);
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }

    return enhancedError;
  }

  /**
   * Analyze component structure
   */
  analyzeComponent(component) {
    const analysis = {
      type: this.getComponentType(component),
      isValid: this.isValidComponent(component),
      complexity: this.assessComplexity(component),
      hasDynamicContent: this.hasDynamicContent(component),
      estimatedSize: this.estimateSize(component)
    };

    if (isCoherentObject(component)) {
      const entries = Object.entries(component);
      if (entries.length === 1) {
        const [_tagName, props] = entries;
        analysis.tagName = _tagName;
        analysis.propCount = Object.keys(props).length;
        analysis.hasChildren = hasChildren(props);
        analysis.eventHandlers = this.extractEventHandlers(props);
      }
    }

    return analysis;
  }

  /**
   * Get component context tree
   */
  getComponentContext(component, path = []) {
    const context = {
      path: path.join('.'),
      depth: path.length,
      component: this.summarizeComponent(component),
      children: []
    };

    if (isCoherentObject(component) && context.depth < this.options.maxContextDepth) {
      const entries = Object.entries(component);
      if (entries.length === 1) {
        const [tagName, props] = entries;

        if (hasChildren(props)) {
          const children = Array.isArray(props.children) ? props.children : [props.children];
          children.forEach((child, index) => {
            if (child && typeof child === 'object') {
              const childContext = this.getComponentContext(child, [...path, `${tagName}[${index}]`]);
              context.children.push(childContext);
            }
          });
        }
      }
    }

    return context;
  }

  /**
   * Validate component props
   */
  validateProps(component) {
    if (!isCoherentObject(component)) return { valid: true, issues: [] };

    const entries = Object.entries(component);
    if (entries.length !== 1) return { valid: false, issues: ['Component must have exactly one root element'] };

    const [tagName, props] = entries;
    const issues = [];
    const warnings = [];

    // Check for common prop issues
    Object.entries(props).forEach(([key, value]) => {
      // Check for undefined props
      if (value === undefined) {
        issues.push(`Prop '${key}' is undefined`);
      }

      // Check for null props that might cause issues
      if (value === null && key !== 'children' && key !== 'text') {
        warnings.push(`Prop '${key}' is null`);
      }

      // Check for event handlers
      if (typeof value === 'function' && !/^on[A-Z]/.test(key)) {
        warnings.push(`Function prop '${key}' doesn't follow event handler naming convention (onXxx)`);
      }

      // Check for potentially large objects
      if (typeof value === 'object' && value !== null) {
        const size = JSON.stringify(value).length;
        if (size > 10000) {
          warnings.push(`Prop '${key}' is large (${size} bytes) - consider optimizing`);
        }
      }
    });

    // Check for missing required props
    if (tagName === 'img' && !props.src && !props['data-src']) {
      issues.push('Image element missing required src or data-src prop');
    }

    if (tagName === 'a' && !props.href && !props.onclick) {
      warnings.push('Link element missing href or onclick prop');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      propCount: Object.keys(props).length
    };
  }

  /**
   * Generate fix suggestions based on error and context
   */
  generateSuggestions(enhancedError) {
    const suggestions = [];
    const { originalError, component, category } = enhancedError;

    // Component-specific suggestions
    if (component && component.type === 'element') {
      if (component.hasDynamicContent && category === 'performance') {
        suggestions.push({
          type: 'optimization',
          message: 'Consider making this component static for better caching',
          code: 'Remove functions from props to enable static optimization'
        });
      }

      if (component.complexity > 10) {
        suggestions.push({
          type: 'structure',
          message: 'Component is complex - consider breaking it into smaller components',
          code: 'Split complex components into reusable functional components'
        });
      }
    }

    // Error-specific suggestions
    if (originalError && originalError.message && originalError.message.includes('undefined')) {
      suggestions.push({
        type: 'fix',
        message: 'Check for undefined props or missing data',
        code: 'Add prop validation: if (!props.required) return null;'
      });
    }

    if (originalError && originalError.message && originalError.message.includes('Maximum render depth')) {
      suggestions.push({
        type: 'fix',
        message: 'Possible infinite recursion detected',
        code: 'Check for circular references in component props'
      });
    }

    // Pattern-based suggestions
    this.commonPatterns.forEach(pattern => {
      if (originalError && originalError.message && pattern.matcher.test(originalError.message)) {
        suggestions.push(pattern.suggestion);
      }
    });

    return suggestions;
  }

  /**
   * Format enhanced error for display
   */
  formatError(enhancedError) {
    const lines = [];

    // Header
    if (this.options.colorOutput) {
      lines.push(this.colorize('❌ Coherent.js Error', 'red'));
      lines.push(this.colorize('─'.repeat(40), 'red'));
    } else {
      lines.push('❌ Coherent.js Error');
      lines.push('─'.repeat(40));
    }

    // Error message
    lines.push(`Message: ${enhancedError.message}`);
    lines.push(`Category: ${enhancedError.category} (${enhancedError.severity})`);
    lines.push(`Time: ${new Date(enhancedError.timestamp).toLocaleTimeString()}`);
    lines.push('');

    // Component context
    if (enhancedError.componentContext) {
      lines.push('🏗️  Component Context');
      lines.push('─'.repeat(20));
      lines.push(`Path: ${enhancedError.componentContext.path}`);
      lines.push(`Type: ${enhancedError.component.type}`);
      lines.push(`Depth: ${enhancedError.componentContext.depth}`);

      if (enhancedError.componentContext.component) {
        lines.push(`Summary: ${enhancedError.componentContext.component}`);
      }

      lines.push('');
    }

    // Prop validation
    if (enhancedError.propValidation) {
      const validation = enhancedError.propValidation;
      lines.push('📝 Prop Validation');
      lines.push('─'.repeat(18));
      lines.push(`Valid: ${validation.valid ? '✅' : '❌'}`);
      lines.push(`Props: ${validation.propCount}`);

      if (validation.issues.length > 0) {
        lines.push('Issues:');
        validation.issues.forEach(issue => {
          lines.push(`  ❌ ${issue}`);
        });
      }

      if (validation.warnings.length > 0) {
        lines.push('Warnings:');
        validation.warnings.forEach(warning => {
          lines.push(`  ⚠️  ${warning}`);
        });
      }

      lines.push('');
    }

    // Suggestions
    if (enhancedError.suggestions.length > 0) {
      lines.push('💡 Suggestions');
      lines.push('─'.repeat(13));
      enhancedError.suggestions.forEach((suggestion, index) => {
        const icon = suggestion.type === 'fix' ? '🔧' :
                    suggestion.type === 'optimization' ? '⚡' :
                    suggestion.type === 'structure' ? '🏗️' : '💡';
        lines.push(`${index + 1}. ${icon} ${suggestion.message}`);
        if (suggestion.code) {
          lines.push(`   Code: ${suggestion.code}`);
        }
      });
      lines.push('');
    }

    // Stack trace (optional)
    if (this.options.includeStackTrace && enhancedError.stack) {
      lines.push('📚 Stack Trace');
      lines.push('─'.repeat(15));
      lines.push(enhancedError.stack.split('\n').slice(0, 10).join('\n'));
      if (enhancedError.stack.split('\n').length > 10) {
        lines.push('... (truncated)');
      }
    }

    return lines.join('\n');
  }

  /**
   * Get component type
   */
  getComponentType(component) {
    if (component === null || component === undefined) return 'empty';
    if (typeof component === 'string') return 'text';
    if (typeof component === 'number') return 'number';
    if (typeof component === 'boolean') return 'boolean';
    if (typeof component === 'function') return 'function';
    if (Array.isArray(component)) return 'array';
    if (isCoherentObject(component)) return 'element';
    return 'object';
  }

  /**
   * Check if component is valid
   */
  isValidComponent(component) {
    try {
      // Basic validation
      if (component === null || component === undefined) return true;
      if (typeof component === 'string' || typeof component === 'number') return true;
      if (typeof component === 'function') return true;
      if (Array.isArray(component)) return component.every(child => this.isValidComponent(child));
      if (isCoherentObject(component)) {
        const entries = Object.entries(component);
        return entries.length === 1;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Assess component complexity
   */
  assessComplexity(component) {
    let complexity = 0;

    if (typeof component === 'object' && component !== null) {
      if (isCoherentObject(component)) {
        const entries = Object.entries(component);
        if (entries.length === 1) {
          const [_tagName, props] = entries;
          complexity += Object.keys(props).length;

          if (hasChildren(props)) {
            const children = Array.isArray(props.children) ? props.children : [props.children];
            children.forEach(child => {
              complexity += this.assessComplexity(child);
            });
          }
        }
      } else {
        complexity += Object.keys(component).length;
      }
    }

    return complexity;
  }

  /**
   * Check if component has dynamic content
   */
  hasDynamicContent(component) {
    if (typeof component === 'function') return true;
    if (typeof component === 'object' && component !== null) {
      for (const value of Object.values(component)) {
        if (typeof value === 'function') return true;
        if (typeof value === 'object' && this.hasDynamicContent(value)) return true;
      }
    }
    return false;
  }

  /**
   * Estimate component size
   */
  estimateSize(component) {
    try {
      return JSON.stringify(component).length;
    } catch {
      return 0;
    }
  }

  /**
   * Summarize component for context
   */
  summarizeComponent(component) {
    const type = this.getComponentType(component);

    if (type === 'element' && isCoherentObject(component)) {
      const entries = Object.entries(component);
      if (entries.length === 1) {
        const [tagName, props] = entries;
        const propCount = Object.keys(props).length;
        const hasChildren = hasChildren(props);
        return `<${tagName}> (${propCount} props, ${hasChildren ? 'has' : 'no'} children)`;
      }
    }

    if (type === 'text') {
      const preview = String(component).substring(0, 30);
      return `Text: "${preview}${component.length > 30 ? '...' : ''}"`;
    }

    if (type === 'function') {
      return `Function: ${component.name || 'anonymous'}`;
    }

    return `${type} (${this.estimateSize(component)} bytes)`;
  }

  /**
   * Extract event handlers from props
   */
  extractEventHandlers(props) {
    return Object.keys(props).filter(key => /^on[A-Z]/.test(key));
  }

  /**
   * Determine error severity
   */
  determineSeverity(error) {
    if (error.name === 'TypeError' || error.name === 'ReferenceError') return 'critical';
    if (error.message.includes('Maximum render depth')) return 'critical';
    if (error.message.includes('undefined')) return 'high';
    if (error.message.includes('performance')) return 'medium';
    return 'low';
  }

  /**
   * Categorize error
   */
  categorizeError(error) {
    if (error.message.includes('render') || error.message.includes('component')) return 'rendering';
    if (error.message.includes('props') || error.message.includes('prop')) return 'props';
    if (error.message.includes('cache') || error.message.includes('performance')) return 'performance';
    if (error.message.includes('route') || error.message.includes('router')) return 'routing';
    return 'general';
  }

  /**
   * Initialize common error patterns and suggestions
   */
  initializeCommonPatterns() {
    return [
      {
        matcher: /undefined.*property/gi,
        suggestion: {
          type: 'fix',
          message: 'Check for undefined properties in component props',
          code: 'Add default props: const { required = "default" } = props;'
        }
      },
      {
        matcher: /maximum.*depth/gi,
        suggestion: {
          type: 'fix',
          message: 'Infinite recursion detected in component tree',
          code: 'Check for circular references in component children'
        }
      },
      {
        matcher: /cannot.*read.*property/gi,
        suggestion: {
          type: 'fix',
          message: 'Property access error - check object structure',
          code: 'Use optional chaining: obj?.prop?.nested'
        }
      },
      {
        matcher: /performance/gi,
        suggestion: {
          type: 'optimization',
          message: 'Consider optimizing component for better performance',
          code: 'Use memoization or static components where possible'
        }
      }
    ];
  }

  /**
   * Add color to text
   */
  colorize(text, color) {
    if (!this.options.colorOutput) return text;

    const colors = {
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m'
    };

    const reset = '\x1b[0m';
    return `${colors[color] || ''}${text}${reset}`;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byCategory: {},
      bySeverity: {},
      recent: this.errorHistory.slice(-10)
    };

    this.errorHistory.forEach(error => {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }
}

/**
 * Create enhanced error handler
 */
export function createEnhancedErrorHandler(options = {}) {
  return new EnhancedErrorHandler(options);
}

/**
 * Handle error and log enhanced version
 */
export function handleEnhancedError(error, component = null, context = {}) {
  const handler = createEnhancedErrorHandler();
  const enhancedError = handler.handleError(error, component, context);
  console.error(handler.formatError(enhancedError));
  return enhancedError;
}

export default {
  EnhancedErrorHandler,
  createEnhancedErrorHandler,
  handleEnhancedError
};
