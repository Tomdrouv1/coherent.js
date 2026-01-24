/**
 * Coherent.js Object Analyzer
 *
 * Uses TypeScript AST to detect and analyze Coherent.js element objects
 * in source code. Identifies tag names, attributes, children, and nesting.
 */
import * as ts from 'typescript';
import { HTML_ELEMENTS } from '../data/element-attributes.js';
/**
 * Convert TypeScript position to LSP position.
 */
function tsPositionToLsp(sourceFile, pos) {
    const lineAndChar = sourceFile.getLineAndCharacterOfPosition(pos);
    return {
        line: lineAndChar.line,
        character: lineAndChar.character,
    };
}
/**
 * Convert TypeScript range to LSP range.
 */
function tsRangeToLsp(sourceFile, start, end) {
    return {
        start: tsPositionToLsp(sourceFile, start),
        end: tsPositionToLsp(sourceFile, end),
    };
}
/**
 * Convert LSP position to TypeScript offset.
 */
function lspPositionToTs(sourceFile, position) {
    return sourceFile.getPositionOfLineAndCharacter(position.line, position.character);
}
/**
 * Check if a position is within a range.
 */
function isPositionInRange(position, range) {
    if (position.line < range.start.line || position.line > range.end.line) {
        return false;
    }
    if (position.line === range.start.line && position.character < range.start.character) {
        return false;
    }
    if (position.line === range.end.line && position.character > range.end.character) {
        return false;
    }
    return true;
}
/**
 * Check if a node is a Coherent.js element object.
 *
 * A Coherent element is an object with a single property whose name is an HTML tag,
 * and whose value is an object containing attributes.
 */
export function isCoherentElement(node, sourceFile) {
    if (!ts.isObjectLiteralExpression(node)) {
        return false;
    }
    // Must have exactly one property
    if (node.properties.length !== 1) {
        return false;
    }
    const prop = node.properties[0];
    if (!ts.isPropertyAssignment(prop)) {
        return false;
    }
    // Property name must be an HTML element
    const name = prop.name;
    let tagName;
    if (ts.isIdentifier(name)) {
        tagName = name.text;
    }
    else if (ts.isStringLiteral(name)) {
        tagName = name.text;
    }
    else {
        return false;
    }
    return HTML_ELEMENTS.has(tagName);
}
/**
 * Extract element information from a Coherent element node.
 */
function extractElementInfo(node, sourceFile, parent = null) {
    const prop = node.properties[0];
    const name = prop.name;
    let tagName;
    if (ts.isIdentifier(name)) {
        tagName = name.text;
    }
    else if (ts.isStringLiteral(name)) {
        tagName = name.text;
    }
    else {
        tagName = 'unknown';
    }
    const elementInfo = {
        tagName,
        range: tsRangeToLsp(sourceFile, node.getStart(sourceFile), node.getEnd()),
        tagNameRange: tsRangeToLsp(sourceFile, name.getStart(sourceFile), name.getEnd()),
        attributes: [],
        parent,
        children: [],
        node,
    };
    // Extract attributes from the property value
    if (ts.isObjectLiteralExpression(prop.initializer)) {
        const attrs = prop.initializer;
        for (const attrProp of attrs.properties) {
            if (ts.isPropertyAssignment(attrProp)) {
                const attrName = ts.isIdentifier(attrProp.name)
                    ? attrProp.name.text
                    : ts.isStringLiteral(attrProp.name)
                        ? attrProp.name.text
                        : null;
                if (attrName) {
                    const attrInfo = {
                        name: attrName,
                        value: attrProp.initializer.getText(sourceFile),
                        range: tsRangeToLsp(sourceFile, attrProp.getStart(sourceFile), attrProp.getEnd()),
                        nameRange: tsRangeToLsp(sourceFile, attrProp.name.getStart(sourceFile), attrProp.name.getEnd()),
                        node: attrProp,
                    };
                    elementInfo.attributes.push(attrInfo);
                    // Check for children array and extract nested elements
                    if (attrName === 'children') {
                        extractChildElements(attrProp.initializer, sourceFile, elementInfo);
                    }
                }
            }
            else if (ts.isShorthandPropertyAssignment(attrProp)) {
                const attrName = attrProp.name.text;
                const attrInfo = {
                    name: attrName,
                    value: attrName, // Shorthand uses same name as value
                    range: tsRangeToLsp(sourceFile, attrProp.getStart(sourceFile), attrProp.getEnd()),
                    nameRange: tsRangeToLsp(sourceFile, attrProp.name.getStart(sourceFile), attrProp.name.getEnd()),
                    node: attrProp,
                };
                elementInfo.attributes.push(attrInfo);
            }
        }
    }
    return elementInfo;
}
/**
 * Extract child Coherent elements from a children property value.
 */
