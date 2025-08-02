/**
 * Development Tools for Coherent.js
 * Provides debugging, profiling, and development utilities
 * Only active in development environment for zero production overhead
 */

import { performanceMonitor } from '../performance/monitor.js';
import { validateComponent, isCoherentObject } from '../core/object-utils.js';

/**
 * Main DevTools class
 */
export class DevTools {
    constructor(coherentInstance) {
        this.coherent = coherentInstance;
        this.isEnabled = this.shouldEnable();
        this.renderHistory = [];
        this.componentRegistry = new Map();
        this.warnings = [];
        this.errors = [];
        this.hotReloadEnabled = false;

        if (this.isEnabled) {
            this.initialize();
        }
    }

    /**
     * Check if dev tools should be enabled
     */
    shouldEnable() {
        // Only enable in development
        if (typeof process !== 'undefined') {
            return process.env.NODE_ENV === 'development';
        }

        // Browser development detection
        if (typeof window !== 'undefined') {
            return window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.search.includes('dev=true');
        }

        return false;
    }

    /**
     * Initialize dev tools
     */
    initialize() {
        console.log('🛠️ Coherent.js Dev Tools Enabled');

        this.setupGlobalHelpers();
        this.setupRenderInterception();
        this.setupErrorHandling();
        this.setupHotReload();
        this.setupComponentInspector();

        // Browser-specific setup
        if (typeof window !== 'undefined') {
            this.setupBrowserDevTools();
        }

        // Node.js specific setup
        if (typeof process !== 'undefined') {
            this.setupNodeDevTools();
        }
    }

    /**
     * Set up global helper functions
     */
    setupGlobalHelpers() {
        const helpers = {
            // Inspect any component
            $inspect: (component) => this.inspectComponent(component),

            // Get render history
            $history: () => this.renderHistory,

            // Get performance stats
            $perf: () => this.getPerformanceInsights(),

            // Validate component structure
            $validate: (component) => this.validateComponent(component),

            // Get component registry
            $registry: () => Array.from(this.componentRegistry.entries()),

            // Clear dev data
            $clear: () => this.clearDevData(),

            // Enable/disable features
            $toggle: (feature) => this.toggleFeature(feature),

            // Get warnings and errors
            $issues: () => ({ warnings: this.warnings, errors: this.errors })
        };

        // Expose helpers globally
        if (typeof window !== 'undefined') {
            Object.assign(window, helpers);
        } else if (typeof global !== 'undefined') {
            Object.assign(global, helpers);
        }
    }

    /**
     * Intercept render calls for debugging
     */
    setupRenderInterception() {
        const originalRender = this.coherent.render;

        this.coherent.render = (component, context = {}, options = {}) => {
            const renderStart = performance.now();
            const renderId = this.generateRenderId();

            try {
                // Pre-render validation and logging
                this.preRenderAnalysis(component, context, renderId);

                // Actual render
                const result = originalRender.call(this.coherent, component, context, {
                    ...options,
                    _devRenderId: renderId
                });

                // Post-render analysis
                const renderTime = performance.now() - renderStart;
                this.postRenderAnalysis(component, result, renderTime, renderId);

                return result;

            } catch (error) {
                this.handleRenderError(error, component, context, renderId);
                throw error;
            }
        };
    }

    /**
     * Pre-render analysis and validation
     */
    preRenderAnalysis(component, context, renderId) {
        // Component structure validation
        const validation = this.deepValidateComponent(component);
        if (!validation.isValid) {
            this.warnings.push({
                type: 'validation',
                message: validation.message,
                component: this.serializeComponent(component),
                renderId,
                timestamp: Date.now()
            });
        }

        // Performance warnings
        const complexity = this.analyzeComplexity(component);
        if (complexity > 1000) {
            this.warnings.push({
                type: 'performance',
                message: `High complexity component detected (${complexity} nodes)`,
                renderId,
                timestamp: Date.now()
            });
        }

        // Context analysis
        this.analyzeContext(context, renderId);
    }

