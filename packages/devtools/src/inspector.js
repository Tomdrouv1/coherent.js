/**
 * Coherent.js Component Inspector
 * 
 * Provides tools for inspecting component structure, props, and state
 * 
 * @module devtools/inspector
 */

/**
 * Component Inspector
 * Analyzes and provides insights into component structure
 */
export class ComponentInspector {
  constructor(options = {}) {
    this.options = {
      trackHistory: true,
      maxHistory: 100,
      verbose: false,
      ...options
    };
    
    this.components = new Map();
    this.history = [];
    this.inspectionCount = 0;
  }

  /**
   * Inspect a component
   * 
   * @param {Object} component - Component to inspect
   * @param {Object} [metadata] - Additional metadata
   * @returns {Object} Inspection result
   */
  inspect(component, metadata = {}) {
    this.inspectionCount++;
    
    const startTime = performance.now();
    const analysis = this.analyzeComponent(component);
    const tree = this.buildComponentTree(component);
    const stats = this.calculateStats(component);
    const endTime = performance.now();
    
    const inspection = {
      id: this.generateId(),
      timestamp: Date.now(),
      inspectionTime: endTime - startTime,
      component,
      metadata,
      // Flatten analysis results to top level for easier access
      type: analysis.type,
      structure: component,
      props: this.extractProps(component),
      depth: stats.depth || 0,  // Use stats.depth, not tree.depth
      childCount: stats.elementCount || 0,
      complexity: stats.complexity || 0,
      nodeCount: stats.nodeCount || 0,
      // Keep nested data for detailed inspection
      analysis,
      tree,
      stats,
      valid: analysis.valid,
      issues: analysis.issues || [],
      errors: analysis.issues || [],  // Alias for compatibility
      warnings: analysis.warnings || []
    };

    // Track in history
    if (this.options.trackHistory) {
      this.history.push(inspection);
      
      // Limit history size
      if (this.history.length > this.options.maxHistory) {
        this.history.shift();
      }
    }

    // Store component
    this.components.set(inspection.id, inspection);

    if (this.options.verbose) {
      console.log('[Inspector] Component inspected:', inspection.id);
    }

    return inspection;
  }

  /**
   * Extract props from component
   */
  extractProps(component) {
    const props = [];
    
    if (!component || typeof component !== 'object') {
      return props;
    }
    
    Object.keys(component).forEach(key => {
      const element = component[key];
      if (element && typeof element === 'object') {
        Object.keys(element).forEach(prop => {
          if (!props.includes(prop) && prop !== 'children' && prop !== 'text') {
            props.push(prop);
          }
        });
      }
    });
    
    return props;
  }

