/**
 * Enhanced Error System for Coherent.js
 * Provides detailed, actionable error messages to improve developer experience
 */

/**
 * Base error class with enhanced messaging
 */
export class CoherentError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.suggestions = options.suggestions || [];
    this.documentation = options.documentation;
    this.context = options.context || {};
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error message with suggestions
   */
  toString() {
    let output = `${this.name}: ${this.message}`;
    
    if (this.code) {
      output += `\nError Code: ${this.code}`;
    }
    
    if (this.suggestions.length > 0) {
      output += '\n\n💡 Suggestions:';
      this.suggestions.forEach((suggestion, index) => {
        output += `\n  ${index + 1}. ${suggestion}`;
      });
    }
    
    if (this.documentation) {
      output += `\n\n📚 Documentation: ${this.documentation}`;
    }
    
    if (Object.keys(this.context).length > 0) {
      output += '\n\n🔍 Context:';
      Object.entries(this.context).forEach(([key, value]) => {
        output += `\n  ${key}: ${JSON.stringify(value)}`;
      });
    }
    
    return output;
  }
}

/**
 * Component-related errors
 */
export class ComponentError extends CoherentError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'COMPONENT_ERROR',
      documentation: options.documentation || 'https://coherentjs.dev/docs/components'
    });
  }
}

/**
 * Invalid component structure error
 */
export function createInvalidComponentError(componentName, issue) {
  const suggestions = [];
  
  if (issue.includes('children')) {
    suggestions.push(
      'Wrap multiple elements in a parent container: { div: { children: [...] } }',
      'Or return an array of elements: [{ h1: {...} }, { p: {...} }]',
      'Check that children is an array, not an object'
    );
  }
  
  if (issue.includes('text') && issue.includes('html')) {
    suggestions.push(
      'Use either "text" or "html" property, not both',
      'Use "text" for safe, escaped content',
      'Use "html" only for trusted HTML content'
    );
  }
  
  if (issue.includes('undefined')) {
    suggestions.push(
      'Ensure all component functions return a valid object or array',
      'Check for missing return statements',
      'Verify that props are being passed correctly'
    );
  }
  
  return new ComponentError(
    `Invalid component structure in "${componentName}": ${issue}`,
    {
      code: 'INVALID_COMPONENT_STRUCTURE',
      suggestions,
      context: { componentName, issue }
    }
  );
}

/**
 * Rendering errors
 */
export class RenderError extends CoherentError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'RENDER_ERROR',
      documentation: options.documentation || 'https://coherentjs.dev/docs/rendering'
    });
  }
}

/**
 * Create error for invalid element type
 */
export function createInvalidElementError(elementType, validTypes) {
  return new RenderError(
    `Invalid element type: "${elementType}"`,
    {
      code: 'INVALID_ELEMENT_TYPE',
      suggestions: [
        `Valid element types are: ${validTypes.join(', ')}`,
        'Check for typos in element names',
        'Ensure you\'re using lowercase HTML tag names',
        'For custom components, use createComponent() first'
      ],
      context: { elementType, validTypes }
    }
  );
}

/**
 * State management errors
 */
export class StateError extends CoherentError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'STATE_ERROR',
      documentation: options.documentation || 'https://coherentjs.dev/docs/state'
    });
  }
}

/**
 * Create error for invalid state update
 */
export function createInvalidStateUpdateError(key, value, expectedType) {
  return new StateError(
    `Invalid state update for key "${key}"`,
    {
      code: 'INVALID_STATE_UPDATE',
      suggestions: [
        `Expected type: ${expectedType}, received: ${typeof value}`,
        'Use setState() method to update state',
        'Ensure state updates are serializable',
        'Check that you\'re not mutating state directly'
      ],
      context: { key, value, expectedType, receivedType: typeof value }
    }
  );
}

/**
 * Hydration errors
 */
export class HydrationError extends CoherentError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'HYDRATION_ERROR',
      documentation: options.documentation || 'https://coherentjs.dev/docs/hydration'
    });
  }
}

/**
 * Create error for hydration mismatch
 */
export function createHydrationMismatchError(expected, actual, path) {
  return new HydrationError(
    `Hydration mismatch at path: ${path}`,
    {
      code: 'HYDRATION_MISMATCH',
      suggestions: [
        'Ensure server and client render the same content',
        'Check for differences in data between SSR and client',
        'Avoid using Date.now() or Math.random() in render functions',
        'Use suppressHydrationWarning prop if mismatch is intentional'
      ],
      context: { expected, actual, path }
    }
  );
}