    /**
     * Post-render analysis
     */
    postRenderAnalysis(component, result, renderTime, renderId) {
        // Store render in history
        const renderRecord = {
            id: renderId,
            timestamp: Date.now(),
            component: this.serializeComponent(component),
            renderTime,
            outputSize: result.length,
            complexity: this.analyzeComplexity(component)
        };

        this.renderHistory.push(renderRecord);

        // Keep only last 50 renders
        if (this.renderHistory.length > 50) {
            this.renderHistory.shift();
        }

        // Performance analysis
        if (renderTime > 10) {
            this.warnings.push({
                type: 'performance',
                message: `Slow render detected: ${renderTime.toFixed(2)}ms`,
                renderId,
                timestamp: Date.now()
            });
        }

        // Log render in development
        if (renderTime > 1) {
            console.log(`🔄 Render ${renderId}: ${renderTime.toFixed(2)}ms`);
        }
    }

    /**
     * Deep component validation
     */
    deepValidateComponent(component, path = 'root', depth = 0) {
        if (depth > 100) {
            return {
                isValid: false,
                message: `Component nesting too deep at ${path}`
            };
        }

        // Basic validation
        try {
            validateComponent(component);
        } catch (error) {
            return {
                isValid: false,
                message: `Invalid component at ${path}: ${error.message}`
            };
        }

        // Recursive validation for objects and arrays
        if (Array.isArray(component)) {
            for (let i = 0; i < component.length; i++) {
                const childValidation = this.deepValidateComponent(
                    component[i],
                    `${path}[${i}]`,
                    depth + 1
                );
                if (!childValidation.isValid) {
                    return childValidation;
                }
            }
        } else if (isCoherentObject(component)) {
            for (const [tag, props] of Object.entries(component)) {
                if (props && typeof props === 'object' && props.children) {
                    const childValidation = this.deepValidateComponent(
                        props.children,
                        `${path}.${tag}.children`,
                        depth + 1
                    );
                    if (!childValidation.isValid) {
                        return childValidation;
                    }
                }
            }
        }

        return { isValid: true };
    }

    /**
     * Analyze component complexity
     */
    analyzeComplexity(component, depth = 0) {
        if (depth > 100) return 1000; // Prevent infinite recursion

        if (typeof component === 'string' || typeof component === 'number') {
            return 1;
        }

        if (Array.isArray(component)) {
            return component.reduce((sum, child) =>
                sum + this.analyzeComplexity(child, depth + 1), 0);
        }

        if (isCoherentObject(component)) {
            let complexity = 1;
            for (const [, props] of Object.entries(component)) {
                if (props && typeof props === 'object') {
                    if (props.children) {
                        complexity += this.analyzeComplexity(props.children, depth + 1);
                    }
                    if (typeof props.text === 'function') {
                        complexity += 2; // Functions add complexity
                    }
                }
            }
            return complexity;
        }

        return 1;
    }

    /**
     * Context analysis
     */
    analyzeContext(context, renderId) {
        // Large context warning
        const contextSize = JSON.stringify(context).length;
        if (contextSize > 10000) {
            this.warnings.push({
                type: 'context',
                message: `Large context object: ${contextSize} characters`,
                renderId,
                timestamp: Date.now()
            });
        }

        // Circular reference check
        try {
            JSON.stringify(context);
        } catch (error) {
            if (error.message.includes('circular')) {
                this.warnings.push({
                    type: 'context',
                    message: 'Circular reference detected in context',
                    renderId,
                    timestamp: Date.now()
                });
            }
        }
    }

    /**
     * Component inspector
     */
    inspectComponent(component) {
        return {
            type: this.getComponentType(component),
            complexity: this.analyzeComplexity(component),
            validation: this.deepValidateComponent(component),
            structure: this.visualizeStructure(component),
            serialized: this.serializeComponent(component),
            recommendations: this.getOptimizationRecommendations(component)
        };
    }

