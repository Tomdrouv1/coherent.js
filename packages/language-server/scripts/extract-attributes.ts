#!/usr/bin/env tsx
/**
 * Build-time attribute extraction script
 *
 * Parses the core TypeScript type definitions and extracts HTML element
 * attribute information for use by the language server.
 *
 * This ensures single source of truth: core types define attributes,
 * language server consumes them at runtime.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ELEMENTS_PATH = path.resolve(__dirname, '../../core/types/elements.d.ts');
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/element-attributes.generated.json');

interface AttributeInfo {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

interface ElementInfo {
  tagName: string;
  attributes: AttributeInfo[];
  isVoidElement: boolean;
}

interface ExtractedData {
  elements: Record<string, ElementInfo>;
  voidElements: string[];
  globalAttributes: AttributeInfo[];
  eventHandlers: AttributeInfo[];
  generatedAt: string;
}

function extractAttributes(): void {
  console.log('[extract-attributes] Starting extraction from', ELEMENTS_PATH);

  if (!fs.existsSync(ELEMENTS_PATH)) {
    console.error('[extract-attributes] Error: elements.d.ts not found at', ELEMENTS_PATH);
    console.log('[extract-attributes] Creating fallback data...');
    createFallbackData();
    return;
  }

  const program = ts.createProgram([ELEMENTS_PATH], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  });

  const sourceFile = program.getSourceFile(ELEMENTS_PATH);
  if (!sourceFile) {
    console.error('[extract-attributes] Error: Could not parse source file');
    createFallbackData();
    return;
  }

  const typeChecker = program.getTypeChecker();
  const data: ExtractedData = {
    elements: {},
    voidElements: [],
    globalAttributes: [],
    eventHandlers: [],
    generatedAt: new Date().toISOString(),
  };

  // Find all interface declarations
  const interfaces: Record<string, ts.InterfaceDeclaration> = {};
  const typeAliases: Record<string, ts.TypeAliasDeclaration> = {};

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      interfaces[node.name.text] = node;
    } else if (ts.isTypeAliasDeclaration(node)) {
      typeAliases[node.name.text] = node;
    }
  });

  // Extract void elements from VoidElementTagNames
  const voidElementsType = typeAliases['VoidElementTagNames'];
  if (voidElementsType) {
    data.voidElements = extractUnionLiterals(voidElementsType.type);
  }

  // Extract global attributes from GlobalHTMLAttributes
  const globalAttrs = interfaces['GlobalHTMLAttributes'];
  if (globalAttrs) {
    data.globalAttributes = extractInterfaceMembers(globalAttrs, typeChecker);
  }

  // Extract event handlers from GlobalEventHandlers
  const eventHandlers = interfaces['GlobalEventHandlers'];
  if (eventHandlers) {
    data.eventHandlers = extractInterfaceMembers(eventHandlers, typeChecker);
  }

  // Extract element-specific attributes from HTMLElementAttributeMap
  const elementMap = interfaces['HTMLElementAttributeMap'];
  if (elementMap) {
    for (const member of elementMap.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const tagName = member.name.getText(sourceFile);
        const isVoid = data.voidElements.includes(tagName);

        // Get the attribute interface for this element
        const attributes = extractElementAttributes(
          member,
          interfaces,
          typeChecker,
          sourceFile
        );

        data.elements[tagName] = {
          tagName,
          attributes,
          isVoidElement: isVoid,
        };
      }
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the extracted data
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(
    '[extract-attributes] Extracted',
    Object.keys(data.elements).length,
    'elements to',
    OUTPUT_PATH
  );
}

function extractUnionLiterals(type: ts.TypeNode): string[] {
  const literals: string[] = [];

  if (ts.isUnionTypeNode(type)) {
    for (const typeNode of type.types) {
      if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
        literals.push(typeNode.literal.text);
      }
    }
  }

  return literals;
}

function extractInterfaceMembers(
  interfaceDecl: ts.InterfaceDeclaration,
  typeChecker: ts.TypeChecker
): AttributeInfo[] {
  const attributes: AttributeInfo[] = [];

  for (const member of interfaceDecl.members) {
    if (ts.isPropertySignature(member) && member.name) {
      const name = member.name.getText();
      const optional = !!member.questionToken;
      const type = member.type ? member.type.getText() : 'unknown';

      // Extract JSDoc comment if available
      const jsDocs = ts.getJSDocTags(member);
      const description = jsDocs.length > 0 ? jsDocs[0].comment?.toString() : undefined;

      attributes.push({
        name,
        type,
        optional,
        description,
      });
    }
  }

  return attributes;
}

function extractElementAttributes(
  member: ts.PropertySignature,
  interfaces: Record<string, ts.InterfaceDeclaration>,
  typeChecker: ts.TypeChecker,
  sourceFile: ts.SourceFile
): AttributeInfo[] {
  if (!member.type) return [];

  const typeName = member.type.getText(sourceFile);
  const interfaceDecl = interfaces[typeName];

  if (!interfaceDecl) {
    // Handle base types like GlobalHTMLAttributes
    return [];
  }

  const attributes: AttributeInfo[] = [];

  // Get attributes from this interface
  attributes.push(...extractInterfaceMembers(interfaceDecl, typeChecker));

  // Get attributes from extended interfaces
  if (interfaceDecl.heritageClauses) {
    for (const heritage of interfaceDecl.heritageClauses) {
      for (const type of heritage.types) {
        const parentName = type.expression.getText(sourceFile);
        const parentInterface = interfaces[parentName];
        if (parentInterface) {
          attributes.push(...extractInterfaceMembers(parentInterface, typeChecker));
        }
      }
    }
  }

  return attributes;
}

function createFallbackData(): void {
  // Fallback data for development when core types aren't available
  const fallbackData: ExtractedData = {
    elements: {
      div: {
        tagName: 'div',
        attributes: [],
        isVoidElement: false,
      },
      span: {
        tagName: 'span',
        attributes: [],
        isVoidElement: false,
      },
      p: {
        tagName: 'p',
        attributes: [],
        isVoidElement: false,
      },
      a: {
        tagName: 'a',
        attributes: [
          { name: 'href', type: 'string', optional: true },
          { name: 'target', type: 'string', optional: true },
          { name: 'rel', type: 'string', optional: true },
        ],
        isVoidElement: false,
      },
      button: {
        tagName: 'button',
        attributes: [
          { name: 'type', type: "'button' | 'submit' | 'reset'", optional: true },
          { name: 'disabled', type: 'boolean', optional: true },
        ],
        isVoidElement: false,
      },
      input: {
        tagName: 'input',
        attributes: [
          { name: 'type', type: 'InputType', optional: true },
          { name: 'value', type: 'string', optional: true },
          { name: 'checked', type: 'boolean', optional: true },
          { name: 'disabled', type: 'boolean', optional: true },
          { name: 'placeholder', type: 'string', optional: true },
          { name: 'name', type: 'string', optional: true },
        ],
        isVoidElement: true,
      },
      img: {
        tagName: 'img',
        attributes: [
          { name: 'src', type: 'string', optional: true },
          { name: 'alt', type: 'string', optional: true },
          { name: 'width', type: 'number | string', optional: true },
          { name: 'height', type: 'number | string', optional: true },
        ],
        isVoidElement: true,
      },
      form: {
        tagName: 'form',
        attributes: [
          { name: 'action', type: 'string', optional: true },
          { name: 'method', type: "'get' | 'post'", optional: true },
        ],
        isVoidElement: false,
      },
    },
    voidElements: ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'],
    globalAttributes: [
      { name: 'id', type: 'string', optional: true },
      { name: 'className', type: 'string', optional: true },
      { name: 'class', type: 'string', optional: true },
      { name: 'style', type: 'string | Record<string, string | number>', optional: true },
      { name: 'title', type: 'string', optional: true },
      { name: 'hidden', type: 'boolean', optional: true },
      { name: 'tabIndex', type: 'number', optional: true },
      { name: 'role', type: 'AriaRole', optional: true },
      { name: 'key', type: 'string | number', optional: true },
    ],
    eventHandlers: [
      { name: 'onClick', type: 'string | ((event: MouseEvent) => void)', optional: true },
      { name: 'onChange', type: 'string | ((event: Event) => void)', optional: true },
      { name: 'onSubmit', type: 'string | ((event: SubmitEvent) => void)', optional: true },
      { name: 'onKeyDown', type: 'string | ((event: KeyboardEvent) => void)', optional: true },
      { name: 'onFocus', type: 'string | ((event: FocusEvent) => void)', optional: true },
      { name: 'onBlur', type: 'string | ((event: FocusEvent) => void)', optional: true },
    ],
    generatedAt: new Date().toISOString(),
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fallbackData, null, 2));
  console.log('[extract-attributes] Created fallback data with', Object.keys(fallbackData.elements).length, 'elements');
}

// Run extraction
extractAttributes();
