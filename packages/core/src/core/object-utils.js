/**
 * Core Object Utilities for Coherent.js
 * Handles object validation, manipulation, and analysis
 */

/**
 * Deep clone an object with optimizations for common patterns
 * Handles circular references, functions, dates, regex, and more
 */
export function deepClone(obj, seen = new WeakMap()) {
    // Handle primitives
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Handle circular references
    if (seen.has(obj)) {
        return seen.get(obj);
    }

    // Handle Date objects
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    // Handle RegExp objects
    if (obj instanceof RegExp) {
        return new RegExp(obj.source, obj.flags);
    }

    // Handle Array objects
    if (Array.isArray(obj)) {
        const clonedArray = [];
        seen.set(obj, clonedArray);

        for (let i = 0; i < obj.length; i++) {
            clonedArray[i] = deepClone(obj[i], seen);
        }

        return clonedArray;
    }

    // Handle Function objects (preserve reference for performance)
    if (typeof obj === 'function') {
        // For Coherent components, we typically want to preserve function references
        // rather than cloning them, as they represent behavior
        return obj;
    }

    // Handle Map objects
    if (obj instanceof Map) {
        const clonedMap = new Map();
        seen.set(obj, clonedMap);

        for (const [key, value] of obj) {
            clonedMap.set(deepClone(key, seen), deepClone(value, seen));
        }

        return clonedMap;
    }

    // Handle Set objects
    if (obj instanceof Set) {
        const clonedSet = new Set();
        seen.set(obj, clonedSet);

        for (const value of obj) {
            clonedSet.add(deepClone(value, seen));
        }

        return clonedSet;
    }

    // Handle WeakMap and WeakSet (cannot be cloned, return new empty instance)
    if (obj instanceof WeakMap) {
        return new WeakMap();
    }

    if (obj instanceof WeakSet) {
        return new WeakSet();
    }

    // Handle plain objects and other object types
    const clonedObj = {};
    seen.set(obj, clonedObj);

    // Handle objects with custom prototypes
    if (obj.constructor && obj.constructor !== Object) {
        try {
            // Attempt to create instance with same constructor
            clonedObj.__proto__ = obj.__proto__;
        } catch {
            // Fallback to Object.create if direct prototype assignment fails
            Object.setPrototypeOf(clonedObj, Object.getPrototypeOf(obj));
        }
    }

    // Clone all enumerable properties
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key], seen);
        }
    }

    // Clone non-enumerable properties (important for some objects)
    const descriptors = Object.getOwnPropertyDescriptors(obj);
    for (const key of Object.keys(descriptors)) {
        if (!descriptors[key].enumerable && descriptors[key].configurable) {
            try {
                Object.defineProperty(clonedObj, key, {
                    ...descriptors[key],
                    value: deepClone(descriptors[key].value, seen)
                });
            } catch {
                // Skip properties that can't be cloned
            }
        }
    }

    return clonedObj;
}

/**
 * Shallow clone optimized for Coherent objects
 * Much faster than deep clone when you only need one level
 */
export function shallowClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return [...obj];
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if (obj instanceof RegExp) {
        return new RegExp(obj.source, obj.flags);
    }

    // For objects, spread operator is fastest for shallow clone
    return { ...obj };
}

/**
 * Smart clone that chooses between shallow and deep based on structure
 * Optimized for Coherent component patterns
 */
export function smartClone(obj, maxDepth = 10, currentDepth = 0) {
    // Prevent infinite recursion
    if (currentDepth >= maxDepth) {
        return shallowClone(obj);
    }

    // Use shallow clone for simple structures
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    // For arrays, check if elements need deep cloning
    if (Array.isArray(obj)) {
        const needsDeepClone = obj.some(item =>
            typeof item === 'object' && item !== null && !isSimpleObject(item)
        );

        if (!needsDeepClone && currentDepth < 3) {
            return obj.map(item => smartClone(item, maxDepth, currentDepth + 1));
        } else {
            return obj.map(item => shallowClone(item));
        }
    }

    // For Coherent objects, intelligently clone based on content
    if (isCoherentObject(obj)) {
        const cloned = {};

        for (const [tag, props] of Object.entries(obj)) {
            if (props && typeof props === 'object') {
                // Deep clone children, shallow clone other props
                if (props.children) {
                    cloned[tag] = {
                        ...props,
                        children: smartClone(props.children, maxDepth, currentDepth + 1)
                    };
                } else {
                    cloned[tag] = shallowClone(props);
                }
            } else {
                cloned[tag] = props;
            }
        }

        return cloned;
    }

    // Fallback to shallow clone for other objects
    return shallowClone(obj);
}

