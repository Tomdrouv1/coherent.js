/**
 * DOM renderer for Coherent.js
 * Renders components directly to DOM elements with proper event handling
 */

import {
    isCoherentObject,
    extractProps,
    hasChildren,
    normalizeChildren,
} from '../core/object-utils.js';

import {
    isVoidElement,
    formatAttributes,
} from '../core/html-utils.js';

import { hydrate } from '../client/hydration.js';

// Global event registry for function-valued props
if (typeof window !== 'undefined') {
    window.__coherentEventRegistry = window.__coherentEventRegistry || new Map();
}

/**
 * Main DOM render function - converts object components to DOM elements
 */
export function renderToDOM(component, container = null, options = {}) {
    const config = {
        enableHydration: options.enableHydration !== false,
        ...options
    };

    try {
        // Render the component to a DOM element
        const element = renderComponent(component, config, 0);
        
        // If a container is provided, append the element to it
        if (container) {
            // Clear container first
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            container.appendChild(element);
        }
        
        return element;
    } catch (error) {
        console.error('Error rendering to DOM:', error);
        throw error;
    }
}

/**
 * Render a single component to a DOM element
 */
function renderComponent(component, options, depth = 0) {
    // Depth protection
    if (depth > 100) {
        throw new Error('Maximum render depth (100) exceeded');
    }

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
        // Execute function components
        const result = component();
        return renderComponent(result, options, depth + 1);
    }

    if (Array.isArray(component)) {
        // Create a fragment for multiple elements
        const fragment = document.createDocumentFragment();
        component.forEach(child => {
            const childElement = renderComponent(child, options, depth + 1);
            if (childElement) {
                fragment.appendChild(childElement);
            }
        });
        return fragment;
    }

    // Handle object elements
    if (isCoherentObject(component)) {
        const tagName = Object.keys(component)[0];
        const elementContent = component[tagName];
        
        if (typeof tagName === 'string') {
            return renderElement(tagName, elementContent, options, depth);
        }
    }

    // Fallback for unknown types
    return document.createTextNode(String(component));
}

/**
 * Render an HTML element with attributes and children
 */
function renderElement(tagName, element, options, depth = 0) {
    // Create the element
    let domElement;
    
    if (tagName.toLowerCase() === 'svg' || (element && element.namespace === 'http://www.w3.org/2000/svg')) {
        domElement = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    } else {
        domElement = document.createElement(tagName);
    }

    // Extract props and children
    const { children, text, ...props } = element || {};

    // Apply attributes
    applyAttributes(domElement, props, options);

    // Handle text content
    if (text !== undefined) {
        if (typeof text === 'function') {
            domElement.textContent = String(text());
        } else {
            domElement.textContent = String(text);
        }
    }

    // Handle children
    if (children) {
        const normalizedChildren = normalizeChildren(children);
        normalizedChildren.forEach(child => {
            const childElement = renderComponent(child, options, depth + 1);
            if (childElement) {
                domElement.appendChild(childElement);
            }
        });
    }

    return domElement;
}

/**
 * Apply attributes to a DOM element, including event listeners
 */
function applyAttributes(element, props, options) {
    Object.keys(props).forEach(key => {
        const value = props[key];
        
        // Handle event listeners
        if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.substring(2).toLowerCase();
            
            // For DOM rendering, we can directly attach event listeners
            if (typeof window !== 'undefined') {
                element.addEventListener(eventName, value);
            }
            
            // Also populate the action registry for hydration support
            // Check if we're in Node.js or browser environment
            if (typeof global !== 'undefined') {
                // Server-side, store in global for hydration
                const actionId = `__coherent_action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                if (!global.__coherentActionRegistry) {
                    global.__coherentActionRegistry = {};
                }
                global.__coherentActionRegistry[actionId] = value;
                
                // Debug log
                console.log('Adding action to registry:', actionId);
                
                // Set data attributes for hydration
                element.setAttribute('data-action', actionId);
                element.setAttribute('data-event', eventName);
            }
        }
        // Handle special attributes
        else if (key === 'className') {
            element.className = value;
        }
        else if (key === 'htmlFor') {
            element.setAttribute('for', value);
        }
        // Handle style object
        else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        }
        // Handle other attributes
        else if (value !== null && value !== undefined) {
            element.setAttribute(key, String(value));
        }
    });
}

/**
 * Hydrate a component in a container
 */
export function hydrateComponent(component, container, options = {}) {
    if (!container) {
        throw new Error('Container element is required for hydration');
    }

    // Clear the container
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Render the component
    const element = renderToDOM(component, null, options);
    
    // Append to container
    container.appendChild(element);
    
    // If hydration is enabled, hydrate the component
    if (options.enableHydration !== false) {
        // This would be where we'd integrate with the hydration system
        // For now, we're just rendering directly to DOM
    }
    
    return element;
}

/**
 * Render with hydration support
 */
export function renderWithHydration(component, container, options = {}) {
    return hydrateComponent(component, container, { ...options, enableHydration: true });
}