  /**
   * Analyze component structure
   */
  analyzeComponent(component) {
    if (!component || typeof component !== 'object') {
      return {
        type: typeof component,
        valid: false,
        issues: ['Component is not an object']
      };
    }

    const issues = [];
    const warnings = [];
    const info = [];
    const seen = new WeakSet();

    // Check for circular references
    const checkCircular = (obj, path = []) => {
      if (obj === null || typeof obj !== 'object') {
        return;
      }

      if (seen.has(obj)) {
        warnings.push(`circular reference detected at ${path.join('.')}`);
        return;
      }

      seen.add(obj);

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => checkCircular(item, [...path, `[${index}]`]));
      } else {
        Object.keys(obj).forEach(key => {
          checkCircular(obj[key], [...path, key]);
        });
      }
    };

    checkCircular(component, ['root']);

    // Check component structure
    const keys = Object.keys(component);
    
    if (keys.length === 0) {
      issues.push('Component is empty');
    }

    if (keys.length > 1) {
      warnings.push('Component has multiple root elements');
    }

    // Analyze each element
    keys.forEach(key => {
      const element = component[key];
      
      if (typeof element === 'object' && element !== null) {
        // Check for common issues
        if (element.children && !Array.isArray(element.children)) {
          issues.push(`Children of ${key} should be an array`);
        }

        if (element.className && typeof element.className !== 'string') {
          warnings.push(`className of ${key} should be a string`);
        }

        if (element.style && typeof element.style !== 'object') {
          warnings.push(`style of ${key} should be an object`);
        }

        // Check for event handlers
        const eventHandlers = Object.keys(element).filter(k => k.startsWith('on'));
        if (eventHandlers.length > 0) {
          info.push(`${key} has ${eventHandlers.length} event handler(s): ${eventHandlers.join(', ')}`);
        }
      }
    });

    return {
      type: 'component',
      valid: issues.length === 0,
      rootElements: keys,
      issues,
      warnings,
      info
    };
  }

  /**
   * Build component tree structure
   */
  buildComponentTree(component, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) {
      return { _truncated: true, reason: 'Max depth reached' };
    }

    if (!component || typeof component !== 'object') {
      return { type: typeof component, value: component };
    }

    if (Array.isArray(component)) {
      return component.map(child => this.buildComponentTree(child, depth + 1, maxDepth));
    }

    const tree = {};

    for (const [key, value] of Object.entries(component)) {
      if (typeof value === 'object' && value !== null) {
        tree[key] = {
          type: 'element',
          props: {},
          children: []
        };

        // Extract props and children
        for (const [prop, propValue] of Object.entries(value)) {
          if (prop === 'children') {
            tree[key].children = this.buildComponentTree(propValue, depth + 1, maxDepth);
          } else {
            tree[key].props[prop] = propValue;
          }
        }
      } else {
        tree[key] = { type: typeof value, value };
      }
    }

    return tree;
  }

  /**
   * Calculate component statistics
   */
  calculateStats(component) {
    const stats = {
      elementCount: 0,
      depth: 0,
      textNodes: 0,
      eventHandlers: 0,
      hasStyles: false,
      hasClasses: false,
      complexity: 0
    };

    const traverse = (node, currentDepth = 1) => {
      if (!node || typeof node !== 'object') {
        if (node !== null && node !== undefined) {
          stats.textNodes++;
        }
        return;
      }

      if (Array.isArray(node)) {
        node.forEach(child => traverse(child, currentDepth));
        return;
      }

      stats.elementCount++;
      stats.depth = Math.max(stats.depth, currentDepth);

      for (const [_key, value] of Object.entries(node)) {
        if (typeof value === 'object' && value !== null) {
          // Check for styles and classes
          if (value.style) stats.hasStyles = true;
          if (value.className) stats.hasClasses = true;

          // Count event handlers
          const handlers = Object.keys(value).filter(k => k.startsWith('on'));
          stats.eventHandlers += handlers.length;

          // Traverse children
          if (value.children) {
            traverse(value.children, currentDepth + 1);
          }
        }
      }
    };

    traverse(component);

    // Calculate complexity based on various factors
    stats.complexity = 
      stats.elementCount * 10 +  // Base complexity from element count
      stats.depth * 5 +            // Depth adds complexity
      stats.eventHandlers * 3 +    // Event handlers add complexity
      stats.textNodes +            // Text nodes add minimal complexity
      (stats.hasStyles ? 5 : 0) +  // Styles add complexity
      (stats.hasClasses ? 3 : 0);  // Classes add complexity

    return stats;
  }

  /**
   * Get component by ID
   */
  getComponent(id) {
    return this.components.get(id);
  }

  /**
   * Get inspection history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Search components by criteria
   */
  search(criteria) {
    const results = [];

    for (const [id, inspection] of this.components.entries()) {
      let matches = true;

      if (criteria.hasIssues && inspection.analysis.issues.length === 0) {
        matches = false;
      }

      if (criteria.hasWarnings && inspection.analysis.warnings.length === 0) {
        matches = false;
      }

      if (criteria.minElements && inspection.stats.elementCount < criteria.minElements) {
        matches = false;
      }

      if (criteria.maxElements && inspection.stats.elementCount > criteria.maxElements) {
        matches = false;
      }

      if (matches) {
        results.push({ id, inspection });
      }
    }

    return results;
  }

  /**
   * Compare two components
   */
  compare(componentA, componentB) {
    const inspectionA = typeof componentA === 'string' 
      ? this.getComponent(componentA)
      : this.inspect(componentA);
    
    const inspectionB = typeof componentB === 'string'
      ? this.getComponent(componentB)
      : this.inspect(componentB);

    return {
      statsComparison: {
        elementCount: {
          a: inspectionA.stats.elementCount,
          b: inspectionB.stats.elementCount,
          diff: inspectionB.stats.elementCount - inspectionA.stats.elementCount
        },
        depth: {
          a: inspectionA.stats.depth,
          b: inspectionB.stats.depth,
          diff: inspectionB.stats.depth - inspectionA.stats.depth
        },
        textNodes: {
          a: inspectionA.stats.textNodes,
          b: inspectionB.stats.textNodes,
          diff: inspectionB.stats.textNodes - inspectionA.stats.textNodes
        }
      },
      structureMatch: JSON.stringify(inspectionA.tree) === JSON.stringify(inspectionB.tree),
      issuesComparison: {
        a: inspectionA.analysis.issues.length,
        b: inspectionB.analysis.issues.length
      }
    };
  }

  /**
   * Generate report
   */
  generateReport() {
    return {
      totalInspections: this.inspectionCount,
      componentsTracked: this.components.size,
      historySize: this.history.length,
      summary: {
        totalElements: Array.from(this.components.values())
          .reduce((sum, c) => sum + c.stats.elementCount, 0),
        averageDepth: Array.from(this.components.values())
          .reduce((sum, c) => sum + c.stats.depth, 0) / this.components.size || 0,
        componentsWithIssues: Array.from(this.components.values())
          .filter(c => c.analysis.issues.length > 0).length,
        componentsWithWarnings: Array.from(this.components.values())
          .filter(c => c.analysis.warnings.length > 0).length
      }
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.components.clear();
    this.history = [];
    this.inspectionCount = 0;
  }

  /**
   * Clear history only
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Get inspection statistics
   */
  getStats() {
    return {
      totalInspections: this.inspectionCount,
      componentsTracked: this.components.size,
      historySize: this.history.length
    };
  }

  /**
   * Export inspection data
   */
  export() {
    return {
      inspections: this.history.map(h => ({
        id: h.id,
        timestamp: h.timestamp,
        type: h.type,
        complexity: h.complexity,
        depth: h.depth,
        issues: h.issues,
        warnings: h.warnings
      })),
      stats: this.getStats(),
      exportedAt: Date.now()
    };
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `inspect-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Create a component inspector
 */
export function createInspector(options = {}) {
  return new ComponentInspector(options);
}

/**
 * Quick inspect utility
 */
export function inspect(component, options = {}) {
  const inspector = new ComponentInspector(options);
  return inspector.inspect(component);
}

/**
 * Validate component structure
 */
export function validateComponent(component) {
  const inspector = new ComponentInspector();
  const inspection = inspector.inspect(component);
  
  return {
    valid: inspection.valid,
    errors: inspection.issues || [],
    issues: inspection.issues || [],
    warnings: inspection.warnings || [],
    stats: inspection.stats
  };
}

export default {
  ComponentInspector,
  createInspector,
  inspect,
  validateComponent
};