/**
 * Check if object is a simple structure (no nested objects/arrays)
 */
function isSimpleObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return true;
    }

    if (Array.isArray(obj)) {
        return obj.every(item => typeof item !== 'object' || item === null);
    }

    return Object.values(obj).every(value =>
        typeof value !== 'object' || value === null || value instanceof Date || value instanceof RegExp
    );
}

/**
 * Clone with performance monitoring
 * Useful for debugging clone performance in development
 */
export function monitoredClone(obj, options = {}) {
    const {
        method = 'deep',
        logTiming = false,
        maxDepth = 10
    } = options;

    const start = performance.now();
    let result;

    switch (method) {
        case 'shallow':
            result = shallowClone(obj);
            break;
        case 'smart':
            result = smartClone(obj, maxDepth);
            break;
        case 'deep':
        default:
            result = deepClone(obj);
            break;
    }

    const end = performance.now();

    if (logTiming) {
        console.log(`🔄 ${method} clone took ${(end - start).toFixed(2)}ms`);
    }

    return result;
}

// Rest of your existing object-utils.js code...

/**
 * Validate that a component structure is valid for rendering
 */
export function validateComponent(component, path = 'root') {
    if (component === null || component === undefined) {
        throw new Error(`Invalid component at ${path}: null or undefined`);
    }

    // Allow strings, numbers, booleans as text content
    if (['string', 'number', 'boolean'].includes(typeof component)) {
        return true;
    }

    // Allow functions (will be evaluated during render)
    if (typeof component === 'function') {
        return true;
    }

    // Handle arrays
    if (Array.isArray(component)) {
        component.forEach((child, index) => {
            validateComponent(child, `${path}[${index}]`);
        });
        return true;
    }

    // Handle objects
    if (typeof component === 'object') {
        const keys = Object.keys(component);

        if (keys.length === 0) {
            throw new Error(`Empty object at ${path}`);
        }

        keys.forEach(key => {
            const value = component[key];

            // Validate HTML tag names (basic validation)
            if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(key) && key !== 'text') {
                console.warn(`Potentially invalid tag name at ${path}: ${key}`);
            }

            // If value is an object, it should be props
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Validate children if present
                if (value.children) {
                    validateComponent(value.children, `${path}.${key}.children`);
                }
            } else if (value && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'function') {
                throw new Error(`Invalid value type at ${path}.${key}: ${typeof value}`);
            }
        });

        return true;
    }

    throw new Error(`Invalid component type at ${path}: ${typeof component}`);
}

/**
 * Check if an object follows Coherent.js object syntax
 */
export function isCoherentObject(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return false;
    }

    const keys = Object.keys(obj);

    // Empty objects are not coherent objects
    if (keys.length === 0) {
        return false;
    }

    // Check if all keys look like HTML tags or 'text'
    return keys.every(key => {
        // Allow 'text' as a special key
        if (key === 'text') return true;

        // Basic HTML tag validation
        return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(key);
    });
}

/**
 * Extract props from a Coherent object
 */
export function extractProps(coherentObj) {
    if (!isCoherentObject(coherentObj)) {
        return {};
    }

    const props = {};
    const keys = Object.keys(coherentObj);

    keys.forEach(tag => {
        const value = coherentObj[tag];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            props[tag] = { ...value };
        } else {
            props[tag] = { text: value };
        }
    });

    return props;
}

/**
 * Check if a component has children
 */
export function hasChildren(component) {
    if (Array.isArray(component)) {
        return component.length > 0;
    }

    if (isCoherentObject(component)) {
        // First check if the component itself has a children property
        if (component.children !== undefined && component.children !== null) {
            return Array.isArray(component.children) ? component.children.length > 0 : true;
        }
        
        // Then check if any of its properties have children
        const keys = Object.keys(component);
        return keys.some(key => {
            const value = component[key];
            return value && typeof value === 'object' && value.children;
        });
    }

    return false;
}

