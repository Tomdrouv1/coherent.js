/**
 * Hybrid FP/OOP Integration Tools for Coherent.js
 *
 * Enhanced developer tools that visualize and debug the hybrid approach:
 * - OOP state management visualization
 * - FP component composition analysis
 * - State-to-component flow tracking
 * - Performance insights for hybrid patterns
 */

/**
 * Hybrid Architecture Visualizer
 */
export class HybridVisualizer {
  constructor(options = {}) {
    this.options = {
      showStateFlow: options.showStateFlow !== false,
      showComponentComposition: options.showComponentComposition !== false,
      showPerformanceImpact: options.showPerformanceImpact !== false,
      colorOutput: options.colorOutput !== false,
      ...options
    };

    this.stateInstances = new Map();
    this.componentInstances = new Map();
    this.connections = [];
  }

  /**
   * Register a state instance for tracking
   */
  registerState(name, stateInstance) {
    this.stateInstances.set(name, {
      instance: stateInstance,
      type: this.getStateType(stateInstance),
      methods: this.getStateMethods(stateInstance),
      properties: this.getStateProperties(stateInstance),
      connections: []
    });
  }

  /**
   * Register a component instance for tracking
   */
  registerComponent(name, componentFunction, usedStates = []) {
    this.componentInstances.set(name, {
      function: componentFunction,
      usedStates,
      composition: this.analyzeComposition(componentFunction),
      complexity: this.assessComplexity(componentFunction)
    });

    // Track connections
    usedStates.forEach(stateName => {
      if (this.stateInstances.has(stateName)) {
        this.connections.push({
          from: stateName,
          to: name,
          type: 'state-to-component'
        });

        this.stateInstances.get(stateName).connections.push(name);
      }
    });
  }

  /**
   * Visualize the entire hybrid architecture
   */
  visualizeHybridArchitecture() {
    const lines = [];

    if (this.options.colorOutput) {
      lines.push('\n🏗️  Coherent.js Hybrid Architecture Visualization');
      lines.push('═'.repeat(60));
    } else {
      lines.push('\nCoherent.js Hybrid Architecture Visualization');
      lines.push('═'.repeat(60));
    }

    // State Management Layer (OOP)
    lines.push('\n📊 State Management Layer (OOP)');
    lines.push('─'.repeat(35));
    this.stateInstances.forEach((state, name) => {
      lines.push(`\n🔧 ${name} (${state.type})`);
      lines.push(`   Methods: ${state.methods.join(', ')}`);
      lines.push(`   Properties: ${state.properties.join(', ')}`);
      lines.push(`   Connected to: ${state.connections.join(', ') || 'None'}`);
    });

    // Component Layer (FP)
    lines.push('\n🎨 Component Layer (FP)');
    lines.push('─'.repeat(25));
    this.componentInstances.forEach((component, name) => {
      lines.push(`\n⚡ ${name}`);
      lines.push(`   Complexity: ${component.complexity}`);
      lines.push(`   Uses states: ${component.usedStates.join(', ') || 'None'}`);
      lines.push(`   Composition: ${component.composition.join(', ') || 'Direct'}`);
    });

    // Data Flow Visualization
    if (this.options.showStateFlow) {
      lines.push('\n🔄 State-to-Component Flow');
      lines.push('─'.repeat(30));
      this.connections.forEach(connection => {
        lines.push(`   ${connection.from} → ${connection.to}`);
      });
    }

    // Performance Analysis
    if (this.options.showPerformanceImpact) {
      lines.push('\n📈 Performance Impact Analysis');
      lines.push('─'.repeat(32));
      lines.push(this.generatePerformanceInsights());
    }

    return lines.join('\n');
  }

  /**
   * Analyze component composition
   */
  analyzeComposition(componentFunction) {
    const composition = [];

    // This is a simplified analysis - in real implementation,
    // we'd parse the function to detect HOCs, composition patterns
    const funcString = componentFunction.toString();

    if (funcString.includes('hoc.withProps')) composition.push('withProps');
    if (funcString.includes('hoc.withMemo')) composition.push('withMemo');
    if (funcString.includes('layout.stack')) composition.push('stack');
    if (funcString.includes('layout.card')) composition.push('card');
    if (funcString.includes('data.map')) composition.push('map');
    if (funcString.includes('compose.combine')) composition.push('combine');

    return composition;
  }