/**
 * Router errors
 */
export class RouterError extends CoherentError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'ROUTER_ERROR',
      documentation: options.documentation || 'https://coherentjs.dev/docs/routing'
    });
  }
}

/**
 * Create error for route not found
 */
export function createRouteNotFoundError(path) {
  return new RouterError(
    `Route not found: "${path}"`,
    {
      code: 'ROUTE_NOT_FOUND',
      suggestions: [
        'Check that the route is defined in your router configuration',
        'Verify the path spelling and format',
        'Add a wildcard route (*) to handle 404 pages',
        'Use router.hasRoute() to check if a route exists'
      ],
      context: { path }
    }
  );
}

/**
 * Database errors
 */
export class DatabaseError extends CoherentError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'DATABASE_ERROR',
      documentation: options.documentation || 'https://coherentjs.dev/docs/database'
    });
  }
}

/**
 * Create error for connection failure
 */
export function createConnectionError(adapter, originalError) {
  return new DatabaseError(
    `Failed to connect to database using ${adapter} adapter`,
    {
      code: 'DATABASE_CONNECTION_FAILED',
      suggestions: [
        'Check your database connection string',
        'Verify that the database server is running',
        'Ensure you have the correct credentials',
        'Check firewall and network settings',
        `Install the ${adapter} driver: npm install ${adapter}`
      ],
      context: { adapter, originalError: originalError.message }
    }
  );
}

/**
 * API errors
 */
export class APIError extends CoherentError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'API_ERROR',
      documentation: options.documentation || 'https://coherentjs.dev/docs/api'
    });
  }
}

/**
 * Create error for validation failure
 */
export function createValidationError(field, rule, value) {
  return new APIError(
    `Validation failed for field "${field}"`,
    {
      code: 'VALIDATION_FAILED',
      suggestions: [
        `Rule: ${rule}`,
        'Check the API documentation for required field formats',
        'Ensure all required fields are provided',
        'Verify data types match the schema'
      ],
      context: { field, rule, value }
    }
  );
}

/**
 * Performance errors
 */
export class PerformanceError extends CoherentError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'PERFORMANCE_ERROR',
      documentation: options.documentation || 'https://coherentjs.dev/docs/performance'
    });
  }
}

/**
 * Create error for performance budget exceeded
 */
export function createPerformanceBudgetError(metric, value, budget) {
  return new PerformanceError(
    `Performance budget exceeded for ${metric}`,
    {
      code: 'PERFORMANCE_BUDGET_EXCEEDED',
      suggestions: [
        `Current: ${value}ms, Budget: ${budget}ms`,
        'Use memoization to cache expensive computations',
        'Implement lazy loading for large components',
        'Check for unnecessary re-renders',
        'Use the performance profiler to identify bottlenecks'
      ],
      context: { metric, value, budget, exceeded: value - budget }
    }
  );
}

/**
 * Helper to format error with stack trace
 */
export function formatErrorWithStack(error) {
  if (error instanceof CoherentError) {
    return `${error.toString()}\n\nStack Trace:\n${error.stack}`;
  }
  return error.stack || error.message;
}

/**
 * Helper to log error with proper formatting
 */
export function logError(error, context = {}) {
  if (typeof console === 'undefined') return;
  
  console.error('❌ Coherent.js Error\n');
  
  if (error instanceof CoherentError) {
    console.error(error.toString());
  } else {
    console.error(error.message || error);
  }
  
  if (Object.keys(context).length > 0) {
    console.error('\n🔍 Additional Context:', context);
  }
  
  if (error.stack) {
    console.error('\n📍 Stack Trace:');
    console.error(error.stack);
  }
}

/**
 * Export all error creators
 */
export const ErrorCreators = {
  component: {
    invalidStructure: createInvalidComponentError
  },
  render: {
    invalidElement: createInvalidElementError
  },
  state: {
    invalidUpdate: createInvalidStateUpdateError
  },
  hydration: {
    mismatch: createHydrationMismatchError
  },
  router: {
    notFound: createRouteNotFoundError
  },
  database: {
    connection: createConnectionError
  },
  api: {
    validation: createValidationError
  },
  performance: {
    budgetExceeded: createPerformanceBudgetError
  }
};
