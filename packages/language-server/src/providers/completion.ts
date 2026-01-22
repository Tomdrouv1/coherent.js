/**
 * Completion Provider
 *
 * Provides autocomplete suggestions for Coherent.js elements and attributes.
 */

import {
  Connection,
  TextDocuments,
  CompletionItem,
  CompletionItemKind,
  CompletionParams,
  InsertTextFormat,
  TextDocumentPositionParams,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  createSourceFile,
  getPositionContext,
} from '../analysis/coherent-analyzer.js';
import {
  HTML_ELEMENTS,
  getAttributesForElement,
  getElementDescription,
  getAttributeDescription,
  isVoidElement,
} from '../data/element-attributes.js';

/**
 * Register the completion provider.
 *
 * @param connection - LSP connection
 * @param documents - Text document manager
 */
export function registerCompletionProvider(
  connection: Connection,
  documents: TextDocuments<TextDocument>
): void {
  // Handle completion requests
  connection.onCompletion((params: CompletionParams): CompletionItem[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return [];
    }

    try {
      const content = document.getText();
      const sourceFile = createSourceFile(content, params.textDocument.uri);
      const context = getPositionContext(sourceFile, params.position);

      switch (context.type) {
        case 'tag-name':
          return getTagNameCompletions();

        case 'attribute-name':
          if (context.element) {
            return getAttributeCompletions(context.element.tagName);
          }
          return [];

        case 'children':
          return getChildCompletions();

        case 'attribute-value':
          // Future: could provide value suggestions for specific attributes
          return [];

        case 'outside':
          // When outside any element, suggest starting an element
          return getElementStartCompletions();

        default:
          return [];
      }
    } catch (error) {
      console.error('[coherent-lsp] Completion error:', error);
      return [];
    }
  });

  // Handle completion item resolve for additional detail
  connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    // Add documentation on resolve
    if (item.data?.type === 'tag') {
      const tagName = item.label;
      item.documentation = {
        kind: 'markdown',
        value: getElementDescription(tagName) + '\n\n' + getElementDocumentation(tagName),
      };
    } else if (item.data?.type === 'attribute' && item.data?.tagName) {
      const attrName = item.label;
      const tagName = item.data.tagName;
      const description = getAttributeDescription(tagName, attrName);
      if (description) {
        item.documentation = {
          kind: 'markdown',
          value: description,
        };
      }
    }

    return item;
  });
}

/**
 * Get completions for HTML tag names.
 */
function getTagNameCompletions(): CompletionItem[] {
  const items: CompletionItem[] = [];

  // Sort elements by common usage
  const commonElements = [
    'div', 'span', 'p', 'a', 'button', 'input', 'img', 'form',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'section', 'article',
  ];

  for (const tagName of commonElements) {
    if (HTML_ELEMENTS.has(tagName)) {
      items.push(createTagCompletion(tagName, true));
    }
  }

  // Add remaining elements
  for (const tagName of HTML_ELEMENTS) {
    if (!commonElements.includes(tagName)) {
      items.push(createTagCompletion(tagName, false));
    }
  }

  return items;
}

/**
 * Create a completion item for a tag name.
 */
function createTagCompletion(tagName: string, isCommon: boolean): CompletionItem {
  return {
    label: tagName,
    kind: CompletionItemKind.Class,
    detail: isVoidElement(tagName) ? `<${tagName}/> (void element)` : `<${tagName}>`,
    sortText: isCommon ? `0${tagName}` : `1${tagName}`,
    data: { type: 'tag', tagName },
  };
}

/**
 * Get completions for attributes on a specific element.
 */
function getAttributeCompletions(tagName: string): CompletionItem[] {
  const attributes = getAttributesForElement(tagName);
  const items: CompletionItem[] = [];

  // Common attributes first
  const commonAttrs = ['className', 'id', 'onClick', 'style', 'children', 'text'];

  for (const attr of attributes) {
    const isCommon = commonAttrs.includes(attr.name);
    items.push({
      label: attr.name,
      kind: CompletionItemKind.Property,
      detail: formatType(attr.type),
      sortText: isCommon ? `0${attr.name}` : `1${attr.name}`,
      insertText: getAttributeInsertText(attr.name, attr.type),
      insertTextFormat: InsertTextFormat.Snippet,
      data: { type: 'attribute', tagName, attributeName: attr.name },
    });
  }

  return items;
}