  /**
   * Assess component complexity
   */
  assessComplexity(componentFunction) {
    const funcString = componentFunction.toString();

    let complexity = 1; // Base complexity

    // Count nested objects
    const objectMatches = funcString.match(/\{/g);
    if (objectMatches) complexity += objectMatches.length;

    // Count function calls
    const functionMatches = funcString.match(/\w+\(/g);
    if (functionMatches) complexity += functionMatches.length * 0.5;

    // Count conditional logic
    const conditionalMatches = funcString.match(/\?|if|switch/g);
    if (conditionalMatches) complexity += conditionalMatches.length * 2;

    return Math.round(complexity);
  }

  /**
   * Get state type
   */
  getStateType(stateInstance) {
    if (stateInstance.constructor.name === 'FormState') return 'Form';
    if (stateInstance.constructor.name === 'ListState') return 'List';
    if (stateInstance.constructor.name === 'ModalState') return 'Modal';
    if (stateInstance.constructor.name === 'RouterState') return 'Router';
    if (stateInstance.constructor.name === 'ReactiveState') return 'Reactive';
    return 'Unknown';
  }

  /**
   * Get state methods
   */
  getStateMethods(stateInstance) {
    const methods = [];
    const prototype = Object.getPrototypeOf(stateInstance);

    Object.getOwnPropertyNames(prototype).forEach(name => {
      if (typeof stateInstance[name] === 'function' && name !== 'constructor') {
        methods.push(name);
      }
    });

    return methods;
  }

  /**
   * Get state properties
   */
  getStateProperties(stateInstance) {
    const properties = [];

    // Try to get internal state properties
    if (stateInstance._state) {
      properties.push('reactive-state');
    }
    if (stateInstance._validators) {
      properties.push('validators');
    }
    if (stateInstance._resolvers) {
      properties.push('resolvers');
    }
    if (stateInstance._routes) {
      properties.push('routes');
    }

    return properties;
  }

  /**
   * Generate performance insights
   */
  generatePerformanceInsights() {
    const insights = [];

    const stateCount = this.stateInstances.size;
    const componentCount = this.componentInstances.size;
    const connectionCount = this.connections.length;

    // State efficiency
    if (stateCount > 5) {
      insights.push('⚠️  Many state instances - consider consolidating related state');
    } else {
      insights.push('✅ Good state organization');
    }

    // Component complexity
    const avgComplexity = Array.from(this.componentInstances.values())
      .reduce((sum, comp) => sum + comp.complexity, 0) / Math.max(componentCount, 1);

    if (avgComplexity > 10) {
      insights.push('⚠️  High average component complexity - consider breaking down components');
    } else {
      insights.push('✅ Reasonable component complexity');
    }

    // State coupling
    const couplingRatio = connectionCount / Math.max(componentCount, 1);
    if (couplingRatio > 2) {
      insights.push('⚠️  High state-to-component coupling - consider using context');
    } else {
      insights.push('✅ Good state decoupling');
    }

    // Composition usage
    const compositionUsage = Array.from(this.componentInstances.values())
      .filter(comp => comp.composition.length > 0).length / Math.max(componentCount, 1);

    if (compositionUsage < 0.5) {
      insights.push('💡 Consider using more composition utilities for better reusability');
    } else {
      insights.push('✅ Good use of composition patterns');
    }

    return insights.join('\n   ');
  }

  /**
   * Export architecture analysis
   */
  exportAnalysis() {
    return {
      timestamp: Date.now(),
      stateInstances: Array.from(this.stateInstances.entries()).map(([name, state]) => ({
        name,
        type: state.type,
        methods: state.methods,
        properties: state.properties,
        connections: state.connections
      })),
      componentInstances: Array.from(this.componentInstances.entries()).map(([name, comp]) => ({
        name,
        complexity: comp.complexity,
        usedStates: comp.usedStates,
        composition: comp.composition
      })),
      connections: this.connections,
      insights: this.generatePerformanceInsights().split('\n   ').filter(Boolean)
    };
  }
}

/**
 * State Flow Tracker
 */
export class StateFlowTracker {
  constructor() {
    this.flows = [];
    this.activeFlows = new Map();
  }

  /**
   * Track state change and its impact on components
   */
  trackFlow(stateName, action, oldValue, newValue, affectedComponents = []) {
    const flow = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      stateName,
      action,
      oldValue,
      newValue,
      affectedComponents,
      duration: null
    };

    this.flows.push(flow);
    this.activeFlows.set(flow.id, flow);

    return flow.id;
  }

  /**
   * Complete a flow tracking
   */
  completeFlow(flowId, duration) {
    const flow = this.activeFlows.get(flowId);
    if (flow) {
      flow.duration = duration;
      this.activeFlows.delete(flowId);
    }
  }

  /**
   * Analyze flow patterns
   */
  analyzeFlows() {
    const analysis = {
      totalFlows: this.flows.length,
      averageDuration: 0,
      mostActiveStates: {},
      bottleneckComponents: {},
      recommendations: []
    };

    if (this.flows.length === 0) return analysis;

    // Calculate average duration
    const completedFlows = this.flows.filter(flow => flow.duration !== null);
    analysis.averageDuration = completedFlows.reduce((sum, flow) => sum + flow.duration, 0) / completedFlows.length;

    // Most active states
    this.flows.forEach(flow => {
      analysis.mostActiveStates[flow.stateName] = (analysis.mostActiveStates[flow.stateName] || 0) + 1;
    });

    // Bottleneck components
    this.flows.forEach(flow => {
      flow.affectedComponents.forEach(component => {
        analysis.bottleneckComponents[component] = (analysis.bottleneckComponents[component] || 0) + 1;
      });
    });

    // Generate recommendations
    if (analysis.averageDuration > 50) {
      analysis.recommendations.push('Consider optimizing state updates - average duration is high');
    }

    const topState = Object.entries(analysis.mostActiveStates)
      .sort(([,a], [,b]) => b - a)[0];

    if (topState && topState[1] > 10) {
      analysis.recommendations.push(`State "${topState[0]}" is very active - consider splitting or optimizing`);
    }

    return analysis;
  }

  /**
   * Visualize flow patterns
   */
  visualizeFlows() {
    const lines = [];
    const analysis = this.analyzeFlows();

    lines.push('\n🔄 State Flow Analysis');
    lines.push('═'.repeat(25));
    lines.push(`Total Flows: ${analysis.totalFlows}`);
    lines.push(`Average Duration: ${analysis.averageDuration.toFixed(2)}ms`);

    if (Object.keys(analysis.mostActiveStates).length > 0) {
      lines.push('\n📊 Most Active States:');
      Object.entries(analysis.mostActiveStates)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([state, count]) => {
          lines.push(`   ${state}: ${count} updates`);
        });
    }

    if (Object.keys(analysis.bottleneckComponents).length > 0) {
      lines.push('\n⚠️  Most Affected Components:');
      Object.entries(analysis.bottleneckComponents)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([component, count]) => {
          lines.push(`   ${component}: ${count} re-renders`);
        });
    }

