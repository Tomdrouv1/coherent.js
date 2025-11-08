/**
 * Bundle size optimization through tree-shaking and code analysis
 */

export class BundleOptimizer {
    constructor() {
        this.usedComponents = new Set();
        this.usedUtilities = new Set();
        this.componentDependencies = new Map();
        this.unusedCode = new Set();
    }

    // Analyze component tree to identify what's actually used
    analyzeUsage(rootComponent, props = {}) {
        const analysisContext = {
            componentStack: [],
            propsFlow: new Map(),
            conditionalBranches: new Set()
        };

        this.traverseComponent(rootComponent, props, analysisContext);
        return this.generateOptimizationReport();
    }

    traverseComponent(component, props, context) {
        const componentName = this.getComponentName(component);

        // Track component usage
        this.usedComponents.add(componentName);
        context.componentStack.push(componentName);

        // Track props flow for optimization
        context.propsFlow.set(componentName, Object.keys(props));

        // Analyze component implementation
        if (typeof component === 'function') {
            this.analyzeFunctionComponent(component, props, context);
        } else if (typeof component === 'object') {
            this.analyzeObjectComponent(component, context);
        }

        context.componentStack.pop();
    }

    analyzeFunctionComponent(component, props, context) {
        const componentStr = component.toString();

        // Detect conditional rendering patterns
        const conditionalPatterns = [
            /\?\s*\{/g,  // Conditional objects
            /&&\s*\{/g,  // Logical AND rendering
            /if\s*\(/g   // If statements
        ];

        for (const pattern of conditionalPatterns) {
            const matches = componentStr.match(pattern);
            if (matches) {
                context.conditionalBranches.add(`${this.getComponentName(component)}_conditional`);
            }
        }

        // Try to execute with sample props to discover runtime paths
        try {
            const result = component(props);
            if (result) {
                this.traverseComponent(result, {}, context);
            }
        } catch {
            // Component might need specific props, skip runtime analysis
        }
    }

    analyzeObjectComponent(obj, context) {
        if (Array.isArray(obj)) {
            obj.forEach(item => {
                if (item && typeof item === 'object') {
                    this.traverseComponent(item, {}, context);
                }
            });
            return;
        }

        const keys = Object.keys(obj);
        if (keys.length === 1) {
            const tagName = keys[0];
            const props = obj[tagName];

            // Track HTML tag usage
            this.usedComponents.add(`html_${tagName}`);

            // Traverse children
            if (props && typeof props === 'object') {
                if (props.children) {
                    if (Array.isArray(props.children)) {
                        props.children.forEach(child => {
                            this.traverseComponent(child, {}, context);
                        });
                    } else {
                        this.traverseComponent(props.children, {}, context);
                    }
                }
            }
        }
    }

    getComponentName(component) {
        if (typeof component === 'function') {
            return component.name || 'AnonymousFunction';
        }
        if (typeof component === 'object' && component) {
            const keys = Object.keys(component);
            return keys.length > 0 ? `Object_${keys[0]}` : 'EmptyObject';
        }
        return 'Unknown';
    }

    // Generate optimization recommendations
    generateOptimizationReport() {
        return {
            usedComponents: Array.from(this.usedComponents),
            componentDependencies: Object.fromEntries(this.componentDependencies),
            optimizationOpportunities: this.findOptimizationOpportunities(),
            bundleEstimate: this.estimateBundleSize(),
            recommendations: this.generateRecommendations()
        };
    }

    findOptimizationOpportunities() {
        const opportunities = [];

        // Check for unused utilities
        const coreUtilities = ['validateCoherentObject', 'mergeProps', 'cloneCoherentObject'];
        const unusedUtilities = coreUtilities.filter(util => !this.usedUtilities.has(util));

        if (unusedUtilities.length > 0) {
            opportunities.push({
                type: 'unused_utilities',
                impact: 'medium',
                description: `Remove unused utilities: ${unusedUtilities.join(', ')}`,
                estimatedSavings: unusedUtilities.length * 2 // KB estimate
            });
        }

        // Check for component consolidation opportunities
        const htmlComponents = Array.from(this.usedComponents)
            .filter(name => name.startsWith('html_'));

        if (htmlComponents.length < 10) {
            opportunities.push({
                type: 'minimal_html_tags',
                impact: 'high',
                description: 'Create minimal HTML tag bundle for smaller apps',
                estimatedSavings: 15 // KB estimate
            });
        }

        return opportunities;
    }

    estimateBundleSize() {
        const baseFrameworkSize = 25; // KB
        const componentOverhead = this.usedComponents.size * 0.5; // KB per component
        const utilitySize = this.usedUtilities.size * 2; // KB per utility

        return {
            estimated: baseFrameworkSize + componentOverhead + utilitySize,
            breakdown: {
                framework: baseFrameworkSize,
                components: componentOverhead,
                utilities: utilitySize
            }
        };
    }

    generateRecommendations() {
        const recommendations = [];

        if (this.usedComponents.size < 5) {
            recommendations.push({
                priority: 'high',
                action: 'Consider creating a minimal bundle with only required components',
                impact: 'Reduce bundle size by 40-60%'
            });
        }

        if (this.usedComponents.size > 50) {
            recommendations.push({
                priority: 'medium',
                action: 'Implement code-splitting to load components on demand',
                impact: 'Improve initial load time by 30-50%'
            });
        }

        return recommendations;
    }

    // Generate optimized bundle configuration
    generateOptimizedConfig() {
        return {
            entryPoints: {
                core: ['./src/index.js'],
                components: Array.from(this.usedComponents)
                    .filter(name => !name.startsWith('html_'))
                    .map(name => `./src/components/${name}.js`),
                utilities: Array.from(this.usedUtilities)
                    .map(name => `./src/core/${name}.js`)
            },
            treeShaking: {
                unusedExports: Array.from(this.unusedCode),
                sideEffects: false
            },
            optimization: {
                minify: true,
                splitChunks: this.usedComponents.size > 20
            }
        };
    }
}

export const bundleOptimizer = new BundleOptimizer();