/**
 * Get insert text for an attribute with appropriate value placeholder.
 */
function getAttributeInsertText(name: string, type: string): string {
  // Boolean attributes
  if (type === 'boolean') {
    return `${name}: \${1|true,false|}`;
  }

  // String attributes
  if (type === 'string' || type.includes('string')) {
    return `${name}: '\${1}'`;
  }

  // Number attributes
  if (type === 'number') {
    return `${name}: \${1:0}`;
  }

  // Event handlers
  if (name.startsWith('on') && name[2] === name[2].toUpperCase()) {
    return `${name}: () => {\n  \${1}\n}`;
  }

  // Children array
  if (name === 'children') {
    return `${name}: [\n  \${1}\n]`;
  }

  // Style object
  if (name === 'style') {
    return `${name}: {\n  \${1}\n}`;
  }

  // Default
  return `${name}: \${1}`;
}

/**
 * Format type for display.
 */
function formatType(type: string): string {
  // Simplify complex types for display
  if (type.length > 50) {
    return type.substring(0, 47) + '...';
  }
  return type;
}

/**
 * Get completions for starting a child element.
 */
function getChildCompletions(): CompletionItem[] {
  const items: CompletionItem[] = [];

  // Suggest opening an element
  items.push({
    label: '{ element }',
    kind: CompletionItemKind.Snippet,
    detail: 'Create a child element',
    insertText: '{ ${1:div}: { ${2} } }',
    insertTextFormat: InsertTextFormat.Snippet,
    sortText: '0element',
  });

  // Common child elements
  const commonChildren = ['div', 'span', 'p', 'a', 'button', 'li'];
  for (const tagName of commonChildren) {
    items.push({
      label: `{ ${tagName}: {} }`,
      kind: CompletionItemKind.Snippet,
      detail: `Create a <${tagName}> child`,
      insertText: `{ ${tagName}: { \${1} } }`,
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: `1${tagName}`,
    });
  }

  return items;
}

/**
 * Get completions for starting an element (outside any existing element).
 */
function getElementStartCompletions(): CompletionItem[] {
  const items: CompletionItem[] = [];

  // Coherent element snippet
  items.push({
    label: 'coherent-element',
    kind: CompletionItemKind.Snippet,
    detail: 'Create a Coherent.js element',
    insertText: '{\n  ${1:div}: {\n    ${2:className}: \'${3}\',\n    ${4:children}: [${5}]\n  }\n}',
    insertTextFormat: InsertTextFormat.Snippet,
    sortText: '0coherent',
  });

  // Coherent component snippet
  items.push({
    label: 'coherent-component',
    kind: CompletionItemKind.Snippet,
    detail: 'Create a Coherent.js component function',
    insertText: 'function ${1:ComponentName}(${2:props}) {\n  return {\n    ${3:div}: {\n      className: \'${4:component}\',\n      children: [${5}]\n    }\n  };\n}',
    insertTextFormat: InsertTextFormat.Snippet,
    sortText: '0component',
  });

  return items;
}

/**
 * Get detailed documentation for an element.
 */
function getElementDocumentation(tagName: string): string {
  const attrs = getAttributesForElement(tagName);
  const isVoid = isVoidElement(tagName);

  let doc = `### Example\n\`\`\`javascript\n`;

  if (isVoid) {
    doc += `{ ${tagName}: { /* attributes */ } }\n`;
  } else {
    doc += `{ ${tagName}: {\n  className: 'example',\n  children: [/* elements */]\n} }\n`;
  }

  doc += `\`\`\`\n\n`;

  // List some common attributes
  const commonAttrs = attrs.slice(0, 5).map(a => `- \`${a.name}\`: ${a.type}`).join('\n');
  if (commonAttrs) {
    doc += `### Common Attributes\n${commonAttrs}\n`;
  }

  return doc;
}
