// src/utils/normalization.js
export function normalizeProps(props) {
    if (!props || typeof props !== 'object') {
        return {};
    }

    // Filter out key and ref from props (they're handled separately)
    const normalizedProps = { ...props };
    delete normalizedProps.key;
    delete normalizedProps.ref;

    return normalizedProps;
}

export function flattenChildren(children) {
    const flattened = [];

    for (const child of children) {
        if (Array.isArray(child)) {
            flattened.push(...flattenChildren(child));
        } else if (child !== null && child !== undefined && child !== false) {
            flattened.push(child);
        }
    }

    return flattened;
}