    /**
     * Get component type
     */
    getComponentType(component) {
        if (typeof component === 'string') return 'text';
        if (typeof component === 'function') return 'function';
        if (Array.isArray(component)) return 'array';
        if (isCoherentObject(component)) return 'element';
        return 'unknown';
    }

    /**
     * Visualize component structure
     */
    visualizeStructure(component, depth = 0, maxDepth = 5) {
        if (depth > maxDepth) return '...';

        const indent = '  '.repeat(depth);

        if (typeof component === 'string') {
            return `${indent}"${component.substring(0, 20)}${component.length > 20 ? '...' : ''}"`;
        }

        if (Array.isArray(component)) {
            const items = component.slice(0, 3).map(child =>
                this.visualizeStructure(child, depth + 1, maxDepth)
            );
            const more = component.length > 3 ? `${indent}  ...${component.length - 3} more` : '';
            return `${indent}[\n${items.join('\n')}${more ? '\n' + more : ''}\n${indent}]`;
        }

        if (isCoherentObject(component)) {
            const entries = Object.entries(component).slice(0, 3);
            const elements = entries.map(([tag, props]) => {
                let result = `${indent}<${tag}`;
                if (props && props.children) {
                    result += `>\n${this.visualizeStructure(props.children, depth + 1, maxDepth)}\n${indent}</${tag}>`;
                } else if (props && props.text) {
                    result += `>${props.text}</${tag}>`;
                } else {
                    result += ' />';
                }
                return result;
            });
            return elements.join('\n');
        }

        return `${indent}${typeof component}`;
    }

    /**
     * Get optimization recommendations
     */
    getOptimizationRecommendations(component) {
        const recommendations = [];
        const complexity = this.analyzeComplexity(component);

        if (complexity > 500) {
            recommendations.push({
                type: 'complexity',
                message: 'Consider breaking down this component into smaller parts',
                priority: 'high'
            });
        }

        // Check for repeated patterns
        const serialized = JSON.stringify(component);
        const patterns = this.findRepeatedPatterns(serialized);
        if (patterns.length > 0) {
            recommendations.push({
                type: 'caching',
                message: 'Consider extracting repeated patterns into cached components',
                priority: 'medium',
                patterns: patterns.slice(0, 3)
            });
        }

        return recommendations;
    }

    /**
     * Find repeated patterns in component
     */
    findRepeatedPatterns(serialized) {
        const patterns = [];
        const minPatternLength = 20;

        for (let i = 0; i < serialized.length - minPatternLength; i++) {
            for (let len = minPatternLength; len <= 100 && i + len < serialized.length; len++) {
                const pattern = serialized.substring(i, i + len);
                const occurrences = (serialized.match(new RegExp(this.escapeRegex(pattern), 'g')) || []).length;

                if (occurrences > 2) {
                    patterns.push({ pattern: pattern.substring(0, 50) + '...', occurrences });
                    break; // Found a pattern starting at this position
                }
            }
        }

        return patterns.sort((a, b) => b.occurrences - a.occurrences);
    }

    /**
     * Escape regex special characters
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // Global error handler
        const originalConsoleError = console.error;
        console.error = (...args) => {
            // Log to dev tools
            this.errors.push({
                type: 'console',
                message: args.join(' '),
                timestamp: Date.now(),
                stack: new Error().stack
            });

            // Call original
            originalConsoleError.apply(console, args);
        };

        // Unhandled rejection handler (Node.js)
        if (typeof process !== 'undefined') {
            process.on('unhandledRejection', (reason, promise) => {
                this.errors.push({
                    type: 'unhandled-rejection',
                    message: reason.toString(),
                    promise: promise.toString(),
                    timestamp: Date.now()
                });
            });
        }

        // Browser error handler
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.errors.push({
                    type: 'browser-error',
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    timestamp: Date.now()
                });
            });
        }
    }

    /**
     * Handle render errors specifically
     */
    handleRenderError(error, component, context, renderId) {
        this.errors.push({
            type: 'render-error',
            message: error.message,
            stack: error.stack,
            component: this.serializeComponent(component),
            context: Object.keys(context),
            renderId,
            timestamp: Date.now()
        });

        console.error(`🚨 Render Error in ${renderId}:`, error.message);
        console.error('Component:', this.serializeComponent(component));
    }

