/**
 * Virtual DOM Diffing Engine for Coherent.js
 * Implements efficient diffing algorithm to minimize DOM updates
 */

/**
 * Types of virtual DOM operations
 */
export const VDOM_OPERATIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    REMOVE: 'REMOVE',
    REPLACE: 'REPLACE',
    MOVE: 'MOVE'
};

/**
 * Virtual DOM node structure
 */
export function createVNode(type, props = {}, children = []) {
    return {
        type,
        props: props || {},
        children: Array.isArray(children) ? children : [children].filter(Boolean),
        key: props?.key,
        _coherent: true
    };
}

/**
 * Convert Coherent object to virtual DOM node
 */
export function objectToVNode(component, depth = 0) {
    if (depth > 100) {
        console.warn('Maximum depth reached in virtual DOM creation');
        return createVNode('span', {}, ['Maximum depth exceeded']);
    }

    if (component === null || component === undefined) {
        return null;
    }

    if (typeof component === 'string' || typeof component === 'number') {
        return String(component);
    }

    if (typeof component === 'boolean') {
        return component ? 'true' : 'false';
    }

    if (Array.isArray(component)) {
        return component.map(child => objectToVNode(child, depth + 1)).filter(Boolean);
    }

    if (typeof component === 'function') {
        try {
            const result = component();
            return objectToVNode(result, depth + 1);
        } catch (_error) {
            console.error('Error executing function component:', _error);
            return createVNode('span', { className: '_error' }, [`Error: ${_error.message}`]);
        }
    }

    if (typeof component === 'object' && component !== null) {
        const entries = Object.entries(component);
        if (entries.length === 1) {
            const [tagName, props] = entries[0];
            
            if (typeof props === 'object' && props !== null) {
                const { children, text, ...otherProps } = props;
                
                let childNodes = [];
                if (text !== undefined) {
                    childNodes = [String(text)];
                } else if (children) {
                    if (Array.isArray(children)) {
                        childNodes = children.map(child => objectToVNode(child, depth + 1)).filter(Boolean);
                    } else {
                        const child = objectToVNode(children, depth + 1);
                        if (child) childNodes = [child];
                    }
                }

                return createVNode(tagName, otherProps, childNodes);
            } else {
                // Simple case: { div: 'text content' }
                return createVNode(tagName, {}, [String(props)]);
            }
        }
    }

    return null;
}

/**
 * Compare two virtual DOM nodes and generate patch operations
 */
export function diff(oldVNode, newVNode, patches = [], path = []) {
    // Handle null cases
    if (!oldVNode && !newVNode) {
        return patches;
    }

    if (!oldVNode && newVNode) {
        patches.push({
            type: VDOM_OPERATIONS.CREATE,
            path: [...path],
            vnode: newVNode
        });
        return patches;
    }

    if (oldVNode && !newVNode) {
        patches.push({
            type: VDOM_OPERATIONS.REMOVE,
            path: [...path]
        });
        return patches;
    }

    // Handle text nodes
    if (typeof oldVNode === 'string' || typeof newVNode === 'string') {
        if (oldVNode !== newVNode) {
            patches.push({
                type: VDOM_OPERATIONS.REPLACE,
                path: [...path],
                vnode: newVNode
            });
        }
        return patches;
    }

    // Handle array diffing (fragment children)
    if (Array.isArray(oldVNode) || Array.isArray(newVNode)) {
        return diffArrays(oldVNode, newVNode, patches, path);
    }

    // Handle element diffing
    if (oldVNode.type !== newVNode.type) {
        patches.push({
            type: VDOM_OPERATIONS.REPLACE,
            path: [...path],
            vnode: newVNode
        });
        return patches;
    }

    // Diff props
    const propPatches = diffProps(oldVNode.props, newVNode.props, path);
    patches.push(...propPatches);

    // Diff children
    diffArrays(oldVNode.children, newVNode.children, patches, [...path, 'children']);

    return patches;
}

/**
 * Diff arrays of virtual nodes (optimized for keyed elements)
 */
function diffArrays(oldChildren = [], newChildren = [], patches = [], path = []) {
    const oldArray = Array.isArray(oldChildren) ? oldChildren : [oldChildren].filter(Boolean);
    const newArray = Array.isArray(newChildren) ? newChildren : [newChildren].filter(Boolean);

    // Simple case: lengths differ significantly, replace all
    if (Math.abs(oldArray.length - newArray.length) > Math.max(oldArray.length, newArray.length) * 0.5) {
        patches.push({
            type: VDOM_OPERATIONS.REPLACE,
            path: [...path],
            vnode: newArray
        });
        return patches;
    }

    // Track keys for efficient reordering
    const oldKeyMap = new Map();
    const newKeyMap = new Map();
    
    oldArray.forEach((child, index) => {
        if (child && child.key !== undefined) {
            oldKeyMap.set(child.key, { child, index });
        }
    });

    newArray.forEach((child, index) => {
        if (child && child.key !== undefined) {
            newKeyMap.set(child.key, { child, index });
        }
    });

    // Process children
    const maxLength = Math.max(oldArray.length, newArray.length);
    for (let i = 0; i < maxLength; i++) {
        const oldChild = oldArray[i];
        const newChild = newArray[i];
        const childPath = [...path, i];

        if (oldChild && newChild && oldChild.key && newChild.key) {
            // Handle keyed elements
            if (oldChild.key !== newChild.key) {
                // Check if this is a move operation
                const oldPos = newKeyMap.get(oldChild.key);
                if (oldPos && oldPos.index !== i) {
                    patches.push({
                        type: VDOM_OPERATIONS.MOVE,
                        path: childPath,
                        from: oldPos.index,
                        to: i
                    });
                } else {
                    // Replace with new element
                    patches.push({
                        type: VDOM_OPERATIONS.REPLACE,
                        path: childPath,
                        vnode: newChild
                    });
                }
            } else {
                // Same key, diff the elements
                diff(oldChild, newChild, patches, childPath);
            }
        } else {
            // Handle non-keyed elements
            diff(oldChild, newChild, patches, childPath);
        }
    }

    return patches;
}

