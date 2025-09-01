/**
 * DOM Renderer for Coherent.js
 * 
 * Provides client-side DOM rendering with hydration support.
 * Extends BaseRenderer for shared functionality.
 */

import { BaseRenderer } from './base-renderer.js';
import { 
    isCoherentObject,
    hasChildren,
    getChildren
} from '../core/object-utils.js';
import { VDOMDiffer } from './vdom-diff.js';



/**
 * DOM Renderer class - extends BaseRenderer for shared functionality
 */
export class DOMRenderer extends BaseRenderer {
    constructor(options = {}) {
        // Call parent constructor with DOM-specific defaults
        super({
            enableHydration: true,
            maxDepth: 100, // Lower depth for DOM rendering
            enableVDOMDiff: options.enableVDOMDiff !== false, // Enable VDOM diffing by default
            ...options
        });
        
        // Set up utilities for easy access
        this.utils = {
            isCoherentObject,
            hasChildren,
            getChildren
        };

        // Initialize virtual DOM differ for efficient updates
        if (this.config.enableVDOMDiff) {
            this.vdomDiffer = new VDOMDiffer();
            this.componentCache = new Map(); // Cache previous component states
        }
    }

    /**
     * Render component to DOM element
     */
    render(component, container = null) {
        this.resetMetrics();
        this.metrics.startTime = performance.now();
        
        try {
            const element = this.renderComponent(component, {}, 0);
            
            if (container && element) {
                // Clear container first if hydration is disabled
                if (!this.config.enableHydration) {
                    container.replaceChildren();
                }
                container.appendChild(element);
            }
            
            this.metrics.endTime = performance.now();
            return element;
        } catch (error) {
            this.recordError('render', error);
            console.error('Error rendering to DOM:', error);
            throw error;
        }
    }

    /**
     * Render component to DOM element (overrides BaseRenderer method)
     */
    renderComponent(component, options = {}, depth = 0) {
        // Use parent validation
        this.validateDepth(depth);
        this.metrics.elementsProcessed++;

        // Handle different component types
        if (component === null || component === undefined) {
            return document.createTextNode('');
        }

        if (typeof component === 'string') {
            return document.createTextNode(component);
        }

        if (typeof component === 'number' || typeof component === 'boolean') {
            return document.createTextNode(String(component));
        }

        if (typeof component === 'function') {
            // Execute function components using parent method
            const result = this.executeFunctionComponent(component, depth);
            return this.renderComponent(result, options, depth + 1);
        }

        if (Array.isArray(component)) {
            // Create a fragment for multiple elements
            const fragment = document.createDocumentFragment();
            component.forEach(child => {
                const childElement = this.renderComponent(child, options, depth + 1);
                if (childElement) {
                    fragment.appendChild(childElement);
                }
            });
            return fragment;
        }

        // Handle object-based components
        return this.renderObjectElement(component, depth);
    }

    /**
     * Render object-based element to DOM
     */
    renderObjectElement(component, depth) {
        if (!this.utils.isCoherentObject(component)) {
            return document.createTextNode(''); // Skip invalid objects
        }

        // Process object-based component (expects single element)
        const entries = Object.entries(component);
        if (entries.length > 0) {
            const [tagName, props] = entries[0];
            return this.renderDOMElement(tagName, props, depth + 1);
        }
        return document.createTextNode('');
    }

    /**
     * Render a single DOM element
     */
    renderDOMElement(tagName, props, depth) {
        // Create element with namespace support
        const element = this.config.namespace 
            ? document.createElementNS(this.config.namespace, tagName)
            : document.createElement(tagName);

        // Set attributes
        this.setDOMAttributes(element, props);

        // Handle text content
        if (props && props.text !== undefined) {
            const text = typeof props.text === 'function' ? props.text() : props.text;
            element.textContent = String(text);
        }

        // Handle children
        if (props && this.utils.hasChildren(props)) {
            const children = this.utils.getChildren(props);
            if (Array.isArray(children)) {
                children.forEach(child => {
                    const childElement = this.renderComponent(child, {}, depth + 1);
                    if (childElement) {
                        element.appendChild(childElement);
                    }
                });
            } else if (children) {
                const childElement = this.renderComponent(children, {}, depth + 1);
                if (childElement) {
                    element.appendChild(childElement);
                }
            }
        }

        return element;
    }

    /**
     * Set DOM attributes from props
     */
    setDOMAttributes(element, props) {
        if (!props || typeof props !== 'object') return;

        const skipProps = ['text', 'children'];

        for (const [key, value] of Object.entries(props)) {
            if (skipProps.includes(key) || value === undefined || value === null) {
                continue;
            }

            if (typeof value === 'function') {
                // Handle event listeners
                if (key.startsWith('on')) {
                    // Normalize DOM event names to lowercase (e.g., onClick -> 'click')
                    const eventType = key.slice(2).toLowerCase();
                    // Store listener reference for potential cleanup
                    element.addEventListener(eventType, value);
                    element._listeners = element._listeners || [];
                    element._listeners.push({ type: eventType, handler: value });
                }
                continue;
            }
            if (key === 'class' || key === 'className') {
                element.className = String(value);
            } else if (typeof value === 'boolean') {
                if (value) {
                    element.setAttribute(key, '');
                } else {
                    element.removeAttribute(key);
                }
            } else {
                element.setAttribute(key, String(value));
            }
        }
    }

    /**
     * Update existing DOM element with new component using virtual DOM diffing
     */
    update(element, newComponent, componentId = 'default') {
        if (!this.config.enableVDOMDiff || !this.vdomDiffer) {
            // Fallback to full re-render
            return this.render(newComponent, element.parentNode);
        }

        const oldComponent = this.componentCache.get(componentId);
        
        if (!oldComponent) {
            // First render, cache the component and render normally
            this.componentCache.set(componentId, newComponent);
            return this.render(newComponent, element.parentNode);
        }

        // Perform virtual DOM diffing
        try {
            const patchCount = this.vdomDiffer.update(element, oldComponent, newComponent);
            
            // Update cache with new component
            this.componentCache.set(componentId, newComponent);
            
            // Log performance metrics
            if (this.config.enableMonitoring) {
                this.metrics.patchesApplied = (this.metrics.patchesApplied || 0) + patchCount;
            }
            
            return element;
        } catch (error) {
            console.warn('VDOM diffing failed, falling back to full re-render:', error);
            // Clear corrupted cache entry
            this.componentCache.delete(componentId);
            // Fall back to full re-render
            return this.render(newComponent, element.parentNode);
        }
    }

    /**
     * Clear component cache (useful for development or memory management)
     */
    clearCache() {
        if (this.componentCache) {
            this.componentCache.clear();
        }
        if (this.vdomDiffer) {
            this.vdomDiffer.clearCache();
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            componentsCached: this.componentCache ? this.componentCache.size : 0,
            vdomCached: this.vdomDiffer ? this.vdomDiffer.cache.size : 0,
            patchesApplied: this.metrics.patchesApplied || 0
        };
    }
}

/**
 * Main DOM render function - converts object components to DOM elements
 */
export function renderToDOM(component, container = null, options = {}) {
    const renderer = new DOMRenderer(options);
    return renderer.render(component, container);
}

/**
 * Update DOM element with new component using virtual DOM diffing
 */
export function updateDOM(element, newComponent, componentId, options = {}) {
    const renderer = new DOMRenderer(options);
    return renderer.update(element, newComponent, componentId);
}
