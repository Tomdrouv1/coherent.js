/**
 * Component Tree Visualizer for Coherent.js
 *
 * Provides beautiful visualization of functional component trees
 * making it easy to debug and understand pure JavaScript object components
 *
 * @module ComponentVisualizer
 */

import {
  isCoherentObject,
  hasChildren,
  normalizeChildren
} from '@coherent.js/core';

/**
 * Component tree visualizer with enhanced debugging
 */
export class ComponentVisualizer {
  constructor(options = {}) {
    this.options = {
      maxDepth: options.maxDepth || 50,
      showProps: options.showProps !== false,
      showMetadata: options.showMetadata !== false,
      colorOutput: options.colorOutput !== false,
      compactMode: options.compactMode || false,
      ...options
    };

    this.stats = {
      totalComponents: 0,
      totalDepth: 0,
      staticComponents: 0,
      dynamicComponents: 0,
      renderTime: 0
    };
  }

  /**
   * Visualize a component tree
   */
  visualize(component, name = 'Root') {
    const startTime = performance.now();
    this.stats = { totalComponents: 0, totalDepth: 0, staticComponents: 0, dynamicComponents: 0, renderTime: 0 };

    const tree = this.buildTree(component, name, 0);
    const visualization = this.renderTree(tree);

    this.stats.renderTime = performance.now() - startTime;

    return {
      visualization,
      stats: { ...this.stats },
      tree
    };
  }

  /**
   * Build component tree structure
   */
  buildTree(component, name, depth) {
    if (depth > this.options.maxDepth) {
      return {
        name: 'MAX_DEPTH_REACHED',
        type: 'warning',
        depth,
        children: [],
        metadata: { message: `Maximum depth ${this.options.maxDepth} exceeded` }
      };
    }

    this.stats.totalComponents++;
    this.stats.totalDepth = Math.max(this.stats.totalDepth, depth);

    const node = {
      name,
      depth,
      children: [],
      metadata: {}
    };

    // Handle different component types
    if (component === null || component === undefined) {
      node.type = 'empty';
      node.value = '';
      this.stats.staticComponents++;
    } else if (typeof component === 'string') {
      node.type = 'text';
      node.value = component;
      node.metadata.length = component.length;
      this.stats.staticComponents++;
    } else if (typeof component === 'number') {
      node.type = 'number';
      node.value = component;
      this.stats.staticComponents++;
    } else if (typeof component === 'boolean') {
      node.type = 'boolean';
      node.value = component;
      this.stats.staticComponents++;
    } else if (typeof component === 'function') {
      node.type = 'function';
      node.value = `Function: ${component.name || 'anonymous'}`;
      node.metadata.arity = component.length;
      node.metadata.isAsync = component.constructor.name === 'AsyncFunction';
      this.stats.dynamicComponents++;
    } else if (Array.isArray(component)) {
      node.type = 'array';
      node.metadata.length = component.length;
      component.forEach((item, _index) => {
        const childNode = this.buildTree(item, `[${_index}]`, depth + 1);
        node.children.push(childNode);
      });
      this.stats.dynamicComponents++;
    } else if (isCoherentObject(component)) {
      const entries = Object.entries(component);
      if (entries.length === 1) {
        const [tagName, props] = entries;
        node.type = 'element';
        node.tagName = tagName;
        node.props = this.options.showProps ? this.analyzeProps(props) : {};

        // Extract children
        if (hasChildren(props)) {
          const children = normalizeChildren(props.children);
          children.forEach((child, _index) => {
            const childNode = this.buildTree(child, `${tagName}[${_index}]`, depth + 1);
            node.children.push(childNode);
          });
        }

        // Analyze if static or dynamic
        if (this.hasDynamicContent(props)) {
          this.stats.dynamicComponents++;
          node.metadata.dynamic = true;
        } else {
          this.stats.staticComponents++;
          node.metadata.dynamic = false;
        }
      } else {
        node.type = 'complex';
        node.metadata.keys = entries.map(([key]) => key);
        this.stats.dynamicComponents++;
      }
    } else {
      node.type = 'unknown';
      node.value = String(component);
      node.metadata.constructor = component.constructor?.name || 'Object';
      this.stats.staticComponents++;
    }

    return node;
  }

  /**
   * Analyze component props
   */
  analyzeProps(props) {
    const analyzed = {};

    if (!props || typeof props !== 'object') {
      return analyzed;
    }

    Object.entries(props).forEach(([key, value]) => {
      if (key === 'children') return;

      if (typeof value === 'function') {
        analyzed[key] = {
          type: 'function',
          name: value.name || 'anonymous',
          isEvent: /^on[A-Z]/.test(key)
        };
      } else if (typeof value === 'string') {
        analyzed[key] = {
          type: 'string',
          length: value.length,
          preview: value.length > 50 ? `${value.substring(0, 47)}...` : value
        };
      } else if (typeof value === 'object' && value !== null) {
        analyzed[key] = {
          type: 'object',
          keys: Object.keys(value),
          constructor: value.constructor?.name || 'Object'
        };
      } else {
        analyzed[key] = {
          type: typeof value,
          value
        };
      }
    });

    return analyzed;
  }

  /**
   * Check if component has dynamic content
   */
  hasDynamicContent(props) {
    if (typeof props === 'object' && props !== null) {
      for (const value of Object.values(props)) {
        if (typeof value === 'function') return true;
        if (typeof value === 'object' && this.hasDynamicContent(value)) return true;
      }
    }
    return false;
  }