function extractChildElements(node, sourceFile, parent) {
    if (ts.isArrayLiteralExpression(node)) {
        // Children array
        for (const element of node.elements) {
            if (isCoherentElement(element, sourceFile)) {
                const childInfo = extractElementInfo(element, sourceFile, parent);
                parent.children.push(childInfo);
            }
        }
    }
    else if (isCoherentElement(node, sourceFile)) {
        // Single child element
        const childInfo = extractElementInfo(node, sourceFile, parent);
        parent.children.push(childInfo);
    }
}
/**
 * Find all Coherent.js elements in a source file.
 *
 * @param sourceFile - TypeScript source file to analyze
 * @returns Array of found Coherent element info
 */
export function findCoherentElements(sourceFile) {
    const elements = [];
    const processed = new WeakSet();
    function visit(node, parent = null) {
        if (isCoherentElement(node, sourceFile) && !processed.has(node)) {
            processed.add(node);
            const elementInfo = extractElementInfo(node, sourceFile, parent);
            elements.push(elementInfo);
            // Also collect nested elements that were added as children
            function collectChildren(el) {
                for (const child of el.children) {
                    elements.push(child);
                    collectChildren(child);
                }
            }
            collectChildren(elementInfo);
        }
        else {
            ts.forEachChild(node, (child) => visit(child, parent));
        }
    }
    visit(sourceFile);
    return elements;
}
/**
 * Get the Coherent element at a specific position.
 *
 * @param sourceFile - TypeScript source file
 * @param position - LSP position
 * @param elements - Previously found elements (optional, will find if not provided)
 * @returns Element info at position or undefined
 */
export function getElementAtPosition(sourceFile, position, elements) {
    const allElements = elements || findCoherentElements(sourceFile);
    // Find the most specific (deepest) element containing the position
    let result;
    for (const element of allElements) {
        if (isPositionInRange(position, element.range)) {
            // Prefer more specific (smaller range) element
            if (!result || isRangeContained(element.range, result.range)) {
                result = element;
            }
        }
    }
    return result;
}
/**
 * Check if range a is contained within range b.
 */
function isRangeContained(a, b) {
    if (a.start.line > b.start.line || (a.start.line === b.start.line && a.start.character >= b.start.character)) {
        if (a.end.line < b.end.line || (a.end.line === b.end.line && a.end.character <= b.end.character)) {
            return true;
        }
    }
    return false;
}
/**
 * Get the context at a specific position for completion/hover.
 *
 * @param sourceFile - TypeScript source file
 * @param position - LSP position
 * @returns Context information
 */
export function getPositionContext(sourceFile, position) {
    const elements = findCoherentElements(sourceFile);
    const element = getElementAtPosition(sourceFile, position, elements);
    if (!element) {
        return { type: 'outside' };
    }
    // Check if on tag name
    if (isPositionInRange(position, element.tagNameRange)) {
        return { type: 'tag-name', element };
    }
    // Check if on an attribute
    for (const attr of element.attributes) {
        if (isPositionInRange(position, attr.nameRange)) {
            return { type: 'attribute-name', element, attribute: attr };
        }
        if (isPositionInRange(position, attr.range) && !isPositionInRange(position, attr.nameRange)) {
            return { type: 'attribute-value', element, attribute: attr };
        }
    }
    // Check if in children context (after children: [ or just after children:)
    const offset = lspPositionToTs(sourceFile, position);
    const text = sourceFile.text;
    // Look backward from position to see context
    let i = offset - 1;
    while (i >= 0 && (text[i] === ' ' || text[i] === '\n' || text[i] === '\r' || text[i] === '\t')) {
        i--;
    }
    if (i >= 0) {
        // Check if we're right after [ or { in a children context
        if (text[i] === '[' || text[i] === '{' || text[i] === ',') {
            // Check if this is within a children attribute
            const childrenAttr = element.attributes.find(a => a.name === 'children');
            if (childrenAttr && isPositionInRange(position, childrenAttr.range)) {
                return { type: 'children', element };
            }
        }
    }
    // Default to attribute-name context if inside element but not on specific attribute
    // This allows completion of new attributes
    return { type: 'attribute-name', element };
}
/**
 * Create a TypeScript source file from text content.
 *
 * @param content - Source file content
 * @param fileName - File name for the source file
 * @returns TypeScript SourceFile
 */
export function createSourceFile(content, fileName) {
    return ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true, // setParentNodes
    ts.ScriptKind.TSX // Support both JS and TSX syntax
    );
}
//# sourceMappingURL=coherent-analyzer.js.map