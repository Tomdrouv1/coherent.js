/**
 * Coherent.js Object Analyzer
 *
 * Uses TypeScript AST to detect and analyze Coherent.js element objects
 * in source code. Identifies tag names, attributes, children, and nesting.
 */
import * as ts from 'typescript';
import { Range, Position } from 'vscode-languageserver';
/**
 * Information about a detected Coherent.js element.
 */
export interface CoherentElementInfo {
    /** HTML tag name (e.g., 'div', 'input') */
    tagName: string;
    /** Source code range of the entire element object */
    range: Range;
    /** Source code range of just the tag name property */
    tagNameRange: Range;
    /** Attributes found on this element */
    attributes: AttributeInfo[];
    /** Parent element info (if nested) */
    parent: CoherentElementInfo | null;
    /** Children elements */
    children: CoherentElementInfo[];
    /** The TypeScript AST node */
    node: ts.ObjectLiteralExpression;
}
/**
 * Information about an attribute on a Coherent element.
 */
export interface AttributeInfo {
    /** Attribute name (e.g., 'className', 'onClick') */
    name: string;
    /** Attribute value as string (for display) */
    value: string;
    /** Source code range of the attribute */
    range: Range;
    /** Source code range of just the attribute name */
    nameRange: Range;
    /** The TypeScript AST node */
    node: ts.PropertyAssignment | ts.ShorthandPropertyAssignment;
}
/**
 * Context for position-based queries.
 */
export interface PositionContext {
    /** Type of context at the position */
    type: 'tag-name' | 'attribute-name' | 'attribute-value' | 'children' | 'outside';
    /** Current element (if inside one) */
    element?: CoherentElementInfo;
    /** Current attribute (if inside one) */
    attribute?: AttributeInfo;
}
/**
 * Check if a node is a Coherent.js element object.
 *
 * A Coherent element is an object with a single property whose name is an HTML tag,
 * and whose value is an object containing attributes.
 */
export declare function isCoherentElement(node: ts.Node, sourceFile: ts.SourceFile): node is ts.ObjectLiteralExpression;
/**
 * Find all Coherent.js elements in a source file.
 *
 * @param sourceFile - TypeScript source file to analyze
 * @returns Array of found Coherent element info
 */
export declare function findCoherentElements(sourceFile: ts.SourceFile): CoherentElementInfo[];
/**
 * Get the Coherent element at a specific position.
 *
 * @param sourceFile - TypeScript source file
 * @param position - LSP position
 * @param elements - Previously found elements (optional, will find if not provided)
 * @returns Element info at position or undefined
 */
export declare function getElementAtPosition(sourceFile: ts.SourceFile, position: Position, elements?: CoherentElementInfo[]): CoherentElementInfo | undefined;
/**
 * Get the context at a specific position for completion/hover.
 *
 * @param sourceFile - TypeScript source file
 * @param position - LSP position
 * @returns Context information
 */
export declare function getPositionContext(sourceFile: ts.SourceFile, position: Position): PositionContext;
/**
 * Create a TypeScript source file from text content.
 *
 * @param content - Source file content
 * @param fileName - File name for the source file
 * @returns TypeScript SourceFile
 */
export declare function createSourceFile(content: string, fileName: string): ts.SourceFile;
//# sourceMappingURL=coherent-analyzer.d.ts.map