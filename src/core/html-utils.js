/**
 * HTML-specific utility functions
 */

export function escapeHtml(text) {
    if (typeof text !== 'string') return text;

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function unescapeHtml(text) {
    if (typeof text !== 'string') return text;

    return text
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');
}

export function isVoidElement(tagName) {
    // Ensure tagName is a string before processing
    if (typeof tagName !== 'string') {
        return false;
    }
    
    const voidElements = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]);
    return voidElements.has(tagName.toLowerCase());
}

export function formatAttributes(props) {
    let formatted = '';
    for (const key in props) {
        if (props.hasOwnProperty(key)) {
            let value = props[key];
            
            // Handle function values by calling them
            if (typeof value === 'function') {
                try {
                    value = value();
                } catch (error) {
                    console.warn(`Error executing function for attribute '${key}':`, {
                        error: error.message,
                        stack: error.stack,
                        attributeKey: key
                    });
                    // Consider different fallback strategies based on attribute type
                    value = '';
                }
            }
            
            if (value === true) {
                formatted += ` ${key}`;
            } else if (value !== false && value !== null && value !== undefined) {
                formatted += ` ${key}="${escapeHtml(String(value))}"`;
            }
        }
    }
    return formatted.trim();
}

export function minifyHtml(html, options = {}) {
    if (!options.minify) return html;

    return html
        // Remove comments
        .replace(/<!--[\s\S]*?-->/g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove whitespace around tags
        .replace(/>\s+</g, '><')
        // Remove leading/trailing whitespace
        .trim();
}

/**
 * HTML Void Elements - elements that cannot have children
 * These elements are self-closing and don't need closing tags
 */
export const voidElements = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
]);
