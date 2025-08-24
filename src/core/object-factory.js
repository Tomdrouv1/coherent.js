/**
 * Object Factory for Coherent.js
 * @fileoverview Creates Coherent objects with HTML elements and text nodes
 */

import { HTML_ELEMENTS, CoherentTypes } from '../types/constants.js';

/**
 * Creates a Coherent object with the specified tag and properties
 * @param {string} tag - HTML tag name
 * @param {Object} [props={}] - Properties object
 * @returns {Object} Coherent object with element structure
 * @throws {Error} When invalid HTML element is provided
 */
export function createElement(tag, props = {}) {
    if (!HTML_ELEMENTS.has(tag)) {
        throw new Error(`Invalid HTML element: ${tag}`);
    }

    // Create the coherent object structure
    const coherentObj = {
        [tag]: {
            ...props,
            _type: CoherentTypes.ELEMENT
        }
    };

    return coherentObj;
}

/**
 * Creates a text node
 * @param {string} text - Text content
 * @returns {Object} Coherent text object
 */
export function createTextNode(text) {
    return {
        text: String(text),
        _type: CoherentTypes.OBJECT
    };
}

/**
 * Helper function to create common elements
 */
export const h = {
    div: (props) => createElement('div', props),
    span: (props) => createElement('span', props),
    p: (props) => createElement('p', props),
    h1: (props) => createElement('h1', props),
    h2: (props) => createElement('h2', props),
    h3: (props) => createElement('h3', props),
    h4: (props) => createElement('h4', props),
    h5: (props) => createElement('h5', props),
    h6: (props) => createElement('h6', props),
    a: (props) => createElement('a', props),
    img: (props) => createElement('img', props),
    button: (props) => createElement('button', props),
    input: (props) => createElement('input', props),
    form: (props) => createElement('form', props),
    ul: (props) => createElement('ul', props),
    ol: (props) => createElement('ol', props),
    li: (props) => createElement('li', props),
    table: (props) => createElement('table', props),
    tr: (props) => createElement('tr', props),
    td: (props) => createElement('td', props),
    th: (props) => createElement('th', props)
};