    /**
     * Setup hot reload capability
     */
    setupHotReload() {
        if (typeof window !== 'undefined' && 'WebSocket' in window) {
            // Browser hot reload
            this.setupBrowserHotReload();
        } else if (typeof require !== 'undefined') {
            // Node.js file watching
            this.setupNodeHotReload();
        }
    }

    /**
     * Browser hot reload setup
     */
    setupBrowserHotReload() {
        // Connect to development server WebSocket
        try {
            const ws = new WebSocket('ws://localhost:3001/coherent-dev');

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'component-updated') {
                    console.log('🔄 Component updated:', data.componentName);
                    this.handleComponentUpdate(data);
                } else if (data.type === 'full-reload') {
                    window.location.reload();
                }
            };

            ws.onopen = () => {
                console.log('🔗 Connected to Coherent dev server');
                this.hotReloadEnabled = true;
            };

            ws.onclose = () => {
                console.log('🔌 Disconnected from dev server');
                this.hotReloadEnabled = false;
            };

        } catch (error) {
            // Dev server not available
        }
    }

    /**
     * Node.js hot reload setup
     */
    setupNodeHotReload() {
        // File system watching for component changes
        try {
            const fs = require('fs');
            const path = require('path');

            const watchDir = path.join(process.cwd(), 'src');

            fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
                if (filename && filename.endsWith('.js')) {
                    console.log(`🔄 File changed: ${filename}`);
                    this.handleFileChange(filename, eventType);
                }
            });

            this.hotReloadEnabled = true;

        } catch (error) {
            // File watching not available
        }
    }

    /**
     * Handle component updates
     */
    handleComponentUpdate(updateData) {
        // Clear related caches
        if (this.coherent.cache) {
            this.coherent.cache.invalidatePattern(updateData.componentName);
        }

        // Update component registry
        this.componentRegistry.set(updateData.componentName, {
            ...updateData,
            lastUpdated: Date.now()
        });

        // Trigger re-render if needed
        if (typeof window !== 'undefined' && window.location.search.includes('auto-reload=true')) {
            window.location.reload();
        }
    }

    /**
     * Handle file changes
     */
    handleFileChange(filename, eventType) {
        // Clear require cache for the changed file
        if (typeof require !== 'undefined' && require.cache) {
            const fullPath = require.resolve(path.resolve(filename));
            delete require.cache[fullPath];
        }

        console.log(`📝 ${eventType}: ${filename}`);
    }

    /**
     * Setup browser-specific dev tools
     */
    setupBrowserDevTools() {
        // Add dev tools panel to page
        this.createDevPanel();

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+C = Toggle dev panel
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
                this.toggleDevPanel();
                e.preventDefault();
            }

            // Ctrl+Shift+P = Performance report
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') {
                console.table(this.getPerformanceInsights());
                e.preventDefault();
            }
        });
    }

    /**
     * Create development panel in browser
     */
    createDevPanel() {
        // Create floating dev panel
        const panel = document.createElement('div');
        panel.id = 'coherent-dev-panel';
        panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      background: #1a1a1a;
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 999999;
      display: none;
      max-height: 80vh;
      overflow-y: auto;
    `;

        document.body.appendChild(panel);
        this.devPanel = panel;
        this.updateDevPanel();
    }

    /**
     * Toggle dev panel visibility
     */
    toggleDevPanel() {
        if (this.devPanel) {
            const isVisible = this.devPanel.style.display === 'block';
            this.devPanel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                this.updateDevPanel();
            }
        }
    }

    /**
     * Update dev panel content
     */
    updateDevPanel() {
        if (!this.devPanel) return;

        const stats = this.getPerformanceInsights();
        const recentRenders = this.renderHistory.slice(-5);
        const recentWarnings = this.warnings.slice(-3);

        this.devPanel.innerHTML = `
      <div style="padding: 15px; border-bottom: 1px solid #333;">
        <strong>🛠️ Coherent.js Dev Tools</strong>
        <button onclick="this.parentElement.parentElement.style.display='none'" 
                style="float: right; background: none; border: none; color: #fff; cursor: pointer;">×</button>
      </div>
      
      <div style="padding: 10px;">
        <h4 style="margin: 0 0 10px 0; color: #4CAF50;">Performance</h4>
        <div style="font-size: 11px;">
          <div>Avg Render: ${stats.averageRenderTime || 0}ms</div>
          <div>Cache Hit Rate: ${((stats.cacheHits || 0) / Math.max(stats.totalRenders || 1, 1) * 100).toFixed(1)}%</div>
          <div>Memory Usage: ${(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0).toFixed(1)}MB</div>
        </div>
      </div>
      
      <div style="padding: 10px;">
        <h4 style="margin: 0 0 10px 0; color: #2196F3;">Recent Renders</h4>
        ${recentRenders.map(r => `
          <div style="font-size: 10px; margin-bottom: 5px; padding: 3px; background: #333; border-radius: 3px;">
            ${r.id}: ${r.renderTime.toFixed(1)}ms (${r.complexity} nodes)
          </div>
        `).join('')}
      </div>
      
      ${recentWarnings.length > 0 ? `
        <div style="padding: 10px;">
          <h4 style="margin: 0 0 10px 0; color: #FF9800;">Warnings</h4>
          ${recentWarnings.map(w => `
            <div style="font-size: 10px; margin-bottom: 5px; padding: 3px; background: #4a2c0a; border-radius: 3px; color: #FFB74D;">
              ${w.type}: ${w.message}
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div style="padding: 10px; font-size: 10px; color: #888;">
        Press Ctrl+Shift+P for performance details
      </div>
    `;
    }

    /**
     * Setup Node.js specific dev tools
     */
    setupNodeDevTools() {
        // Add process event listeners
        process.on('SIGINT', () => {
            this.printDevSummary();
            process.exit();
        });
    }

    /**
     * Print development summary
     */
    printDevSummary() {
        console.log('\n🛠️ Coherent.js Development Summary');
        console.log('=================================');
        console.log(`Total Renders: ${this.renderHistory.length}`);
        console.log(`Total Warnings: ${this.warnings.length}`);
        console.log(`Total Errors: ${this.errors.length}`);

        if (this.renderHistory.length > 0) {
            const avgTime = this.renderHistory.reduce((sum, r) => sum + r.renderTime, 0) / this.renderHistory.length;
            console.log(`Average Render Time: ${avgTime.toFixed(2)}ms`);
        }

        console.log('=================================\n');
    }

    /**
     * Get performance insights
     */
    getPerformanceInsights() {
        const insights = {
            totalRenders: this.renderHistory.length,
            averageRenderTime: 0,
            slowestRender: null,
            fastestRender: null,
            cacheHits: 0,
            totalWarnings: this.warnings.length,
            totalErrors: this.errors.length
        };

        if (this.renderHistory.length > 0) {
            const times = this.renderHistory.map(r => r.renderTime);
            insights.averageRenderTime = times.reduce((a, b) => a + b, 0) / times.length;
            insights.slowestRender = Math.max(...times);
            insights.fastestRender = Math.min(...times);
        }

        // Get cache stats if available
        if (this.coherent.cache && this.coherent.cache.getStats) {
            const cacheStats = this.coherent.cache.getStats();
            insights.cacheHits = cacheStats.hits;
            insights.cacheHitRate = cacheStats.hitRate;
        }

        // Add performance monitor data if available
        if (performanceMonitor && performanceMonitor.getStats) {
            const perfStats = performanceMonitor.getStats();
            insights.performanceMonitorStats = perfStats;
        }

        return insights;
    }

    /**
     * Utility methods
     */
    generateRenderId() {
        return `render_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    serializeComponent(component, maxDepth = 3, currentDepth = 0) {
        if (currentDepth > maxDepth) return '...';

        try {
            if (typeof component === 'function') {
                return `[Function: ${component.name || 'anonymous'}]`;
            }

            if (Array.isArray(component)) {
                return component.slice(0, 3).map(c =>
                    this.serializeComponent(c, maxDepth, currentDepth + 1)
                ).concat(component.length > 3 ? [`...(${component.length - 3} more)`] : []);
            }

            if (component && typeof component === 'object') {
                const serialized = {};
                const keys = Object.keys(component).slice(0, 10);

                for (const key of keys) {
                    if (key === 'children' && component[key]) {
                        serialized[key] = this.serializeComponent(component[key], maxDepth, currentDepth + 1);
                    } else if (typeof component[key] === 'function') {
                        serialized[key] = `[Function: ${component[key].name || 'anonymous'}]`;
                    } else {
                        serialized[key] = component[key];
                    }
                }

                if (Object.keys(component).length > 10) {
                    serialized['...'] = `(${Object.keys(component).length - 10} more properties)`;
                }

                return serialized;
            }

            return component;

        } catch (error) {
            return `[Serialization Error: ${error.message}]`;
        }
    }

    clearDevData() {
        this.renderHistory = [];
        this.warnings = [];
        this.errors = [];
        this.componentRegistry.clear();
        console.log('🧹 Dev data cleared');
    }

    toggleFeature(feature) {
        switch (feature) {
            case 'cache':
                if (this.coherent.cache) {
                    this.coherent.cache.enabled = !this.coherent.cache.enabled;
                    console.log(`Cache ${this.coherent.cache.enabled ? 'enabled' : 'disabled'}`);
                }
                break;
            case 'monitoring':
                if (performanceMonitor) {
                    performanceMonitor.enabled = !performanceMonitor.enabled;
                    console.log(`Monitoring ${performanceMonitor.enabled ? 'enabled' : 'disabled'}`);
                }
                break;
            case 'hot-reload':
                this.hotReloadEnabled = !this.hotReloadEnabled;
                console.log(`Hot reload ${this.hotReloadEnabled ? 'enabled' : 'disabled'}`);
                break;
            default:
                console.log(`Unknown feature: ${feature}`);
        }
    }

    validateComponent(component) {
        return this.deepValidateComponent(component);
    }

    setupComponentInspector() {
        // Register components for inspection
        const originalCreateComponent = this.coherent.createComponent;

        if (originalCreateComponent) {
            this.coherent.createComponent = (config) => {
                const component = originalCreateComponent.call(this.coherent, config);

                // Register component
                this.componentRegistry.set(config.name || 'anonymous', {
                    config,
                    component,
                    registeredAt: Date.now()
                });

                return component;
            };
        }
    }
}

/**
 * Create a lightweight dev tools instance
 */
export function createDevTools(coherentInstance) {
    return new DevTools(coherentInstance);
}

/**
 * Global dev tools utilities (available even when DevTools is disabled)
 */
export const devUtils = {
    /**
     * Quick component inspection
     */
    inspect: (component) => {
        console.log('🔍 Component Inspection:');
        console.log('Type:', typeof component);
        console.log('Structure:', component);

        if (isCoherentObject(component)) {
            const tags = Object.keys(component);
            console.log('Tags:', tags);

            for (const tag of tags) {
                const props = component[tag];
                if (props && typeof props === 'object') {
                    console.log(`${tag} props:`, Object.keys(props));
                }
            }
        }
    },

    /**
     * Simple validation
     */
    validate: (component) => {
        try {
            validateComponent(component);
            console.log('✅ Component is valid');
            return true;
        } catch (error) {
            console.error('❌ Component validation failed:', error.message);
            return false;
        }
    },

    /**
     * Performance timing helper
     */
    time: (label, fn) => {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }
};

export default DevTools;