/**
 * Diff element properties
 */
function diffProps(oldProps = {}, newProps = {}, path = []) {
    const patches = [];
    const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

    for (const key of allKeys) {
        if (key === 'children') continue; // Children handled separately

        const oldValue = oldProps[key];
        const newValue = newProps[key];

        if (oldValue !== newValue) {
            patches.push({
                type: VDOM_OPERATIONS.UPDATE,
                path: [...path, 'props', key],
                oldValue,
                newValue
            });
        }
    }

    return patches;
}

/**
 * Apply patches to a DOM element
 */
export function patch(element, patches) {
    if (!element || !patches.length) {
        return element;
    }

    const patchResults = [];

    for (const p of patches) {
        try {
            const result = applyPatch(element, p);
            patchResults.push(result);
        } catch (_error) {
            console.error('Error applying patch:', _error, p);
        }
    }

    return element;
}

/**
 * Apply a single patch operation
 */
function applyPatch(rootElement, patch) {
    const target = getElementByPath(rootElement, patch.path);

    switch (patch.type) {
        case VDOM_OPERATIONS.CREATE:
            const newElement = vnodeToDOM(patch.vnode);
            if (target && target.parentNode) {
                target.parentNode.appendChild(newElement);
            }
            return newElement;

        case VDOM_OPERATIONS.REMOVE:
            if (target && target.parentNode) {
                target.parentNode.removeChild(target);
            }
            return null;

        case VDOM_OPERATIONS.REPLACE:
            const replacement = vnodeToDOM(patch.vnode);
            if (target && target.parentNode) {
                target.parentNode.replaceChild(replacement, target);
            }
            return replacement;

        case VDOM_OPERATIONS.UPDATE:
            if (target && patch.path[patch.path.length - 2] === 'props') {
                const propName = patch.path[patch.path.length - 1];
                updateDOMProperty(target, propName, patch.oldValue, patch.newValue);
            }
            return target;

        case VDOM_OPERATIONS.MOVE:
            if (target && target.parentNode) {
                const parent = target.parentNode;
                const children = Array.from(parent.children);
                const fromElement = children[patch.from];
                const toPosition = patch.to;

                if (fromElement && toPosition < children.length) {
                    parent.insertBefore(fromElement, children[toPosition]);
                }
            }
            return target;

        default:
            console.warn('Unknown patch operation:', patch.type);
            return target;
    }
}

/**
 * Navigate DOM tree by path
 */
function getElementByPath(element, path) {
    let current = element;
    
    for (const segment of path) {
        if (!current) return null;
        
        if (segment === 'children') {
            continue; // Skip children marker
        }
        
        if (typeof segment === 'number') {
            current = current.children[segment];
        } else if (segment === 'props') {
            continue; // Props handled in UPDATE operations
        }
    }
    
    return current;
}

/**
 * Convert virtual node to DOM element
 */
function vnodeToDOM(vnode) {
    if (typeof vnode === 'string') {
        return document.createTextNode(vnode);
    }

    if (Array.isArray(vnode)) {
        const fragment = document.createDocumentFragment();
        vnode.forEach(child => {
            const childElement = vnodeToDOM(child);
            if (childElement) {
                fragment.appendChild(childElement);
            }
        });
        return fragment;
    }

    if (vnode && vnode.type) {
        const element = document.createElement(vnode.type);
        
        // Set properties
        Object.entries(vnode.props).forEach(([key, value]) => {
            updateDOMProperty(element, key, undefined, value);
        });

        // Append children
        vnode.children.forEach(child => {
            const childElement = vnodeToDOM(child);
            if (childElement) {
                element.appendChild(childElement);
            }
        });

        return element;
    }

    return null;
}

/**
 * Update DOM element property
 */
function updateDOMProperty(element, name, oldValue, newValue) {
    // Handle special properties
    if (name === 'className' || name === 'class') {
        element.className = newValue || '';
        return;
    }

    if (name.startsWith('on') && typeof newValue === 'function') {
        const eventType = name.slice(2).toLowerCase();
        
        // Remove old event listener
        if (typeof oldValue === 'function') {
            element.removeEventListener(eventType, oldValue);
        }
        
        // Add new event listener
        element.addEventListener(eventType, newValue);
        return;
    }

    if (newValue === null || newValue === undefined) {
        element.removeAttribute(name);
    } else if (typeof newValue === 'boolean') {
        if (newValue) {
            element.setAttribute(name, '');
        } else {
            element.removeAttribute(name);
        }
    } else {
        element.setAttribute(name, String(newValue));
    }
}

/**
 * Create a virtual DOM differ for component updates
 */
export class VDOMDiffer {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Perform efficient diff and patch
     */
    update(element, oldComponent, newComponent) {
        const oldVNode = objectToVNode(oldComponent);
        const newVNode = objectToVNode(newComponent);
        
        const patches = diff(oldVNode, newVNode);
        
        if (patches.length > 0) {
            patch(element, patches);
        }
        
        return patches.length;
    }

    /**
     * Cache virtual nodes for performance
     */
    cacheVNode(key, vnode) {
        this.cache.set(key, vnode);
    }

    getCachedVNode(key) {
        return this.cache.get(key);
    }

    clearCache() {
        this.cache.clear();
    }
}

export default VDOMDiffer;