/**
 * Normalize children to a consistent array format
 */
export function normalizeChildren(children) {
    if (children === null || children === undefined) {
        return [];
    }

    if (Array.isArray(children)) {
        return children.flat().filter(child => child !== null && child !== undefined);
    }

    return [children];
}

/**
 * Get children from a component's props
 */
export function getChildren(props) {
    if (!props || typeof props !== 'object') {
        return [];
    }

    if (props.children === undefined) {
        return [];
    }

    return normalizeChildren(props.children);
}

/**
 * Merge props objects with conflict resolution
 */
export function mergeProps(base = {}, override = {}) {
    const merged = { ...base };

    Object.keys(override).forEach(key => {
        if (key === 'children') {
            // Merge children arrays
            const baseChildren = normalizeChildren(base.children);
            const overrideChildren = normalizeChildren(override.children);
            merged.children = [...baseChildren, ...overrideChildren];
        } else if (key === 'className' && base.className) {
            // Merge class names
            merged.className = `${base.className} ${override.className}`;
        } else if (key === 'style' && base.style && typeof base.style === 'object') {
            // Merge style objects
            merged.style = { ...base.style, ...override.style };
        } else {
            // Override other properties
            merged[key] = override[key];
        }
    });

    return merged;
}

/**
 * Get nested value from object using dot notation
 */
export function getNestedValue(obj, path) {
    if (!obj || typeof path !== 'string') {
        return undefined;
    }

    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}

/**
 * Set nested value in object using dot notation
 */
export function setNestedValue(obj, path, value) {
    if (!obj || typeof path !== 'string') {
        return obj;
    }

    const keys = path.split('.');
    const lastKey = keys.pop();

    const target = keys.reduce((current, key) => {
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        return current[key];
    }, obj);

    target[lastKey] = value;
    return obj;
}

/**
 * Compare two components for equality (useful for optimization)
 */
export function isEqual(a, b, maxDepth = 5, currentDepth = 0) {
    // Prevent deep comparisons that are too expensive
    if (currentDepth > maxDepth) {
        return a === b;
    }

    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'function') {
        // Functions are compared by reference
        return a === b;
    }

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        return a.every((item, i) => isEqual(item, b[i], maxDepth, currentDepth + 1));
    }

    if (typeof a === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        return keysA.every(key =>
            keysB.includes(key) &&
            isEqual(a[key], b[key], maxDepth, currentDepth + 1)
        );
    }

    return false;
}

/**
 * Create a frozen (immutable) version of a component
 */
export function freeze(obj) {
    if (obj && typeof obj === 'object') {
        Object.freeze(obj);

        // Recursively freeze nested objects
        Object.values(obj).forEach(value => {
            if (value && typeof value === 'object') {
                freeze(value);
            }
        });
    }

    return obj;
}

/**
 * Check if component tree contains circular references
 */
export function hasCircularReferences(obj, seen = new WeakSet()) {
    if (obj && typeof obj === 'object') {
        if (seen.has(obj)) {
            return true;
        }

        seen.add(obj);

        for (const value of Object.values(obj)) {
            if (hasCircularReferences(value, seen)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Get memory footprint estimate of a component tree
 */
export function getMemoryFootprint(obj, visited = new WeakSet()) {
    if (obj === null || obj === undefined) return 0;
    if (visited.has(obj)) return 0;

    let size = 0;

    if (typeof obj === 'string') {
        size = obj.length * 2; // Rough estimate: 2 bytes per character
    } else if (typeof obj === 'number') {
        size = 8; // 64-bit number
    } else if (typeof obj === 'boolean') {
        size = 4; // Boolean
    } else if (typeof obj === 'object') {
        visited.add(obj);
        size = 48; // Base object overhead

        if (Array.isArray(obj)) {
            size += obj.length * 8; // Array overhead
            obj.forEach(item => {
                size += getMemoryFootprint(item, visited);
            });
        } else {
            Object.keys(obj).forEach(key => {
                size += key.length * 2; // Key string
                size += getMemoryFootprint(obj[key], visited);
            });
        }
    }

    return size;
}