    if (analysis.recommendations.length > 0) {
      lines.push('\n💡 Recommendations:');
      analysis.recommendations.forEach(rec => {
        lines.push(`   • ${rec}`);
      });
    }

    return lines.join('\n');
  }
}

/**
 * Hybrid Performance Monitor
 */
export class HybridPerformanceMonitor {
  constructor() {
    this.metrics = {
      stateOperations: [],
      componentRenders: [],
      hybridInteractions: []
    };

    this.startTime = Date.now();
  }

  /**
   * Track state operation
   */
  trackStateOperation(stateName, operation, duration, memoryDelta = 0) {
    this.metrics.stateOperations.push({
      timestamp: Date.now(),
      stateName,
      operation,
      duration,
      memoryDelta
    });
  }

  /**
   * Track component render
   */
  trackComponentRender(componentName, duration, usedStates = []) {
    this.metrics.componentRenders.push({
      timestamp: Date.now(),
      componentName,
      duration,
      usedStates
    });
  }

  /**
   * Track hybrid interaction
   */
  trackHybridInteraction(stateName, componentName, action, duration) {
    this.metrics.hybridInteractions.push({
      timestamp: Date.now(),
      stateName,
      componentName,
      action,
      duration
    });
  }

  /**
   * Generate hybrid performance report
   */
  generateReport() {
    const lines = [];

    lines.push('\n📈 Hybrid Performance Report');
    lines.push('═'.repeat(35));

    // State operations summary
    const stateOps = this.metrics.stateOperations;
    if (stateOps.length > 0) {
      const avgStateDuration = stateOps.reduce((sum, op) => sum + op.duration, 0) / stateOps.length;
      lines.push(`\n🔧 State Operations: ${stateOps.length}`);
      lines.push(`   Average Duration: ${avgStateDuration.toFixed(2)}ms`);

      const stateCounts = {};
      stateOps.forEach(op => {
        stateCounts[op.stateName] = (stateCounts[op.stateName] || 0) + 1;
      });

      const topState = Object.entries(stateCounts).sort(([,a], [,b]) => b - a)[0];
      if (topState) {
        lines.push(`   Most Active: ${topState[0]} (${topState[1]} operations)`);
      }
    }

    // Component renders summary
    const componentRenders = this.metrics.componentRenders;
    if (componentRenders.length > 0) {
      const avgRenderDuration = componentRenders.reduce((sum, r) => sum + r.duration, 0) / componentRenders.length;
      lines.push(`\n⚡ Component Renders: ${componentRenders.length}`);
      lines.push(`   Average Duration: ${avgRenderDuration.toFixed(2)}ms`);

      const renderCounts = {};
      componentRenders.forEach(r => {
        renderCounts[r.componentName] = (renderCounts[r.componentName] || 0) + 1;
      });

      const topComponent = Object.entries(renderCounts).sort(([,a], [,b]) => b - a)[0];
      if (topComponent) {
        lines.push(`   Most Rendered: ${topComponent[0]} (${topComponent[1]} times)`);
      }
    }

    // Hybrid interactions
    const interactions = this.metrics.hybridInteractions;
    if (interactions.length > 0) {
      lines.push(`\n🔄 Hybrid Interactions: ${interactions.length}`);

      const actionCounts = {};
      interactions.forEach(i => {
        actionCounts[i.action] = (actionCounts[i.action] || 0) + 1;
      });

      lines.push('   Actions:');
      Object.entries(actionCounts).forEach(([action, count]) => {
        lines.push(`     ${action}: ${count}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics() {
    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      metrics: { ...this.metrics }
    };
  }
}

/**
 * Factory functions
 */
export function createHybridVisualizer(options) {
  return new HybridVisualizer(options);
}

export function createStateFlowTracker() {
  return new StateFlowTracker();
}

export function createHybridPerformanceMonitor() {
  return new HybridPerformanceMonitor();
}

/**
 * Quick visualization function
 */
export function visualizeHybridArchitecture(stateInstances, componentInstances, options = {}) {
  const visualizer = createHybridVisualizer(options);

  // Register states
  Object.entries(stateInstances).forEach(([name, instance]) => {
    visualizer.registerState(name, instance);
  });

  // Register components
  Object.entries(componentInstances).forEach(([name, { component, states }]) => {
    visualizer.registerComponent(name, component, states);
  });

  return visualizer.visualizeHybridArchitecture();
}

export default {
  HybridVisualizer,
  StateFlowTracker,
  HybridPerformanceMonitor,
  createHybridVisualizer,
  createStateFlowTracker,
  createHybridPerformanceMonitor,
  visualizeHybridArchitecture
};