  /**
   * Render tree as formatted text
   */
  renderTree(tree) {
    const lines = [];

    if (this.options.colorOutput) {
      lines.push(this.colorize('🌳 Coherent.js Component Tree', 'cyan'));
      lines.push(this.colorize('═'.repeat(40), 'cyan'));
    } else {
      lines.push('🌳 Coherent.js Component Tree');
      lines.push('═'.repeat(40));
    }

    this.renderNode(tree, lines, '', true);

    if (this.options.showMetadata) {
      lines.push('');
      lines.push('📊 Tree Statistics:');
      lines.push(`   Total Components: ${this.stats.totalComponents}`);
      lines.push(`   Max Depth: ${this.stats.totalDepth}`);
      lines.push(`   Static Components: ${this.stats.staticComponents}`);
      lines.push(`   Dynamic Components: ${this.stats.dynamicComponents}`);
      lines.push(`   Render Time: ${this.stats.renderTime.toFixed(2)}ms`);
    }

    return lines.join('\n');
  }

  /**
   * Render individual node
   */
  renderNode(node, lines, prefix = '', isLast = true) {
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    let nodeLine = prefix + connector;

    // Add node icon and name
    if (this.options.colorOutput) {
      nodeLine += this.getNodeIcon(node.type);
      nodeLine += this.colorize(node.name, this.getNodeColor(node.type));
    } else {
      nodeLine += this.getNodeIcon(node.type) + node.name;
    }

    // Add type information
    if (!this.options.compactMode) {
      nodeLine += ` (${node.type})`;

      // Add additional info based on type
      if (node.type === 'element') {
        nodeLine += ` <${node.tagName}>`;
      } else if (node.type === 'text' && node.value) {
        nodeLine += `: "${node.value.substring(0, 30)}${node.value.length > 30 ? '...' : ''}"`;
      } else if (node.type === 'function') {
        nodeLine += `(${node.metadata.arity || 0} args)`;
      }

      // Add dynamic indicator
      if (node.metadata.dynamic !== undefined) {
        nodeLine += node.metadata.dynamic ? ' 🔄' : ' 📌';
      }
    }

    lines.push(nodeLine);

    // Add props if enabled and not compact
    if (this.options.showProps && node.props && !this.options.compactMode) {
      Object.entries(node.props).forEach(([key, prop], _index) => {
        const isLastProp = _index === Object.keys(node.props).length - 1;
        const propConnector = isLastProp ? '└── ' : '├── ';
        const _propPrefix = childPrefix + (isLastProp && node.children.length === 0 ? '    ' : '│   ');

        let propLine = childPrefix + propConnector;
        if (this.options.colorOutput) {
          propLine += this.colorize(key, 'yellow');
        } else {
          propLine += key;
        }

        propLine += `: ${  this.formatPropValue(prop)}`;
        lines.push(propLine);
      });
    }

    // Render children
    node.children.forEach((child, index) => {
      const isLastChild = index === node.children.length - 1;
      this.renderNode(child, lines, childPrefix, isLastChild);
    });
  }

  /**
   * Get node icon based on type
   */
  getNodeIcon(type) {
    const icons = {
      element: '🏷️ ',
      text: '📝 ',
      function: '⚡ ',
      array: '📋 ',
      empty: '⭕ ',
      number: '🔢 ',
      boolean: '☑️ ',
      complex: '📦 ',
      unknown: '❓ ',
      warning: '⚠️ '
    };
    return icons[type] || '📄 ';
  }

  /**
   * Get node color based on type
   */
  getNodeColor(type) {
    const colors = {
      element: 'green',
      text: 'blue',
      function: 'magenta',
      array: 'cyan',
      empty: 'gray',
      number: 'yellow',
      boolean: 'yellow',
      complex: 'red',
      unknown: 'red',
      warning: 'red'
    };
    return colors[type] || 'white';
  }

  /**
   * Format property value for display
   */
  formatPropValue(prop) {
    if (prop.type === 'function') {
      return `⚡ ${prop.name}${prop.isEvent ? ' (event)' : ''}`;
    } else if (prop.type === 'string') {
      return `"${prop.preview}"`;
    } else if (prop.type === 'object') {
      return `${prop.constructor} {${prop.keys.join(', ')}}`;
    } else {
      return String(prop.value);
    }
  }

  /**
   * Add color to text (ANSI colors)
   */
  colorize(text, color) {
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
   * Export tree as JSON for further analysis
   */
  exportAsJSON(tree) {
    return JSON.stringify(tree, null, 2);
  }

  /**
   * Export tree as DOT format for Graphviz
   */
  exportAsDOT(tree) {
    const lines = ['digraph ComponentTree {'];
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box, style=rounded];');

    this.generateDOTNodes(tree, lines, 'root');

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Generate DOT nodes
   */
  generateDOTNodes(node, lines, parentId) {
    const nodeId = `${parentId  }_${  node.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

    let label = node.name;
    if (node.type === 'element') {
      label = `<${node.tagName}>\\n${node.name}`;
    }

    lines.push(`  "${nodeId}" [label="${label}"];`);

    if (parentId !== 'root') {
      lines.push(`  "${parentId}" -> "${nodeId}";`);
    }

    node.children.forEach((child, _index) => {
      this.generateDOTNodes(child, lines, nodeId);
    });
  }
}

/**
 * Create a component visualizer
 */
export function createComponentVisualizer(options = {}) {
  return new ComponentVisualizer(options);
}

/**
 * Quick visualize function
 */
export function visualizeComponent(component, name = 'Root', options = {}) {
  const visualizer = createComponentVisualizer(options);
  return visualizer.visualize(component, name);
}

/**
 * Visualize component and log to console
 */
export function logComponentTree(component, name = 'Root', options = {}) {
  const result = visualizeComponent(component, name, options);
  console.log(result.visualization);
  return result;
}

export default {
  ComponentVisualizer,
  createComponentVisualizer,
  visualizeComponent,
  logComponentTree
};
